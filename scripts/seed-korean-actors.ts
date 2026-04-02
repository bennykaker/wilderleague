/**
 * Fetches ~50 prominent Korean actors from TMDB by name, enriches them,
 * and upserts into the actors table.
 *
 * Run with: npx tsx scripts/seed-korean-actors.ts
 * Safe to re-run — upserts on tmdb_id.
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

// ~150 Korean actors — film legends, drama leads, rising stars, K-pop crossovers, character actors
const KOREAN_ACTORS = [
  // Global crossover — Squid Game / Parasite generation
  'Lee Jung-jae', 'Park Hae-soo', 'Wi Ha-jun', 'Jung Ho-yeon', 'O Yeong-su',
  'Song Kang-ho', 'Cho Yeo-jeong', 'Lee Sun-kyun', 'Choi Woo-shik', 'Park So-dam',

  // Film powerhouses
  'Lee Byung-hun', 'Choi Min-sik', 'Ma Dong-seok', 'Ha Jung-woo', 'Hwang Jung-min',
  'Sol Kyung-gu', 'Cho Seung-woo', 'Kim Yoon-seok', 'Yoo Ah-in', 'Ahn Sung-ki',
  'Choi Bool-am', 'Kim Myung-min', 'Ryu Seung-ryong', 'Oh Dal-su', 'Cho Jin-woong',
  'Lee Sung-min', 'Kim Sang-kyung', 'Jung Woo-sung', 'Zo In-sung', 'Jang Dong-gun',

  // Top drama leads (male)
  'Lee Min-ho', 'Hyun Bin', 'Gong Yoo', 'Kim Soo-hyun', 'Park Seo-joon',
  'Lee Jong-suk', 'Ji Chang-wook', 'Song Joong-ki', 'Nam Joo-hyuk', 'Park Hyung-sik',
  'Lee Joon-gi', 'Yoo Seung-ho', 'Seo In-guk', 'Kim Woo-bin', 'Park Bo-gum',
  'Ahn Hyo-seop', 'Song Kang', 'Rowoon', 'Jang Ki-yong', 'Lee Do-hyun',
  'Woo Do-hwan', 'Chae Jong-hyeop', 'Kim Jung-hyun', 'Lee Jae-wook', 'Kim Min-jae',
  'Yeon Woo-jin', 'Park Hae-jin', 'Lee Joon', 'Uhm Ki-joon', 'Kim Jae-wook',

  // Top drama leads (female)
  'Song Hye-kyo', 'Jun Ji-hyun', 'IU', 'Park Shin-hye', 'Bae Suzy',
  'Han Hyo-joo', 'Park Bo-young', 'Kim Go-eun', 'Shin Min-a', 'Yoona',
  'Moon Chae-won', 'Kim Tae-ri', 'Han So-hee', 'Go Youn-jung', 'Kim Hye-jun',
  'Seo Ye-ji', 'Kim Da-mi', 'Jeon Jong-seo', 'Oh Yeon-seo', 'Lee Ji-ah',
  'Seo Hyun-jin', 'Kim Ji-won', 'Shin Hye-sun', 'Lee Se-young', 'Park Min-young',
  'Yoo In-na', 'Gong Hyo-jin', 'Ha Ji-won', 'Hwang Jung-eum', 'Lee Yo-won',
  'Kim Sun-ah', 'Uhm Jung-hwa', 'Jeon Do-yeon', 'Kim Hye-soo', 'Go Hyun-jung',

  // K-pop crossover (actors with serious screen work)
  'D.O.', 'Choi Min-ho', 'Im Siwan', 'L', 'Jisoo',
  'Park Hyungsik', 'Kim Soo-hyun', 'Cha Eun-woo', 'Kang Daniel', 'SF9 Rowoon',

  // Character actors / scene-stealers
  'Kim Sung-kyun', 'Park Sung-woong', 'Kim Young-kwang', 'Nana', 'Lee El',
  'Kim Shin-rok', 'Park Ju-hyun', 'Yang Hye-ji', 'Go Kyung-pyo', 'Park Ji-hwan',
  'Kim Dae-myung', 'Ryu Jun-yeol', 'Go Ah-sung', 'Park Hae-il', 'Moon Sung-geun',

  // Veteran prestige
  'Na Moon-hee', 'Kim Young-ok', 'Park In-hwan', 'Lee Soon-jae', 'Shin Goo',
  'Kim Hae-sook', 'Youn Yuh-jung', 'Kim Ja-ok', 'Lee Mi-sook', 'Cha Hwa-yeon',

  // Rising generation
  'Kang Tae-oh', 'Wi Ha-jun', 'Chae Soo-bin', 'Kim Hyang-gi', 'Jo Bo-ah',
  'Hong Ye-ji', 'Kim Ye-won', 'Jung Eun-ji', 'Lee Sung-kyung', 'Kim Sejeong',
  'Park Eun-bin', 'Bona', 'Lomon', 'Hyeri', 'Minah',
]

async function searchTmdb(name: string): Promise<any | null> {
  const encoded = encodeURIComponent(name)
  const res = await fetch(
    `https://api.themoviedb.org/3/search/person?query=${encoded}&include_adult=false`,
    { headers: { Authorization: `Bearer ${TMDB_KEY}`, accept: 'application/json' } }
  )
  if (!res.ok) return null
  const data = await res.json() as any
  // Return the first result that looks like a match (Korean names can vary in romanisation)
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

async function generateCastingProfile(actor: { name: string; biography: string; known_for: string }): Promise<string> {
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: `You are Marlowe, a veteran Hollywood casting director. Write a 2-3 sentence casting profile for ${actor.name}. Focus on their screen presence, range, what roles they excel at, and what makes them distinctive. Be specific. Known for: ${actor.known_for}. Bio: ${actor.biography.slice(0, 300)}`,
    }],
  })
  return msg.content[0].type === 'text' ? msg.content[0].text.trim() : ''
}

async function main() {
  console.log(`Fetching ${KOREAN_ACTORS.length} Korean actors from TMDB...\n`)

  let done = 0
  let failed = 0
  let skipped = 0

  for (const name of KOREAN_ACTORS) {
    try {
      process.stdout.write(`${name}... `)

      // Check if already in DB
      const { data: existing } = await supabase
        .from('actors')
        .select('name')
        .ilike('name', name)
        .single()

      if (existing) {
        console.log('already exists, skipping')
        skipped++
        await sleep(100)
        continue
      }

      // Search TMDB
      const result = await searchTmdb(name)
      if (!result) {
        console.log('✗ not found on TMDB')
        failed++
        await sleep(300)
        continue
      }

      await sleep(260)

      // Fetch full detail
      const detail = await fetchTmdbDetail(result.id)
      if (!detail) {
        console.log('✗ detail fetch failed')
        failed++
        await sleep(300)
        continue
      }

      await sleep(260)

      // Build known_for from top credits
      const credits = (detail.combined_credits?.cast ?? []) as any[]
      const topCredits = credits
        .filter((c: any) => c.vote_count > 100)
        .sort((a: any, b: any) => b.popularity - a.popularity)
        .slice(0, 6)
        .map((c: any) => c.title || c.name)
        .filter(Boolean)
      const known_for = topCredits.join('; ')

      // Build keywords
      const keywords = ['drama', 'korean cinema', detail.gender === 1 ? 'korean actress' : 'korean actor'].join('; ')

      // Headshot
      const headshot_url = detail.profile_path
        ? `https://image.tmdb.org/t/p/w500${detail.profile_path}`
        : ''

      // Birth year
      const birth_year = detail.birthday ? detail.birthday.slice(0, 4) : ''

      // Cost
      const pop = detail.popularity ?? 0
      const cost = popularityToCost(pop)

      // Casting profile
      const casting_profile = await generateCastingProfile({
        name: detail.name,
        biography: detail.biography ?? '',
        known_for,
      })

      await sleep(200)

      const row = {
        tmdb_id: String(detail.id),
        name: detail.name,
        headshot_url,
        popularity: pop,
        cost,
        gender: genderLabel(detail.gender ?? 0),
        birth_year,
        biography: detail.biography ?? '',
        known_for,
        keywords,
        notes: 'Korean actor — seeded via seed-korean-actors.ts',
        casting_profile,
        race_ethnicity: 'asian',
        nationality: 'Korean',
      }

      const { error } = await supabase
        .from('actors')
        .upsert(row, { onConflict: 'tmdb_id' })

      if (error) throw new Error(error.message)

      done++
      console.log(`✓ (pop: ${pop.toFixed(1)}, $${cost}M)`)

    } catch (err) {
      failed++
      console.log(`✗ ${err instanceof Error ? err.message : err}`)
    }

    await sleep(300)
  }

  console.log(`\nDone. Added: ${done}, skipped (already existed): ${skipped}, failed: ${failed}`)
}

main().catch(console.error)
