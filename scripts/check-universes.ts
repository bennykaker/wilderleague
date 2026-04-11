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
  const { data } = await sb.from('actors').select('universe_tags').not('universe_tags', 'is', null).neq('universe_tags', '')

  const counts: Record<string, number> = {}
  for (const row of data ?? []) {
    for (const tag of row.universe_tags.split(',')) {
      const t = tag.trim()
      if (t) counts[t] = (counts[t] ?? 0) + 1
    }
  }

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
  for (const [tag, count] of sorted) {
    console.log(`${count.toString().padStart(5)}  ${tag}`)
  }
}

main()
