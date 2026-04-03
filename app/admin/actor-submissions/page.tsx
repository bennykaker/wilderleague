import { notFound } from 'next/navigation'
import { createClient } from '../../../lib/supabase/server'
import { createServiceClient } from '../../../lib/supabase/service'
import ActorSubmissionsClient from './ActorSubmissionsClient'

export default async function AdminActorSubmissionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const service = createServiceClient()
  const { data: profile } = await service.from('profiles').select('is_director').eq('id', user.id).single()
  if (!profile?.is_director) notFound()

  const { data: submissions } = await service
    .from('actor_submissions')
    .select('*')
    .order('is_member', { ascending: false })
    .order('created_at', { ascending: false })

  return <ActorSubmissionsClient submissions={submissions ?? []} />
}
