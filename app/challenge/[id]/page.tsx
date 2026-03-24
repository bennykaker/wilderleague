import { notFound } from 'next/navigation'
import CastingBoard from '../../components/CastingBoard'
import { getEnrichedActors } from '../../data/enrichedActors'
import { getTitle, getRolesForTitle, getSuggestionsForTitle } from '../../data/titles'
import { getChallenge } from '../../data/challenges'

export default async function ChallengePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const challenge = getChallenge(id)
  if (!challenge) notFound()

  const title = getTitle(challenge.movie_slug)
  if (!title) notFound()

  const roles = getRolesForTitle(challenge.movie_slug)
  if (roles.length === 0) notFound()

  const suggestions = getSuggestionsForTitle(challenge.movie_slug)
  const enriched = getEnrichedActors()

  const poolSet = new Set(challenge.actor_pool.map(n => n.toLowerCase()))

  const actors = enriched
    .filter(a => poolSet.has(a.name.toLowerCase()))
    .map(a => ({
      id: a.tmdb_id || a.name,
      name: a.name,
      image: a.headshot_url,
      popularity: a.popularity,
      cost: a.cost,
      salaryConfirmed: a.salary_confirmed,
    }))

  // Filter preloaded suggestions to only include pool actors
  const filteredSuggestions: Record<string, string[]> = {}
  for (const [role, names] of Object.entries(suggestions)) {
    const filtered = names.filter(n => poolSet.has(n.toLowerCase()))
    if (filtered.length > 0) filteredSuggestions[role] = filtered
  }

  return (
    <CastingBoard
      actors={actors}
      roles={roles.map(r => ({
        role_name: r.role_name,
        original_actor: r.original_actor,
        original_actor_image: r.original_actor_image,
      }))}
      title={title.title}
      budget={title.budget}
      preloadedSuggestions={filteredSuggestions}
      challenge={challenge}
    />
  )
}
