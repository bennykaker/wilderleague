import { notFound } from 'next/navigation'
import CastingBoard from '../components/CastingBoard'
import { getEnrichedActors } from '../data/enrichedActors'
import { getTitle, getRolesForTitle, getSuggestionsForTitle } from '../data/titles'

export default async function MoviePage({ params }: { params: Promise<{ movie: string }> }) {
  const { movie: slug } = await params

  const title = getTitle(slug)
  if (!title) notFound()

  const roles = getRolesForTitle(slug)
  if (roles.length === 0) notFound()

  const suggestions = getSuggestionsForTitle(slug)
  const enriched = getEnrichedActors()
  const actors = enriched.map(a => ({
    id: a.tmdb_id || a.name,
    name: a.name,
    image: a.headshot_url,
    popularity: a.popularity,
    cost: a.cost,
    salaryConfirmed: a.salary_confirmed,
  }))

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
      preloadedSuggestions={suggestions}
    />
  )
}
