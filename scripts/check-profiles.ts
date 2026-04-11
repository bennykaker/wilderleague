import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const env = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
for (const line of env.split('\n')) {
  const m = line.match(/^([^=]+)=(.*)$/)
  if (m) process.env[m[1].trim()] = m[2].trim()
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function main() {
  const { count: total } = await sb.from('actors').select('*', { count: 'exact', head: true })
  const { count: missing } = await sb.from('actors').select('*', { count: 'exact', head: true }).or('casting_profile.is.null,casting_profile.eq.')
  console.log('Total actors:', total)
  console.log('Missing casting_profile:', missing)
  console.log('Have casting_profile:', (total ?? 0) - (missing ?? 0))
}

main()
