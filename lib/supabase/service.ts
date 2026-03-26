import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

function getKey(name: string): string {
  if (process.env[name]) return process.env[name]!
  try {
    const file = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
    const match = file.match(new RegExp(`^${name}=(.+)$`, 'm'))
    return match?.[1]?.trim() ?? ''
  } catch { return '' }
}

export function createServiceClient() {
  return createClient(
    getKey('NEXT_PUBLIC_SUPABASE_URL'),
    getKey('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false } }
  )
}
