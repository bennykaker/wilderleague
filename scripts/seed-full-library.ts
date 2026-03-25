/**
 * Seeds the full Wilderleague title library from TMDB.
 *
 * Pulls:
 *   1. Top 250 movies by vote average (TMDB top_rated)
 *   2. Top 250 TV shows by vote average
 *   3. All movies since 1987 with revenue >= $10M (nationwide releases)
 *   4. TV shows with 4+ seasons, excluding reality / game shows / news
 *
 * Merges with existing titles.csv and roles.csv — safe to re-run.
 * Saves progress after every title so it can be interrupted and resumed.
 *
 * Run: npm run seed-full-library
 * Estimated runtime: 60–90 minutes (TMDB rate limiting)
 */

import fs from 'fs'
import path from 'path'
import Papa from 'papaparse'

function getToken(): string {
  if (process.env.TMDB_API_KEY) return process.env.TMDB_API_KEY
  try {
    const file = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
    const match = file.match(/^TMDB_API_KEY=(.+)$/m)
    return match?.[1]?.trim() ?? ''
  } catch { return '' }
}

const TOKEN = getToken()
if (!TOKEN) { console.error('TMDB_API_KEY not found'); process.exit(1) }

const TITLES_PATH = path.join(process.cwd(), 'data', 'titles.csv')
const ROLES_PATH  = path.join(process.cwd(), 'data', 'roles.csv')

// TV genre IDs to exclude
const EXCLUDE_TV_GENRES = new Set([10764, 10767, 10763, 10766]) // Reality, Game Show, News, Soap

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

async function tmdb(endpoint: string, retries = 3): Promise<Record<string, any>> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const res = await fetch(`https://api.themoviedb.org/3${endpoint}`, {
      headers: { Authorization: `Bearer ${TOKEN}`, accept: 'application/json' },
    })
    if (res.status === 429) { await sleep(2000); continue }
    if (!res.ok) throw new Error(`TMDB ${res.status}: ${endpoint}`)
    return res.json()
  }
  throw new Error(`TMDB failed after ${retries} retries: ${endpoint}`)
}

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

function recastBudget(revenue: number, type: string): number {
  if (type === 'tv') return 80
  if (revenue >= 500_000_000) return 200
  if (revenue >= 200_000_000) return 150
  if (revenue >= 100_000_000) return 120
  if (revenue >= 50_000_000)  return 100
  if (revenue >= 20_000_000)  return 80
  return 60
}

type TitleRow = Record<string, string>
type RoleRow  = Record<string, string>

interface Candidate {
  tmdb_id: number
  title: string
  year: number
  type: 'movie' | 'tv'
  revenue: number
  genre_ids: number[]
}

// ── Discovery ────────────────────────────────────────────────────────────────

async function fetchPages(endpoint: string, maxPages: number): Promise<Record<string, any>[]> {
  const results: Record<string, any>[] = []
  for (let page = 1; page <= maxPages; page++) {
    const sep = endpoint.includes('?') ? '&' : '?'
    const data = await tmdb(`${endpoint}${sep}page=${page}`)
    const items = data.results ?? []
    results.push(...items)
    if (page >= (data.total_pages ?? 1)) break
    await sleep(250)
  }
  return results
}

async function discoverMovies(): Promise<Candidate[]> {
  console.log('\n📽️  Discovering movies…')
  const seen = new Set<number>()
  const candidates: Candidate[] = []

  // 1. Top rated (top 250 ≈ 13 pages)
  console.log('  → Top rated movies')
  const topRated = await fetchPages('/movie/top_rated', 13)
  for (const m of topRated) {
    if (!seen.has(m.id)) {
      seen.add(m.id)
      candidates.push({ tmdb_id: m.id, title: m.title, year: parseInt((m.release_date ?? '').slice(0, 4)) || 0, type: 'movie', revenue: m.revenue ?? 0, genre_ids: m.genre_ids ?? [] })
    }
  }
  console.log(`  → ${candidates.length} from top rated`)

  // 2. Movies since 1987 with revenue >= $10M, sorted by revenue desc (up to 200 pages = 4000 movies)
  console.log('  → High-revenue movies since 1987 (this takes a few minutes…)')
  const discovered = await fetchPages(
    '/discover/movie?sort_by=revenue.desc&revenue.gte=10000000&primary_release_date.gte=1987-01-01&vote_count.gte=50&with_release_type=3|2',
    200
  )
  for (const m of discovered) {
    if (!seen.has(m.id) && m.title) {
      seen.add(m.id)
      candidates.push({ tmdb_id: m.id, title: m.title, year: parseInt((m.release_date ?? '').slice(0, 4)) || 0, type: 'movie', revenue: m.revenue ?? 0, genre_ids: m.genre_ids ?? [] })
    }
  }
  console.log(`  → ${candidates.length} movies total`)
  return candidates
}

async function discoverTV(): Promise<Candidate[]> {
  console.log('\n📺  Discovering TV shows…')
  const seen = new Set<number>()
  const candidates: Candidate[] = []

  // 1. Top rated TV (top 250 ≈ 13 pages)
  console.log('  → Top rated TV')
  const topRated = await fetchPages('/tv/top_rated', 13)
  for (const s of topRated) {
    const genres: number[] = s.genre_ids ?? []
    if (!genres.some(g => EXCLUDE_TV_GENRES.has(g)) && !seen.has(s.id)) {
      seen.add(s.id)
      candidates.push({ tmdb_id: s.id, title: s.name, year: parseInt((s.first_air_date ?? '').slice(0, 4)) || 0, type: 'tv', revenue: 0, genre_ids: genres })
    }
  }

  // 2. Popular TV (top 500 ≈ 25 pages), filtered for quality
  console.log('  → Popular TV')
  const popular = await fetchPages('/tv/popular', 25)
  for (const s of popular) {
    const genres: number[] = s.genre_ids ?? []
    if (!genres.some(g => EXCLUDE_TV_GENRES.has(g)) && !seen.has(s.id) && (s.vote_count ?? 0) >= 100) {
      seen.add(s.id)
      candidates.push({ tmdb_id: s.id, title: s.name, year: parseInt((s.first_air_date ?? '').slice(0, 4)) || 0, type: 'tv', revenue: 0, genre_ids: genres })
    }
  }

  // 3. Discover by vote average, multiple genre combos to catch drama/comedy
  console.log('  → Discover TV by vote average')
  const discovered = await fetchPages(
    '/discover/tv?sort_by=vote_average.desc&vote_count.gte=200&without_genres=10764,10767,10763,10766',
    50
  )
  for (const s of discovered) {
    const genres: number[] = s.genre_ids ?? []
    if (!seen.has(s.id) && s.name) {
      seen.add(s.id)
      candidates.push({ tmdb_id: s.id, title: s.name, year: parseInt((s.first_air_date ?? '').slice(0, 4)) || 0, type: 'tv', revenue: 0, genre_ids: genres })
    }
  }

  console.log(`  → ${candidates.length} TV candidates before season filter`)
  return candidates
}

// ── Detail fetch ─────────────────────────────────────────────────────────────

async function fetchMovieDetail(tmdbId: number): Promise<{ poster_path: string; backdrop_path: string; logline: string; revenue: number } | null> {
  try {
    const d = await tmdb(`/movie/${tmdbId}`)
    return {
      poster_path:   d.poster_path   ? `https://image.tmdb.org/t/p/w500${d.poster_path}`   : '',
      backdrop_path: d.backdrop_path ? `https://image.tmdb.org/t/p/w1280${d.backdrop_path}` : '',
      logline:       (d.overview ?? '').slice(0, 160),
      revenue:       d.revenue ?? 0,
    }
  } catch { return null }
}

async function fetchTVDetail(tmdbId: number): Promise<{ poster_path: string; backdrop_path: string; logline: string; seasons: number } | null> {
  try {
    const d = await tmdb(`/tv/${tmdbId}`)
    return {
      poster_path:   d.poster_path   ? `https://image.tmdb.org/t/p/w500${d.poster_path}`   : '',
      backdrop_path: d.backdrop_path ? `https://image.tmdb.org/t/p/w1280${d.backdrop_path}` : '',
      logline:       (d.overview ?? '').slice(0, 160),
      seasons:       d.number_of_seasons ?? 1,
    }
  } catch { return null }
}

async function fetchCast(tmdbId: number, type: string): Promise<Array<{ character: string; name: string; profile_path: string }>> {
  const endpoint = type === 'movie' ? `/movie/${tmdbId}/credits` : `/tv/${tmdbId}/credits`
  const data = await tmdb(endpoint)
  const cast = ((data.cast ?? []) as any[]).slice(0, 7)
  return cast
    .map((c: any) => ({
      character:    (c.character ?? c.roles?.[0]?.character ?? '').replace(/\s*\(.*\)/, '').trim(),
      name:         c.name ?? '',
      profile_path: c.profile_path ? `https://image.tmdb.org/t/p/w500${c.profile_path}` : '',
    }))
    .filter(c => c.character && c.name)
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Load existing data
  const existingTitles = new Map<string, TitleRow>()
  const existingTmdbIds = new Set<string>()
  const existingRoles: RoleRow[] = []
  const existingRoleKeys = new Set<string>()

  if (fs.existsSync(TITLES_PATH)) {
    Papa.parse<TitleRow>(fs.readFileSync(TITLES_PATH, 'utf8'), { header: true, skipEmptyLines: true })
      .data.forEach(r => {
        existingTitles.set(r.slug, r)
        if (r.tmdb_id) existingTmdbIds.add(r.tmdb_id)
      })
  }
  if (fs.existsSync(ROLES_PATH)) {
    Papa.parse<RoleRow>(fs.readFileSync(ROLES_PATH, 'utf8'), { header: true, skipEmptyLines: true })
      .data.filter(r => r.movie_slug).forEach(r => {
        existingRoles.push(r)
        existingRoleKeys.add(`${r.movie_slug}::${r.role_name}`)
      })
  }

  console.log(`Existing: ${existingTitles.size} titles, ${existingRoles.length} roles`)

  // Discover candidates
  const movieCandidates = await discoverMovies()
  const tvCandidates    = await discoverTV()
  const allCandidates   = [...movieCandidates, ...tvCandidates]

  // Filter out already-seeded
  const newCandidates = allCandidates.filter(c => !existingTmdbIds.has(String(c.tmdb_id)))
  console.log(`\n${newCandidates.length} new titles to seed (${allCandidates.length - newCandidates.length} already done)`)

  // Working sets
  const titleRows: TitleRow[] = [...existingTitles.values()]
  const roleRows:  RoleRow[]  = [...existingRoles]
  const slugCounts = new Map<string, number>()
  for (const r of titleRows) {
    const base = r.slug.replace(/-\d+$/, '')
    slugCounts.set(base, (slugCounts.get(base) ?? 0) + 1)
  }

  let added = 0
  let skipped = 0

  for (let i = 0; i < newCandidates.length; i++) {
    const c = newCandidates[i]
    process.stdout.write(`[${i + 1}/${newCandidates.length}] ${c.title} (${c.year})… `)

    try {
      let detail: { poster_path: string; backdrop_path: string; logline: string; revenue?: number; seasons?: number } | null = null
      let finalRevenue = c.revenue

      if (c.type === 'movie') {
        detail = await fetchMovieDetail(c.tmdb_id)
        if (!detail) { console.log('no detail'); skipped++; continue }
        finalRevenue = detail.revenue ?? c.revenue
        // Skip movies under $10M unless they were in top_rated
        if (finalRevenue < 10_000_000 && i >= 250) { console.log('under threshold'); skipped++; await sleep(150); continue }
      } else {
        detail = await fetchTVDetail(c.tmdb_id)
        if (!detail) { console.log('no detail'); skipped++; continue }
        // Require 4+ seasons for TV
        if ((detail.seasons ?? 0) < 4) { console.log(`only ${detail.seasons} season(s)`); skipped++; await sleep(150); continue }
      }

      await sleep(250)
      const cast = await fetchCast(c.tmdb_id, c.type)
      await sleep(250)

      if (cast.length === 0) { console.log('no cast'); skipped++; continue }

      // Generate unique slug
      const baseSlug = toSlug(c.title)
      const count = slugCounts.get(baseSlug) ?? 0
      const slug = count === 0 ? baseSlug : `${baseSlug}-${c.year}`
      slugCounts.set(baseSlug, count + 1)

      titleRows.push({
        slug,
        title:         c.title,
        year:          String(c.year),
        type:          c.type,
        tmdb_id:       String(c.tmdb_id),
        poster_path:   detail.poster_path,
        backdrop_path: detail.backdrop_path,
        logline:       detail.logline,
        budget:        String(recastBudget(finalRevenue, c.type)),
      })
      existingTmdbIds.add(String(c.tmdb_id))

      for (const member of cast) {
        const key = `${slug}::${member.character}`
        if (!existingRoleKeys.has(key)) {
          roleRows.push({ movie_slug: slug, role_name: member.character, original_actor: member.name, original_actor_image: member.profile_path })
          existingRoleKeys.add(key)
        }
      }

      added++
      console.log(`✓ ${cast.length} roles${c.type === 'tv' && detail.seasons ? ` · ${detail.seasons} seasons` : ''}`)

      // Save progress every 25 titles
      if (added % 25 === 0) {
        fs.writeFileSync(TITLES_PATH, Papa.unparse(titleRows), 'utf8')
        fs.writeFileSync(ROLES_PATH,  Papa.unparse(roleRows),  'utf8')
        console.log(`  💾 Progress saved (${titleRows.length} titles, ${roleRows.length} roles)`)
      }
    } catch (err) {
      console.log(`FAILED: ${err}`)
      skipped++
    }

    await sleep(300)
  }

  // Final save
  fs.writeFileSync(TITLES_PATH, Papa.unparse(titleRows), 'utf8')
  fs.writeFileSync(ROLES_PATH,  Papa.unparse(roleRows),  'utf8')

  console.log(`
✅ Done.
   Added:   ${added} new titles
   Skipped: ${skipped} (under threshold / no cast / no detail)
   Total:   ${titleRows.length} titles, ${roleRows.length} roles

Next steps:
  1. npm run precompute-suggestions   (generates role suggestions for new titles)
  2. npm run seed-clcu-actors         (if you want challenge themes seeded)
`)
}

main().catch(err => { console.error(err); process.exit(1) })
