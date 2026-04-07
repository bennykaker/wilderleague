import { notFound } from 'next/navigation'
import CastingBoard from '../components/CastingBoard'
import { getEnrichedActors } from '../data/enrichedActors'
import { getTitle, getRolesForTitle, getSuggestionsForTitle } from '../data/titles'
import { createClient } from '../../lib/supabase/server'

export default async function MoviePage({ params }: { params: Promise<{ movie: string }> }) {
  const { movie: slug } = await params

  const supabase = await createClient()

  const [title, roles, enriched, { data: { user } }] = await Promise.all([
    getTitle(slug),
    getRolesForTitle(slug),
    getEnrichedActors(),
    supabase.auth.getUser(),
  ])

  if (!title) notFound()
  if (roles.length === 0) notFound()

  let isMember = false
  let isDirector = false
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('is_member, is_director').eq('id', user.id).single()
    isMember = profile?.is_member ?? false
    isDirector = profile?.is_director ?? false
  }

  const rawSuggestions = getSuggestionsForTitle(slug)
  const costMap = new Map(enriched.map(a => [a.name.toLowerCase(), a.cost]))
  const raceMap = new Map(enriched.map(a => [a.name.toLowerCase(), a.race_ethnicity ?? '']))

  // Build Marlowe's Picks per role:
  // - If original actor is Black, only suggest Black actors
  // - Otherwise, affordable actors only (cost < 8), padded to ~6 from marlowe caches
  const suggestions: Record<string, string[]> = {}
  for (const role of roles) {
    const originalRace = raceMap.get((role.original_actor ?? '').toLowerCase()) ?? ''
    const blackRole = originalRace.toLowerCase().includes('black')

    const quick = (role.marlowe_quick as Record<string, { actors?: string[] }> | null) ?? {}
    const cacheActors = (role.marlowe_cache as { actors?: string[] } | null)?.actors ?? []
    const csvNames = rawSuggestions[role.role_name] ?? []

    if (blackRole) {
      // Only suggest Black actors — pull from all sources and filter
      const candidates = [...csvNames, ...(quick['cheaper']?.actors ?? []), ...cacheActors]
      const seen = new Set<string>()
      const picks: string[] = []
      for (const name of candidates) {
        const key = name.toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        if (raceMap.get(key)?.toLowerCase().includes('black')) picks.push(name)
        if (picks.length >= 6) break
      }
      if (picks.length > 0) suggestions[role.role_name] = picks
      continue
    }

    // Standard: affordable actors, padded to ~6
    const csv = csvNames.filter(n => (costMap.get(n.toLowerCase()) ?? 99) < 8)
    if (csv.length >= 6) { suggestions[role.role_name] = csv; continue }

    const seen = new Set(csv.map(n => n.toLowerCase()))
    const extras: string[] = []
    const candidates = [
      ...(quick['cheaper']?.actors ?? []),
      ...cacheActors,
    ]
    for (const name of candidates) {
      if (seen.has(name.toLowerCase())) continue
      if ((costMap.get(name.toLowerCase()) ?? 99) >= 8) continue
      extras.push(name)
      seen.add(name.toLowerCase())
      if (csv.length + extras.length >= 6) break
    }
    const combined = [...csv, ...extras]
    if (combined.length > 0) suggestions[role.role_name] = combined
  }

  const actors = enriched.map(a => ({
    id: a.tmdb_id || a.name,
    name: a.name,
    image: a.headshot_url,
    popularity: a.popularity,
    cost: a.cost,
    salaryConfirmed: a.salary_confirmed,
    knownFor: a.known_for || '',
    biography: a.biography || '',
    universeTags: a.universe_tags ?? [],
    gender: a.gender || '',
    birthYear: a.birth_year || '',
    keywords: a.keywords || '',
    castingProfile: a.casting_profile || '',
  }))


  return (
    <CastingBoard
      actors={actors}
      roles={roles.map(r => ({
        role_name: r.role_name,
        original_actor: r.original_actor,
        original_actor_image: r.original_actor_image,
        tier: r.tier,
        marlowe_cache: r.marlowe_cache ?? null,
        marlowe_quick: r.marlowe_quick ?? null,
      }))}
      title={title.title}
      slug={slug}
      budget={title.budget}
      titleType={title.type}
      preloadedSuggestions={suggestions}
      isMember={isMember}
      isDirector={isDirector}
      rebootPotential={title.reboot_potential ?? null}
      rebootNotes={title.reboot_notes ?? null}
    />
  )
}
