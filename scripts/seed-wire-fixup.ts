import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const env = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
for (const line of env.split('\n')) {
  const m = line.match(/^([^=]+)=(.*)$/)
  if (m) process.env[m[1].trim()] = m[2].trim()
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const TMDB_TOKEN = process.env.TMDB_API_KEY!

// These are in DB already but need WireVerse tag — find by tmdb_id
const DUPLICATES = [
  { name: 'Michael K. Williams', query: 'Michael K. Williams' },
  { name: 'Chad Coleman',        query: 'Chad Coleman' },
  { name: 'Tristan Wilds',       query: 'Tristan Wilds' },
]

async function tmdbSearch(name: string) {
  const res = await fetch(
    `https://api.themoviedb.org/3/search/person?query=${encodeURIComponent(name)}`,
    { headers: { Authorization: `Bearer ${TMDB_TOKEN}`, accept: 'application/json' } }
  )
  const data = await res.json() as { results?: { id: number }[] }
  return data.results?.[0]?.id ?? null
}

async function main() {
  // Tag the duplicates by finding them via tmdb_id
  for (const { name, query } of DUPLICATES) {
    const tmdbId = await tmdbSearch(query)
    if (!tmdbId) { console.log(`${name}: TMDB not found`); continue }

    const { data, error } = await sb.from('actors').update({ universe_tags: 'WireVerse' }).eq('tmdb_id', tmdbId).select('name')
    if (error) console.log(`${name}: ERROR ${error.message}`)
    else console.log(`${name}: tagged (matched as "${data?.[0]?.name ?? '?'}")`)
  }

  // Larry Gilliard Jr. — insert with placeholder headshot
  const { error } = await sb.from('actors').insert({
    name: 'Larry Gilliard Jr.',
    tmdb_id: 62763,
    headshot_url: 'https://www.gravatar.com/avatar/?d=mp&s=500', // generic placeholder
    popularity: 1.0,
    known_for: 'The Wire',
    biography: 'American actor best known for playing D\'Angelo Barksdale in The Wire.',
    birth_year: 1971,
    casting_profile: 'Gilliard brings quiet intensity to conflicted characters. His D\'Angelo Barksdale — torn between loyalty and conscience — was one of The Wire\'s most tragic figures. Best cast as men caught between two worlds.',
    universe_tags: 'WireVerse',
    cost: 2,
  })
  console.log(`Larry Gilliard Jr.: ${error ? `ERROR ${error.message}` : 'done'}`)

  // Final check
  const { count } = await sb.from('actors').select('*', { count: 'exact', head: true }).eq('universe_tags', 'WireVerse')
  console.log(`\nWireVerse total: ${count}`)
}

main()
