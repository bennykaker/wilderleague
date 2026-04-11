import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const env = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
for (const line of env.split('\n')) {
  const m = line.match(/^([^=]+)=(.*)$/)
  if (m) process.env[m[1].trim()] = m[2].trim()
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function main() {
  // First clear all universe tags
  const { error: clearError } = await sb.from('actors').update({ universe_tags: null }).not('id', 'is', null)
  if (clearError) { console.error('Clear failed:', clearError.message); return }
  console.log('All universe tags cleared.\n')

  // Find The Wire slug
  const { data: titles } = await sb.from('titles').select('slug, title').ilike('title', '%wire%')
  console.log('Wire title matches:', titles?.map(t => `${t.slug}: ${t.title}`).join(', '))

  // Pull roles for the-wire
  const { data: roles } = await sb.from('roles').select('original_actor').eq('title_slug', 'the-wire')
  if (!roles?.length) { console.log('No roles found for the-wire'); return }

  console.log(`\n${roles.length} roles found. Original actors:\n`)
  for (const r of roles) {
    if (r.original_actor) console.log(r.original_actor)
  }
}

main()
