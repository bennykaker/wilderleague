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
    slug: 'sports-night', title: 'Sports Night', type: 'tv', year: 1998, budget: 15,
    cast: [
      { name: 'Josh Charles',      role: 'Dan Rydell',       tier: 1 },
      { name: 'Peter Krause',      role: 'Casey McCall',     tier: 1 },
      { name: 'Felicity Huffman',  role: 'Dana Whitaker',    tier: 1 },
      { name: 'Joshua Malina',     role: 'Jeremy Goodwin',   tier: 2 },
      { name: 'Sabrina Lloyd',     role: 'Natalie Hurley',   tier: 2 },
      { name: 'Robert Guillaume',  role: 'Isaac Jaffe',      tier: 2 },
    ],
  },
  {
    slug: 'the-west-wing', title: 'The West Wing', type: 'tv', year: 1999, budget: 35,
    cast: [
      { name: 'Martin Sheen',       role: 'President Josiah Bartlet', tier: 1 },
      { name: 'Rob Lowe',           role: 'Sam Seaborn',              tier: 1 },
      { name: 'Allison Janney',     role: 'C.J. Cregg',               tier: 1 },
      { name: 'Bradley Whitford',   role: 'Josh Lyman',               tier: 1 },
      { name: 'Richard Schiff',     role: 'Toby Ziegler',             tier: 1 },
      { name: 'Dulé Hill',          role: 'Charlie Young',            tier: 2 },
      { name: 'Janel Moloney',      role: 'Donna Moss',               tier: 2 },
      { name: 'John Spencer',       role: 'Leo McGarry',              tier: 2 },
      { name: 'Stockard Channing',  role: 'Abbey Bartlet',            tier: 2 },
      { name: 'Joshua Malina',      role: 'Will Bailey',              tier: 2 },
      { name: 'Mary McCormack',     role: 'Kate Harper',              tier: 3 },
    ],
  },
  {
    slug: 'studio-60', title: 'Studio 60 on the Sunset Strip', type: 'tv', year: 2006, budget: 20,
    cast: [
      { name: 'Matthew Perry',    role: 'Matt Albie',       tier: 1 },
      { name: 'Bradley Whitford', role: 'Danny Tripp',      tier: 1 },
      { name: 'Amanda Peet',      role: 'Jordan McDeere',   tier: 1 },
      { name: 'Sarah Paulson',    role: 'Harriet Hayes',    tier: 2 },
      { name: 'D.L. Hughley',     role: 'Simon Stiles',     tier: 2 },
      { name: 'Steven Weber',     role: 'Jack Rudolph',     tier: 2 },
      { name: 'Nathan Corddry',   role: 'Tom Jeter',        tier: 3 },
    ],
  },
  {
    slug: 'the-newsroom', title: 'The Newsroom', type: 'tv', year: 2012, budget: 25,
    cast: [
      { name: 'Jeff Daniels',        role: 'Will McAvoy',      tier: 1 },
      { name: 'Emily Mortimer',      role: 'MacKenzie McHale', tier: 1 },
      { name: 'John Gallagher Jr.',  role: 'Jim Harper',       tier: 2 },
      { name: 'Alison Pill',         role: 'Maggie Jordan',    tier: 2 },
      { name: 'Thomas Sadoski',      role: 'Don Keefer',       tier: 2 },
      { name: 'Dev Patel',           role: 'Neal Sampat',      tier: 2 },
      { name: 'Olivia Munn',         role: 'Sloan Sabbith',    tier: 2 },
      { name: 'Sam Waterston',       role: 'Charlie Skinner',  tier: 2 },
    ],
  },
  {
    slug: 'a-few-good-men', title: 'A Few Good Men', type: 'movie', year: 1992, budget: 55,
    cast: [
      { name: 'Tom Cruise',        role: 'Lt. Daniel Kaffee',        tier: 1 },
      { name: 'Jack Nicholson',    role: 'Col. Nathan Jessup',       tier: 1 },
      { name: 'Demi Moore',        role: 'Lt. Cmdr. JoAnne Galloway', tier: 1 },
      { name: 'Kevin Bacon',       role: 'Capt. Jack Ross',          tier: 2 },
      { name: 'Kiefer Sutherland', role: 'Lt. Jonathan Kendrick',    tier: 2 },
      { name: 'Kevin Pollak',      role: 'Lt. Sam Weinberg',         tier: 2 },
      { name: 'James Marshall',    role: 'Pfc. Louden Downey',       tier: 3 },
      { name: 'Wolfgang Bodison',  role: 'Lance Cpl. Harold Dawson', tier: 3 },
    ],
  },
  {
    slug: 'malice', title: 'Malice', type: 'movie', year: 1993, budget: 30,
    cast: [
      { name: 'Alec Baldwin',    role: 'Dr. Jed Hill',       tier: 1 },
      { name: 'Nicole Kidman',   role: 'Tracy Kennsinger',   tier: 1 },
      { name: 'Bill Pullman',    role: 'Andy Safian',        tier: 1 },
      { name: 'Bebe Neuwirth',   role: 'Dr. Dana Harris',    tier: 2 },
      { name: 'George C. Scott', role: 'Dr. Martin Kessler', tier: 2 },
      { name: 'Anne Bancroft',   role: 'Mrs. Kennsinger',    tier: 3 },
    ],
  },
  {
    slug: 'the-american-president', title: 'The American President', type: 'movie', year: 1995, budget: 45,
    cast: [
      { name: 'Michael Douglas',    role: 'President Andrew Shepherd', tier: 1 },
      { name: 'Annette Bening',     role: 'Sydney Ellen Wade',         tier: 1 },
      { name: 'Martin Sheen',       role: 'A.J. MacInerney',           tier: 2 },
      { name: 'Michael J. Fox',     role: 'Lewis Rothschild',          tier: 2 },
      { name: 'Richard Dreyfuss',   role: 'Senator Bob Rumson',        tier: 2 },
      { name: 'Anna Deavere Smith', role: 'Robin McCall',              tier: 3 },
    ],
  },
  {
    slug: 'charlie-wilsons-war', title: "Charlie Wilson's War", type: 'movie', year: 2007, budget: 75,
    cast: [
      { name: 'Tom Hanks',              role: 'Charlie Wilson',  tier: 1 },
      { name: 'Julia Roberts',          role: 'Joanne Herring',  tier: 1 },
      { name: 'Philip Seymour Hoffman', role: 'Gust Avrakotos', tier: 1 },
      { name: 'Amy Adams',              role: 'Bonnie Bach',     tier: 2 },
      { name: 'Ned Beatty',             role: 'Doc Long',        tier: 3 },
    ],
  },
  {
    slug: 'the-social-network', title: 'The Social Network', type: 'movie', year: 2010, budget: 55,
    cast: [
      { name: 'Jesse Eisenberg',  role: 'Mark Zuckerberg',               tier: 1 },
      { name: 'Andrew Garfield',  role: 'Eduardo Saverin',               tier: 1 },
      { name: 'Justin Timberlake', role: 'Sean Parker',                  tier: 2 },
      { name: 'Armie Hammer',     role: 'Cameron and Tyler Winklevoss',  tier: 2 },
      { name: 'Rooney Mara',      role: 'Erica Albright',                tier: 2 },
      { name: 'Brenda Song',      role: 'Christy Lee',                   tier: 3 },
      { name: 'Max Minghella',    role: 'Divya Narendra',                tier: 3 },
    ],
  },
  {
    slug: 'moneyball', title: 'Moneyball', type: 'movie', year: 2011, budget: 50,
    cast: [
      { name: 'Brad Pitt',              role: 'Billy Beane',   tier: 1 },
      { name: 'Jonah Hill',             role: 'Peter Brand',   tier: 1 },
      { name: 'Philip Seymour Hoffman', role: 'Art Howe',      tier: 2 },
      { name: 'Robin Wright',           role: 'Sharon',        tier: 2 },
      { name: 'Chris Pratt',            role: 'Scott Hatteberg', tier: 2 },
      { name: 'Stephen Bishop',         role: 'David Justice', tier: 3 },
    ],
  },
  {
    slug: 'steve-jobs', title: 'Steve Jobs', type: 'movie', year: 2015, budget: 30,
    cast: [
      { name: 'Michael Fassbender',  role: 'Steve Jobs',        tier: 1 },
      { name: 'Kate Winslet',        role: 'Joanna Hoffman',    tier: 1 },
      { name: 'Seth Rogen',          role: 'Steve Wozniak',     tier: 1 },
      { name: 'Jeff Daniels',        role: 'John Sculley',      tier: 2 },
      { name: 'Michael Stuhlbarg',   role: 'Andy Hertzfeld',    tier: 2 },
      { name: 'Katherine Waterston', role: 'Chrisann Brennan',  tier: 3 },
    ],
  },
  {
    slug: 'mollys-game', title: "Molly's Game", type: 'movie', year: 2017, budget: 30,
    cast: [
      { name: 'Jessica Chastain', role: 'Molly Bloom',   tier: 1 },
      { name: 'Idris Elba',       role: 'Charlie Jaffey', tier: 1 },
      { name: 'Kevin Costner',    role: 'Larry Bloom',   tier: 2 },
      { name: 'Michael Cera',     role: 'Player X',      tier: 2 },
      { name: 'Jeremy Strong',    role: 'Dean Keith',    tier: 2 },
      { name: "Chris O'Dowd",     role: 'Douglas Downey', tier: 3 },
    ],
  },
  {
    slug: 'trial-of-the-chicago-7', title: 'The Trial of the Chicago 7', type: 'movie', year: 2020, budget: 35,
    cast: [
      { name: 'Eddie Redmayne',       role: 'Tom Hayden',         tier: 1 },
      { name: 'Sacha Baron Cohen',    role: 'Abbie Hoffman',      tier: 1 },
      { name: 'Jeremy Strong',        role: 'Jerry Rubin',        tier: 1 },
      { name: 'Alex Sharp',           role: 'Rennie Davis',       tier: 2 },
      { name: 'John Carroll Lynch',   role: 'David Dellinger',    tier: 2 },
      { name: 'Mark Rylance',         role: 'William Kunstler',   tier: 2 },
      { name: 'Frank Langella',       role: 'Judge Julius Hoffman', tier: 2 },
      { name: 'Joseph Gordon-Levitt', role: 'Richard Schultz',    tier: 2 },
      { name: 'Yahya Abdul-Mateen II', role: 'Bobby Seale',       tier: 2 },
      { name: 'Daniel Flaherty',      role: 'John Froines',       tier: 3 },
      { name: 'Noah Robbins',         role: 'Lee Weiner',         tier: 3 },
    ],
  },
  {
    slug: 'being-the-ricardos', title: 'Being the Ricardos', type: 'movie', year: 2021, budget: 45,
    cast: [
      { name: 'Nicole Kidman',   role: 'Lucille Ball',       tier: 1 },
      { name: 'Javier Bardem',   role: 'Desi Arnaz',         tier: 1 },
      { name: 'J.K. Simmons',    role: 'William Frawley',    tier: 2 },
      { name: 'Nina Arianda',    role: 'Vivian Vance',       tier: 2 },
      { name: 'Tony Hale',       role: 'Jess Oppenheimer',   tier: 2 },
      { name: 'Alia Shawkat',    role: 'Madelyn Pugh',       tier: 3 },
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
    messages: [{ role: 'user', content: `You are Marlowe, a veteran Hollywood casting director. Write a 2-3 sentence casting profile for ${name}, known for ${show}. Bio: ${biography.slice(0, 300)}. Direct and specific about screen presence and best use.` }],
  })
  return msg.content[0].type === 'text' ? msg.content[0].text : ''
}

async function main() {
  // Step 1: Check existing actors
  const names = ALL_ACTORS.map(a => a.name)
  const { data: existing } = await sb.from('actors').select('name, universe_tags').in('name', names)
  const existingMap = new Map(existing?.map(a => [a.name, a.universe_tags ?? '']) ?? [])

  const toAdd = ALL_ACTORS.filter(a => !existingMap.has(a.name))
  const toTag = ALL_ACTORS.filter(a => existingMap.has(a.name))
  console.log(`${existingMap.size} in DB, ${toAdd.length} to add\n`)

  // Step 2: Tag existing actors
  for (const actor of toTag) {
    const current = existingMap.get(actor.name) ?? ''
    const tags = current.split(',').map((t: string) => t.trim()).filter(Boolean)
    if (!tags.includes('SorkVerse')) tags.push('SorkVerse')
    await sb.from('actors').update({ universe_tags: tags.join(',') }).eq('name', actor.name)
  }
  console.log(`Tagged ${toTag.length} existing actors\n`)

  // Step 3: Seed missing actors
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
      birth_year: details.birthday ? parseInt(details.birthday.split('-')[0]) : null,
      casting_profile,
      universe_tags: 'SorkVerse',
      cost: 2,
    })
    console.log(error ? `ERROR: ${error.message}` : 'done')
    await new Promise(r => setTimeout(r, 300))
  }

  // Step 4: Upsert titles
  console.log('\nUpserting titles...')
  const titleRows = SHOWS.map(s => ({ slug: s.slug, title: s.title, type: s.type, year: s.year, budget: s.budget }))
  const { error: titleErr } = await sb.from('titles').upsert(titleRows, { onConflict: 'slug' })
  if (titleErr) console.error('Title upsert error:', titleErr.message)
  else console.log(`${titleRows.length} titles upserted`)

  // Step 5: Seed roles
  console.log('\nSeeding roles...')
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

  // Final count
  const { count } = await sb.from('actors').select('*', { count: 'exact', head: true }).ilike('universe_tags', '%SorkVerse%')
  console.log(`\nSorkVerse total: ${count}`)
}

main()
