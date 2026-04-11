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
    slug: 'breaking-bad', title: 'Breaking Bad', type: 'tv', year: 2008, budget: 30,
    cast: [
      { name: 'Bryan Cranston',           role: 'Walter White',          tier: 1 },
      { name: 'Aaron Paul',               role: 'Jesse Pinkman',         tier: 1 },
      { name: 'Anna Gunn',                role: 'Skyler White',          tier: 1 },
      { name: 'Dean Norris',              role: 'Hank Schrader',         tier: 1 },
      { name: 'Betsy Brandt',             role: 'Marie Schrader',        tier: 2 },
      { name: 'RJ Mitte',                 role: 'Walter White Jr.',      tier: 2 },
      { name: 'Bob Odenkirk',             role: 'Saul Goodman',          tier: 1 },
      { name: 'Giancarlo Esposito',       role: 'Gus Fring',             tier: 1 },
      { name: 'Jonathan Banks',           role: 'Mike Ehrmantraut',      tier: 1 },
      { name: 'Steven Michael Quezada',   role: 'Steven Gomez',          tier: 2 },
      { name: 'Christopher Cousins',      role: 'Ted Beneke',            tier: 3 },
      { name: 'Matt Jones',               role: 'Badger',                tier: 3 },
      { name: 'Charles Baker',            role: 'Skinny Pete',           tier: 3 },
      { name: 'Mark Margolis',            role: 'Hector Salamanca',      tier: 2 },
      { name: 'Danny Trejo',              role: 'Tortuga',               tier: 3 },
      { name: 'David Costabile',          role: 'Gale Boetticher',       tier: 2 },
      { name: 'Krysten Ritter',           role: 'Jane Margolis',         tier: 2 },
      { name: 'Lavell Crawford',          role: 'Huell',                 tier: 3 },
      { name: 'Bill Burr',                role: 'Patrick Kuby',          tier: 3 },
      { name: 'Jesse Plemons',            role: 'Todd Alquist',          tier: 2 },
      { name: 'Laura Fraser',             role: 'Lydia Rodarte-Quayle',  tier: 2 },
      { name: 'Michael Bowen',            role: 'Jack Welker',           tier: 2 },
      { name: 'Kevin Rankin',             role: 'Kenny',                 tier: 3 },
      { name: 'Tess Harper',              role: 'Mrs. Pinkman',          tier: 3 },
      { name: 'Adam Godley',              role: 'Donald Margolis',       tier: 3 },
    ],
  },
  {
    slug: 'better-call-saul', title: 'Better Call Saul', type: 'tv', year: 2015, budget: 25,
    cast: [
      { name: 'Bob Odenkirk',       role: 'Jimmy McGill/Saul Goodman', tier: 1 },
      { name: 'Jonathan Banks',     role: 'Mike Ehrmantraut',          tier: 1 },
      { name: 'Rhea Seehorn',       role: 'Kim Wexler',                tier: 1 },
      { name: 'Patrick Fabian',     role: 'Howard Hamlin',             tier: 2 },
      { name: 'Michael Mando',      role: 'Nacho Varga',               tier: 2 },
      { name: 'Tony Dalton',        role: 'Lalo Salamanca',            tier: 2 },
      { name: 'Giancarlo Esposito', role: 'Gus Fring',                 tier: 1 },
      { name: 'Michael McKean',     role: 'Chuck McGill',              tier: 2 },
      { name: 'Carol Burnett',      role: 'Marion',                    tier: 2 },
      { name: 'Peter Diseth',       role: 'Bill Oakley',               tier: 3 },
      { name: 'Lavell Crawford',    role: 'Huell',                     tier: 3 },
      { name: 'Mark Margolis',      role: 'Hector Salamanca',          tier: 2 },
      { name: 'Jesse Plemons',      role: 'Todd',                      tier: 2 },
      { name: 'Steven Bauer',       role: 'Don Eladio',                tier: 2 },
      { name: 'Javier Grajeda',     role: 'Juan Bolsa',                tier: 3 },
      { name: 'Maximino Arciniega', role: 'Krazy-8',                   tier: 3 },
      { name: 'Kyle Bornheimer',    role: 'Lyle',                      tier: 3 },
      { name: 'Daniel Moncada',     role: 'Leonel Salamanca',          tier: 2 },
      { name: 'Luis Moncada',       role: 'Marco Salamanca',           tier: 2 },
    ],
  },
  {
    slug: 'el-camino', title: 'El Camino: A Breaking Bad Movie', type: 'film', year: 2019, budget: 20,
    cast: [
      { name: 'Aaron Paul',        role: 'Jesse Pinkman',       tier: 1 },
      { name: 'Jesse Plemons',     role: 'Todd Alquist',        tier: 2 },
      { name: 'Charles Baker',     role: 'Skinny Pete',         tier: 3 },
      { name: 'Matt Jones',        role: 'Badger',              tier: 3 },
      { name: 'Krysten Ritter',    role: 'Jane Margolis',       tier: 2 },
      { name: 'Bryan Cranston',    role: 'Walter White',        tier: 1 },
      { name: 'Robert Forster',    role: 'Ed Galbraith',        tier: 2 },
      { name: 'Scott MacArthur',   role: 'Neil Kandy',          tier: 3 },
      { name: 'Scott Shepherd',    role: 'Casey',               tier: 3 },
      { name: 'Tiffany Brisette',  role: 'Stephanie Doswell',   tier: 3 },
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
    if (!tags.includes('GilliganVerse')) tags.push('GilliganVerse')
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
      if (!tags.includes('GilliganVerse')) tags.push('GilliganVerse')
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
      universe_tags: 'GilliganVerse',
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

  const { count } = await sb.from('actors').select('*', { count: 'exact', head: true }).ilike('universe_tags', '%GilliganVerse%')
  console.log(`\nGilliganVerse total: ${count}`)
}

main()
