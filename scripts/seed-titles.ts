/**
 * Seeds data/titles.csv and data/roles.csv from TMDB for all 50 titles.
 * Run with: npm run seed-titles
 *
 * Safe to re-run — merges with existing data, preserves manual edits.
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

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

async function tmdb(endpoint: string) {
  const res = await fetch(`https://api.themoviedb.org/3${endpoint}`, {
    headers: { Authorization: `Bearer ${TOKEN}`, accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`TMDB ${res.status}: ${endpoint}`)
  return res.json() as Promise<Record<string, any>>
}

// ── Title list ────────────────────────────────────────────────────────────────

const TITLES = [
  // Movies
  { slug: 'the-matrix',               title: 'The Matrix',                        year: 1999, type: 'movie', budget: 100 },
  { slug: 'terminator-2',             title: 'Terminator 2: Judgment Day',        year: 1991, type: 'movie', budget: 100 },
  { slug: 'aliens',                   title: 'Aliens',                            year: 1986, type: 'movie', budget: 80  },
  { slug: 'blade-runner',             title: 'Blade Runner',                      year: 1982, type: 'movie', budget: 80  },
  { slug: 'the-dark-knight',          title: 'The Dark Knight',                   year: 2008, type: 'movie', budget: 150 },
  { slug: 'inception',                title: 'Inception',                         year: 2010, type: 'movie', budget: 150 },
  { slug: 'interstellar',             title: 'Interstellar',                      year: 2014, type: 'movie', budget: 150 },
  { slug: 'mad-max-fury-road',        title: 'Mad Max: Fury Road',                year: 2015, type: 'movie', budget: 100 },
  { slug: 'jurassic-park',            title: 'Jurassic Park',                     year: 1993, type: 'movie', budget: 100 },
  { slug: 'gladiator',                title: 'Gladiator',                         year: 2000, type: 'movie', budget: 100 },
  { slug: 'the-godfather',            title: 'The Godfather',                     year: 1972, type: 'movie', budget: 100 },
  { slug: 'the-godfather-ii',         title: 'The Godfather Part II',             year: 1974, type: 'movie', budget: 100 },
  { slug: 'goodfellas',               title: 'GoodFellas',                        year: 1990, type: 'movie', budget: 100 },
  { slug: 'pulp-fiction',             title: 'Pulp Fiction',                      year: 1994, type: 'movie', budget: 80  },
  { slug: 'schindlers-list',          title: "Schindler's List",                  year: 1993, type: 'movie', budget: 80  },
  { slug: 'shawshank-redemption',     title: 'The Shawshank Redemption',          year: 1994, type: 'movie', budget: 80  },
  { slug: 'silence-of-the-lambs',     title: 'The Silence of the Lambs',          year: 1991, type: 'movie', budget: 80  },
  { slug: 'no-country-for-old-men',   title: 'No Country for Old Men',            year: 2007, type: 'movie', budget: 80  },
  { slug: 'there-will-be-blood',      title: 'There Will Be Blood',               year: 2007, type: 'movie', budget: 80  },
  { slug: 'fargo',                    title: 'Fargo',                             year: 1996, type: 'movie', budget: 60  },
  { slug: 'jaws',                     title: 'Jaws',                              year: 1975, type: 'movie', budget: 80  },
  { slug: 'the-shining',              title: 'The Shining',                       year: 1980, type: 'movie', budget: 80  },
  { slug: 'se7en',                    title: 'Se7en',                             year: 1995, type: 'movie', budget: 80  },
  { slug: 'heat',                     title: 'Heat',                              year: 1995, type: 'movie', budget: 100 },
  { slug: 'rear-window',              title: 'Rear Window',                       year: 1954, type: 'movie', budget: 60  },
  { slug: 'psycho',                   title: 'Psycho',                            year: 1960, type: 'movie', budget: 60  },
  { slug: 'ferris-buellers-day-off',  title: "Ferris Bueller's Day Off",          year: 1986, type: 'movie', budget: 60  },
  { slug: 'the-big-lebowski',         title: 'The Big Lebowski',                  year: 1998, type: 'movie', budget: 60  },
  { slug: 'groundhog-day',            title: 'Groundhog Day',                     year: 1993, type: 'movie', budget: 60  },
  { slug: 'superbad',                 title: 'Superbad',                          year: 2007, type: 'movie', budget: 60  },
  { slug: 'raiders-of-the-lost-ark',  title: 'Raiders of the Lost Ark',           year: 1981, type: 'movie', budget: 100 },
  { slug: 'the-empire-strikes-back',  title: 'The Empire Strikes Back',           year: 1980, type: 'movie', budget: 150 },
  { slug: 'back-to-the-future',       title: 'Back to the Future',               year: 1985, type: 'movie', budget: 80  },
  { slug: 'fellowship-of-the-ring',   title: 'The Lord of the Rings: The Fellowship of the Ring', year: 2001, type: 'movie', budget: 150 },
  { slug: 'the-princess-bride',       title: 'The Princess Bride',               year: 1987, type: 'movie', budget: 60  },
  { slug: 'chinatown',                title: 'Chinatown',                         year: 1974, type: 'movie', budget: 60  },
  { slug: 'apocalypse-now',           title: 'Apocalypse Now',                    year: 1979, type: 'movie', budget: 80  },
  { slug: 'alien',                    title: 'Alien',                             year: 1979, type: 'movie', budget: 80  },
  // TV Shows
  { slug: 'the-sopranos',             title: 'The Sopranos',                      year: 1999, type: 'tv',    budget: 80  },
  { slug: 'breaking-bad',             title: 'Breaking Bad',                      year: 2008, type: 'tv',    budget: 80  },
  { slug: 'the-wire',                 title: 'The Wire',                          year: 2002, type: 'tv',    budget: 80  },
  { slug: 'game-of-thrones',          title: 'Game of Thrones',                   year: 2011, type: 'tv',    budget: 150 },
  { slug: 'the-west-wing',            title: 'The West Wing',                     year: 1999, type: 'tv',    budget: 80  },
  { slug: 'mad-men',                  title: 'Mad Men',                           year: 2007, type: 'tv',    budget: 80  },
  { slug: 'succession',               title: 'Succession',                        year: 2018, type: 'tv',    budget: 100 },
  { slug: 'seinfeld',                 title: 'Seinfeld',                          year: 1989, type: 'tv',    budget: 80  },
  { slug: 'the-office',               title: 'The Office',                        year: 2005, type: 'tv',    budget: 60  },
  { slug: 'arrested-development',     title: 'Arrested Development',              year: 2003, type: 'tv',    budget: 60  },
  { slug: 'deadwood',                 title: 'Deadwood',                          year: 2004, type: 'tv',    budget: 80  },
  { slug: 'oz',                       title: 'Oz',                                year: 1997, type: 'tv',    budget: 60  },
]

// ── TMDB fetch helpers ────────────────────────────────────────────────────────

async function searchTitle(entry: typeof TITLES[0]): Promise<{ tmdb_id: number; poster_path: string; backdrop_path: string; logline: string; tmdb_year: number } | null> {
  const yearParam = entry.type === 'movie' ? `&year=${entry.year}` : `&first_air_date_year=${entry.year}`
  const endpoint = entry.type === 'movie'
    ? `/search/movie?query=${encodeURIComponent(entry.title)}${yearParam}`
    : `/search/tv?query=${encodeURIComponent(entry.title)}${yearParam}`

  const data = await tmdb(endpoint)
  const results = (data.results ?? []) as any[]

  // Try exact year first, then loosen by ±1 year
  let hit = results[0]
  if (!hit) return null

  return {
    tmdb_id: hit.id,
    poster_path: hit.poster_path ? `https://image.tmdb.org/t/p/w500${hit.poster_path}` : '',
    backdrop_path: hit.backdrop_path ? `https://image.tmdb.org/t/p/w1280${hit.backdrop_path}` : '',
    logline: (hit.overview ?? '').slice(0, 160),
    tmdb_year: parseInt((hit.release_date ?? hit.first_air_date ?? `${entry.year}`).slice(0, 4)),
  }
}

async function fetchCast(tmdbId: number, type: string): Promise<Array<{ character: string; name: string; profile_path: string | null }>> {
  const endpoint = type === 'movie'
    ? `/movie/${tmdbId}/credits`
    : `/tv/${tmdbId}/credits`

  const data = await tmdb(endpoint)
  const cast = ((data.cast ?? []) as any[])
    .filter((c: any) => c.known_for_department === 'Acting' || type === 'tv')
    .slice(0, 7)

  return cast.map((c: any) => ({
    character: (c.character ?? c.roles?.[0]?.character ?? '').replace(/\s*\(.*\)/, '').trim(),
    name: c.name,
    profile_path: c.profile_path ? `https://image.tmdb.org/t/p/w500${c.profile_path}` : '',
  })).filter(c => c.character)
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const titlesPath = path.join(process.cwd(), 'data', 'titles.csv')
  const rolesPath = path.join(process.cwd(), 'data', 'roles.csv')

  // Load existing data
  type TitleRow = Record<string, string>
  type RoleRow = Record<string, string>

  const existingTitles = new Map<string, TitleRow>()
  const existingRoles: RoleRow[] = []

  if (fs.existsSync(titlesPath)) {
    const parsed = Papa.parse<TitleRow>(fs.readFileSync(titlesPath, 'utf8'), { header: true, skipEmptyLines: true })
    parsed.data.forEach(r => existingTitles.set(r.slug, r))
  }
  if (fs.existsSync(rolesPath)) {
    const parsed = Papa.parse<RoleRow>(fs.readFileSync(rolesPath, 'utf8'), { header: true, skipEmptyLines: true })
    // Only keep roles that have a movie_slug (new format)
    parsed.data.filter(r => r.movie_slug).forEach(r => existingRoles.push(r))
  }

  const existingRoleKey = new Set(existingRoles.map(r => `${r.movie_slug}::${r.role_name}`))

  const titleRows: TitleRow[] = []
  const roleRows: RoleRow[] = [...existingRoles]

  for (let i = 0; i < TITLES.length; i++) {
    const entry = TITLES[i]
    process.stdout.write(`[${i + 1}/${TITLES.length}] ${entry.title}... `)

    // Skip if already fully seeded
    if (existingTitles.has(entry.slug) && existingRoles.some(r => r.movie_slug === entry.slug)) {
      titleRows.push(existingTitles.get(entry.slug)!)
      console.log('skipped (already seeded)')
      continue
    }

    try {
      const info = await searchTitle(entry)
      if (!info) { console.log('NOT FOUND'); titleRows.push(existingTitles.get(entry.slug) ?? {} as TitleRow); continue }
      await sleep(260)

      const cast = await fetchCast(info.tmdb_id, entry.type)
      await sleep(260)

      titleRows.push({
        slug: entry.slug,
        title: entry.title,
        year: String(info.tmdb_year || entry.year),
        type: entry.type,
        tmdb_id: String(info.tmdb_id),
        poster_path: info.poster_path,
        backdrop_path: info.backdrop_path,
        logline: info.logline,
        budget: String(entry.budget),
      })

      for (const c of cast) {
        const key = `${entry.slug}::${c.character}`
        if (!existingRoleKey.has(key) && c.character) {
          roleRows.push({
            movie_slug: entry.slug,
            role_name: c.character,
            original_actor: c.name,
            original_actor_image: c.profile_path ?? '',
          })
          existingRoleKey.add(key)
        }
      }

      console.log(`✓ (${cast.length} roles)`)
    } catch (err) {
      console.log(`FAILED: ${err}`)
      if (existingTitles.has(entry.slug)) titleRows.push(existingTitles.get(entry.slug)!)
    }
  }

  fs.writeFileSync(titlesPath, Papa.unparse(titleRows), 'utf8')
  fs.writeFileSync(rolesPath, Papa.unparse(roleRows), 'utf8')

  console.log(`\nDone. ${titleRows.length} titles, ${roleRows.length} roles written.`)
}

main().catch(err => { console.error(err); process.exit(1) })
