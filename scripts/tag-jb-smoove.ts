import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const env = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
for (const line of env.split('\n')) {
  const m = line.match(/^([^=]+)=(.*)$/)
  if (m) process.env[m[1].trim()] = m[2].trim()
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const TMDB_TOKEN = process.env.TMDB_API_KEY!

async function main() {
  const res = await fetch(
    `https://api.themoviedb.org/3/search/person?query=J.B.+Smoove`,
    { headers: { Authorization: `Bearer ${TMDB_TOKEN}`, accept: 'application/json' } }
  )
  const data = await res.json() as { results?: { id: number; name: string }[] }
  const tmdbId = data.results?.[0]?.id
  if (!tmdbId) { console.log('Not found on TMDB'); return }

  const { data: rows } = await sb.from('actors').select('name, universe_tags').eq('tmdb_id', tmdbId)
  console.log('Found in DB as:', rows)

  for (const row of rows ?? []) {
    const tags = (row.universe_tags ?? '').split(',').map((t: string) => t.trim()).filter(Boolean)
    if (!tags.includes('SeinfeldCU')) tags.push('SeinfeldCU')
    await sb.from('actors').update({ universe_tags: tags.join(',') }).eq('tmdb_id', tmdbId)
    console.log(`Tagged "${row.name}" as SeinfeldCU`)
  }

  const { count } = await sb.from('actors').select('*', { count: 'exact', head: true }).ilike('universe_tags', '%SeinfeldCU%')
  console.log(`SeinfeldCU total: ${count}`)
}

main()
