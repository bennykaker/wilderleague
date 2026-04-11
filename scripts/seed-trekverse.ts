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
    slug: 'star-trek-tos', title: 'Star Trek: The Original Series', type: 'tv', year: 1966, budget: 20,
    cast: [
      { name: 'William Shatner',      role: 'Captain James T. Kirk',                 tier: 1 },
      { name: 'Leonard Nimoy',        role: 'Spock',                                 tier: 1 },
      { name: 'DeForest Kelley',      role: 'Dr. Leonard "Bones" McCoy',             tier: 1 },
      { name: 'James Doohan',         role: 'Montgomery "Scotty" Scott',             tier: 1 },
      { name: 'Nichelle Nichols',     role: 'Nyota Uhura',                           tier: 1 },
      { name: 'George Takei',         role: 'Hikaru Sulu',                           tier: 2 },
      { name: 'Walter Koenig',        role: 'Pavel Chekov',                          tier: 2 },
      { name: 'Majel Barrett',        role: 'Nurse Christine Chapel',                tier: 2 },
      { name: 'Grace Lee Whitney',    role: 'Janice Rand',                           tier: 3 },
      { name: 'Mark Lenard',          role: 'Sarek',                                 tier: 2 },
      { name: 'Ricardo Montalban',    role: 'Khan Noonien Singh',                    tier: 2 },
      { name: 'John Colicos',         role: 'Kor',                                   tier: 3 },
      { name: 'Michael Ansara',       role: 'Kang',                                  tier: 3 },
      { name: 'Roger C. Carmel',      role: 'Harry Mudd',                            tier: 3 },
      { name: 'Kirstie Alley',        role: 'Lieutenant Saavik',                     tier: 2 },
      { name: 'Christopher Lloyd',    role: 'Commander Kruge',                       tier: 2 },
      { name: 'Robin Curtis',         role: 'Saavik (recast)',                       tier: 3 },
      { name: 'Catherine Hicks',      role: 'Dr. Gillian Taylor',                    tier: 3 },
      { name: 'Kim Cattrall',         role: 'Lieutenant Valeris',                    tier: 2 },
      { name: 'Christopher Plummer',  role: 'General Chang',                         tier: 2 },
      { name: 'David Warner',         role: 'Chancellor Gorkon',                     tier: 2 },
      { name: 'Iman',                 role: 'Martia',                                tier: 3 },
    ],
  },
  {
    slug: 'star-trek-tng', title: 'Star Trek: The Next Generation', type: 'tv', year: 1987, budget: 30,
    cast: [
      { name: 'Patrick Stewart',      role: 'Captain Jean-Luc Picard',              tier: 1 },
      { name: 'Jonathan Frakes',      role: 'Commander William Riker',              tier: 1 },
      { name: 'Brent Spiner',         role: 'Lieutenant Commander Data',            tier: 1 },
      { name: 'LeVar Burton',         role: 'Lieutenant Commander Geordi La Forge', tier: 1 },
      { name: 'Michael Dorn',         role: 'Lieutenant Worf',                      tier: 1 },
      { name: 'Gates McFadden',       role: 'Dr. Beverly Crusher',                  tier: 1 },
      { name: 'Marina Sirtis',        role: 'Counselor Deanna Troi',                tier: 1 },
      { name: 'Wil Wheaton',          role: 'Wesley Crusher',                       tier: 2 },
      { name: 'Denise Crosby',        role: 'Lieutenant Tasha Yar',                 tier: 2 },
      { name: 'Whoopi Goldberg',      role: 'Guinan',                               tier: 2 },
      { name: 'John de Lancie',       role: 'Q',                                    tier: 2 },
      { name: 'Colm Meaney',          role: "Miles O'Brien",                        tier: 2 },
      { name: 'Diana Muldaur',        role: 'Dr. Katherine Pulaski',                tier: 3 },
      { name: 'Michelle Forbes',      role: 'Ensign Ro Laren',                      tier: 3 },
      { name: 'Dwight Schultz',       role: 'Lieutenant Reginald Barclay',          tier: 3 },
      { name: 'Patti Yasutake',       role: 'Nurse Ogawa',                          tier: 3 },
      // TNG Films
      { name: 'Malcolm McDowell',     role: 'Dr. Tolian Soran',                     tier: 2 },
      { name: 'Alice Krige',          role: 'Borg Queen',                           tier: 2 },
      { name: 'Alfre Woodard',        role: 'Lily Sloane',                          tier: 2 },
      { name: 'James Cromwell',       role: 'Zefram Cochrane',                      tier: 2 },
      { name: 'Tom Hardy',            role: 'Shinzon',                              tier: 2 },
      { name: 'F. Murray Abraham',    role: "Ru'afo",                               tier: 2 },
      { name: 'Donna Murphy',         role: 'Anij',                                 tier: 3 },
    ],
  },
  {
    slug: 'star-trek-ds9', title: 'Star Trek: Deep Space Nine', type: 'tv', year: 1993, budget: 30,
    cast: [
      { name: 'Avery Brooks',         role: 'Captain Benjamin Sisko',               tier: 1 },
      { name: 'Nana Visitor',         role: 'Major Kira Nerys',                     tier: 1 },
      { name: 'Terry Farrell',        role: 'Jadzia Dax',                           tier: 1 },
      { name: 'Nicole de Boer',       role: 'Ezri Dax',                             tier: 2 },
      { name: 'Colm Meaney',          role: "Miles O'Brien",                        tier: 1 },
      { name: 'Rene Auberjonois',     role: 'Odo',                                  tier: 1 },
      { name: 'Armin Shimerman',      role: 'Quark',                                tier: 1 },
      { name: 'Cirroc Lofton',        role: 'Jake Sisko',                           tier: 2 },
      { name: 'Alexander Siddig',     role: 'Dr. Julian Bashir',                    tier: 1 },
      { name: 'Michael Dorn',         role: 'Worf',                                 tier: 1 },
      { name: 'Andrew Robinson',      role: 'Elim Garak',                           tier: 2 },
      { name: 'Marc Alaimo',          role: 'Gul Dukat',                            tier: 2 },
      { name: 'Jeffrey Combs',        role: 'Weyoun / Brunt',                       tier: 2 },
      { name: 'Max Grodenchik',       role: 'Rom',                                  tier: 2 },
      { name: 'Aron Eisenberg',       role: 'Nog',                                  tier: 2 },
      { name: 'Louise Fletcher',      role: 'Kai Winn Adami',                       tier: 2 },
      { name: 'Casey Biggs',          role: 'Damar',                                tier: 2 },
      { name: 'Penny Johnson Jerald', role: 'Kasidy Yates',                         tier: 2 },
      { name: 'J.G. Hertzler',        role: 'General Martok',                       tier: 2 },
      { name: 'Salome Jens',          role: 'Female Changeling',                    tier: 2 },
      { name: 'Rosalind Chao',        role: "Keiko O'Brien",                        tier: 3 },
      { name: 'Chase Masterson',      role: 'Leeta',                                tier: 3 },
      { name: 'James Darren',         role: 'Vic Fontaine',                         tier: 3 },
      { name: 'Camille Saviola',      role: 'Kai Opaka',                            tier: 3 },
    ],
  },
  {
    slug: 'star-trek-voyager', title: 'Star Trek: Voyager', type: 'tv', year: 1995, budget: 30,
    cast: [
      { name: 'Kate Mulgrew',           role: 'Captain Kathryn Janeway',            tier: 1 },
      { name: 'Robert Beltran',         role: 'Commander Chakotay',                 tier: 1 },
      { name: 'Tim Russ',               role: 'Lieutenant Commander Tuvok',         tier: 1 },
      { name: 'Robert Picardo',         role: 'The Doctor',                         tier: 1 },
      { name: 'Ethan Phillips',         role: 'Neelix',                             tier: 2 },
      { name: 'Robert Duncan McNeill',  role: 'Lieutenant Tom Paris',               tier: 2 },
      { name: 'Roxann Dawson',          role: "B'Elanna Torres",                    tier: 2 },
      { name: 'Garrett Wang',           role: 'Ensign Harry Kim',                   tier: 2 },
      { name: 'Jennifer Lien',          role: 'Kes',                                tier: 2 },
      { name: 'Jeri Ryan',              role: 'Seven of Nine',                      tier: 1 },
      { name: 'Martha Hackett',         role: 'Seska',                              tier: 3 },
      { name: 'Brad Dourif',            role: 'Lon Suder',                          tier: 3 },
      { name: 'Susanna Thompson',       role: 'Borg Queen',                         tier: 2 },
      { name: 'Manu Intiraymi',         role: 'Icheb',                              tier: 3 },
    ],
  },
  {
    slug: 'star-trek-enterprise', title: 'Star Trek: Enterprise', type: 'tv', year: 2001, budget: 20,
    cast: [
      { name: 'Scott Bakula',       role: 'Captain Jonathan Archer',                tier: 1 },
      { name: 'Jolene Blalock',     role: "Sub-Commander T'Pol",                    tier: 1 },
      { name: 'Connor Trinneer',    role: 'Commander Charles "Trip" Tucker III',    tier: 1 },
      { name: 'Dominic Keating',    role: 'Lieutenant Malcolm Reed',                tier: 2 },
      { name: 'Linda Park',         role: 'Ensign Hoshi Sato',                      tier: 2 },
      { name: 'Anthony Montgomery', role: 'Ensign Travis Mayweather',               tier: 2 },
      { name: 'John Billingsley',   role: 'Dr. Phlox',                              tier: 1 },
      { name: 'Jeffrey Combs',      role: "Thy'lek Shran",                          tier: 2 },
      { name: 'Gary Graham',        role: 'Ambassador Soval',                       tier: 3 },
      { name: 'Vaughn Armstrong',   role: 'Admiral Maxwell Forrest',                tier: 3 },
    ],
  },
  {
    slug: 'star-trek-discovery', title: 'Star Trek: Discovery', type: 'tv', year: 2017, budget: 30,
    cast: [
      { name: 'Sonequa Martin-Green', role: 'Commander/Captain Michael Burnham',    tier: 1 },
      { name: 'Doug Jones',           role: 'Commander Saru',                       tier: 1 },
      { name: 'Anthony Rapp',         role: 'Lieutenant Paul Stamets',              tier: 2 },
      { name: 'Mary Wiseman',         role: 'Ensign Sylvia Tilly',                  tier: 2 },
      { name: 'Wilson Cruz',          role: 'Dr. Hugh Culber',                      tier: 2 },
      { name: 'David Ajala',          role: 'Cleveland "Book" Booker',              tier: 2 },
      { name: 'Blu del Barrio',       role: 'Adira Tal',                            tier: 3 },
      { name: 'Ian Alexander',        role: 'Gray Tal',                             tier: 3 },
      { name: 'Michelle Yeoh',        role: 'Captain Philippa Georgiou',            tier: 1 },
      { name: 'Jason Isaacs',         role: 'Captain Gabriel Lorca',                tier: 2 },
      { name: 'Shazad Latif',         role: 'Ash Tyler / Voq',                     tier: 2 },
      { name: 'Mary Chieffo',         role: "L'Rell",                               tier: 2 },
      { name: 'Rainn Wilson',         role: 'Harry Mudd',                           tier: 2 },
      { name: 'Ethan Peck',           role: 'Spock',                                tier: 1 },
      { name: 'Anson Mount',          role: 'Captain Christopher Pike',             tier: 1 },
      { name: 'Rebecca Romijn',       role: 'Number One / Una Chin-Riley',          tier: 2 },
      { name: 'Tig Notaro',           role: 'Commander Jett Reno',                  tier: 3 },
      { name: 'David Cronenberg',     role: 'Kovich',                               tier: 3 },
    ],
  },
  {
    slug: 'star-trek-picard', title: 'Star Trek: Picard', type: 'tv', year: 2020, budget: 30,
    cast: [
      { name: 'Patrick Stewart',      role: 'Admiral Jean-Luc Picard',              tier: 1 },
      { name: 'Alison Pill',          role: 'Dr. Agnes Jurati',                     tier: 2 },
      { name: 'Isa Briones',          role: 'Soji Asha',                            tier: 2 },
      { name: 'Santiago Cabrera',     role: 'Cristóbal Rios',                       tier: 2 },
      { name: 'Michelle Hurd',        role: 'Raffaela "Raffi" Musiker',             tier: 2 },
      { name: 'Evan Evagora',         role: 'Elnor',                                tier: 3 },
      { name: 'Jeri Ryan',            role: 'Seven of Nine',                        tier: 1 },
      { name: 'Brent Spiner',         role: 'Data / Altan Inigo Soong',             tier: 1 },
      { name: 'Jonathan Frakes',      role: 'Admiral William Riker',                tier: 1 },
      { name: 'Marina Sirtis',        role: 'Deanna Troi',                          tier: 2 },
      { name: 'John de Lancie',       role: 'Q',                                    tier: 2 },
      { name: 'Annie Wersching',      role: 'Borg Queen',                           tier: 2 },
      { name: 'Ed Speleers',          role: 'Jack Crusher',                         tier: 2 },
      { name: 'Todd Stashwick',       role: 'Captain Liam Shaw',                    tier: 2 },
      { name: 'Amanda Plummer',       role: 'Vadic',                                tier: 2 },
      { name: 'LeVar Burton',         role: 'Geordi La Forge',                      tier: 1 },
      { name: 'Michael Dorn',         role: 'Worf',                                 tier: 1 },
      { name: 'Gates McFadden',       role: 'Dr. Beverly Crusher',                  tier: 1 },
    ],
  },
  {
    slug: 'star-trek-strange-new-worlds', title: 'Star Trek: Strange New Worlds', type: 'tv', year: 2022, budget: 30,
    cast: [
      { name: 'Anson Mount',          role: 'Captain Christopher Pike',             tier: 1 },
      { name: 'Ethan Peck',           role: 'Spock',                                tier: 1 },
      { name: 'Rebecca Romijn',       role: 'Number One / Una Chin-Riley',          tier: 1 },
      { name: 'Jess Bush',            role: 'Nurse Christine Chapel',               tier: 2 },
      { name: 'Christina Chong',      role: "La'An Noonien-Singh",                  tier: 2 },
      { name: 'Celia Rose Gooding',   role: 'Uhura',                                tier: 2 },
      { name: 'Babs Olusanmokun',     role: "Dr. Joseph M'Benga",                   tier: 2 },
      { name: 'Melissa Navia',        role: 'Lieutenant Erica Ortegas',             tier: 3 },
      { name: 'Bruce Horak',          role: 'Hemmer',                               tier: 3 },
      { name: 'Carol Kane',           role: 'Pelia',                                tier: 2 },
      { name: 'Paul Wesley',          role: 'James T. Kirk',                        tier: 2 },
      { name: 'Martin Quinn',         role: 'Montgomery Scott',                     tier: 3 },
    ],
  },
  {
    slug: 'star-trek-2009', title: 'Star Trek (2009)', type: 'film', year: 2009, budget: 30,
    cast: [
      { name: 'Chris Pine',           role: 'Captain James T. Kirk',                tier: 1 },
      { name: 'Zachary Quinto',       role: 'Spock',                                tier: 1 },
      { name: 'Karl Urban',           role: 'Dr. Leonard McCoy',                    tier: 1 },
      { name: 'Zoe Saldana',          role: 'Nyota Uhura',                          tier: 1 },
      { name: 'Simon Pegg',           role: 'Montgomery Scott',                     tier: 1 },
      { name: 'John Cho',             role: 'Hikaru Sulu',                          tier: 2 },
      { name: 'Anton Yelchin',        role: 'Pavel Chekov',                         tier: 2 },
      { name: 'Eric Bana',            role: 'Nero',                                 tier: 2 },
      { name: 'Bruce Greenwood',      role: 'Captain Christopher Pike',             tier: 2 },
      { name: 'Ben Cross',            role: 'Sarek',                                tier: 3 },
      { name: 'Winona Ryder',         role: 'Amanda Grayson',                       tier: 3 },
      { name: 'Clifton Collins Jr.',  role: 'Ayel',                                 tier: 3 },
    ],
  },
  {
    slug: 'star-trek-into-darkness', title: 'Star Trek Into Darkness', type: 'film', year: 2013, budget: 30,
    cast: [
      { name: 'Chris Pine',           role: 'Captain James T. Kirk',                tier: 1 },
      { name: 'Zachary Quinto',       role: 'Spock',                                tier: 1 },
      { name: 'Karl Urban',           role: 'Dr. Leonard McCoy',                    tier: 1 },
      { name: 'Zoe Saldana',          role: 'Nyota Uhura',                          tier: 1 },
      { name: 'Simon Pegg',           role: 'Montgomery Scott',                     tier: 1 },
      { name: 'John Cho',             role: 'Hikaru Sulu',                          tier: 2 },
      { name: 'Anton Yelchin',        role: 'Pavel Chekov',                         tier: 2 },
      { name: 'Benedict Cumberbatch', role: 'Khan / John Harrison',                 tier: 1 },
      { name: 'Alice Eve',            role: 'Dr. Carol Marcus',                     tier: 2 },
      { name: 'Peter Weller',         role: 'Admiral Alexander Marcus',             tier: 2 },
    ],
  },
  {
    slug: 'star-trek-beyond', title: 'Star Trek Beyond', type: 'film', year: 2016, budget: 30,
    cast: [
      { name: 'Chris Pine',           role: 'Captain James T. Kirk',                tier: 1 },
      { name: 'Zachary Quinto',       role: 'Spock',                                tier: 1 },
      { name: 'Karl Urban',           role: 'Dr. Leonard McCoy',                    tier: 1 },
      { name: 'Zoe Saldana',          role: 'Nyota Uhura',                          tier: 1 },
      { name: 'Simon Pegg',           role: 'Montgomery Scott',                     tier: 1 },
      { name: 'John Cho',             role: 'Hikaru Sulu',                          tier: 2 },
      { name: 'Anton Yelchin',        role: 'Pavel Chekov',                         tier: 2 },
      { name: 'Idris Elba',           role: 'Krall',                                tier: 1 },
      { name: 'Sofia Boutella',       role: 'Jaylah',                               tier: 2 },
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
  console.log(`${existingMap.size} in DB already, ${toAdd.length} to add\n`)

  for (const actor of toTag) {
    const tags = (existingMap.get(actor.name) ?? '').split(',').map((t: string) => t.trim()).filter(Boolean)
    if (!tags.includes('TrekVerse')) tags.push('TrekVerse')
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
      if (!tags.includes('TrekVerse')) tags.push('TrekVerse')
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
      universe_tags: 'TrekVerse',
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

  const { count } = await sb.from('actors').select('*', { count: 'exact', head: true }).ilike('universe_tags', '%TrekVerse%')
  console.log(`\nTrekVerse total: ${count}`)
}

main()
