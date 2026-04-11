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

const TITLES = [
  {
    slug: 'scrubs', title: 'Scrubs', type: 'tv', year: 2001, budget: 20,
    cast: [
      { name: 'Zach Braff',       role: 'J.D.',              tier: 1 },
      { name: 'Donald Faison',    role: 'Turk',              tier: 1 },
      { name: 'John C. McGinley', role: 'Dr. Cox',           tier: 1 },
      { name: 'Ken Jenkins',      role: 'Dr. Kelso',         tier: 2 },
      { name: 'Judy Reyes',       role: 'Carla',             tier: 2 },
      { name: 'Sarah Chalke',     role: 'Elliot',            tier: 2 },
      { name: 'Neil Flynn',       role: 'The Janitor',       tier: 2 },
      { name: 'Robert Maschio',   role: 'The Todd',          tier: 3 },
      { name: 'Christa Miller',   role: 'Jordan Sullivan',   tier: 2 },
      { name: 'Travis Schuldt',   role: 'Keith',             tier: 3 },
    ],
  },
  {
    slug: 'spin-city', title: 'Spin City', type: 'tv', year: 1996, budget: 20,
    cast: [
      { name: 'Michael J. Fox',      role: 'Mike Flaherty',              tier: 1 },
      { name: 'Barry Bostwick',      role: 'Mayor Randall Winston',      tier: 1 },
      { name: 'Richard Kind',        role: 'Paul Lassiter',              tier: 2 },
      { name: 'Michael Boatman',     role: 'Carter Sebastian Heywood',   tier: 2 },
      { name: 'Connie Britton',      role: 'Nikki Faber',                tier: 2 },
      { name: 'Alexander Chaplin',   role: 'James Hobert',               tier: 3 },
      { name: 'Jennifer Esposito',   role: "Angie D'Amato",              tier: 2 },
      { name: 'Charlie Sheen',       role: 'Charlie Crawford',           tier: 1 },
    ],
  },
  {
    slug: 'cougar-town', title: 'Cougar Town', type: 'tv', year: 2009, budget: 15,
    cast: [
      { name: 'Courteney Cox',   role: 'Jules Cobb',      tier: 1 },
      { name: 'Christa Miller',  role: 'Ellie Torres',    tier: 1 },
      { name: 'Busy Philipps',   role: 'Laurie Keller',   tier: 1 },
      { name: 'Dan Byrd',        role: 'Travis Cobb',     tier: 2 },
      { name: 'Josh Hopkins',    role: 'Grayson Ellis',   tier: 2 },
      { name: 'Ian Gomez',       role: 'Andy Torres',     tier: 2 },
      { name: 'Brian Van Holt',  role: 'Bobby Cobb',      tier: 2 },
    ],
  },
  {
    slug: 'clone-high', title: 'Clone High', type: 'tv', year: 2002, budget: 10,
    cast: [
      { name: 'Will Forte',       role: 'Abraham Lincoln', tier: 1 },
      { name: 'Christa Miller',   role: 'Cleopatra',       tier: 2 },
      { name: 'Michael McDonald', role: 'JFK',             tier: 1 },
      { name: 'Nicole Sullivan',  role: 'Joan of Arc',     tier: 2 },
      { name: 'Phil Lord',        role: 'Gandhi',          tier: 2 },
    ],
  },
  {
    slug: 'ted-lasso', title: 'Ted Lasso', type: 'tv', year: 2020, budget: 30,
    cast: [
      { name: 'Jason Sudeikis',   role: 'Ted Lasso',          tier: 1 },
      { name: 'Hannah Waddingham', role: 'Rebecca Welton',    tier: 1 },
      { name: 'Brett Goldstein',  role: 'Roy Kent',           tier: 1 },
      { name: 'Juno Temple',      role: 'Keeley Jones',       tier: 1 },
      { name: 'Phil Dunster',     role: 'Jamie Tartt',        tier: 2 },
      { name: 'Nick Mohammed',    role: 'Nate Shelley',       tier: 2 },
      { name: 'Brendan Hunt',     role: 'Coach Beard',        tier: 2 },
      { name: 'Jeremy Swift',     role: 'Higgins',            tier: 2 },
      { name: 'Cristo Fernández', role: 'Dani Rojas',         tier: 3 },
      { name: 'Toheeb Jimoh',     role: 'Sam Obisanya',       tier: 3 },
      { name: 'Sarah Niles',      role: 'Sharon Fieldstone',  tier: 2 },
    ],
  },
  {
    slug: 'shrinking', title: 'Shrinking', type: 'tv', year: 2023, budget: 25,
    cast: [
      { name: 'Jason Segel',      role: 'Jimmy Laird',  tier: 1 },
      { name: 'Harrison Ford',    role: 'Paul Rhodes',  tier: 1 },
      { name: 'Jessica Williams', role: 'Gaby',         tier: 1 },
      { name: 'Michael Urie',     role: 'Brian',        tier: 2 },
      { name: 'Christa Miller',   role: 'Liz',          tier: 2 },
      { name: 'Luke Tennie',      role: 'Sean',         tier: 2 },
      { name: 'Lukita Maxwell',   role: 'Alice Laird',  tier: 2 },
      { name: 'Ted McGinley',     role: 'Derek',        tier: 3 },
    ],
  },
  {
    slug: 'bad-monkey', title: 'Bad Monkey', type: 'tv', year: 2024, budget: 20,
    cast: [
      { name: 'Vince Vaughn',      role: 'Andrew Yancy',       tier: 1 },
      { name: 'Natalie Martinez',  role: 'Rosa Gonzalez',      tier: 1 },
      { name: 'Meredith Hagner',   role: 'Nora Lotion',        tier: 2 },
      { name: 'Rob Delaney',       role: 'Evan Shook',         tier: 2 },
      { name: 'L. Scott Caldwell', role: "Yancy's Grandmother", tier: 2 },
      { name: 'John Ortiz',        role: 'Sonny Summers',      tier: 2 },
    ],
  },
]

const ALL_ACTORS = [...new Map(
  TITLES.flatMap(t => t.cast).map(a => [a.name, a])
).values()]

const actorFirstTitle: Record<string, string> = {}
for (const title of TITLES) {
  for (const a of title.cast) {
    if (!actorFirstTitle[a.name]) actorFirstTitle[a.name] = title.title
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

async function generateProfile(name: string, biography: string, title: string): Promise<string> {
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [{ role: 'user', content: `You are Marlowe, a veteran Hollywood casting director. Write a 2-3 sentence casting profile for ${name}, known for ${title}. Bio: ${biography.slice(0, 300)}. Direct and specific.` }],
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
    if (!tags.includes('LawrenceVerse')) tags.push('LawrenceVerse')
    await sb.from('actors').update({ universe_tags: tags.join(',') }).eq('name', actor.name)
  }
  console.log(`Tagged ${toTag.length} existing actors\n`)

  for (const actor of toAdd) {
    process.stdout.write(`  ${actor.name}... `)
    const result = await tmdbSearch(actor.name)
    if (!result) { console.log('NOT FOUND'); continue }

    const { data: byId } = await sb.from('actors').select('name, universe_tags').eq('tmdb_id', result.id)
    if (byId && byId.length > 0) {
      const tags = (byId[0].universe_tags ?? '').split(',').map((t: string) => t.trim()).filter(Boolean)
      if (!tags.includes('LawrenceVerse')) tags.push('LawrenceVerse')
      await sb.from('actors').update({ universe_tags: tags.join(',') }).eq('tmdb_id', result.id)
      console.log(`tagged existing (${byId[0].name})`)
      continue
    }

    const details = await tmdbDetails(result.id)
    const casting_profile = await generateProfile(actor.name, details.biography ?? '', actorFirstTitle[actor.name])
    const { error } = await sb.from('actors').insert({
      name: actor.name,
      tmdb_id: result.id,
      headshot_url: result.profile_path ? `https://image.tmdb.org/t/p/w500${result.profile_path}` : 'https://www.gravatar.com/avatar/?d=mp&s=500',
      popularity: result.popularity,
      known_for: actorFirstTitle[actor.name],
      biography: details.biography ?? '',
      birth_year: details.birthday ? parseInt(details.birthday.split('-')[0]) : 1970,
      casting_profile,
      universe_tags: 'LawrenceVerse',
      cost: 2,
    })
    console.log(error ? `ERROR: ${error.message}` : 'done')
    await new Promise(r => setTimeout(r, 300))
  }

  console.log('\nUpserting titles...')
  await sb.from('titles').upsert(
    TITLES.map(t => ({ slug: t.slug, title: t.title, type: t.type, year: t.year, budget: t.budget })),
    { onConflict: 'slug' }
  )
  console.log(`${TITLES.length} titles upserted`)

  console.log('\nSeeding roles...')
  for (const title of TITLES) {
    const { data: existingRoles } = await sb.from('roles').select('role_name').eq('title_slug', title.slug)
    const existingNames = new Set(existingRoles?.map(r => r.role_name) ?? [])
    let added = 0
    for (const actor of title.cast) {
      if (existingNames.has(actor.role)) continue
      const { error } = await sb.from('roles').insert({
        title_slug: title.slug,
        role_name: actor.role,
        original_actor: actor.name,
        tier: actor.tier,
      })
      if (!error) added++
    }
    console.log(`  ${title.title}: ${added} roles added`)
  }

  const { count } = await sb.from('actors').select('*', { count: 'exact', head: true }).ilike('universe_tags', '%LawrenceVerse%')
  console.log(`\nLawrenceVerse total: ${count}`)
}

main()
