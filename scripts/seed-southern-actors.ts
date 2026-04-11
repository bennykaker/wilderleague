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

const STATE_ACTORS: Record<string, string[]> = {
  Florida: [
    'Wesley Snipes', 'Angela Bassett', 'William H. Macy', 'Johnny Depp',
    'Norman Reedus', 'Christian Slater', 'Patrick Wilson', 'Zoë Kravitz',
    'Maya Rudolph', 'Josh Gad', 'Andy Garcia', 'Megan Fox',
    'Carla Gugino', 'Brittany Snow', 'Delta Burke', 'Victoria Justice',
    'Bella Thorne', 'Noah Centineo', 'Justice Smith', 'Brandon Flynn',
    'Eric André', 'Shawn Pyfrom', 'Wilmer Valderrama', 'Ben Vereen',
    'Darrell Hammond', 'Stephen Root', 'Danny Pino', 'Enrique Murciano',
    'Shea Whigham', 'Casper Van Dien', 'Linden Ashby', 'Josh Segarra',
    'Carter Jenkins', 'Blake Jenner', 'Ashley Greene', 'Cheryl Hines',
    'Jeanine Mason', 'Luke Tennie', 'RJ Cyler', 'Skyler Gisondo',
    'Noel Gugliemi', 'Cassius Willis', 'Jake Abel', 'Graham Patrick Martin',
  ],
  Georgia: [
    'Julia Roberts', 'Dakota Fanning', 'Elle Fanning', 'Chloe Grace Moretz',
    'Jeff Daniels', 'Chris Tucker', 'Danny McBride', 'Ed Helms',
    'Walton Goggins', 'Colman Domingo', 'Aldis Hodge', 'Shameik Moore',
    'Jack McBrayer', 'Andre Benjamin', 'Chandler Riggs', 'Iain Armitage',
    'Javon Walton', 'Sunny Suljic', 'Ryan Seacrest', 'Benjamin Walker',
    'Kevin Dunn', 'Evan Ross', 'Jermaine Fowler', 'Robbie Jones',
    'Mylena Murray',
  ],
  Alabama: [
    'Channing Tatum', 'Courteney Cox', 'Laverne Cox', 'Michael Biehn',
    'Michael Rooker', 'Lucas Black', 'Kim Dickens', 'Octavia Spencer',
    'Andre Holland', 'Johnny Ray Gill', 'Kyle Gallner', 'Amber Benson',
    'Felicia Day', 'Lee Pace', 'Walton Goggins', 'Clayne Crawford',
    'Timothy Olyphant', 'Jim Parsons', 'Sela Ward', 'Kimberly Williams-Paisley',
    'Debby Ryan',
  ],
}

async function tmdbSearch(name: string) {
  const res = await fetch(
    `https://api.themoviedb.org/3/search/person?query=${encodeURIComponent(name)}`,
    { headers: { Authorization: `Bearer ${TMDB_TOKEN}`, accept: 'application/json' } }
  )
  const data = await res.json() as { results?: { id: number; name: string; popularity: number; profile_path: string | null }[] }
  return data.results?.[0] ?? null
}

async function tmdbDetails(id: number) {
  const res = await fetch(`https://api.themoviedb.org/3/person/${id}`,
    { headers: { Authorization: `Bearer ${TMDB_TOKEN}`, accept: 'application/json' } }
  )
  return res.json() as Promise<{ biography?: string; birthday?: string }>
}

async function generateProfile(name: string, biography: string): Promise<string> {
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [{ role: 'user', content: `You are Marlowe, a veteran Hollywood casting director. Write a 2-3 sentence casting profile for ${name}. Bio: ${biography.slice(0, 300)}. Direct and specific.` }],
  })
  return msg.content[0].type === 'text' ? msg.content[0].text : ''
}

async function seedState(state: string, actors: string[]) {
  console.log(`\n=== ${state.toUpperCase()} (${actors.length} actors) ===`)

  const { data: existing } = await sb.from('actors').select('name, nationality').in('name', actors)
  const existingMap = new Map(existing?.map(a => [a.name, a]) ?? [])

  const toAdd = actors.filter(n => !existingMap.has(n))
  const toUpdate = actors.filter(n => existingMap.has(n))

  console.log(`${existingMap.size} in DB, ${toAdd.length} to add`)

  // Tag existing — append state to nationality if not already present
  console.log('Tagging existing actors...')
  for (const name of toUpdate) {
    const current = existingMap.get(name)?.nationality ?? ''
    const alreadyTagged = current.toLowerCase().includes(state.toLowerCase())
    if (!alreadyTagged) {
      const newNat = current ? `${current},${state}` : state
      await sb.from('actors').update({ nationality: newNat }).eq('name', name)
    }
    process.stdout.write('.')
  }
  console.log(`\nTagged ${toUpdate.length} existing actors`)

  console.log('Adding missing actors...')
  let added = 0, notFound = 0
  for (const name of toAdd) {
    process.stdout.write(`  ${name}... `)
    const result = await tmdbSearch(name)
    if (!result) { console.log('NOT FOUND'); notFound++; continue }

    const { data: byId } = await sb.from('actors').select('name, nationality').eq('tmdb_id', result.id)
    if (byId && byId.length > 0) {
      const current = byId[0].nationality ?? ''
      const alreadyTagged = current.toLowerCase().includes(state.toLowerCase())
      if (!alreadyTagged) {
        const newNat = current ? `${current},${state}` : state
        await sb.from('actors').update({ nationality: newNat }).eq('tmdb_id', result.id)
      }
      console.log(`tagged existing (${byId[0].name})`); continue
    }

    const details = await tmdbDetails(result.id)
    const casting_profile = await generateProfile(name, details.biography ?? '')
    const { error } = await sb.from('actors').insert({
      name,
      tmdb_id: result.id,
      headshot_url: result.profile_path ? `https://image.tmdb.org/t/p/w500${result.profile_path}` : 'https://www.gravatar.com/avatar/?d=mp&s=500',
      popularity: result.popularity,
      known_for: name,
      biography: details.biography ?? '',
      birth_year: details.birthday ? parseInt(details.birthday.split('-')[0]) : 1970,
      casting_profile,
      nationality: state,
      cost: 2,
    })
    if (error) { console.log(`ERROR: ${error.message}`) } else { console.log('done'); added++ }
    await new Promise(r => setTimeout(r, 300))
  }

  const { count } = await sb.from('actors').select('*', { count: 'exact', head: true })
    .ilike('nationality', `%${state}%`)
  console.log(`\nDone. Added ${added} new, ${notFound} not found.`)
  console.log(`Total ${state} actors in DB: ${count}`)
}

async function main() {
  for (const [state, actors] of Object.entries(STATE_ACTORS)) {
    await seedState(state, actors)
  }
}

main()
