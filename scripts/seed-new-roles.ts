/**
 * Seed roles for titles that have no roles yet.
 * Uses Claude Sonnet to generate main cast with tiers.
 * Run with: npx tsx scripts/seed-new-roles.ts
 * Safe to re-run — skips titles that already have roles.
 * Add --force to regenerate all roles for titles with no CSV source.
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

interface TitleRow {
  slug: string
  title: string
  type: string
  year: number | null
  seasons: number | null
}

interface RoleResult {
  role_name: string
  original_actor: string
  tier: 'first_lead' | 'second_lead' | 'third_lead' | 'supporting'
  seasons_appeared: string | null
}

async function generateRoles(title: TitleRow): Promise<RoleResult[]> {
  const isTV = title.type === 'tv'
  const isStage = title.type === 'play' || title.type === 'musical'
  const isBook = title.type === 'book'

  let typeLabel: string
  if (isTV) typeLabel = 'TV series'
  else if (isStage) typeLabel = title.type === 'musical' ? 'stage musical' : 'stage play'
  else if (isBook) typeLabel = 'novel'
  else typeLabel = 'movie'

  const actorInstruction = isBook
    ? `- original_actor: for books, use the actor from the most notable film/TV adaptation if one exists, otherwise null`
    : isStage
    ? `- original_actor: use the actor from the original Broadway/West End production, or the most notable film adaptation`
    : `- original_actor should be the actor who originated the role in the ORIGINAL production`

  const prompt = `You are a casting database editor with encyclopedic knowledge of film, TV, theatre, and literature.

List the main characters for: "${title.title}" (${typeLabel}${title.year ? `, ${title.year}` : ''}${title.seasons ? `, ${title.seasons} seasons` : ''})

Rules:
- Include 6–12 roles for movies/books/stage works, 8–16 for TV shows
- Tier definitions:
  first_lead: the undisputed protagonist(s) — max 2
  second_lead: major characters essential to the story — 2-4
  third_lead: important recurring characters — 2-4
  supporting: notable supporting roles worth recasting
- For TV shows, include seasons_appeared as a range e.g. "1-7" or "1-3" or "4-7"
- role_name should be the CHARACTER name, not the actor name
${actorInstruction}

Return ONLY this JSON (no markdown):
{
  "roles": [
    {
      "role_name": "character name",
      "original_actor": "actor full name or null",
      "tier": "first_lead|second_lead|third_lead|supporting",
      "seasons_appeared": "1-3" or null
    }
  ]
}`

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
  const match = text.replace(/```json|```/g, '').trim().match(/\{[\s\S]*\}/)
  if (!match) throw new Error(`No JSON in response: ${text.slice(0, 100)}`)

  const parsed = JSON.parse(match[0])
  return parsed.roles ?? []
}

async function main() {
  // Find titles with no roles
  const { data: allTitles, error: titlesError } = await supabase
    .from('titles')
    .select('slug, title, type, year, seasons')
    .order('title', { ascending: true })

  if (titlesError) throw new Error(titlesError.message)

  const { data: existingRoles, error: rolesError } = await supabase
    .from('roles')
    .select('title_slug')

  if (rolesError) throw new Error(rolesError.message)

  const slugsWithRoles = new Set((existingRoles ?? []).map(r => r.title_slug))
  const titlesNeedingRoles = (allTitles ?? []).filter(t => !slugsWithRoles.has(t.slug))

  if (titlesNeedingRoles.length === 0) {
    console.log('All titles already have roles. Done.')
    return
  }

  console.log(`Generating roles for ${titlesNeedingRoles.length} titles...\n`)

  let done = 0
  let failed = 0

  for (const title of titlesNeedingRoles) {
    try {
      const roles = await generateRoles(title)

      if (roles.length === 0) {
        console.warn(`⚠ No roles returned for ${title.title}`)
        failed++
        continue
      }

      const rows = roles.map((r, i) => ({
        title_slug: title.slug,
        role_name: r.role_name,
        original_actor: r.original_actor || null,
        original_actor_image: null,
        tier: r.tier || 'supporting',
        seasons_appeared: r.seasons_appeared || null,
        display_order: i,
      }))

      const { error: insertError } = await supabase.from('roles').insert(rows)
      if (insertError) throw new Error(insertError.message)

      done++
      console.log(`✓ ${title.title} — ${roles.length} roles`)
      await new Promise(r => setTimeout(r, 300))

    } catch (err) {
      failed++
      console.error(`✗ ${title.title}: ${err instanceof Error ? err.message : err}`)
    }
  }

  console.log(`\nDone. ${done} titles seeded, ${failed} failed.`)
  console.log('Note: actor headshot images are null — run a headshot fetch script if needed.')
}

main().catch(console.error)
