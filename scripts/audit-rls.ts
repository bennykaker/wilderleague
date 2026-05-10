// Audit script: probes each table with the ANON key to test what's exposed.
// Run: npx tsx scripts/audit-rls.ts

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

function getKey(name: string): string {
  if (process.env[name]) return process.env[name]!
  const file = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
  const match = file.match(new RegExp(`^${name}=(.+)$`, 'm'))
  return match?.[1]?.trim() ?? ''
}

const url = getKey('NEXT_PUBLIC_SUPABASE_URL')
const anon = getKey('NEXT_PUBLIC_SUPABASE_ANON_KEY')
const anonClient = createClient(url, anon, { auth: { persistSession: false } })

const tables = [
  'actor_submissions',
  'actors',
  'cast_picks',
  'cast_scores',
  'comments',
  'config',
  'fan_art',
  'profiles',
  'review_usage',
  'roles',
  'saved_casts',
  'submissions',
  'title_submissions',
  'titles',
  'users',
  'votes',
  'waitlist',
]

type Result = {
  table: string
  canRead: boolean
  rowCount: number | null
  readError?: string
  sampleColumns?: string[]
  canInsert?: boolean
  canDelete?: boolean
  writeNote?: string
}

async function probe(table: string): Promise<Result> {
  const { data, error, count } = await anonClient
    .from(table)
    .select('*', { count: 'exact', head: false })
    .limit(1)

  const baseResult: Result = error
    ? { table, canRead: false, rowCount: null, readError: error.message }
    : { table, canRead: true, rowCount: count ?? null, sampleColumns: data && data[0] ? Object.keys(data[0]) : [] }

  // Probe write via INSERT: an empty insert {} either errors with RLS
  // ("new row violates row-level security policy" / "permission denied")
  // OR with a NOT NULL constraint ("null value in column ... violates not-null").
  // The latter means RLS let us through and we hit a column constraint -- table is OPEN.
  const { error: insErr } = await anonClient.from(table).insert({})
  if (!insErr) {
    baseResult.canInsert = true
    baseResult.writeNote = 'INSERT {} succeeded — table fully open'
  } else if (/row-level security|permission denied|policy/i.test(insErr.message)) {
    baseResult.canInsert = false
  } else if (/null value|violates not-null|invalid input/i.test(insErr.message)) {
    baseResult.canInsert = true
    baseResult.writeNote = `RLS bypassed (hit column constraint): ${insErr.message.slice(0, 70)}`
  } else {
    baseResult.canInsert = false
    baseResult.writeNote = `error: ${insErr.message.slice(0, 80)}`
  }

  return baseResult
}

async function main() {
  console.log(`Probing ${tables.length} tables with ANON key...\n`)
  const results = await Promise.all(tables.map(probe))

  console.log('READABLE BY ANYONE (anon key, no auth):')
  console.log('─'.repeat(70))
  for (const r of results.filter(r => r.canRead)) {
    const cols = r.sampleColumns?.length ? ` cols: ${r.sampleColumns.slice(0, 8).join(', ')}${r.sampleColumns.length > 8 ? '...' : ''}` : ' (empty)'
    console.log(`  ${r.table.padEnd(20)} rows=${String(r.rowCount).padEnd(8)}${cols}`)
  }

  console.log('\nWRITES BY ANYONE (INSERT probe):')
  console.log('─'.repeat(70))
  for (const r of results) {
    const note = r.writeNote ? ` — ${r.writeNote}` : ''
    const status = r.canInsert ? 'OPEN' : 'blocked'
    console.log(`  ${r.table.padEnd(20)} ${status}${note}`)
  }

  console.log('\nBLOCKED:')
  console.log('─'.repeat(70))
  for (const r of results.filter(r => !r.canRead)) {
    console.log(`  ${r.table.padEnd(20)} ${r.readError}`)
  }

  // Sensitive column scan
  const sensitivePatterns = /email|password|token|secret|stripe|phone|address|ssn|api_key|customer_id|subscription_id/i
  console.log('\nPOTENTIALLY SENSITIVE COLUMNS in publicly readable tables:')
  console.log('─'.repeat(70))
  for (const r of results.filter(r => r.canRead && r.sampleColumns)) {
    const sus = r.sampleColumns!.filter(c => sensitivePatterns.test(c))
    if (sus.length) console.log(`  ${r.table.padEnd(20)} ${sus.join(', ')}`)
  }
}

main().catch(err => { console.error(err); process.exit(1) })
