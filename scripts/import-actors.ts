/**
 * One-time script to import enriched-actors.csv into Supabase.
 * Run with: npx tsx scripts/import-actors.ts
 */

import fs from 'fs'
import path from 'path'
import Papa from 'papaparse'
import { createClient } from '@supabase/supabase-js'

// Load .env.local manually
const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n')
  for (const line of lines) {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) process.env[match[1].trim()] = match[2].trim()
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

function popularityToCost(pop: number): number {
  if (pop >= 20) return 12
  if (pop >= 15) return 10
  if (pop >= 12) return 8
  if (pop >= 10) return 6
  if (pop >= 6) return 4
  return 3
}

async function main() {
  const csvPath = path.join(process.cwd(), 'data', 'enriched-actors.csv')
  const file = fs.readFileSync(csvPath, 'utf8')
  const parsed = Papa.parse<Record<string, string>>(file, { header: true, skipEmptyLines: true })

  const rows = parsed.data.filter(row => row.name?.trim())

  console.log(`Parsed ${rows.length} actors from CSV`)

  const actors = rows.map(row => {
    const pop = parseFloat(row.popularity ?? '0') || 0
    const salaryEst = row.salary_estimate ? parseFloat(row.salary_estimate) || null : null
    return {
      tmdb_id: row.tmdb_id?.trim() || null,
      name: row.name.trim(),
      headshot_url: row.headshot_url?.trim() ?? '',
      popularity: pop,
      cost: salaryEst ?? popularityToCost(pop),
      gender: row.gender?.trim() ?? '',
      birth_year: row.birth_year?.trim() ?? '',
      biography: row.biography?.trim() ?? '',
      known_for: row.known_for?.trim() ?? '',
      keywords: row.keywords?.trim() ?? '',
      notes: row.notes?.trim() ?? '',
      archetype: row.archetype?.trim() || null,
      strengths: row.strengths?.trim() || null,
      weaknesses: row.weaknesses?.trim() || null,
      best_cast_as: row.best_cast_as?.trim() || null,
      signature_quality: row.signature_quality?.trim() || null,
      career_stage: row.career_stage?.trim() || null,
      casting_profile: row.casting_profile?.trim() || null,
      deep_dive_date: row.deep_dive_date?.trim() || null,
      salary_estimate: salaryEst,
      salary_confirmed: row.salary_confirmed === 'true' || row.salary_confirmed === '1',
    }
  })

  // Upsert in batches of 500
  const BATCH = 500
  let inserted = 0
  let errors = 0

  for (let i = 0; i < actors.length; i += BATCH) {
    const batch = actors.slice(i, i + BATCH)
    const { error } = await supabase
      .from('actors')
      .upsert(batch, { onConflict: 'tmdb_id', ignoreDuplicates: false })

    if (error) {
      console.error(`Batch ${i}–${i + BATCH} error:`, error.message)
      errors += batch.length
    } else {
      inserted += batch.length
      console.log(`Inserted ${inserted}/${actors.length}...`)
    }
  }

  console.log(`\nDone. ${inserted} inserted, ${errors} errors.`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
