import { NextRequest } from 'next/server'
import { createClient } from '../../../lib/supabase/server'

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
  const { title_slug, title_name, poster_path, selections, total_cost, budget } = body

  if (!title_slug || !title_name || !selections) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 })
  }

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
    })
    .select('id')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ id: data.id })
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
