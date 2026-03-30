import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '../../../lib/supabase/server'
import { getTitle, getRolesForTitle } from '../../data/titles'
import ResultsClient from './ResultsClient'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const authClient = await createServerClient()

  const [{ data: submission, error }, { data: { user } }] = await Promise.all([
    supabase
      .from('submissions')
      .select('id, movie_slug, selections, ai_summary, green_light_score, quality_score, hear_me_out_score, award, scored')
      .eq('id', id)
      .single(),
    authClient.auth.getUser(),
  ])

  if (error || !submission) notFound()

  const [title, roles] = await Promise.all([
    getTitle(submission.movie_slug),
    getRolesForTitle(submission.movie_slug),
  ])

  if (!title) notFound()

  const selections: Record<string, string> = submission.selections ?? {}
  const actorNames = Object.values(selections).filter(Boolean)

  const [{ data: actorRows }, isMemberResult] = await Promise.all([
    supabase.from('actors').select('name, cost').in('name', actorNames),
    user
      ? authClient.from('profiles').select('is_member').eq('id', user.id).single()
      : Promise.resolve({ data: null }),
  ])

  const isMember = (isMemberResult as { data: { is_member?: boolean } | null })?.data?.is_member ?? false

  const costMap: Record<string, number> = {}
  for (const a of actorRows ?? []) costMap[a.name] = a.cost

  const cast = roles
    .filter(r => selections[r.role_name])
    .map(r => ({
      role: r.role_name,
      tier: r.tier ?? 'supporting',
      actor: selections[r.role_name],
      cost: costMap[selections[r.role_name]] ?? 0,
    }))

  const spent = cast.reduce((sum, c) => sum + c.cost, 0)

  return (
    <ResultsClient
      submissionId={submission.id}
      movieTitle={title.title}
      movieSlug={submission.movie_slug}
      summary={submission.ai_summary ?? ''}
      greenLight={submission.green_light_score ?? 0}
      quality={submission.quality_score ?? 0}
      hearMeOut={submission.hear_me_out_score ?? 0}
      award={submission.award ?? null}
      cast={cast}
      budget={title.budget}
      spent={spent}
      isMember={isMember}
      scored={submission.scored ?? false}
    />
  )
}
