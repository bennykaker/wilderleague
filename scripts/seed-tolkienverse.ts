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
  // Lord of the Rings Trilogy
  {
    slug: 'lotr-fellowship-of-the-ring', title: 'The Lord of the Rings: The Fellowship of the Ring', type: 'film', year: 2001, budget: 45,
    cast: [
      { name: 'Elijah Wood',       role: 'Frodo Baggins',    tier: 1 },
      { name: 'Sean Astin',        role: 'Samwise Gamgee',   tier: 1 },
      { name: 'Ian McKellen',      role: 'Gandalf',          tier: 1 },
      { name: 'Viggo Mortensen',   role: 'Aragorn',          tier: 1 },
      { name: 'Orlando Bloom',     role: 'Legolas',          tier: 1 },
      { name: 'John Rhys-Davies',  role: 'Gimli',            tier: 2 },
      { name: 'Sean Bean',         role: 'Boromir',          tier: 1 },
      { name: 'Dominic Monaghan',  role: 'Merry',            tier: 2 },
      { name: 'Billy Boyd',        role: 'Pippin',           tier: 2 },
      { name: 'Cate Blanchett',    role: 'Galadriel',        tier: 1 },
      { name: 'Hugo Weaving',      role: 'Elrond',           tier: 2 },
      { name: 'Liv Tyler',         role: 'Arwen',            tier: 2 },
      { name: 'Ian Holm',          role: 'Bilbo Baggins',    tier: 2 },
      { name: 'Andy Serkis',       role: 'Gollum',           tier: 2 },
      { name: 'Christopher Lee',   role: 'Saruman',          tier: 2 },
      { name: 'Marton Csokas',     role: 'Celeborn',         tier: 3 },
      { name: 'Craig Parker',      role: 'Haldir',           tier: 3 },
      { name: 'Sala Baker',        role: 'Sauron',           tier: 3 },
      { name: 'Lawrence Makoare',  role: 'Lurtz',            tier: 3 },
    ],
  },
  {
    slug: 'lotr-the-two-towers', title: 'The Lord of the Rings: The Two Towers', type: 'film', year: 2002, budget: 45,
    cast: [
      { name: 'Elijah Wood',       role: 'Frodo Baggins',      tier: 1 },
      { name: 'Sean Astin',        role: 'Samwise Gamgee',     tier: 1 },
      { name: 'Ian McKellen',      role: 'Gandalf',            tier: 1 },
      { name: 'Viggo Mortensen',   role: 'Aragorn',            tier: 1 },
      { name: 'Orlando Bloom',     role: 'Legolas',            tier: 1 },
      { name: 'John Rhys-Davies',  role: 'Gimli',              tier: 2 },
      { name: 'Dominic Monaghan',  role: 'Merry',              tier: 2 },
      { name: 'Billy Boyd',        role: 'Pippin',             tier: 2 },
      { name: 'Andy Serkis',       role: 'Gollum',             tier: 2 },
      { name: 'Bernard Hill',      role: 'Théoden',            tier: 2 },
      { name: 'Miranda Otto',      role: 'Éowyn',              tier: 2 },
      { name: 'Karl Urban',        role: 'Éomer',              tier: 2 },
      { name: 'Brad Dourif',       role: 'Grima Wormtongue',   tier: 2 },
      { name: 'David Wenham',      role: 'Faramir',            tier: 2 },
      { name: 'Christopher Lee',   role: 'Saruman',            tier: 2 },
      { name: 'Lawrence Makoare',  role: 'Gothmog',            tier: 3 },
    ],
  },
  {
    slug: 'lotr-the-return-of-the-king', title: 'The Lord of the Rings: The Return of the King', type: 'film', year: 2003, budget: 45,
    cast: [
      { name: 'Elijah Wood',       role: 'Frodo Baggins',   tier: 1 },
      { name: 'Sean Astin',        role: 'Samwise Gamgee',  tier: 1 },
      { name: 'Ian McKellen',      role: 'Gandalf',         tier: 1 },
      { name: 'Viggo Mortensen',   role: 'Aragorn',         tier: 1 },
      { name: 'Orlando Bloom',     role: 'Legolas',         tier: 1 },
      { name: 'John Rhys-Davies',  role: 'Gimli',           tier: 2 },
      { name: 'Dominic Monaghan',  role: 'Merry',           tier: 2 },
      { name: 'Billy Boyd',        role: 'Pippin',          tier: 2 },
      { name: 'Cate Blanchett',    role: 'Galadriel',       tier: 1 },
      { name: 'Hugo Weaving',      role: 'Elrond',          tier: 2 },
      { name: 'Liv Tyler',         role: 'Arwen',           tier: 2 },
      { name: 'Andy Serkis',       role: 'Gollum',          tier: 2 },
      { name: 'Bernard Hill',      role: 'Théoden',         tier: 2 },
      { name: 'Miranda Otto',      role: 'Éowyn',           tier: 2 },
      { name: 'Karl Urban',        role: 'Éomer',           tier: 2 },
      { name: 'David Wenham',      role: 'Faramir',         tier: 2 },
      { name: 'John Noble',        role: 'Denethor',        tier: 2 },
      { name: 'Lawrence Makoare',  role: 'Witch-king',      tier: 3 },
      { name: 'Ian Hughes',        role: 'Irolas',          tier: 3 },
    ],
  },
  // Hobbit Trilogy
  {
    slug: 'hobbit-an-unexpected-journey', title: 'The Hobbit: An Unexpected Journey', type: 'film', year: 2012, budget: 35,
    cast: [
      { name: 'Martin Freeman',    role: 'Bilbo Baggins',      tier: 1 },
      { name: 'Ian McKellen',      role: 'Gandalf',            tier: 1 },
      { name: 'Richard Armitage',  role: 'Thorin Oakenshield', tier: 1 },
      { name: 'Ken Stott',         role: 'Balin',              tier: 2 },
      { name: 'Graham McTavish',   role: 'Dwalin',             tier: 2 },
      { name: 'James Nesbitt',     role: 'Bofur',              tier: 2 },
      { name: 'Aidan Turner',      role: 'Kili',               tier: 2 },
      { name: 'Dean O\'Gorman',    role: 'Fili',               tier: 3 },
      { name: 'William Kircher',   role: 'Bifur',              tier: 3 },
      { name: 'Stephen Hunter',    role: 'Bombur',             tier: 3 },
      { name: 'John Callen',       role: 'Oin',                tier: 3 },
      { name: 'Peter Hambleton',   role: 'Gloin',              tier: 3 },
      { name: 'Jed Brophy',        role: 'Nori',               tier: 3 },
      { name: 'Mark Hadlow',       role: 'Dori',               tier: 3 },
      { name: 'Adam Brown',        role: 'Ori',                tier: 3 },
      { name: 'Cate Blanchett',    role: 'Galadriel',          tier: 1 },
      { name: 'Hugo Weaving',      role: 'Elrond',             tier: 2 },
      { name: 'Christopher Lee',   role: 'Saruman',            tier: 2 },
      { name: 'Andy Serkis',       role: 'Gollum',             tier: 2 },
      { name: 'Ian Holm',          role: 'Old Bilbo',          tier: 2 },
      { name: 'Barry Humphries',   role: 'Goblin King',        tier: 3 },
      { name: 'Sylvester McCoy',   role: 'Radagast',           tier: 3 },
    ],
  },
  {
    slug: 'hobbit-desolation-of-smaug', title: 'The Hobbit: The Desolation of Smaug', type: 'film', year: 2013, budget: 35,
    cast: [
      { name: 'Martin Freeman',      role: 'Bilbo Baggins',      tier: 1 },
      { name: 'Ian McKellen',        role: 'Gandalf',            tier: 1 },
      { name: 'Richard Armitage',    role: 'Thorin Oakenshield', tier: 1 },
      { name: 'Benedict Cumberbatch', role: 'Smaug/Necromancer', tier: 1 },
      { name: 'Lee Pace',            role: 'Thranduil',          tier: 2 },
      { name: 'Evangeline Lilly',    role: 'Tauriel',            tier: 2 },
      { name: 'Orlando Bloom',       role: 'Legolas',            tier: 1 },
      { name: 'Luke Evans',          role: 'Bard the Bowman',    tier: 2 },
      { name: 'Stephen Fry',         role: 'Master of Lake-town', tier: 2 },
      { name: 'Ryan Gage',           role: 'Alfrid',             tier: 3 },
      { name: 'Manu Bennett',        role: 'Azog',               tier: 3 },
      { name: 'Ken Stott',           role: 'Balin',              tier: 2 },
      { name: 'Graham McTavish',     role: 'Dwalin',             tier: 2 },
      { name: 'Aidan Turner',        role: 'Kili',               tier: 2 },
    ],
  },
  {
    slug: 'hobbit-battle-of-five-armies', title: 'The Hobbit: The Battle of the Five Armies', type: 'film', year: 2014, budget: 35,
    cast: [
      { name: 'Martin Freeman',      role: 'Bilbo Baggins',      tier: 1 },
      { name: 'Ian McKellen',        role: 'Gandalf',            tier: 1 },
      { name: 'Richard Armitage',    role: 'Thorin Oakenshield', tier: 1 },
      { name: 'Benedict Cumberbatch', role: 'Smaug',             tier: 1 },
      { name: 'Lee Pace',            role: 'Thranduil',          tier: 2 },
      { name: 'Evangeline Lilly',    role: 'Tauriel',            tier: 2 },
      { name: 'Orlando Bloom',       role: 'Legolas',            tier: 1 },
      { name: 'Luke Evans',          role: 'Bard the Bowman',    tier: 2 },
      { name: 'Ryan Gage',           role: 'Alfrid',             tier: 3 },
      { name: 'Lawrence Makoare',    role: 'Bolg',               tier: 3 },
      { name: 'Cate Blanchett',      role: 'Galadriel',          tier: 1 },
      { name: 'Hugo Weaving',        role: 'Elrond',             tier: 2 },
      { name: 'Christopher Lee',     role: 'Saruman',            tier: 2 },
    ],
  },
  // Rings of Power
  {
    slug: 'rings-of-power', title: 'The Lord of the Rings: The Rings of Power', type: 'tv', year: 2022, budget: 35,
    cast: [
      { name: 'Morfydd Clark',           role: 'Galadriel',              tier: 1 },
      { name: 'Robert Aramayo',          role: 'Elrond',                 tier: 1 },
      { name: 'Owain Arthur',            role: 'Prince Durin IV',        tier: 1 },
      { name: 'Sophia Nomvete',          role: 'Princess Disa',          tier: 1 },
      { name: 'Charlie Vickers',         role: 'Halbrand/Sauron',        tier: 1 },
      { name: 'Markella Kavenagh',       role: 'Nori Brandyfoot',        tier: 1 },
      { name: 'Charles Edwards',         role: 'Celebrimbor',            tier: 2 },
      { name: 'Benjamin Walker',         role: 'High King Gil-galad',    tier: 2 },
      { name: 'Ismael Cruz Córdova',     role: 'Arondir',                tier: 2 },
      { name: 'Cynthia Addai-Robinson',  role: 'Queen Regent Míriel',    tier: 2 },
      { name: 'Lloyd Owen',              role: 'Elendil',                tier: 2 },
      { name: 'Maxim Baldry',            role: 'Isildur',                tier: 2 },
      { name: 'Trystan Gravelle',        role: 'Pharazôn',               tier: 2 },
      { name: 'Nazanin Boniadi',         role: 'Bronwyn',                tier: 2 },
      { name: 'Joseph Mawle',            role: 'Adar',                   tier: 2 },
      { name: 'Lenny Henry',             role: 'Sadoc Burrows',          tier: 2 },
      { name: 'Rory Kinnear',            role: 'Tom Bombadil',           tier: 2 },
      { name: 'Ben Daniels',             role: 'Círdan',                 tier: 2 },
      { name: 'Megan Richards',          role: 'Poppy Proudfellow',      tier: 2 },
      { name: 'Tyroe Muhafidin',         role: 'Theo',                   tier: 2 },
      { name: 'Thusitha Jayasundera',    role: 'Sadoc Burrows (S1)',     tier: 2 },
      { name: 'Sara Zwangobani',         role: 'Marigold Brandyfoot',    tier: 3 },
      { name: 'Dylan Smith',             role: 'Largo Brandyfoot',       tier: 3 },
      { name: 'Ema Horvath',             role: 'Eärien',                 tier: 3 },
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
    if (!tags.includes('TolkienVerse')) tags.push('TolkienVerse')
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
      if (!tags.includes('TolkienVerse')) tags.push('TolkienVerse')
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
      universe_tags: 'TolkienVerse',
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

  const { count } = await sb.from('actors').select('*', { count: 'exact', head: true }).ilike('universe_tags', '%TolkienVerse%')
  console.log(`\nTolkienVerse total: ${count}`)
}

main()
