/**
 * Builds a rich actor pool from TMDB.
 * Run with: npm run enrich-actors
 *
 * Phase 1: Fetch top 10,000 actors from TMDB popular list (bulk, fast)
 *          → gets name, photo, gender, known_for, popularity
 * Phase 2: Fetch detailed bio + birth year for top 1,000
 *          → individual calls, rate-limited
 *
 * Merges with existing data/enriched-actors.csv — deep-dive profiles are preserved.
 * Writes: data/enriched-actors.csv
 */

import fs from 'fs'
import path from 'path'
import Papa from 'papaparse'

// Read token from env or .env.local directly
function getToken(): string {
  if (process.env.TMDB_API_KEY) return process.env.TMDB_API_KEY
  try {
    const file = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
    const match = file.match(/^TMDB_API_KEY=(.+)$/m)
    return match?.[1]?.trim() ?? ''
  } catch { return '' }
}

const TOKEN = getToken()
const DELAY_MS = 260  // ~3.8 req/s, well under TMDB's 40/10s limit
const TOTAL_ACTORS = 10000
const DETAIL_THRESHOLD = 1000  // fetch full bio for top N by popularity

if (!TOKEN) {
  console.error('TMDB_API_KEY not found in env or .env.local')
  process.exit(1)
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function tmdbGet(endpoint: string): Promise<Record<string, unknown>> {
  const res = await fetch(`https://api.themoviedb.org/3${endpoint}`, {
    headers: { Authorization: `Bearer ${TOKEN}`, accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`TMDB ${endpoint} → ${res.status}`)
  return res.json() as Promise<Record<string, unknown>>
}

function genderLabel(g: number): string {
  if (g === 1) return 'female'
  if (g === 2) return 'male'
  if (g === 3) return 'non-binary'
  return ''
}

function popularityToCost(pop: number): number {
  if (pop >= 200) return 12
  if (pop >= 100) return 10
  if (pop >= 50) return 8
  if (pop >= 20) return 6
  if (pop >= 8) return 4
  return 3
}

const GENRE_MAP: Record<number, string> = {
  28: 'action', 12: 'adventure', 16: 'animation', 35: 'comedy',
  80: 'crime', 99: 'documentary', 18: 'drama', 10751: 'family',
  14: 'fantasy', 36: 'history', 27: 'horror', 10402: 'music',
  9648: 'mystery', 10749: 'romance', 878: 'sci-fi', 53: 'thriller',
  10752: 'war', 37: 'western',
}

interface BulkActor {
  id: number
  name: string
  profile_path: string | null
  popularity: number
  gender: number
  known_for_department: string
  known_for: Array<{ title?: string; name?: string; genre_ids?: number[] }>
}

// ── Phase 1: bulk popular list ──────────────────────────────────────────────

async function fetchPopularActors(total: number): Promise<BulkActor[]> {
  const pages = Math.ceil(total / 20)
  const actors: BulkActor[] = []

  for (let page = 1; page <= pages; page++) {
    try {
      const data = await tmdbGet(`/person/popular?page=${page}`)
      const results = (data.results as BulkActor[]) ?? []
      // Only keep actors (not directors, crew, etc.)
      actors.push(...results.filter(p => p.known_for_department === 'Acting'))
      process.stdout.write(`\rPhase 1: fetched page ${page}/${pages} (${actors.length} actors so far)`)
    } catch (err) {
      console.error(`\nPage ${page} failed: ${err}`)
    }
    await sleep(DELAY_MS)
  }

  console.log()
  return actors.slice(0, total)
}

// ── Phase 2: individual detail fetch ────────────────────────────────────────

interface DetailResult {
  biography: string
  birth_year: string
  keywords: string
  known_for_credits: string
}

async function fetchDetail(tmdbId: number, bulkKnownFor: BulkActor['known_for']): Promise<DetailResult> {
  const [person, credits] = await Promise.all([
    tmdbGet(`/person/${tmdbId}`),
    tmdbGet(`/person/${tmdbId}/movie_credits`),
  ])

  const biography = ((person.biography as string) ?? '').replace(/\n/g, ' ').trim().slice(0, 500)
  const birthday = person.birthday as string | null
  const birth_year = birthday ? birthday.split('-')[0] : ''

  // Genre keywords from movie credits
  const cast = (credits.cast as Array<{ genre_ids?: number[]; popularity?: number; title?: string; name?: string }>) ?? []
  const genreCounts: Record<string, number> = {}
  for (const movie of cast) {
    for (const id of movie.genre_ids ?? []) {
      const label = GENRE_MAP[id]
      if (label) genreCounts[label] = (genreCounts[label] ?? 0) + 1
    }
  }
  const topGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([g]) => g)

  const keywords = ['actor', ...topGenres].join('; ')

  const known_for_credits = cast
    .filter(c => (c.popularity ?? 0) > 5)
    .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
    .slice(0, 5)
    .map(c => c.title ?? c.name ?? '')
    .filter(Boolean)
    .join('; ')

  return { biography, birth_year, keywords, known_for_credits }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const outPath = path.join(process.cwd(), 'data', 'enriched-actors.csv')

  // Phase 1
  console.log(`\nPhase 1: fetching top ${TOTAL_ACTORS} actors from TMDB popular list…`)
  const bulkActors = await fetchPopularActors(TOTAL_ACTORS)
  console.log(`Got ${bulkActors.length} actors from popular list.\n`)

  // Phase 2
  console.log(`Phase 2: fetching bios for top ${DETAIL_THRESHOLD} actors…`)
  const detailActors = bulkActors.slice(0, DETAIL_THRESHOLD)
  const details = new Map<number, DetailResult>()

  for (let i = 0; i < detailActors.length; i++) {
    const actor = detailActors[i]
    try {
      const detail = await fetchDetail(actor.id, actor.known_for)
      details.set(actor.id, detail)
      process.stdout.write(`\rPhase 2: ${i + 1}/${DETAIL_THRESHOLD} — ${actor.name}`.padEnd(80))
    } catch (err) {
      console.error(`\n${actor.name} detail failed: ${err}`)
    }
    await sleep(DELAY_MS)
  }
  console.log('\n')

  // Load existing data to preserve deep-dive profiles
  type ExistingRow = Record<string, string>
  const existingMap = new Map<string, ExistingRow>()
  if (fs.existsSync(outPath)) {
    const raw = fs.readFileSync(outPath, 'utf8')
    const parsed = Papa.parse<ExistingRow>(raw, { header: true, skipEmptyLines: true })
    for (const row of parsed.data) {
      if (row.tmdb_id) existingMap.set(row.tmdb_id, row)
    }
    console.log(`Loaded ${existingMap.size} existing actors to merge with.`)
  }

  // Build output rows — merge fresh TMDB data with preserved deep-dive fields
  const deepDiveFields = ['archetype', 'strengths', 'weaknesses', 'best_cast_as', 'signature_quality', 'career_stage', 'casting_profile', 'deep_dive_date', 'salary_estimate', 'salary_confirmed']

  const rows = bulkActors.map(actor => {
    const detail = details.get(actor.id)
    const pop = actor.popularity
    const existing = existingMap.get(String(actor.id))

    // Fallback known_for from bulk data
    const bulkKnownFor = actor.known_for
      .map(k => k.title ?? k.name ?? '')
      .filter(Boolean)
      .slice(0, 3)
      .join('; ')

    // Fallback keywords from bulk known_for genres
    const bulkGenreIds = actor.known_for.flatMap(k => k.genre_ids ?? [])
    const bulkGenreCounts: Record<string, number> = {}
    for (const id of bulkGenreIds) {
      const label = GENRE_MAP[id]
      if (label) bulkGenreCounts[label] = (bulkGenreCounts[label] ?? 0) + 1
    }
    const bulkKeywords = ['actor', ...Object.entries(bulkGenreCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([g]) => g)].join('; ')

    const row: Record<string, string> = {
      name: actor.name,
      tmdb_id: String(actor.id),
      headshot_url: actor.profile_path ? `https://image.tmdb.org/t/p/w500${actor.profile_path}` : '',
      popularity: pop.toFixed(4),
      cost: String(popularityToCost(pop)),
      gender: genderLabel(actor.gender),
      birth_year: detail?.birth_year ?? existing?.birth_year ?? '',
      biography: detail?.biography ?? existing?.biography ?? '',
      known_for: detail?.known_for_credits ?? existing?.known_for ?? bulkKnownFor,
      keywords: detail?.keywords ?? existing?.keywords ?? bulkKeywords,
      notes: existing?.notes ?? '',
      ui_status: existing?.ui_status ?? '',
    }

    // Preserve deep-dive fields from existing data
    for (const field of deepDiveFields) {
      row[field] = existing?.[field] ?? ''
    }

    return row
  })

  // Track new vs updated
  const newCount = rows.filter(r => !existingMap.has(r.tmdb_id)).length
  console.log(`${newCount} new actors added, ${rows.length - newCount} updated.`)

  const csv = Papa.unparse(rows)
  fs.writeFileSync(outPath, csv, 'utf8')
  console.log(`Done. ${rows.length} actors written to ${outPath}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
