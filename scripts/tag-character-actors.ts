/**
 * Tags character actors in universe_tags with "CharacterActor".
 * Appends to existing tags rather than overwriting.
 * Run with: npx tsx scripts/tag-character-actors.ts
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

// The character actor list — curated "that guy" tier:
// recognisable face, not a marquee name, built career in supporting/ensemble roles
const CHARACTER_ACTORS = [
  // ── American workhorse tier ───────────────────────────────────────────────
  'William H. Macy', 'Philip Baker Hall', 'Richard Jenkins', 'John Carroll Lynch',
  'William Fichtner', 'Stephen Root', 'Shea Whigham', 'Clancy Brown', 'Michael Shannon',
  'Tom Noonan', 'William Sadler', 'Xander Berkeley', 'Pruitt Taylor Vince', 'David Morse',
  'Michael Wincott', 'Jackie Earle Haley', 'John Hawkes', 'William Forsythe', 'Peter Stormare',
  'Robert Davi', 'Michael Ironside', 'Lance Henriksen', 'Ron Perlman', 'Giancarlo Esposito',
  'Jonathan Banks', 'Dean Norris', 'Clarke Peters', 'Wendell Pierce', 'Michael Kelly',
  'Bokeem Woodbine', 'Gary Farmer', 'Don McKellar', 'Michael Rooker', 'Walton Goggins',
  'Jake Busey', 'Željko Ivanek', 'Ted Levine', 'Ray Wise', 'Michael Biehn', 'James Remar',
  'Nick Chinlund', 'Clifton Collins Jr.', 'Holt McCallany', 'Gary Cole',
  'Richard Schiff', 'Bradley Whitford', 'Stephen McKinley Henderson',
  'Crispin Glover', 'Brad Dourif', 'Michael Stuhlbarg',
  // ── That Guy tier ────────────────────────────────────────────────────────
  'Mark Margolis', 'Raymond Cruz', 'Michael Badalucco', 'Tom Noonan',
  'Richard Jenkins', 'William Fichtner', 'Xander Berkeley',
  'Tom Atkins', 'Larry Fessenden', 'Robert Davi', 'Jake Busey',
  'Gregg Turkington', 'Michael Wincott', 'William Forsythe',
  // ── British character tier ────────────────────────────────────────────────
  'Jim Broadbent', 'Timothy Spall', 'David Thewlis', 'Eddie Marsan', 'Paddy Considine',
  'Mark Addy', 'Phil Davis', 'Roger Allam', 'David Calder', 'Ciaran Hinds',
  'Michael McElhatton', "David O'Hara", 'Liam Cunningham', 'Aidan Gillen',
  'Burn Gorman', 'Tony Curran', 'Shaun Evans', 'Matthew Goode',
  'Mackenzie Crook', 'Lucy Davis', 'Mark Heap', 'Kevin Eldon',
  'Reece Shearsmith', 'Steve Pemberton', 'Julia Davis', 'Rich Fulcher',
  'Jessica Hynes', 'Mark Gatiss',
  // ── TV drama character tier ───────────────────────────────────────────────
  'Rufus Sewell', 'Mark Strong', 'Lee Pace', 'Tom Ellis', 'Matthew Goode',
  'Peter Capaldi', 'Hugh Laurie', 'Colm Meaney', 'Jonathan Frakes',
  'Michael Dorn', 'Gates McFadden', 'Adam Baldwin', 'Claudia Christian',
  // ── Genre / horror character tier ────────────────────────────────────────
  'Bruce Campbell', 'Jeffrey Combs', 'Doug Jones', 'Tony Todd', 'Kane Hodder',
  'Tom Savini', 'Ken Foree', 'Doug Bradley', 'Robert Englund', 'Angela Bettis',
  'Danielle Harris', 'Barbara Crampton', 'Larry Fessenden', 'Michael Berryman',
  'Bill Moseley', 'Sid Haig', 'Fred Williamson', 'Tom Atkins',
  // ── Indie film / prestige supporting ─────────────────────────────────────
  'Steve Buscemi', 'John Turturro', 'Parker Posey', 'Hope Davis', 'Lili Taylor',
  'Catherine Keener', 'Zoe Kazan', 'Mark Duplass', 'Jay Duplass',
  'Michael Stuhlbarg', 'Vincent Gallo', 'Don McKellar',
  // ── Comedy character tier ─────────────────────────────────────────────────
  'Stephen Root', 'Gary Cole', 'Andy Richter', 'Chris Elliott', 'Fred Willard',
  'Bob Odenkirk', 'David Cross', 'Michael Ian Black', 'Thomas Lennon',
  'Robert Ben Garant', 'Kerri Kenney', 'Michael Showalter', 'David Wain',
  'H. Jon Benjamin', 'Tim Heidecker', 'Eric Wareheim', 'Scott Aukerman',
  'Matt Besser', 'Todd Barry', 'Brian Posehn', 'Patton Oswalt',
  'Amy Sedaris', 'Paul F. Tompkins', 'Marc Maron',
  // ── Action / genre supporting ─────────────────────────────────────────────
  'Cary-Hiroyuki Tagawa', 'Robin Shou', 'Christopher McDonald', 'Jake Busey',
  'Sharlto Copley', 'Bokeem Woodbine', 'Michael Wincott', 'Gary Busey',
  'Eric Roberts', 'Mark Dacascos',
]

async function main() {
  const names = [...new Set(CHARACTER_ACTORS)] // dedupe
  console.log(`Tagging ${names.length} character actors...\n`)

  // Fetch current tags for all these actors
  const found: { id: string; name: string; universe_tags: string | null }[] = []
  for (let i = 0; i < names.length; i += 100) {
    const { data } = await supabase
      .from('actors')
      .select('id, name, universe_tags')
      .in('name', names.slice(i, i + 100))
    found.push(...(data ?? []))
  }

  const notFound = names.filter(n => !found.some(a => a.name === n))
  if (notFound.length) console.log(`Not in DB (skipping): ${notFound.join(', ')}\n`)

  let updated = 0, skipped = 0

  for (const actor of found) {
    const existing = actor.universe_tags
      ? actor.universe_tags.split(',').map(t => t.trim()).filter(Boolean)
      : []

    if (existing.includes('CharacterActor')) {
      skipped++
      continue
    }

    const newTags = [...existing, 'CharacterActor'].join(',')
    const { error } = await supabase
      .from('actors')
      .update({ universe_tags: newTags })
      .eq('id', actor.id)

    if (error) {
      console.error(`✗ ${actor.name}: ${error.message}`)
    } else {
      updated++
    }
  }

  console.log(`Done. ${updated} tagged, ${skipped} already tagged, ${notFound.length} not found.`)
}

main().catch(console.error)
