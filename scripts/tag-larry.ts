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

async function main() {
  const res = await fetch(
    `https://api.themoviedb.org/3/person/37947`,
    { headers: { Authorization: `Bearer ${TMDB_TOKEN}`, accept: 'application/json' } }
  )
  const p = await res.json() as { name: string; biography?: string; birthday?: string; profile_path?: string; popularity: number }

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [{ role: 'user', content: `You are Marlowe, a veteran Hollywood casting director. Write a 2-3 sentence casting profile for Larry Gilliard Jr., known for playing D'Angelo Barksdale in The Wire. Bio: ${p.biography?.slice(0, 300)}. Be direct and specific.` }],
  })
  const casting_profile = msg.content[0].type === 'text' ? msg.content[0].text : ''

  const { error } = await sb.from('actors').insert({
    name: 'Larry Gilliard Jr.',
    tmdb_id: 37947,
    headshot_url: p.profile_path ? `https://image.tmdb.org/t/p/w500${p.profile_path}` : null,
    popularity: p.popularity,
    known_for: 'The Wire',
    biography: p.biography ?? '',
    birth_year: p.birthday ? parseInt(p.birthday.split('-')[0]) : null,
    casting_profile,
    universe_tags: 'WireVerse',
    cost: 2,
  })
  console.log(error ? `ERROR: ${error.message}` : `Larry Gilliard Jr. added (${p.name})`)

  const { count } = await sb.from('actors').select('*', { count: 'exact', head: true }).eq('universe_tags', 'WireVerse')
  console.log(`WireVerse total: ${count}`)
}

main()
