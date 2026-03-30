/**
 * Assign universe tags to actors based on known_for field.
 * No AI — pure string matching against hardcoded universe definitions.
 * Run with: npx tsx scripts/tag-universes.ts
 * Safe to re-run — overwrites existing tags.
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

// Universe definitions — match against known_for field
const UNIVERSES: Record<string, string[]> = {
  CLCU: [
    'The Big Bang Theory', 'Two and a Half Men', 'Mom', 'Young Sheldon',
    'Mike & Molly', 'Two Broke Girls', 'Dharma & Greg', 'Bob Hearts Abishola',
    'United States of Al', 'The Kominsky Method', 'Roseanne', 'Ghosts',
    'Grace Under Fire', 'Cybill',
  ],
  Schurverse: [
    'The Office', 'Parks and Recreation', 'Parks & Recreation',
    'Brooklyn Nine-Nine', 'The Good Place', 'Rutherford Falls',
    'Cheers', // Schur wrote for Cheers early career
  ],
  SeinfeldCU: [
    'Seinfeld', 'Curb Your Enthusiasm',
  ],
  HBOverlap: [
    'The Sopranos', 'The Wire', 'Deadwood', 'Six Feet Under', 'Oz',
    'Boardwalk Empire', 'True Detective', 'Game of Thrones', 'Succession',
    'Barry', 'The Leftovers', 'Treme', 'Rome', 'Carnivàle', 'John from Cincinnati',
    'In Treatment', 'Luck', 'The Newsroom', 'Show Me a Hero', 'The Night Of',
    'Big Little Lies', 'Sharp Objects', 'Watchmen', 'Lovecraft Country',
    'Mare of Easttown', 'The White Lotus', 'Euphoria', 'House of the Dragon',
  ],
  SorkVerse: [
    'The West Wing', 'The Social Network', 'The Newsroom', 'Sports Night',
    'Studio 60 on the Sunset Strip', 'A Few Good Men', 'Moneyball',
    'Charlie Wilson\'s War', 'The American President',
  ],
  PTAverse: [
    'Boogie Nights', 'Magnolia', 'There Will Be Blood', 'Punch-Drunk Love',
    'The Master', 'Phantom Thread', 'Licorice Pizza', 'Hard Eight',
    'Inherent Vice',
  ],
  CoenBros: [
    'Fargo', 'The Big Lebowski', 'No Country for Old Men', 'True Grit',
    'Burn After Reading', 'O Brother, Where Art Thou?', 'Miller\'s Crossing',
    'Barton Fink', 'Blood Simple', 'Raising Arizona', 'The Man Who Wasn\'t There',
    'Intolerable Cruelty', 'The Ladykillers', 'A Serious Man', 'Hail, Caesar!',
  ],
  NolaNation: [
    'The Dark Knight', 'Batman Begins', 'The Dark Knight Rises',
    'Inception', 'Interstellar', 'Memento', 'Dunkirk', 'Tenet',
    'Oppenheimer', 'Insomnia', 'The Prestige', 'Following',
  ],
  Apatowverse: [
    'Superbad', 'Knocked Up', 'The 40-Year-Old Virgin', 'Freaks and Geeks',
    'Funny People', 'This Is 40', 'Pineapple Express', 'Anchorman',
    'Step Brothers', 'Talladega Nights', 'Bridesmaids', 'Girls',
    'Love', 'Undeclared',
  ],
  FXFamily: [
    'The Americans', 'Justified', 'Sons of Anarchy', 'The Shield',
    'It\'s Always Sunny in Philadelphia', 'Atlanta', 'Archer',
    'American Horror Story', 'Fargo', 'Pose', 'Mayans M.C.',
    'Rescue Me', 'Nip/Tuck', 'Damages', 'Terriers', 'The Riches',
    'Lights Out', 'Louie', 'You\'re the Worst', 'Better Things',
  ],
  DCU: [
    // David Chase Universe — The Sopranos extended family
    'The Sopranos', 'The Many Saints of Newark',
  ],
  AltmanPool: [
    'MASH', 'Nashville', 'Short Cuts', 'Gosford Park', 'The Player',
    'Ready to Wear', 'Cookie\'s Fortune', 'Dr. T and the Women',
    'A Prairie Home Companion', 'Kansas City', 'Pret-a-Porter',
  ],
  Whedonverse: [
    'Buffy the Vampire Slayer', 'Angel', 'Firefly', 'Serenity',
    'Dollhouse', 'Agents of S.H.I.E.L.D.', 'The Avengers',
    'Avengers: Age of Ultron', 'Much Ado About Nothing', 'Cabin in the Woods',
    'Dr. Horrible\'s Sing-Along Blog',
  ],
}

function assignTags(knownFor: string, keywords: string): string[] {
  const haystack = (knownFor + ' ' + keywords).toLowerCase()
  const tags: string[] = []

  for (const [tag, shows] of Object.entries(UNIVERSES)) {
    const matched = shows.some(show => haystack.includes(show.toLowerCase()))
    if (matched) tags.push(tag)
  }

  return tags
}

async function main() {
  console.log('Fetching actors...')

  let from = 0
  const PAGE = 1000
  let totalUpdated = 0
  let totalTagged = 0

  while (true) {
    const { data: actors, error } = await supabase
      .from('actors')
      .select('id, name, known_for, keywords')
      .order('popularity', { ascending: false })
      .range(from, from + PAGE - 1)

    if (error) throw new Error(error.message)
    if (!actors || actors.length === 0) break

    const updates: Array<{ id: string; tags: string[] }> = []

    for (const actor of actors) {
      const tags = assignTags(actor.known_for ?? '', actor.keywords ?? '')
      if (tags.length > 0) {
        updates.push({ id: actor.id, tags })
        totalTagged++
      }
    }

    // Batch update
    for (const { id, tags } of updates) {
      const { error: updateError } = await supabase
        .from('actors')
        .update({ universe_tags: tags.join(',') })
        .eq('id', id)
      if (updateError) console.error(`Failed to update ${id}:`, updateError.message)
    }

    totalUpdated += actors.length
    console.log(`Processed ${totalUpdated} actors (${totalTagged} tagged so far)...`)

    if (actors.length < PAGE) break
    from += PAGE
  }

  console.log(`\nDone. ${totalTagged} actors tagged across ${Object.keys(UNIVERSES).length} universes.`)

  // Print summary per universe
  console.log('\nUniverse counts:')
  for (const tag of Object.keys(UNIVERSES)) {
    const { count } = await supabase
      .from('actors')
      .select('*', { count: 'exact', head: true })
      .ilike('universe_tags', `%${tag}%`)
    console.log(`  ${tag}: ${count}`)
  }
}

main().catch(console.error)
