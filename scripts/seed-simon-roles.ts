import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const env = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
for (const line of env.split('\n')) {
  const m = line.match(/^([^=]+)=(.*)$/)
  if (m) process.env[m[1].trim()] = m[2].trim()
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const SHOWS = [
  {
    slug: 'homicide-life-on-the-street',
    cast: [
      { name: 'Andre Braugher',    role: 'Frank Pembleton',  tier: 1 },
      { name: 'Kyle Secor',        role: 'Tim Bayliss',      tier: 1 },
      { name: 'Yaphet Kotto',      role: 'Al Giardello',     tier: 1 },
      { name: 'Richard Belzer',    role: 'John Munch',       tier: 2 },
      { name: 'Clark Johnson',     role: 'Meldrick Lewis',   tier: 2 },
      { name: 'Melissa Leo',       role: 'Kay Howard',       tier: 2 },
      { name: 'Ned Beatty',        role: 'Stan Bolander',    tier: 2 },
      { name: 'Jon Polito',        role: 'Steve Crosetti',   tier: 2 },
      { name: 'Daniel Baldwin',    role: 'Beau Felton',      tier: 2 },
      { name: 'Isabella Hofmann',  role: 'Megan Russert',    tier: 3 },
    ],
  },
  {
    slug: 'the-corner',
    cast: [
      { name: 'T.K. Carter',      role: 'Gary McCullough',    tier: 1 },
      { name: 'Khandi Alexander', role: 'Fran Boyd',          tier: 1 },
      { name: 'Sean Nelson',      role: 'DeAndre McCullough', tier: 2 },
      { name: 'Clarke Peters',    role: 'Crutchfield',        tier: 2 },
      { name: 'Reg E. Cathey',    role: 'Scalio',             tier: 3 },
    ],
  },
  {
    slug: 'generation-kill',
    cast: [
      { name: 'Alexander Skarsgård', role: 'Nate Fick',       tier: 1 },
      { name: 'James Ransone',       role: 'Ray Person',      tier: 1 },
      { name: 'Stark Sands',         role: 'Evan Wright',     tier: 2 },
      { name: 'Lee Tergesen',        role: 'Lee Tergesen',    tier: 2 },
      { name: 'Billy Lush',          role: 'Harold Trombley', tier: 3 },
    ],
  },
  {
    slug: 'treme',
    cast: [
      { name: 'Wendell Pierce',    role: 'Antoine Batiste',          tier: 1 },
      { name: 'Clarke Peters',     role: 'Albert Lambreaux',         tier: 1 },
      { name: 'Kim Dickens',       role: 'Janette Desautel',         tier: 1 },
      { name: 'David Morse',       role: 'Creighton Bernette',       tier: 1 },
      { name: 'Khandi Alexander',  role: 'LaDonna Batiste-Williams', tier: 2 },
      { name: 'Steve Zahn',        role: 'Davis McAlary',            tier: 2 },
      { name: 'Melissa Leo',       role: 'Toni Bernette',            tier: 2 },
    ],
  },
  {
    slug: 'show-me-a-hero',
    cast: [
      { name: 'Oscar Isaac',       role: 'Nick Wasicsko',    tier: 1 },
      { name: 'Winona Ryder',      role: 'Doreen Henderson', tier: 2 },
      { name: 'Catherine Keener', role: 'Mary Dorman',       tier: 2 },
      { name: 'Alfred Molina',    role: 'Hank Spallone',     tier: 2 },
      { name: 'Jim Belushi',      role: 'Angelo Martinelli', tier: 3 },
    ],
  },
  {
    slug: 'the-deuce',
    cast: [
      { name: 'James Franco',          role: 'Vincent Martino', tier: 1 },
      { name: 'Maggie Gyllenhaal',     role: 'Eileen Merrell',  tier: 1 },
      { name: 'Lawrence Gilliard Jr.', role: 'Larry Brown',     tier: 2 },
      { name: 'Emily Meade',           role: 'Lori Madison',    tier: 2 },
      { name: 'Dominique Fishback',    role: 'Darlene',         tier: 2 },
      { name: 'Chris Bauer',           role: 'Bobby Dwyer',     tier: 2 },
      { name: 'Gary Carr',             role: 'CC',              tier: 2 },
    ],
  },
  {
    slug: 'we-own-this-city',
    cast: [
      { name: 'Jon Bernthal',          role: 'Wayne Jenkins',   tier: 1 },
      { name: 'Wunmi Mosaku',          role: 'Nicole Steele',   tier: 2 },
      { name: 'Jamie Hector',          role: 'Monitor',         tier: 2 },
      { name: 'Darrell Britt-Gibson',  role: 'Momodu Gondo',    tier: 2 },
      { name: 'McKinley Belcher III',  role: 'David McDougall', tier: 2 },
      { name: 'Josh Charles',          role: 'John Sieracki',   tier: 3 },
    ],
  },
]

async function main() {
  for (const show of SHOWS) {
    const { data: existing } = await sb.from('roles').select('role_name').eq('title_slug', show.slug)
    const existingNames = new Set(existing?.map(r => r.role_name) ?? [])
    let added = 0

    for (const actor of show.cast) {
      if (existingNames.has(actor.role)) continue
      const { error } = await sb.from('roles').insert({
        title_slug: show.slug,
        role_name: actor.role,
        original_actor: actor.name,
        tier: actor.tier,
      })
      if (error) console.error(`  ${actor.role}: ${error.message}`)
      else added++
    }
    console.log(`${show.slug}: ${added} roles added (${show.cast.length - added} already existed)`)
  }
  console.log('\nDone.')
}

main()
