/**
 * Tags actors known to be 5'7" (170cm) or under by adding "short" to their keywords.
 * Safe to re-run — only updates if "short" isn't already present.
 * Run with: npx tsx scripts/tag-short-actors.ts
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

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Men 5'7" and under, women 5'3" and under
const SHORT_ACTORS = [
  // 5'7" men
  'Tom Cruise',
  'Al Pacino',
  'Jonah Hill',
  'Ben Stiller',
  'Martin Short',
  'Rob Schneider',
  'Billy Crystal',
  'Emile Hirsch',
  'James McAvoy',
  'Charlie Day',
  'Fred Armisen',
  'Bobby Moynihan',
  'Frankie Muniz',
  'Macaulay Culkin',

  // 5'6" men
  'Dustin Hoffman',
  'Jack Black',
  'Elijah Wood',
  'Woody Allen',
  'Aziz Ansari',
  'Dave Franco',
  'Lin-Manuel Miranda',

  // 5'5" men
  'Daniel Radcliffe',
  'Jason Alexander',
  'Seth Green',
  'Bruno Mars',

  // 5'4" and under men
  'Michael J. Fox',
  'Kevin Hart',
  'Joe Pesci',
  'Danny DeVito',
  'Peter Dinklage',
  'Warwick Davis',
  'Phil Fondacaro',

  // Women 5'3" and under (notably short)
  'Reese Witherspoon',
  'Kristen Bell',
  'Emma Roberts',
  'Anna Kendrick',
  'Natalie Portman',
  'Eva Longoria',
  'Salma Hayek',
  'Scarlett Johansson',
  'Felicity Jones',
  'Emilia Clarke',
  'Kiernan Shipka',
  'Melissa Joan Hart',
  'Ariel Winter',
  'Mila Kunis',
]

async function main() {
  const unique = [...new Set(SHORT_ACTORS)]
  console.log(`Processing ${unique.length} actors...\n`)
  let updated = 0, skipped = 0, notFound = 0

  for (const name of unique) {
    const { data } = await supabase
      .from('actors')
      .select('id, name, keywords')
      .ilike('name', name)
      .single()

    if (!data) { console.log(`  not in pool: ${name}`); notFound++; continue }

    const current = data.keywords ?? ''
    if (current.includes('short')) { skipped++; continue }

    const newKeywords = current ? `${current}; short` : 'short'
    const { error } = await supabase
      .from('actors')
      .update({ keywords: newKeywords })
      .eq('id', data.id)

    if (error) {
      console.log(`✗ ${data.name}: ${error.message}`)
    } else {
      console.log(`✓ ${data.name}`)
      updated++
    }
  }

  console.log(`\nDone. Tagged: ${updated} | Already tagged: ${skipped} | Not in pool: ${notFound}`)
}

main().catch(console.error)
