import fs from 'fs'; import path from 'path'; import { createClient } from '@supabase/supabase-js'
const env = path.join(process.cwd(), '.env.local')
if (fs.existsSync(env)) for (const l of fs.readFileSync(env,'utf8').split('\n')) { const m=l.match(/^([^=]+)=(.*)$/); if(m) process.env[m[1].trim()]=m[2].trim() }
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function main() {
  const { data } = await sb.from('titles').select('slug, title, author, type').eq('type', 'book').order('title')
  console.log(JSON.stringify(data, null, 2))
}
main()
