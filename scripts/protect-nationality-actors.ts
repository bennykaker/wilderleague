import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const env = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
for (const line of env.split('\n')) {
  const m = line.match(/^([^=]+)=(.*)$/)
  if (m) process.env[m[1].trim()] = m[2].trim()
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const NATIONALITY_TAG_MAP: Record<string, string> = {
  'canada':  'CanadaVerse',
  'florida':  'FloridaVerse',
  'georgia':  'GeorgiaVerse',
  'alabama':  'AlabamaVerse',
}

async function main() {
  const { data: actors, error } = await sb
    .from('actors')
    .select('id, name, nationality, universe_tags')
    .not('nationality', 'is', null)
    .neq('nationality', '')

  if (error) { console.error(error.message); return }
  if (!actors?.length) { console.log('No nationality-tagged actors found'); return }

  console.log(`Found ${actors.length} nationality-tagged actors`)
  let updated = 0

  for (const actor of actors) {
    const nat = (actor.nationality ?? '').toLowerCase()
    const newTags: string[] = []

    for (const [key, tag] of Object.entries(NATIONALITY_TAG_MAP)) {
      if (nat.includes(key)) newTags.push(tag)
    }

    if (newTags.length === 0) continue

    const existing = actor.universe_tags ? actor.universe_tags.split(',').map((t: string) => t.trim()).filter(Boolean) : []
    const merged = [...new Set([...existing, ...newTags])]
    const newTagStr = merged.join(',')

    if (newTagStr === actor.universe_tags) continue

    const { error: updateError } = await sb.from('actors').update({ universe_tags: newTagStr }).eq('id', actor.id)
    if (updateError) { console.log(`ERROR ${actor.name}: ${updateError.message}`) }
    else { process.stdout.write('.'); updated++ }
  }

  console.log(`\nDone. Added universe tags to ${updated} actors.`)

  // Summary
  for (const [key, tag] of Object.entries(NATIONALITY_TAG_MAP)) {
    const { count } = await sb.from('actors').select('*', { count: 'exact', head: true }).ilike('universe_tags', `%${tag}%`)
    console.log(`  ${tag}: ${count} actors`)
  }
}

main()
