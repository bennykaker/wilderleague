/**
 * Enriches actors.csv with TMDB data: gender, birth year, biography, known_for, keywords.
 * Run with: npx tsx scripts/enrich-actors.ts
 *
 * Reads:  data/actors.csv
 * Writes: data/enriched-actors.csv
 */

import fs from 'fs'
import path from 'path'
import Papa from 'papaparse'

const TMDB_TOKEN = process.env.TMDB_API_KEY ?? ''
const DELAY_MS = 300 // stay well within TMDB rate limits

if (!TMDB_TOKEN) {
  console.error('TMDB_API_KEY not set. Add it to .env.local and pass it via env.')
  process.exit(1)
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function tmdbGet(path: string) {
  const res = await fetch(`https://api.themoviedb.org/3${path}`, {
    headers: {
      Authorization: `Bearer ${TMDB_TOKEN}`,
      accept: 'application/json',
    },
  })
  if (!res.ok) throw new Error(`TMDB ${path} → ${res.status}`)
  return res.json() as Promise<Record<string, unknown>>
}

function genderLabel(g: number): string {
  if (g === 1) return 'female'
  if (g === 2) return 'male'
  if (g === 3) return 'non-binary'
  return ''
}

function extractKeywords(person: Record<string, unknown>, credits: Record<string, unknown>): string {
  const tags: string[] = []

  const dept = person.known_for_department as string | undefined
  if (dept === 'Acting') tags.push('actor')
  else if (dept) tags.push(dept.toLowerCase())

  // Genre-based keywords from top credits
  const cast = (credits.cast as Array<Record<string, unknown>>) ?? []
  const genreIds = cast.flatMap(c => (c.genre_ids as number[]) ?? [])
  const genreMap: Record<number, string> = {
    28: 'action', 12: 'adventure', 16: 'animation', 35: 'comedy',
    80: 'crime', 99: 'documentary', 18: 'drama', 10751: 'family',
    14: 'fantasy', 36: 'history', 27: 'horror', 10402: 'music',
    9648: 'mystery', 10749: 'romance', 878: 'sci-fi', 53: 'thriller',
    10752: 'war', 37: 'western',
  }
  const genreCounts: Record<string, number> = {}
  for (const id of genreIds) {
    const label = genreMap[id]
    if (label) genreCounts[label] = (genreCounts[label] ?? 0) + 1
  }
  const topGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([g]) => g)
  tags.push(...topGenres)

  return tags.join('; ')
}

function extractKnownFor(credits: Record<string, unknown>): string {
  const cast = (credits.cast as Array<Record<string, unknown>>) ?? []
  return cast
    .filter(c => c.popularity && (c.popularity as number) > 5)
    .sort((a, b) => (b.popularity as number) - (a.popularity as number))
    .slice(0, 5)
    .map(c => (c.title ?? c.name ?? '') as string)
    .filter(Boolean)
    .join('; ')
}

async function main() {
  const csvPath = path.join(process.cwd(), 'data', 'actors.csv')
  const outPath = path.join(process.cwd(), 'data', 'enriched-actors.csv')

  const raw = fs.readFileSync(csvPath, 'utf8')
  const parsed = Papa.parse<Record<string, string>>(raw, { header: true, skipEmptyLines: true })
  const actors = parsed.data

  console.log(`Enriching ${actors.length} actors…\n`)

  const enriched: Record<string, string>[] = []

  for (let i = 0; i < actors.length; i++) {
    const actor = actors[i]
    const tmdbId = actor.tmdb_id?.trim()
    const name = actor.name?.trim()

    if (!tmdbId) {
      console.log(`[${i + 1}/${actors.length}] ${name} — no tmdb_id, skipping`)
      enriched.push({ ...actor, gender: '', birth_year: '', biography: '', known_for: '', keywords: '' })
      continue
    }

    try {
      const [person, credits] = await Promise.all([
        tmdbGet(`/person/${tmdbId}`),
        tmdbGet(`/person/${tmdbId}/movie_credits`),
      ])

      const gender = genderLabel(person.gender as number)
      const birthday = person.birthday as string | null
      const birth_year = birthday ? birthday.split('-')[0] : ''
      const biography = ((person.biography as string) ?? '').replace(/\n/g, ' ').trim()
      const known_for = extractKnownFor(credits)
      const keywords = extractKeywords(person, credits)

      console.log(`[${i + 1}/${actors.length}] ${name} — ${gender}, b.${birth_year}, ${keywords}`)

      enriched.push({
        ...actor,
        gender,
        birth_year,
        biography: biography.slice(0, 500), // cap length
        known_for,
        keywords,
      })
    } catch (err) {
      console.error(`[${i + 1}/${actors.length}] ${name} — ERROR: ${err}`)
      enriched.push({ ...actor, gender: '', birth_year: '', biography: '', known_for: '', keywords: '' })
    }

    await sleep(DELAY_MS)
  }

  const out = Papa.unparse(enriched)
  fs.writeFileSync(outPath, out, 'utf8')
  console.log(`\nDone. Written to ${outPath}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
