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

  const suggestions = getSuggestionsForTitle(slug)
  const actors = enriched.filter(a => a.cost < 8).map(a => ({
    id: a.tmdb_id || a.name,
    name: a.name,
    image: a.headshot_url,
    popularity: a.popularity,
    cost: a.cost,
    salaryConfirmed: a.salary_confirmed,
    knownFor: a.known_for || '',
    biography: a.biography || '',
    universeTags: a.universe_tags ?? [],
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
    />
  )
}
