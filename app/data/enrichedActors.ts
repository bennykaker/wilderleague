import { unstable_cache } from 'next/cache'
import { createServiceClient } from '../../lib/supabase/service'

export interface EnrichedActor {
  name: string
  tmdb_id: string
  headshot_url: string
  popularity: number
  gender: string
  birth_year: string
  biography: string
  known_for: string
  keywords: string
  notes: string
  cost: number
  casting_profile?: string
  salary_estimate?: number
  salary_confirmed?: boolean
  nationality?: string
  universe_tags?: string[]
}

const ACTOR_COLUMNS = [
  'name', 'tmdb_id', 'headshot_url', 'popularity',
  'gender', 'birth_year', 'biography', 'known_for',
  'keywords', 'notes', 'cost', 'salary_estimate',
  'salary_confirmed', 'casting_profile', 'nationality', 'universe_tags',
].join(', ')

function popularityToCost(pop: number): number {
  if (pop >= 20) return 12
  if (pop >= 15) return 10
  if (pop >= 12) return 8
  if (pop >= 10) return 6
  if (pop >= 6) return 4
  return 3
}

async function fetchActors(): Promise<EnrichedActor[]> {
  const supabase = createServiceClient()

  const all: EnrichedActor[] = []
  let from = 0
  const PAGE = 1000
  const LIMIT = 2000

  while (all.length < LIMIT) {
    const { data, error } = await supabase
      .from('actors')
      .select(ACTOR_COLUMNS)
      .order('popularity', { ascending: false })
      .range(from, from + PAGE - 1)

    if (error) throw new Error(`Failed to fetch actors: ${error.message}`)
    if (!data || data.length === 0) break

    for (const row of data as any[]) {
      const pop = Number(row.popularity) || 0
      all.push({
        name: row.name,
        tmdb_id: row.tmdb_id ?? '',
        headshot_url: row.headshot_url ?? '',
        popularity: pop,
        gender: row.gender ?? '',
        birth_year: row.birth_year ?? '',
        biography: row.biography ?? '',
        known_for: row.known_for ?? '',
        keywords: row.keywords ?? '',
        notes: row.notes ?? '',
        cost: row.salary_estimate ?? row.cost ?? popularityToCost(pop),
        casting_profile: row.casting_profile ?? undefined,
        salary_estimate: row.salary_estimate ?? undefined,
        salary_confirmed: row.salary_confirmed ?? false,
        nationality: row.nationality ?? undefined,
        universe_tags: row.universe_tags ? row.universe_tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
      })
    }

    if (data.length < PAGE) break
    from += PAGE
  }

  return all
}

// Cache for 1 hour across serverless invocations
const getCachedActors = unstable_cache(fetchActors, ['enriched-actors'], { revalidate: 3600 })

export async function getEnrichedActors(): Promise<EnrichedActor[]> {
  return getCachedActors()
}

export function clearActorCache() {
  // Cache is managed by Next.js — revalidates on next request after TTL
}
