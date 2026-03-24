import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'
import fs from 'fs'
import path from 'path'
import { getEnrichedActors, type EnrichedActor } from '../../data/enrichedActors'

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
  query?: string
  pickedActor?: string
  pickedActorCost?: number
}

interface RoleChatResponse {
  reply: string
  actors?: string[]
  suggestion?: string | null
}

// Format an actor as a single rich line for Marlowe
function formatActor(a: EnrichedActor): string {
  const parts: string[] = [`${a.name}`]
  const meta: string[] = []
  if (a.gender) meta.push(a.gender)
  if (a.birth_year) meta.push(`b.${a.birth_year}`)
  meta.push(`$${a.cost}M`)
  if (meta.length) parts.push(`(${meta.join(', ')})`)
  if (a.known_for) parts.push(`known for: ${a.known_for}`)
  if (a.keywords) parts.push(`[${a.keywords}]`)
  return parts.join(' — ')
}

// Pre-filter actors to a relevant subset before sending to Marlowe
function selectPool(actors: EnrichedActor[], query: string, limit = 200): EnrichedActor[] {
  const q = query.toLowerCase()

  // Detect gender hints in query
  const wantsFemale = /\b(woman|female|girl|she|her|actress)\b/.test(q)
  const wantsMale = /\b(man|male|guy|he|him|actor)\b/.test(q)

  let pool = actors

  if (wantsFemale) pool = pool.filter(a => a.gender === 'female')
  else if (wantsMale) pool = pool.filter(a => a.gender === 'male')

  // Detect genre hints
  const genres = ['action', 'drama', 'comedy', 'thriller', 'sci-fi', 'horror', 'romance', 'crime']
  const wantedGenres = genres.filter(g => q.includes(g))
  if (wantedGenres.length > 0) {
    const genreMatches = pool.filter(a => wantedGenres.some(g => a.keywords.includes(g)))
    if (genreMatches.length >= 20) pool = genreMatches
  }

  return pool.slice(0, limit)
}

export async function POST(request: NextRequest) {
  const body = await request.json() as RoleChatRequest
  const { action, role, movie, originalActor, query = '', pickedActor, pickedActorCost } = body

  if (!action || !role) {
    return Response.json({ reply: '', actors: [] })
  }

  const allActors = getEnrichedActors()
  const pool = selectPool(allActors, query || role)
  const poolText = pool.map(formatActor).join('\n')
  const allNames = new Set(allActors.map(a => a.name))

  const persona = `You are Marlowe, a veteran Hollywood casting director with 30 years of experience and strong opinions. You have encyclopedic knowledge of actors — their range, box office history, screen presence, and reputation on set. You are direct, confident, and occasionally withering. You do not hedge. When something is a bad idea you say so. When something is inspired you say that too.`

  let prompt = ''

  try {
    if (action === 'describe') {
      prompt = `${persona}

You are working on a reboot of "${movie}". The role is ${role}, originally played by ${originalActor}.

Actor pool (suggest ONLY names that appear exactly in this list):
${poolText}

Your tasks:
1. Write 2 sharp sentences describing this character — their essence, what they demand from an actor, what the original performance got right or wrong.
2. Pick 6–10 actors from the pool who genuinely fit — think physicality, age, screen persona, genre credibility.
3. Write a punchy follow-up question (10–15 words) offering to go deeper.

Return ONLY this JSON (no markdown):
{
  "reply": "2-sentence character description",
  "actors": ["Exact Name", ...],
  "suggestion": "follow-up question"
}`

    } else if (action === 'search') {
      prompt = `${persona}

You are working on a reboot of "${movie}". The role is ${role}, originally played by ${originalActor}.

The director just said: "${query}"

Actor pool (suggest ONLY names that appear exactly in this list):
${poolText}

Your tasks:
1. Pick 6–10 actors from the pool who genuinely match this request. Be rigorous — if only 4 truly fit, return 4.
2. Give a 1–2 sentence reaction: is this a smart instinct, a bold swing, or a safe play? Be specific.
3. Optionally write a pointed follow-up question (10–15 words), or null.

Return ONLY this JSON (no markdown):
{
  "reply": "your reaction",
  "actors": ["Exact Name", ...],
  "suggestion": "follow-up question or null"
}`

    } else if (action === 'react') {
      prompt = `${persona}

You are working on a reboot of "${movie}". The director just cast ${pickedActor} as ${role} (originally ${originalActor}).${pickedActorCost != null ? ` Cost: $${pickedActorCost}M.` : ''}

Give a 1–2 sentence reaction — smart move, bold risk, or mistake? Be specific about why this actor works or doesn't for this exact role.

Then write a sharp follow-up suggestion (10–15 words).

Return ONLY this JSON (no markdown):
{
  "reply": "your reaction",
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

    // Validate returned names against full actor list
    const validActors = (parsed.actors ?? []).filter(n =>
      allNames.has(n) || allActors.some(a => a.name.toLowerCase() === n.toLowerCase())
    )

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
