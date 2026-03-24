import { notFound } from 'next/navigation'
import { movies } from '../data/movies'
import { getActorPool } from '../data/actorPool'
import CastingPage from '../components/CastingPage'

export default async function MoviePage({
  params,
}: {
  params: Promise<{ movie: string }>
}) {
  const { movie: slug } = await params
  const movie = movies[slug]
  if (!movie) notFound()

  const actors = getActorPool()

  return <CastingPage movie={movie} actors={actors} />
}

export function generateStaticParams() {
  return Object.keys(movies).map(slug => ({ movie: slug }))
}
