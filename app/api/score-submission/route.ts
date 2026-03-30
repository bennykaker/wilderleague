import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import { getTitle, getRolesForTitle } from '../../data/titles'
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

async function generateScores(
  movie: string,
  budget: number,
  spent: number,
  cast: CastItem[],
  model: string,
): Promise<{ summary: string; green_light_score: number; quality_score: number; hear_me_out_score: number }> {
  const tierLabel = (t: string) =>
    t === 'first_lead' ? '1st lead' : t === 'second_lead' ? '2nd lead' : t === 'third_lead' ? '3rd lead' : 'supporting'

  const castLines = cast.map(c => `- ${c.role} [${tierLabel(c.tier)}]: ${c.actor} ($${c.cost}M)`).join('\n')
  const budgetLine = `Budget: $${budget}M total, $${spent}M committed (${spent > budget ? `$${spent - budget}M OVER` : `$${budget - spent}M remaining`})`

  const prompt = `You are a Hollywood industry analyst reviewing a proposed cast for a reboot of "${movie}".

${budgetLine}
Industry standard allocation: 1st lead 35–40% of budget, 2nd lead 15–20%, 3rd lead 8–12%, supporting 4–8%.

Cast:
${castLines}

Score this cast on three dimensions (0–100 each):

GREEN LIGHT SCORE — How likely is this to get made?
QUALITY SCORE — How good is this film likely to be?
HEAR ME OUT SCORE — How deliciously unexpected is this cast?

Also give a one-line Marlowe verdict (sharp, specific, max 20 words — no hedging).

Return ONLY this JSON (no markdown):
{
  "green_light_score": 0-100,
  "quality_score": 0-100,
  "hear_me_out_score": 0-100,
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
  if (!jsonStr) throw new Error('No JSON in response')

  const parsed = JSON.parse(jsonStr)
  return {
    summary: parsed.summary ?? 'An interesting cast.',
    green_light_score: Math.min(100, Math.max(0, Math.round(parsed.green_light_score ?? 50))),
    quality_score: Math.min(100, Math.max(0, Math.round(parsed.quality_score ?? 50))),
    hear_me_out_score: Math.min(100, Math.max(0, Math.round(parsed.hear_me_out_score ?? 50))),
  }
}

export async function POST(req: NextRequest) {
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing submission id' }, { status: 400 })

  const cookieStore = await cookies()
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  const supabase = createServerClient(
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

  // Fetch the submission
  const { data: submission, error: fetchError } = await supabase
    .from('submissions')
    .select('id, movie_slug, selections, scored, ip')
    .eq('id', id)
    .single()

  if (fetchError || !submission) return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
  if (submission.scored) return NextResponse.json({ error: 'Already scored' }, { status: 409 })

  // Only the submitter (by IP) or authenticated user can retry
  const { data: { user } } = await supabase.auth.getUser()
  if (!user && submission.ip !== ip) {
    return NextResponse.json({ error: 'Not authorised to score this submission' }, { status: 403 })
  }

  // Determine model
  let isMember = false
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('is_member').eq('id', user.id).single()
    isMember = profile?.is_member ?? false
  }
  const scoringModel = isMember ? 'claude-sonnet-4-6' : 'claude-haiku-4-5-20251001'

  // Rebuild cast with costs from DB
  const title = await getTitle(submission.movie_slug)
  const roles = await getRolesForTitle(submission.movie_slug)
  const selections: Record<string, string> = submission.selections ?? {}

  const actorNames = Object.values(selections).filter(Boolean)
  const { data: actorRows } = await supabase
    .from('actors')
    .select('name, cost')
    .in('name', actorNames)

  const costMap: Record<string, number> = {}
  for (const a of actorRows ?? []) costMap[a.name] = a.cost

  const cast: CastItem[] = roles
    .filter(r => selections[r.role_name])
    .map(r => ({
      role: r.role_name,
      tier: r.tier ?? 'supporting',
      actor: selections[r.role_name],
      cost: costMap[selections[r.role_name]] ?? 0,
    }))

  const budget = title?.budget ?? 100
  const spent = cast.reduce((sum, c) => sum + c.cost, 0)

  try {
    const result = await generateScores(title?.title ?? submission.movie_slug, budget, spent, cast, scoringModel)
    const award = computeAward(result.green_light_score, result.quality_score, result.hear_me_out_score)

    await supabase.from('submissions').update({
      ai_summary: result.summary,
      green_light_score: result.green_light_score,
      quality_score: result.quality_score,
      hear_me_out_score: result.hear_me_out_score,
      award,
      is_cursed: result.hear_me_out_score >= 70,
      curse_reason: result.hear_me_out_score >= 70 ? 'High Hear Me Out score.' : '',
      scored: true,
    }).eq('id', id)

    return NextResponse.json({
      summary: result.summary,
      green_light_score: result.green_light_score,
      quality_score: result.quality_score,
      hear_me_out_score: result.hear_me_out_score,
      award,
    })
  } catch (e) {
    console.error('Retry scoring failed:', e)
    return NextResponse.json({ error: 'Scoring failed. Try again in a moment.' }, { status: 503 })
  }
}
