import { notFound } from 'next/navigation'
import { getTitles } from '../../data/titles'
import HallOfFameBoard from '../../components/HallOfFameBoard'

export default async function TitleHallOfFamePage({ params }: { params: Promise<{ movie: string }> }) {
  const { movie: slug } = await params
  const titles = await getTitles()
  const title = titles.find(t => t.slug === slug)
  if (!title) notFound()

  return <HallOfFameBoard titleSlug={slug} titleName={title.title} posterPath={title.poster_path ?? null} />
}
