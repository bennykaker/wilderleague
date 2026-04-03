import fs from 'fs'; import path from 'path'; import { createClient } from '@supabase/supabase-js'
const env = path.join(process.cwd(), '.env.local')
if (fs.existsSync(env)) for (const l of fs.readFileSync(env,'utf8').split('\n')) { const m=l.match(/^([^=]+)=(.*)$/); if(m) process.env[m[1].trim()]=m[2].trim() }
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function main() {
  const { data } = await sb.from('roles').select('title_slug, role_name')
  const counts: Record<string, Record<string, number>> = {}
  for (const r of data ?? []) {
    ;(counts[r.title_slug] ??= {})[r.role_name] = (counts[r.title_slug][r.role_name] ?? 0) + 1
  }
  const dupes = Object.entries(counts)
    .flatMap(([slug, roles]) => Object.entries(roles).filter(([,c]) => c > 1).map(([role, c]) => `${slug}: ${role} (×${c})`))
  if (dupes.length) console.log(dupes.join('\n'))
  else console.log('No duplicates found.')
}
main()
