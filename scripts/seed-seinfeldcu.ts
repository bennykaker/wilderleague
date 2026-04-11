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

const SHOWS = [
  {
    slug: 'seinfeld', title: 'Seinfeld', type: 'tv', year: 1989, budget: 25,
    cast: [
      { name: 'Jerry Seinfeld',   role: 'Jerry Seinfeld',           tier: 1 },
      { name: 'Jason Alexander',  role: 'George Costanza',          tier: 1 },
      { name: 'Julia Louis-Dreyfus', role: 'Elaine Benes',          tier: 1 },
      { name: 'Michael Richards', role: 'Cosmo Kramer',             tier: 1 },
      { name: 'Wayne Knight',     role: 'Newman',                   tier: 2 },
      { name: 'Jerry Stiller',    role: 'Frank Costanza',           tier: 2 },
      { name: 'Estelle Harris',   role: 'Estelle Costanza',         tier: 2 },
      { name: 'Liz Sheridan',     role: 'Helen Seinfeld',           tier: 3 },
      { name: 'Barton Heyman',    role: 'Morty Seinfeld',           tier: 3 },
      { name: "John O'Hurley",    role: 'J. Peterman',              tier: 3 },
      { name: 'Patrick Warburton', role: 'David Puddy',             tier: 3 },
    ],
  },
  {
    slug: 'curb-your-enthusiasm', title: 'Curb Your Enthusiasm', type: 'tv', year: 2000, budget: 20,
    cast: [
      { name: 'Larry David',      role: 'Larry David',      tier: 1 },
      { name: 'Jeff Garlin',      role: 'Jeff Greene',      tier: 1 },
      { name: 'Susie Essman',     role: 'Susie Greene',     tier: 1 },
      { name: 'Cheryl Hines',     role: 'Cheryl David',     tier: 2 },
      { name: 'J.B. Smoove',      role: 'Leon Black',       tier: 2 },
      { name: 'Richard Lewis',    role: 'Richard Lewis',    tier: 2 },
      { name: 'Ted Danson',       role: 'Ted Danson',       tier: 2 },
      { name: 'Mary Steenburgen', role: 'Mary Steenburgen', tier: 2 },
      { name: 'Maggie Wheeler',   role: 'Antoinette',       tier: 3 },
      { name: 'Bob Einstein',     role: 'Marty Funkhouser', tier: 3 },
      { name: 'Richard Kind',     role: 'Various',          tier: 3 },
    ],
  },
]

const ALL_ACTORS = [...new Map(
  SHOWS.flatMap(s => s.cast).map(a => [a.name, a])
).values()]

const actorFirstShow: Record<string, string> = {}
for (const show of SHOWS) {
  for (const a of show.cast) {
    if (!actorFirstShow[a.name]) actorFirstShow[a.name] = show.title
  }
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

async function generateProfile(name: string, biography: string, show: string): Promise<string> {
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [{ role: 'user', content: `You are Marlowe, a veteran Hollywood casting director. Write a 2-3 sentence casting profile for ${name}, known for ${show}. Bio: ${biography.slice(0, 300)}. Direct and specific.` }],
  })
  return msg.content[0].type === 'text' ? msg.content[0].text : ''
}

async function main() {
  const names = ALL_ACTORS.map(a => a.name)
  const { data: existing } = await sb.from('actors').select('name, universe_tags').in('name', names)
  const existingMap = new Map(existing?.map(a => [a.name, a.universe_tags ?? '']) ?? [])

  const toAdd = ALL_ACTORS.filter(a => !existingMap.has(a.name))
  const toTag = ALL_ACTORS.filter(a => existingMap.has(a.name))
  console.log(`${existingMap.size} in DB, ${toAdd.length} to add\n`)

  for (const actor of toTag) {
    const tags = (existingMap.get(actor.name) ?? '').split(',').map((t: string) => t.trim()).filter(Boolean)
    if (!tags.includes('SeinfeldCU')) tags.push('SeinfeldCU')
    await sb.from('actors').update({ universe_tags: tags.join(',') }).eq('name', actor.name)
  }
  console.log(`Tagged ${toTag.length} existing actors\n`)

  for (const actor of toAdd) {
    process.stdout.write(`  ${actor.name}... `)
    const result = await tmdbSearch(actor.name)
    if (!result) { console.log('NOT FOUND'); continue }
    const details = await tmdbDetails(result.id)
    const casting_profile = await generateProfile(actor.name, details.biography ?? '', actorFirstShow[actor.name])
    const { error } = await sb.from('actors').insert({
      name: actor.name,
      tmdb_id: result.id,
      headshot_url: result.profile_path ? `https://image.tmdb.org/t/p/w500${result.profile_path}` : 'https://www.gravatar.com/avatar/?d=mp&s=500',
      popularity: result.popularity,
      known_for: actorFirstShow[actor.name],
      biography: details.biography ?? '',
      birth_year: details.birthday ? parseInt(details.birthday.split('-')[0]) : 1960,
      casting_profile,
      universe_tags: 'SeinfeldCU',
      cost: 2,
    })
    console.log(error ? `ERROR: ${error.message}` : 'done')
    await new Promise(r => setTimeout(r, 300))
  }

  console.log('\nUpserting titles...')
  await sb.from('titles').upsert(
    SHOWS.map(s => ({ slug: s.slug, title: s.title, type: s.type, year: s.year, budget: s.budget })),
    { onConflict: 'slug' }
  )

  console.log('Seeding roles...')
  for (const show of SHOWS) {
    const { data: existingRoles } = await sb.from('roles').select('role_name').eq('title_slug', show.slug)
    const existingNames = new Set(existingRoles?.map(r => r.role_name) ?? [])
    let added = 0
    for (const actor of show.cast) {
      if (existingNames.has(actor.role)) continue
      const { error } = await sb.from('roles').insert({ title_slug: show.slug, role_name: actor.role, original_actor: actor.name, tier: actor.tier })
      if (!error) added++
    }
    console.log(`  ${show.title}: ${added} roles added`)
  }

  const { count } = await sb.from('actors').select('*', { count: 'exact', head: true }).ilike('universe_tags', '%SeinfeldCU%')
  console.log(`\nSeinfeldCU total: ${count}`)
}

main()
