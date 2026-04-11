import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'
import path from 'path'

const env = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
for (const line of env.split('\n')) {
  const m = line.match(/^([^=]+)=(.*)$/)
  if (m) process.env[m[1].trim()] = m[2].trim()
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const TMDB_TOKEN = process.env.TMDB_API_KEY!

const MISSING = [
  'Michael K. Williams',
  'Michael B. Jordan',
  'Jamie Hector',
  'Larry Gilliard Jr.',
  'J.D. Williams',
  'Chad Coleman',
  'Robert F. Chew',
  'Hassan Johnson',
  'Felicia Pearson',
  'Tristan Wilds',
]

async function tmdbSearch(name: string) {
  const res = await fetch(
    `https://api.themoviedb.org/3/search/person?query=${encodeURIComponent(name)}`,
    { headers: { Authorization: `Bearer ${TMDB_TOKEN}`, accept: 'application/json' } }
  )
  const data = await res.json() as { results?: { id: number; name: string; popularity: number; profile_path: string | null }[] }
  return data.results?.[0] ?? null
}

async function tmdbDetails(id: number) {
  const res = await fetch(
    `https://api.themoviedb.org/3/person/${id}`,
    { headers: { Authorization: `Bearer ${TMDB_TOKEN}`, accept: 'application/json' } }
  )
  return res.json() as Promise<{ biography?: string; birthday?: string }>
}

async function generateProfile(name: string, biography: string): Promise<string> {
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [{ role: 'user', content: `You are Marlowe, a veteran Hollywood casting director. Write a 2-3 sentence casting profile for ${name}, known for The Wire. Bio: ${biography.slice(0, 300)}. Be direct and specific.` }],
  })
  return msg.content[0].type === 'text' ? msg.content[0].text : ''
}

async function main() {
  for (const name of MISSING) {
    process.stdout.write(`${name}... `)
    const result = await tmdbSearch(name)
    if (!result) { console.log('NOT FOUND on TMDB'); continue }

    const details = await tmdbDetails(result.id)
    const casting_profile = await generateProfile(name, details.biography ?? '')
    const headshot_url = result.profile_path ? `https://image.tmdb.org/t/p/w500${result.profile_path}` : null
    const birth_year = details.birthday ? parseInt(details.birthday.split('-')[0]) : null

    const { error } = await sb.from('actors').insert({
      name,
      tmdb_id: result.id,
      headshot_url,
      popularity: result.popularity,
      known_for: 'The Wire',
      biography: details.biography ?? '',
      birth_year,
      casting_profile,
      universe_tags: 'WireVerse',
      cost: 2,
    })

    console.log(error ? `ERROR: ${error.message}` : `done (${result.name}, pop ${result.popularity.toFixed(1)})`)
    await new Promise(r => setTimeout(r, 300))
  }
  console.log('\nAll done.')
}

main()
