import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { getChallenge } from '../../../data/challenges'
import { getTitle } from '../../../data/titles'
import ChallengeTop10Client from '../../../components/ChallengeTop10Client'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function ChallengeTop10Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const challenge = getChallenge(id)
  if (!challenge) notFound()

  const title = await getTitle(challenge.movie_slug)
  if (!title) notFound()

  const { data: submissions } = await supabase
    .from('submissions')
    .select('id, selections, ai_summary, green_light_score, quality_score, hear_me_out_score, award')
    .eq('challenge_id', id)
    .eq('scored', true)
    .order('green_light_score', { ascending: false })

  return (
    <ChallengeTop10Client
      submissions={submissions ?? []}
      challengeHeadline={challenge.headline}
      challengeId={id}
      movieTitle={title.title}
    />
  )
}
