/**
 * Deduplicates roles across all titles — keeps highest-tier row per (title_slug, role_name).
 * Run with: npx tsx scripts/dedup-all-roles.ts
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
  const { data, error } = await sb.from('roles').select('id, title_slug, role_name, tier')
  if (error) { console.error(error); return }

  // Group by title_slug + role_name
  const groups: Record<string, { id: string; tier: string }[]> = {}
  for (const row of data ?? []) {
    const key = `${row.title_slug}||${row.role_name}`
    ;(groups[key] ??= []).push({ id: row.id, tier: row.tier })
  }

  const toDelete: string[] = []

  for (const [key, rows] of Object.entries(groups)) {
    if (rows.length === 1) continue
    rows.sort((a, b) => (TIER_RANK[b.tier] ?? 0) - (TIER_RANK[a.tier] ?? 0))
    const [keep, ...dupes] = rows
    const [slug, role] = key.split('||')
    console.log(`${slug} / ${role}: keeping (${keep.tier}), deleting ${dupes.length}`)
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
