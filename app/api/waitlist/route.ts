import { NextRequest } from 'next/server'
import { createServiceClient } from '../../../lib/supabase/service'

export async function POST(req: NextRequest) {
  const { email } = await req.json()

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: 'Invalid email.' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { error } = await supabase
    .from('waitlist')
    .insert({ email: email.toLowerCase().trim() })

  if (error) {
    if (error.code === '23505') {
      // Already on the list — treat as success so we don't leak whether an email exists
      return Response.json({ ok: true })
    }
    console.error('Waitlist insert error:', error)
    return Response.json({ error: 'Failed to add to waitlist.' }, { status: 500 })
  }

  // Send confirmation via Resend if configured
  const resendKey = process.env.RESEND_API_KEY
  if (resendKey) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
        body: JSON.stringify({
          from: 'Wilder League <noreply@wilderleague.com>',
          to: email,
          subject: "You're on the Wilder League waitlist",
          html: `<p>You're on the list. We'll email you as soon as there's room — shouldn't be long.</p><p>— Wilder League</p>`,
        }),
      })
    } catch (e) {
      console.error('Resend error (non-fatal):', e)
    }
  }

  return Response.json({ ok: true })
}
