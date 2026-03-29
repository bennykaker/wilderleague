/**
 * One-off: add Sage Brocklebank to the actors table.
 * Run with: npx tsx scripts/add-actor.ts
 */

import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

// Load .env.local
const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n')
  for (const line of lines) {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) process.env[match[1].trim()] = match[2].trim()
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  const { error } = await supabase.from('actors').upsert({
    tmdb_id: '62913',
    name: 'Sage Brocklebank',
    headshot_url: 'https://image.tmdb.org/t/p/w500/7BFFanLsfc2m4FU7Hvw8GDTGOEt.jpg',
    popularity: 0.82,
    cost: 3,
    gender: 'male',
    birth_year: '1978',
    biography: 'Canadian actor best known for playing Officer Buzz McNab across the full run of Psych (2006–2014) and its subsequent films. Also appeared in The Predator (2018) and Everything, Everything (2017).',
    known_for: 'Psych; Psych: The Movie; The Predator; Everything, Everything',
    keywords: 'actor; comedy; drama; canadian; supporting; television',
    archetype: 'reliable character actor',
    strengths: 'Comic timing; physical presence; warmth; ensemble chemistry',
    weaknesses: 'Limited leading-man roles; low mainstream name recognition outside Psych fanbase',
    best_cast_as: 'Lovable sidekick; earnest cop; gentle giant; comedic support',
    signature_quality: 'Disarming sincerity — plays straight-faced comedy with complete commitment',
    career_stage: 'established',
    casting_profile: 'Sage Brocklebank is a journeyman character actor with genuine cult credibility. Eight seasons as Buzz McNab on Psych proved he can hold his own in a fast-talking ensemble while being the butt of the joke and somehow still the most likeable person in the room. He brings physical comedy instincts and a natural warmth that makes him a useful piece in any ensemble. Not a marquee name, but the kind of actor who makes scenes better.',
    deep_dive_date: new Date().toISOString().slice(0, 10),
    salary_estimate: null,
    salary_confirmed: false,
  }, { onConflict: 'tmdb_id' })

  if (error) {
    console.error('Error:', error.message)
  } else {
    console.log('Sage Brocklebank added successfully.')
  }
}

main().catch(console.error)
