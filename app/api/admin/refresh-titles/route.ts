import { NextRequest } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'
import {refreshTitles} from '../../../../lib/refresh-titles'

export async function GET(req: NextRequest) {
  // Also accept X-Admin-Key for manual triggering
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization')
  const adminKey = req.headers.get('x-admin-key')

  const validCron = cronSecret && authHeader === `Bearer ${cronSecret}`
  const validManual = cronSecret && adminKey === cronSecret

  if (!validCron && !validManual) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return refreshTitles(await createClient(),process.env.TMDB_API_KEY!)
}
