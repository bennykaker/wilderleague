/**
 * Seeds 20 high-BookTok titles into the titles table.
 * Run with: npx tsx scripts/seed-books.ts
 * Safe to re-run — upserts on slug.
 * After running: npx tsx scripts/seed-book-roles.ts
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

// budget = hypothetical adaptation budget in $M
const BOOKS = [
  // Romantasy — biggest BookTok category
  { slug: 'fourth-wing',                   title: 'Fourth Wing',                            author: 'Rebecca Yarros',      year: 2023, budget: 180 },
  { slug: 'iron-flame',                    title: 'Iron Flame',                             author: 'Rebecca Yarros',      year: 2023, budget: 180 },
  { slug: 'a-court-of-thorns-and-roses',   title: 'A Court of Thorns and Roses',            author: 'Sarah J. Maas',       year: 2015, budget: 160 },
  { slug: 'a-court-of-mist-and-fury',      title: 'A Court of Mist and Fury',               author: 'Sarah J. Maas',       year: 2016, budget: 160 },
  { slug: 'throne-of-glass',               title: 'Throne of Glass',                        author: 'Sarah J. Maas',       year: 2012, budget: 140 },
  { slug: 'from-blood-and-ash',            title: 'From Blood and Ash',                     author: 'Jennifer L. Armentrout', year: 2020, budget: 120 },
  { slug: 'the-cruel-prince',              title: 'The Cruel Prince',                       author: 'Holly Black',         year: 2018, budget: 120 },

  // Taylor Jenkins Reid — BookTok literary royalty
  { slug: 'the-seven-husbands-of-evelyn-hugo', title: 'The Seven Husbands of Evelyn Hugo', author: 'Taylor Jenkins Reid', year: 2017, budget: 90 },
  { slug: 'daisy-jones-and-the-six',       title: 'Daisy Jones & The Six',                  author: 'Taylor Jenkins Reid', year: 2019, budget: 80 },

  // Colleen Hoover
  { slug: 'it-ends-with-us',               title: 'It Ends with Us',                        author: 'Colleen Hoover',      year: 2016, budget: 60 },

  // Literary fiction — BookTok crossover
  { slug: 'lessons-in-chemistry',          title: 'Lessons in Chemistry',                   author: 'Bonnie Garmus',       year: 2022, budget: 70 },
  { slug: 'tomorrow-and-tomorrow-and-tomorrow', title: 'Tomorrow, and Tomorrow, and Tomorrow', author: 'Gabrielle Zevin', year: 2022, budget: 80 },
  { slug: 'all-the-light-we-cannot-see',   title: 'All the Light We Cannot See',            author: 'Anthony Doerr',       year: 2014, budget: 90 },
  { slug: 'normal-people',                 title: 'Normal People',                          author: 'Sally Rooney',        year: 2018, budget: 40 },
  { slug: 'babel',                         title: 'Babel',                                  author: 'R.F. Kuang',          year: 2022, budget: 110 },

  // Dark academia / fantasy
  { slug: 'the-atlas-six',                 title: 'The Atlas Six',                          author: 'Olivie Blake',        year: 2021, budget: 100 },
  { slug: 'the-midnight-library',          title: 'The Midnight Library',                   author: 'Matt Haig',           year: 2020, budget: 50 },

  // Classics that BookTok revived
  { slug: 'the-hunger-games-book',         title: 'The Hunger Games',                       author: 'Suzanne Collins',     year: 2008, budget: 150 },
  { slug: 'twilight-book',                 title: 'Twilight',                               author: 'Stephenie Meyer',     year: 2005, budget: 100 },
  { slug: 'outlander-book',                title: 'Outlander',                              author: 'Diana Gabaldon',      year: 1991, budget: 130 },
]

async function main() {
  console.log(`Seeding ${BOOKS.length} BookTok titles...`)

  const rows = BOOKS.map(b => ({
    slug: b.slug,
    title: b.title,
    author: b.author,
    type: 'book',
    year: b.year,
    budget: b.budget,
  }))

  const { error } = await supabase
    .from('titles')
    .upsert(rows, { onConflict: 'slug' })

  if (error) {
    console.error('Seed failed:', error.message)
    process.exit(1)
  }

  console.log(`✓ ${BOOKS.length} books seeded.`)
  console.log('Next: npx tsx scripts/seed-book-roles.ts')
}

main().catch(console.error)
