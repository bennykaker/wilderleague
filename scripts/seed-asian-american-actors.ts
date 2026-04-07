/**
 * Seeds Asian and Asian-American actors into the actors table.
 * Skips anyone already in the DB. Safe to re-run.
 * Run with: npx tsx scripts/seed-asian-american-actors.ts
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
  if (pop >= 20) return 12
  if (pop >= 15) return 10
  if (pop >= 12) return 8
  if (pop >= 10) return 6
  if (pop >= 6) return 4
  return 3
}

function genderLabel(g: number): string {
  if (g === 1) return 'female'
  if (g === 2) return 'male'
  return ''
}

const ACTORS = [
  // Asian-American men
  'Steven Yeun', 'Simu Liu', 'Manny Jacinto', 'Daniel Dae Kim', 'John Cho',
  'Ken Jeong', 'Randall Park', 'Jimmy O. Yang', 'Lewis Tan', 'Nico Santos',
  'Sung Kang', 'Rick Yune', 'B.D. Wong', 'Will Yun Lee', 'Leonardo Nam',
  'Aaron Yoo', 'James Kyson', 'Tim Chiou', 'Charles Melton', 'Ross Butler',
  'Jake Choi', 'Osric Chau', 'Ki Hong Lee', 'Christopher Sean', 'Alex Landi',
  'Remy Hii', 'Godfrey Gao', 'Chris Pang', 'Pierre Png', 'Ronny Chieng',
  'Hasan Minhaj',

  // Asian-American women
  'Ali Wong', 'Awkwafina', 'Constance Wu', 'Gemma Chan', 'Michelle Yeoh',
  'Lucy Liu', 'Sandra Oh', 'Chloe Bennet', 'Lana Condor', 'Olivia Munn',
  'Jamie Chung', 'Brenda Song', 'Karen Fukuhara', 'Suzy Nakamura',
  'Pom Klementieff', 'Anna Sawai', 'Naomi Matsuda', 'Yuki Morita',
  'Keiko Agena', 'Grace Park', 'Tamlyn Tomita', 'Ming-Na Wen', 'Joan Chen',

  // Asian-American supporting/character actors
  'Archie Kao', 'Tim Kang', 'Reggie Lee', 'Chin Han', 'Byron Mann',
  'Tzi Ma', 'Cary-Hiroyuki Tagawa', 'Russell Wong',

  // Hong Kong / Chinese cinema
  'Jet Li', 'Jackie Chan', 'Donnie Yen', 'Tony Leung', 'Andy Lau',
  'Chow Yun-fat', 'Daniel Wu', 'Shawn Yue', 'Edison Chen', 'Nicholas Tse',
  'Aaron Kwok',

  // South Asian men
  'Dev Patel', 'Riz Ahmed', 'Kunal Nayyar', 'Sendhil Ramamurthy',
  'Naveen Andrews', 'Irrfan Khan', 'Adil Hussain', 'Rahul Kohli',
  'Nikesh Patel', 'Himesh Patel', 'Rish Shah', 'Maulik Pancholy',
  'Utkarsh Ambudkar', 'Karan Soni', 'Danny Pudi', 'Parvesh Cheena',
  'Suraj Sharma', 'Tiger Shroff', 'Aditya Roy Kapur', 'Farhan Akhtar',
  'John Abraham', 'Hrithik Roshan',
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

async function fetchTmdbDetail(tmdbId: number): Promise<any | null> {
  const res = await fetch(
    `https://api.themoviedb.org/3/person/${tmdbId}?append_to_response=combined_credits`,
    { headers: { Authorization: `Bearer ${TMDB_KEY}`, accept: 'application/json' } }
  )
  if (!res.ok) return null
  return res.json()
}

async function generateCastingProfile(name: string, biography: string, known_for: string): Promise<string> {
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: `You are Marlowe, a veteran Hollywood casting director. Write a 2-3 sentence casting profile for ${name}. Focus on screen presence, range, what roles they excel at, and what makes them distinctive. Be specific and honest. Known for: ${known_for}. Bio: ${biography.slice(0, 300)}`,
    }],
  })
  return msg.content[0].type === 'text' ? msg.content[0].text.trim() : ''
}

async function main() {
  console.log(`Processing ${ACTORS.length} actors...\n`)
  let added = 0, skipped = 0, failed = 0

  for (const name of ACTORS) {
    try {
      process.stdout.write(`${name}... `)

      // Skip if already in DB
      const { data: existing } = await supabase
        .from('actors').select('name').ilike('name', name).single()
      if (existing) {
        console.log('already exists')
        skipped++
        await sleep(100)
        continue
      }

      const result = await searchTmdb(name)
      if (!result) {
        console.log('✗ not found on TMDB')
        failed++
        await sleep(300)
        continue
      }

      await sleep(260)

      const detail = await fetchTmdbDetail(result.id)
      if (!detail) {
        console.log('✗ detail fetch failed')
        failed++
        await sleep(300)
        continue
      }

      await sleep(260)

      const credits = (detail.combined_credits?.cast ?? []) as any[]
      const topCredits = credits
        .filter((c: any) => c.vote_count > 50)
        .sort((a: any, b: any) => b.popularity - a.popularity)
        .slice(0, 6)
        .map((c: any) => c.title || c.name)
        .filter(Boolean)
      const known_for = topCredits.join('; ') || 'film and television'

      const casting_profile = await generateCastingProfile(
        detail.name,
        detail.biography ?? '',
        known_for,
      )

      await sleep(200)

      const pop = detail.popularity ?? 0
      const cost = popularityToCost(pop)

      const row = {
        tmdb_id: String(detail.id),
        name: detail.name,
        headshot_url: detail.profile_path ? `https://image.tmdb.org/t/p/w500${detail.profile_path}` : '',
        popularity: pop,
        cost,
        gender: genderLabel(detail.gender ?? 0),
        birth_year: detail.birthday ? detail.birthday.slice(0, 4) : '',
        biography: detail.biography ?? '',
        known_for,
        keywords: 'asian; asian-american',
        casting_profile,
        race_ethnicity: 'asian',
        notes: 'seeded via seed-asian-american-actors.ts',
      }

      const { error } = await supabase.from('actors').upsert(row, { onConflict: 'tmdb_id' })
      if (error) throw new Error(error.message)

      added++
      console.log(`✓ (pop: ${pop.toFixed(1)}, $${cost}M)`)

    } catch (err) {
      failed++
      console.log(`✗ ${err instanceof Error ? err.message : err}`)
    }

    await sleep(300)
  }

  console.log(`\nDone. Added: ${added} | Skipped: ${skipped} | Failed: ${failed}`)
}

main().catch(console.error)
