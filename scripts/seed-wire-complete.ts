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
const TMDB_KEY = process.env.TMDB_API_KEY!

const WIRE_CAST = [
  { name: 'Dominic West',         role: 'Jimmy McNulty',      tier: 1 },
  { name: 'Idris Elba',           role: 'Stringer Bell',      tier: 1 },
  { name: 'Michael K. Williams',  role: 'Omar Little',        tier: 1 },
  { name: 'Wood Harris',          role: 'Avon Barksdale',     tier: 1 },
  { name: 'Wendell Pierce',       role: 'Bunk Moreland',      tier: 1 },
  { name: 'Clarke Peters',        role: 'Lester Freamon',     tier: 1 },
  { name: 'Aidan Gillen',         role: 'Tommy Carcetti',     tier: 1 },
  { name: 'Andre Royo',           role: 'Bubbles',            tier: 1 },
  { name: 'Lance Reddick',        role: 'Cedric Daniels',     tier: 1 },
  { name: 'Michael B. Jordan',    role: 'Wallace',            tier: 2 },
  { name: 'Sonja Sohn',           role: 'Kima Greggs',        tier: 2 },
  { name: 'Jamie Hector',         role: 'Marlo Stanfield',    tier: 2 },
  { name: 'Larry Gilliard Jr.',   role: "D'Angelo Barksdale", tier: 2 },
  { name: 'Seth Gilliam',         role: 'Carver',             tier: 2 },
  { name: 'Domenick Lombardozzi', role: 'Herc',               tier: 2 },
  { name: 'J.D. Williams',        role: 'Bodie',              tier: 2 },
  { name: 'Chad Coleman',         role: 'Cutty',              tier: 2 },
  { name: 'Isiah Whitlock Jr.',   role: 'Clay Davis',         tier: 2 },
  { name: 'John Doman',           role: 'Rawls',              tier: 2 },
  { name: 'Frankie Faison',       role: 'Burrell',            tier: 2 },
  { name: 'Deirdre Lovejoy',      role: 'Rhonda Pearlman',    tier: 3 },
  { name: 'Robert F. Chew',       role: 'Prop Joe',           tier: 3 },
  { name: 'Hassan Johnson',       role: 'Wee-Bey',            tier: 3 },
  { name: 'Chris Bauer',          role: 'Frank Sobotka',      tier: 3 },
  { name: 'Felicia Pearson',      role: 'Snoop',              tier: 3 },
  { name: 'Tristan Wilds',        role: 'Michael',            tier: 3 },
]

async function tmdbSearch(name: string) {
  const url = `https://api.themoviedb.org/3/search/person?api_key=${TMDB_KEY}&query=${encodeURIComponent(name)}`
  const res = await fetch(url)
  const data = await res.json() as { results?: { id: number; name: string; popularity: number; profile_path: string | null; known_for_department: string }[] }
  return data.results?.[0] ?? null
}

async function tmdbDetails(id: number) {
  const url = `https://api.themoviedb.org/3/person/${id}?api_key=${TMDB_KEY}`
  const res = await fetch(url)
  return res.json() as Promise<{ biography?: string; birthday?: string }>
}

async function generateProfile(name: string, biography: string, knownFor: string): Promise<string> {
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [{ role: 'user', content: `You are Marlowe, a veteran Hollywood casting director. Write a 2-3 sentence casting profile for ${name}. Known for: ${knownFor}. Bio: ${biography.slice(0, 300)}. Be direct and specific about their screen presence and best use.` }],
  })
  return msg.content[0].type === 'text' ? msg.content[0].text : ''
}

async function main() {
  // Step 1: Check which actors already exist
  const { data: existing } = await sb.from('actors').select('name').in('name', WIRE_CAST.map(a => a.name))
  const existingNames = new Set(existing?.map(a => a.name) ?? [])
  const missing = WIRE_CAST.filter(a => !existingNames.has(a.name))
  console.log(`${existingNames.size} already in DB, ${missing.length} to add:\n${missing.map(a => `  ${a.name}`).join('\n')}\n`)

  // Step 2: Seed missing actors from TMDB
  for (const actor of missing) {
    process.stdout.write(`  Seeding ${actor.name}... `)
    const result = await tmdbSearch(actor.name)
    if (!result) { console.log('not found on TMDB'); continue }
    const details = await tmdbDetails(result.id)
    const knownFor = 'The Wire'
    const casting_profile = await generateProfile(actor.name, details.biography ?? '', knownFor)
    const headshot_url = result.profile_path ? `https://image.tmdb.org/t/p/w500${result.profile_path}` : null
    const birth_year = details.birthday ? parseInt(details.birthday.split('-')[0]) : null

    const { error } = await sb.from('actors').upsert({
      name: actor.name,
      tmdb_id: result.id,
      headshot_url,
      popularity: result.popularity,
      known_for: knownFor,
      biography: details.biography ?? '',
      birth_year,
      casting_profile,
      universe_tags: 'WireVerse',
      cost: 2,
    }, { onConflict: 'name' })
    console.log(error ? `ERROR: ${error.message}` : 'done')
    await new Promise(r => setTimeout(r, 300))
  }

  // Step 3: Tag all 26 as WireVerse
  console.log('\nTagging all Wire cast as WireVerse...')
  for (const actor of WIRE_CAST) {
    await sb.from('actors').update({ universe_tags: 'WireVerse' }).eq('name', actor.name)
  }
  console.log('Tagged.\n')

  // Step 4: Sync roles table — add missing roles
  const { data: existingRoles } = await sb.from('roles').select('role_name').eq('title_slug', 'the-wire')
  const existingRoleNames = new Set(existingRoles?.map(r => r.role_name) ?? [])

  console.log('Syncing roles table...')
  for (const actor of WIRE_CAST) {
    if (existingRoleNames.has(actor.role)) { console.log(`  ${actor.role} — already exists`); continue }
    const { error } = await sb.from('roles').insert({
      title_slug: 'the-wire',
      role_name: actor.role,
      original_actor: actor.name,
      tier: actor.tier,
    })
    console.log(`  ${actor.role} — ${error ? `ERROR: ${error.message}` : 'added'}`)
  }

  console.log('\nDone. Final Wire cast:')
  const { data: final } = await sb.from('roles').select('role_name, original_actor, tier').eq('title_slug', 'the-wire').order('tier')
  for (const r of final ?? []) console.log(`  [${r.tier}] ${r.original_actor} — ${r.role_name}`)
}

main()
