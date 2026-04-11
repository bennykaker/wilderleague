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

const SHOWS: { show: string; slug: string; cast: { name: string; role: string; tier: number }[] }[] = [
  {
    show: 'Homicide: Life on the Street', slug: 'homicide-life-on-the-street',
    cast: [
      { name: 'Andre Braugher',    role: 'Frank Pembleton',  tier: 1 },
      { name: 'Kyle Secor',        role: 'Tim Bayliss',      tier: 1 },
      { name: 'Yaphet Kotto',      role: 'Al Giardello',     tier: 1 },
      { name: 'Richard Belzer',    role: 'John Munch',       tier: 2 },
      { name: 'Clark Johnson',     role: 'Meldrick Lewis',   tier: 2 },
      { name: 'Melissa Leo',       role: 'Kay Howard',       tier: 2 },
      { name: 'Ned Beatty',        role: 'Stan Bolander',    tier: 2 },
      { name: 'Jon Polito',        role: 'Steve Crosetti',   tier: 2 },
      { name: 'Daniel Baldwin',    role: 'Beau Felton',      tier: 2 },
      { name: 'Isabella Hofmann',  role: 'Megan Russert',    tier: 3 },
    ],
  },
  {
    show: 'The Corner', slug: 'the-corner',
    cast: [
      { name: 'T.K. Carter',      role: 'Gary McCullough',  tier: 1 },
      { name: 'Khandi Alexander', role: 'Fran Boyd',        tier: 1 },
      { name: 'Sean Nelson',      role: 'DeAndre McCullough', tier: 2 },
      { name: 'Clarke Peters',    role: 'Crutchfield',      tier: 2 },
      { name: 'Reg E. Cathey',    role: 'Scalio',           tier: 3 },
    ],
  },
  {
    show: 'Generation Kill', slug: 'generation-kill',
    cast: [
      { name: 'Alexander Skarsgård', role: 'Nate Fick',       tier: 1 },
      { name: 'James Ransone',       role: 'Ray Person',      tier: 1 },
      { name: 'Stark Sands',         role: 'Evan Wright',     tier: 2 },
      { name: 'Lee Tergesen',        role: 'Lee Tergesen',    tier: 2 },
      { name: 'Billy Lush',          role: 'Harold Trombley', tier: 3 },
    ],
  },
  {
    show: 'Treme', slug: 'treme',
    cast: [
      { name: 'Wendell Pierce',    role: 'Antoine Batiste',          tier: 1 },
      { name: 'Clarke Peters',     role: 'Albert Lambreaux',         tier: 1 },
      { name: 'Kim Dickens',       role: 'Janette Desautel',         tier: 1 },
      { name: 'David Morse',       role: 'Creighton Bernette',       tier: 1 },
      { name: 'Khandi Alexander',  role: 'LaDonna Batiste-Williams', tier: 2 },
      { name: 'Steve Zahn',        role: 'Davis McAlary',            tier: 2 },
      { name: 'Melissa Leo',       role: 'Toni Bernette',            tier: 2 },
    ],
  },
  {
    show: 'Show Me a Hero', slug: 'show-me-a-hero',
    cast: [
      { name: 'Oscar Isaac',     role: 'Nick Wasicsko',   tier: 1 },
      { name: 'Winona Ryder',    role: 'Doreen Henderson', tier: 2 },
      { name: 'Catherine Keener', role: 'Mary Dorman',    tier: 2 },
      { name: 'Alfred Molina',   role: 'Hank Spallone',   tier: 2 },
      { name: 'Jim Belushi',     role: 'Angelo Martinelli', tier: 3 },
    ],
  },
  {
    show: 'The Deuce', slug: 'the-deuce',
    cast: [
      { name: 'James Franco',        role: 'Vincent Martino',  tier: 1 },
      { name: 'Maggie Gyllenhaal',   role: 'Eileen Merrell',   tier: 1 },
      { name: 'Lawrence Gilliard Jr.', role: 'Larry Brown',    tier: 2 },
      { name: 'Emily Meade',         role: 'Lori Madison',     tier: 2 },
      { name: 'Dominique Fishback',  role: 'Darlene',          tier: 2 },
      { name: 'Chris Bauer',         role: 'Bobby Dwyer',      tier: 2 },
      { name: 'Gary Carr',           role: 'CC',               tier: 2 },
    ],
  },
  {
    show: 'We Own This City', slug: 'we-own-this-city',
    cast: [
      { name: 'Jon Bernthal',         role: 'Wayne Jenkins',    tier: 1 },
      { name: 'Wunmi Mosaku',         role: 'Nicole Steele',    tier: 2 },
      { name: 'Jamie Hector',         role: 'Monitor',          tier: 2 },
      { name: 'Darrell Britt-Gibson', role: 'Momodu Gondo',     tier: 2 },
      { name: 'McKinley Belcher III', role: 'David McDougall',  tier: 2 },
      { name: 'Josh Charles',         role: 'John Sieracki',    tier: 3 },
    ],
  },
]

// All unique actors
const ALL_ACTORS = [...new Map(
  SHOWS.flatMap(s => s.cast).map(a => [a.name, a])
).values()]

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

async function generateProfile(name: string, biography: string, show: string): Promise<string> {
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [{ role: 'user', content: `You are Marlowe, a veteran Hollywood casting director. Write a 2-3 sentence casting profile for ${name}, known for ${show}. Bio: ${biography.slice(0, 300)}. Be direct and specific about screen presence and best use.` }],
  })
  return msg.content[0].type === 'text' ? msg.content[0].text : ''
}

async function main() {
  // Step 1: Update Wire actors to add SimonVerse
  console.log('Adding SimonVerse tag to existing Wire cast...')
  const { data: wireActors } = await sb.from('actors').select('id, name, universe_tags').eq('universe_tags', 'WireVerse')
  for (const a of wireActors ?? []) {
    await sb.from('actors').update({ universe_tags: 'WireVerse,SimonVerse' }).eq('id', a.id)
  }
  console.log(`  Updated ${wireActors?.length ?? 0} Wire actors\n`)

  // Step 2: Check which new actors are already in DB
  const names = ALL_ACTORS.map(a => a.name)
  const { data: existing } = await sb.from('actors').select('name').in('name', names)
  const existingNames = new Set(existing?.map(a => a.name) ?? [])

  // Also check Lawrence Gilliard Jr. variant
  const { data: lawrenceRow } = await sb.from('actors').select('name').ilike('name', '%gilliard%')
  if (lawrenceRow?.length) lawrenceRow.forEach(r => existingNames.add('Lawrence Gilliard Jr.'))

  const toAdd = ALL_ACTORS.filter(a => !existingNames.has(a.name))
  const toTag = ALL_ACTORS.filter(a => existingNames.has(a.name))

  console.log(`${existingNames.size} already in DB, ${toAdd.length} to add\n`)

  // Step 3: Tag existing actors with SimonVerse
  for (const actor of toTag) {
    const { data: rows } = await sb.from('actors').select('id, universe_tags').eq('name', actor.name)
    for (const row of rows ?? []) {
      const current = row.universe_tags ?? ''
      const tags = current.split(',').map((t: string) => t.trim()).filter(Boolean)
      if (!tags.includes('SimonVerse')) tags.push('SimonVerse')
      await sb.from('actors').update({ universe_tags: tags.join(',') }).eq('id', row.id)
    }
  }
  console.log(`Tagged ${toTag.length} existing actors with SimonVerse\n`)

  // Step 4: Seed missing actors
  // Find which show each actor first appears in
  const actorShow: Record<string, string> = {}
  for (const show of SHOWS) {
    for (const a of show.cast) {
      if (!actorShow[a.name]) actorShow[a.name] = show.show
    }
  }

  for (const actor of toAdd) {
    process.stdout.write(`  Seeding ${actor.name}... `)
    const result = await tmdbSearch(actor.name)
    if (!result) { console.log('NOT FOUND on TMDB'); continue }
    const details = await tmdbDetails(result.id)
    const show = actorShow[actor.name]
    const casting_profile = await generateProfile(actor.name, details.biography ?? '', show)
    const headshot_url = result.profile_path ? `https://image.tmdb.org/t/p/w500${result.profile_path}` : null

    const { error } = await sb.from('actors').insert({
      name: actor.name,
      tmdb_id: result.id,
      headshot_url: headshot_url ?? 'https://www.gravatar.com/avatar/?d=mp&s=500',
      popularity: result.popularity,
      known_for: show,
      biography: details.biography ?? '',
      birth_year: details.birthday ? parseInt(details.birthday.split('-')[0]) : null,
      casting_profile,
      universe_tags: 'SimonVerse',
      cost: 2,
    })
    console.log(error ? `ERROR: ${error.message}` : `done`)
    await new Promise(r => setTimeout(r, 300))
  }

  // Step 5: Check which title slugs exist and add roles
  console.log('\nChecking title slugs...')
  const slugs = SHOWS.map(s => s.slug)
  const { data: existingTitles } = await sb.from('titles').select('slug').in('slug', slugs)
  const existingSlugs = new Set(existingTitles?.map(t => t.slug) ?? [])

  for (const show of SHOWS) {
    if (!existingSlugs.has(show.slug)) {
      console.log(`  ${show.show}: NOT IN TITLES TABLE — skipping roles`)
      continue
    }
    const { data: existingRoles } = await sb.from('roles').select('role_name').eq('title_slug', show.slug)
    const existingRoleNames = new Set(existingRoles?.map(r => r.role_name) ?? [])
    let added = 0
    for (const actor of show.cast) {
      if (existingRoleNames.has(actor.role)) continue
      await sb.from('roles').insert({ title_slug: show.slug, role_name: actor.role, original_actor: actor.name, tier: actor.tier })
      added++
    }
    console.log(`  ${show.show}: ${added} roles added`)
  }

  // Final count
  const { count } = await sb.from('actors').select('*', { count: 'exact', head: true }).ilike('universe_tags', '%SimonVerse%')
  console.log(`\nSimonVerse total: ${count}`)
}

main()
