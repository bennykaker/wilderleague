/**
 * Deep-dive enrichment: generates a rich casting profile for the next N actors
 * that don't have one yet, using Claude Opus.
 *
 * Run manually: npm run deep-dive
 * Run via cron: set up with: npm run setup-cron
 *
 * Reads/writes: data/enriched-actors.csv
 */

import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'
import path from 'path'
import Papa from 'papaparse'

const BATCH_SIZE = 10
const CSV_PATH = path.join(process.cwd(), 'data', 'enriched-actors.csv')

function getKey(name: string): string {
  if (process.env[name]) return process.env[name]!
  try {
    const file = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
    const match = file.match(new RegExp(`^${name}=(.+)$`, 'm'))
    return match?.[1]?.trim() ?? ''
  } catch { return '' }
}

const client = new Anthropic({ apiKey: getKey('ANTHROPIC_API_KEY') })

interface ActorRow {
  name: string
  tmdb_id: string
  headshot_url: string
  popularity: string
  cost: string
  gender: string
  birth_year: string
  biography: string
  known_for: string
  keywords: string
  notes: string
  ui_status: string
  archetype?: string
  strengths?: string
  weaknesses?: string
  best_cast_as?: string
  signature_quality?: string
  career_stage?: string
  casting_profile?: string
  deep_dive_date?: string
}

interface CastingProfile {
  archetype: string
  strengths: string
  weaknesses: string
  best_cast_as: string
  signature_quality: string
  career_stage: string
  casting_profile: string
}

async function generateProfile(actor: ActorRow): Promise<CastingProfile> {
  const prompt = `You are Marlowe, a veteran Hollywood casting director with 30 years of experience.

Write a casting intelligence profile for ${actor.name}.

Known data:
- Gender: ${actor.gender || 'unknown'}
- Born: ${actor.birth_year || 'unknown'}
- Known for: ${actor.known_for || 'unknown'}
- Biography: ${actor.biography || 'none available'}
- Genre keywords: ${actor.keywords || 'unknown'}

Write a professional casting profile covering:
1. Archetype — one short phrase (e.g. "brooding leading man", "comic character actor", "action ensemble player")
2. Strengths — 3-5 specific things they do well on screen
3. Weaknesses — 1-2 honest limitations
4. Best cast as — types of roles that play to their strengths
5. Signature quality — the single thing that makes them distinctive
6. Career stage — one of: rising, peak, established, legacy
7. Casting profile — 3-4 sentences of Marlowe's honest assessment. Direct, specific, no filler.

Return ONLY this JSON (no markdown):
{
  "archetype": "short phrase",
  "strengths": "comma-separated list",
  "weaknesses": "comma-separated list",
  "best_cast_as": "comma-separated role types",
  "signature_quality": "one sentence",
  "career_stage": "rising|peak|established|legacy",
  "casting_profile": "3-4 sentence Marlowe assessment"
}`

  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const cleaned = text.replace(/```json|```/g, '').trim()
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error(`No JSON in response for ${actor.name}: ${text.slice(0, 100)}`)

  return JSON.parse(jsonMatch[0]) as CastingProfile
}

async function main() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`enriched-actors.csv not found. Run npm run enrich-actors first.`)
    process.exit(1)
  }

  const raw = fs.readFileSync(CSV_PATH, 'utf8')
  const parsed = Papa.parse<ActorRow>(raw, { header: true, skipEmptyLines: true })
  const rows = parsed.data

  // Find actors without a deep dive, prioritise by popularity (already sorted)
  const pending = rows.filter(r => !r.casting_profile?.trim() && r.name?.trim())
  const batch = pending.slice(0, BATCH_SIZE)

  if (batch.length === 0) {
    console.log('All actors have casting profiles. Nothing to do.')
    process.exit(0)
  }

  const done = rows.length - pending.length
  console.log(`Deep dive: ${done}/${rows.length} done. Processing next ${batch.length}...\n`)

  for (const actor of batch) {
    process.stdout.write(`  ${actor.name}... `)
    try {
      const profile = await generateProfile(actor)
      actor.archetype = profile.archetype
      actor.strengths = profile.strengths
      actor.weaknesses = profile.weaknesses
      actor.best_cast_as = profile.best_cast_as
      actor.signature_quality = profile.signature_quality
      actor.career_stage = profile.career_stage
      actor.casting_profile = profile.casting_profile
      actor.deep_dive_date = new Date().toISOString().split('T')[0]
      console.log(`done (${profile.archetype})`)
    } catch (err) {
      console.log(`FAILED: ${err}`)
    }
    // Small delay between Opus calls
    await new Promise(r => setTimeout(r, 500))
  }

  const csv = Papa.unparse(rows)
  fs.writeFileSync(CSV_PATH, csv, 'utf8')

  const nowDone = rows.filter(r => r.casting_profile?.trim()).length
  console.log(`\nSaved. ${nowDone}/${rows.length} actors now have casting profiles.`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
