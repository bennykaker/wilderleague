import { NextRequest } from 'next/server'
import { createServiceClient } from '../../../lib/supabase/service'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')
  const role = searchParams.get('role')

  if (!slug || !role) return Response.json({ picks: [] })

  const service = createServiceClient()
  const { data } = await service
    .from('cast_picks')
    .select('actor_name')
    .eq('movie_slug', slug)
    .eq('role_name', role)
    .limit(500)

  if (!data?.length) return Response.json({ picks: [] })

  const counts: Record<string, number> = {}
  for (const row of data) {
    counts[row.actor_name] = (counts[row.actor_name] ?? 0) + 1
  }

  const picks = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }))

  return Response.json({ picks })
}
