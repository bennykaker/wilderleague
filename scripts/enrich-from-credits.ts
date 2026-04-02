/**
 * Enrich actor data from TMDB title credits.
 *
 * For each title in our DB:
 *   - TV:    /tv/{tmdb_id}/aggregate_credits  (full series cast inc. guests, sorted by episode count)
 *   - Movie: /movie/{tmdb_id}/credits
 *
 * For each credited actor:
 *   - If in our DB → append title to known_for (if not already there)
 *   - If NOT in our DB AND top-15 billed → fetch full profile, insert
 *
 * After all titles processed → re-runs universe tag logic on every updated actor.
 *
 * Run with: npx tsx scripts/enrich-from-credits.ts
 * Safe to re-run — known_for deduplicates, new actors skipped if already present.
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
const TMDB_HEADERS = { Authorization: `Bearer ${TMDB_KEY}` }

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

function tmdbGender(g: number): string {
  if (g === 1) return 'female'
  if (g === 2) return 'male'
  if (g === 3) return 'non-binary'
  return ''
}

function popularityToCost(pop: number): number {
  if (pop >= 20) return 12
  if (pop >= 15) return 10
  if (pop >= 12) return 8
  if (pop >= 10) return 6
  if (pop >= 6) return 4
  return 3
}

// ── Universe tag logic (inlined from tag-universes.ts) ──────────────────────

const UNIVERSES: Record<string, string[]> = {
  CLCU: [
    'The Big Bang Theory', 'Two and a Half Men', 'Mom', 'Young Sheldon',
    'Mike & Molly', 'Two Broke Girls', 'Dharma & Greg', 'Bob Hearts Abishola',
    'United States of Al', 'The Kominsky Method', 'Roseanne', 'Ghosts (US)',
    'Grace Under Fire', 'Cybill',
  ],
  Schurverse: [
    'The Office', 'Parks and Recreation', 'Parks & Recreation',
    'Brooklyn Nine-Nine', 'The Good Place', 'Rutherford Falls', 'Cheers',
  ],
  SeinfeldCU: ['Seinfeld', 'Curb Your Enthusiasm'],
  HBOverlap: [
    'The Sopranos', 'The Wire', 'Deadwood', 'Six Feet Under', 'Oz',
    'Boardwalk Empire', 'True Detective', 'Game of Thrones', 'Succession',
    'Barry', 'The Leftovers', 'Treme', 'Rome', 'Carnivàle',
    'In Treatment', 'The Newsroom', 'The Night Of', 'Big Little Lies',
    'Sharp Objects', 'Watchmen', 'Lovecraft Country', 'Mare of Easttown',
    'The White Lotus', 'Euphoria', 'House of the Dragon',
  ],
  SorkVerse: [
    'The West Wing', 'The Social Network', 'The Newsroom', 'Sports Night',
    'Studio 60 on the Sunset Strip', 'A Few Good Men', 'Moneyball',
    "Charlie Wilson's War", 'The American President',
  ],
  PTAverse: [
    'Boogie Nights', 'Magnolia', 'There Will Be Blood', 'Punch-Drunk Love',
    'The Master', 'Phantom Thread', 'Licorice Pizza', 'Hard Eight', 'Inherent Vice',
  ],
  CoenBros: [
    'Fargo', 'The Big Lebowski', 'No Country for Old Men', 'True Grit',
    'Burn After Reading', 'O Brother, Where Art Thou?', "Miller's Crossing",
    'Barton Fink', 'Blood Simple', 'Raising Arizona', 'The Man Who Wasn\'t There',
    'Intolerable Cruelty', 'The Ladykillers', 'A Serious Man', 'Hail, Caesar!',
  ],
  NolaNation: [
    'The Dark Knight', 'Batman Begins', 'The Dark Knight Rises',
    'Inception', 'Interstellar', 'Memento', 'Dunkirk', 'Tenet',
    'Oppenheimer', 'Insomnia', 'The Prestige', 'Following',
  ],
  Apatowverse: [
    'Superbad', 'Knocked Up', 'The 40-Year-Old Virgin', 'Freaks and Geeks',
    'Funny People', 'This Is 40', 'Pineapple Express', 'Anchorman',
    'Step Brothers', 'Talladega Nights', 'Bridesmaids', 'Girls',
    'Love', 'Undeclared',
  ],
  FXFamily: [
    'The Americans', 'Justified', 'Sons of Anarchy', 'The Shield',
    "It's Always Sunny in Philadelphia", 'Atlanta', 'Archer',
    'American Horror Story', 'Fargo', 'Pose', 'Mayans M.C.',
    'Rescue Me', 'Nip/Tuck', 'Damages', 'Terriers', 'Louie',
    "You're the Worst", 'Better Things',
  ],
  DCU: ['The Sopranos', 'The Many Saints of Newark'],
  AltmanPool: [
    'MASH', 'Nashville', 'Short Cuts', 'Gosford Park', 'The Player',
    'Ready to Wear', "Cookie's Fortune", 'Dr. T and the Women',
    'A Prairie Home Companion', 'Kansas City',
  ],
  Whedonverse: [
    'Buffy the Vampire Slayer', 'Angel', 'Firefly', 'Serenity',
    'Dollhouse', 'Agents of S.H.I.E.L.D.', 'The Avengers',
    'Avengers: Age of Ultron', 'Much Ado About Nothing', 'Cabin in the Woods',
    "Dr. Horrible's Sing-Along Blog",
  ],
}

function assignTags(knownFor: string): string[] {
  const titles = new Set(
    knownFor.split(/[;,]/).map(t => t.trim().toLowerCase()).filter(Boolean)
  )
  const tags: string[] = []
  for (const [tag, shows] of Object.entries(UNIVERSES)) {
    if (shows.some(show => titles.has(show.toLowerCase()))) tags.push(tag)
  }
  return tags
}

// ── TMDB fetch helpers ───────────────────────────────────────────────────────

async function fetchCredits(tmdbId: string, type: string): Promise<{ id: number; name: string; order: number; episodeCount?: number; profilePath: string | null; gender: number; popularity: number }[]> {
  try {
    if (type === 'tv') {
      const res = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}/aggregate_credits`, { headers: TMDB_HEADERS })
      const data = await res.json() as { cast?: any[] }
      return (data.cast ?? []).map(c => ({
        id: c.id,
        name: c.name,
        order: c.order ?? 999,
        episodeCount: c.total_episode_count ?? 0,
        profilePath: c.profile_path ?? null,
        gender: c.gender ?? 0,
        popularity: c.popularity ?? 0,
      }))
    } else {
      const res = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}/credits`, { headers: TMDB_HEADERS })
      const data = await res.json() as { cast?: any[] }
      return (data.cast ?? []).map(c => ({
        id: c.id,
        name: c.name,
        order: c.order ?? 999,
        profilePath: c.profile_path ?? null,
        gender: c.gender ?? 0,
        popularity: c.popularity ?? 0,
      }))
    }
  } catch {
    return []
  }
}

async function fetchPersonProfile(tmdbId: number): Promise<{ name: string; biography: string; birthday: string | null; known_for_department: string; profile_path: string | null; popularity: number; gender: number; also_known_as: string[] } | null> {
  try {
    const res = await fetch(`https://api.themoviedb.org/3/person/${tmdbId}`, { headers: TMDB_HEADERS })
    return await res.json() as any
  } catch {
    return null
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Load all titles
  const { data: titles, error: titlesError } = await supabase
    .from('titles')
    .select('slug, title, type, tmdb_id')
    .not('tmdb_id', 'is', null)
    .not('tmdb_id', 'eq', '')
  if (titlesError) throw new Error(titlesError.message)
  console.log(`Processing ${titles!.length} titles...\n`)

  // Load all existing actors indexed by tmdb_id and name
  console.log('Loading existing actors...')
  const existingByTmdbId = new Map<string, { id: string; name: string; known_for: string }>()
  const existingByName = new Map<string, { id: string; name: string; known_for: string }>()
  let from = 0
  while (true) {
    const { data: batch } = await supabase.from('actors').select('id, name, tmdb_id, known_for').range(from, from + 999)
    if (!batch || batch.length === 0) break
    for (const a of batch as any[]) {
      if (a.tmdb_id) existingByTmdbId.set(String(a.tmdb_id), a)
      existingByName.set(a.name.toLowerCase().trim(), a)
    }
    if (batch.length < 1000) break
    from += 1000
  }
  console.log(`Loaded ${existingByTmdbId.size} actors by TMDB ID, ${existingByName.size} by name.\n`)

  // Track which actor IDs were updated (for universe tag re-run)
  const updatedActorIds = new Set<string>()

  let titlesProcessed = 0
  let actorsUpdated = 0
  let actorsAdded = 0

  for (const title of titles as any[]) {
    const mediaType = title.type === 'tv' ? 'tv' : 'movie'
    const cast = await fetchCredits(title.tmdb_id, mediaType)

    if (cast.length === 0) {
      console.log(`  ✗ No cast: ${title.title}`)
      await sleep(250)
      continue
    }

    // Sort: TV by episode count desc, movies by billing order asc
    const sorted = mediaType === 'tv'
      ? [...cast].sort((a, b) => (b.episodeCount ?? 0) - (a.episodeCount ?? 0))
      : [...cast].sort((a, b) => a.order - b.order)

    for (let i = 0; i < sorted.length; i++) {
      const member = sorted[i]
      const tmdbIdStr = String(member.id)
      const isTop15 = i < 15

      // Look up existing actor
      const existing = existingByTmdbId.get(tmdbIdStr)
        ?? existingByName.get(member.name.toLowerCase().trim())

      if (existing) {
        // Update known_for if title not already present
        const currentTitles = new Set(
          (existing.known_for ?? '').split(/[;,]/).map((t: string) => t.trim().toLowerCase()).filter(Boolean)
        )
        if (!currentTitles.has(title.title.toLowerCase())) {
          const newKnownFor = existing.known_for
            ? `${existing.known_for}; ${title.title}`
            : title.title

          const tags = assignTags(newKnownFor)
          const { error } = await supabase
            .from('actors')
            .update({
              known_for: newKnownFor,
              universe_tags: tags.length > 0 ? tags.join(',') : null,
            })
            .eq('id', existing.id)

          if (!error) {
            existing.known_for = newKnownFor
            updatedActorIds.add(existing.id)
            actorsUpdated++
          }
        }
      } else if (isTop15) {
        // New actor — fetch full profile and insert
        await sleep(250)
        const profile = await fetchPersonProfile(member.id)
        if (!profile) continue

        const birthYear = profile.birthday ? profile.birthday.slice(0, 4) : ''
        const knownFor = title.title
        const tags = assignTags(knownFor)
        const pop = profile.popularity ?? member.popularity ?? 0
        const headshotUrl = profile.profile_path ? `${TMDB_IMG}${profile.profile_path}` : ''

        const { data: inserted, error: insertError } = await supabase
          .from('actors')
          .insert({
            name: profile.name,
            tmdb_id: String(member.id),
            headshot_url: headshotUrl,
            popularity: pop,
            gender: tmdbGender(profile.gender),
            birth_year: birthYear,
            biography: profile.biography ?? '',
            known_for: knownFor,
            keywords: '',
            notes: '',
            cost: popularityToCost(pop),
            universe_tags: tags.length > 0 ? tags.join(',') : null,
          })
          .select('id')
          .single()

        if (!insertError && inserted) {
          existingByTmdbId.set(tmdbIdStr, { id: inserted.id, name: profile.name, known_for: knownFor })
          existingByName.set(profile.name.toLowerCase().trim(), { id: inserted.id, name: profile.name, known_for: knownFor })
          actorsAdded++
        }
      }
    }

    titlesProcessed++
    console.log(`  [${titlesProcessed}/${titles!.length}] ${title.title} — ${sorted.length} cast members`)
    await sleep(250)
  }

  console.log(`\nDone.`)
  console.log(`  Titles processed: ${titlesProcessed}`)
  console.log(`  Actors updated (known_for): ${actorsUpdated}`)
  console.log(`  New actors added: ${actorsAdded}`)
  console.log(`  Universe tags refreshed on updated actors.`)
}

main().catch(console.error)
