import { Resend } from 'resend'
import { NextRequest } from 'next/server'
import fs from 'fs'
import path from 'path'

function getEnvVar(key: string): string {
  if (process.env[key]) return process.env[key]!
  try {
    const file = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
    const match = file.match(new RegExp(`^${key}=(.+)$`, 'm'))
    return match?.[1]?.trim() ?? ''
  } catch { return '' }
}

interface CorrectionRequest {
  actorName: string
  actorId?: string
  field: string
  currentValue: string
  suggestedValue: string
  notes?: string
}

export async function POST(request: NextRequest) {
  const body = await request.json() as CorrectionRequest
  const { actorName, field, currentValue, suggestedValue, notes } = body

  if (!actorName || !field || !suggestedValue) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const resendKey = getEnvVar('RESEND_API_KEY')
  const toEmail = getEnvVar('CORRECTION_EMAIL')

  if (!resendKey || !toEmail) {
    return Response.json({ error: 'Email not configured' }, { status: 500 })
  }

  const resend = new Resend(resendKey)

  try {
    await resend.emails.send({
      from: 'Wilderleague <onboarding@resend.dev>',
      to: toEmail,
      subject: `Actor correction: ${actorName} — ${field}`,
      html: `
        <h2>Actor Data Correction</h2>
        <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
          <tr><td style="padding:8px;color:#666;width:140px">Actor</td><td style="padding:8px;font-weight:bold">${actorName}</td></tr>
          <tr><td style="padding:8px;color:#666">Field</td><td style="padding:8px">${field}</td></tr>
          <tr><td style="padding:8px;color:#666">Current value</td><td style="padding:8px;color:#999">${currentValue || '(empty)'}</td></tr>
          <tr><td style="padding:8px;color:#666">Suggested value</td><td style="padding:8px;color:#16a34a;font-weight:bold">${suggestedValue}</td></tr>
          ${notes ? `<tr><td style="padding:8px;color:#666">Notes</td><td style="padding:8px">${notes}</td></tr>` : ''}
        </table>
      `,
    })

    return Response.json({ ok: true })
  } catch (err) {
    console.error('Resend error:', err)
    return Response.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
