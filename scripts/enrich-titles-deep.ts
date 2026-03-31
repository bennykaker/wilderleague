/**
 * Deep enrichment for titles: casting_brief, reboot_potential (1-10), reboot_notes.
 * Run with: npx tsx scripts/enrich-titles-deep.ts
 * Safe to re-run — skips titles that already have casting_brief.
 */

import fs from 'fs'
import path from 'path'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { extractJson } from '../lib/extractJson'

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

interface TitleRow {
  slug: string
  title: string
  type: string
  year: number
  year_end: number | null
  logline: string
  genre_tags: string
  director: string | null
  showrunner: string | null
  rt_score: number | null
  awards: string | null
  source_material: string | null
}

async function enrichTitle(t: TitleRow) {
  const medium = t.type === 'tv' ? 'TV series' : t.type === 'play' ? 'stage play' : t.type === 'musical' ? 'musical' : 'film'
  const yearRange = t.year_end ? `${t.year}–${t.year_end}` : String(t.year)
  const credits = t.director ? `Directed by ${t.director}.` : t.showrunner ? `Showrunner: ${t.showrunner}.` : ''

  const prompt = `You are a veteran Hollywood casting director assessing properties for reboot potential.

Title: ${t.title}
Medium: ${medium} (${yearRange})
Genre: ${t.genre_tags || 'unknown'}
Logline: ${t.logline || 'unknown'}
${credits}
RT score: ${t.rt_score ?? 'unknown'}
Awards: ${t.awards || 'none on record'}
Source material: ${t.source_material || 'original'}

Return ONLY this JSON (no markdown):
{
  "casting_brief": "2-3 sentences from a casting director's POV: what makes this property challenging to cast in a modern reboot, what tone and energy the key roles demand, and what the original production got right or wrong that a reboot must address.",
  "reboot_potential": <integer 1-10>,
  "reboot_notes": "2-3 sentences: why this score — consider cultural relevance today, era sensitivity and what needs updating, the single most compelling angle for a modern version, and any landmines (dated attitudes, IP issues, etc.)."
}`

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const jsonStr = extractJson(text.replace(/```json|```/g, '').trim())
  if (!jsonStr) throw new Error(`No JSON in response: ${text.slice(0, 100)}`)

  return JSON.parse(jsonStr) as {
    casting_brief: string
    reboot_potential: number
    reboot_notes: string
  }
}

async function main() {
  const { data: titles, error } = await supabase
    .from('titles')
    .select('slug, title, type, year, year_end, logline, genre_tags, director, showrunner, rt_score, awards, source_material')
    .is('casting_brief', null)
    .order('title', { ascending: true })

  if (error) throw new Error(error.message)
  if (!titles || titles.length === 0) {
    console.log('All titles already enriched.')
    return
  }

  console.log(`Enriching ${titles.length} titles...\n`)

  let done = 0
  let failed = 0

  for (const title of titles as TitleRow[]) {
    try {
      const enrichment = await enrichTitle(title)

      const { error: updateError } = await supabase
        .from('titles')
        .update({
          casting_brief: enrichment.casting_brief,
          reboot_potential: enrichment.reboot_potential,
          reboot_notes: enrichment.reboot_notes,
        })
        .eq('slug', title.slug)

      if (updateError) throw new Error(updateError.message)

      done++
      console.log(`  [${enrichment.reboot_potential}/10] ${title.title}`)

      await new Promise(r => setTimeout(r, 150))
    } catch (err) {
      failed++
      console.error(`  ✗ ${title.title}: ${err instanceof Error ? err.message : err}`)
    }
  }

  console.log(`\nDone. ${done} enriched, ${failed} failed.`)

  // Print top reboot candidates
  const { data: top } = await supabase
    .from('titles')
    .select('title, type, reboot_potential, reboot_notes')
    .not('reboot_potential', 'is', null)
    .order('reboot_potential', { ascending: false })
    .limit(10)

  console.log('\nTop reboot candidates:')
  top?.forEach((t: any) => console.log(`  ${t.reboot_potential}/10 — ${t.title} (${t.type})`))
}

main().catch(console.error)
