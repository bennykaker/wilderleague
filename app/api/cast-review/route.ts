import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const client = new Anthropic()

export interface CastReviewRequest {
  movie: string
  budget: number
  spent: number
  cast: Array<{
    role: string
    tier: string
    originalActor: string
    newActor: string
    cost: number
    salaryConfirmed: boolean
  }>
  uncastRoles: string[]
}

export interface CastReviewResponse {
  director: { verdict: string; notes: string }
  execProducer: { verdict: string; notes: string }
  marketer: { verdict: string; notes: string }
}

export async function POST(req: NextRequest) {
  const body: CastReviewRequest = await req.json()
  const { movie, budget, spent, cast, uncastRoles } = body

  const cookieStore = await cookies()
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
  if (!user) return NextResponse.json({ error: 'Members only' }, { status: 403 })

  const { data: profile } = await supabase.from('profiles').select('is_director').eq('id', user.id).single()
  if (!profile?.is_director) return NextResponse.json({ error: 'Director tier required' }, { status: 403 })

  // Rate limit: 20 production meetings/day
  const today = new Date().toISOString().split('T')[0]
  const { data: usage } = await supabase
    .from('review_usage')
    .select('count')
    .eq('ip', user.id)
    .eq('date', today)
    .eq('type', 'cast_review')
    .single()
  const count = usage?.count ?? 0
  if (count >= 20) {
    return NextResponse.json({ error: 'Production Meeting limit reached (20/day).' }, { status: 429 })
  }
  await supabase.from('review_usage').upsert(
    { ip: user.id, date: today, type: 'cast_review', count: count + 1 },
    { onConflict: 'ip,date,type' }
  )

  const tierLabel = (t: string) =>
    t === 'first_lead' ? '1st lead' : t === 'second_lead' ? '2nd lead' : t === 'third_lead' ? '3rd lead' : 'supporting'

  const castList = cast
    .map(c => `- ${c.role} [${tierLabel(c.tier)}]: ${c.newActor} (was ${c.originalActor}, $${c.cost}M${!c.salaryConfirmed ? ' est' : ''})`)
    .join('\n')

  // Compute expected ranges per tier
  const tierRanges: Record<string, [number, number]> = {
    first_lead:  [0.35, 0.40],
    second_lead: [0.15, 0.20],
    third_lead:  [0.08, 0.12],
    supporting:  [0.04, 0.08],
  }
  const allocationNotes = cast.map(c => {
    const [lo, hi] = tierRanges[c.tier] ?? tierRanges.supporting
    const loM = Math.round(budget * lo)
    const hiM = Math.round(budget * hi)
    if (c.cost > hiM * 1.5) return `${c.newActor} at $${c.cost}M is significantly OVER the expected $${loM}–$${hiM}M range for a ${tierLabel(c.tier)}`
    if (c.cost < loM * 0.5 && c.tier === 'first_lead') return `${c.newActor} at $${c.cost}M seems UNDER-cast for a ${tierLabel(c.tier)} (expected $${loM}–$${hiM}M)`
    return null
  }).filter(Boolean).join('; ')

  const uncastList = uncastRoles.length > 0
    ? `\nUncast roles: ${uncastRoles.join(', ')}`
    : ''

  const budgetLine = `Budget: $${budget}M total, $${spent}M committed (${spent > budget ? `$${spent - budget}M OVER` : `$${budget - spent}M remaining`})`

  const budgetAllocationNote = allocationNotes
    ? `\nBudget allocation flags: ${allocationNotes}`
    : ''

  const prompt = `You are reviewing a fan recast of "${movie}".

${budgetLine}

Industry standard allocation: first lead 35–40% of budget, second lead 15–20%, third lead 8–12%, supporting 4–8%.${budgetAllocationNote}

Proposed cast (with role tier):
${castList}${uncastList}

Write three short, punchy reviews of this casting — one from each of these industry voices. Each review should be 3–5 sentences, opinionated, and reference specific casting choices by name. No hedging. These are real people with real agendas.

Return ONLY valid JSON, no markdown:
{
  "director": {
    "verdict": "one-line summary (e.g. 'Inspired chaos' or 'A disaster waiting to happen')",
    "notes": "3-5 sentences from a director's POV — creative chemistry, vision, whether the actors can carry the emotional weight, any surprising or troubling choices"
  },
  "execProducer": {
    "verdict": "one-line financial verdict",
    "notes": "3-5 sentences from an EP's POV — specifically address whether the budget allocation makes sense: is the money front-loaded on leads or wasted on supporting roles? Call out any actor whose cost is out of proportion to their billing. Comment on proven box office track record and completion risk."
  },
  "marketer": {
    "verdict": "one-line marketability verdict",
    "notes": "3-5 sentences from a marketing VP's POV — 4-quadrant appeal, poster/trailer potential, social media buzz, international markets, press junket strength"
  }
}`

  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
    const match = text.replace(/```json|```/g, '').trim().match(/\{[\s\S]*\}/)
    if (!match) return NextResponse.json({ error: 'No JSON in response' }, { status: 500 })

    const data: CastReviewResponse = JSON.parse(match[0])
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
