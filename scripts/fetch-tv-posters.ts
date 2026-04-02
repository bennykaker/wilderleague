/**
 * Fetch missing poster_path values from TMDB for TV shows (and any movies missing posters).
 * Run with: npx tsx scripts/fetch-tv-posters.ts
 */

import fs from 'fs'
import path from 'path'
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

const TMDB_KEY = process.env.TMDB_API_KEY!
const TMDB_IMG = 'https://image.tmdb.org/t/p/w500'

async function tmdbSearch(endpoint: string, query: string, yearParam = ''): Promise<{ poster_path: string | null; tmdb_id: string | null }> {
  const url = `https://api.themoviedb.org/3/${endpoint}?query=${encodeURIComponent(query)}${yearParam}`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${TMDB_KEY}` } })
  const data = await res.json() as { results?: Array<{ poster_path?: string; id?: number; popularity?: number }> }
  // Pick most popular result that has a poster
  const result = data.results?.filter(r => r.poster_path).sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))[0]
  if (!result) return { poster_path: null, tmdb_id: null }
  return {
    poster_path: `${TMDB_IMG}${result.poster_path}`,
    tmdb_id: result.id ? String(result.id) : null,
  }
}

async function searchTMDB(title: string, type: string, year: number | null): Promise<{ poster_path: string | null; tmdb_id: string | null }> {
  const isStage = type === 'play' || type === 'musical'
  const isTV = type === 'tv'

  // Strip season qualifiers like "(Season 1)" for cleaner TMDB searches
  const cleanTitle = title.replace(/\s*\(Season \d+\)/i, '').trim()

  if (isTV) {
    return tmdbSearch('search/tv', cleanTitle, year ? `&first_air_date_year=${year}` : '')
  }

  if (isStage) {
    // Search for the most prominent film adaptation — try with year first, then without
    const withYear = year && year > 1900 ? await tmdbSearch('search/movie', cleanTitle, `&primary_release_year=${year}`) : { poster_path: null, tmdb_id: null }
    if (withYear.poster_path) return withYear
    // Try movie search without year (catches adaptations made in different years)
    const withoutYear = await tmdbSearch('search/movie', cleanTitle)
    if (withoutYear.poster_path) return withoutYear
    // Last resort: try TV (e.g. filmed stage productions on streaming)
    return tmdbSearch('search/tv', cleanTitle)
  }

  // Regular movie
  return tmdbSearch('search/movie', cleanTitle, year ? `&primary_release_year=${year}` : '')
}

async function main() {
  const { data: titles, error } = await supabase
    .from('titles')
    .select('slug, title, type, year, poster_path, tmdb_id')
    .or('poster_path.is.null,poster_path.eq.')
    .neq('type', 'book')
    .order('type', { ascending: true })

  if (error) throw new Error(error.message)
  if (!titles || titles.length === 0) {
    console.log('All titles already have posters.')
    return
  }

  console.log(`Fetching posters for ${titles.length} titles...\n`)

  let done = 0
  let failed = 0
  let notFound = 0

  for (const t of titles as any[]) {
    try {
      const { poster_path, tmdb_id } = await searchTMDB(t.title, t.type, t.year)

      if (!poster_path) {
        notFound++
        console.log(`  ✗ Not found: ${t.title}`)
        continue
      }

      const update: Record<string, string> = { poster_path }
      if (!t.tmdb_id && tmdb_id) update.tmdb_id = tmdb_id

      const { error: updateError } = await supabase
        .from('titles')
        .update(update)
        .eq('slug', t.slug)

      if (updateError) throw new Error(updateError.message)

      done++
      console.log(`  ✓ ${t.title} (${t.type})`)

      await new Promise(r => setTimeout(r, 250)) // rate limit
    } catch (err) {
      failed++
      console.error(`  ✗ ${t.title}: ${err instanceof Error ? err.message : err}`)
    }
  }

  console.log(`\nDone. ${done} updated, ${notFound} not found on TMDB, ${failed} errors.`)
}

main().catch(console.error)
