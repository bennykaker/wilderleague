import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const env = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
for (const line of env.split('\n')) {
  const m = line.match(/^([^=]+)=(.*)$/)
  if (m) process.env[m[1].trim()] = m[2].trim()
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function count(tag: string) {
  const { count } = await sb.from('actors').select('*', { count: 'exact', head: true }).ilike('universe_tags', `%${tag}%`)
  return count ?? 0
}

async function main() {
  const tags = ['LorreVerse','SorkVerse','WestWingVerse','GilliganVerse','BreakingBadVerse','SNLVerse','WhoVerse','StarWarsVerse','WhedonVerse','TrekVerse','WireVerse','TolkienVerse','SchurVerse','LawrenceVerse']
  for (const tag of tags) {
    const n = await count(tag)
    console.log(`${String(n).padStart(4)}  ${tag}`)
  }

  const { count: canadian } = await sb.from('actors').select('*', { count: 'exact', head: true }).eq('nationality', 'Canada')
  console.log(`\n${canadian}  nationality: Canada`)
}

main()
