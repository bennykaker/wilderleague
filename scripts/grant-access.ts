import fs from 'fs'; import path from 'path'; import { createClient } from '@supabase/supabase-js'
const env = path.join(process.cwd(), '.env.local')
if (fs.existsSync(env)) for (const l of fs.readFileSync(env,'utf8').split('\n')) { const m=l.match(/^([^=]+)=(.*)$/); if(m) process.env[m[1].trim()]=m[2].trim() }
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function main() {
  // Find the user by email via auth.users
  const { data: { users }, error } = await sb.auth.admin.listUsers()
  if (error) { console.error(error); return }
  const user = users.find(u => u.email === 'kenbakerprivate@gmail.com')
  if (!user) { console.log('User not found — have they signed in yet?'); return }
  console.log('Found user:', user.id)
  const { error: e2 } = await sb.from('profiles').update({ is_member: true, is_director: true }).eq('id', user.id)
  if (e2) console.error(e2)
  else console.log('Done — is_member + is_director set to true')
}
main()
