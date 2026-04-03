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
  // Paginate to avoid the 1000-row Supabase default limit
  const all: { id: string; title_slug: string; role_name: string; tier: string }[] = []
  let from = 0
  while (true) {
    const { data, error } = await sb.from('roles').select('id, title_slug, role_name, tier').range(from, from + 999)
    if (error) { console.error(error); return }
    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < 1000) break
    from += 1000
  }
  const data = all
  console.log(`Fetched ${data.length} total role rows`)
  if (!data.length) { console.log('No roles found.'); return }

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

  // Batch deletes to avoid PostgREST URL length limits
  const BATCH = 100
  let deleted = 0
  for (let i = 0; i < toDelete.length; i += BATCH) {
    const batch = toDelete.slice(i, i + BATCH)
    const { error: delErr } = await sb.from('roles').delete().in('id', batch)
    if (delErr) { console.error(`Delete batch failed: ${delErr.message}`); break }
    deleted += batch.length
  }
  console.log(`\nDeleted ${deleted} duplicate role rows.`)
}

main().catch(console.error)
