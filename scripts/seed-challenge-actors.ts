/**
 * Pulls every cast member from a list of TMDB show IDs and merges them
 * into enriched-actors.csv. Run before precompute-suggestions for a challenge.
 *
 * Usage: TMDB_API_KEY=... npx tsx scripts/seed-challenge-actors.ts --show-ids 1418,1695,50708
 * Or via npm:  npm run seed-clcu-actors
 *
 * Safe to re-run — existing entries are preserved, only new actors are added.
 */

import fs from 'fs'
import path from 'path'
import Papa from 'papaparse'

function getKey(name: string): string {
  if (process.env[name]) return process.env[name]!
  try {
    const file = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
    const match = file.match(new RegExp(`^${name}=(.+)$`, 'm'))
    return match?.[1]?.trim() ?? ''
  } catch { return '' }
}

const TMDB_TOKEN = getKey('TMDB_API_KEY')
const ACTORS_FILE = path.join(process.cwd(), 'data', 'enriched-actors.csv')

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

async function tmdb(endpoint: string) {
  const res = await fetch(`https://api.themoviedb.org/3${endpoint}`, {
    headers: { Authorization: `Bearer ${TMDB_TOKEN}` },
  })
  if (!res.ok) throw new Error(`TMDB ${endpoint}: ${res.status}`)
  return res.json()
}

interface ActorRow {
  tmdb_id: string
  name: string
  gender: string
  birth_year: string
  popularity: string
  known_for: string
  headshot_url: string
  cost: string
  salary_estimate: string
  salary_confirmed: string
  deep_dive_date: string
  archetype: string
  strengths: string
  weaknesses: string
  best_cast_as: string
  signature_quality: string
  career_stage: string
  casting_profile: string
}

// Chuck Lorre shows (TMDB IDs)
const CHUCK_LORRE_SHOWS: Record<string, string> = {
  'The Big Bang Theory':     '1418',
  'Two and a Half Men':      '1695',
  'Mom':                     '50708',
  'Young Sheldon':           '71728',
  'Mike & Molly':            '39412',
  'Two Broke Girls':         '41556',
  'Dharma & Greg':           '14139',
  'Bob Hearts Abishola':     '85234',
  'United States of Al':     '108870',
  'Ghosts (US)':             '130392',
  'Roseanne':                '1395',
  'The Kominsky Method':     '80986',
}

async function getAllCastForShow(showId: string, showName: string): Promise<Map<string, ActorRow>> {
  const cast = new Map<string, ActorRow>()

  // Get show details + number of seasons
  const show = await tmdb(`/tv/${showId}`)
  const numSeasons: number = show.number_of_seasons ?? 1

  console.log(`  ${showName}: ${numSeasons} seasons`)

  for (let s = 1; s <= numSeasons; s++) {
    try {
      const season = await tmdb(`/tv/${showId}/season/${s}`)
      for (const ep of (season.episodes ?? []).slice(0, 3)) {
        // Sample first 3 eps per season for guest cast (main cast repeats)
        try {
          const credits = await tmdb(`/tv/${showId}/season/${s}/episode/${ep.episode_number}/credits`)
          for (const person of [...(credits.cast ?? []), ...(credits.guest_stars ?? [])]) {
            if (!cast.has(String(person.id))) {
              cast.set(String(person.id), {
                tmdb_id: String(person.id),
                name: person.name ?? '',
                gender: person.gender === 1 ? 'F' : person.gender === 2 ? 'M' : '',
                birth_year: '',
                popularity: String(person.popularity ?? 0),
                known_for: showName,
                headshot_url: person.profile_path
                  ? `https://image.tmdb.org/t/p/w185${person.profile_path}`
                  : '',
                cost: '',
                salary_estimate: '',
                salary_confirmed: 'false',
                deep_dive_date: '',
                archetype: '',
                strengths: '',
                weaknesses: '',
                best_cast_as: '',
                signature_quality: '',
                career_stage: '',
                casting_profile: '',
              })
            }
          }
        } catch { /* skip episode errors */ }
        await sleep(80)
      }
    } catch { /* skip season errors */ }
    await sleep(150)
  }

  // Also get aggregate season credits for main cast
  try {
    const agg = await tmdb(`/tv/${showId}/aggregate_credits`)
    for (const person of (agg.cast ?? [])) {
      if (!cast.has(String(person.id))) {
        cast.set(String(person.id), {
          tmdb_id: String(person.id),
          name: person.name ?? '',
          gender: person.gender === 1 ? 'F' : person.gender === 2 ? 'M' : '',
          birth_year: '',
          popularity: String(person.popularity ?? 0),
          known_for: showName,
          headshot_url: person.profile_path
            ? `https://image.tmdb.org/t/p/w185${person.profile_path}`
            : '',
          cost: '',
          salary_estimate: '',
          salary_confirmed: 'false',
          deep_dive_date: '',
          archetype: '',
          strengths: '',
          weaknesses: '',
          best_cast_as: '',
          signature_quality: '',
          career_stage: '',
          casting_profile: '',
        })
      }
    }
  } catch { /* skip */ }

  return cast
}

async function main() {
  // Load existing actors
  const existing = new Map<string, ActorRow>()
  if (fs.existsSync(ACTORS_FILE)) {
    const raw = fs.readFileSync(ACTORS_FILE, 'utf8')
    const parsed = Papa.parse<ActorRow>(raw, { header: true, skipEmptyLines: true })
    for (const row of parsed.data) {
      if (row.tmdb_id) existing.set(row.tmdb_id, row)
    }
    console.log(`Loaded ${existing.size} existing actors`)
  }

  let added = 0

  for (const [showName, showId] of Object.entries(CHUCK_LORRE_SHOWS)) {
    console.log(`\nFetching ${showName} (TMDB ${showId})…`)
    try {
      const cast = await getAllCastForShow(showId, showName)
      for (const [id, actor] of cast) {
        if (!existing.has(id) && actor.name.trim()) {
          existing.set(id, actor)
          added++
        } else if (existing.has(id)) {
          // Append show to known_for if not already there
          const ex = existing.get(id)!
          if (ex.known_for && !ex.known_for.includes(showName)) {
            ex.known_for = [ex.known_for, showName].join('; ')
          }
        }
      }
      console.log(`  → ${cast.size} cast members found, ${added} new so far`)
    } catch (err) {
      console.log(`  FAILED: ${err}`)
    }
    await sleep(500)
  }

  const output = [...existing.values()]
  fs.writeFileSync(ACTORS_FILE, Papa.unparse(output), 'utf8')
  console.log(`\nDone. ${added} new actors added. Total: ${output.length}`)
  console.log(`\nNow update data/challenges.json to use TMDB IDs or re-run precompute-suggestions.`)
}

main().catch(err => { console.error(err); process.exit(1) })
