import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '../../../../lib/supabase/service'

function popularityToCost(pop: number): number {
  if (pop >= 20) return 12
  if (pop >= 15) return 10
  if (pop >= 12) return 8
  if (pop >= 10) return 6
  if (pop >= 6) return 4
  return 3
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') ?? ''

  const terms = q.toLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) {
    return NextResponse.json({ actors: [] })
  }

  const supabase = createServiceClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from('actors')
    .select('name, tmdb_id, headshot_url, popularity, gender, birth_year, biography, known_for, keywords, cost, salary_estimate, salary_confirmed, casting_profile, universe_tags')
    .order('popularity', { ascending: false })
    .limit(40)

  // Each term must match at least one searchable column (AND across terms, OR across columns)
  for (const term of terms) {
    query = query.or(
      `name.ilike.%${term}%,keywords.ilike.%${term}%,known_for.ilike.%${term}%,casting_profile.ilike.%${term}%,biography.ilike.%${term}%`
    )
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actors = (data ?? []).map((row: any) => {
    const pop = Number(row.popularity) || 0
    return {
      id: row.tmdb_id || row.name,
      name: row.name,
      image: row.headshot_url ?? '',
      popularity: pop,
      cost: row.salary_estimate ?? row.cost ?? popularityToCost(pop),
      salaryConfirmed: row.salary_confirmed ?? false,
      knownFor: row.known_for ?? '',
      biography: row.biography ?? '',
      universeTags: row.universe_tags
        ? row.universe_tags.split(',').map((t: string) => t.trim()).filter(Boolean)
        : [],
      gender: row.gender ?? '',
      birthYear: row.birth_year ?? '',
      keywords: row.keywords ?? '',
      castingProfile: row.casting_profile ?? '',
    }
  })

  return NextResponse.json({ actors })
}
