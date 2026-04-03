import fs from 'fs'; import path from 'path'; import { createClient } from '@supabase/supabase-js'
const env = path.join(process.cwd(), '.env.local')
if (fs.existsSync(env)) for (const l of fs.readFileSync(env,'utf8').split('\n')) { const m=l.match(/^([^=]+)=(.*)$/); if(m) process.env[m[1].trim()]=m[2].trim() }
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function main() {
  const { data } = await sb.from('roles').select('id, role_name, tier, title_slug').ilike('title_slug', '%sopranos%').order('role_name')
  console.log(`Slugs found: ${[...new Set(data?.map(r => r.title_slug))].join(', ')}`)
  console.log(`Total rows: ${data?.length}`)
  for (const r of data ?? []) console.log(`${r.title_slug} | ${r.role_name} (${r.tier})`)
}
main()
