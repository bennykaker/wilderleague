/**
 * Migrate existing titles.csv and roles.csv into Supabase titles + roles tables.
 * Run AFTER creating the tables with supabase/titles-schema.sql.
 * Run with: npx tsx scripts/migrate-titles-to-db.ts
 *
 * Safe to re-run — upserts on slug/id.
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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function parseCSV(file: string): Record<string, string>[] {
  const lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean)
  const headers = lines[0].split(',')
  return lines.slice(1).map(line => {
    // Handle quoted fields
    const fields: string[] = []
    let current = ''
    let inQuotes = false
    for (const char of line) {
      if (char === '"') { inQuotes = !inQuotes; continue }
      if (char === ',' && !inQuotes) { fields.push(current); current = ''; continue }
      current += char
    }
    fields.push(current)
    return Object.fromEntries(headers.map((h, i) => [h.trim(), (fields[i] ?? '').trim()]))
  })
}

async function main() {
  const titlesPath = path.join(process.cwd(), 'data', 'titles.csv')
  const rolesPath = path.join(process.cwd(), 'data', 'roles.csv')

  const titleRows = parseCSV(titlesPath)
  const roleRows = parseCSV(rolesPath)

  console.log(`Migrating ${titleRows.length} titles and ${roleRows.length} roles...`)

  // Upsert titles
  const titles = titleRows.map(r => ({
    slug: r.slug,
    title: r.title,
    type: r.type || 'movie',
    year: r.year ? parseInt(r.year) : null,
    tmdb_id: r.tmdb_id || null,
    poster_path: r.poster_path || null,
    backdrop_path: r.backdrop_path || null,
    logline: r.logline || null,
    budget: r.budget ? parseInt(r.budget) : null,
  }))

  const { error: titlesError } = await supabase
    .from('titles')
    .upsert(titles, { onConflict: 'slug' })

  if (titlesError) {
    console.error('Titles upsert failed:', titlesError.message)
    process.exit(1)
  }
  console.log(`✓ ${titles.length} titles upserted`)

  // Upsert roles — delete existing first to avoid duplicates on re-run
  const slugs = titles.map(t => t.slug)
  const { error: deleteError } = await supabase
    .from('roles')
    .delete()
    .in('title_slug', slugs)

  if (deleteError) {
    console.error('Roles delete failed:', deleteError.message)
    process.exit(1)
  }

  const roles = roleRows.map((r, i) => ({
    title_slug: r.movie_slug,
    role_name: r.role_name,
    original_actor: r.original_actor || null,
    original_actor_image: r.original_actor_image || null,
    tier: r.tier || 'supporting',
    display_order: i,
  }))

  // Insert in batches of 200
  for (let i = 0; i < roles.length; i += 200) {
    const batch = roles.slice(i, i + 200)
    const { error } = await supabase.from('roles').insert(batch)
    if (error) {
      console.error(`Roles insert failed (batch ${i}):`, error.message)
      process.exit(1)
    }
  }
  console.log(`✓ ${roles.length} roles inserted`)
  console.log('\nMigration complete.')
}

main().catch(console.error)
