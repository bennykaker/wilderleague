import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  const RECIPIENT = process.env.ART_SUBMISSION_EMAIL
  const data = await req.formData()

  const name      = (data.get('name')      as string | null)?.trim() ?? ''
  const email     = (data.get('email')     as string | null)?.trim() ?? ''
  const title     = (data.get('title')     as string | null)?.trim() ?? ''
  const character = (data.get('character') as string | null)?.trim() ?? ''
  const message   = (data.get('message')   as string | null)?.trim() ?? ''
  const file      = data.get('file') as File | null

  if (!name || !email || !title || !file) {
    return Response.json({ error: 'Missing required fields.' }, { status: 400 })
  }

  if (file.size > 10 * 1024 * 1024) {
    return Response.json({ error: 'File too large. Max 10MB.' }, { status: 400 })
  }

  if (!RECIPIENT) {
    console.error('ART_SUBMISSION_EMAIL not set')
    return Response.json({ error: 'Email service not configured.' }, { status: 500 })
  }

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    console.error('RESEND_API_KEY not set')
    return Response.json({ error: 'Email service not configured.' }, { status: 500 })
  }

  const fileBuffer = await file.arrayBuffer()
  const fileBase64 = Buffer.from(fileBuffer).toString('base64')

  const html = `
    <h2>New character art submission</h2>
    <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px;">
      <tr><td style="padding:4px 12px 4px 0;color:#666;font-weight:600;">Artist</td><td>${name}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666;font-weight:600;">Email</td><td>${email}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666;font-weight:600;">Title</td><td>${title}</td></tr>
      ${character ? `<tr><td style="padding:4px 12px 4px 0;color:#666;font-weight:600;">Character</td><td>${character}</td></tr>` : ''}
      ${message ? `<tr><td style="padding:4px 12px 4px 0;color:#666;font-weight:600;vertical-align:top;">Notes</td><td style="white-space:pre-wrap;">${message}</td></tr>` : ''}
    </table>
  `

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
    body: JSON.stringify({
      from: 'Wilder League <onboarding@resend.dev>',
      to: RECIPIENT,
      reply_to: email,
      subject: `Art submission: ${title}${character ? ` — ${character}` : ''} (from ${name})`,
      html,
      attachments: [{
        filename: file.name,
        content: fileBase64,
      }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('Resend error:', err)
    return Response.json({ error: 'Failed to send. Please try again.' }, { status: 500 })
  }

  return Response.json({ ok: true })
}
