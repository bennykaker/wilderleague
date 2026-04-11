import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'
import path from 'path'

const env = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
for (const line of env.split('\n')) {
  const m = line.match(/^([^=]+)=(.*)$/)
  if (m) process.env[m[1].trim()] = m[2].trim()
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const TMDB_TOKEN = process.env.TMDB_API_KEY!

const CANADIANS = [
  // Comedy
  'Jim Carrey', 'Mike Myers', 'Dan Aykroyd', 'Martin Short', 'Eugene Levy',
  "Catherine O'Hara", 'Andrea Martin', 'Rick Moranis', 'Dave Thomas', 'Seth Rogen',
  'Jay Baruchel', 'Mark McKinney', 'Bruce McCulloch', 'Kevin McDonald',
  'Scott Thompson', 'Dave Foley', 'Tom Green', 'Howie Mandel', 'Tommy Chong',
  'Brent Butt', 'Gerry Dee', 'Jon Dore',
  // A-List
  'Ryan Reynolds', 'Ryan Gosling', 'Keanu Reeves', 'Michael J. Fox',
  'Kiefer Sutherland', 'Donald Sutherland', 'Brendan Fraser', 'Rachel McAdams',
  'Sandra Oh', 'Evangeline Lilly', 'Cobie Smulders', 'Nathan Fillion',
  'Carrie-Anne Moss', 'Kim Cattrall', 'Sarah Polley', 'Neve Campbell',
  'Elisha Cuthbert', 'Kristin Kreuk', 'Elliot Page', 'Anna Paquin',
  // Drama/Character
  'Colm Feore', 'Victor Garber', 'Paul Gross', 'Callum Keith Rennie',
  'Eric McCormack', 'Tom Cavanagh', 'Enrico Colantoni', 'Yannick Bisson',
  'Michael Ironside', 'Michael Shanks', 'Amanda Tapping', 'David Hewlett',
  'Aaron Ashmore', 'Shawn Ashmore', 'Adam Beach', 'Graham Greene',
  'Tantoo Cardinal', 'Tom Jackson', 'Gary Farmer', 'Nathaniel Arcand',
  'Sarah Wayne Callies', 'Emily Hampshire', 'Annie Murphy', 'Dan Levy',
  'Stephan James', 'Shamier Anderson', 'Robbie Amell', 'Stephen Amell',
  'Luke Macfarlane', 'Kristian Bruun', 'Tatiana Maslany', 'Laura Vandervoort',
  'Sarah Gadon', 'Rossif Sutherland', 'Angus Macfadyen', 'Nicholas Campbell',
  'Saul Rubinek', 'Simu Liu', 'Avan Jogia', 'Hamza Haq',
  // Vancouver/BC
  'Tahmoh Penikett', 'Lexa Doig', 'Joanne Kelly', 'Emily Perkins',
  'Katharine Isabelle', 'Lochlyn Munro', 'Nicholas Lea', 'William B. Davis',
  'Rekha Sharma', 'Chelah Horsdal', 'Ty Olsson', 'Adrian Holmes',
  'Aleks Paunovic', 'Matt Frewer', 'Peter Outerbridge', 'Blu Mankuma',
  'Colin Cunningham', 'Alessandro Juliani', 'Ryan Robbins', 'Mike Dopud',
  'Garwin Sanford', 'Sebastian Spence', 'Eric Keenleyside', 'Teach Grant',
  'Benz Antoine', 'Peter New',
  // Younger Generation
  'Finn Wolfhard', 'Jacob Tremblay', 'Devery Jacobs', 'Kiawentiio',
  'Paulina Alexis', 'Sara Waisglass', 'Munro Chambers', 'Charlotte Sullivan',
  'Melanie Scrofano', 'Cara Gee', 'Brandon Oakes', 'Keon Alexander',
  'Gregory Smith', 'Jake Epstein', 'Brandon Jay McLaren', 'Mpho Koaho',
  'Torrance Coombs', 'Corey Sevier', 'Dylan Everett', 'Atticus Mitchell',
  // Quebec/French Canadian
  'Roy Dupuis', 'Lothaire Bluteau', 'Pascale Bussières', 'Marie-Josée Croze',
  'Xavier Dolan', 'Marc-André Grondin', 'Maxim Roy', 'Karine Vanasse',
  'Émilie Ullerup',
  // Stage/TV Pros
  'R.H. Thomson', 'Tom McCamus', 'Yanna McIntosh', 'Karen Robinson',
  'Raoul Bhaneja', 'Clé Bennett', 'Alan Van Sprang', 'Joanne Vannicola',
  'Michelle Nolden', 'Tony Nappo', 'Jonas Chernick', 'Inga Cadranel',
  'Peter Stebbings', 'Sugith Varughese', 'Kenneth Welsh', 'Diego Klattenhoff',
  'Ennis Esmer', 'Ali Hassan', 'Supinder Wraich', 'David Alpay',
]

async function tmdbSearch(name: string) {
  const res = await fetch(
    `https://api.themoviedb.org/3/search/person?query=${encodeURIComponent(name)}`,
    { headers: { Authorization: `Bearer ${TMDB_TOKEN}`, accept: 'application/json' } }
  )
  const data = await res.json() as { results?: { id: number; name: string; popularity: number; profile_path: string | null }[] }
  return data.results?.[0] ?? null
}

async function tmdbDetails(id: number) {
  const res = await fetch(`https://api.themoviedb.org/3/person/${id}`,
    { headers: { Authorization: `Bearer ${TMDB_TOKEN}`, accept: 'application/json' } }
  )
  return res.json() as Promise<{ biography?: string; birthday?: string; known_for_department?: string }>
}

async function generateProfile(name: string, biography: string): Promise<string> {
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [{ role: 'user', content: `You are Marlowe, a veteran Hollywood casting director. Write a 2-3 sentence casting profile for ${name}, Canadian actor. Bio: ${biography.slice(0, 300)}. Direct and specific.` }],
  })
  return msg.content[0].type === 'text' ? msg.content[0].text : ''
}

async function main() {
  const { data: existing } = await sb.from('actors').select('name, nationality, universe_tags').in('name', CANADIANS)
  const existingMap = new Map(existing?.map(a => [a.name, a]) ?? [])

  const toAdd = CANADIANS.filter(n => !existingMap.has(n))
  const toUpdate = CANADIANS.filter(n => existingMap.has(n))

  console.log(`${existingMap.size} in DB, ${toAdd.length} to add\n`)

  // Set nationality: 'Canada' on existing actors
  console.log('Tagging existing actors...')
  for (const name of toUpdate) {
    await sb.from('actors').update({ nationality: 'Canada' }).eq('name', name)
    process.stdout.write('.')
  }
  console.log(`\nTagged ${toUpdate.length} existing actors\n`)

  // Add missing actors via TMDB
  console.log('Adding missing actors...')
  let added = 0, notFound = 0
  for (const name of toAdd) {
    process.stdout.write(`  ${name}... `)
    const result = await tmdbSearch(name)
    if (!result) { console.log('NOT FOUND'); notFound++; continue }

    // Check for TMDB ID collision
    const { data: byId } = await sb.from('actors').select('name, nationality').eq('tmdb_id', result.id)
    if (byId && byId.length > 0) {
      await sb.from('actors').update({ nationality: 'Canada' }).eq('tmdb_id', result.id)
      console.log(`tagged existing (${byId[0].name})`); continue
    }

    const details = await tmdbDetails(result.id)
    const casting_profile = await generateProfile(name, details.biography ?? '')
    const { error } = await sb.from('actors').insert({
      name,
      tmdb_id: result.id,
      headshot_url: result.profile_path ? `https://image.tmdb.org/t/p/w500${result.profile_path}` : 'https://www.gravatar.com/avatar/?d=mp&s=500',
      popularity: result.popularity,
      known_for: name,
      biography: details.biography ?? '',
      birth_year: 1970,
      casting_profile,
      nationality: 'Canada',
      cost: 2,
    })
    if (error) { console.log(`ERROR: ${error.message}`) } else { console.log('done'); added++ }
    await new Promise(r => setTimeout(r, 300))
  }

  const { count } = await sb.from('actors').select('*', { count: 'exact', head: true }).eq('nationality', 'Canada')
  console.log(`\nDone. Added ${added} new, ${notFound} not found on TMDB.`)
  console.log(`Total Canadian actors in DB: ${count}`)
}

main()
