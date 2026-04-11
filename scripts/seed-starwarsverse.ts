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
  // Skywalker Saga
  {
    slug: 'star-wars-a-new-hope', title: 'Star Wars: A New Hope', type: 'film', year: 1977, budget: 40,
    cast: [
      { name: 'Mark Hamill',        role: 'Luke Skywalker',    tier: 1 },
      { name: 'Harrison Ford',      role: 'Han Solo',          tier: 1 },
      { name: 'Carrie Fisher',      role: 'Princess Leia',     tier: 1 },
      { name: 'Alec Guinness',      role: 'Obi-Wan Kenobi',    tier: 2 },
      { name: 'Anthony Daniels',    role: 'C-3PO',             tier: 2 },
      { name: 'Kenny Baker',        role: 'R2-D2',             tier: 3 },
      { name: 'Peter Mayhew',       role: 'Chewbacca',         tier: 3 },
      { name: 'David Prowse',       role: 'Darth Vader (body)', tier: 3 },
      { name: 'James Earl Jones',   role: 'Darth Vader (voice)', tier: 2 },
      { name: 'Ian McDiarmid',      role: 'Emperor Palpatine', tier: 2 },
    ],
  },
  {
    slug: 'star-wars-empire-strikes-back', title: 'Star Wars: The Empire Strikes Back', type: 'film', year: 1980, budget: 40,
    cast: [
      { name: 'Mark Hamill',        role: 'Luke Skywalker',    tier: 1 },
      { name: 'Harrison Ford',      role: 'Han Solo',          tier: 1 },
      { name: 'Carrie Fisher',      role: 'Princess Leia',     tier: 1 },
      { name: 'Billy Dee Williams', role: 'Lando Calrissian',  tier: 2 },
      { name: 'Anthony Daniels',    role: 'C-3PO',             tier: 2 },
      { name: 'Kenny Baker',        role: 'R2-D2',             tier: 3 },
      { name: 'Peter Mayhew',       role: 'Chewbacca',         tier: 3 },
      { name: 'James Earl Jones',   role: 'Darth Vader (voice)', tier: 2 },
      { name: 'Frank Oz',           role: 'Yoda',              tier: 2 },
    ],
  },
  {
    slug: 'star-wars-return-of-the-jedi', title: 'Star Wars: Return of the Jedi', type: 'film', year: 1983, budget: 40,
    cast: [
      { name: 'Mark Hamill',        role: 'Luke Skywalker',    tier: 1 },
      { name: 'Harrison Ford',      role: 'Han Solo',          tier: 1 },
      { name: 'Carrie Fisher',      role: 'Princess Leia',     tier: 1 },
      { name: 'Billy Dee Williams', role: 'Lando Calrissian',  tier: 2 },
      { name: 'Anthony Daniels',    role: 'C-3PO',             tier: 2 },
      { name: 'Kenny Baker',        role: 'R2-D2',             tier: 3 },
      { name: 'Peter Mayhew',       role: 'Chewbacca',         tier: 3 },
      { name: 'James Earl Jones',   role: 'Darth Vader (voice)', tier: 2 },
      { name: 'Ian McDiarmid',      role: 'Emperor Palpatine', tier: 2 },
      { name: 'Frank Oz',           role: 'Yoda',              tier: 2 },
    ],
  },
  // Prequel Trilogy
  {
    slug: 'star-wars-the-phantom-menace', title: 'Star Wars: The Phantom Menace', type: 'film', year: 1999, budget: 35,
    cast: [
      { name: 'Liam Neeson',        role: 'Qui-Gon Jinn',       tier: 1 },
      { name: 'Ewan McGregor',      role: 'Obi-Wan Kenobi',     tier: 1 },
      { name: 'Natalie Portman',    role: 'Padmé Amidala',      tier: 1 },
      { name: 'Jake Lloyd',         role: 'Young Anakin',       tier: 3 },
      { name: 'Ian McDiarmid',      role: 'Palpatine/Sidious',  tier: 2 },
      { name: 'Samuel L. Jackson',  role: 'Mace Windu',         tier: 2 },
      { name: 'Frank Oz',           role: 'Yoda',               tier: 2 },
      { name: 'Anthony Daniels',    role: 'C-3PO',              tier: 3 },
      { name: 'Kenny Baker',        role: 'R2-D2',              tier: 3 },
    ],
  },
  {
    slug: 'star-wars-attack-of-the-clones', title: 'Star Wars: Attack of the Clones', type: 'film', year: 2002, budget: 35,
    cast: [
      { name: 'Ewan McGregor',      role: 'Obi-Wan Kenobi',    tier: 1 },
      { name: 'Natalie Portman',    role: 'Padmé Amidala',     tier: 1 },
      { name: 'Hayden Christensen', role: 'Anakin Skywalker',  tier: 1 },
      { name: 'Ian McDiarmid',      role: 'Palpatine/Sidious', tier: 2 },
      { name: 'Samuel L. Jackson',  role: 'Mace Windu',        tier: 2 },
      { name: 'Christopher Lee',    role: 'Count Dooku',       tier: 2 },
      { name: 'Temuera Morrison',   role: 'Jango Fett',        tier: 2 },
      { name: 'Frank Oz',           role: 'Yoda',              tier: 2 },
      { name: 'Anthony Daniels',    role: 'C-3PO',             tier: 3 },
      { name: 'Kenny Baker',        role: 'R2-D2',             tier: 3 },
    ],
  },
  {
    slug: 'star-wars-revenge-of-the-sith', title: 'Star Wars: Revenge of the Sith', type: 'film', year: 2005, budget: 35,
    cast: [
      { name: 'Ewan McGregor',      role: 'Obi-Wan Kenobi',    tier: 1 },
      { name: 'Natalie Portman',    role: 'Padmé Amidala',     tier: 1 },
      { name: 'Hayden Christensen', role: 'Anakin Skywalker',  tier: 1 },
      { name: 'Ian McDiarmid',      role: 'Palpatine/Sidious', tier: 2 },
      { name: 'Samuel L. Jackson',  role: 'Mace Windu',        tier: 2 },
      { name: 'Christopher Lee',    role: 'Count Dooku',       tier: 2 },
      { name: 'Frank Oz',           role: 'Yoda',              tier: 2 },
      { name: 'Anthony Daniels',    role: 'C-3PO',             tier: 3 },
      { name: 'Kenny Baker',        role: 'R2-D2',             tier: 3 },
      { name: 'James Earl Jones',   role: 'Darth Vader (voice)', tier: 2 },
    ],
  },
  // Sequel Trilogy
  {
    slug: 'star-wars-the-force-awakens', title: 'Star Wars: The Force Awakens', type: 'film', year: 2015, budget: 45,
    cast: [
      { name: 'Daisy Ridley',       role: 'Rey',               tier: 1 },
      { name: 'John Boyega',        role: 'Finn',              tier: 1 },
      { name: 'Oscar Isaac',        role: 'Poe Dameron',       tier: 1 },
      { name: 'Adam Driver',        role: 'Kylo Ren',          tier: 1 },
      { name: 'Harrison Ford',      role: 'Han Solo',          tier: 1 },
      { name: 'Carrie Fisher',      role: 'Leia Organa',       tier: 1 },
      { name: 'Mark Hamill',        role: 'Luke Skywalker',    tier: 2 },
      { name: 'Andy Serkis',        role: 'Snoke',             tier: 2 },
      { name: 'Domhnall Gleeson',   role: 'General Hux',       tier: 2 },
      { name: 'Lupita Nyong\'o',    role: 'Maz Kanata',        tier: 3 },
    ],
  },
  {
    slug: 'star-wars-the-last-jedi', title: 'Star Wars: The Last Jedi', type: 'film', year: 2017, budget: 45,
    cast: [
      { name: 'Daisy Ridley',       role: 'Rey',               tier: 1 },
      { name: 'John Boyega',        role: 'Finn',              tier: 1 },
      { name: 'Oscar Isaac',        role: 'Poe Dameron',       tier: 1 },
      { name: 'Adam Driver',        role: 'Kylo Ren',          tier: 1 },
      { name: 'Carrie Fisher',      role: 'Leia Organa',       tier: 1 },
      { name: 'Mark Hamill',        role: 'Luke Skywalker',    tier: 1 },
      { name: 'Andy Serkis',        role: 'Snoke',             tier: 2 },
      { name: 'Domhnall Gleeson',   role: 'General Hux',       tier: 2 },
      { name: 'Kelly Marie Tran',   role: 'Rose Tico',         tier: 2 },
      { name: 'Lupita Nyong\'o',    role: 'Maz Kanata',        tier: 3 },
    ],
  },
  {
    slug: 'star-wars-the-rise-of-skywalker', title: 'Star Wars: The Rise of Skywalker', type: 'film', year: 2019, budget: 45,
    cast: [
      { name: 'Daisy Ridley',       role: 'Rey',               tier: 1 },
      { name: 'John Boyega',        role: 'Finn',              tier: 1 },
      { name: 'Oscar Isaac',        role: 'Poe Dameron',       tier: 1 },
      { name: 'Adam Driver',        role: 'Kylo Ren',          tier: 1 },
      { name: 'Carrie Fisher',      role: 'Leia Organa',       tier: 1 },
      { name: 'Mark Hamill',        role: 'Luke Skywalker',    tier: 2 },
      { name: 'Billy Dee Williams', role: 'Lando Calrissian',  tier: 2 },
      { name: 'Ian McDiarmid',      role: 'Palpatine',         tier: 2 },
      { name: 'Domhnall Gleeson',   role: 'General Hux',       tier: 2 },
      { name: 'Kelly Marie Tran',   role: 'Rose Tico',         tier: 3 },
    ],
  },
  // Standalone Films
  {
    slug: 'rogue-one', title: 'Rogue One: A Star Wars Story', type: 'film', year: 2016, budget: 35,
    cast: [
      { name: 'Felicity Jones',     role: 'Jyn Erso',          tier: 1 },
      { name: 'Diego Luna',         role: 'Cassian Andor',     tier: 1 },
      { name: 'Ben Mendelsohn',     role: 'Director Krennic',  tier: 1 },
      { name: 'Donnie Yen',         role: 'Chirrut Îmwe',      tier: 2 },
      { name: 'Jiang Wen',          role: 'Baze Malbus',       tier: 2 },
      { name: 'Forest Whitaker',    role: 'Saw Gerrera',       tier: 2 },
      { name: 'Riz Ahmed',          role: 'Bodhi Rook',        tier: 2 },
      { name: 'Alan Tudyk',         role: 'K-2SO',             tier: 2 },
      { name: 'Mads Mikkelsen',     role: 'Galen Erso',        tier: 2 },
    ],
  },
  {
    slug: 'solo-a-star-wars-story', title: 'Solo: A Star Wars Story', type: 'film', year: 2018, budget: 25,
    cast: [
      { name: 'Alden Ehrenreich',   role: 'Han Solo',          tier: 1 },
      { name: 'Woody Harrelson',    role: 'Tobias Beckett',    tier: 1 },
      { name: 'Emilia Clarke',      role: "Qi'ra",             tier: 1 },
      { name: 'Donald Glover',      role: 'Lando Calrissian',  tier: 1 },
      { name: 'Joonas Suotamo',     role: 'Chewbacca',         tier: 2 },
      { name: 'Paul Bettany',       role: 'Dryden Vos',        tier: 2 },
      { name: 'Thandiwe Newton',    role: 'Val',               tier: 2 },
    ],
  },
  // Television
  {
    slug: 'star-wars-the-clone-wars', title: 'Star Wars: The Clone Wars', type: 'tv', year: 2008, budget: 15,
    cast: [
      { name: 'Matt Lanter',        role: 'Anakin Skywalker',  tier: 1 },
      { name: 'Ashley Eckstein',    role: 'Ahsoka Tano',       tier: 1 },
      { name: 'James Arnold Taylor', role: 'Obi-Wan Kenobi',   tier: 1 },
      { name: 'Dee Bradley Baker',  role: 'Clone Troopers',    tier: 1 },
      { name: 'Tom Kane',           role: 'Yoda',              tier: 2 },
      { name: 'Nika Futterman',     role: 'Asajj Ventress',    tier: 2 },
    ],
  },
  {
    slug: 'star-wars-rebels', title: 'Star Wars Rebels', type: 'tv', year: 2014, budget: 15,
    cast: [
      { name: 'Freddie Prinze Jr.', role: 'Kanan Jarrus',      tier: 1 },
      { name: 'Taylor Gray',        role: 'Ezra Bridger',      tier: 1 },
      { name: 'Vanessa Marshall',   role: 'Hera Syndulla',     tier: 1 },
      { name: 'Tiya Sircar',        role: 'Sabine Wren',       tier: 1 },
      { name: 'Steve Blum',         role: 'Zeb Orrelios',      tier: 2 },
      { name: 'Ashley Eckstein',    role: 'Ahsoka Tano',       tier: 1 },
      { name: 'Lars Mikkelsen',     role: 'Grand Admiral Thrawn', tier: 1 },
    ],
  },
  {
    slug: 'the-mandalorian', title: 'The Mandalorian', type: 'tv', year: 2019, budget: 30,
    cast: [
      { name: 'Pedro Pascal',       role: 'Din Djarin',        tier: 1 },
      { name: 'Carl Weathers',      role: 'Greef Karga',       tier: 1 },
      { name: 'Gina Carano',        role: 'Cara Dune',         tier: 2 },
      { name: 'Giancarlo Esposito', role: 'Moff Gideon',       tier: 1 },
      { name: 'Emily Swallow',      role: 'The Armorer',       tier: 2 },
      { name: 'Katee Sackhoff',     role: 'Bo-Katan Kryze',    tier: 2 },
      { name: 'Ming-Na Wen',        role: 'Fennec Shand',      tier: 2 },
    ],
  },
  {
    slug: 'star-wars-the-bad-batch', title: 'Star Wars: The Bad Batch', type: 'tv', year: 2021, budget: 15,
    cast: [
      { name: 'Dee Bradley Baker',  role: 'Hunter/Wrecker/Tech/Crosshair/Echo', tier: 1 },
      { name: 'Michelle Ang',       role: 'Omega',             tier: 1 },
      { name: 'Noshir Dalal',       role: 'CX-2',              tier: 2 },
    ],
  },
  {
    slug: 'the-book-of-boba-fett', title: 'The Book of Boba Fett', type: 'tv', year: 2021, budget: 25,
    cast: [
      { name: 'Temuera Morrison',   role: 'Boba Fett',         tier: 1 },
      { name: 'Ming-Na Wen',        role: 'Fennec Shand',      tier: 1 },
      { name: 'Pedro Pascal',       role: 'Din Djarin',        tier: 2 },
    ],
  },
  {
    slug: 'obi-wan-kenobi', title: 'Obi-Wan Kenobi', type: 'tv', year: 2022, budget: 30,
    cast: [
      { name: 'Ewan McGregor',      role: 'Obi-Wan Kenobi',    tier: 1 },
      { name: 'Hayden Christensen', role: 'Darth Vader/Anakin', tier: 1 },
      { name: 'Moses Ingram',       role: 'Reva',              tier: 1 },
      { name: 'Vivien Lyra Blair',  role: 'Young Leia',        tier: 2 },
      { name: 'Joel Edgerton',      role: 'Owen Lars',         tier: 2 },
      { name: 'Bonnie Piesse',      role: 'Beru Lars',         tier: 3 },
    ],
  },
  {
    slug: 'andor', title: 'Andor', type: 'tv', year: 2022, budget: 30,
    cast: [
      { name: 'Diego Luna',         role: 'Cassian Andor',     tier: 1 },
      { name: 'Genevieve O\'Reilly', role: 'Mon Mothma',       tier: 1 },
      { name: 'Stellan Skarsgård',  role: 'Luthen Rael',       tier: 1 },
      { name: 'Adria Arjona',       role: 'Bix Caleen',        tier: 1 },
      { name: 'Kyle Soller',        role: 'Syril Karn',        tier: 2 },
      { name: 'Denise Gough',       role: 'Dedra Meero',       tier: 2 },
      { name: 'Faye Marsay',        role: 'Vel Sartha',        tier: 2 },
      { name: 'Andy Serkis',        role: 'Kino Loy',          tier: 2 },
    ],
  },
  {
    slug: 'ahsoka', title: 'Ahsoka', type: 'tv', year: 2023, budget: 30,
    cast: [
      { name: 'Rosario Dawson',     role: 'Ahsoka Tano',       tier: 1 },
      { name: 'Natasha Liu Bordizzo', role: 'Sabine Wren',     tier: 1 },
      { name: 'Mary Elizabeth Winstead', role: 'Hera Syndulla', tier: 1 },
      { name: 'Lars Mikkelsen',     role: 'Grand Admiral Thrawn', tier: 1 },
      { name: 'Hayden Christensen', role: 'Anakin Skywalker',  tier: 2 },
      { name: 'Eman Esfandi',       role: 'Ezra Bridger',      tier: 2 },
      { name: 'Ray Stevenson',      role: 'Baylan Skoll',      tier: 2 },
      { name: 'Ivanna Sakhno',      role: 'Shin Hati',         tier: 2 },
    ],
  },
  {
    slug: 'skeleton-crew', title: 'Skeleton Crew', type: 'tv', year: 2024, budget: 25,
    cast: [
      { name: 'Jude Law',           role: 'Jod Na Nawood',     tier: 1 },
      { name: 'Ravi Cabot-Conyers', role: 'Wim',               tier: 2 },
      { name: 'Ryan Keira Armstrong', role: 'Fern',            tier: 2 },
      { name: 'Kyriana Kratter',    role: 'KB',                tier: 3 },
      { name: 'Robert Timothy Smith', role: 'Neel',            tier: 3 },
    ],
  },
  {
    slug: 'the-acolyte', title: 'The Acolyte', type: 'tv', year: 2024, budget: 25,
    cast: [
      { name: 'Amandla Stenberg',   role: 'Osha/Mae',          tier: 1 },
      { name: 'Lee Jung-jae',       role: 'Sol',               tier: 1 },
      { name: 'Manny Jacinto',      role: 'The Stranger/Qimir', tier: 1 },
      { name: 'Jodie Turner-Smith', role: 'Mother Aniseya',    tier: 2 },
      { name: 'Dafne Keen',         role: 'Jecki Lon',         tier: 2 },
      { name: 'Carrie-Anne Moss',   role: 'Indara',            tier: 2 },
      { name: 'Charlie Barnett',    role: 'Yord Fandar',       tier: 2 },
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
    if (!tags.includes('StarWarsVerse')) tags.push('StarWarsVerse')
    await sb.from('actors').update({ universe_tags: tags.join(',') }).eq('name', actor.name)
  }
  console.log(`Tagged ${toTag.length} existing actors\n`)

  for (const actor of toAdd) {
    process.stdout.write(`  ${actor.name}... `)
    const result = await tmdbSearch(actor.name)
    if (!result) { console.log('NOT FOUND'); continue }

    // Check if TMDB ID already exists
    const { data: byId } = await sb.from('actors').select('name, universe_tags').eq('tmdb_id', result.id)
    if (byId && byId.length > 0) {
      const tags = (byId[0].universe_tags ?? '').split(',').map((t: string) => t.trim()).filter(Boolean)
      if (!tags.includes('StarWarsVerse')) tags.push('StarWarsVerse')
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
      universe_tags: 'StarWarsVerse',
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

  const { count } = await sb.from('actors').select('*', { count: 'exact', head: true }).ilike('universe_tags', '%StarWarsVerse%')
  console.log(`\nStarWarsVerse total: ${count}`)
}

main()
