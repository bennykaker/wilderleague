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
  const { name, sag_aftra, credits, imdb_url, tmdb_url, youtube_url, notes } = body

  if (!name?.trim()) {
    return Response.json({ error: 'Name is required' }, { status: 400 })
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
  await service.from('actor_submissions').insert({
    name: name.trim(),
    sag_aftra: sag_aftra ?? null,
    credits: credits?.trim() || null,
    imdb_url: imdb_url?.trim() || null,
    tmdb_url: tmdb_url?.trim() || null,
    youtube_url: youtube_url?.trim() || null,
    notes: notes?.trim() || null,
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
      subject: `Actor submission: ${name}${isMember ? ' [Member]' : ''}`,
      html: `
        <h2>New Actor Submission</h2>
        <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
          <tr><td style="padding:8px;color:#666;width:140px">Name</td><td style="padding:8px;font-weight:bold">${name}</td></tr>
          <tr><td style="padding:8px;color:#666">Member</td><td style="padding:8px">${isMember ? 'Yes' : 'No'}</td></tr>
          <tr><td style="padding:8px;color:#666">SAG-AFTRA</td><td style="padding:8px">${sag_aftra == null ? 'Unknown' : sag_aftra ? 'Yes' : 'No'}</td></tr>
          ${credits ? `<tr><td style="padding:8px;color:#666">Credits</td><td style="padding:8px">${credits}</td></tr>` : ''}
          ${imdb_url ? `<tr><td style="padding:8px;color:#666">IMDb</td><td style="padding:8px"><a href="${imdb_url}">${imdb_url}</a></td></tr>` : ''}
          ${tmdb_url ? `<tr><td style="padding:8px;color:#666">TMDB</td><td style="padding:8px"><a href="${tmdb_url}">${tmdb_url}</a></td></tr>` : ''}
          ${youtube_url ? `<tr><td style="padding:8px;color:#666">YouTube</td><td style="padding:8px"><a href="${youtube_url}">${youtube_url}</a></td></tr>` : ''}
          ${notes ? `<tr><td style="padding:8px;color:#666">Notes</td><td style="padding:8px">${notes}</td></tr>` : ''}
          ${user?.email ? `<tr><td style="padding:8px;color:#666">Submitted by</td><td style="padding:8px">${user.email}</td></tr>` : ''}
        </table>
      `,
    }).catch(() => {})
  }

  return Response.json({ ok: true })
}
