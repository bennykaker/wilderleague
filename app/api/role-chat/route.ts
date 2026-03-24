import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'

const client = new Anthropic()

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

    if (action === 'describe') {
      prompt = `You are a sharp, opinionated casting director working on a reboot of "${movie}".

The role is ${role}, originally played by ${originalActor}.

Actor pool (you will suggest from these only):
${actors.join(', ')}

Your tasks:
1. Write 2 sentences describing this character — who they are, what they bring to the film, and what type of actor fits them.
2. Pick 6–8 actors from the pool who genuinely fit this role based on physicality, screen persona, age, and genre history.
3. Write a short proactive follow-up question (10–15 words) offering to help further — e.g. "Want me to find someone with more action experience?" or "Shall I suggest budget-friendly options under $5M?"

Return ONLY this JSON (no markdown, no explanation):
{
  "reply": "2-sentence character description",
  "actors": ["Name One", "Name Two", ...],
  "suggestion": "short follow-up question"
}`
    } else if (action === 'search') {
      prompt = `You are a sharp, opinionated casting director working on a reboot of "${movie}".

The role is ${role}, originally played by ${originalActor}.

The director just said: "${query}"

Actor pool (you will suggest from these only):
${actors.join(', ')}

Your tasks:
1. Pick 6–8 actors from the pool who match this request — consider age, physicality, genre history, vibe.
2. Give a 1–2 sentence reaction: acknowledge what they're going for, flag if it's a bold risk or safe call. Be direct and specific.
3. Optionally write a short follow-up suggestion (10–15 words) or null if nothing useful to add.

Return ONLY this JSON (no markdown, no explanation):
{
  "reply": "your 1-2 sentence reaction",
  "actors": ["Name One", "Name Two", ...],
  "suggestion": "follow-up question or null"
}`
    } else if (action === 'react') {
      prompt = `You are a sharp, opinionated casting director working on a reboot of "${movie}".

The director just cast ${pickedActor} as ${role} (originally ${originalActor}).${pickedActorCost != null ? ` Cost: $${pickedActorCost}M.` : ''}

Give a 1–2 sentence reaction: is this smart, bold, risky, or safe? Be specific about why this actor works or doesn't for this exact role.

Then write a short proactive follow-up suggestion (10–15 words) — e.g. suggest cost-effective alternatives, point out complementary casting for other roles, or flag a creative angle.

Return ONLY this JSON (no markdown, no explanation):
{
  "reply": "your 1-2 sentence reaction",
  "suggestion": "short follow-up suggestion"
}`
    }

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const cleaned = text.replace(/```json|```/g, '').trim()
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('No JSON in role-chat response:', text)
      return Response.json({ reply: '', actors: [] })
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
    return Response.json({ reply: '', actors: [] })
  }
}
