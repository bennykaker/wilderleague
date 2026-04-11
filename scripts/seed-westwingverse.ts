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

const CAST = [
  { name: 'Martin Sheen',       role: 'President Josiah Bartlet',  tier: 1 },
  { name: 'Rob Lowe',           role: 'Sam Seaborn',               tier: 1 },
  { name: 'Allison Janney',     role: 'C.J. Cregg',                tier: 1 },
  { name: 'Bradley Whitford',   role: 'Josh Lyman',                tier: 1 },
  { name: 'Richard Schiff',     role: 'Toby Ziegler',              tier: 1 },
  { name: 'Dulé Hill',          role: 'Charlie Young',             tier: 2 },
  { name: 'Janel Moloney',      role: 'Donna Moss',                tier: 2 },
  { name: 'John Spencer',       role: 'Leo McGarry',               tier: 1 },
  { name: 'Stockard Channing',  role: 'Abbey Bartlet',             tier: 2 },
  { name: 'Joshua Malina',      role: 'Will Bailey',               tier: 2 },
  { name: 'Mary McCormack',     role: 'Kate Harper',               tier: 2 },
  { name: 'Jimmy Smits',        role: 'Matt Santos',               tier: 2 },
  { name: 'Alan Alda',          role: 'Arnold Vinick',             tier: 2 },
  { name: 'Timothy Busfield',   role: 'Danny Concannon',           tier: 2 },
  { name: 'Kristin Chenoweth',  role: 'Annabeth Schott',           tier: 2 },
  { name: 'Ron Silver',         role: 'Bruno Gianelli',            tier: 2 },
  { name: 'Oliver Platt',       role: "Leo's Lawyer",              tier: 3 },
  { name: 'NiCole Robinson',    role: 'Margaret Hooper',           tier: 3 },
  { name: 'Melissa Fitzgerald', role: 'Carol Fitzpatrick',         tier: 3 },
  { name: 'Kathryn Joosten',    role: 'Mrs. Landingham',           tier: 2 },
  { name: 'Lily Tomlin',        role: 'Debbie Fiderer',            tier: 2 },
  { name: 'Anna Deavere Smith', role: 'Nancy McNally',             tier: 2 },
  { name: 'Peter James Smith',  role: 'Ed',                        tier: 3 },
  { name: 'Bill O\'Brien',      role: 'Larry',                     tier: 3 },
  { name: 'Devika Parikh',      role: 'Bonnie',                    tier: 3 },
  { name: 'Kris Murphy',        role: 'Ginger',                    tier: 3 },
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
  const res = await fetch(`https://api.themoviedb.org/3/person/${id}`,
    { headers: { Authorization: `Bearer ${TMDB_TOKEN}`, accept: 'application/json' } }
  )
  return res.json() as Promise<{ biography?: string; birthday?: string }>
}

async function generateProfile(name: string, biography: string): Promise<string> {
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [{ role: 'user', content: `You are Marlowe, a veteran Hollywood casting director. Write a 2-3 sentence casting profile for ${name}, known for The West Wing. Bio: ${biography.slice(0, 300)}. Direct and specific.` }],
  })
  return msg.content[0].type === 'text' ? msg.content[0].text : ''
}

async function main() {
  const names = CAST.map(a => a.name)

  // Check who's already in the DB by exact name
  const { data: existing } = await sb.from('actors').select('name, universe_tags').in('name', names)
  const existingMap = new Map(existing?.map(a => [a.name, a.universe_tags ?? '']) ?? [])

  const toAdd = CAST.filter(a => !existingMap.has(a.name))
  const toTag = CAST.filter(a => existingMap.has(a.name))
  console.log(`${existingMap.size} in DB, ${toAdd.length} to add\n`)

  // Tag existing actors
  for (const actor of toTag) {
    const tags = (existingMap.get(actor.name) ?? '').split(',').map((t: string) => t.trim()).filter(Boolean)
    if (!tags.includes('SorkVerse')) tags.push('SorkVerse')
    if (!tags.includes('WestWingVerse')) tags.push('WestWingVerse')
    await sb.from('actors').update({ universe_tags: tags.join(',') }).eq('name', actor.name)
    console.log(`  tagged: ${actor.name}`)
  }

  // Add missing actors via TMDB
  console.log('\nAdding missing actors...')
  for (const actor of toAdd) {
    process.stdout.write(`  ${actor.name}... `)
    const result = await tmdbSearch(actor.name)
    if (!result) { console.log('NOT FOUND on TMDB'); continue }

    // Check if TMDB ID already exists under a different name
    const { data: byId } = await sb.from('actors').select('name, universe_tags').eq('tmdb_id', result.id)
    if (byId && byId.length > 0) {
      const tags = (byId[0].universe_tags ?? '').split(',').map((t: string) => t.trim()).filter(Boolean)
      if (!tags.includes('SorkVerse')) tags.push('SorkVerse')
      if (!tags.includes('WestWingVerse')) tags.push('WestWingVerse')
      await sb.from('actors').update({ universe_tags: tags.join(',') }).eq('tmdb_id', result.id)
      console.log(`tagged existing (${byId[0].name})`)
      continue
    }

    const details = await tmdbDetails(result.id)
    const casting_profile = await generateProfile(actor.name, details.biography ?? '')
    const { error } = await sb.from('actors').insert({
      name: actor.name,
      tmdb_id: result.id,
      headshot_url: result.profile_path ? `https://image.tmdb.org/t/p/w500${result.profile_path}` : 'https://www.gravatar.com/avatar/?d=mp&s=500',
      popularity: result.popularity,
      known_for: 'The West Wing',
      biography: details.biography ?? '',
      birth_year: details.birthday ? parseInt(details.birthday.split('-')[0]) : 1970,
      casting_profile,
      universe_tags: 'SorkVerse,WestWingVerse',
      cost: 2,
    })
    console.log(error ? `ERROR: ${error.message}` : 'done')
    await new Promise(r => setTimeout(r, 300))
  }

  // Upsert the-west-wing title
  console.log('\nUpserting title...')
  await sb.from('titles').upsert(
    [{ slug: 'the-west-wing', title: 'The West Wing', type: 'tv', year: 1999, budget: 35 }],
    { onConflict: 'slug' }
  )

  // Seed roles (skip existing)
  console.log('Seeding roles...')
  const { data: existingRoles } = await sb.from('roles').select('role_name').eq('title_slug', 'the-west-wing')
  const existingRoleNames = new Set(existingRoles?.map(r => r.role_name) ?? [])
  let added = 0
  for (const actor of CAST) {
    if (existingRoleNames.has(actor.role)) continue
    const { error } = await sb.from('roles').insert({
      title_slug: 'the-west-wing',
      role_name: actor.role,
      original_actor: actor.name,
      tier: actor.tier,
    })
    if (!error) added++
  }
  console.log(`  ${added} roles added`)

  const { count } = await sb.from('actors').select('*', { count: 'exact', head: true }).ilike('universe_tags', '%WestWingVerse%')
  console.log(`\nWestWingVerse total: ${count}`)
}

main()
