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

  const { data: submission, error } = await supabase
    .from('submissions')
    .select('id, movie_slug, selections, ai_summary, green_light_score, quality_score, hear_me_out_score, award, scored')
    .eq('id', id)
    .single()

  if (error || !submission) notFound()

  const title = await getTitle(submission.movie_slug)
  if (!title) notFound()

  const roles = await getRolesForTitle(submission.movie_slug)
  const selections: Record<string, string> = submission.selections ?? {}

  // Fetch actor costs from DB
  const actorNames = Object.values(selections).filter(Boolean)
  const { data: actorRows } = await supabase
    .from('actors')
    .select('name, cost')
    .in('name', actorNames)

  const costMap: Record<string, number> = {}
  for (const a of actorRows ?? []) costMap[a.name] = a.cost

  // Build cast list in role order
  const cast = roles
    .filter(r => selections[r.role_name])
    .map(r => ({
      role: r.role_name,
      tier: r.tier ?? 'supporting',
      actor: selections[r.role_name],
      cost: costMap[selections[r.role_name]] ?? 0,
    }))

  const spent = cast.reduce((sum, c) => sum + c.cost, 0)

  const authClient = await createServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  let isMember = false
  if (user) {
    const { data: profile } = await authClient.from('profiles').select('is_member').eq('id', user.id).single()
    isMember = profile?.is_member ?? false
  }

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
