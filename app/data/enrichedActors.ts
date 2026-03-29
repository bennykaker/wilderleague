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
  archetype?: string
  strengths?: string
  weaknesses?: string
  best_cast_as?: string
  signature_quality?: string
  career_stage?: string
  casting_profile?: string
  deep_dive_date?: string
  salary_estimate?: number
  salary_confirmed?: boolean
}

function popularityToCost(pop: number): number {
  if (pop >= 20) return 12
  if (pop >= 15) return 10
  if (pop >= 12) return 8
  if (pop >= 10) return 6
  if (pop >= 6) return 4
  return 3
}

let _cache: EnrichedActor[] | null = null

export async function getEnrichedActors(): Promise<EnrichedActor[]> {
  if (_cache) return _cache

  const supabase = createServiceClient()

  // Fetch all actors in pages of 1000
  const all: EnrichedActor[] = []
  let from = 0
  const PAGE = 1000

  while (true) {
    const { data, error } = await supabase
      .from('actors')
      .select('*')
      .order('popularity', { ascending: false })
      .range(from, from + PAGE - 1)

    if (error) throw new Error(`Failed to fetch actors: ${error.message}`)
    if (!data || data.length === 0) break

    for (const row of data) {
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
        archetype: row.archetype ?? undefined,
        strengths: row.strengths ?? undefined,
        weaknesses: row.weaknesses ?? undefined,
        best_cast_as: row.best_cast_as ?? undefined,
        signature_quality: row.signature_quality ?? undefined,
        career_stage: row.career_stage ?? undefined,
        casting_profile: row.casting_profile ?? undefined,
        deep_dive_date: row.deep_dive_date ?? undefined,
        salary_estimate: row.salary_estimate ?? undefined,
        salary_confirmed: row.salary_confirmed ?? false,
      })
    }

    if (data.length < PAGE) break
    from += PAGE
  }

  _cache = all
  return _cache
}

export function clearActorCache() {
  _cache = null
}
