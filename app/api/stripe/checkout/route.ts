import { NextRequest } from 'next/server'
import { stripe, PRICE_ID } from '../../../../lib/stripe'
import { createClient } from '../../../../lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Not signed in' }, { status: 401 })
  }

  const origin = request.headers.get('origin') ?? 'https://www.wilderleague.com'

  // Fetch or create Stripe customer
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single()

  let customerId = profile?.stripe_customer_id as string | undefined

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { supabase_user_id: user.id },
    })
    customerId = customer.id
    await supabase.from('profiles').upsert({ id: user.id, stripe_customer_id: customerId })
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: PRICE_ID, quantity: 1 }],
    success_url: `${origin}/members?success=1`,
    cancel_url: `${origin}/pricing`,
    metadata: { supabase_user_id: user.id },
  })

  return Response.json({ url: session.url })
}
