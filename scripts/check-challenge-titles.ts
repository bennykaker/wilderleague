import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const env = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
for (const line of env.split('\n')) {
  const m = line.match(/^([^=]+)=(.*)$/)
  if (m) process.env[m[1].trim()] = m[2].trim()
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const SLUGS = [
  'gladiator', 'lotr-fellowship-of-the-ring', 'parks-and-recreation',
  'the-good-place', 'breaking-bad', 'star-trek-tng', 'star-wars-a-new-hope',
  'the-wire', 'firefly', 'ted-lasso', 'the-west-wing', 'better-call-saul',
  'brooklyn-nine-nine', 'seinfeld', 'curb-your-enthusiasm', 'doctor-who', 'andor',
]

async function main() {
  for (const slug of SLUGS) {
    const { data: title } = await sb.from('titles').select('title').eq('slug', slug).single()
    const { count } = await sb.from('roles').select('*', { count: 'exact', head: true }).eq('title_slug', slug)
    const status = !title ? '❌ NO TITLE' : count === 0 ? '⚠️  NO ROLES' : `✅ ${count} roles`
    console.log(`${status.padEnd(20)} ${slug}`)
  }
}

main()
