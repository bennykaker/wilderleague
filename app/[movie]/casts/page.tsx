import { notFound } from 'next/navigation'
import { getTitle } from '../../data/titles'
import CastsPage from '../../components/CastsPage'

export default async function MovieCastsPage({ params }: { params: Promise<{ movie: string }> }) {
  const { movie: slug } = await params
  const title = await getTitle(slug)
  if (!title) notFound()

  return <CastsPage slug={slug} title={title.title} />
}
