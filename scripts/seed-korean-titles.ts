/**
 * Seeds 10 Korean film/TV titles.
 * Run with: npx tsx scripts/seed-korean-titles.ts
 * Then: npx tsx scripts/enrich-titles.ts
 * Then: npx tsx scripts/seed-new-roles.ts
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

const TITLES = [
  { slug: 'squid-game',              title: 'Squid Game',                    type: 'tv',    year: 2021, budget: 30 },
  { slug: 'parasite',                title: 'Parasite',                      type: 'movie', year: 2019, budget: 55 },
  { slug: 'train-to-busan',          title: 'Train to Busan',                type: 'movie', year: 2016, budget: 45 },
  { slug: 'crash-landing-on-you',    title: 'Crash Landing on You',          type: 'tv',    year: 2019, budget: 25 },
  { slug: 'goblin-kdrama',           title: 'Goblin',                        type: 'tv',    year: 2016, budget: 20 },
  { slug: 'my-love-from-the-star',   title: 'My Love from the Star',         type: 'tv',    year: 2013, budget: 18 },
  { slug: 'itaewon-class',           title: 'Itaewon Class',                 type: 'tv',    year: 2020, budget: 20 },
  { slug: 'the-glory-kdrama',        title: 'The Glory',                     type: 'tv',    year: 2022, budget: 25 },
  { slug: 'reply-1988',              title: 'Reply 1988',                    type: 'tv',    year: 2015, budget: 15 },
  { slug: 'oldboy',                  title: 'Oldboy',                        type: 'movie', year: 2003, budget: 40 },
]

async function main() {
  console.log(`Seeding ${TITLES.length} Korean titles...`)
  const { error } = await supabase.from('titles').upsert(TITLES, { onConflict: 'slug' })
  if (error) { console.error('Failed:', error.message); process.exit(1) }
  console.log(`✓ ${TITLES.length} titles seeded.`)
  console.log('Next steps:')
  console.log('  npx tsx scripts/enrich-titles.ts')
  console.log('  npx tsx scripts/seed-new-roles.ts')
  console.log('  npx tsx scripts/seed-korean-actors.ts')
}

main().catch(console.error)
