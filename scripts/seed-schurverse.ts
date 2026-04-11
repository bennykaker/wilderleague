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
    slug: 'brooklyn-nine-nine', title: 'Brooklyn Nine-Nine', type: 'tv', year: 2013, budget: 25,
    cast: [
      { name: 'Andy Samberg',       role: 'Jake Peralta',       tier: 1 },
      { name: 'Andre Braugher',     role: 'Raymond Holt',       tier: 1 },
      { name: 'Terry Crews',        role: 'Terry Jeffords',     tier: 1 },
      { name: 'Melissa Fumero',     role: 'Amy Santiago',       tier: 1 },
      { name: 'Joe Lo Truglio',     role: 'Charles Boyle',      tier: 2 },
      { name: 'Stephanie Beatriz',  role: 'Rosa Diaz',          tier: 2 },
      { name: 'Chelsea Peretti',    role: 'Gina Linetti',       tier: 2 },
      { name: 'Dirk Blocker',       role: 'Michael Hitchcock',  tier: 3 },
      { name: 'Joel McKinnon Miller', role: 'Norm Scully',      tier: 3 },
    ],
  },
  {
    slug: 'the-office-us', title: 'The Office', type: 'tv', year: 2005, budget: 25,
    cast: [
      { name: 'Steve Carell',    role: 'Michael Scott',      tier: 1 },
      { name: 'John Krasinski',  role: 'Jim Halpert',        tier: 1 },
      { name: 'Jenna Fischer',   role: 'Pam Beesly',         tier: 1 },
      { name: 'Rainn Wilson',    role: 'Dwight Schrute',     tier: 1 },
      { name: 'Ed Helms',        role: 'Andy Bernard',       tier: 2 },
      { name: 'Craig Robinson',  role: 'Darryl Philbin',     tier: 2 },
      { name: 'Mindy Kaling',    role: 'Kelly Kapoor',       tier: 2 },
      { name: 'B.J. Novak',      role: 'Ryan Howard',        tier: 2 },
      { name: 'Ellie Kemper',    role: 'Erin Hannon',        tier: 2 },
      { name: 'James Spader',    role: 'Robert California',  tier: 2 },
    ],
  },
  {
    slug: 'parks-and-recreation', title: 'Parks and Recreation', type: 'tv', year: 2009, budget: 25,
    cast: [
      { name: 'Amy Poehler',    role: 'Leslie Knope',   tier: 1 },
      { name: 'Nick Offerman',  role: 'Ron Swanson',    tier: 1 },
      { name: 'Aziz Ansari',    role: 'Tom Haverford',  tier: 1 },
      { name: 'Rashida Jones',  role: 'Ann Perkins',    tier: 1 },
      { name: 'Chris Pratt',    role: 'Andy Dwyer',     tier: 1 },
      { name: 'Aubrey Plaza',   role: 'April Ludgate',  tier: 1 },
      { name: 'Adam Scott',     role: 'Ben Wyatt',      tier: 2 },
      { name: 'Rob Lowe',       role: 'Chris Traeger',  tier: 2 },
      { name: 'Jim O\'Heir',    role: 'Jerry Gergich',  tier: 2 },
      { name: 'Retta',          role: 'Donna Meagle',   tier: 2 },
    ],
  },
  {
    slug: 'the-good-place', title: 'The Good Place', type: 'tv', year: 2016, budget: 20,
    cast: [
      { name: 'Kristen Bell',          role: 'Eleanor Shellstrop', tier: 1 },
      { name: 'Ted Danson',            role: 'Michael',            tier: 1 },
      { name: 'William Jackson Harper', role: 'Chidi Anagonye',    tier: 1 },
      { name: 'Jameela Jamil',         role: 'Tahani Al-Jamil',    tier: 1 },
      { name: 'D\'Arcy Carden',        role: 'Janet',              tier: 1 },
      { name: 'Manny Jacinto',         role: 'Jason Mendoza',      tier: 1 },
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
    if (!tags.includes('SchurVerse')) tags.push('SchurVerse')
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
      if (!tags.includes('SchurVerse')) tags.push('SchurVerse')
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
      universe_tags: 'SchurVerse',
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

  const { count } = await sb.from('actors').select('*', { count: 'exact', head: true }).ilike('universe_tags', '%SchurVerse%')
  console.log(`\nSchurVerse total: ${count}`)
}

main()
