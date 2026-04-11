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
  const { data } = await sb.from('actors').select('name, nationality').ilike('nationality', '%canada%').order('name')
  console.log(`Actors with nationality containing "canada": ${data?.length}`)
  data?.forEach(a => console.log(`  ${a.name} — ${a.nationality}`))
}

main()
