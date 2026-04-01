import { notFound } from 'next/navigation'
import CastingBoard from '../../components/CastingBoard'
import { getEnrichedActors } from '../../data/enrichedActors'
import { getTitle, getRolesForTitle, getSuggestionsForTitle } from '../../data/titles'
import { getChallenge } from '../../data/challenges'

// Chuck Lorre shows — used to match known_for field after seed-clcu-actors runs
const CLCU_SHOWS = [
  'The Big Bang Theory', 'Two and a Half Men', 'Mom', 'Young Sheldon',
  'Mike & Molly', 'Two Broke Girls', 'Dharma & Greg', 'Bob Hearts Abishola',
  'United States of Al', 'Ghosts (US)', 'Roseanne', 'The Kominsky Method',
]

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

  // Build actor pool: filter by constraint, explicit list, or use everyone
  const isClcu = challenge.actor_filter?.known_for_tag === 'CLCU'
  const explicitNames = new Set(challenge.actor_pool.map(n => n.toLowerCase()))
  const hasConstraint = isClcu || explicitNames.size > 0

  const poolActors = hasConstraint
    ? enriched.filter(a => {
        if (isClcu) {
          const knownFor = a.known_for ?? ''
          if (CLCU_SHOWS.some(show => knownFor.includes(show))) return true
        }
        return explicitNames.has(a.name.toLowerCase())
      })
    : enriched

  const actors = poolActors.map(a => ({
    id: a.tmdb_id || a.name,
    name: a.name,
    image: a.headshot_url,
    popularity: a.popularity,
    cost: a.cost,
    salaryConfirmed: a.salary_confirmed,
  }))

  const poolNameSet = new Set(actors.map(a => a.name.toLowerCase()))

  // Filter preloaded suggestions to pool actors only
  const filteredSuggestions: Record<string, string[]> = {}
  for (const [role, names] of Object.entries(suggestions)) {
    const filtered = names.filter(n => poolNameSet.has(n.toLowerCase()))
    if (filtered.length > 0) filteredSuggestions[role] = filtered
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
