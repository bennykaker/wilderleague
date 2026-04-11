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
    slug: 'the-wire', title: 'The Wire', type: 'tv', year: 2002, budget: 30,
    cast: [
      // Season 1 — The Game
      { name: 'Dominic West',           role: 'Jimmy McNulty',                    tier: 1 },
      { name: 'Idris Elba',             role: 'Stringer Bell',                    tier: 1 },
      { name: 'Lance Reddick',          role: 'Cedric Daniels',                   tier: 1 },
      { name: 'Wood Harris',            role: 'Avon Barksdale',                   tier: 1 },
      { name: 'Michael K. Williams',    role: 'Omar Little',                      tier: 1 },
      { name: 'Wendell Pierce',         role: 'Bunk Moreland',                    tier: 1 },
      { name: 'Clarke Peters',          role: 'Lester Freamon',                   tier: 1 },
      { name: 'Andre Royo',             role: 'Bubbles',                          tier: 1 },
      { name: 'Sonja Sohn',             role: 'Kima Greggs',                      tier: 1 },
      { name: 'Seth Gilliam',           role: 'Ellis Carver',                     tier: 2 },
      { name: 'Domenick Lombardozzi',   role: 'Thomas "Herc" Hauk',               tier: 2 },
      { name: 'Jim True-Frost',         role: 'Roland "Prez" Pryzbylewski',       tier: 2 },
      { name: 'John Doman',             role: 'William Rawls',                    tier: 2 },
      { name: 'Frankie Faison',         role: 'Ervin Burrell',                    tier: 2 },
      { name: 'Deirdre Lovejoy',        role: 'Rhonda Pearlman',                  tier: 2 },
      { name: 'Leo Fitzpatrick',        role: 'Johnny Weeks',                     tier: 3 },
      { name: 'Hassan Johnson',         role: 'Wee-Bey Brice',                    tier: 2 },
      { name: 'Michael Potts',          role: 'Brother Mouzone',                  tier: 2 },
      { name: 'Isiah Whitlock Jr.',     role: 'Senator Clay Davis',               tier: 2 },
      { name: 'J.D. Williams',          role: 'Preston "Bodie" Broadus',          tier: 2 },
      { name: 'Larry Gilliard Jr.',     role: "D'Angelo Barksdale",               tier: 2 },
      { name: 'Michael B. Jordan',      role: 'Wallace',                          tier: 2 },
      { name: 'Callie Thorne',          role: 'Elena McNulty',                    tier: 3 },
      { name: 'Delaney Williams',       role: 'Jay Landsman',                     tier: 2 },
      { name: 'Corey Parker Robinson',  role: 'Leander Sydnor',                   tier: 3 },
      { name: 'Michael Hyatt',          role: 'Brianna Barksdale',                tier: 3 },
      { name: 'Robert F. Chew',         role: 'Proposition Joe',                  tier: 2 },
      { name: 'Melanie Nicholls-King',  role: 'Cheryl',                           tier: 3 },
      // Season 2 — The Port
      { name: 'Amy Ryan',               role: 'Beadie Russell',                   tier: 1 },
      { name: 'Chris Bauer',            role: 'Frank Sobotka',                    tier: 1 },
      { name: 'Pablo Schreiber',        role: 'Nick Sobotka',                     tier: 2 },
      { name: 'James Ransone',          role: 'Ziggy Sobotka',                    tier: 2 },
      { name: 'Bill Raymond',           role: 'The Greek',                        tier: 2 },
      { name: 'Paul Ben-Victor',        role: 'Spiros "Vondas" Vondopoulos',      tier: 2 },
      // Season 3 — The City
      { name: 'Aidan Gillen',           role: 'Tommy Carcetti',                   tier: 1 },
      { name: 'Robert Wisdom',          role: 'Howard "Bunny" Colvin',            tier: 1 },
      { name: 'Gbenga Akinnagbe',       role: 'Chris Partlow',                    tier: 2 },
      // Season 4 — The Schools
      { name: 'Tristan Wilds',          role: 'Michael Lee',                      tier: 2 },
      { name: 'Jermaine Crawford',      role: 'Duquan "Dukie" Weems',             tier: 2 },
      { name: 'Maestro Harrell',        role: 'Randy Wagstaff',                   tier: 2 },
      { name: 'Julito McCullum',        role: 'Namond Brice',                     tier: 2 },
      { name: 'Chad L. Coleman',        role: 'Dennis "Cutty" Wise',              tier: 2 },
      { name: 'Felicia Pearson',        role: 'Snoop',                            tier: 2 },
      { name: 'Glynn Turman',           role: 'Clarence Royce',                   tier: 2 },
      { name: 'Reg E. Cathey',          role: 'Norman Wilson',                    tier: 2 },
      { name: 'Neal Huff',              role: 'Michael Steintorf',                tier: 3 },
      { name: 'Method Man',             role: 'Cheese Wagstaff',                  tier: 3 },
      // Season 5 — The Press
      { name: 'Tom McCarthy',           role: 'Scott Templeton',                  tier: 2 },
      { name: 'Clark Johnson',          role: 'Gus Haynes',                       tier: 2 },
      { name: 'Michelle Paress',        role: 'Alma Gutierrez',                   tier: 3 },
      { name: 'Steve Earle',            role: 'Waylon',                           tier: 3 },
      { name: 'Neal Huff',              role: 'Michael Steintorf',                tier: 3 },
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
    if (!tags.includes('WireVerse')) tags.push('WireVerse')
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
      if (!tags.includes('WireVerse')) tags.push('WireVerse')
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
      universe_tags: 'WireVerse',
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

  const { count } = await sb.from('actors').select('*', { count: 'exact', head: true }).ilike('universe_tags', '%WireVerse%')
  console.log(`\nWireVerse total: ${count}`)
}

main()
