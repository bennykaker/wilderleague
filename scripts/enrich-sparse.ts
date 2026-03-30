/**
 * Enrich actors missing casting_profile with Claude Haiku.
 * Run with: npx tsx scripts/enrich-sparse.ts
 *
 * Safe to re-run — skips actors that already have casting_profile.
 * Ctrl+C to pause, re-run to resume.
 */

import fs from 'fs'
import path from 'path'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

// Load .env.local
const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n')
  for (const line of lines) {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) process.env[match[1].trim()] = match[2].trim()
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

interface Actor {
  id: string
  name: string
  biography: string
  known_for: string
  keywords: string
  gender: string
  birth_year: string
  popularity: number
}

async function enrichActor(actor: Actor) {
  const prompt = `You are a Hollywood casting director with encyclopedic knowledge of actors. Given the following actor, provide a casting assessment.

Actor: ${actor.name}
Gender: ${actor.gender || 'unknown'}
Birth year: ${actor.birth_year || 'unknown'}
Known for: ${actor.known_for || 'unknown'}
Keywords: ${actor.keywords || 'none'}
Biography: ${actor.biography ? actor.biography.slice(0, 400) : 'not available'}

Return ONLY this JSON (no markdown, no extra text):
{
  "archetype": "2-4 word actor type (e.g. 'brooding leading man', 'scene-stealing character actor')",
  "strengths": "2-3 key acting strengths, comma separated",
  "weaknesses": "1-2 limitations, comma separated",
  "best_cast_as": "ideal role types, comma separated",
  "signature_quality": "one sentence — their single most distinctive quality",
  "career_stage": "one of: rising, established, peak, legacy, current",
  "casting_profile": "2-3 sentences: who they are as an actor, what they bring to a role, when to cast them",
  "nationality": "primary nationality as a single country name (e.g. 'American', 'British', 'Australian', 'Canadian', 'Irish', 'French', 'German', 'South African', 'New Zealander', etc.) — use the country they are most associated with professionally, not dual citizenship"
}`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const match = text.replace(/```json|```/g, '').trim().match(/\{[\s\S]*\}/)
  if (!match) throw new Error(`No JSON in response: ${text.slice(0, 100)}`)

  return JSON.parse(match[0])
}

async function main() {
  // Fetch actors missing casting_profile
  const { data: actors, error } = await supabase
    .from('actors')
    .select('id, name, biography, known_for, keywords, gender, birth_year, popularity')
    .is('casting_profile', null)
    .order('popularity', { ascending: false })

  if (error) throw new Error(error.message)
  if (!actors || actors.length === 0) {
    console.log('No actors need enrichment.')
    return
  }

  console.log(`Found ${actors.length} actors to enrich.\n`)

  let done = 0
  let failed = 0

  for (const actor of actors) {
    try {
      const enrichment = await enrichActor(actor)

      const { error: updateError } = await supabase
        .from('actors')
        .update({
          archetype: enrichment.archetype,
          strengths: enrichment.strengths,
          weaknesses: enrichment.weaknesses,
          best_cast_as: enrichment.best_cast_as,
          signature_quality: enrichment.signature_quality,
          career_stage: enrichment.career_stage,
          casting_profile: enrichment.casting_profile,
          nationality: enrichment.nationality ?? null,
          deep_dive_date: new Date().toISOString().slice(0, 10),
        })
        .eq('id', actor.id)

      if (updateError) throw new Error(updateError.message)

      done++
      if (done % 10 === 0) {
        console.log(`${done}/${actors.length} enriched (${failed} failed)...`)
      }

      // Small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 150))

    } catch (err) {
      failed++
      console.error(`Failed: ${actor.name} — ${err instanceof Error ? err.message : err}`)
    }
  }

  console.log(`\nDone. ${done} enriched, ${failed} failed.`)
}

main().catch(console.error)
