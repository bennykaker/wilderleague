/**
 * Deduplicates roles for the-matrix — keeps highest-tier row per role_name, deletes the rest.
 * Run with: npx tsx scripts/dedup-matrix-roles.ts
 */
import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([^=]+)=(.*)$/)
    if (m) process.env[m[1].trim()] = m[2].trim()
  }
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TIER_RANK: Record<string, number> = {
  first_lead: 4, second_lead: 3, third_lead: 2, supporting: 1,
}

async function main() {
  const { data, error } = await sb
    .from('roles')
    .select('id, role_name, tier')
    .eq('title_slug', 'the-matrix')
    .order('role_name')

  if (error) { console.error(error); return }

  // Group by role_name
  const groups: Record<string, { id: string; tier: string }[]> = {}
  for (const row of data ?? []) {
    ;(groups[row.role_name] ??= []).push({ id: row.id, tier: row.tier })
  }

  const toDelete: string[] = []

  for (const [roleName, rows] of Object.entries(groups)) {
    if (rows.length === 1) continue
    // Sort by tier descending, keep the first (best)
    rows.sort((a, b) => (TIER_RANK[b.tier] ?? 0) - (TIER_RANK[a.tier] ?? 0))
    const [keep, ...dupes] = rows
    console.log(`${roleName}: keeping ${keep.id} (${keep.tier}), deleting ${dupes.length}`)
    toDelete.push(...dupes.map(d => d.id))
  }

  if (toDelete.length === 0) {
    console.log('No duplicates found.')
    return
  }

  const { error: delErr } = await sb.from('roles').delete().in('id', toDelete)
  if (delErr) {
    console.error('Delete failed:', delErr.message)
  } else {
    console.log(`\nDeleted ${toDelete.length} duplicate role rows.`)
  }
}

main().catch(console.error)
