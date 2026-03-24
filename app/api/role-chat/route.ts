import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'
import fs from 'fs'
import path from 'path'

function getApiKey(): string {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY
  try {
    const file = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
    const match = file.match(/^ANTHROPIC_API_KEY=(.+)$/m)
    return match?.[1]?.trim() ?? ''
  } catch { return '' }
}

const client = new Anthropic({ apiKey: getApiKey() })

interface RoleChatRequest {
  action: 'describe' | 'search' | 'react'
  role: string
  movie: string
  originalActor: string
  actors?: string[]
  query?: string
  pickedActor?: string
  pickedActorCost?: number
}

interface RoleChatResponse {
  reply: string
  actors?: string[]
  suggestion?: string | null
}

export async function POST(request: NextRequest) {
  const body = await request.json() as RoleChatRequest
  const { action, role, movie, originalActor, actors = [], query, pickedActor, pickedActorCost } = body

  if (!action || !role) {
    return Response.json({ reply: '', actors: [] })
  }

  try {
    let prompt = ''

    const persona = `You are Marlowe, a veteran Hollywood casting director with 30 years of experience and strong opinions. You have an encyclopedic knowledge of actors — their range, their box office history, their screen presence, their reputation on set. You are direct, confident, and occasionally withering. You do not hedge. When something is a bad idea you say so. When something is inspired you say that too.`

    if (action === 'describe') {
      prompt = `${persona}

You are working on a reboot of "${movie}". The role is ${role}, originally played by ${originalActor}.

Actor pool (suggest from these only):
${actors.join(', ')}

Your tasks:
1. Write 2 sharp sentences describing this character — their essence, what they demand from an actor, what the original performance got right or wrong.
2. Pick 6–8 actors from the pool who genuinely fit — think physicality, age, screen persona, genre credibility, and chemistry potential with the rest of the cast.
3. Write a punchy follow-up question (10–15 words) offering to go deeper — e.g. "Want me to find someone younger who can actually do the action?" or "Shall I look at who's under $5M and still credible?"

Return ONLY this JSON (no markdown, no explanation):
{
  "reply": "2-sentence character description in Marlowe's voice",
  "actors": ["Name One", "Name Two", ...],
  "suggestion": "follow-up question"
}`
    } else if (action === 'search') {
      prompt = `${persona}

You are working on a reboot of "${movie}". The role is ${role}, originally played by ${originalActor}.

The director just said: "${query}"

Actor pool (suggest from these only):
${actors.join(', ')}

Your tasks:
1. Pick 6–8 actors from the pool who genuinely match this request — be rigorous, not generous. If only 3 really fit, return 3.
2. Give a 1–2 sentence reaction in Marlowe's voice: is this a smart instinct, a bold swing, or a safe play? Be specific about why.
3. Optionally write a pointed follow-up question (10–15 words), or null if you have nothing to add.

Return ONLY this JSON (no markdown, no explanation):
{
  "reply": "your reaction in Marlowe's voice",
  "actors": ["Name One", "Name Two", ...],
  "suggestion": "follow-up question or null"
}`
    } else if (action === 'react') {
      prompt = `${persona}

You are working on a reboot of "${movie}". The director just cast ${pickedActor} as ${role} (originally played by ${originalActor}).${pickedActorCost != null ? ` Cost: $${pickedActorCost}M.` : ''}

Give a 1–2 sentence reaction in Marlowe's voice — is this a smart move, a bold risk, or a mistake? Be specific about why this actor works or doesn't for this exact role.

Then write a sharp follow-up suggestion (10–15 words) — push them toward the next decision: cost, chemistry, an alternative angle.

Return ONLY this JSON (no markdown, no explanation):
{
  "reply": "your reaction in Marlowe's voice",
  "suggestion": "follow-up suggestion"
}`
    }

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const cleaned = text.replace(/```json|```/g, '').trim()
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('No JSON in role-chat response:', text)
      return Response.json({ error: `Unexpected AI response: ${text.slice(0, 120)}`, reply: '', actors: [] })
    }

    const parsed = JSON.parse(jsonMatch[0]) as RoleChatResponse
    const actorSet = new Set(actors)
    const validActors = (parsed.actors ?? []).filter(n => actorSet.has(n))

    return Response.json({
      reply: parsed.reply ?? '',
      actors: validActors,
      suggestion: parsed.suggestion ?? null,
    })
  } catch (err) {
    console.error('Role chat error:', err)
    const msg = err instanceof Error ? err.message : String(err)
    return Response.json({ error: msg, reply: '', actors: [] })
  }
}
