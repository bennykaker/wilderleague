import { NextRequest } from 'next/server'
import { Resend } from 'resend'

export async function POST(req: NextRequest) {
  const { name, email, subject, message } = await req.json()

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return Response.json({ error: 'Missing required fields.' }, { status: 400 })
  }

  const resendKey = process.env.RESEND_API_KEY
  const toEmail = process.env.CORRECTION_EMAIL

  if (!resendKey || !toEmail) {
    console.error('RESEND_API_KEY or CORRECTION_EMAIL not set')
    return Response.json({ error: 'Email service not configured.' }, { status: 500 })
  }

  const resend = new Resend(resendKey)
  await resend.emails.send({
    from: 'Wilder League <onboarding@resend.dev>',
    to: toEmail,
    replyTo: email,
    subject: `Contact: ${subject?.trim() || '(no subject)'} — from ${name}`,
    html: `
      <h2>New contact message</h2>
      <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
        <tr><td style="padding:8px;color:#666;width:100px">Name</td><td style="padding:8px">${name}</td></tr>
        <tr><td style="padding:8px;color:#666">Email</td><td style="padding:8px">${email}</td></tr>
        ${subject?.trim() ? `<tr><td style="padding:8px;color:#666">Subject</td><td style="padding:8px">${subject}</td></tr>` : ''}
        <tr><td style="padding:8px;color:#666;vertical-align:top">Message</td><td style="padding:8px;white-space:pre-wrap">${message}</td></tr>
      </table>
    `,
  })

  return Response.json({ ok: true })
}
