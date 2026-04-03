import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const title_slug = searchParams.get('title_slug')
  const category = searchParams.get('category') ?? 'best_cast' // 'best_cast' | 'hear_me_out'
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 50)

  let query = serviceSupabase
    .from('saved_casts')
    .select('id, title_slug, title_name, poster_path, selections, total_cost, budget, cast_name, ai_score, quality_score, hear_me_out_score, ai_summary, created_at, user_id')
    .eq('is_public', true)
    .not('ai_score', 'is', null)

  if (title_slug) {
    query = query.eq('title_slug', title_slug)
  }

  const scoreCol = category === 'hear_me_out' ? 'hear_me_out_score' : 'ai_score'
  const { data, error } = await query
    .order(scoreCol, { ascending: false })
    .limit(limit)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Look up usernames
  const userIds = [...new Set((data ?? []).map((r: any) => r.user_id))]
  let usernameMap: Record<string, string> = {}
  if (userIds.length > 0) {
    const { data: profiles } = await serviceSupabase
      .from('profiles')
      .select('id, username')
      .in('id', userIds)
    for (const p of profiles ?? []) {
      if (p.username) usernameMap[p.id] = p.username
    }
  }

  const entries = (data ?? []).map((r: any) => ({
    ...r,
    username: usernameMap[r.user_id] ?? null,
    user_id: undefined,
  }))

  return Response.json({ entries })
}
