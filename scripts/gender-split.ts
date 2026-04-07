import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([^=]+)=(.*)$/)
    if (m) process.env[m[1].trim()] = m[2].trim()
  }
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function main() {
  let all: { gender: string | null }[] = []
  let from = 0
  while (true) {
    const { data } = await sb.from('actors').select('gender').range(from, from + 999)
    if (!data?.length) break
    all.push(...data)
    if (data.length < 1000) break
    from += 1000
  }

  const counts: Record<string, number> = {}
  for (const r of all) {
    const g = r.gender || 'unknown'
    counts[g] = (counts[g] ?? 0) + 1
  }
  const total = all.length
  for (const [g, n] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
    console.log(g.padEnd(12), String(n).padStart(5), '  ', ((n / total) * 100).toFixed(1) + '%')
  }
  console.log('─'.repeat(30))
  console.log('total'.padEnd(12), String(total).padStart(5))
}

main().catch(console.error)
