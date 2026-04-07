/**
 * Backfills member_number for all existing is_member=true profiles.
 * Orders by updated_at ASC so earliest subscribers get the lowest numbers.
 * Safe to re-run — skips profiles that already have a member_number.
 *
 * Run AFTER applying supabase/member-numbers.sql.
 * Run with: npx tsx scripts/backfill-member-numbers.ts
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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  // Fetch all members without a number, ordered by when they subscribed
  const { data: members, error } = await supabase
    .from('profiles')
    .select('id, updated_at, username')
    .eq('is_member', true)
    .is('member_number', null)
    .order('updated_at', { ascending: true })

  if (error) { console.error(error.message); process.exit(1) }
  if (!members?.length) { console.log('No members to backfill.'); return }

  console.log(`Backfilling ${members.length} members...\n`)

  // Get the current max member_number so we don't collide
  const { data: maxRow } = await supabase
    .from('profiles')
    .select('member_number')
    .not('member_number', 'is', null)
    .order('member_number', { ascending: false })
    .limit(1)
    .single()

  let next = (maxRow?.member_number ?? 0) + 1

  for (const member of members) {
    const { error: upErr } = await supabase
      .from('profiles')
      .update({ member_number: next })
      .eq('id', member.id)

    if (upErr) {
      console.log(`✗ ${member.username ?? member.id}: ${upErr.message}`)
    } else {
      console.log(`#${next} → ${member.username ?? member.id} (joined ${member.updated_at?.slice(0, 10)})`)
      next++
    }
  }

  // Advance the sequence so future trigger assignments don't collide
  console.log(`\nRun this in Supabase SQL editor to sync the sequence:\nSELECT setval('member_number_seq', ${next - 1});`)

  console.log(`\nDone. ${next - 1} members numbered.`)
}

main().catch(console.error)
