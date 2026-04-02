import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createServiceClient } from '../../../lib/supabase/service'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.exchangeCodeForSession(code)

    if (user) {
      const service = createServiceClient()

      // Check capacity for new users
      const { data: profile } = await service
        .from('profiles')
        .select('username, created_at')
        .eq('id', user.id)
        .single()

      const isNewUser = profile?.created_at
        ? Date.now() - new Date(profile.created_at).getTime() < 60_000
        : false

      if (isNewUser) {
        // Check against signup limit
        const { data: limitRow } = await service
          .from('config')
          .select('value')
          .eq('key', 'signup_limit')
          .single()

        const { data: openRow } = await service
          .from('config')
          .select('value')
          .eq('key', 'signup_open')
          .single()

        const signupOpen = openRow?.value !== 'false'
        const limit = parseInt(limitRow?.value ?? '1000', 10)

        if (!signupOpen) {
          await supabase.auth.signOut()
          return NextResponse.redirect(`${origin}/hugged`)
        }

        if (!isNaN(limit)) {
          const { count } = await service
            .from('profiles')
            .select('id', { count: 'exact', head: true })

          if ((count ?? 0) > limit) {
            await supabase.auth.signOut()
            return NextResponse.redirect(`${origin}/hugged`)
          }
        }
      }

      // Existing or new-under-limit user: check for username
      if (!profile?.username) {
        return NextResponse.redirect(`${origin}/set-username?next=${encodeURIComponent(next)}`)
      }
    }
  }

  return NextResponse.redirect(`${origin}${next}`)
}
