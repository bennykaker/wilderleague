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

const MISSING = [
  { name: 'Jimmy Smits',  role: 'Matt Santos' },
  { name: 'Alan Alda',    role: 'Arnold Vinick' },
]

async function main() {
  for (const actor of MISSING) {
    process.stdout.write(`${actor.name}... `)
    const res = await fetch(
      `https://api.themoviedb.org/3/search/person?query=${encodeURIComponent(actor.name)}`,
      { headers: { Authorization: `Bearer ${TMDB_TOKEN}`, accept: 'application/json' } }
    )
    const data = await res.json() as { results?: { id: number; popularity: number; profile_path: string | null }[] }
    const result = data.results?.[0]
    if (!result) { console.log('NOT FOUND'); continue }

    const { data: byId } = await sb.from('actors').select('name, universe_tags').eq('tmdb_id', result.id)
    if (byId && byId.length > 0) {
      const tags = (byId[0].universe_tags ?? '').split(',').map((t: string) => t.trim()).filter(Boolean)
      if (!tags.includes('SorkVerse')) tags.push('SorkVerse')
      if (!tags.includes('WestWingVerse')) tags.push('WestWingVerse')
      await sb.from('actors').update({ universe_tags: tags.join(',') }).eq('tmdb_id', result.id)
      console.log(`tagged existing (${byId[0].name})`); continue
    }

    const detRes = await fetch(`https://api.themoviedb.org/3/person/${result.id}`,
      { headers: { Authorization: `Bearer ${TMDB_TOKEN}`, accept: 'application/json' } })
    const det = await detRes.json() as { biography?: string; birthday?: string }

    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001', max_tokens: 300,
      messages: [{ role: 'user', content: `You are Marlowe, a veteran Hollywood casting director. Write a 2-3 sentence casting profile for ${actor.name}, known for The West Wing. Bio: ${(det.biography ?? '').slice(0, 300)}. Direct and specific.` }],
    })
    const casting_profile = msg.content[0].type === 'text' ? msg.content[0].text : ''

    const { error } = await sb.from('actors').insert({
      name: actor.name, tmdb_id: result.id,
      headshot_url: result.profile_path ? `https://image.tmdb.org/t/p/w500${result.profile_path}` : 'https://www.gravatar.com/avatar/?d=mp&s=500',
      popularity: result.popularity,
      known_for: 'The West Wing',
      biography: det.biography ?? '',
      birth_year: det.birthday ? parseInt(det.birthday.split('-')[0]) : 1970,
      casting_profile,
      universe_tags: 'SorkVerse,WestWingVerse',
      cost: 2,
    })
    console.log(error ? `ERROR: ${error.message}` : 'done')
  }
}

main()
