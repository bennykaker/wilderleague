import { createClient } from '../../lib/supabase/server'
import PricingClient from './PricingClient'

export default async function PricingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let isMember = false
  let isDirector = false
  if (user) {
    const { data } = await supabase.from('profiles').select('is_member, is_director').eq('id', user.id).single()
    isMember = data?.is_member ?? false
    isDirector = data?.is_director ?? false
  }

  return <PricingClient user={user ? { email: user.email } : null} isMember={isMember} isDirector={isDirector} />
}
