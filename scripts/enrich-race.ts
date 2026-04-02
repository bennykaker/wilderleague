/**
 * Enriches actors with race_ethnicity field using Claude's knowledge.
 * Skips actors that already have a value. Resumable.
 *
 * Run with: npx ts-node --project tsconfig.scripts.json scripts/enrich-race.ts
 *
 * Valid values: white | black | latino | asian | south_asian | middle_eastern | indigenous | mixed | unknown
 */

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

function getEnv(key: string): string {
  if (process.env[key]) return process.env[key]!
  try {
    const file = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
    const match = file.match(new RegExp(`^${key}=(.+)$`, 'm'))
    return match?.[1]?.trim() ?? ''
  } catch { return '' }
}

const supabase = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'))
const anthropic = new Anthropic({ apiKey: getEnv('ANTHROPIC_API_KEY') })

const BATCH = 30       // actors per Claude call
const DELAY_MS = 300   // between batches

const VALID = new Set(['white', 'black', 'latino', 'asian', 'south_asian', 'middle_eastern', 'indigenous', 'mixed', 'unknown'])

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

async function classifyBatch(actors: { id: string; name: string; biography: string; nationality: string | null }[]): Promise<Record<string, string>> {
  const lines = actors.map(a => {
    const bio = a.biography ? ` Bio: ${a.biography.slice(0, 120)}` : ''
    const nat = a.nationality ? ` Nationality: ${a.nationality}.` : ''
    return `${a.id}|${a.name}${nat}${bio}`
  }).join('\n')

  const prompt = `You are classifying the racial/ethnic background of actors for a casting tool. Use your knowledge of these public figures.

For each actor, return their racial/ethnic background using ONLY one of these exact values:
white, black, latino, asian, south_asian, middle_eastern, indigenous, mixed, unknown

Rules:
- "black" = Black/African descent (American, British, African, Caribbean, etc.)
- "latino" = Latin American / Hispanic heritage (Mexican, Puerto Rican, Colombian, etc.)
- "asian" = East Asian (Chinese, Japanese, Korean, etc.)
- "south_asian" = South Asian (Indian, Pakistani, Sri Lankan, etc.)
- "middle_eastern" = Middle Eastern / North African (Arab, Persian, Turkish, etc.)
- "indigenous" = Indigenous / Native American / First Nations / Aboriginal
- "mixed" = clearly mixed-race heritage spanning two or more distinct groups
- "unknown" = genuinely cannot determine from your knowledge
- Use "unknown" if you are not sure — do not guess

Actors to classify (format: id|name bio/nationality):
${lines}

Return ONLY a JSON object mapping id to value, like:
{"abc123": "black", "def456": "white"}`

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = msg.content[0].type === 'text' ? msg.content[0].text : '{}'
  const jsonMatch = text.match(/\{[\s\S]+\}/)
  if (!jsonMatch) return {}
  const parsed = JSON.parse(jsonMatch[0]) as Record<string, string>

  // Validate values
  const clean: Record<string, string> = {}
  for (const [id, val] of Object.entries(parsed)) {
    if (VALID.has(val)) clean[id] = val
  }
  return clean
}

async function run() {
  console.log('Fetching actors without race_ethnicity...')

  const { data: actors, error } = await supabase
    .from('actors')
    .select('id, name, biography, nationality')
    .is('race_ethnicity', null)
    .order('popularity', { ascending: false })

  if (error) { console.error(error); process.exit(1) }
  if (!actors || actors.length === 0) { console.log('All actors already classified.'); return }

  console.log(`${actors.length} actors to classify`)

  let done = 0
  let failed = 0

  for (let i = 0; i < actors.length; i += BATCH) {
    const batch = actors.slice(i, i + BATCH)

    try {
      const results = await classifyBatch(batch)

      // Update each actor
      for (const [id, race] of Object.entries(results)) {
        const { error: updateErr } = await supabase
          .from('actors')
          .update({ race_ethnicity: race })
          .eq('id', id)
        if (updateErr) console.error(`Failed to update ${id}:`, updateErr.message)
      }

      done += Object.keys(results).length
      const skipped = batch.length - Object.keys(results).length
      console.log(`Batch ${Math.floor(i / BATCH) + 1}: classified ${Object.keys(results).length}, skipped/unknown ${skipped} | total done: ${done}`)
    } catch (err) {
      console.error(`Batch ${Math.floor(i / BATCH) + 1} failed:`, err)
      failed += batch.length
    }

    if (i + BATCH < actors.length) await sleep(DELAY_MS)
  }

  console.log(`\nDone. Classified: ${done}, failed: ${failed}`)
}

run()
