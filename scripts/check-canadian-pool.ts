import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const env = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
for (const line of env.split('\n')) {
  const m = line.match(/^([^=]+)=(.*)$/); if (m) process.env[m[1].trim()] = m[2].trim()
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const POOL = [
  'Ryan Reynolds', 'Rachel McAdams', 'Jim Carrey', 'Martin Short', 'Mike Myers',
  'Dan Aykroyd', 'Brendan Fraser', 'Michael J. Fox', 'William Shatner',
  'Donald Sutherland', 'Kiefer Sutherland', 'Neve Campbell', 'Seth Rogen',
  'Jay Baruchel', 'Cobie Smulders', 'Tatiana Maslany', 'Elliot Page',
  'Ryan Gosling', 'Evangeline Lilly', 'Hayden Christensen', 'Nathan Fillion',
  'Dan Levy', 'Eugene Levy', "Catherine O'Hara", 'Annie Murphy',
  'Sandra Oh', 'Eric McCormack', 'Victor Garber', 'Paul Gross',
  'Leslie Nielsen', 'Howie Mandel', 'Sarah Polley', 'Tom Cavanagh',
]

async function main() {
  const { data } = await sb.from('actors').select('name').in('name', POOL)
  const found = new Set(data?.map((a: any) => a.name) ?? [])
  const missing = POOL.filter(n => !found.has(n))
  console.log(`In DB: ${found.size} / ${POOL.length}`)
  console.log(`\nMissing (${missing.length}):`)
  missing.forEach((n: string) => console.log(`  ${n}`))
}

main()
