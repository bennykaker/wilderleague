/**
 * Tags actors known to be 6'0" or taller by adding "tall" to their keywords field.
 * Safe to re-run — only updates if "tall" isn't already present.
 * Run with: npx tsx scripts/tag-tall-actors.ts
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

// Actors confirmed 6'0" (183cm) or taller
const TALL_ACTORS = [
  // 6'0"
  'Clint Eastwood',
  'Cary Grant',
  'James Stewart',
  'Tom Selleck',
  'Denzel Washington',
  'Idris Elba',
  'Hugh Jackman',
  'Viggo Mortensen',
  'Russell Crowe',
  'Jon Hamm',
  'Ben Affleck',
  'Matt Damon',
  'Bradley Cooper',
  'Chris Pratt',
  'Chris Evans',
  'Ryan Reynolds',
  'Ryan Gosling',
  'Oscar Isaac',
  'Adam Driver',
  'Jake Gyllenhaal',
  'Michael Shannon',
  'Chiwetel Ejiofor',
  'Dev Patel',
  'Eddie Redmayne',
  'Andrew Garfield',
  'Tom Hardy',
  'James McAvoy',
  'Benedict Cumberbatch',
  'Mark Rylance',
  'Patrick Wilson',
  'Scott Eastwood',
  'Joel Edgerton',
  'Michael Fassbender',
  'Armie Hammer',
  'Sam Worthington',
  'Karl Urban',
  'Joel Kinnaman',
  'Jon Bernthal',
  'David Harbour',
  'Michael B. Jordan',
  'John David Washington',
  'Sterling K. Brown',
  'Aldis Hodge',
  'Yahya Abdul-Mateen II',
  'Jonathan Majors',
  'LaKeith Stanfield',
  'Stephan James',
  'Daniel Kaluuya',
  'John Boyega',
  'Kingsley Ben-Adir',
  'Damson Idris',
  'Anthony Mackie',
  'Winston Duke',
  'Chadwick Boseman',
  'Mahershala Ali',
  'Jeffrey Wright',
  'Don Cheadle',
  'Liev Schreiber',
  'Jason Statham',
  'Gerard Butler',
  'Daniel Craig',
  'Clive Owen',
  'Aaron Eckhart',
  'Josh Brolin',
  'Jon Hamm',
  'Timothy Olyphant',
  'Timothy Hutton',
  'Ed Harris',
  'William Hurt',
  'Jeff Bridges',
  'Sam Neill',
  'Bryan Cranston',
  'Dean Norris',
  'Aaron Paul',
  'Giancarlo Esposito',
  'Bob Odenkirk',
  'Jonathan Banks',
  'Peter Dinklage',

  // 6'1"+
  'Liam Neeson',
  'Jeff Goldblum',
  'Vince Vaughn',
  'Jason Segel',
  'John Slattery',
  'Hugh Bonneville',
  'Allen Leech',
  'Ed Speleers',
  'Richard Armitage',
  'Harry Hadden-Paton',
  'Matthew Goode',
  'Iain Glen',
  'Tom Cullen',
  'Julian Ovenden',
  'Brendan Coyle',
  'Rob James-Collier',
  'David Robb',
  'Goran Visnjic',
  'Shane West',
  'Noah Wyle',
  'George Clooney',
  'Brad Pitt',
  'Casey Affleck',
  'Vincent Cassel',
  'Nikolaj Coster-Waldau',
  'Aidan Gillen',
  'Gethin Anthony',
  'Richard Madden',
  'Kit Harington',
  'Joe Dempsie',
  'Alfie Allen',
  'Dean-Charles Chapman',
  'Pilou Asbæk',
  'Tobias Menzies',
  'Jack Lowden',
  'Sam Heughan',
  'Ciarán Hinds',
  'Liam Cunningham',
  'Michiel Huisman',
  'Tom Wlaschiha',
  'Kristofer Hivju',
  'Iwan Rheon',
  'Rory McCann',
  'Charles Dance',
  'Jonathan Pryce',
  'Max von Sydow',
  'Stephen Dillane',
  'Conleth Hill',
  'Owen Teale',
  'Ian McElhinney',
  'James Cosmo',
  'Staz Nair',
  'Joe Dempsie',

  // 6'2"+
  'Vince Vaughn',
  'Jason Momoa',
  'Dwayne Johnson',
  'Chris Hemsworth',
  'Dave Bautista',
  'Joel Edgerton',
  'Armie Hammer',
  'Lee Pace',
  'Luke Evans',
  'Nikolaj Coster-Waldau',
  'Alexander Skarsgård',
  'Bill Skarsgård',
  'Joel Kinnaman',
  'David Harbour',
  'Jon Bernthal',
  'Walton Goggins',
  'Timothy Olyphant',
  'Walton Goggins',
  'Sam Trammell',
  'Stephen Moyer',
  'Ryan Kwanten',
  'Joe Manganiello',
  'Rob Kazinsky',
  'Rutger Hauer',
  'Michael Rooker',
  'Henry Cavill',
  'Jai Courtney',
  'Jai Courtney',
  'Sam Claflin',
  'Douglas Booth',
  'Max Irons',
  'Ed Westwick',
  'Theo James',
  'Matt Bomer',
  'Taylor Kitsch',
  'Josh Hutcherson',
  'Liam Hemsworth',
  'Logan Lerman',
  'Miles Teller',
  'Ansel Elgort',
  'Taron Egerton',
  'Jack O\'Connell',
  'George MacKay',
  'Dean-Charles Chapman',

  // Tall women (5\'9"+)
  'Sigourney Weaver',
  'Uma Thurman',
  'Geena Davis',
  'Brooke Shields',
  'Nicole Kidman',
  'Charlize Theron',
  'Gwendoline Christie',
  'Connie Nielsen',
  'Carice van Houten',
  'Natalie Dormer',
  'Sophie Turner',
  'Maisie Williams',
  'Hannah Murray',
  'Emilia Clarke',
  'Nathalie Emmanuel',
  'Indira Varma',
  'Lena Headey',
  'Diana Rigg',
  'Michelle Fairley',
  'Kate Dickie',
  'Ellie Kendrick',
  'Gemma Whelan',
  'Laura Pradelska',
  'Sibel Kekilli',
  'Oona Chaplin',
  'Rose Leslie',
  'Kerry Ingram',
  'Kerri Russell',
]

async function main() {
  const unique = [...new Set(TALL_ACTORS)]
  console.log(`Processing ${unique.length} actors...\n`)
  let updated = 0, skipped = 0, notFound = 0

  for (const name of unique) {
    const { data } = await supabase
      .from('actors')
      .select('id, name, keywords')
      .ilike('name', name)
      .single()

    if (!data) { notFound++; continue }

    const current = data.keywords ?? ''
    if (current.includes('tall')) { skipped++; continue }

    const newKeywords = current ? `${current}; tall` : 'tall'
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
