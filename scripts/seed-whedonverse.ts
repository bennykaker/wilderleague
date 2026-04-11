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
  // Television
  {
    slug: 'buffy-the-vampire-slayer', title: 'Buffy the Vampire Slayer', type: 'tv', year: 1997, budget: 25,
    cast: [
      { name: 'Sarah Michelle Gellar',  role: 'Buffy Summers',    tier: 1 },
      { name: 'Nicholas Brendon',       role: 'Xander Harris',    tier: 1 },
      { name: 'Alyson Hannigan',        role: 'Willow Rosenberg', tier: 1 },
      { name: 'Charisma Carpenter',     role: 'Cordelia Chase',   tier: 1 },
      { name: 'Anthony Stewart Head',   role: 'Rupert Giles',     tier: 1 },
      { name: 'David Boreanaz',         role: 'Angel',            tier: 1 },
      { name: 'Seth Green',             role: 'Oz',               tier: 2 },
      { name: 'Michelle Trachtenberg',  role: 'Dawn Summers',     tier: 2 },
      { name: 'Emma Caulfield',         role: 'Anya Jenkins',     tier: 2 },
      { name: 'James Marsters',         role: 'Spike',            tier: 2 },
      { name: 'Eliza Dushku',           role: 'Faith',            tier: 2 },
    ],
  },
  {
    slug: 'angel', title: 'Angel', type: 'tv', year: 1999, budget: 20,
    cast: [
      { name: 'David Boreanaz',         role: 'Angel',                  tier: 1 },
      { name: 'Charisma Carpenter',     role: 'Cordelia Chase',         tier: 1 },
      { name: 'Alexis Denisof',         role: 'Wesley Wyndam-Pryce',   tier: 1 },
      { name: 'J. August Richards',     role: 'Charles Gunn',           tier: 1 },
      { name: 'Amy Acker',              role: 'Winifred "Fred" Burkle', tier: 1 },
      { name: 'Andy Hallett',           role: 'Lorne',                  tier: 2 },
      { name: 'James Marsters',         role: 'Spike',                  tier: 2 },
      { name: 'Mercedes McNab',         role: 'Harmony Kendall',        tier: 3 },
    ],
  },
  {
    slug: 'firefly', title: 'Firefly', type: 'tv', year: 2002, budget: 20,
    cast: [
      { name: 'Nathan Fillion',         role: 'Malcolm Reynolds',    tier: 1 },
      { name: 'Gina Torres',            role: 'Zoe Washburne',       tier: 1 },
      { name: 'Alan Tudyk',             role: 'Hoban Washburne',     tier: 1 },
      { name: 'Morena Baccarin',        role: 'Inara Serra',         tier: 1 },
      { name: 'Jewel Staite',           role: 'Kaylee Frye',         tier: 2 },
      { name: 'Adam Baldwin',           role: 'Jayne Cobb',          tier: 2 },
      { name: 'Summer Glau',            role: 'River Tam',           tier: 2 },
      { name: 'Sean Maher',             role: 'Simon Tam',           tier: 2 },
      { name: 'Ron Glass',              role: 'Shepherd Book',       tier: 2 },
    ],
  },
  {
    slug: 'dollhouse', title: 'Dollhouse', type: 'tv', year: 2009, budget: 15,
    cast: [
      { name: 'Eliza Dushku',           role: 'Echo',               tier: 1 },
      { name: 'Harry Lennix',           role: 'Boyd Langton',       tier: 1 },
      { name: 'Fran Kranz',             role: 'Topher Brink',       tier: 1 },
      { name: 'Tahmoh Penikett',        role: 'Paul Ballard',       tier: 2 },
      { name: 'Olivia Williams',        role: 'Adelle DeWitt',      tier: 1 },
      { name: 'Dichen Lachman',         role: 'Sierra',             tier: 2 },
      { name: 'Enver Gjokaj',           role: 'Victor',             tier: 2 },
      { name: 'Amy Acker',              role: 'Dr. Claire Saunders', tier: 2 },
    ],
  },
  {
    slug: 'agents-of-shield', title: 'Agents of S.H.I.E.L.D.', type: 'tv', year: 2013, budget: 25,
    cast: [
      { name: 'Clark Gregg',              role: 'Phil Coulson',          tier: 1 },
      { name: 'Ming-Na Wen',              role: 'Melinda May',            tier: 1 },
      { name: 'Brett Dalton',             role: 'Grant Ward',             tier: 1 },
      { name: 'Chloe Bennet',             role: 'Daisy Johnson',          tier: 1 },
      { name: 'Iain De Caestecker',       role: 'Leo Fitz',               tier: 2 },
      { name: 'Elizabeth Henstridge',     role: 'Jemma Simmons',          tier: 2 },
      { name: 'Henry Simmons',            role: 'Alphonso Mackenzie',     tier: 2 },
      { name: 'Natalia Cordova-Buckley',  role: 'Elena Rodriguez',        tier: 2 },
    ],
  },
  {
    slug: 'dr-horribles-sing-along-blog', title: "Dr. Horrible's Sing-Along Blog", type: 'tv', year: 2008, budget: 10,
    cast: [
      { name: 'Neil Patrick Harris', role: 'Dr. Horrible',   tier: 1 },
      { name: 'Nathan Fillion',      role: 'Captain Hammer', tier: 1 },
      { name: 'Felicia Day',         role: 'Penny',          tier: 1 },
    ],
  },
  // Films
  {
    slug: 'serenity', title: 'Serenity', type: 'film', year: 2005, budget: 20,
    cast: [
      { name: 'Nathan Fillion',     role: 'Malcolm Reynolds', tier: 1 },
      { name: 'Gina Torres',        role: 'Zoe Washburne',    tier: 1 },
      { name: 'Alan Tudyk',         role: 'Hoban Washburne',  tier: 1 },
      { name: 'Morena Baccarin',    role: 'Inara Serra',      tier: 2 },
      { name: 'Jewel Staite',       role: 'Kaylee Frye',      tier: 2 },
      { name: 'Adam Baldwin',       role: 'Jayne Cobb',       tier: 2 },
      { name: 'Summer Glau',        role: 'River Tam',        tier: 2 },
      { name: 'Sean Maher',         role: 'Simon Tam',        tier: 2 },
      { name: 'Chiwetel Ejiofor',   role: 'The Operative',    tier: 1 },
    ],
  },
  {
    slug: 'much-ado-about-nothing-2012', title: 'Much Ado About Nothing', type: 'film', year: 2012, budget: 10,
    cast: [
      { name: 'Alexis Denisof',  role: 'Benedick',  tier: 1 },
      { name: 'Amy Acker',       role: 'Beatrice',  tier: 1 },
      { name: 'Clark Gregg',     role: 'Leonato',   tier: 2 },
      { name: 'Reed Diamond',    role: 'Don Pedro', tier: 2 },
      { name: 'Fran Kranz',      role: 'Claudio',   tier: 2 },
      { name: 'Sean Maher',      role: 'Don John',  tier: 2 },
      { name: 'Nathan Fillion',  role: 'Dogberry',  tier: 2 },
      { name: 'Tom Lenk',        role: 'Verges',    tier: 3 },
    ],
  },
  {
    slug: 'in-your-eyes', title: 'In Your Eyes', type: 'film', year: 2014, budget: 10,
    cast: [
      { name: 'Michael Stahl-David', role: 'Dylan',   tier: 1 },
      { name: 'Zoe Kazan',           role: 'Rebecca', tier: 1 },
    ],
  },
  {
    slug: 'the-cabin-in-the-woods', title: 'The Cabin in the Woods', type: 'film', year: 2012, budget: 20,
    cast: [
      { name: 'Kristen Connolly',  role: 'Dana',         tier: 1 },
      { name: 'Chris Hemsworth',   role: 'Curt',         tier: 1 },
      { name: 'Anna Hutchison',    role: 'Jules',        tier: 2 },
      { name: 'Fran Kranz',        role: 'Marty',        tier: 1 },
      { name: 'Jesse Williams',    role: 'Holden',       tier: 2 },
      { name: 'Richard Jenkins',   role: 'Sitterson',    tier: 1 },
      { name: 'Bradley Whitford',  role: 'Hadley',       tier: 1 },
      { name: 'Sigourney Weaver',  role: 'The Director', tier: 1 },
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
    if (!tags.includes('WhedonVerse')) tags.push('WhedonVerse')
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
      if (!tags.includes('WhedonVerse')) tags.push('WhedonVerse')
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
      universe_tags: 'WhedonVerse',
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

  const { count } = await sb.from('actors').select('*', { count: 'exact', head: true }).ilike('universe_tags', '%WhedonVerse%')
  console.log(`\nWhedonVerse total: ${count}`)
}

main()
