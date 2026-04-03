/**
 * Adds missing cult/character actors — comedy underground, British cult,
 * genre horror, indie drama, TV drama.
 * Run with: npx tsx scripts/seed-cult-actors.ts
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
  // TV drama / prestige
  'Matthew Goode': 5,   // The Good Wife, Watchmen, The Crown
  'Michael Kelly': 4,   // House of Cards, Army of Darkness
  'Tony Curran': 4,     // Doctor Who, Gladiator, Outlaw King
  'Shaun Evans': 3,     // Endeavour
  'Mark Margolis': 3,   // Breaking Bad, Scarface
  // Comedy underground
  'Marc Maron': 5,      // GLOW, Joker, his own show
  'Mark Duplass': 4,    // Togetherness, Safety Not Guaranteed
  'Tim Heidecker': 4,   // Tim and Eric, Us, Ant-Man
  'Eric Wareheim': 4,   // Tim and Eric, Master of None
  'Ilana Glazer': 4,    // Broad City, False Positive
  'Michael Showalter': 3,
  'David Wain': 3,
  'Scott Aukerman': 3,
  'Matt Besser': 3,
  'Todd Barry': 3,
  'Chris Hardwick': 3,
  'H. Jon Benjamin': 4, // Archer, Bob's Burgers — voice legend, rare screen presence
  // British cult
  'Reece Shearsmith': 4, // Inside No. 9, League of Gentlemen, Psychoville
  'Steve Pemberton': 4,  // Inside No. 9, League of Gentlemen
  'Noel Fielding': 4,    // Mighty Boosh, Great British Bake Off
  'Mark Heap': 3,        // Spaced, Green Wing, Friday Night Dinner
  'Kevin Eldon': 3,      // Spaced, IT Crowd, Big Train
  'Julia Davis': 4,      // Nighty Night, Camping, Hunderby
  'Rich Fulcher': 3,     // Mighty Boosh
  // Genre cult / horror
  'Tom Atkins': 3,       // Halloween III, The Fog, Maniac Cop
  'Michael Berryman': 3, // The Hills Have Eyes
  'Larry Fessenden': 3,  // indie horror director/actor
  'Vincent Gallo': 4,    // Buffalo '66, Brown Bunny
}

const RACE_OVERRIDE: Record<string, string> = {
  'Matthew Goode': 'white',
  'Michael Kelly': 'white',
  'Tony Curran': 'white',
  'Shaun Evans': 'white',
  'Mark Margolis': 'white',
  'Marc Maron': 'white',
  'Mark Duplass': 'white',
  'Tim Heidecker': 'white',
  'Eric Wareheim': 'white',
  'Ilana Glazer': 'white',
  'Michael Showalter': 'white',
  'David Wain': 'white',
  'Scott Aukerman': 'white',
  'Matt Besser': 'white',
  'Todd Barry': 'white',
  'Chris Hardwick': 'white',
  'H. Jon Benjamin': 'white',
  'Reece Shearsmith': 'white',
  'Steve Pemberton': 'white',
  'Noel Fielding': 'white',
  'Mark Heap': 'white',
  'Kevin Eldon': 'white',
  'Julia Davis': 'white',
  'Rich Fulcher': 'white',
  'Tom Atkins': 'white',
  'Michael Berryman': 'white',
  'Larry Fessenden': 'white',
  'Vincent Gallo': 'white',
}

const ACTORS = [
  // That Guy / TV drama
  'Mark Margolis', 'Michael Kelly', 'Matthew Goode', 'Tony Curran', 'Shaun Evans',
  // Comedy underground
  'Marc Maron', 'Tim Heidecker', 'Eric Wareheim', 'Mark Duplass',
  'Ilana Glazer', 'Michael Showalter', 'David Wain', 'Scott Aukerman',
  'Matt Besser', 'Todd Barry', 'Chris Hardwick', 'H. Jon Benjamin',
  // British cult
  'Reece Shearsmith', 'Steve Pemberton', 'Noel Fielding', 'Mark Heap',
  'Kevin Eldon', 'Julia Davis', 'Rich Fulcher',
  // Genre cult / horror
  'Tom Atkins', 'Michael Berryman', 'Larry Fessenden', 'Vincent Gallo',
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
      content: `You are a Hollywood casting database editor. Generate a casting profile for ${name}.

Known for: ${knownFor || 'cult television and film'}
Bio: ${bio?.slice(0, 300) || 'No bio available'}

Return ONLY this JSON (no markdown):
{
  "biography": "2-3 sentence factual bio focused on career",
  "keywords": "comedy; drama; [genres]; [medium]",
  "archetype": "one compact phrase",
  "strengths": "3-4 strengths, comma-separated",
  "weaknesses": "1-2 honest limitations, comma-separated",
  "best_cast_as": "role types they suit, comma-separated",
  "signature_quality": "one distinctive quality in 10-15 words",
  "career_stage": "one of: emerging | established | legend",
  "casting_profile": "2-3 sentences a casting director would use"
}`,
    }],
  })

  const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
  const match = text.replace(/```json|```/g, '').trim().match(/\{[\s\S]*\}/)
  if (!match) throw new Error(`No JSON for ${name}`)
  return JSON.parse(match[0])
}

async function main() {
  console.log(`Processing ${ACTORS.length} cult actors...\n`)

  const { data: existing } = await supabase.from('actors').select('name').in('name', ACTORS)
  const existingNames = new Set(existing?.map((a: any) => a.name) ?? [])
  const toProcess = ACTORS.filter(n => !existingNames.has(n))

  if (existingNames.size > 0) {
    console.log(`Already in DB: ${[...existingNames].join(', ')}\n`)
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
      let knownFor = 'cult film and television'

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
            .filter((c: any) => c.vote_count > 30)
            .sort((a: any, b: any) => b.popularity - a.popularity)
            .slice(0, 4).map((c: any) => c.title)
          const tvCredits = (details.tv_credits?.cast ?? [])
            .filter((c: any) => c.vote_count > 20)
            .sort((a: any, b: any) => b.popularity - a.popularity)
            .slice(0, 3).map((c: any) => c.name)
          const credits = [...movieCredits, ...tvCredits].slice(0, 5)
          if (credits.length > 0) knownFor = credits.join('; ')
        }
      }

      const profile = await generateCastingProfile(name, rawBio, knownFor)
      await sleep(200)

      const cost = COST_OVERRIDE[name] ?? 3
      const race_ethnicity = RACE_OVERRIDE[name] ?? null

      const row: Record<string, any> = {
        name, tmdb_id: tmdbId, headshot_url, popularity, cost, gender, birth_year,
        biography: profile.biography || rawBio.slice(0, 500),
        known_for: knownFor, keywords: profile.keywords, archetype: profile.archetype,
        strengths: profile.strengths, weaknesses: profile.weaknesses,
        best_cast_as: profile.best_cast_as, signature_quality: profile.signature_quality,
        career_stage: profile.career_stage, casting_profile: profile.casting_profile,
        race_ethnicity, deep_dive_date: new Date().toISOString().slice(0, 10),
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
