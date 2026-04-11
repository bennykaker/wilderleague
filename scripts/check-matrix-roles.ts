import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const env = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
for (const line of env.split('\n')) {
  const m = line.match(/^([^=]+)=(.*)$/); if (m) process.env[m[1].trim()] = m[2].trim()
}
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function main() {
  const { data } = await sb.from('roles').select('role_name, marlowe_cache, marlowe_quick').eq('title_slug', 'the-matrix')
  for (const r of data ?? []) {
    const cache = r.marlowe_cache as any
    const quick = r.marlowe_quick as any
    console.log(`\n${r.role_name}:`)
    console.log(`  marlowe_cache actors: ${JSON.stringify(cache?.actors ?? [])}`)
    console.log(`  marlowe_quick keys: ${Object.keys(quick ?? {}).join(', ')}`)
  }
}
main()
