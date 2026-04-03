import { redirect } from 'next/navigation'
import { createClient } from '../../lib/supabase/server'
import TrophyRoom from '../components/TrophyRoom'

export default async function TrophyRoomPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_member, is_director, username')
    .eq('id', user.id)
    .single()

  if (!profile?.is_member && !profile?.is_director) redirect('/pricing')

  const { data: casts } = await supabase
    .from('saved_casts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return <TrophyRoom casts={casts ?? []} username={profile?.username ?? null} />
}
