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

async function searchTMDB(title: string, type: string, year: number | null): Promise<{ poster_path: string | null; tmdb_id: string | null }> {
  const isTV = type === 'tv'
  const endpoint = isTV ? 'search/tv' : 'search/movie'
  const yearParam = year && !isTV ? `&primary_release_year=${year}` : year && isTV ? `&first_air_date_year=${year}` : ''
  const url = `https://api.themoviedb.org/3/${endpoint}?query=${encodeURIComponent(title)}${yearParam}`

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${TMDB_KEY}`, 'Content-Type': 'application/json' },
  })
  const data = await res.json() as { results?: Array<{ poster_path?: string; id?: number }> }
  const result = data.results?.[0]
  if (!result) return { poster_path: null, tmdb_id: null }

  return {
    poster_path: result.poster_path ? `${TMDB_IMG}${result.poster_path}` : null,
    tmdb_id: result.id ? String(result.id) : null,
  }
}

async function main() {
  const { data: titles, error } = await supabase
    .from('titles')
    .select('slug, title, type, year, poster_path, tmdb_id')
    .or('poster_path.is.null,poster_path.eq.')
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
