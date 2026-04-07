/**
 * Seeds female actors across all categories — A-list, TV drama, comedy,
 * British, character actresses, emerging, genre, veterans, Black/Latina/Asian/European.
 * Skips anyone already in DB. Safe to re-run.
 * Run with: npx tsx scripts/seed-women-actors.ts
 */

import Anthropic from '@anthropic-ai/sdk'
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

const TMDB_KEY = process.env.TMDB_API_KEY!
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }
function popularityToCost(pop: number): number {
  if (pop >= 20) return 12; if (pop >= 15) return 10; if (pop >= 12) return 8
  if (pop >= 10) return 6; if (pop >= 6) return 4; return 3
}
function genderLabel(g: number): string {
  if (g === 1) return 'female'; if (g === 2) return 'male'; return ''
}

const ACTORS = [
  // Global A-list
  'Meryl Streep', 'Cate Blanchett', 'Julianne Moore', 'Nicole Kidman',
  'Charlize Theron', 'Viola Davis', "Lupita Nyong'o", 'Sandra Bullock',
  'Julia Roberts', 'Reese Witherspoon', 'Natalie Portman', 'Scarlett Johansson',
  'Jennifer Lawrence', 'Emma Stone', 'Saoirse Ronan', 'Florence Pugh',
  'Margot Robbie', 'Zendaya', 'Anya Taylor-Joy', 'Ana de Armas',

  // Established stars
  'Amy Adams', 'Jessica Chastain', 'Rachel McAdams', 'Kirsten Dunst',
  'Naomi Watts', 'Laura Dern', 'Frances McDormand', 'Holly Hunter',
  'Sigourney Weaver', 'Glenn Close', 'Helen Mirren', 'Judi Dench',
  'Emma Thompson', 'Kate Winslet', 'Keira Knightley', 'Rachel Weisz',
  'Emily Blunt', 'Olivia Colman', 'Carey Mulligan', 'Rooney Mara',

  // TV drama
  'Elisabeth Moss', 'Claire Danes', 'Robin Wright', 'Connie Britton',
  'Evangeline Lilly', 'Maggie Gyllenhaal', 'Michelle Williams',
  'Patricia Clarkson', 'Allison Janney', 'Edie Falco', 'Marcia Gay Harden',
  'Mary-Louise Parker', 'Kyra Sedgwick', 'Toni Collette', 'Vera Farmiga',
  'Anna Gunn', 'Tatiana Maslany', 'Sandra Oh',

  // Comedy
  'Tina Fey', 'Amy Poehler', 'Julia Louis-Dreyfus', 'Kristen Wiig',
  'Melissa McCarthy', 'Maya Rudolph', 'Mindy Kaling', 'Issa Rae',
  'Awkwafina', 'Ali Wong', 'Wanda Sykes', 'Regina Hall', 'Tiffany Haddish',
  'Kate McKinnon', 'Cecily Strong', 'Aubrey Plaza', 'Anna Kendrick',
  'Rebel Wilson', 'Leslie Mann', 'Lake Bell',

  // British A-list
  'Emma Watson', 'Daisy Ridley', 'Felicity Jones', 'Rosamund Pike',
  'Gemma Arterton', 'Thandiwe Newton', 'Naomie Harris', 'Freya Allan',
  'Maisie Williams', 'Sophie Turner', 'Emilia Clarke', 'Ruth Wilson',
  'Suranne Jones', 'Maxine Peake', 'Sarah Lancashire', 'Jodie Whittaker',
  'Phoebe Dynevor', 'Simone Ashley', 'Emma Mackey',

  // Character actresses
  'Tilda Swinton', 'Chloë Sevigny', 'Parker Posey', 'Catherine Keener',
  'Hope Davis', 'Maria Bello', 'Rosemarie DeWitt', 'Melanie Lynskey',
  'Carrie Coon', 'Ann Dowd', 'Molly Shannon', 'Amy Sedaris', 'Lili Taylor',
  'Gretchen Mol', 'Patricia Arquette', 'Rosanna Arquette', 'Mare Winningham',
  'Kathy Bates', 'Margo Martindale',

  // Emerging
  'Sydney Sweeney', 'Jenna Ortega', 'Sadie Sink', 'Millie Bobby Brown',
  'Sophia Lillis', 'Elsie Fisher', 'Beanie Feldstein', 'Kaitlyn Dever',
  'Hailee Steinfeld', 'Thomasin McKenzie', 'Eliza Scanlen', 'Odessa A\'zion',
  'Rachel Sennott', 'Havana Rose Liu', 'Devery Jacobs', 'Lily Gladstone',
  'Amber Midthunder', 'Quintessa Swindell', 'Dominique Fishback', 'Teyonah Parris',

  // Horror and genre
  'Jamie Lee Curtis', 'Neve Campbell', 'Linda Hamilton', 'Milla Jovovich',
  'Kate Beckinsale', 'Eliza Dushku', 'Summer Glau', 'Katee Sackhoff',
  'Tricia Helfer',

  // Veteran legends
  'Jane Fonda', 'Lily Tomlin', 'Goldie Hawn', 'Diane Keaton', 'Sally Field',
  'Susan Sarandon', 'Sissy Spacek', 'Diane Lane', 'Ellen Burstyn',
  'Shirley MacLaine', 'Angela Lansbury', 'Betty White', 'Cicely Tyson',
  'Diahann Carroll', 'Pam Grier', 'Debbie Reynolds', 'Carrie Fisher',
  'Penny Marshall', 'Bette Midler',

  // Black excellence
  'Angela Bassett', 'Halle Berry', 'Taraji P. Henson', 'Kerry Washington',
  'Gabrielle Union', 'Regina King', 'Janelle Monáe', 'Zoe Saldana',
  'Danai Gurira', 'Uzo Aduba', 'Yvonne Orji', 'Amber Stevens West',
  'Meagan Good', 'Tika Sumpter', 'Rutina Wesley', 'Adina Porter',
  'Lorraine Toussaint', 'CCH Pounder',

  // Latina
  'Salma Hayek', 'Jennifer Lopez', 'Eva Longoria', 'Sofia Vergara',
  'Penélope Cruz', 'America Ferrera', 'Gina Rodriguez', 'Stephanie Beatriz',
  'Melissa Barrera', 'Yalitza Aparicio', 'Eiza González', 'Karla Souza',
  'Ana de la Reguera', 'Adriana Barraza', 'Kate del Castillo',
  'Camila Morrone',

  // Australian and New Zealand
  'Rose Byrne', 'Teresa Palmer', 'Mia Wasikowska', 'Abbie Cornish',
  'Miranda Otto', 'Rachel Griffiths', 'Essie Davis', 'Deborah Mailman',
  'Miranda Tapsell', 'Leah Purcell', 'Jacki Weaver', 'Judy Davis',
  'Rachel Blake', 'Claudia Karvan',

  // European
  'Isabelle Huppert', 'Marion Cotillard', 'Juliette Binoche', 'Sophie Marceau',
  'Audrey Tautou', 'Léa Seydoux', 'Adèle Exarchopoulos', 'Eva Green',
  'Mélanie Laurent', 'Virginie Efira', 'Carmen Maura', 'Paz Vega',
  'Belén Rueda', 'Elena Anaya', 'Monica Bellucci', 'Asia Argento',
  'Valeria Golino', 'Alba Rohrwacher', 'Jasmine Trinca',

  // Asian
  'Zhang Ziyi', 'Gong Li', 'Tang Wei', 'Zhou Xun', 'Fan Bingbing',
  'Maggie Cheung', 'Shu Qi', 'Cecilia Cheung',

  // Cult and indie
  'Greta Gerwig', 'Lena Dunham', 'Brit Marling', 'Zoe Kazan', 'Jenny Slate',
  'Gillian Jacobs', 'Brie Larson', 'Shailene Woodley', 'Imogen Poots',
  'Hannah Murray', 'Juno Temple', 'Andrea Riseborough', 'Jessie Buckley',
  'Morfydd Clark', 'Phoebe Waller-Bridge', 'Sian Clifford', 'Sharon Horgan',
  'Aisling Bea', 'Ann Skelly',

  // Wildcard and underrated
  'Wunmi Mosaku', 'Letitia Wright', 'Michaela Coel', 'Jodie Turner-Smith',
  'Naomi Ackie', 'Eleanor Matsuura', 'Antonia Thomas', 'Rakhee Thakrar',
  'Natalie Tena',
]

async function searchTmdb(name: string): Promise<any | null> {
  const res = await fetch(
    `https://api.themoviedb.org/3/search/person?query=${encodeURIComponent(name)}&include_adult=false`,
    { headers: { Authorization: `Bearer ${TMDB_KEY}`, accept: 'application/json' } }
  )
  if (!res.ok) return null
  const data = await res.json() as any
  return data.results?.[0] ?? null
}

async function fetchDetail(tmdbId: number): Promise<any | null> {
  const res = await fetch(
    `https://api.themoviedb.org/3/person/${tmdbId}?append_to_response=combined_credits`,
    { headers: { Authorization: `Bearer ${TMDB_KEY}`, accept: 'application/json' } }
  )
  if (!res.ok) return null
  return res.json()
}

async function generateProfile(name: string, biography: string, known_for: string): Promise<string> {
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: `You are Marlowe, a veteran Hollywood casting director. Write a 2-3 sentence casting profile for ${name}. Focus on screen presence, range, what roles they excel at, and what makes them distinctive. Known for: ${known_for}. Bio: ${biography.slice(0, 300)}`,
    }],
  })
  return msg.content[0].type === 'text' ? msg.content[0].text.trim() : ''
}

async function main() {
  const unique = [...new Set(ACTORS)]
  console.log(`Processing ${unique.length} actors...\n`)
  let added = 0, skipped = 0, failed = 0

  for (const name of unique) {
    try {
      process.stdout.write(`${name}... `)

      const { data: existing } = await supabase
        .from('actors').select('name').ilike('name', name).single()
      if (existing) { console.log('already exists'); skipped++; await sleep(100); continue }

      const result = await searchTmdb(name)
      if (!result) { console.log('✗ not found on TMDB'); failed++; await sleep(300); continue }

      await sleep(260)

      const detail = await fetchDetail(result.id)
      if (!detail) { console.log('✗ detail fetch failed'); failed++; await sleep(300); continue }

      await sleep(260)

      const credits = (detail.combined_credits?.cast ?? []) as any[]
      const topCredits = credits
        .filter((c: any) => c.vote_count > 50)
        .sort((a: any, b: any) => b.popularity - a.popularity)
        .slice(0, 6)
        .map((c: any) => c.title || c.name)
        .filter(Boolean)
      const known_for = topCredits.join('; ') || 'film and television'

      const casting_profile = await generateProfile(detail.name, detail.biography ?? '', known_for)
      await sleep(200)

      const pop = detail.popularity ?? 0
      const { error } = await supabase.from('actors').upsert({
        tmdb_id: String(detail.id),
        name: detail.name,
        headshot_url: detail.profile_path ? `https://image.tmdb.org/t/p/w500${detail.profile_path}` : '',
        popularity: pop,
        cost: popularityToCost(pop),
        gender: genderLabel(detail.gender ?? 0),
        birth_year: detail.birthday ? detail.birthday.slice(0, 4) : '',
        biography: detail.biography ?? '',
        known_for,
        keywords: 'drama; female',
        casting_profile,
        notes: 'seeded via seed-women-actors.ts',
      }, { onConflict: 'tmdb_id' })

      if (error) throw new Error(error.message)
      added++
      console.log(`✓ (pop: ${pop.toFixed(1)}, $${popularityToCost(pop)}M)`)

    } catch (err) {
      failed++
      console.log(`✗ ${err instanceof Error ? err.message : err}`)
    }
    await sleep(300)
  }

  console.log(`\nDone. Added: ${added} | Skipped: ${skipped} | Failed: ${failed}`)
}

main().catch(console.error)
