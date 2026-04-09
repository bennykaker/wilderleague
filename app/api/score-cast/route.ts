import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies, headers } from 'next/headers'
import { extractJson } from '../../../lib/extractJson'

function getKey(): string {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY
  try {
    const fs = require('fs')
    const path = require('path')
    const file = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
    const match = file.match(/^ANTHROPIC_API_KEY=(.+)$/m)
    return match?.[1]?.trim() ?? ''
  } catch { return '' }
}

type CastItem = { role: string; tier: string; actor: string; cost: number }

function computeAward(gl: number, q: number, hmu: number): string | null {
  const avg = (gl + q + hmu) / 3
  if (avg >= 78) return 'best_in_show'
  if (q >= 75 && gl < 45) return 'genius_unmakable'
  if (gl >= 70 && q < 45) return 'makable_unwatchable'
  if (hmu >= 80) return 'hear_me_out'
  return null
}

// Deterministic key from movie + cast selections
function castKey(movieSlug: string, cast: CastItem[]): string {
  const pairs = [...cast]
    .sort((a, b) => a.role.localeCompare(b.role))
    .map(c => `${c.role}:${c.actor}`)
    .join('|')
  return `${movieSlug}||${pairs}`
}

async function generateScores(
  movie: string,
  budget: number,
  spent: number,
  cast: CastItem[],
  model: string,
  isChallenge: boolean = false,
): Promise<{ summary: string; green_light_score: number; quality_score: number; hear_me_out_score: number }> {
  const tierLabel = (t: string) =>
    t === 'first_lead' ? '1st lead' : t === 'second_lead' ? '2nd lead' : t === 'third_lead' ? '3rd lead' : 'supporting'

  const castLines = cast
    .map(c => `- ${c.role} [${tierLabel(c.tier)}]: ${c.actor}`)
    .join('\n')

  const budgetLine = isChallenge
    ? ''
    : `Budget: $${budget}M total, $${spent}M committed (${spent > budget ? `$${spent - budget}M OVER` : `$${budget - spent}M remaining`})\n`

  const challengeContext = isChallenge
    ? `IMPORTANT CONTEXT: This is a Challenge Cast — the user could only choose from a specific curated universe of actors. Budget is not a factor. Judge entirely on creativity, fit, and imagination within those constraints.`
    : `IMPORTANT CONTEXT: This cast was assembled under real constraints — a fixed budget and a curated pool of actors. The user could not simply pick any A-lister they wanted. Credit creative problem-solving. Be generous and enthusiastic. This is a fan casting exercise, not a studio greenlight meeting.`

  const prompt = `You are Marlowe, a veteran Hollywood casting director who loves bold, unexpected choices. You are reviewing a fan cast for "${movie}".

${challengeContext}

${budgetLine}Cast:
${castLines}

Score on three dimensions (0–100 each). Skew generous — these are constrained casts, not studio packages:

HEAR ME OUT SCORE — This is the star of the show. How deliciously unexpected and inspired is this cast?
High score (70+): surprising against-type choices that somehow make sense, combinations nobody saw coming, genuine creative vision.
Low score: completely random, no logic, choices that actively clash with the material.
Be generous here. Reward imagination.

GREEN LIGHT SCORE — Given the constraints, how producible is this?
High score: budget used wisely, leads have some profile, a studio could see the logic.
Low score: budget completely blown, leads are unknowns with no draw at all.
Do NOT penalise for lacking A-listers — that's the whole point of this app.

QUALITY SCORE — How good could this actually be?
High score: actors with real range for these roles, interesting chemistry, inspired genre choices.
Low score: actors actively wrong for the material, tone mismatches that would sink the film.

Marlowe verdict: one sharp, specific sentence of 20 words max. Lead with what's exciting or surprising about this cast. No hedging. No "interesting choice" — say something real.

Return ONLY this JSON (no markdown):
{
  "hear_me_out_score": 0-100,
  "green_light_score": 0-100,
  "quality_score": 0-100,
  "summary": "one-line Marlowe verdict"
}`

  const client = new Anthropic({ apiKey: getKey() })
  const msg = await client.messages.create({
    model,
    max_tokens: 300,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = msg.content[0].type === 'text' ? msg.content[0].text : '{}'
  const jsonStr = extractJson(text.replace(/```json|```/g, '').trim())
  if (!jsonStr) return { summary: 'An interesting cast.', green_light_score: 50, quality_score: 50, hear_me_out_score: 50 }

  const parsed = JSON.parse(jsonStr)
  return {
    summary: parsed.summary ?? 'An interesting cast.',
    green_light_score: Math.min(100, Math.max(0, Math.round(parsed.green_light_score ?? 50))),
    quality_score: Math.min(100, Math.max(0, Math.round(parsed.quality_score ?? 50))),
    hear_me_out_score: Math.min(100, Math.max(0, Math.round(parsed.hear_me_out_score ?? 50))),
  }
}

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { movie_slug, movie_title, budget = 100, cast = [], isChallenge = false } = body

  if (!movie_slug || !cast.length) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const key = castKey(movie_slug, cast as CastItem[])

  // Check cache first
  const { data: cached } = await serviceSupabase
    .from('cast_scores')
    .select('ai_summary, green_light_score, quality_score, hear_me_out_score, award')
    .eq('cast_key', key)
    .single()

  if (cached) {
    // Determine user for backfill
    const cookieStore2 = await cookies()
    const userSupabase2 = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore2.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore2.set(name, value, options))
          },
        },
      }
    )
    const { data: { user: cachedUser } } = await userSupabase2.auth.getUser()
    if (cachedUser) {
      await serviceSupabase
        .from('saved_casts')
        .update({
          ai_score: cached.green_light_score,
          quality_score: cached.quality_score,
          hear_me_out_score: cached.hear_me_out_score,
          ai_summary: cached.ai_summary,
        })
        .eq('user_id', cachedUser.id)
        .eq('cast_key', key)
        .is('ai_score', null)
    }
    return NextResponse.json({ ...cached, cached: true })
  }

  // Determine member status for model selection
  const cookieStore = await cookies()
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  const userSupabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await userSupabase.auth.getUser()
  let isMember = false
  if (user) {
    const { data: profile } = await userSupabase.from('profiles').select('is_member, is_director').eq('id', user.id).single()
    isMember = (profile?.is_member || profile?.is_director) ?? false
  }

  // Rate limit: 5/day guests, 30/day members
  const today = new Date().toISOString().split('T')[0]
  const limitKey = user?.id ?? ip
  const { data: usage } = await serviceSupabase
    .from('review_usage')
    .select('count')
    .eq('ip', limitKey)
    .eq('date', today)
    .eq('type', 'score')
    .single()
  const usageCount = usage?.count ?? 0
  const limit = isMember ? 30 : 5
  if (usageCount >= limit) {
    return NextResponse.json({ error: `Score limit reached (${limit}/day).${!user ? ' Sign in for more.' : ''}` }, { status: 429 })
  }
  await serviceSupabase.from('review_usage').upsert(
    { ip: limitKey, date: today, type: 'score', count: usageCount + 1 },
    { onConflict: 'ip,date,type' }
  )

  const model = 'claude-haiku-4-5-20251001'
  const spent = (cast as CastItem[]).reduce((sum: number, c: CastItem) => sum + (c.cost ?? 0), 0)

  try {
    const result = await generateScores(movie_title ?? movie_slug, budget, spent, cast, model, isChallenge)
    const award = computeAward(result.green_light_score, result.quality_score, result.hear_me_out_score)

    // Store in cache
    await serviceSupabase.from('cast_scores').insert({
      cast_key: key,
      movie_slug,
      ai_summary: result.summary,
      green_light_score: result.green_light_score,
      quality_score: result.quality_score,
      hear_me_out_score: result.hear_me_out_score,
      award,
    })

    // Backfill scores onto any saved cast with matching key (for this user)
    if (user) {
      await serviceSupabase
        .from('saved_casts')
        .update({
          ai_score: result.green_light_score,
          quality_score: result.quality_score,
          hear_me_out_score: result.hear_me_out_score,
          ai_summary: result.summary,
        })
        .eq('user_id', user.id)
        .eq('cast_key', key)
    }

    return NextResponse.json({ ai_summary: result.summary, green_light_score: result.green_light_score, quality_score: result.quality_score, hear_me_out_score: result.hear_me_out_score, award, cached: false })
  } catch (e) {
    console.error('Scoring error:', e)
    return NextResponse.json({ error: 'Scoring failed' }, { status: 500 })
  }
}
