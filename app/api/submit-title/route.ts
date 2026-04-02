import { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '../../../lib/supabase/service'
import { cookies } from 'next/headers'
import { Resend } from 'resend'

function getEnv(key: string): string {
  if (process.env[key]) return process.env[key]!
  try {
    const fs = require('fs'), path = require('path')
    const file = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
    const match = file.match(new RegExp(`^${key}=(.+)$`, 'm'))
    return match?.[1]?.trim() ?? ''
  } catch { return '' }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { title, year, type, reason } = body

  if (!title?.trim()) {
    return Response.json({ error: 'Title is required' }, { status: 400 })
  }

  const cookieStore = await cookies()
  const userSupabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await userSupabase.auth.getUser()
  let isMember = false
  if (user) {
    const { data: profile } = await userSupabase.from('profiles').select('is_member, is_director').eq('id', user.id).single()
    isMember = (profile?.is_member || profile?.is_director) ?? false
  }

  const service = createServiceClient()
  await service.from('title_submissions').insert({
    title: title.trim(),
    year: year ? Number(year) : null,
    type: type ?? 'movie',
    reason: reason?.trim() || null,
    submitted_by: user?.id ?? null,
    submitter_email: user?.email ?? null,
    is_member: isMember,
  })

  const resendKey = getEnv('RESEND_API_KEY')
  const toEmail = getEnv('CORRECTION_EMAIL')
  if (resendKey && toEmail) {
    const resend = new Resend(resendKey)
    await resend.emails.send({
      from: 'Wilderleague <onboarding@resend.dev>',
      to: toEmail,
      subject: `Title submission: ${title}${isMember ? ' [Member]' : ''}`,
      html: `
        <h2>New Title Submission</h2>
        <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
          <tr><td style="padding:8px;color:#666;width:140px">Title</td><td style="padding:8px;font-weight:bold">${title}</td></tr>
          <tr><td style="padding:8px;color:#666">Year</td><td style="padding:8px">${year || 'Not provided'}</td></tr>
          <tr><td style="padding:8px;color:#666">Type</td><td style="padding:8px">${type === 'tv' ? 'TV Series' : 'Movie'}</td></tr>
          <tr><td style="padding:8px;color:#666">Member</td><td style="padding:8px">${isMember ? 'Yes' : 'No'}</td></tr>
          ${reason ? `<tr><td style="padding:8px;color:#666">Why</td><td style="padding:8px">${reason}</td></tr>` : ''}
          ${user?.email ? `<tr><td style="padding:8px;color:#666">Submitted by</td><td style="padding:8px">${user.email}</td></tr>` : ''}
        </table>
      `,
    }).catch(() => {})
  }

  return Response.json({ ok: true })
}
