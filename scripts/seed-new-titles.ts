/**
 * Seed new TV shows into the titles table.
 * Run with: npx tsx scripts/seed-new-titles.ts
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

// New titles to add — enrichment script will fill in metadata
const NEW_TITLES = [
  // Comedy TV
  { slug: 'parks-and-recreation',     title: 'Parks and Recreation',          type: 'tv',    year: 2009, budget: 25 },
  { slug: '30-rock',                  title: '30 Rock',                       type: 'tv',    year: 2006, budget: 20 },
  { slug: 'its-always-sunny',         title: "It's Always Sunny in Philadelphia", type: 'tv', year: 2005, budget: 15 },
  { slug: 'curb-your-enthusiasm',     title: 'Curb Your Enthusiasm',          type: 'tv',    year: 2000, budget: 20 },
  { slug: 'veep',                     title: 'Veep',                          type: 'tv',    year: 2012, budget: 20 },
  { slug: 'silicon-valley',           title: 'Silicon Valley',                type: 'tv',    year: 2014, budget: 20 },
  { slug: 'the-good-place',           title: 'The Good Place',                type: 'tv',    year: 2016, budget: 20 },
  { slug: 'community',               title: 'Community',                      type: 'tv',    year: 2009, budget: 20 },
  { slug: 'brooklyn-nine-nine',       title: 'Brooklyn Nine-Nine',            type: 'tv',    year: 2013, budget: 20 },
  { slug: 'schitts-creek',            title: "Schitt's Creek",                type: 'tv',    year: 2015, budget: 15 },
  { slug: 'friends',                  title: 'Friends',                       type: 'tv',    year: 1994, budget: 35 },
  { slug: 'frasier',                  title: 'Frasier',                       type: 'tv',    year: 1993, budget: 25 },
  { slug: 'cheers',                   title: 'Cheers',                        type: 'tv',    year: 1982, budget: 20 },
  { slug: 'scrubs',                   title: 'Scrubs',                        type: 'tv',    year: 2001, budget: 20 },

  // Drama TV
  { slug: 'true-detective-s1',        title: 'True Detective (Season 1)',     type: 'tv',    year: 2014, budget: 25 },
  { slug: 'the-americans',            title: 'The Americans',                 type: 'tv',    year: 2013, budget: 25 },
  { slug: 'justified',                title: 'Justified',                     type: 'tv',    year: 2010, budget: 20 },
  { slug: 'boardwalk-empire',         title: 'Boardwalk Empire',              type: 'tv',    year: 2010, budget: 35 },
  { slug: 'six-feet-under',           title: 'Six Feet Under',                type: 'tv',    year: 2001, budget: 25 },
  { slug: 'the-shield',               title: 'The Shield',                    type: 'tv',    year: 2002, budget: 20 },
  { slug: 'ozark',                    title: 'Ozark',                         type: 'tv',    year: 2017, budget: 30 },
  { slug: 'mindhunter',               title: 'Mindhunter',                    type: 'tv',    year: 2017, budget: 30 },
  { slug: 'lost',                     title: 'Lost',                          type: 'tv',    year: 2004, budget: 35 },
  { slug: 'friday-night-lights',      title: 'Friday Night Lights',           type: 'tv',    year: 2006, budget: 20 },
  { slug: 'house-md',                 title: 'House M.D.',                    type: 'tv',    year: 2004, budget: 25 },
  { slug: 'er',                       title: 'ER',                            type: 'tv',    year: 1994, budget: 25 },
  { slug: 'halt-and-catch-fire',      title: 'Halt and Catch Fire',           type: 'tv',    year: 2014, budget: 20 },
  { slug: 'atlanta',                  title: 'Atlanta',                       type: 'tv',    year: 2016, budget: 20 },
  { slug: 'barry',                    title: 'Barry',                         type: 'tv',    year: 2018, budget: 20 },
  { slug: 'twin-peaks',               title: 'Twin Peaks',                    type: 'tv',    year: 1990, budget: 20 },

  // British TV
  { slug: 'fleabag',                  title: 'Fleabag',                       type: 'tv',    year: 2016, budget: 15 },
  { slug: 'peaky-blinders',           title: 'Peaky Blinders',                type: 'tv',    year: 2013, budget: 25 },
  { slug: 'downton-abbey',            title: 'Downton Abbey',                 type: 'tv',    year: 2010, budget: 25 },
  { slug: 'sherlock',                 title: 'Sherlock',                      type: 'tv',    year: 2010, budget: 20 },

  // New releases
  { slug: 'project-hail-mary',        title: 'Project Hail Mary',             type: 'movie', year: 2025, budget: 150 },

  // Additional movies worth adding
  { slug: 'the-departed',             title: 'The Departed',                  type: 'movie', year: 2006, budget: 55 },
  { slug: 'fight-club',               title: 'Fight Club',                    type: 'movie', year: 1999, budget: 55 },
  { slug: 'american-beauty',          title: 'American Beauty',               type: 'movie', year: 1999, budget: 40 },
  { slug: 'boogie-nights',            title: 'Boogie Nights',                 type: 'movie', year: 1997, budget: 35 },
  { slug: 'magnolia',                 title: 'Magnolia',                      type: 'movie', year: 1999, budget: 45 },
  { slug: 'mulholland-drive',         title: 'Mulholland Drive',              type: 'movie', year: 2001, budget: 30 },
  { slug: 'eternal-sunshine',         title: 'Eternal Sunshine of the Spotless Mind', type: 'movie', year: 2004, budget: 40 },
  { slug: 'lost-in-translation',      title: 'Lost in Translation',           type: 'movie', year: 2003, budget: 35 },
  { slug: 'the-royal-tenenbaums',     title: 'The Royal Tenenbaums',          type: 'movie', year: 2001, budget: 40 },
  { slug: 'training-day',             title: 'Training Day',                  type: 'movie', year: 2001, budget: 40 },
  { slug: 'memento',                  title: 'Memento',                       type: 'movie', year: 2000, budget: 30 },
  { slug: 'the-social-network',       title: 'The Social Network',            type: 'movie', year: 2010, budget: 55 },
  { slug: 'almost-famous',            title: 'Almost Famous',                 type: 'movie', year: 2000, budget: 40 },
]

async function main() {
  console.log(`Seeding ${NEW_TITLES.length} new titles...`)

  const { error } = await supabase
    .from('titles')
    .upsert(NEW_TITLES, { onConflict: 'slug' })

  if (error) {
    console.error('Seed failed:', error.message)
    process.exit(1)
  }

  console.log(`✓ ${NEW_TITLES.length} titles seeded. Run enrich-titles.ts to fill in metadata.`)
}

main().catch(console.error)
