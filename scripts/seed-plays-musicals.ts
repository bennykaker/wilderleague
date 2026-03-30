/**
 * Seed classic plays and musicals into the titles table.
 * Framed as "cast the definitive film version."
 * Run with: npx tsx scripts/seed-plays-musicals.ts
 * Safe to re-run — upserts on slug.
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

const PLAYS_AND_MUSICALS = [
  // Classic plays
  { slug: 'hamlet',                     title: 'Hamlet',                                type: 'play',    year: 1600, budget: 65,  source_material: 'play' },
  { slug: 'macbeth',                    title: 'Macbeth',                               type: 'play',    year: 1606, budget: 55,  source_material: 'play' },
  { slug: 'a-midsummer-nights-dream',   title: "A Midsummer Night's Dream",             type: 'play',    year: 1595, budget: 60,  source_material: 'play' },
  { slug: 'romeo-and-juliet',           title: 'Romeo and Juliet',                      type: 'play',    year: 1597, budget: 55,  source_material: 'play' },
  { slug: 'othello',                    title: 'Othello',                               type: 'play',    year: 1603, budget: 55,  source_material: 'play' },
  { slug: 'king-lear',                  title: 'King Lear',                             type: 'play',    year: 1606, budget: 60,  source_material: 'play' },
  { slug: 'the-tempest',                title: 'The Tempest',                           type: 'play',    year: 1611, budget: 65,  source_material: 'play' },
  { slug: 'a-streetcar-named-desire',   title: 'A Streetcar Named Desire',              type: 'play',    year: 1947, budget: 45,  source_material: 'play' },
  { slug: 'death-of-a-salesman',        title: 'Death of a Salesman',                   type: 'play',    year: 1949, budget: 40,  source_material: 'play' },
  { slug: 'long-days-journey',          title: "Long Day's Journey Into Night",         type: 'play',    year: 1956, budget: 35,  source_material: 'play' },
  { slug: 'whos-afraid-virginia-woolf', title: "Who's Afraid of Virginia Woolf?",       type: 'play',    year: 1962, budget: 40,  source_material: 'play' },
  { slug: 'the-glass-menagerie',        title: 'The Glass Menagerie',                   type: 'play',    year: 1944, budget: 35,  source_material: 'play' },
  { slug: 'cat-on-a-hot-tin-roof',      title: 'Cat on a Hot Tin Roof',                 type: 'play',    year: 1955, budget: 40,  source_material: 'play' },
  { slug: 'glengarry-glen-ross',        title: 'Glengarry Glen Ross',                   type: 'play',    year: 1982, budget: 35,  source_material: 'play' },
  { slug: 'august-osage-county',        title: 'August: Osage County',                  type: 'play',    year: 2007, budget: 45,  source_material: 'play' },
  { slug: 'the-crucible',               title: 'The Crucible',                          type: 'play',    year: 1953, budget: 50,  source_material: 'play' },
  { slug: 'waiting-for-godot',          title: 'Waiting for Godot',                     type: 'play',    year: 1953, budget: 30,  source_material: 'play' },
  { slug: 'angels-in-america',          title: 'Angels in America',                     type: 'play',    year: 1991, budget: 60,  source_material: 'play' },
  { slug: 'hedda-gabler',               title: 'Hedda Gabler',                          type: 'play',    year: 1891, budget: 40,  source_material: 'play' },
  { slug: 'a-doll-house',               title: "A Doll's House",                        type: 'play',    year: 1879, budget: 35,  source_material: 'play' },
  { slug: 'the-cherry-orchard',         title: 'The Cherry Orchard',                    type: 'play',    year: 1904, budget: 40,  source_material: 'play' },
  { slug: 'uncle-vanya',                title: 'Uncle Vanya',                           type: 'play',    year: 1897, budget: 35,  source_material: 'play' },
  { slug: 'three-sisters',              title: 'Three Sisters',                         type: 'play',    year: 1901, budget: 40,  source_material: 'play' },

  // Musicals — cast the definitive film version
  { slug: 'hamilton',                   title: 'Hamilton',                              type: 'musical', year: 2015, budget: 90,  source_material: 'novel' },
  { slug: 'west-side-story',            title: 'West Side Story',                       type: 'musical', year: 1957, budget: 70,  source_material: 'play' },
  { slug: 'chicago-musical',            title: 'Chicago',                               type: 'musical', year: 1975, budget: 60,  source_material: 'play' },
  { slug: 'sweeney-todd',               title: 'Sweeney Todd: The Demon Barber of Fleet Street', type: 'musical', year: 1979, budget: 65,  source_material: 'play' },
  { slug: 'les-miserables',             title: 'Les Misérables',                        type: 'musical', year: 1985, budget: 85,  source_material: 'novel' },
  { slug: 'cabaret',                    title: 'Cabaret',                               type: 'musical', year: 1966, budget: 55,  source_material: 'play' },
  { slug: 'a-chorus-line',              title: 'A Chorus Line',                         type: 'musical', year: 1975, budget: 50,  source_material: 'original' },
  { slug: 'into-the-woods',             title: 'Into the Woods',                        type: 'musical', year: 1986, budget: 65,  source_material: 'original' },
  { slug: 'company',                    title: 'Company',                               type: 'musical', year: 1970, budget: 50,  source_material: 'play' },
  { slug: 'rent',                       title: 'Rent',                                  type: 'musical', year: 1996, budget: 55,  source_material: 'play' },
  { slug: 'spring-awakening',           title: 'Spring Awakening',                      type: 'musical', year: 2006, budget: 50,  source_material: 'play' },
  { slug: 'fun-home',                   title: 'Fun Home',                              type: 'musical', year: 2013, budget: 45,  source_material: 'novel' },
  { slug: 'sunday-in-the-park',         title: 'Sunday in the Park with George',        type: 'musical', year: 1984, budget: 55,  source_material: 'original' },
  { slug: 'follies',                    title: 'Follies',                               type: 'musical', year: 1971, budget: 55,  source_material: 'original' },
  { slug: 'assassins',                  title: 'Assassins',                             type: 'musical', year: 1990, budget: 55,  source_material: 'original' },
  { slug: 'passion',                    title: 'Passion',                               type: 'musical', year: 1994, budget: 45,  source_material: 'novel' },
  { slug: 'pacific-overtures',          title: 'Pacific Overtures',                     type: 'musical', year: 1976, budget: 60,  source_material: 'original' },
]

async function main() {
  console.log(`Seeding ${PLAYS_AND_MUSICALS.length} plays and musicals...`)

  const { error } = await supabase
    .from('titles')
    .upsert(PLAYS_AND_MUSICALS, { onConflict: 'slug' })

  if (error) {
    console.error('Seed failed:', error.message)
    process.exit(1)
  }

  console.log(`✓ ${PLAYS_AND_MUSICALS.length} titles seeded.`)
  console.log('Next: run enrich-titles.ts to fill in metadata, then seed-new-roles.ts for cast.')
}

main().catch(console.error)
