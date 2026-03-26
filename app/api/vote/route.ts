import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'

export async function POST(req: NextRequest) {
  const { submission_id, value } = await req.json()

  if (!submission_id || !['like', 'meh', 'dislike'].includes(value)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const cookieStore = await cookies()
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  const supabase = createServerClient(
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

  const { data: { user } } = await supabase.auth.getUser()

  // Upsert vote (update if already voted)
  const { error } = await supabase.from('votes').upsert(
    {
      submission_id,
      user_id: user?.id ?? null,
      ip: user ? null : ip,
      value,
    },
    { onConflict: user ? 'submission_id,user_id' : 'submission_id,ip' }
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
