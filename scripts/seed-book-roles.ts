/**
 * Extracts castable characters from books using Wikipedia + Claude.
 * Skips books that already have roles. Resumable.
 * Run with: npx tsx scripts/seed-book-roles.ts
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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

async function fetchWikipedia(bookTitle: string, author: string): Promise<string> {
  // Try exact title first, then "Title (novel)"
  const attempts = [
    bookTitle,
    `${bookTitle} (novel)`,
    `${bookTitle} (book)`,
    `${bookTitle} (series)`,
  ]

  for (const attempt of attempts) {
    const encoded = encodeURIComponent(attempt.replace(/ /g, '_'))
    try {
      const res = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&titles=${encoded}&format=json&explaintext=true&exsectionformat=plain`,
        { headers: { 'User-Agent': 'WilderLeague/1.0 (casting app)' } }
      )
      const data = await res.json() as any
      const pages = data?.query?.pages ?? {}
      const page = Object.values(pages)[0] as any
      if (page && page.extract && !page.missing) {
        return page.extract.slice(0, 6000) // trim to keep token count manageable
      }
    } catch {}
  }

  return ''
}

interface RoleResult {
  role_name: string
  tier: 'first_lead' | 'second_lead' | 'third_lead' | 'supporting'
  character_description: string
}

async function extractCharacters(bookTitle: string, author: string, wikiText: string): Promise<RoleResult[]> {
  const context = wikiText
    ? `Wikipedia article extract:\n${wikiText}\n\n`
    : `Use your knowledge of "${bookTitle}" by ${author}.\n\n`

  const prompt = `You are a Hollywood casting database editor preparing a book adaptation for a casting game.

${context}Book: "${bookTitle}" by ${author}

Extract the main castable characters for a film or TV adaptation. Focus on characters who:
- Have significant page time and a distinct personality
- Would be played by a named actor (not crowd/background)
- Are memorable enough that fans would have casting opinions about

Rules:
- 6–10 characters total
- Tier definitions:
  first_lead: protagonist(s) — max 2
  second_lead: major characters essential to the story — 2–3
  third_lead: important recurring characters — 2–3
  supporting: notable roles worth casting
- character_description: 1 sentence, physical/personality essence for casting purposes (what kind of actor fits)
- role_name: the character's name as used in the book

Return ONLY this JSON (no markdown):
{
  "roles": [
    {
      "role_name": "Character Name",
      "tier": "first_lead",
      "character_description": "One casting-focused sentence about who this character is."
    }
  ]
}`

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
  const match = text.replace(/```json|```/g, '').trim().match(/\{[\s\S]*\}/)
  if (!match) throw new Error(`No JSON in response for ${bookTitle}`)

  const parsed = JSON.parse(match[0])
  return parsed.roles ?? []
}

async function main() {
  // Get all book titles
  const { data: books, error: booksError } = await supabase
    .from('titles')
    .select('slug, title, author')
    .eq('type', 'book')
    .order('title')

  if (booksError) { console.error(booksError); process.exit(1) }
  if (!books?.length) { console.log('No book titles found. Run seed-books.ts first.'); return }

  // Find which ones already have roles
  const { data: existingRoles } = await supabase
    .from('roles')
    .select('title_slug')

  const slugsWithRoles = new Set((existingRoles ?? []).map(r => r.title_slug))
  const booksNeedingRoles = books.filter(b => !slugsWithRoles.has(b.slug))

  if (booksNeedingRoles.length === 0) {
    console.log('All books already have roles.')
    return
  }

  console.log(`Extracting characters for ${booksNeedingRoles.length} books...\n`)

  let done = 0
  let failed = 0

  for (const book of booksNeedingRoles) {
    try {
      process.stdout.write(`${book.title}... `)

      const wikiText = await fetchWikipedia(book.title, book.author ?? '')
      if (!wikiText) process.stdout.write('(no Wikipedia, using Claude knowledge) ')

      const roles = await extractCharacters(book.title, book.author ?? '', wikiText)

      if (roles.length === 0) {
        console.log('⚠ no characters returned')
        failed++
        continue
      }

      const rows = roles.map((r, i) => ({
        title_slug: book.slug,
        role_name: r.role_name,
        original_actor: null,
        original_actor_image: null,
        tier: r.tier ?? 'supporting',
        display_order: i,
        role_description: r.character_description ?? null,
      }))

      const { error: insertError } = await supabase.from('roles').insert(rows)
      if (insertError) throw new Error(insertError.message)

      done++
      console.log(`✓ ${roles.length} characters`)

      await sleep(400)
    } catch (err) {
      failed++
      console.log(`✗ ${err instanceof Error ? err.message : err}`)
    }
  }

  console.log(`\nDone. ${done} books seeded, ${failed} failed.`)
}

main().catch(console.error)
