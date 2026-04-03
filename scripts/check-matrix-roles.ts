import { createClient } from '@supabase/supabase-js'
import fs from 'fs'; import path from 'path'
const env = path.join(process.cwd(), '.env.local')
if (fs.existsSync(env)) for (const l of fs.readFileSync(env,'utf8').split('\n')) { const m=l.match(/^([^=]+)=(.*)$/); if(m) process.env[m[1].trim()]=m[2].trim() }
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function main() {
  const { data } = await sb.from('roles').select('id, role_name, tier, original_actor').eq('title_slug', 'the-matrix').order('role_name')
  console.log(JSON.stringify(data, null, 2))
}
main()
