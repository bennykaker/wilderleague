import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'

const client = new Anthropic()

export async function POST(request: NextRequest) {
  const { query, actors } = await request.json() as { query: string; actors: string[] }

  if (!query?.trim() || !actors?.length) {
    return Response.json({ actors: [] })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    // Fallback: simple name match
    const lower = query.toLowerCase()
    const matches = actors.filter(n => n.toLowerCase().includes(lower))
    return Response.json({ actors: matches.slice(0, 10) })
  }

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: `You are a casting director's assistant. A director says: "${query}"

From the following actor pool, return the names that best match this description — consider age, vibe, genre history, physicality, cultural background, known persona.

Actor pool:
${actors.join(', ')}

Return ONLY a JSON array of matching actor names (up to 10, best matches first). Use exact names from the list. Example: ["Name One", "Name Two"]`,
        },
      ],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const match = text.match(/\[[\s\S]*\]/)
    if (!match) return Response.json({ actors: [] })

    const names: string[] = JSON.parse(match[0])
    const actorSet = new Set(actors)
    const valid = names.filter(n => actorSet.has(n))

    return Response.json({ actors: valid })
  } catch (err) {
    console.error('Actor search error:', err)
    return Response.json({ actors: [] })
  }
}
