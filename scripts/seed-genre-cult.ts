/**
 * Genre cult actors — horror, sci-fi, action.
 * Run with: npx tsx scripts/seed-genre-cult.ts
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

const ACTORS: { name: string; cost: number; race: string; note: string }[] = [
  // ── HORROR CULT ──────────────────────────────────────────────────────────
  { name: 'Robert Englund',     cost: 5, race: 'white', note: 'Freddy Krueger, Nightmare on Elm Street franchise' },
  { name: 'Doug Bradley',       cost: 3, race: 'white', note: 'Pinhead, Hellraiser franchise' },
  { name: 'Heather Langenkamp', cost: 3, race: 'white', note: 'Nancy, Nightmare on Elm Street' },
  { name: 'Barbara Crampton',   cost: 3, race: 'white', note: 'Re-Animator, From Beyond, You\'re Next' },
  { name: 'Tom Savini',         cost: 3, race: 'white', note: 'Dawn of the Dead, Maniac, FX legend turned actor' },
  { name: 'Danielle Harris',    cost: 3, race: 'white', note: 'Halloween 4/5, Rob Zombie Halloween films' },
  { name: 'Sheri Moon Zombie',  cost: 4, race: 'white', note: 'House of 1000 Corpses, The Devil\'s Rejects, Rob Zombie films' },
  { name: 'Ken Foree',          cost: 3, race: 'black', note: 'Dawn of the Dead, The Devil\'s Rejects' },
  { name: 'Angela Bettis',      cost: 3, race: 'white', note: 'May, Carrie TV movie, Bug' },

  // ── SCI-FI CULT ──────────────────────────────────────────────────────────
  { name: 'Tricia Helfer',      cost: 4, race: 'white', note: 'Battlestar Galactica (Number Six), Lucifer' },
  { name: 'Gates McFadden',     cost: 3, race: 'white', note: 'Dr. Beverly Crusher, Star Trek: The Next Generation' },
  { name: 'Michael Dorn',       cost: 3, race: 'black', note: 'Worf, Star Trek: TNG / Deep Space Nine / Picard' },
  { name: 'Jonathan Frakes',    cost: 3, race: 'white', note: 'Riker, Star Trek: TNG; also prominent TV director' },
  { name: 'Colm Meaney',        cost: 4, race: 'white', note: 'O\'Brien, Star Trek; Hell on Wheels, The Englishman' },
  { name: 'Claudia Christian',  cost: 3, race: 'white', note: 'Ivanova, Babylon 5' },
  { name: 'Adam Baldwin',       cost: 4, race: 'white', note: 'Jayne, Firefly/Serenity; Full Metal Jacket' },
  { name: 'Charisma Carpenter', cost: 3, race: 'white', note: 'Cordelia Chase, Buffy the Vampire Slayer / Angel' },

  // ── ACTION CULT ──────────────────────────────────────────────────────────
  { name: 'Cary-Hiroyuki Tagawa', cost: 3, race: 'asian',  note: 'Mortal Kombat, Rising Sun, Planet of the Apes' },
  { name: 'Robin Shou',           cost: 3, race: 'asian',  note: 'Mortal Kombat, Beverly Hills Ninja' },
  { name: 'Christopher McDonald', cost: 4, race: 'white',  note: 'Happy Gilmore, Thelma & Louise, Requiem for a Dream' },
  { name: 'Fred Williamson',      cost: 3, race: 'black',  note: 'Blaxploitation legend; Hammer, Black Caesar, From Dusk Till Dawn' },
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

async function generateCastingProfile(name: string, bio: string, knownFor: string, note: string) {
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 800,
    messages: [{
      role: 'user',
      content: `You are a Hollywood casting database editor. Generate a casting profile for ${name}.

Known for: ${knownFor || note}
Context: ${note}
Bio: ${bio?.slice(0, 300) || 'N/A'}

Return ONLY this JSON (no markdown):
{
  "biography": "2-3 sentence factual bio focused on career",
  "keywords": "horror; sci-fi; action; cult; [other genres]",
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
  console.log(`Processing ${ACTORS.length} genre cult actors...\n`)

  const names = ACTORS.map(a => a.name)
  const { data: existing } = await supabase.from('actors').select('name').in('name', names)
  const existingNames = new Set(existing?.map((a: any) => a.name) ?? [])
  const toProcess = ACTORS.filter(a => !existingNames.has(a.name))

  if (existingNames.size > 0) console.log(`Already in DB: ${[...existingNames].join(', ')}\n`)
  console.log(`Adding: ${toProcess.length} actors\n`)

  let added = 0, failed = 0

  for (const { name, cost, race, note } of toProcess) {
    try {
      const searchResult = await searchActor(name); await sleep(260)

      let tmdbId: string | null = null
      let headshot_url = '', popularity = 1, gender = '', birth_year = ''
      let rawBio = '', knownFor = note

      if (searchResult) {
        tmdbId = String(searchResult.id)
        headshot_url = searchResult.profile_path
          ? `https://image.tmdb.org/t/p/w500${searchResult.profile_path}` : ''
        popularity = searchResult.popularity ?? 1
        gender = searchResult.gender === 1 ? 'female' : searchResult.gender === 2 ? 'male' : ''

        const details = await getActorDetails(searchResult.id); await sleep(260)
        if (details) {
          rawBio = details.biography ?? ''
          birth_year = details.birthday?.split('-')[0] ?? ''
          const movies = (details.movie_credits?.cast ?? [])
            .filter((c: any) => c.vote_count > 20)
            .sort((a: any, b: any) => b.popularity - a.popularity)
            .slice(0, 4).map((c: any) => c.title)
          const tv = (details.tv_credits?.cast ?? [])
            .filter((c: any) => c.vote_count > 10)
            .sort((a: any, b: any) => b.popularity - a.popularity)
            .slice(0, 2).map((c: any) => c.name)
          const credits = [...movies, ...tv].slice(0, 5)
          if (credits.length) knownFor = credits.join('; ')
        }
      }

      const profile = await generateCastingProfile(name, rawBio, knownFor, note); await sleep(200)

      const row: Record<string, any> = {
        name, tmdb_id: tmdbId, headshot_url, popularity, cost, gender, birth_year,
        biography: profile.biography || rawBio.slice(0, 500),
        known_for: knownFor, keywords: profile.keywords, archetype: profile.archetype,
        strengths: profile.strengths, weaknesses: profile.weaknesses,
        best_cast_as: profile.best_cast_as, signature_quality: profile.signature_quality,
        career_stage: profile.career_stage, casting_profile: profile.casting_profile,
        race_ethnicity: race, deep_dive_date: new Date().toISOString().slice(0, 10),
        salary_confirmed: false,
      }

      const { error } = tmdbId
        ? await supabase.from('actors').upsert(row, { onConflict: 'tmdb_id' })
        : await supabase.from('actors').insert(row)
      if (error) throw new Error(error.message)

      console.log(`✓ ${name} ($${cost}M, tmdb: ${tmdbId ?? 'not found'})`)
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
