import { NextRequest } from 'next/server'
import { createClient } from '../../../lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const serviceSupabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function computeCastKey(movieSlug: string, selections: Record<string, string>): string {
  const pairs = Object.entries(selections)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([role, actor]) => `${role}:${actor}`)
    .join('|')
  return `${movieSlug}||${pairs}`
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_member, is_director')
    .eq('id', user.id)
    .single()

  if (!profile?.is_member && !profile?.is_director) {
    return Response.json({ error: 'Members only' }, { status: 403 })
  }

  const body = await request.json()
  const { title_slug, title_name, poster_path, selections, total_cost, budget, cast_name } = body

  if (!title_slug || !title_name || !selections) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const cast_key = computeCastKey(title_slug, selections)

  // Look up any existing score from cast_scores
  const { data: existingScore } = await serviceSupabase
    .from('cast_scores')
    .select('ai_summary, green_light_score, quality_score, hear_me_out_score')
    .eq('cast_key', cast_key)
    .single()

  const { data, error } = await supabase
    .from('saved_casts')
    .insert({
      user_id: user.id,
      title_slug,
      title_name,
      poster_path: poster_path || null,
      selections,
      total_cost: total_cost || 0,
      budget: budget || 50,
      cast_name: cast_name || null,
      cast_key,
      ...(existingScore ? {
        ai_score: existingScore.green_light_score,
        quality_score: existingScore.quality_score,
        hear_me_out_score: existingScore.hear_me_out_score,
        ai_summary: existingScore.ai_summary,
      } : {}),
    })
    .select('id')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ id: data.id })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

  const { id, cast_name, is_public } = await request.json()
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if (cast_name !== undefined) updates.cast_name = cast_name
  if (is_public !== undefined) updates.is_public = is_public

  const { error } = await supabase
    .from('saved_casts')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

  const { id } = await request.json()
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 })

  const { error } = await supabase
    .from('saved_casts')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ ok: true })
}
