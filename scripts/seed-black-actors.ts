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

// Deduplicated list — canonical names only
const ACTORS = [...new Set([
  // Tier 1
  'Morgan Freeman', 'Denzel Washington', 'Samuel L. Jackson', 'Eddie Murphy',
  'Will Smith', 'Jamie Foxx', 'Forest Whitaker', 'Laurence Fishburne',
  'Wesley Snipes', 'Cuba Gooding Jr.', 'Halle Berry', 'Angela Bassett',
  'Viola Davis', 'Whoopi Goldberg', 'Cicely Tyson', 'James Earl Jones',
  'Spike Lee', 'Danny Glover', 'Ving Rhames', 'Don Cheadle',
  'Idris Elba', 'Chiwetel Ejiofor', 'David Oyelowo', 'Chadwick Boseman',
  'Michael B. Jordan', "Lupita Nyong'o", 'Danai Gurira', 'Daniel Kaluuya',
  'Sterling K. Brown', 'Regina King', 'Kerry Washington', 'Taraji P. Henson',
  'Gabrielle Union', 'Zoe Saldana', 'Naomie Harris', 'Thandiwe Newton',
  'Octavia Spencer', 'Jennifer Hudson', 'Niecy Nash', 'Sheryl Lee Ralph',
  'Phylicia Rashad', 'Alfre Woodard', 'CCH Pounder', 'Lynn Whitfield',
  'Jada Pinkett Smith', 'Regina Hall', 'Issa Rae', 'Tiffany Haddish',
  'Leslie Jones', 'Marsai Martin', 'Yara Shahidi', 'Zendaya',
  'Amandla Stenberg', 'Keke Palmer', 'Teyonah Parris', 'Dominique Fishback',
  'Thuso Mbedu',
  // Tier 2
  'Mahershala Ali', 'Andre Holland', 'Aldis Hodge', 'Stephan James',
  'Lakeith Stanfield', 'Brian Tyree Henry', 'Jonathan Majors', 'Anthony Mackie',
  'Delroy Lindo', 'Jeffrey Wright', 'Giancarlo Esposito', 'Keith David',
  'Djimon Hounsou', 'Adewale Akinnuoye-Agbaje', 'Nonso Anozie',
  'David Harewood', 'Nathan Stewart-Jarrett', 'John Boyega', 'Damson Idris',
  'Ncuti Gatwa', 'Paapa Essiedu', 'Malachi Kirby', 'Tobi Bamtefa',
  'Jimmy Akingbola', 'Gugu Mbatha-Raw', 'Freema Agyeman', 'Wunmi Mosaku',
  'Sheila Atim', 'Cynthia Erivo', 'Jodie Turner-Smith', 'Simone Missick',
  'Meagan Good', 'Kimberly Elise', 'Sanaa Lathan', 'Jurnee Smollett',
  'Aja Naomi King', 'Antoinette Robertson', 'Logan Browning', 'DeWanda Wise',
  'Aunjanue Ellis', 'Adina Porter', 'Susan Kelechi Watson', 'Erika Alexander',
  'Lisa Nicole Carson', 'Tracee Ellis Ross', 'Quinta Brunson', 'Janelle James',
  'Sherri Shepherd', 'Kellita Smith', 'Tichina Arnold', 'Kim Fields',
  'Chandra Wilson', 'Jerrika Hinton', 'Kelly McCreary',
  // Tier 3
  'Obba Babatundé', 'Glynn Turman', 'Roger Guenveur Smith', 'Wood Harris',
  'Harold Perrineau', 'Lennie James', 'Clarke Peters', 'Wendell Pierce',
  'Lance Reddick', 'Sonja Sohn', 'Andre Royo', 'Michael K. Williams',
  'Isiah Whitlock Jr.', 'Chad Coleman', 'J.D. Williams', 'Larry Gilliard Jr.',
  'Hassan Johnson', 'Felicia Pearson', 'Tristan Wilds', 'Reg E. Cathey',
  'Frankie Faison', 'Seth Gilliam', 'J. August Richards', 'Gary Dourdan',
  'Hill Harper', 'Rockmond Dunbar', 'Mekhi Phifer', 'Omar Epps',
  'Taye Diggs', 'Boris Kodjoe', 'Morris Chestnut', 'Shemar Moore',
  'Carl Weathers', 'Tommy Davidson', 'Damon Wayans', 'Keenen Ivory Wayans',
  'Marlon Wayans', 'Shawn Wayans', 'Kim Wayans', 'Kim Coles',
  'Wendy Raquel Robinson', 'Countess Vaughn', 'Hosea Chanchez', 'Pooch Hall',
  'Persia White', 'Golden Brooks', 'Jackée Harry', 'T.C. Carson',
  'Terrence Howard', 'Essence Atkins', 'D.L. Hughley', 'Cedric the Entertainer',
  'Steve Harvey', 'Sinbad', 'Martin Lawrence', 'Chris Tucker', 'Dave Chappelle',
  'Chris Rock', 'Tracy Morgan', 'Kevin Hart', 'Mike Epps', 'Nick Cannon',
  'Lil Rel Howery', 'Jerrod Carmichael', 'Keegan-Michael Key', 'Jordan Peele',
  'Reginald VelJohnson', 'Joe Morton', 'Tim Reid', 'Tony Todd',
  'Bill Duke', 'Vondie Curtis-Hall', 'Ernie Hudson', 'Ossie Davis',
  'Ruby Dee', 'Louis Gossett Jr.', 'Paul Winfield', 'Pam Grier',
  'Diahann Carroll', 'Redd Foxx',
  // Tier 4
  'Nate Parker', 'Tyler James Williams', 'Trevor Jackson', 'Rome Flynn',
  'Charles Michael Davis', 'Kofi Siriboe', 'Kendrick Sampson', 'Jay Ellis',
  'McKinley Belcher III', 'Toheeb Jimoh', 'Sam Richardson', 'Bashir Salahuddin',
  "O'Shea Jackson Jr.", 'Algee Smith', 'Caleb McLaughlin', 'Chosen Jacobs',
  'Jeremy Pope', 'Jharrel Jerome', 'Asante Blackk', 'Ray Fisher',
  'Yahya Abdul-Mateen II', 'Trevante Rhodes', 'Ashton Sanders',
  'Nnamdi Asomugha', 'Corey Hawkins', 'Mamoudou Athie', 'Sinqua Walls',
  'Omari Hardwick', 'Method Man', 'Ice Cube', 'Ice-T', 'Common',
  'Ludacris', 'Mos Def', 'John David Washington', 'Malcolm Washington',
  'Leon', 'Billy Dee Williams', 'Bokeem Woodbine', 'Laz Alonso',
  'Terry Crews', 'Mehcad Brooks', 'Wayne Brady', 'Tituss Burgess',
  'Billy Porter', 'Dulé Hill', 'Lamman Rucker', 'Richard T. Jones',
  'Malik Yoba', 'Darius McCrary', 'Tahj Mowry', 'Tia Mowry',
  'Tamera Mowry', 'Raven-Symoné', 'Kyla Pratt', 'Nafessa Williams',
  'Anika Noni Rose', 'Condola Rashad', 'Amber Riley', 'Queen Latifah',
  'Halle Bailey', 'Chloe Bailey', 'Brandy', 'Donald Glover',
  'Janelle Monáe', 'Leslie Odom Jr.', 'Daveed Diggs', 'Anthony Ramos',
  // Tier 5
  'Demore Barnes', 'Dayo Okeniyi', 'Mike Colter', 'Erica Tazel',
  'Mpho Koaho', 'Sharon Leal', 'Megalyn Echikunwoke', 'Skai Jackson',
  'Shahadi Wright Joseph', 'Ethan Herisse', 'Jovan Adepo', 'Niles Fitch',
  'Lonnie Chavis', 'Justin Cornwell', 'Brandon Micheal Hall',
  'Marquis Rodriguez', 'Kadeem Hardison', 'Deon Richmond',
  'Marla Gibbs', 'Anna Maria Horsford', 'Dawnn Lewis', 'Jasmine Guy',
  'Reggie Hayes', 'Coby Bell', 'Sticky Fingaz', 'Craig Robinson',
  'Finesse Mitchell', 'Jacob Tremblay',
])]

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
  return res.json() as Promise<{ biography?: string; birthday?: string }>
}

async function generateProfile(name: string, biography: string): Promise<string> {
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [{ role: 'user', content: `You are Marlowe, a veteran Hollywood casting director. Write a 2-3 sentence casting profile for ${name}. Bio: ${biography.slice(0, 300)}. Direct and specific.` }],
  })
  return msg.content[0].type === 'text' ? msg.content[0].text : ''
}

async function main() {
  const { data: existing } = await sb.from('actors').select('name, race_ethnicity').in('name', ACTORS)
  const existingMap = new Map(existing?.map(a => [a.name, a]) ?? [])

  const toAdd = ACTORS.filter(n => !existingMap.has(n))
  const toUpdate = ACTORS.filter(n => existingMap.has(n))

  console.log(`${existingMap.size} in DB, ${toAdd.length} to add\n`)

  console.log('Tagging existing actors...')
  for (const name of toUpdate) {
    await sb.from('actors').update({ race_ethnicity: 'Black' }).eq('name', name)
    process.stdout.write('.')
  }
  console.log(`\nTagged ${toUpdate.length} existing actors\n`)

  console.log('Adding missing actors...')
  let added = 0, notFound = 0
  for (const name of toAdd) {
    process.stdout.write(`  ${name}... `)
    const result = await tmdbSearch(name)
    if (!result) { console.log('NOT FOUND'); notFound++; continue }

    const { data: byId } = await sb.from('actors').select('name').eq('tmdb_id', result.id)
    if (byId && byId.length > 0) {
      await sb.from('actors').update({ race_ethnicity: 'Black' }).eq('tmdb_id', result.id)
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
      birth_year: details.birthday ? parseInt(details.birthday.split('-')[0]) : 1970,
      casting_profile,
      race_ethnicity: 'Black',
      cost: 2,
    })
    if (error) { console.log(`ERROR: ${error.message}`) } else { console.log('done'); added++ }
    await new Promise(r => setTimeout(r, 300))
  }

  const { count } = await sb.from('actors').select('*', { count: 'exact', head: true }).eq('race_ethnicity', 'Black')
  console.log(`\nDone. Added ${added} new, ${notFound} not found on TMDB.`)
  console.log(`Total Black actors in DB: ${count}`)
}

main()
