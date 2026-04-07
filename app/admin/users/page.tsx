import { notFound } from 'next/navigation'
import { createClient } from '../../../lib/supabase/server'
import { createServiceClient } from '../../../lib/supabase/service'
import UsersClient from './UsersClient'

export default async function AdminUsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const service = createServiceClient()
  const { data: profile } = await service.from('profiles').select('is_director').eq('id', user.id).single()
  if (!profile?.is_director) notFound()

  return <UsersClient />
}
