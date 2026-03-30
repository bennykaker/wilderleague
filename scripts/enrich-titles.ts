/**
 * Enrich titles with metadata using Claude Sonnet.
 * Run with: npx tsx scripts/enrich-titles.ts
 * Safe to re-run — skips already-enriched titles.
 * Add --force to re-enrich all titles.
 */

import fs from 'fs'
import path from 'path'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

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
const force = process.argv.includes('--force')

async function enrichTitle(slug: string, title: string, type: string, year: number | null) {
  const isTV = type === 'tv'

  const prompt = `You are a film and television industry database editor with encyclopedic knowledge.

Provide detailed metadata for: "${title}" (${isTV ? 'TV series' : 'movie'}${year ? `, ${year}` : ''})

Return ONLY this JSON (no markdown):
{
  "logline": "2-sentence description of the premise",
  "genre_tags": "comma-separated genres, max 4 (e.g. 'drama,crime,thriller')",
  "location_set": "primary location(s) where the story takes place (city/country)",
  "location_filmed": "primary location(s) where it was physically filmed",
  "studio": "primary production company or network studio",
  "source_material": "one of: original | novel | comic | true story | remake | real events | short film",
  "franchise": "franchise or universe name if applicable, or null",
  "rt_score": Rotten Tomatoes critics score as integer 0-100,
  "awards": "notable awards won, e.g. 'Oscar: Best Picture, Best Director' or 'Emmy: Outstanding Drama (3)' — null if none notable",
  ${isTV ? `
  "year_end": last air year as integer, or null if still ongoing,
  "seasons": total number of seasons as integer,
  "episodes": total episode count as integer,
  "budget_per_episode": estimated budget per episode in millions as number (e.g. 3.5),
  "status": "ended" or "ongoing",
  "showrunner": "primary showrunner(s) — comma separated if multiple",
  "network": "network or streaming platform (e.g. 'HBO', 'AMC', 'Netflix', 'FX', 'NBC')",
  "production_budget": null,
  "production_budget_adjusted": null,
  "box_office_domestic": null,
  "box_office_worldwide": null,
  "flop_status": null,
  "director": null
  ` : `
  "year_end": null,
  "seasons": null,
  "episodes": null,
  "budget_per_episode": null,
  "status": null,
  "showrunner": null,
  "network": null,
  "production_budget": estimated original production budget in millions as integer,
  "production_budget_adjusted": inflation-adjusted to 2024 dollars in millions as integer,
  "box_office_domestic": domestic box office gross in millions as integer (or null if unknown),
  "box_office_worldwide": worldwide box office gross in millions as integer (or null if unknown),
  "flop_status": "one of: blockbuster | hit | moderate | flop | bomb | cult",
  "director": "original director(s)"
  `}
}`

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
  const match = text.replace(/```json|```/g, '').trim().match(/\{[\s\S]*\}/)
  if (!match) throw new Error(`No JSON in response: ${text.slice(0, 100)}`)
  return JSON.parse(match[0])
}

async function main() {
  let query = supabase
    .from('titles')
    .select('slug, title, type, year')
    .order('year', { ascending: true })

  if (!force) {
    query = query.is('enriched_at', null)
  }

  const { data: titles, error } = await query

  if (error) throw new Error(error.message)
  if (!titles || titles.length === 0) {
    console.log('No titles need enrichment. Use --force to re-enrich all.')
    return
  }

  console.log(`Enriching ${titles.length} titles${force ? ' (forced)' : ''}...\n`)

  let done = 0
  let failed = 0

  for (const t of titles) {
    try {
      const enrichment = await enrichTitle(t.slug, t.title, t.type, t.year)

      const { error: updateError } = await supabase
        .from('titles')
        .update({
          logline: enrichment.logline ?? null,
          genre_tags: enrichment.genre_tags ?? null,
          location_set: enrichment.location_set ?? null,
          location_filmed: enrichment.location_filmed ?? null,
          studio: enrichment.studio ?? null,
          source_material: enrichment.source_material ?? null,
          franchise: enrichment.franchise ?? null,
          rt_score: enrichment.rt_score ?? null,
          awards: enrichment.awards ?? null,
          year_end: enrichment.year_end ?? null,
          seasons: enrichment.seasons ?? null,
          episodes: enrichment.episodes ?? null,
          budget_per_episode: enrichment.budget_per_episode ?? null,
          status: enrichment.status ?? null,
          showrunner: enrichment.showrunner ?? null,
          network: enrichment.network ?? null,
          production_budget: enrichment.production_budget ?? null,
          production_budget_adjusted: enrichment.production_budget_adjusted ?? null,
          box_office_domestic: enrichment.box_office_domestic ?? null,
          box_office_worldwide: enrichment.box_office_worldwide ?? null,
          flop_status: enrichment.flop_status ?? null,
          director: enrichment.director ?? null,
          enriched_at: new Date().toISOString().slice(0, 10),
        })
        .eq('slug', t.slug)

      if (updateError) throw new Error(updateError.message)

      done++
      console.log(`✓ ${t.title}`)
      await new Promise(r => setTimeout(r, 200))

    } catch (err) {
      failed++
      console.error(`✗ ${t.title}: ${err instanceof Error ? err.message : err}`)
    }
  }

  console.log(`\nDone. ${done} enriched, ${failed} failed.`)
}

main().catch(console.error)
