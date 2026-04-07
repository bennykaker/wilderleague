import { NextRequest } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'
import { createServiceClient } from '../../../../lib/supabase/service'

async function requireDirector() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const service = createServiceClient()
  const { data: profile } = await service.from('profiles').select('is_director').eq('id', user.id).single()
  return profile?.is_director ? service : null
}

// GET /api/admin/users?email=...
export async function GET(req: NextRequest) {
  const service = await requireDirector()
  if (!service) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const email = req.nextUrl.searchParams.get('email')?.trim().toLowerCase()
  if (!email) return Response.json({ error: 'email param required' }, { status: 400 })

  // Look up auth user by email
  const { data: { users }, error } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const authUser = users.find(u => u.email?.toLowerCase() === email)
  if (!authUser) return Response.json({ error: 'No user found with that email.' }, { status: 404 })

  const { data: profile } = await service
    .from('profiles')
    .select('is_member, is_director, username')
    .eq('id', authUser.id)
    .single()

  return Response.json({
    id: authUser.id,
    email: authUser.email,
    username: profile?.username ?? null,
    is_member: profile?.is_member ?? false,
    is_director: profile?.is_director ?? false,
  })
}

// PATCH /api/admin/users  { id, is_member?, is_director? }
export async function PATCH(req: NextRequest) {
  const service = await requireDirector()
  if (!service) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, is_member, is_director } = await req.json()
  if (!id) return Response.json({ error: 'id required' }, { status: 400 })

  const updates: Record<string, boolean> = {}
  if (is_member !== undefined) updates.is_member = is_member
  if (is_director !== undefined) updates.is_director = is_director

  if (Object.keys(updates).length === 0) return Response.json({ error: 'Nothing to update' }, { status: 400 })

  const { error } = await service.from('profiles').update(updates).eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ ok: true })
}
