/**
 * Second wave of TV comedy actors — fills gaps from the comprehensive list.
 * Run with: npx tsx scripts/seed-tv-actors-2.ts
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
  // Ted Lasso
  'Nick Mohammed': 4,
  // British
  'Steve Coogan': 7,
  'Simon Pegg': 6,
  'Stephen Fry': 6,
  'Dawn French': 5,
  'Joanna Lumley': 5,
  'Miranda Hart': 5,
  'Sharon Horgan': 5,
  'David Mitchell': 4,
  'Robert Webb': 3,
  'Lucy Davis': 4,
  'Mackenzie Crook': 4,
  'Jessica Hynes': 3,
  'Lee Mack': 4,
  'Aisling Bea': 4,
  // Comedy icons
  'Martin Short': 6,
  'Zach Galifianakis': 7,
  'Cedric the Entertainer': 5,
  'Marlon Wayans': 5,
  'Damon Wayans Sr': 5,
  'Niecy Nash': 5,
  'Jon Cryer': 5,
  'Cobie Smulders': 5,
  'Sean Hayes': 5,
  'Chris O\'Dowd': 5,
  'Kenan Thompson': 5,
  'Phylicia Rashad': 5,
  'Wayne Brady': 4,
  'Brandy Norwood': 4,
  'Fred Armisen': 4,
  'Alfonso Ribeiro': 4,
  'Ed Helms': 5,  // may already be in
  'Josh Radnor': 4,
  'Malcolm-Jamal Warner': 4,
  'Damon Wayans Jr': 4,
  'Michael Che': 4,
  'Kim Fields': 3,
  'David Alan Grier': 4,
  'Jaleel White': 3,
  'Erika Alexander': 3,
  'T.C. Carson': 3,
  'Colin Jost': 3,
  'Taran Killam': 3,
  'Bobby Moynihan': 3,
  'Casey Wilson': 3,
  'Oscar Nunez': 3,
  'Kerri Kenney': 3,
  'Michael Ian Black': 3,
  'Robert Ben Garant': 3,
  'Curtis Armstrong': 3,
  'Justin Berfield': 3,
  'Daphne Maxwell Reid': 3,
  'Karyn Parsons': 3,
  'Keshia Knight Pulliam': 3,
  'Tempestt Bledsoe': 3,
  'Tommy Davidson': 3,
  'Shawn Wayans': 4,
  'Tim Allen': 5,
}

const RACE_OVERRIDE: Record<string, string> = {
  'Nick Mohammed': 'south_asian',
  'Steve Coogan': 'white',
  'Simon Pegg': 'white',
  'Stephen Fry': 'white',
  'Dawn French': 'white',
  'Joanna Lumley': 'white',
  'Miranda Hart': 'white',
  'Sharon Horgan': 'white',
  'David Mitchell': 'white',
  'Robert Webb': 'white',
  'Lucy Davis': 'white',
  'Mackenzie Crook': 'white',
  'Jessica Hynes': 'white',
  'Lee Mack': 'white',
  'Aisling Bea': 'white',
  'Martin Short': 'white',
  'Zach Galifianakis': 'white',
  'Cedric the Entertainer': 'black',
  'Marlon Wayans': 'black',
  'Damon Wayans Sr': 'black',
  'Damon Wayans Jr': 'black',
  'Shawn Wayans': 'black',
  'David Alan Grier': 'black',
  'Tommy Davidson': 'black',
  'Niecy Nash': 'black',
  'Jon Cryer': 'white',
  'Cobie Smulders': 'white',
  'Sean Hayes': 'white',
  'Chris O\'Dowd': 'white',
  'Kenan Thompson': 'black',
  'Phylicia Rashad': 'black',
  'Wayne Brady': 'black',
  'Brandy Norwood': 'black',
  'Fred Armisen': 'latino',
  'Alfonso Ribeiro': 'black',
  'Josh Radnor': 'white',
  'Malcolm-Jamal Warner': 'black',
  'Michael Che': 'black',
  'Kim Fields': 'black',
  'Jaleel White': 'black',
  'Erika Alexander': 'black',
  'T.C. Carson': 'black',
  'Colin Jost': 'white',
  'Taran Killam': 'white',
  'Bobby Moynihan': 'white',
  'Casey Wilson': 'white',
  'Oscar Nunez': 'latino',
  'Kerri Kenney': 'white',
  'Michael Ian Black': 'white',
  'Robert Ben Garant': 'white',
  'Curtis Armstrong': 'white',
  'Justin Berfield': 'white',
  'Daphne Maxwell Reid': 'black',
  'Karyn Parsons': 'black',
  'Keshia Knight Pulliam': 'black',
  'Tempestt Bledsoe': 'black',
  'Tim Allen': 'white',
}

const ACTORS = [
  // Ted Lasso
  'Nick Mohammed',
  // British comedy (living, active)
  'Steve Coogan', 'Simon Pegg', 'Stephen Fry', 'Dawn French', 'Joanna Lumley',
  'Miranda Hart', 'Sharon Horgan', 'David Mitchell', 'Robert Webb', 'Lucy Davis',
  'Mackenzie Crook', 'Jessica Hynes', 'Lee Mack', 'Aisling Bea',
  // Comedy film/TV stars
  'Martin Short', 'Zach Galifianakis',
  // Black sitcom legacy
  'Cedric the Entertainer', 'Marlon Wayans', 'Damon Wayans Sr', 'Damon Wayans Jr',
  'Shawn Wayans', 'David Alan Grier', 'Tommy Davidson', 'Niecy Nash',
  'Malcolm-Jamal Warner', 'Jaleel White', 'Erika Alexander', 'T.C. Carson',
  'Kim Fields', 'Brandy Norwood', 'Phylicia Rashad',
  // Sitcom veterans
  'Jon Cryer', 'Tim Allen', 'Wayne Brady', 'Alfonso Ribeiro',
  'Daphne Maxwell Reid', 'Karyn Parsons', 'Keshia Knight Pulliam', 'Tempestt Bledsoe',
  // HIMYM
  'Cobie Smulders', 'Josh Radnor',
  // Will & Grace
  'Sean Hayes',
  // The IT Crowd / Irish comedy
  "Chris O'Dowd",
  // SNL cast
  'Kenan Thompson', 'Fred Armisen', 'Bobby Moynihan', 'Colin Jost',
  'Michael Che', 'Taran Killam',
  // Reno 911 / Wet Hot
  'Kerri Kenney', 'Michael Ian Black', 'Robert Ben Garant',
  // The Office (US)
  'Oscar Nunez', 'Casey Wilson',
  // Revenge of the Nerds etc
  'Curtis Armstrong',
  // Malcolm in the Middle
  'Justin Berfield',
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
      content: `You are a Hollywood casting database editor. Generate a casting profile for the actor/comedian ${name}.

Known for: ${knownFor || 'television and comedy'}
Bio snippet: ${bio?.slice(0, 300) || 'No bio available'}

Return ONLY this JSON (no markdown):
{
  "biography": "2-3 sentence factual bio focused on acting/performing career",
  "keywords": "comedy; drama; [other genres]; [background]",
  "archetype": "e.g. 'sardonic everyman'",
  "strengths": "3-4 acting strengths, comma-separated",
  "weaknesses": "1-2 honest limitations, comma-separated",
  "best_cast_as": "types of roles they suit, comma-separated",
  "signature_quality": "one distinctive quality in 10-15 words",
  "career_stage": "one of: emerging | established | legend",
  "casting_profile": "2-3 sentences a casting director would use"
}`,
    }],
  })

  const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
  const match = text.replace(/```json|```/g, '').trim().match(/\{[\s\S]*\}/)
  if (!match) throw new Error(`No JSON for ${name}: ${text.slice(0, 80)}`)
  return JSON.parse(match[0])
}

async function main() {
  console.log(`Processing ${ACTORS.length} actors...\n`)

  const { data: existing } = await supabase.from('actors').select('name').in('name', ACTORS)
  const existingNames = new Set(existing?.map((a: any) => a.name) ?? [])
  const toProcess = ACTORS.filter(n => !existingNames.has(n))

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
            .slice(0, 4).map((c: any) => c.title)
          const tvCredits = (details.tv_credits?.cast ?? [])
            .filter((c: any) => c.vote_count > 50)
            .sort((a: any, b: any) => b.popularity - a.popularity)
            .slice(0, 3).map((c: any) => c.name)
          const credits = [...movieCredits, ...tvCredits].slice(0, 5)
          if (credits.length > 0) knownFor = credits.join('; ')
        }
      }

      const profile = await generateCastingProfile(name, rawBio, knownFor)
      await sleep(200)

      const cost = COST_OVERRIDE[name] ?? Math.max(3, Math.min(7, Math.round(popularity / 3)))
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
