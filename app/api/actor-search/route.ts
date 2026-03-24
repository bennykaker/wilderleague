import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'

const client = new Anthropic()

interface SearchRequest {
  query: string
  actors: string[]
  movie: string
  roles: string[]
  originalCast: Record<string, string>
}

interface SearchResponse {
  reply: string
  actors: string[]
}

export async function POST(request: NextRequest) {
  const body = await request.json() as SearchRequest
  const { query, actors, movie, roles, originalCast } = body

  if (!query?.trim() || !actors?.length) {
    return Response.json({ reply: '', actors: [] })
  }

  try {
    const originalCastLines = roles
      .map(r => `${r}: ${originalCast[r] ?? 'unknown'}`)
      .join('\n')

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [
        {
          role: 'user',
          content: `You are a sharp, opinionated casting director working on a reboot of "${movie}".

Original cast:
${originalCastLines}

A director just said: "${query}"

Your job:
1. Pick 6–10 actors from the pool who genuinely fit — consider age, physicality, genre history, vibe, cultural fit, known screen persona.
2. Give a short reply (1–2 sentences, max 25 words) that reacts to the request — acknowledge what they're going for, flag if it's a bold or safe call. Be direct, no filler.

Actor pool:
${actors.join(', ')}

Return ONLY this JSON (no markdown, no explanation):
{
  "reply": "your 1-2 sentence reaction",
  "actors": ["Name One", "Name Two", ...]
}`,
        },
      ],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''

    // Extract JSON — handle markdown code fences if present
    const cleaned = text.replace(/```json|```/g, '').trim()
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('No JSON in response:', text)
      return Response.json({ reply: '', actors: [] })
    }

    const parsed = JSON.parse(jsonMatch[0]) as SearchResponse
    const actorSet = new Set(actors)
    const valid = (parsed.actors ?? []).filter(n => actorSet.has(n))

    return Response.json({ reply: parsed.reply ?? '', actors: valid })
  } catch (err) {
    console.error('Actor search error:', err)
    return Response.json({ reply: '', actors: [] })
  }
}
