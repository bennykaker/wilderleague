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

// SNL is one title with cast across six eras
const TITLES = [
  {
    slug: 'saturday-night-live', title: 'Saturday Night Live', type: 'tv', year: 1975, budget: 30,
    cast: [
      // Original (1975-1980)
      { name: 'Chevy Chase',           role: 'Chevy Chase',           tier: 1 },
      { name: 'Dan Aykroyd',           role: 'Dan Aykroyd',           tier: 1 },
      { name: 'John Belushi',          role: 'John Belushi',          tier: 1 },
      { name: 'Gilda Radner',          role: 'Gilda Radner',          tier: 1 },
      { name: 'Jane Curtin',           role: 'Jane Curtin',           tier: 2 },
      { name: 'Laraine Newman',        role: 'Laraine Newman',        tier: 2 },
      { name: 'Garrett Morris',        role: 'Garrett Morris',        tier: 2 },
      { name: 'Bill Murray',           role: 'Bill Murray',           tier: 1 },
      { name: 'Al Franken',            role: 'Al Franken',            tier: 3 },
      // 1980s
      { name: 'Eddie Murphy',          role: 'Eddie Murphy',          tier: 1 },
      { name: 'Joe Piscopo',           role: 'Joe Piscopo',           tier: 3 },
      { name: 'Billy Crystal',         role: 'Billy Crystal',         tier: 2 },
      { name: 'Christopher Guest',     role: 'Christopher Guest',     tier: 2 },
      { name: 'Martin Short',          role: 'Martin Short',          tier: 2 },
      { name: 'Harry Shearer',         role: 'Harry Shearer',         tier: 2 },
      { name: 'Julia Louis-Dreyfus',   role: 'Julia Louis-Dreyfus',   tier: 2 },
      { name: 'Randy Quaid',           role: 'Randy Quaid',           tier: 3 },
      { name: 'Terry Sweeney',         role: 'Terry Sweeney',         tier: 3 },
      { name: 'Joan Cusack',           role: 'Joan Cusack',           tier: 2 },
      { name: 'Robert Downey Jr.',     role: 'Robert Downey Jr.',     tier: 2 },
      { name: 'Dennis Miller',         role: 'Dennis Miller',         tier: 2 },
      { name: 'Jan Hooks',             role: 'Jan Hooks',             tier: 2 },
      { name: 'Phil Hartman',          role: 'Phil Hartman',          tier: 1 },
      { name: 'Dana Carvey',           role: 'Dana Carvey',           tier: 1 },
      { name: 'Kevin Nealon',          role: 'Kevin Nealon',          tier: 2 },
      { name: 'Victoria Jackson',      role: 'Victoria Jackson',      tier: 3 },
      { name: 'Nora Dunn',             role: 'Nora Dunn',             tier: 3 },
      { name: 'Jon Lovitz',            role: 'Jon Lovitz',            tier: 2 },
      { name: 'Mike Myers',            role: 'Mike Myers',            tier: 1 },
      // 1990s
      { name: 'Chris Farley',          role: 'Chris Farley',          tier: 1 },
      { name: 'Adam Sandler',          role: 'Adam Sandler',          tier: 1 },
      { name: 'David Spade',           role: 'David Spade',           tier: 2 },
      { name: 'Chris Rock',            role: 'Chris Rock',            tier: 1 },
      { name: 'Rob Schneider',         role: 'Rob Schneider',         tier: 2 },
      { name: 'Tim Meadows',           role: 'Tim Meadows',           tier: 2 },
      { name: 'Ellen Cleghorne',       role: 'Ellen Cleghorne',       tier: 3 },
      { name: 'Melanie Hutsell',       role: 'Melanie Hutsell',       tier: 3 },
      { name: 'Julia Sweeney',         role: 'Julia Sweeney',         tier: 3 },
      { name: 'Will Ferrell',          role: 'Will Ferrell',          tier: 1 },
      { name: 'Cheri Oteri',           role: 'Cheri Oteri',           tier: 2 },
      { name: 'Molly Shannon',         role: 'Molly Shannon',         tier: 2 },
      { name: 'Colin Quinn',           role: 'Colin Quinn',           tier: 3 },
      { name: 'Ana Gasteyer',          role: 'Ana Gasteyer',          tier: 2 },
      { name: 'Tracy Morgan',          role: 'Tracy Morgan',          tier: 2 },
      { name: 'Chris Kattan',          role: 'Chris Kattan',          tier: 2 },
      { name: 'Darrell Hammond',       role: 'Darrell Hammond',       tier: 2 },
      { name: 'Jimmy Fallon',          role: 'Jimmy Fallon',          tier: 2 },
      { name: 'Tina Fey',              role: 'Tina Fey',              tier: 1 },
      { name: 'Rachel Dratch',         role: 'Rachel Dratch',         tier: 2 },
      // 2000s
      { name: 'Amy Poehler',           role: 'Amy Poehler',           tier: 1 },
      { name: 'Seth Meyers',           role: 'Seth Meyers',           tier: 2 },
      { name: 'Kristen Wiig',          role: 'Kristen Wiig',          tier: 1 },
      { name: 'Jason Sudeikis',        role: 'Jason Sudeikis',        tier: 2 },
      { name: 'Fred Armisen',          role: 'Fred Armisen',          tier: 2 },
      { name: 'Bill Hader',            role: 'Bill Hader',            tier: 1 },
      { name: 'Andy Samberg',          role: 'Andy Samberg',          tier: 2 },
      { name: 'Maya Rudolph',          role: 'Maya Rudolph',          tier: 2 },
      { name: 'Kenan Thompson',        role: 'Kenan Thompson',        tier: 2 },
      { name: 'Horatio Sanz',          role: 'Horatio Sanz',          tier: 3 },
      { name: 'Chris Parnell',         role: 'Chris Parnell',         tier: 3 },
      { name: 'Will Forte',            role: 'Will Forte',            tier: 2 },
      { name: 'Bobby Moynihan',        role: 'Bobby Moynihan',        tier: 2 },
      // 2010s
      { name: 'Kate McKinnon',         role: 'Kate McKinnon',         tier: 1 },
      { name: 'Cecily Strong',         role: 'Cecily Strong',         tier: 2 },
      { name: 'Jay Pharoah',           role: 'Jay Pharoah',           tier: 2 },
      { name: 'Taran Killam',          role: 'Taran Killam',          tier: 2 },
      { name: 'Vanessa Bayer',         role: 'Vanessa Bayer',         tier: 2 },
      { name: 'Pete Davidson',         role: 'Pete Davidson',         tier: 2 },
      { name: 'Leslie Jones',          role: 'Leslie Jones',          tier: 2 },
      { name: 'Sasheer Zamata',        role: 'Sasheer Zamata',        tier: 3 },
      { name: 'Michael Che',           role: 'Michael Che',           tier: 2 },
      { name: 'Colin Jost',            role: 'Colin Jost',            tier: 2 },
      { name: 'Beck Bennett',          role: 'Beck Bennett',          tier: 3 },
      { name: 'Kyle Mooney',           role: 'Kyle Mooney',           tier: 3 },
      { name: 'Aidy Bryant',           role: 'Aidy Bryant',           tier: 2 },
      { name: 'Melissa Villaseñor',    role: 'Melissa Villaseñor',    tier: 3 },
      { name: 'Mikey Day',             role: 'Mikey Day',             tier: 2 },
      { name: 'Alex Moffat',           role: 'Alex Moffat',           tier: 3 },
      // 2020s
      { name: 'Chloe Fineman',         role: 'Chloe Fineman',         tier: 2 },
      { name: 'Ego Nwodim',            role: 'Ego Nwodim',            tier: 2 },
      { name: 'Andrew Dismukes',       role: 'Andrew Dismukes',       tier: 3 },
      { name: 'Punkie Johnson',        role: 'Punkie Johnson',        tier: 3 },
      { name: 'James Austin Johnson',  role: 'James Austin Johnson',  tier: 2 },
      { name: 'Sarah Sherman',         role: 'Sarah Sherman',         tier: 3 },
      { name: 'Aristotle Athari',      role: 'Aristotle Athari',      tier: 3 },
      { name: 'Devon Walker',          role: 'Devon Walker',          tier: 3 },
      { name: 'Molly Kearney',         role: 'Molly Kearney',         tier: 3 },
      { name: 'Michael Longfellow',    role: 'Michael Longfellow',    tier: 3 },
      { name: 'Marcello Hernandez',    role: 'Marcello Hernandez',    tier: 2 },
      { name: 'Bowen Yang',            role: 'Bowen Yang',            tier: 2 },
      { name: 'Heidi Gardner',         role: 'Heidi Gardner',         tier: 2 },
      { name: 'Ashley Padilla',        role: 'Ashley Padilla',        tier: 3 },
      { name: 'Jane Wickline',         role: 'Jane Wickline',         tier: 3 },
      { name: 'Emil Wakim',            role: 'Emil Wakim',            tier: 3 },
      { name: 'Jake Shane',            role: 'Jake Shane',            tier: 3 },
      { name: 'Chloe Troast',          role: 'Chloe Troast',          tier: 3 },
      { name: 'Nate Bargatze',         role: 'Nate Bargatze',         tier: 2 },
      { name: 'Paul Mescal',           role: 'Paul Mescal',           tier: 2 },
      { name: 'Jenna Ortega',          role: 'Jenna Ortega',          tier: 2 },
    ],
  },
]

const ALL_ACTORS = [...new Map(
  TITLES.flatMap(t => t.cast).map(a => [a.name, a])
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
  const res = await fetch(`https://api.themoviedb.org/3/person/${id}`,
    { headers: { Authorization: `Bearer ${TMDB_TOKEN}`, accept: 'application/json' } }
  )
  return res.json() as Promise<{ biography?: string; birthday?: string }>
}

async function generateProfile(name: string, biography: string): Promise<string> {
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [{ role: 'user', content: `You are Marlowe, a veteran Hollywood casting director. Write a 2-3 sentence casting profile for ${name}, known for Saturday Night Live. Bio: ${biography.slice(0, 300)}. Direct and specific.` }],
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
    if (!tags.includes('SNLVerse')) tags.push('SNLVerse')
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
      if (!tags.includes('SNLVerse')) tags.push('SNLVerse')
      await sb.from('actors').update({ universe_tags: tags.join(',') }).eq('tmdb_id', result.id)
      console.log(`tagged existing (${byId[0].name})`)
      continue
    }

    const details = await tmdbDetails(result.id)
    const casting_profile = await generateProfile(actor.name, details.biography ?? '')
    const { error } = await sb.from('actors').insert({
      name: actor.name,
      tmdb_id: result.id,
      headshot_url: result.profile_path ? `https://image.tmdb.org/t/p/w500${result.profile_path}` : 'https://www.gravatar.com/avatar/?d=mp&s=500',
      popularity: result.popularity,
      known_for: 'Saturday Night Live',
      biography: details.biography ?? '',
      birth_year: details.birthday ? parseInt(details.birthday.split('-')[0]) : 1970,
      casting_profile,
      universe_tags: 'SNLVerse',
      cost: 2,
    })
    console.log(error ? `ERROR: ${error.message}` : 'done')
    await new Promise(r => setTimeout(r, 300))
  }

  console.log('\nUpserting title...')
  await sb.from('titles').upsert(
    TITLES.map(t => ({ slug: t.slug, title: t.title, type: t.type, year: t.year, budget: t.budget })),
    { onConflict: 'slug' }
  )
  console.log('1 title upserted')

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
    console.log(`  Saturday Night Live: ${added} roles added`)
  }

  const { count } = await sb.from('actors').select('*', { count: 'exact', head: true }).ilike('universe_tags', '%SNLVerse%')
  console.log(`\nSNLVerse total: ${count}`)
}

main()
