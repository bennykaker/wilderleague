/**
 * Adds missing TV actors to the actor pool.
 * Covers: New Girl, Better Call Saul, Always Sunny, Atlanta, Ted Lasso,
 * Modern Family, What We Do in the Shadows, Abbott Elementary, The Bear,
 * Yellowstone, Girls, OITNB, House of the Dragon, White Lotus, etc.
 *
 * Run with: npx tsx scripts/seed-tv-actors.ts
 */

import fs from 'fs'
import path from 'path'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([^=]+)=(.*)$/)
    if (m) process.env[m[1].trim()] = m[2].trim()
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const TMDB_TOKEN = process.env.TMDB_API_KEY!

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

const COST_OVERRIDE: Record<string, number> = {
  // New Girl
  'Jake Johnson': 4,
  'Lamorne Morris': 3,
  'Hannah Simone': 3,
  // Better Call Saul
  'Rhea Seehorn': 5,
  // Always Sunny
  'Rob McElhenney': 5,
  // Atlanta
  'Lakeith Stanfield': 5,
  // Ted Lasso
  'Hannah Waddingham': 6,
  // Modern Family
  'Sofia Vergara': 10,
  'Jesse Tyler Ferguson': 5,
  // What We Do in the Shadows
  'Matt Berry': 4,
  'Natasia Demetriou': 3,
  'Harvey Guillen': 3,
  'Kayvan Novak': 4,
  // Abbott Elementary
  'Quinta Brunson': 5,
  'Tyler James Williams': 4,
  'Janelle James': 3,
  // The Bear
  'Ayo Edebiri': 5,
  // Severance
  'Tramell Tillman': 3,
  // Girls
  'Lena Dunham': 4,
  'Jemima Kirke': 3,
  'Zosia Mamet': 3,
  // Yellowstone
  'Luke Grimes': 4,
  // Billions / various
  'Asia Kate Dillon': 3,
  // Euphoria / films
  'Maude Apatow': 3,
  // White Lotus
  'Murray Bartlett': 4,
  // OITNB
  'Taylor Schilling': 5,
  'Uzo Aduba': 6,
  'Laverne Cox': 5,
  'Dascha Polanco': 3,
  // Succession
  'Dagmara Domińczyk': 3,
  // House of the Dragon / The Crown
  'Matt Smith': 6,
  // Andor
  'Genevieve O\'Reilly': 3,
  // I May Destroy You
  'Michaela Coel': 6,
  // Reservation Dogs
  "D'Pharaoh Woon-A-Tai": 3,
}

const RACE_OVERRIDE: Record<string, string> = {
  'Jake Johnson': 'white',
  'Lamorne Morris': 'black',
  'Hannah Simone': 'south_asian',
  'Rhea Seehorn': 'white',
  'Rob McElhenney': 'white',
  'Lakeith Stanfield': 'black',
  'Hannah Waddingham': 'white',
  'Sofia Vergara': 'latina',
  'Jesse Tyler Ferguson': 'white',
  'Matt Berry': 'white',
  'Natasia Demetriou': 'white',
  'Harvey Guillen': 'latino',
  'Kayvan Novak': 'middle_eastern',
  'Quinta Brunson': 'black',
  'Tyler James Williams': 'black',
  'Janelle James': 'black',
  'Ayo Edebiri': 'black',
  'Tramell Tillman': 'black',
  'Lena Dunham': 'white',
  'Jemima Kirke': 'white',
  'Zosia Mamet': 'white',
  'Luke Grimes': 'white',
  'Asia Kate Dillon': 'white',
  'Maude Apatow': 'white',
  'Murray Bartlett': 'white',
  'Taylor Schilling': 'white',
  'Uzo Aduba': 'black',
  'Laverne Cox': 'black',
  'Dascha Polanco': 'latina',
  'Dagmara Domińczyk': 'white',
  'Matt Smith': 'white',
  "Genevieve O'Reilly": 'white',
  'Michaela Coel': 'black',
  "D'Pharaoh Woon-A-Tai": 'indigenous',
}

const TV_ACTORS = [
  // New Girl
  'Jake Johnson', 'Lamorne Morris', 'Hannah Simone',
  // Better Call Saul
  'Rhea Seehorn',
  // It's Always Sunny in Philadelphia
  'Rob McElhenney',
  // Atlanta
  'Lakeith Stanfield',
  // Ted Lasso
  'Hannah Waddingham',
  // Modern Family
  'Sofia Vergara', 'Jesse Tyler Ferguson',
  // What We Do in the Shadows (TV)
  'Matt Berry', 'Natasia Demetriou', 'Harvey Guillen', 'Kayvan Novak',
  // Abbott Elementary
  'Quinta Brunson', 'Tyler James Williams', 'Janelle James',
  // The Bear
  'Ayo Edebiri',
  // Severance
  'Tramell Tillman',
  // Girls
  'Lena Dunham', 'Jemima Kirke', 'Zosia Mamet',
  // Yellowstone
  'Luke Grimes',
  // Billions
  'Asia Kate Dillon',
  // Euphoria / films
  'Maude Apatow',
  // The White Lotus
  'Murray Bartlett',
  // Orange Is the New Black
  'Taylor Schilling', 'Uzo Aduba', 'Laverne Cox', 'Dascha Polanco',
  // Succession
  'Dagmara Domińczyk',
  // House of the Dragon / Doctor Who / The Crown
  'Matt Smith',
  // Andor / Star Wars
  "Genevieve O'Reilly",
  // I May Destroy You
  'Michaela Coel',
  // Reservation Dogs
  "D'Pharaoh Woon-A-Tai",
]

async function tmdbGet(endpoint: string) {
  const res = await fetch(`https://api.themoviedb.org/3${endpoint}`, {
    headers: { Authorization: `Bearer ${TMDB_TOKEN}`, accept: 'application/json' },
  })
  if (!res.ok) return null
  return res.json() as Promise<any>
}

async function searchActor(name: string) {
  const data = await tmdbGet(`/search/person?query=${encodeURIComponent(name)}&language=en-US`)
  return data?.results?.[0] ?? null
}

async function getActorDetails(tmdbId: number) {
  return tmdbGet(`/person/${tmdbId}?language=en-US&append_to_response=movie_credits,tv_credits`)
}

async function generateCastingProfile(name: string, bio: string, knownFor: string) {
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 800,
    messages: [{
      role: 'user',
      content: `You are a Hollywood casting database editor. Generate a casting profile for the actor ${name}.

Known for: ${knownFor || 'television'}
Bio snippet: ${bio?.slice(0, 300) || 'No bio available'}

Return ONLY this JSON (no markdown):
{
  "biography": "2-3 sentence factual bio focused on acting career",
  "keywords": "comedy; drama; [other genres]; [background e.g. television]",
  "archetype": "e.g. 'sardonic everyman' or 'dry comic authority figure'",
  "strengths": "3-4 acting strengths, comma-separated",
  "weaknesses": "1-2 honest limitations, comma-separated",
  "best_cast_as": "types of roles they suit, comma-separated",
  "signature_quality": "one distinctive quality in 10-15 words",
  "career_stage": "one of: emerging | established | legend",
  "casting_profile": "2-3 sentences a casting director would use — what makes them castable, what risks exist, what kind of director should use them"
}`,
    }],
  })

  const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
  const match = text.replace(/```json|```/g, '').trim().match(/\{[\s\S]*\}/)
  if (!match) throw new Error(`No JSON for ${name}: ${text.slice(0, 80)}`)
  return JSON.parse(match[0])
}

async function main() {
  console.log(`Processing ${TV_ACTORS.length} TV actors...\n`)

  const { data: existing } = await supabase.from('actors').select('name').in('name', TV_ACTORS)
  const existingNames = new Set(existing?.map((a: any) => a.name) ?? [])
  const toProcess = TV_ACTORS.filter(n => !existingNames.has(n))

  if (existingNames.size > 0) {
    console.log(`Already in DB (skipping): ${[...existingNames].join(', ')}\n`)
  }
  console.log(`Adding: ${toProcess.length} actors\n`)

  let added = 0
  let failed = 0

  for (const name of toProcess) {
    try {
      const searchResult = await searchActor(name)
      await sleep(260)

      let tmdbId: string | null = null
      let headshot_url = ''
      let popularity = 1
      let gender = ''
      let birth_year = ''
      let rawBio = ''
      let knownFor = 'television'

      if (searchResult) {
        tmdbId = String(searchResult.id)
        headshot_url = searchResult.profile_path
          ? `https://image.tmdb.org/t/p/w500${searchResult.profile_path}`
          : ''
        popularity = searchResult.popularity ?? 1
        gender = searchResult.gender === 1 ? 'female' : searchResult.gender === 2 ? 'male' : ''

        const details = await getActorDetails(searchResult.id)
        await sleep(260)

        if (details) {
          rawBio = details.biography ?? ''
          birth_year = details.birthday?.split('-')[0] ?? ''

          const movieCredits = (details.movie_credits?.cast ?? [])
            .filter((c: any) => c.vote_count > 100)
            .sort((a: any, b: any) => b.popularity - a.popularity)
            .slice(0, 4)
            .map((c: any) => c.title)

          const tvCredits = (details.tv_credits?.cast ?? [])
            .filter((c: any) => c.vote_count > 50)
            .sort((a: any, b: any) => b.popularity - a.popularity)
            .slice(0, 3)
            .map((c: any) => c.name)

          const credits = [...movieCredits, ...tvCredits].slice(0, 5)
          if (credits.length > 0) knownFor = credits.join('; ')
        }
      }

      const profile = await generateCastingProfile(name, rawBio, knownFor)
      await sleep(200)

      const cost = COST_OVERRIDE[name] ?? Math.max(3, Math.min(7, Math.round(popularity / 3)))
      const race_ethnicity = RACE_OVERRIDE[name] ?? null

      const row: Record<string, any> = {
        name,
        tmdb_id: tmdbId,
        headshot_url,
        popularity,
        cost,
        gender,
        birth_year,
        biography: profile.biography || rawBio.slice(0, 500),
        known_for: knownFor,
        keywords: profile.keywords,
        archetype: profile.archetype,
        strengths: profile.strengths,
        weaknesses: profile.weaknesses,
        best_cast_as: profile.best_cast_as,
        signature_quality: profile.signature_quality,
        career_stage: profile.career_stage,
        casting_profile: profile.casting_profile,
        race_ethnicity,
        deep_dive_date: new Date().toISOString().slice(0, 10),
        salary_confirmed: false,
      }

      const { error } = tmdbId
        ? await supabase.from('actors').upsert(row, { onConflict: 'tmdb_id' })
        : await supabase.from('actors').insert(row)
      if (error) throw new Error(error.message)

      console.log(`✓ ${name} (cost: $${cost}M, tmdb: ${tmdbId ?? 'not found'})`)
      added++
    } catch (err) {
      console.error(`✗ ${name}: ${err instanceof Error ? err.message : err}`)
      failed++
    }

    await sleep(300)
  }

  console.log(`\nDone. ${added} added, ${failed} failed.`)
}

main().catch(console.error)
