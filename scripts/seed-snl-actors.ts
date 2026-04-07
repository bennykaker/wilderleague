/**
 * Seeds SNL cast members, writers, and frequent hosts.
 * Skips anyone already in DB. Safe to re-run.
 * Run with: npx tsx scripts/seed-snl-actors.ts
 */

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([^=]+)=(.*)$/)
    if (m) process.env[m[1].trim()] = m[2].trim()
  }
}

const TMDB_KEY = process.env.TMDB_API_KEY!
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }
function popularityToCost(pop: number): number {
  if (pop >= 20) return 12; if (pop >= 15) return 10; if (pop >= 12) return 8
  if (pop >= 10) return 6; if (pop >= 6) return 4; return 3
}
function genderLabel(g: number): string {
  if (g === 1) return 'female'; if (g === 2) return 'male'; return ''
}

const ACTORS = [
  // Original cast / early era
  'Laraine Newman', 'Jane Curtin', 'Nora Dunn', 'Jan Hooks',
  'Victoria Jackson', 'Julia Louis-Dreyfus',
  'Phil Hartman', 'Dana Carvey', 'Mike Myers', 'Chris Farley',
  'Adam Sandler', 'David Spade', 'Chris Rock', 'Rob Schneider',
  'Tim Meadows', 'Norm MacDonald', 'Kevin Nealon',
  'Jon Lovitz', 'Dennis Miller', 'Harry Shearer',
  'Martin Short', 'Billy Crystal', 'Christopher Guest',
  'Ellen Cleghorne', 'Melanie Hutsell', 'Mark McKinney',
  'Colin Quinn', 'Sarah Silverman', 'Janeane Garofalo',
  'Laura Kightlinger', 'Nancy Walls',

  // Late 90s / 2000s
  'Will Ferrell', 'Ana Gasteyer', 'Cheri Oteri', 'Molly Shannon',
  'Jimmy Fallon', 'Tina Fey', 'Amy Poehler', 'Rachel Dratch',
  'Horatio Sanz', 'Seth Meyers', 'Fred Armisen', 'Darrell Hammond',
  'Chris Kattan', 'Tracy Morgan', 'Finesse Mitchell',
  'Kenan Thompson', 'Maya Rudolph', 'Will Forte',

  // 2010s
  'Bill Hader', 'Kristen Wiig', 'Andy Samberg', 'Jason Sudeikis',
  'Abby Elliott', 'Jenny Slate', 'Bobby Moynihan', 'Nasim Pedrad',
  'Vanessa Bayer', 'Jay Pharoah', 'Taran Killam', 'Kate McKinnon',
  'Cecily Strong', 'Aidy Bryant', 'Kyle Mooney', 'Beck Bennett',
  'Leslie Jones', 'Sasheer Zamata', 'Pete Davidson', 'Colin Jost',
  'Michael Che', 'Melissa Villasenor',

  // 2020s
  'Mikey Day', 'Alex Moffat', 'Heidi Gardner', 'Chris Redd',
  'Ego Nwodim', 'Andrew Dismukes', 'Punkie Johnson',
  'James Austin Johnson', 'Sarah Sherman', 'Molly Kearney',
  'Devon Walker', 'Michael Longfellow', 'Marcello Hernandez',
  'Chloe Fineman', 'Bowen Yang',

  // Writers who crossed over
  'John Mulaney', 'Donald Glover', 'Ellie Kemper', 'BJ Novak',
  'Aubrey Plaza', 'Nick Kroll', 'Aziz Ansari', 'Mindy Kaling',
  'Rob Riggle', 'Kristen Schaal', 'Casey Wilson', 'Michaela Watkins',
  'Paul Brittain', 'Will Strong',

  // Iconic hosts
  'Steve Martin', 'Alec Baldwin', 'John Goodman', 'Christopher Walken',
  'Tom Hanks', 'Paul Rudd', 'Jonah Hill', 'James Franco',
  'Anne Hathaway', 'Emma Stone', 'Scarlett Johansson',
  'Justin Timberlake', 'Dwayne Johnson', 'Dave Chappelle',
  'Eddie Murphy',
]

async function searchTmdb(name: string): Promise<any | null> {
  const res = await fetch(
    `https://api.themoviedb.org/3/search/person?query=${encodeURIComponent(name)}&include_adult=false`,
    { headers: { Authorization: `Bearer ${TMDB_KEY}`, accept: 'application/json' } }
  )
  if (!res.ok) return null
  const data = await res.json() as any
  return data.results?.[0] ?? null
}

async function fetchDetail(tmdbId: number): Promise<any | null> {
  const res = await fetch(
    `https://api.themoviedb.org/3/person/${tmdbId}?append_to_response=combined_credits`,
    { headers: { Authorization: `Bearer ${TMDB_KEY}`, accept: 'application/json' } }
  )
  if (!res.ok) return null
  return res.json()
}

async function generateProfile(name: string, biography: string, known_for: string): Promise<string> {
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: `You are Marlowe, a veteran Hollywood casting director. Write a 2-3 sentence casting profile for ${name}. Focus on screen presence, range, what roles they excel at, and what makes them distinctive. Known for: ${known_for}. Bio: ${biography.slice(0, 300)}`,
    }],
  })
  return msg.content[0].type === 'text' ? msg.content[0].text.trim() : ''
}

async function main() {
  const unique = [...new Set(ACTORS)]
  console.log(`Processing ${unique.length} actors...\n`)
  let added = 0, skipped = 0, failed = 0

  for (const name of unique) {
    try {
      process.stdout.write(`${name}... `)

      const { data: existing } = await supabase
        .from('actors').select('name').ilike('name', name).single()
      if (existing) { console.log('already exists'); skipped++; await sleep(100); continue }

      const result = await searchTmdb(name)
      if (!result) { console.log('✗ not found on TMDB'); failed++; await sleep(300); continue }

      await sleep(260)

      const detail = await fetchDetail(result.id)
      if (!detail) { console.log('✗ detail fetch failed'); failed++; await sleep(300); continue }

      await sleep(260)

      const credits = (detail.combined_credits?.cast ?? []) as any[]
      const topCredits = credits
        .filter((c: any) => c.vote_count > 50)
        .sort((a: any, b: any) => b.popularity - a.popularity)
        .slice(0, 6)
        .map((c: any) => c.title || c.name)
        .filter(Boolean)
      const known_for = topCredits.join('; ') || 'film and television'

      const casting_profile = await generateProfile(detail.name, detail.biography ?? '', known_for)
      await sleep(200)

      const pop = detail.popularity ?? 0
      const { error } = await supabase.from('actors').upsert({
        tmdb_id: String(detail.id),
        name: detail.name,
        headshot_url: detail.profile_path ? `https://image.tmdb.org/t/p/w500${detail.profile_path}` : '',
        popularity: pop,
        cost: popularityToCost(pop),
        gender: genderLabel(detail.gender ?? 0),
        birth_year: detail.birthday ? detail.birthday.slice(0, 4) : '',
        biography: detail.biography ?? '',
        known_for,
        keywords: 'comedy; television',
        casting_profile,
        notes: 'seeded via seed-snl-actors.ts',
      }, { onConflict: 'tmdb_id' })

      if (error) throw new Error(error.message)
      added++
      console.log(`✓ (pop: ${pop.toFixed(1)}, $${popularityToCost(pop)}M)`)

    } catch (err) {
      failed++
      console.log(`✗ ${err instanceof Error ? err.message : err}`)
    }
    await sleep(300)
  }

  console.log(`\nDone. Added: ${added} | Skipped: ${skipped} | Failed: ${failed}`)
}

main().catch(console.error)
