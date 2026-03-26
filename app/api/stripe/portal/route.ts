import { NextRequest } from 'next/server'
import { stripe } from '../../../../lib/stripe'
import { createClient } from '../../../../lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single()

  if (!profile?.stripe_customer_id) {
    return Response.json({ error: 'No billing account found' }, { status: 404 })
  }

  const origin = request.headers.get('origin') ?? 'https://www.wilderleague.com'
  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${origin}/members`,
  })

  return Response.json({ url: session.url })
}
