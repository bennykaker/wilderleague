import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ movie: string }> }
) {
  const { movie } = await params
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

  // Get all submissions for this movie with vote counts
  const { data: submissions, error } = await supabase
    .from('submissions')
    .select(`
      id, selections, ai_summary, is_cursed, curse_reason, created_at,
      votes(value)
    `)
    .eq('movie_slug', movie)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!submissions?.length) return NextResponse.json({ best: [], cursed: [] })

  // Tally votes
  const scored = submissions.map(s => {
    const votes = (s.votes as { value: string }[]) ?? []
    const score = votes.filter(v => v.value === 'like').length
      - votes.filter(v => v.value === 'dislike').length
    return { ...s, votes: undefined, score, like_count: votes.filter(v => v.value === 'like').length }
  })

  const cursed = scored.filter(s => s.is_cursed)
  const normal = scored.filter(s => !s.is_cursed)

  // Mix top + random to prevent runaway winners
  function mixedSelection(pool: typeof scored, topN: number, totalN: number) {
    if (pool.length <= totalN) return pool
    const sorted = [...pool].sort((a, b) => b.score - a.score)
    const top = sorted.slice(0, Math.min(topN, pool.length))
    const rest = sorted.slice(topN)
    const shuffled = rest.sort(() => Math.random() - 0.5)
    const random = shuffled.slice(0, totalN - top.length)
    return [...top, ...random].sort(() => Math.random() - 0.5) // mix order
  }

  return NextResponse.json({
    best: mixedSelection(normal, 5, 20),
    cursed: mixedSelection(cursed, 5, 10),
    total: submissions.length,
  })
}
