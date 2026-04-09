import { notFound } from 'next/navigation'
import CastingBoard from '../../components/CastingBoard'
import { getEnrichedActors, type EnrichedActor } from '../../data/enrichedActors'
import { getTitle, getRolesForTitle, getSuggestionsForTitle } from '../../data/titles'
import { getChallenge, type ChallengeFilter } from '../../data/challenges'

// Chuck Lorre shows — matched against actor.known_for field
const CLCU_SHOWS = [
  'The Big Bang Theory', 'Two and a Half Men', 'Mom', 'Young Sheldon',
  'Mike & Molly', 'Two Broke Girls', 'Dharma & Greg', 'Bob Hearts Abishola',
  'United States of Al', 'Ghosts (US)', 'Roseanne', 'The Kominsky Method',
]

function actorMatchesFilter(a: EnrichedActor, filter: ChallengeFilter): boolean {
  // CLCU special case — matched against curated show list
  if (filter.known_for_tag === 'CLCU') {
    const knownFor = a.known_for ?? ''
    if (!CLCU_SHOWS.some(show => knownFor.includes(show))) return false
  }

  // known_for_shows — actor must appear in at least one listed show
  if (filter.known_for_shows && filter.known_for_shows.length > 0) {
    const knownFor = a.known_for ?? ''
    if (!filter.known_for_shows.some(show => knownFor.includes(show))) return false
  }

  // universe_tag — actor.universe_tags must include the tag
  if (filter.universe_tag) {
    const tags = a.universe_tags ?? []
    if (!tags.includes(filter.universe_tag)) return false
  }

  // nationality (include) — actor.nationality must contain the string
  if (filter.nationality) {
    const nat = (a.nationality ?? '').toLowerCase()
    if (!nat.includes(filter.nationality.toLowerCase())) return false
  }

  // nationality_exclude — actor.nationality must NOT contain the string
  if (filter.nationality_exclude) {
    const nat = (a.nationality ?? '').toLowerCase()
    if (nat.includes(filter.nationality_exclude.toLowerCase())) return false
  }

  // race_ethnicity — actor.race_ethnicity must contain the string
  if (filter.race_ethnicity) {
    const re = (a.race_ethnicity ?? '').toLowerCase()
    if (!re.includes(filter.race_ethnicity.toLowerCase())) return false
  }

  // gender — exact match
  if (filter.gender) {
    if (a.gender !== filter.gender) return false
  }

  // birth_year_max — actor must be born in this year or earlier
  if (filter.birth_year_max !== undefined) {
    const by = parseInt(a.birth_year ?? '0')
    if (!by || by > filter.birth_year_max) return false
  }

  // birth_year_min — actor must be born in this year or later
  if (filter.birth_year_min !== undefined) {
    const by = parseInt(a.birth_year ?? '0')
    if (!by || by < filter.birth_year_min) return false
  }

  // keywords_include — actor.keywords must contain the string
  if (filter.keywords_include) {
    const kw = (a.keywords ?? '').toLowerCase()
    const bio = (a.biography ?? '').toLowerCase()
    const cp = (a.casting_profile ?? '').toLowerCase()
    const needle = filter.keywords_include.toLowerCase()
    if (!kw.includes(needle) && !bio.includes(needle) && !cp.includes(needle)) return false
  }

  return true
}

export default async function ChallengePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const challenge = getChallenge(id)
  if (!challenge) notFound()

  const title = await getTitle(challenge.movie_slug)
  if (!title) notFound()

  const roles = await getRolesForTitle(challenge.movie_slug)
  if (roles.length === 0) notFound()

  const suggestions = getSuggestionsForTitle(challenge.movie_slug)
  const enriched = await getEnrichedActors()

  // Build actor pool
  const explicitNames = new Set(challenge.actor_pool.map(n => n.toLowerCase()))
  const hasFilter = !!challenge.actor_filter && Object.keys(challenge.actor_filter).length > 0
  const hasConstraint = hasFilter || explicitNames.size > 0

  const poolActors = (hasConstraint
    ? enriched.filter(a => {
        // Explicit names always pass
        if (explicitNames.has(a.name.toLowerCase())) return true
        // Apply data-driven filter
        if (hasFilter) return actorMatchesFilter(a, challenge.actor_filter!)
        return false
      })
    : enriched
  // No cost cap on constrained pools — the pool is already narrow, don't exclude anyone
  // For unconstrained boards, cap at 8 to prevent all-star stacking
  ).filter(a => hasConstraint ? true : a.cost < 8)

  const actors = poolActors.map(a => ({
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

  const poolNameSet = new Set(actors.map(a => a.name.toLowerCase()))

  // Build Marlowe's Picks: each role gets 6 unique suggestions from the pool.
  // Use a global seen set so the same actor isn't suggested for multiple roles.
  const filteredSuggestions: Record<string, string[]> = {}
  const genderMap = new Map(enriched.map(a => [a.name.toLowerCase(), a.gender ?? '']))
  const poolSorted = [...poolActors].sort((a, b) => b.popularity - a.popularity)
  const globalSeen = new Set<string>()

  for (const role of roles) {
    const csvNames = (suggestions[role.role_name] ?? []).filter(n => poolNameSet.has(n.toLowerCase()))
    csvNames.forEach(n => globalSeen.add(n.toLowerCase()))
    if (csvNames.length >= 6) { filteredSuggestions[role.role_name] = csvNames.slice(0, 6); continue }

    // Match gender of original actor so we don't suggest men for female roles
    const originalGender = genderMap.get((role.original_actor ?? '').toLowerCase()) ?? ''
    const genderFiltered = originalGender
      ? poolSorted.filter(a => a.gender === originalGender).map(a => a.name)
      : poolSorted.map(a => a.name)

    const extras: string[] = []
    const localSeen = new Set(csvNames.map(n => n.toLowerCase()))

    // First pass: prefer actors not yet suggested for other roles
    for (const name of genderFiltered) {
      const key = name.toLowerCase()
      if (globalSeen.has(key) || localSeen.has(key)) continue
      extras.push(name)
      localSeen.add(key)
      globalSeen.add(key)
      if (csvNames.length + extras.length >= 6) break
    }

    // Second pass: if still under 6, allow repeats from same-gender pool
    if (csvNames.length + extras.length < 6) {
      for (const name of genderFiltered) {
        const key = name.toLowerCase()
        if (localSeen.has(key)) continue
        extras.push(name)
        localSeen.add(key)
        if (csvNames.length + extras.length >= 6) break
      }
    }

    const combined = [...csvNames, ...extras]
    if (combined.length > 0) filteredSuggestions[role.role_name] = combined
  }

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
      slug={challenge.movie_slug}
      budget={title.budget}
      preloadedSuggestions={filteredSuggestions}
      challenge={challenge}
    />
  )
}
