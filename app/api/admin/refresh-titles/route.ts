/**
 * Monthly cron — fetches popular new releases from TMDB and upserts them
 * as unenriched title stubs. Run enrich-titles.ts and seed-new-roles.ts
 * manually after reviewing the report.
 *
 * Vercel Cron fires this on the 1st of each month at 08:00 UTC.
 * Protected by CRON_SECRET (Vercel injects as Authorization: Bearer <secret>).
 * Also accepts X-Admin-Key header for manual triggering.
 */

import { createClient } from '../../../../lib/supabase/server'
import { NextRequest } from 'next/server'

const TMDB_KEY = process.env.TMDB_API_KEY!

// TMDB genre IDs to exclude
const EXCLUDE_MOVIE_GENRES = new Set([99])       // Documentary
const EXCLUDE_TV_GENRES    = new Set([99, 10764, 10762, 10766, 10767]) // Doc, Reality, Kids, Soap, Talk

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function estimateMovieBudget(genreIds: number[], popularity: number): number {
  const bigGenres = new Set([28, 12, 878, 14, 10751]) // Action, Adventure, SciFi, Fantasy, Family
  const smallGenres = new Set([27, 53, 9648])          // Horror, Thriller, Mystery
  const hasBig = genreIds.some(g => bigGenres.has(g))
  const hasSmall = genreIds.some(g => smallGenres.has(g))
  if (hasBig) return popularity >= 50 ? 150 : 80
  if (hasSmall) return 30
  return 45  // Drama, Comedy, Romance default
}

function estimateTvBudget(genreIds: number[]): number {
  const bigGenres = new Set([10759, 10765]) // Action & Adventure, SciFi & Fantasy
  if (genreIds.some(g => bigGenres.has(g))) return 35
  if (genreIds.includes(35)) return 20      // Comedy
  return 25                                  // Drama default
}

async function fetchTmdb(url: string): Promise<any> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${TMDB_KEY}`, accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`TMDB ${res.status}: ${url}`)
  return res.json()
}

function dateRange(): { gte: string; lte: string } {
  const now = new Date()
  const lte = now.toISOString().slice(0, 10)
  const from = new Date(now)
  from.setDate(from.getDate() - 38) // ~5 weeks back to catch wide releases
  return { gte: from.toISOString().slice(0, 10), lte }
}

export async function GET(req: NextRequest) {
  // Auth: Vercel Cron injects Authorization: Bearer <CRON_SECRET>
  // Also accept X-Admin-Key for manual triggering
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization')
  const adminKey = req.headers.get('x-admin-key')

  const validCron = cronSecret && authHeader === `Bearer ${cronSecret}`
  const validManual = cronSecret && adminKey === cronSecret

  if (!validCron && !validManual) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const { gte, lte } = dateRange()

  // Fetch existing slugs so we can skip duplicates
  const { data: existingRows } = await supabase.from('titles').select('slug')
  const existingSlugs = new Set((existingRows ?? []).map(r => r.slug))

  const added: { slug: string; title: string; type: string; year: number; budget: number }[] = []
  const skipped: string[] = []

  // ── Movies ────────────────────────────────────────────────────────────────
  const movieData = await fetchTmdb(
    `https://api.themoviedb.org/3/discover/movie` +
    `?primary_release_date.gte=${gte}&primary_release_date.lte=${lte}` +
    `&sort_by=popularity.desc&vote_count.gte=50` +
    `&with_original_language=en&page=1`
  )

  for (const m of (movieData.results ?? []).slice(0, 25)) {
    const genreIds: number[] = m.genre_ids ?? []
    if (genreIds.some(g => EXCLUDE_MOVIE_GENRES.has(g))) continue
    if (!m.title || !m.release_date) continue

    const year = parseInt(m.release_date.slice(0, 4), 10)
    const slug = slugify(m.title)

    if (existingSlugs.has(slug)) { skipped.push(m.title); continue }

    const budget = estimateMovieBudget(genreIds, m.popularity ?? 0)
    added.push({ slug, title: m.title, type: 'movie', year, budget })
    existingSlugs.add(slug)
  }

  // ── TV Shows ──────────────────────────────────────────────────────────────
  const tvData = await fetchTmdb(
    `https://api.themoviedb.org/3/discover/tv` +
    `?first_air_date.gte=${gte}&first_air_date.lte=${lte}` +
    `&sort_by=popularity.desc&vote_count.gte=30` +
    `&with_original_language=en&page=1`
  )

  for (const t of (tvData.results ?? []).slice(0, 20)) {
    const genreIds: number[] = t.genre_ids ?? []
    if (genreIds.some(g => EXCLUDE_TV_GENRES.has(g))) continue
    if (!t.name || !t.first_air_date) continue

    const year = parseInt(t.first_air_date.slice(0, 4), 10)
    const slug = slugify(t.name)

    if (existingSlugs.has(slug)) { skipped.push(t.name); continue }

    const budget = estimateTvBudget(genreIds)
    added.push({ slug, title: t.name, type: 'tv', year, budget })
    existingSlugs.add(slug)
  }

  // ── Upsert ────────────────────────────────────────────────────────────────
  if (added.length > 0) {
    const { error } = await supabase
      .from('titles')
      .upsert(added, { onConflict: 'slug' })

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }
  }

  const report = {
    run_at: new Date().toISOString(),
    window: { gte, lte },
    added: added.map(t => `${t.title} (${t.type}, ${t.year}, $${t.budget}M)`),
    skipped_already_exist: skipped,
    next_steps: added.length > 0
      ? ['npx tsx scripts/enrich-titles.ts', 'npx tsx scripts/seed-new-roles.ts', 'npx tsx scripts/fetch-role-actor-images.ts']
      : [],
  }

  console.log('[refresh-titles]', JSON.stringify(report))
  return Response.json(report)
}
