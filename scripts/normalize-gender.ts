/**
 * Normalizes gender field: 'M' → 'male', 'F' → 'female', anything else stays or clears.
 * Safe to re-run.
 * Run with: npx tsx scripts/normalize-gender.ts
 */

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
  // First show current distribution
  const all: { id: string; gender: string | null }[] = []
  let from = 0
  while (true) {
    const { data } = await sb.from('actors').select('id, gender').range(from, from + 999)
    if (!data?.length) break
    all.push(...data)
    if (data.length < 1000) break
    from += 1000
  }

  const counts: Record<string, number> = {}
  for (const r of all) {
    const g = r.gender ?? 'null'
    counts[g] = (counts[g] ?? 0) + 1
  }
  console.log('Before:')
  for (const [g, n] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
    console.log(`  "${g}": ${n}`)
  }

  async function batchUpdate(ids: string[], gender: string) {
    const CHUNK = 200
    let fixed = 0
    for (let i = 0; i < ids.length; i += CHUNK) {
      const chunk = ids.slice(i, i + CHUNK)
      const { error } = await sb.from('actors').update({ gender }).in('id', chunk)
      if (error) { console.error(`Error at chunk ${i}:`, error.message); continue }
      fixed += chunk.length
    }
    return fixed
  }

  // Fix 'M' → 'male'
  const mIds = all.filter(r => r.gender === 'M').map(r => r.id)
  if (mIds.length) {
    const fixed = await batchUpdate(mIds, 'male')
    console.log(`\nFixed ${fixed} 'M' → 'male'`)
  }

  // Fix 'F' → 'female'
  const fIds = all.filter(r => r.gender === 'F').map(r => r.id)
  if (fIds.length) {
    const fixed = await batchUpdate(fIds, 'female')
    console.log(`Fixed ${fixed} 'F' → 'female'`)
  }

  if (!mIds.length && !fIds.length) {
    console.log('\nNothing to fix — already normalized.')
    return
  }

  // Show after (re-paginate)
  const afterAll: { gender: string | null }[] = []
  from = 0
  while (true) {
    const { data } = await sb.from('actors').select('gender').range(from, from + 999)
    if (!data?.length) break
    afterAll.push(...data)
    if (data.length < 1000) break
    from += 1000
  }
  const after_counts: Record<string, number> = {}
  for (const r of afterAll) {
    const g = r.gender ?? 'null'
    after_counts[g] = (after_counts[g] ?? 0) + 1
  }
  console.log('\nAfter:')
  for (const [g, n] of Object.entries(after_counts).sort((a, b) => b[1] - a[1])) {
    console.log(`  "${g}": ${n}`)
  }
}

main().catch(console.error)
