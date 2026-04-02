import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@supabase/ssr'
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

async function generateScores(
  movie: string,
  budget: number,
  spent: number,
  cast: CastItem[],
  model: string,
): Promise<{ summary: string; green_light_score: number; quality_score: number; hear_me_out_score: number }> {
  const tierLabel = (t: string) =>
    t === 'first_lead' ? '1st lead' : t === 'second_lead' ? '2nd lead' : t === 'third_lead' ? '3rd lead' : 'supporting'

  const castLines = cast
    .map(c => `- ${c.role} [${tierLabel(c.tier)}]: ${c.actor} ($${c.cost}M)`)
    .join('\n')

  const budgetLine = `Budget: $${budget}M total, $${spent}M committed (${spent > budget ? `$${spent - budget}M OVER` : `$${budget - spent}M remaining`})`

  const budgetStatus = spent > budget
    ? `$${spent - budget}M over budget`
    : spent < budget * 0.7
    ? `$${budget - spent}M under budget (possibly leaving money on the table)`
    : 'budget well-managed'

  const prompt = `You are Marlowe, a veteran Hollywood casting director. You've just seen the completed cast and you are genuinely excited to share your reaction. You celebrate what works, call out the inspired choices, and acknowledge the ambition behind the whole package. Even when something is a bold risk you frame it with enthusiasm — this is someone's creative vision and they just put real thought into it. Your verdict is warm, specific, and energising. Make them feel good about what they built.

${budgetLine}
Industry standard allocation: 1st lead 35–40% of budget, 2nd lead 15–20%, 3rd lead 8–12%, supporting 4–8%.
Budget status: ${budgetStatus}.

Cast:
${castLines}

Score this cast on three dimensions (0–100 each):

GREEN LIGHT SCORE — How likely is this to get made?
High score: bankable leads, budget-appropriate spend, proven box office track records, studio-friendly package.
Low score: risky unknowns in lead roles, budget misallocation, going significantly over budget tanks this score hard, unmarketable choices.
Note: being more than 15% over budget should meaningfully hurt this score.

QUALITY SCORE — How good is this film likely to be?
High score: actors with strong dramatic range for these roles, creative/inspired choices, real chemistry potential, correct tier casting.
Low score: wrong-genre casting, actors out of their depth, mismatched tone, money wasted on wrong tiers.

HEAR ME OUT SCORE — How deliciously unexpected is this cast?
High score: genuinely surprising against-type choices that somehow make sense, combinations nobody saw coming.
Low score: safe obvious replacements, straight swaps, no imagination.

Give a one-line Marlowe verdict: warm, specific, celebratory, max 20 words. Lead with the strongest thing about this cast. If they went over budget, mention it briefly but don't let it dominate.

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
  if (!jsonStr) return { summary: 'An interesting cast.', green_light_score: 50, quality_score: 50, hear_me_out_score: 50 }

  const parsed = JSON.parse(jsonStr)
  return {
    summary: parsed.summary ?? 'An interesting cast.',
    green_light_score: Math.min(100, Math.max(0, Math.round(parsed.green_light_score ?? 50))),
    quality_score: Math.min(100, Math.max(0, Math.round(parsed.quality_score ?? 50))),
    hear_me_out_score: Math.min(100, Math.max(0, Math.round(parsed.hear_me_out_score ?? 50))),
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { movie_slug, movie_title, selections, challenge_id, budget = 100, cast = [] } = body

  if (!movie_slug || !selections || Object.keys(selections).length === 0) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

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

  const { data: { user } } = await supabase.auth.getUser()

  // Rate limit: 3/day guests, 20/day members
  const today = new Date().toISOString().split('T')[0]

  let isMemberForLimit = false
  let isDirectorForLimit = false
  let submitterUsername: string | null = null
  if (user) {
    const { data: profileCheck } = await supabase.from('profiles').select('is_member, is_director, username').eq('id', user.id).single()
    isMemberForLimit = profileCheck?.is_member ?? false
    isDirectorForLimit = profileCheck?.is_director ?? false
    submitterUsername = profileCheck?.username ?? null
  }

  const submitLimit = isDirectorForLimit ? 50 : isMemberForLimit ? 20 : user ? 3 : 3
  const submitKey = user ? user.id : ip
  const { data: submitUsage } = await supabase
    .from('review_usage')
    .select('count')
    .eq('ip', submitKey)
    .eq('date', today)
    .eq('type', 'submit')
    .single()
  const submitCount = submitUsage?.count ?? 0
  if (submitCount >= submitLimit) {
    return NextResponse.json({ error: `${user ? (isMemberForLimit ? 'Member' : 'Free account') : 'Guest'} limit reached (${submitLimit} submissions/day).${!user ? ' Sign in for more.' : ''}`, status: 429 }, { status: 429 })
  }
  await supabase.from('review_usage').upsert(
    { ip: submitKey, date: today, type: 'submit', count: submitCount + 1 },
    { onConflict: 'ip,date,type' }
  )

  const spent = (cast as CastItem[]).reduce((sum: number, c: CastItem) => sum + (c.cost ?? 0), 0)

  // Members get Sonnet (richer scoring), guests get Haiku
  const scoringModel = (isMemberForLimit || isDirectorForLimit) ? 'claude-sonnet-4-6' : 'claude-haiku-4-5-20251001'

  // Generate scores
  let summary = 'An interesting cast.'
  let green_light_score = 50
  let quality_score = 50
  let hear_me_out_score = 50
  let award: string | null = null
  let scored = false

  try {
    const result = await generateScores(movie_title ?? movie_slug, budget, spent, cast, scoringModel)
    summary = result.summary
    green_light_score = result.green_light_score
    quality_score = result.quality_score
    hear_me_out_score = result.hear_me_out_score
    award = computeAward(green_light_score, quality_score, hear_me_out_score)
    scored = true
  } catch (e) {
    console.error('AI scoring failed:', e)
  }

  // Insert submission
  const { data, error } = await supabase.from('submissions').insert({
    user_id: user?.id ?? null,
    username: submitterUsername,
    movie_slug,
    challenge_id: challenge_id ?? null,
    selections,
    ai_summary: summary,
    is_cursed: hear_me_out_score >= 70,
    curse_reason: hear_me_out_score >= 70 ? 'High Hear Me Out score.' : '',
    green_light_score,
    quality_score,
    hear_me_out_score,
    award,
    scored,
    ip,
  }).select('id').single()

  if (error) {
    console.error('Insert error:', error)
    return NextResponse.json({ error: 'Failed to save submission' }, { status: 500 })
  }

  return NextResponse.json({ id: data.id })
}
