import { createServiceClient } from '../../lib/supabase/service'

export interface PoolActor {
  name: string
  cost: number
  popularity: number
}

function popularityToCost(pop: number): number {
  if (pop >= 20) return 12
  if (pop >= 15) return 10
  if (pop >= 12) return 8
  if (pop >= 10) return 6
  if (pop >= 6) return 4
  return 3
}

let _cache: PoolActor[] | null = null

export async function getActorPool(): Promise<PoolActor[]> {
  if (_cache) return _cache

  const supabase = createServiceClient()

  const all: PoolActor[] = []
  let from = 0
  const PAGE = 1000

  while (true) {
    const { data, error } = await supabase
      .from('actors')
      .select('name, popularity, cost, salary_estimate')
      .order('popularity', { ascending: false })
      .range(from, from + PAGE - 1)

    if (error) throw new Error(`Failed to fetch actor pool: ${error.message}`)
    if (!data || data.length === 0) break

    for (const row of data) {
      const pop = Number(row.popularity) || 0
      all.push({
        name: row.name,
        popularity: pop,
        cost: row.salary_estimate ?? row.cost ?? popularityToCost(pop),
      })
    }

    if (data.length < PAGE) break
    from += PAGE
  }

  _cache = all
  return _cache
}
