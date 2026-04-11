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
    slug: 'roseanne', title: 'Roseanne', type: 'tv', year: 1988, budget: 20,
    cast: [],
  },
  {
    slug: 'grace-under-fire', title: 'Grace Under Fire', type: 'tv', year: 1993, budget: 15,
    cast: [
      { name: 'Brett Butler',    role: 'Grace Kelly',    tier: 1 },
      { name: 'Dave Thomas',     role: 'Wade Swoboda',   tier: 2 },
      { name: 'Jon Paul Steuer', role: 'Quentin Kelly',  tier: 2 },
      { name: 'Illyana Mackey',  role: 'Libby Kelly',    tier: 3 },
      { name: 'Sam Horrigan',    role: 'Patrick Kelly',  tier: 3 },
    ],
  },
  {
    slug: 'cybill', title: 'Cybill', type: 'tv', year: 1995, budget: 15,
    cast: [
      { name: 'Cybill Shepherd',   role: 'Cybill Sheridan',  tier: 1 },
      { name: 'Christine Baranski', role: 'Maryann Thorpe',  tier: 1 },
      { name: 'Tom Wopat',         role: 'Jeff Robbins',     tier: 2 },
      { name: 'Alicia Witt',       role: 'Rachel Blanders',  tier: 2 },
      { name: 'Dedee Pfeiffer',    role: 'Zoey Woodbury',    tier: 3 },
    ],
  },
  {
    slug: 'dharma-and-greg', title: 'Dharma & Greg', type: 'tv', year: 1997, budget: 15,
    cast: [
      { name: 'Jenna Elfman',    role: 'Dharma Finkelstein Montgomery', tier: 1 },
      { name: 'Thomas Gibson',   role: 'Greg Montgomery',               tier: 1 },
      { name: 'Mimi Kennedy',    role: "Abby O'Neil",                   tier: 2 },
      { name: 'Mitchell Ryan',   role: 'Edward Montgomery',             tier: 2 },
      { name: 'Susan Sullivan',  role: 'Kitty Montgomery',              tier: 2 },
      { name: 'Alan Rachins',    role: 'Larry Finkelstein',             tier: 2 },
    ],
  },
  {
    slug: 'two-and-a-half-men', title: 'Two and a Half Men', type: 'tv', year: 2003, budget: 25,
    cast: [
      { name: 'Charlie Sheen',    role: 'Charlie Harper',   tier: 1 },
      { name: 'Jon Cryer',        role: 'Alan Harper',      tier: 1 },
      { name: 'Angus T. Jones',   role: 'Jake Harper',      tier: 2 },
      { name: 'Holland Taylor',   role: 'Evelyn Harper',    tier: 2 },
      { name: 'Conchata Ferrell', role: 'Berta',            tier: 2 },
      { name: 'Marin Hinkle',     role: 'Judith Harper',    tier: 2 },
      { name: 'Melanie Lynskey',  role: 'Rose',             tier: 3 },
      { name: 'Ashton Kutcher',   role: 'Walden Schmidt',   tier: 1 },
    ],
  },
  {
    slug: 'the-big-bang-theory', title: 'The Big Bang Theory', type: 'tv', year: 2007, budget: 30,
    cast: [
      { name: 'Jim Parsons',     role: 'Sheldon Cooper',         tier: 1 },
      { name: 'Johnny Galecki',  role: 'Leonard Hofstadter',     tier: 1 },
      { name: 'Kaley Cuoco',     role: 'Penny',                  tier: 1 },
      { name: 'Simon Helberg',   role: 'Howard Wolowitz',        tier: 2 },
      { name: 'Kunal Nayyar',    role: 'Raj Koothrappali',       tier: 2 },
      { name: 'Mayim Bialik',    role: 'Amy Farrah Fowler',      tier: 2 },
      { name: 'Melissa Rauch',   role: 'Bernadette Rostenkowski', tier: 2 },
    ],
  },
  {
    slug: 'mike-and-molly', title: 'Mike & Molly', type: 'tv', year: 2010, budget: 15,
    cast: [
      { name: 'Billy Gardell',    role: 'Mike Biggs',     tier: 1 },
      { name: 'Melissa McCarthy', role: 'Molly Flynn',    tier: 1 },
      { name: 'Swoosie Kurtz',    role: 'Joyce Flynn',    tier: 2 },
      { name: 'Katy Mixon',       role: 'Victoria Flynn', tier: 2 },
      { name: 'Reno Wilson',      role: 'Carl McMillan',  tier: 2 },
      { name: 'Louis Mustillo',   role: 'Vince Moranto',  tier: 3 },
    ],
  },
  {
    slug: 'mom', title: 'Mom', type: 'tv', year: 2013, budget: 20,
    cast: [
      { name: 'Anna Faris',       role: 'Christy Plunkett',          tier: 1 },
      { name: 'Allison Janney',   role: 'Bonnie Plunkett',           tier: 1 },
      { name: 'Mimi Kennedy',     role: 'Marjorie Armstrong-Perugian', tier: 2 },
      { name: 'Jaime Pressly',    role: 'Jill Kendall',              tier: 2 },
      { name: 'Beth Hall',        role: 'Wendy Harris',              tier: 3 },
      { name: 'William Fichtner', role: 'Adam Janikowski',           tier: 2 },
    ],
  },
  {
    slug: 'young-sheldon', title: 'Young Sheldon', type: 'tv', year: 2017, budget: 20,
    cast: [
      { name: 'Iain Armitage',  role: 'Sheldon Cooper',    tier: 1 },
      { name: 'Zoe Perry',      role: 'Mary Cooper',       tier: 2 },
      { name: 'Lance Barber',   role: 'George Cooper Sr.', tier: 2 },
      { name: 'Montana Jordan', role: 'Georgie Cooper',    tier: 2 },
      { name: 'Raegan Revord',  role: 'Missy Cooper',      tier: 2 },
      { name: 'Annie Potts',    role: 'Connie Tucker',     tier: 2 },
    ],
  },
  {
    slug: 'the-kominsky-method', title: 'The Kominsky Method', type: 'tv', year: 2018, budget: 15,
    cast: [
      { name: 'Michael Douglas', role: 'Sandy Kominsky',   tier: 1 },
      { name: 'Alan Arkin',      role: 'Norman Newlander', tier: 1 },
      { name: 'Sarah Baker',     role: 'Mindy Kominsky',   tier: 2 },
      { name: 'Nancy Travis',    role: 'Lisa',             tier: 2 },
      { name: 'Paul Reiser',     role: 'Martin Schneider', tier: 2 },
    ],
  },
  {
    slug: 'b-positive', title: 'B Positive', type: 'tv', year: 2020, budget: 15,
    cast: [
      { name: 'Thomas Middleditch',   role: 'Drew Dunbar',   tier: 1 },
      { name: 'Annaleigh Ashford',    role: 'Gina Zanetti',  tier: 1 },
      { name: 'Linda Lavin',          role: 'Norma',         tier: 2 },
      { name: 'Kether Donohue',       role: 'Gabby',         tier: 2 },
      { name: 'David Anthony Higgins', role: 'Jerry',        tier: 3 },
    ],
  },
  {
    slug: 'united-states-of-al', title: 'United States of Al', type: 'tv', year: 2021, budget: 15,
    cast: [
      { name: 'Adhir Kalyan',       role: 'Awalmir "Al" Sediqi', tier: 1 },
      { name: 'Parker Young',       role: 'Riley',               tier: 1 },
      { name: 'Kelli Goss',         role: 'Vanessa',             tier: 2 },
      { name: 'Elizabeth Alderfer', role: 'Lizzie',              tier: 2 },
      { name: 'Dean Norris',        role: 'Art',                 tier: 2 },
    ],
  },
  {
    slug: 'ghosts-us', title: 'Ghosts (US)', type: 'tv', year: 2021, budget: 20,
    cast: [
      { name: 'Rose McIver',       role: 'Samantha Arondekar', tier: 1 },
      { name: 'Utkarsh Ambudkar',  role: 'Jay Arondekar',      tier: 1 },
      { name: 'Brandon Scott Jones', role: 'Isaac Higgintoot', tier: 2 },
      { name: 'Danielle Pinnock',  role: 'Alberta Haynes',     tier: 2 },
      { name: 'Asher Grodman',     role: 'Trevor Lefkowitz',   tier: 2 },
      { name: 'Román Zaragoza',    role: 'Sasappis',           tier: 2 },
      { name: 'Sheila Carrasco',   role: 'Flower',             tier: 2 },
      { name: 'Rebecca Wisocky',   role: 'Hetty Woodstone',    tier: 2 },
      { name: 'Devan Chandler Long', role: 'Thorfinn',         tier: 2 },
      { name: 'Richie Moriarty',   role: 'Pete Martinson',     tier: 2 },
      { name: 'Sam Richardson',    role: 'Woodstone Estate Ghost', tier: 3 },
    ],
  },
  {
    slug: 'extended-family', title: 'Extended Family', type: 'tv', year: 2023, budget: 15,
    cast: [
      { name: 'Jon Cryer',       role: 'Jim',   tier: 1 },
      { name: 'Abigail Spencer', role: 'Julia', tier: 1 },
      { name: 'Donald Faison',   role: 'Trey',  tier: 1 },
      { name: 'Finn Sweeney',    role: 'Jack',  tier: 2 },
      { name: 'Lyla Friedman',   role: 'Cate',  tier: 2 },
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

  // Tag existing
  for (const actor of toTag) {
    const tags = (existingMap.get(actor.name) ?? '').split(',').map((t: string) => t.trim()).filter(Boolean)
    if (!tags.includes('LorreVerse')) tags.push('LorreVerse')
    await sb.from('actors').update({ universe_tags: tags.join(',') }).eq('name', actor.name)
  }
  console.log(`Tagged ${toTag.length} existing actors\n`)

  // Seed missing
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
      birth_year: details.birthday ? parseInt(details.birthday.split('-')[0]) : 1980,
      casting_profile,
      universe_tags: 'LorreVerse',
      cost: 2,
    })
    console.log(error ? `ERROR: ${error.message}` : 'done')
    await new Promise(r => setTimeout(r, 300))
  }

  // Upsert titles
  console.log('\nUpserting titles...')
  const titleRows = SHOWS.map(s => ({ slug: s.slug, title: s.title, type: s.type, year: s.year, budget: s.budget }))
  await sb.from('titles').upsert(titleRows, { onConflict: 'slug' })
  console.log(`${titleRows.length} titles upserted`)

  // Seed roles
  console.log('\nSeeding roles...')
  for (const show of SHOWS) {
    if (show.cast.length === 0) { console.log(`  ${show.title}: no cast provided`); continue }
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

  const { count } = await sb.from('actors').select('*', { count: 'exact', head: true }).ilike('universe_tags', '%LorreVerse%')
  console.log(`\nLorreVerse total: ${count}`)
}

main()
