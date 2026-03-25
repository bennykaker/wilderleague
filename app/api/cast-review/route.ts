import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic()

export interface CastReviewRequest {
  movie: string
  budget: number
  spent: number
  cast: Array<{
    role: string
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

  const castList = cast
    .map(c => `- ${c.role}: ${c.newActor} (was ${c.originalActor}, $${c.cost}M${!c.salaryConfirmed ? ' est' : ''})`)
    .join('\n')

  const uncastList = uncastRoles.length > 0
    ? `\nUncast roles: ${uncastRoles.join(', ')}`
    : ''

  const budgetLine = `Budget: $${budget}M total, $${spent}M committed (${spent > budget ? `$${spent - budget}M OVER` : `$${budget - spent}M remaining`})`

  const prompt = `You are reviewing a fan recast of "${movie}".

${budgetLine}

Proposed cast:
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
    "notes": "3-5 sentences from an EP's POV — box office viability, budget allocation, proven track record, completion risk, whether the spend makes sense against the return"
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
