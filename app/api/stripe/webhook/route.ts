import { NextRequest } from 'next/server'
import { stripe, PRICE_ID_DIRECTOR } from '../../../../lib/stripe'
import { createServiceClient } from '../../../../lib/supabase/service'
import Stripe from 'stripe'

function tierFromPriceId(priceId: string): { is_member: boolean; is_director: boolean } {
  const isDirector = priceId === PRICE_ID_DIRECTOR
  return { is_member: true, is_director: isDirector }
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    return Response.json({ error: `Webhook signature failed: ${err}` }, { status: 400 })
  }

  const supabase = createServiceClient()

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const userId = session.metadata?.supabase_user_id
    if (userId && session.subscription) {
      // Retrieve the subscription to get the price ID
      const sub = await stripe.subscriptions.retrieve(session.subscription as string)
      const priceId = sub.items.data[0]?.price?.id ?? ''
      const { is_member, is_director } = tierFromPriceId(priceId)
      await supabase.from('profiles').upsert({
        id: userId,
        is_member,
        is_director,
        stripe_subscription_id: session.subscription as string,
        stripe_subscription_status: 'active',
        updated_at: new Date().toISOString(),
      })
    }
  }

  if (event.type === 'customer.subscription.updated') {
    const sub = event.data.object as Stripe.Subscription
    const customer = await stripe.customers.retrieve(sub.customer as string)
    if (customer.deleted) return Response.json({ ok: true })
    const userId = (customer as Stripe.Customer).metadata?.supabase_user_id
    if (userId) {
      const active = sub.status === 'active' || sub.status === 'trialing'
      const priceId = sub.items.data[0]?.price?.id ?? ''
      const { is_director } = tierFromPriceId(priceId)
      await supabase.from('profiles').upsert({
        id: userId,
        is_member: active,
        is_director: active ? is_director : false,
        stripe_subscription_status: sub.status,
        updated_at: new Date().toISOString(),
      })
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription
    const customer = await stripe.customers.retrieve(sub.customer as string)
    if (customer.deleted) return Response.json({ ok: true })
    const userId = (customer as Stripe.Customer).metadata?.supabase_user_id
    if (userId) {
      await supabase.from('profiles').upsert({
        id: userId,
        is_member: false,
        is_director: false,
        stripe_subscription_status: 'canceled',
        updated_at: new Date().toISOString(),
      })
    }
  }

  return Response.json({ ok: true })
}
