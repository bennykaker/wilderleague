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
    slug: 'doctor-who-classic', title: 'Doctor Who (Classic)', type: 'tv', year: 1963, budget: 10,
    cast: [
      { name: 'William Hartnell',   role: 'First Doctor',              tier: 1 },
      { name: 'Patrick Troughton',  role: 'Second Doctor',             tier: 1 },
      { name: 'Jon Pertwee',        role: 'Third Doctor',              tier: 1 },
      { name: 'Tom Baker',          role: 'Fourth Doctor',             tier: 1 },
      { name: 'Peter Davison',      role: 'Fifth Doctor',              tier: 1 },
      { name: 'Colin Baker',        role: 'Sixth Doctor',              tier: 1 },
      { name: 'Sylvester McCoy',    role: 'Seventh Doctor',            tier: 1 },
      { name: 'Carole Ann Ford',    role: 'Susan Foreman',             tier: 2 },
      { name: 'William Russell',    role: 'Ian Chesterton',            tier: 3 },
      { name: 'Jacqueline Hill',    role: 'Barbara Wright',            tier: 3 },
      { name: 'Frazer Hines',       role: 'Jamie McCrimmon',           tier: 2 },
      { name: 'Deborah Watling',    role: 'Victoria Waterfield',       tier: 3 },
      { name: 'Wendy Padbury',      role: 'Zoe Heriot',                tier: 2 },
      { name: 'Katy Manning',       role: 'Jo Grant',                  tier: 2 },
      { name: 'Elisabeth Sladen',   role: 'Sarah Jane Smith',          tier: 2 },
      { name: 'Ian Marter',         role: 'Harry Sullivan',            tier: 3 },
      { name: 'Louise Jameson',     role: 'Leela',                     tier: 3 },
      { name: 'Mary Tamm',          role: 'Romana I',                  tier: 3 },
      { name: 'Lalla Ward',         role: 'Romana II',                 tier: 3 },
      { name: 'Matthew Waterhouse', role: 'Adric',                     tier: 3 },
      { name: 'Sarah Sutton',       role: 'Nyssa',                     tier: 3 },
      { name: 'Janet Fielding',     role: 'Tegan Jovanka',             tier: 2 },
      { name: 'Mark Strickson',     role: 'Turlough',                  tier: 3 },
      { name: 'Nicola Bryant',      role: 'Peri Brown',                tier: 3 },
      { name: 'Bonnie Langford',    role: 'Mel Bush',                  tier: 3 },
      { name: 'Sophie Aldred',      role: 'Ace',                       tier: 2 },
      { name: 'Roger Delgado',      role: 'The Master (Delgado)',       tier: 2 },
      { name: 'Anthony Ainley',     role: 'The Master (Ainley)',        tier: 2 },
      { name: 'Michael Wisher',     role: 'Davros (Original)',          tier: 3 },
      { name: 'Terry Molloy',       role: 'Davros (Classic)',           tier: 3 },
      { name: 'Nicholas Courtney',  role: 'Brigadier Lethbridge-Stewart', tier: 2 },
    ],
  },
  {
    slug: 'doctor-who-tv-movie', title: 'Doctor Who: The TV Movie', type: 'film', year: 1996, budget: 10,
    cast: [
      { name: 'Paul McGann',      role: 'Eighth Doctor',      tier: 1 },
      { name: 'Eric Roberts',     role: 'The Master',         tier: 2 },
      { name: 'Daphne Ashbrook',  role: 'Dr. Grace Holloway', tier: 2 },
      { name: 'Yee Jee Tso',      role: 'Chang Lee',          tier: 3 },
    ],
  },
  {
    slug: 'doctor-who', title: 'Doctor Who', type: 'tv', year: 2005, budget: 25,
    cast: [
      { name: 'Christopher Eccleston', role: 'Ninth Doctor',       tier: 1 },
      { name: 'David Tennant',         role: 'Tenth Doctor',       tier: 1 },
      { name: 'Matt Smith',            role: 'Eleventh Doctor',    tier: 1 },
      { name: 'Peter Capaldi',         role: 'Twelfth Doctor',     tier: 1 },
      { name: 'Jodie Whittaker',       role: 'Thirteenth Doctor',  tier: 1 },
      { name: 'Ncuti Gatwa',           role: 'Fifteenth Doctor',   tier: 1 },
      { name: 'Jo Martin',             role: 'Fugitive Doctor',    tier: 2 },
      { name: 'John Hurt',             role: 'War Doctor',         tier: 2 },
      { name: 'Billie Piper',          role: 'Rose Tyler',         tier: 1 },
      { name: 'Noel Clarke',           role: 'Mickey Smith',       tier: 2 },
      { name: 'Camille Coduri',        role: 'Jackie Tyler',       tier: 2 },
      { name: 'John Barrowman',        role: 'Captain Jack Harkness', tier: 2 },
      { name: 'Freema Agyeman',        role: 'Martha Jones',       tier: 2 },
      { name: 'Catherine Tate',        role: 'Donna Noble',        tier: 1 },
      { name: 'Bernard Cribbins',      role: 'Wilfred Mott',       tier: 2 },
      { name: 'Karen Gillan',          role: 'Amy Pond',           tier: 1 },
      { name: 'Arthur Darvill',        role: 'Rory Williams',      tier: 2 },
      { name: 'Alex Kingston',         role: 'River Song',         tier: 2 },
      { name: 'Jenna Coleman',         role: 'Clara Oswald',       tier: 2 },
      { name: 'Pearl Mackie',          role: 'Bill Potts',         tier: 2 },
      { name: 'Matt Lucas',            role: 'Nardole',            tier: 2 },
      { name: 'Mandip Gill',           role: 'Yasmin Khan',        tier: 2 },
      { name: 'Tosin Cole',            role: 'Ryan Sinclair',      tier: 2 },
      { name: 'John Bishop',           role: 'Dan Lewis',          tier: 2 },
      { name: 'Millie Gibson',         role: 'Ruby Sunday',        tier: 2 },
      { name: 'Varada Sethu',          role: 'Belinda Chandra',    tier: 2 },
      { name: 'Yasmin Finney',         role: 'Rose Noble',         tier: 2 },
      { name: 'Derek Jacobi',          role: 'The Master (Jacobi)', tier: 2 },
      { name: 'John Simm',             role: 'The Master (Simm)',   tier: 2 },
      { name: 'Michelle Gomez',        role: 'Missy',              tier: 2 },
      { name: 'Sacha Dhawan',          role: 'The Master (Dhawan)', tier: 2 },
      { name: 'Julian Bleach',         role: 'Davros',             tier: 2 },
      { name: 'Nicholas Briggs',       role: 'Voice of Daleks/Cybermen', tier: 3 },
      { name: 'Penelope Wilton',       role: 'Harriet Jones PM',   tier: 2 },
      { name: 'David Harewood',        role: 'UNIT Commander',     tier: 2 },
      { name: 'Jemma Redgrave',        role: 'Kate Stewart',       tier: 2 },
      { name: 'Ingrid Oliver',         role: 'Osgood',             tier: 3 },
      { name: 'Frances Barber',        role: 'Madame Kovarian',    tier: 3 },
      { name: 'Neil Patrick Harris',   role: 'The Toymaker',       tier: 2 },
      { name: 'Miriam Margolyes',      role: 'The Meep',           tier: 2 },
      { name: 'Jinkx Monsoon',         role: 'Maestro',            tier: 2 },
    ],
  },
  {
    slug: 'torchwood', title: 'Torchwood', type: 'tv', year: 2006, budget: 20,
    cast: [
      { name: 'John Barrowman',     role: 'Captain Jack Harkness', tier: 1 },
      { name: 'Eve Myles',          role: 'Gwen Cooper',           tier: 1 },
      { name: 'Burn Gorman',        role: 'Owen Harper',           tier: 2 },
      { name: 'Naoko Mori',         role: 'Toshiko Sato',          tier: 2 },
      { name: 'Gareth David-Lloyd', role: 'Ianto Jones',           tier: 2 },
      { name: 'Kai Owen',           role: 'Rhys Williams',         tier: 3 },
      { name: 'Mekhi Phifer',       role: 'Rex Matheson',          tier: 2 },
      { name: 'Alexa Havins',       role: 'Esther Drummond',       tier: 3 },
      { name: 'Bill Pullman',       role: 'Oswald Danes',          tier: 2 },
      { name: 'Lauren Ambrose',     role: 'Jilly Kitzinger',       tier: 2 },
    ],
  },
  {
    slug: 'the-sarah-jane-adventures', title: 'The Sarah Jane Adventures', type: 'tv', year: 2007, budget: 10,
    cast: [
      { name: 'Elisabeth Sladen',     role: 'Sarah Jane Smith', tier: 1 },
      { name: 'Thomas Knight',        role: 'Luke Smith',       tier: 2 },
      { name: 'Yasmin Paige',         role: 'Maria Jackson',    tier: 2 },
      { name: 'Daniel Anthony',       role: 'Clyde Langer',     tier: 2 },
      { name: 'Anjli Mohindra',       role: 'Rani Chandra',     tier: 2 },
      { name: 'Alexander Armstrong',  role: 'Mr. Smith (voice)', tier: 3 },
      { name: 'John Leeson',          role: 'K9 (voice)',        tier: 3 },
    ],
  },
  {
    slug: 'class', title: 'Class', type: 'tv', year: 2016, budget: 10,
    cast: [
      { name: 'Greg Austin',     role: 'Charlie Smith',          tier: 1 },
      { name: 'Fady Elsayed',    role: 'Ram Singh',              tier: 1 },
      { name: 'Sophie Hopkins',  role: 'April MacLean',          tier: 1 },
      { name: 'Vivian Oparah',   role: 'Tanya Adeola',           tier: 1 },
      { name: 'Katherine Kelly', role: 'Miss Quill',             tier: 1 },
      { name: 'Jordan Renzo',    role: 'Matteusz Andrzejewski',  tier: 2 },
    ],
  },
  {
    slug: 'tales-of-the-tardis', title: 'Tales of the TARDIS', type: 'tv', year: 2023, budget: 10,
    cast: [
      { name: 'Peter Davison',   role: 'Fifth Doctor',   tier: 1 },
      { name: 'Janet Fielding',  role: 'Tegan',          tier: 2 },
      { name: 'Sarah Sutton',    role: 'Nyssa',          tier: 2 },
      { name: 'Frazer Hines',    role: 'Jamie',          tier: 2 },
      { name: 'Wendy Padbury',   role: 'Zoe',            tier: 2 },
      { name: 'Colin Baker',     role: 'Sixth Doctor',   tier: 1 },
      { name: 'Nicola Bryant',   role: 'Peri',           tier: 2 },
      { name: 'Sylvester McCoy', role: 'Seventh Doctor', tier: 1 },
      { name: 'Sophie Aldred',   role: 'Ace',            tier: 2 },
      { name: 'Katy Manning',    role: 'Jo Grant',       tier: 2 },
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
    if (!tags.includes('WhoVerse')) tags.push('WhoVerse')
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
      if (!tags.includes('WhoVerse')) tags.push('WhoVerse')
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
      universe_tags: 'WhoVerse',
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

  const { count } = await sb.from('actors').select('*', { count: 'exact', head: true }).ilike('universe_tags', '%WhoVerse%')
  console.log(`\nWhoVerse total: ${count}`)
}

main()
