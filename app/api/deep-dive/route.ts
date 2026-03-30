import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import { createServiceClient } from '../../../lib/supabase/service'

const DAILY_LIMIT = 10

export async function POST(req: NextRequest) {
  const { query, excludeNames = [] } = await req.json()
  if (!query?.trim()) return NextResponse.json({ actors: [] })

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

  // Members only
  if (!user) return NextResponse.json({ error: 'Members only' }, { status: 403 })

  const { data: profile } = await supabase.from('profiles').select('is_member').eq('id', user.id).single()
  if (!profile?.is_member) return NextResponse.json({ error: 'Members only' }, { status: 403 })

  // Rate limit: 10 deep dives/day per user
  const trackingKey = user.id
  const today = new Date().toISOString().split('T')[0]

  const { data: usage } = await supabase
    .from('review_usage')
    .select('count')
    .eq('ip', trackingKey)
    .eq('date', today)
    .eq('type', 'deep_dive')
    .single()

  const count = usage?.count ?? 0
  if (count >= DAILY_LIMIT) {
    return NextResponse.json({ error: `Deep dive limit reached (${DAILY_LIMIT}/day).` }, { status: 429 })
  }

  await supabase.from('review_usage').upsert(
    { ip: trackingKey, date: today, type: 'deep_dive', count: count + 1 },
    { onConflict: 'ip,date,type' }
  )

  // Search full actor DB beyond top 2000
  const service = createServiceClient()
  const excludeSet = new Set((excludeNames as string[]).map((n: string) => n.toLowerCase()))
  const q = query.toLowerCase().trim()

  const { data: actors, error } = await service
    .from('actors')
    .select('name, headshot_url, popularity, cost, salary_estimate, salary_confirmed, gender, birth_year, known_for, biography, universe_tags')
    .or(`name.ilike.%${q}%,known_for.ilike.%${q}%,keywords.ilike.%${q}%`)
    .order('popularity', { ascending: false })
    .limit(30)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const results = (actors ?? [])
    .filter(a => !excludeSet.has(a.name.toLowerCase()))
    .map(a => ({
      id: a.name,
      name: a.name,
      image: a.headshot_url ?? '',
      popularity: a.popularity ?? 0,
      cost: a.salary_estimate ?? a.cost ?? 3,
      salaryConfirmed: a.salary_confirmed ?? false,
      knownFor: a.known_for ?? '',
      biography: a.biography ?? '',
      universeTags: a.universe_tags ? a.universe_tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
    }))

  return NextResponse.json({ actors: results, remaining: DAILY_LIMIT - count - 1 })
}
