import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const env = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
for (const line of env.split('\n')) {
  const m = line.match(/^([^=]+)=(.*)$/)
  if (m) process.env[m[1].trim()] = m[2].trim()
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function tagFromTitle(titleSlug: string, newTag: string) {
  console.log(`\nTagging ${newTag} from roles in "${titleSlug}"...`)

  const { data: roles, error } = await sb
    .from('roles')
    .select('original_actor')
    .eq('title_slug', titleSlug)

  if (error || !roles) { console.log(`  ERROR: ${error?.message}`); return }

  const names = roles.map(r => r.original_actor).filter(Boolean) as string[]
  console.log(`  Found ${names.length} roles`)

  let tagged = 0
  for (const name of names) {
    const { data: actors } = await sb.from('actors').select('name, universe_tags').eq('name', name)
    if (!actors || actors.length === 0) {
      console.log(`  MISSING: ${name}`)
      continue
    }
    const actor = actors[0]
    const tags = (actor.universe_tags ?? '').split(',').map((t: string) => t.trim()).filter(Boolean)
    if (tags.includes(newTag)) continue
    tags.push(newTag)
    await sb.from('actors').update({ universe_tags: tags.join(',') }).eq('name', name)
    console.log(`  + ${name}`)
    tagged++
  }

  console.log(`  Tagged ${tagged} actors with ${newTag}`)
}

async function main() {
  await tagFromTitle('the-west-wing', 'WestWingVerse')
  await tagFromTitle('breaking-bad', 'BreakingBadVerse')

  const { count: ww } = await sb.from('actors').select('*', { count: 'exact', head: true }).ilike('universe_tags', '%WestWingVerse%')
  const { count: bb } = await sb.from('actors').select('*', { count: 'exact', head: true }).ilike('universe_tags', '%BreakingBadVerse%')
  console.log(`\nWestWingVerse: ${ww} actors`)
  console.log(`BreakingBadVerse: ${bb} actors`)
}

main()
