import { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  const { username } = await req.json()

  if (!username || !/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return Response.json({ error: 'Invalid username. Use 3–20 letters, numbers, or underscores.' }, { status: 400 })
  }

  const cookieStore = await cookies()
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
  if (!user) return Response.json({ error: 'Not signed in.' }, { status: 401 })

  const { error } = await supabase
    .from('profiles')
    .update({ username })
    .eq('id', user.id)

  if (error) {
    if (error.code === '23505') {
      return Response.json({ error: 'That username is taken. Try another.' }, { status: 409 })
    }
    return Response.json({ error: 'Failed to save username.' }, { status: 500 })
  }

  return Response.json({ ok: true })
}
