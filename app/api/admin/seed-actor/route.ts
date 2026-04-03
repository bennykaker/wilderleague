import { NextRequest } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'
import { createServiceClient } from '../../../../lib/supabase/service'
import { cookies } from 'next/headers'
import Anthropic from '@anthropic-ai/sdk'

const TMDB_TOKEN = process.env.TMDB_API_KEY!
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

async function tmdbGet(endpoint: string) {
  const res = await fetch(`https://api.themoviedb.org/3${endpoint}`, {
    headers: { Authorization: `Bearer ${TMDB_TOKEN}`, accept: 'application/json' },
  })
  if (!res.ok) return null
  return res.json() as Promise<any>
}

async function isDirector(): Promise<boolean> {
  const cookieStore = await cookies()
  const { createServerClient } = await import('@supabase/ssr')
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const service = createServiceClient()
  const { data } = await service.from('profiles').select('is_director').eq('id', user.id).single()
  return data?.is_director ?? false
}

// PATCH — just update status (dismiss)
export async function PATCH(req: NextRequest) {
  if (!await isDirector()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { submissionId, status } = await req.json()
  const service = createServiceClient()
  await service.from('actor_submissions').update({ status }).eq('id', submissionId)
  return Response.json({ ok: true })
}

// POST — full seed: TMDB + Claude + insert into actors
export async function POST(req: NextRequest) {
  if (!await isDirector()) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { submissionId, name } = await req.json()
  const service = createServiceClient()

  try {
    // 1. Check if already in DB
    const { data: existing } = await service.from('actors').select('id, name').ilike('name', name).single()
    if (existing) {
      await service.from('actor_submissions').update({ status: 'added' }).eq('id', submissionId)
      return Response.json({ ok: true, message: `${name} already in DB — marked as added` })
    }

    // 2. TMDB search
    const searchData = await tmdbGet(`/search/person?query=${encodeURIComponent(name)}&language=en-US`)
    const result = searchData?.results?.[0] ?? null

    let tmdbId: string | null = null
    let headshot_url = ''
    let popularity = 1
    let gender = ''
    let birth_year = ''
    let rawBio = ''
    let knownFor = 'film and television'

    if (result) {
      tmdbId = String(result.id)
      headshot_url = result.profile_path ? `https://image.tmdb.org/t/p/w500${result.profile_path}` : ''
      popularity = result.popularity ?? 1
      gender = result.gender === 1 ? 'female' : result.gender === 2 ? 'male' : ''

      const details = await tmdbGet(`/person/${result.id}?language=en-US&append_to_response=movie_credits,tv_credits`)
      if (details) {
        rawBio = details.biography ?? ''
        birth_year = details.birthday?.split('-')[0] ?? ''
        const movieCredits = (details.movie_credits?.cast ?? [])
          .filter((c: any) => c.vote_count > 30)
          .sort((a: any, b: any) => b.popularity - a.popularity)
          .slice(0, 4).map((c: any) => c.title)
        const tvCredits = (details.tv_credits?.cast ?? [])
          .filter((c: any) => c.vote_count > 20)
          .sort((a: any, b: any) => b.popularity - a.popularity)
          .slice(0, 3).map((c: any) => c.name)
        const credits = [...movieCredits, ...tvCredits].slice(0, 5)
        if (credits.length > 0) knownFor = credits.join('; ')
      }
    }

    // 3. Claude casting profile
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [{
        role: 'user',
        content: `You are a Hollywood casting database editor. Generate a casting profile for ${name}.
Known for: ${knownFor}
Bio: ${rawBio?.slice(0, 300) || 'No bio available'}

Return ONLY this JSON (no markdown):
{
  "biography": "2-3 sentence factual bio focused on career",
  "keywords": "comedy; drama; [genres]; [medium]",
  "archetype": "one compact phrase",
  "strengths": "3-4 strengths, comma-separated",
  "weaknesses": "1-2 honest limitations, comma-separated",
  "best_cast_as": "role types they suit, comma-separated",
  "signature_quality": "one distinctive quality in 10-15 words",
  "career_stage": "one of: emerging | established | legend",
  "casting_profile": "2-3 sentences a casting director would use"
}`,
      }],
    })

    const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
    const match = text.replace(/```json|```/g, '').trim().match(/\{[\s\S]*\}/)
    if (!match) throw new Error('No JSON from Claude')
    const profile = JSON.parse(match[0])

    // 4. Cost from popularity
    function popularityToCost(pop: number) {
      if (pop >= 20) return 12; if (pop >= 15) return 10; if (pop >= 12) return 8
      if (pop >= 10) return 6; if (pop >= 6) return 4; return 3
    }

    const row: Record<string, any> = {
      name, tmdb_id: tmdbId, headshot_url, popularity, cost: popularityToCost(popularity),
      gender, birth_year, biography: profile.biography || rawBio.slice(0, 500),
      known_for: knownFor, keywords: profile.keywords, archetype: profile.archetype,
      strengths: profile.strengths, weaknesses: profile.weaknesses,
      best_cast_as: profile.best_cast_as, signature_quality: profile.signature_quality,
      career_stage: profile.career_stage, casting_profile: profile.casting_profile,
      deep_dive_date: new Date().toISOString().slice(0, 10), salary_confirmed: false,
    }

    const { error } = tmdbId
      ? await service.from('actors').upsert(row, { onConflict: 'tmdb_id' })
      : await service.from('actors').insert(row)

    if (error) throw new Error(error.message)

    // 5. Mark submission done
    await service.from('actor_submissions').update({ status: 'added' }).eq('id', submissionId)

    return Response.json({
      ok: true,
      message: `${name} added (TMDB: ${tmdbId ?? 'not found'}, cost: $${popularityToCost(popularity)}M)`,
    })
  } catch (err) {
    return Response.json({ ok: false, error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}
