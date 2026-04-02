import { createClient } from '@supabase/supabase-js'
import fs from 'fs'; import path from 'path'
const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) { for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) { const m = line.match(/^([^=]+)=(.*)$/); if (m) process.env[m[1].trim()] = m[2].trim() } }
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function main() {
  const names = ['Julia Louis-Dreyfus', 'Seth Rogen', 'Sarah Michelle Gellar', 'Nick Offerman', 'Jonah Hill', 'Larry David']
  const { data } = await sb.from('actors').select('name, known_for, keywords, biography').in('name', names)
  data?.forEach((a: any) => console.log(`\n${a.name}\n  known_for: ${a.known_for}\n  keywords: ${a.keywords?.slice(0,120)}\n  bio: ${a.biography?.slice(0,100)}`))
}
main().catch(console.error)
