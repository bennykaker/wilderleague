/**
 * Adds a curated list of stand-up comedians to the actor pool.
 * Fetches TMDB data, then uses Claude Haiku to generate casting profiles.
 * Run with: npx tsx scripts/seed-comedians.ts
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

// Manual cost overrides for comedians whose TMDB popularity undersells them
const COST_OVERRIDE: Record<string, number> = {
  'Dave Chappelle': 10,
  'Eddie Murphy': 12,
  'Chris Rock': 10,
  'Kevin Hart': 12,
  'Jerry Seinfeld': 10,
  'Steve Martin': 10,
  'Bill Burr': 6,
  'John Mulaney': 5,
  'Nate Bargatze': 4,
  'Jim Jefferies': 4,
  'Gary Gulman': 3,
  'Nikki Glaser': 4,
  'Taylor Tomlinson': 4,
  'Shane Gillis': 4,
  'Matt Rife': 4,
  'Sebastian Maniscalco': 5,
  'Bert Kreischer': 5,
  'Tom Segura': 5,
  'Mark Normand': 3,
  'Anthony Jeselnik': 4,
  'Patton Oswalt': 5,
  'Maria Bamford': 3,
  'Neal Brennan': 3,
  'Colin Quinn': 3,
  'Mike Birbiglia': 4,
  'Hannah Gadsby': 4,
  'Bo Burnham': 6,
  'Hasan Minhaj': 5,
  'Jerrod Carmichael': 5,
  'Sam Morril': 3,
  'Julio Torres': 4,
  'Ramy Youssef': 4,
  'Chris Distefano': 3,
  'Andrew Schulz': 5,
  'Stavros Halkias': 3,
  'Tim Dillon': 3,
  'Matteo Lane': 3,
  'Langston Kerman': 3,
  'Dulcé Sloan': 3,
  'Ali Wong': 6,
  'Liza Treyger': 3,
  'Phoebe Robinson': 3,
  'Gina Yashere': 3,
  'Wanda Sykes': 6,
  'Lewis Black': 4,
  'Jim Gaffigan': 5,
  'Russell Brand': 6,
  'Demetri Martin': 3,
  'Kathleen Madigan': 3,
}

// Manual race/ethnicity for comedians — avoids waiting for enrich-race
const RACE_OVERRIDE: Record<string, string> = {
  'Dave Chappelle': 'black',
  'Eddie Murphy': 'black',
  'Chris Rock': 'black',
  'Kevin Hart': 'black',
  'Wanda Sykes': 'black',
  'Phoebe Robinson': 'black',
  'Langston Kerman': 'black',
  'Dulcé Sloan': 'black',
  'Gina Yashere': 'black',
  'Jerrod Carmichael': 'black',
  'Neal Brennan': 'white',
  'Bill Burr': 'white',
  'John Mulaney': 'white',
  'Nate Bargatze': 'white',
  'Jim Jefferies': 'white',
  'Gary Gulman': 'white',
  'Nikki Glaser': 'white',
  'Taylor Tomlinson': 'white',
  'Shane Gillis': 'white',
  'Matt Rife': 'white',
  'Sebastian Maniscalco': 'white',
  'Bert Kreischer': 'white',
  'Tom Segura': 'latino',
  'Mark Normand': 'white',
  'Anthony Jeselnik': 'white',
  'Patton Oswalt': 'white',
  'Maria Bamford': 'white',
  'Colin Quinn': 'white',
  'Mike Birbiglia': 'white',
  'Hannah Gadsby': 'white',
  'Bo Burnham': 'white',
  'Hasan Minhaj': 'south_asian',
  'Sam Morril': 'white',
  'Julio Torres': 'latino',
  'Ramy Youssef': 'middle_eastern',
  'Chris Distefano': 'white',
  'Andrew Schulz': 'white',
  'Stavros Halkias': 'white',
  'Tim Dillon': 'white',
  'Matteo Lane': 'white',
  'Liza Treyger': 'white',
  'Ali Wong': 'asian',
  'Jerry Seinfeld': 'white',
  'Steve Martin': 'white',
  'Lewis Black': 'white',
  'Jim Gaffigan': 'white',
  'Russell Brand': 'white',
  'Demetri Martin': 'white',
  'Kathleen Madigan': 'white',
}

const COMEDIANS = [
  'Dave Chappelle', 'Bill Burr', 'John Mulaney', 'Nate Bargatze', 'Jim Jefferies',
  'Gary Gulman', 'Nikki Glaser', 'Taylor Tomlinson', 'Shane Gillis', 'Matt Rife',
  'Sebastian Maniscalco', 'Bert Kreischer', 'Tom Segura', 'Mark Normand', 'Anthony Jeselnik',
  'Patton Oswalt', 'Maria Bamford', 'Neal Brennan', 'Colin Quinn',
  'Mike Birbiglia', 'Hannah Gadsby', 'Bo Burnham', 'Hasan Minhaj', 'Jerrod Carmichael',
  'Sam Morril', 'Julio Torres', 'Ramy Youssef', 'Chris Distefano', 'Andrew Schulz',
  'Stavros Halkias', 'Tim Dillon', 'Matteo Lane', 'Langston Kerman', 'Dulcé Sloan',
  'Ali Wong', 'Liza Treyger', 'Phoebe Robinson', 'Gina Yashere', 'Wanda Sykes',
  'Jerry Seinfeld', 'Steve Martin', 'Eddie Murphy', 'Chris Rock', 'Kevin Hart',
  'Lewis Black', 'Jim Gaffigan', 'Russell Brand', 'Demetri Martin', 'Kathleen Madigan',
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
  const result = data?.results?.[0]
  if (!result) return null
  return result
}

async function getActorDetails(tmdbId: number) {
  return tmdbGet(`/person/${tmdbId}?language=en-US&append_to_response=movie_credits,tv_credits`)
}

async function generateCastingProfile(name: string, bio: string, knownFor: string): Promise<{
  biography: string
  keywords: string
  archetype: string
  strengths: string
  weaknesses: string
  best_cast_as: string
  signature_quality: string
  career_stage: string
  casting_profile: string
}> {
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 800,
    messages: [{
      role: 'user',
      content: `You are a Hollywood casting database editor. Generate a casting profile for the comedian/actor ${name}.

Known for: ${knownFor || 'stand-up comedy'}
Bio snippet: ${bio?.slice(0, 300) || 'No bio available'}

Return ONLY this JSON (no markdown):
{
  "biography": "2-3 sentence factual bio focused on acting/performing career",
  "keywords": "comedy; drama; [other genres]; [background e.g. stand-up]",
  "archetype": "e.g. 'sardonic everyman' or 'motor-mouthed wildcard'",
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
  console.log(`Processing ${COMEDIANS.length} comedians...\n`)

  // Check which already exist
  const { data: existing } = await supabase.from('actors').select('name').in('name', COMEDIANS)
  const existingNames = new Set(existing?.map((a: any) => a.name) ?? [])
  const toProcess = COMEDIANS.filter(n => !existingNames.has(n))

  if (existingNames.size > 0) {
    console.log(`Already in DB (skipping): ${[...existingNames].join(', ')}\n`)
  }
  console.log(`Adding: ${toProcess.length} comedians\n`)

  let added = 0
  let failed = 0

  for (const name of toProcess) {
    try {
      // 1. Search TMDB
      const searchResult = await searchActor(name)
      await sleep(260)

      let tmdbId: string | null = null
      let headshot_url = ''
      let popularity = 1
      let gender = ''
      let birth_year = ''
      let rawBio = ''
      let knownFor = 'stand-up comedy'

      if (searchResult) {
        tmdbId = String(searchResult.id)
        headshot_url = searchResult.profile_path
          ? `https://image.tmdb.org/t/p/w500${searchResult.profile_path}`
          : ''
        popularity = searchResult.popularity ?? 1
        gender = searchResult.gender === 1 ? 'female' : searchResult.gender === 2 ? 'male' : ''

        // Get full details
        const details = await getActorDetails(searchResult.id)
        await sleep(260)

        if (details) {
          rawBio = details.biography ?? ''
          birth_year = details.birthday?.split('-')[0] ?? ''

          // Build known_for from top credits
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

      // 2. Generate casting profile via Claude
      const profile = await generateCastingProfile(name, rawBio, knownFor)
      await sleep(200)

      // 3. Upsert to Supabase
      const cost = COST_OVERRIDE[name] ?? Math.max(3, Math.min(8, Math.round(popularity / 3)))
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

      // Use tmdb_id conflict resolution when available, otherwise plain insert
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
