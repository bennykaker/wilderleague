import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const env = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
for (const line of env.split('\n')) {
  const m = line.match(/^([^=]+)=(.*)$/); if (m) process.env[m[1].trim()] = m[2].trim()
}
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const suggested = [
  'Tom Holland','Jacob Elordi','Andrew Garfield','Jake Gyllenhaal','Ansel Elgort',
  'Zendaya','Charlize Theron','Ana de Armas','Rebecca Ferguson','Scarlett Johansson','Elizabeth Olsen','Hailee Steinfeld','Alicia Vikander',
  'Denzel Washington','Idris Elba','Morgan Freeman','Liam Neeson','Mahershala Ali','Sterling K. Brown',
  'Tom Hardy','Jude Law','Mark Strong','Jon Bernthal','Michael Shannon','Mads Mikkelsen','Ralph Fiennes',
  'Toni Collette','Michelle Pfeiffer','Julianne Moore','Jamie Lee Curtis','Meryl Streep','Kate Winslet','Frances McDormand','Cate Blanchett',
  'Shia LaBeouf','Walton Goggins','Edward Norton','Jesse Plemons','Joaquin Phoenix','Jack O\'Connell',
  'John Cena','Dave Bautista','Jason Momoa','Dwayne Johnson','Alan Ritchson','Vin Diesel','Tyrese Gibson',
]

async function main() {
  const { data } = await sb.from('actors').select('name, cost').in('name', suggested)
  const found = new Map(data?.map((a: any) => [a.name, a.cost]) ?? [])
  console.log(`Found: ${found.size} / ${suggested.length}`)
  suggested.forEach(n => {
    const cost = found.get(n)
    console.log(cost !== undefined ? `  ✅ ${n} (cost ${cost})` : `  ❌ ${n} — NOT IN DB`)
  })
}
main()
