/**
 * Back-fill nationality for actors that already have casting_profile but no nationality.
 * Run with: npx tsx scripts/enrich-nationality.ts
 *
 * Uses Haiku (cheaper) since nationality is a simple inference.
 */

import fs from 'fs'
import path from 'path'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

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

async function getNationality(name: string, biography: string, knownFor: string): Promise<string | null> {
  const prompt = `What is ${name}'s primary nationality — the country they are most professionally associated with?

Biography: ${biography ? biography.slice(0, 300) : 'not available'}
Known for: ${knownFor || 'not available'}

Return ONLY a single country adjective (e.g. "American", "British", "Australian", "Canadian", "Irish", "French", "German", "South African", "New Zealander", "Danish", "Swedish", "Spanish", "Italian", "Indian", "Nigerian", "South Korean", "Japanese", "Brazilian", "Mexican", "Israeli", "South African", "Welsh", "Scottish").

If you genuinely cannot determine nationality, return "Unknown".
Return nothing else — just the single word or phrase.`

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 20,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
  if (!text || text === 'Unknown') return null
  return text
}

async function main() {
  const { data: actors, error } = await supabase
    .from('actors')
    .select('id, name, biography, known_for')
    .is('nationality', null)
    .not('casting_profile', 'is', null)
    .order('popularity', { ascending: false })
    .limit(2000)

  if (error) throw new Error(error.message)
  if (!actors || actors.length === 0) {
    console.log('No actors need nationality back-fill.')
    return
  }

  console.log(`Found ${actors.length} actors to back-fill nationality.\n`)

  let done = 0
  let failed = 0

  for (const actor of actors) {
    try {
      const nationality = await getNationality(actor.name, actor.biography, actor.known_for)

      const { error: updateError } = await supabase
        .from('actors')
        .update({ nationality })
        .eq('id', actor.id)

      if (updateError) throw new Error(updateError.message)

      done++
      if (done % 50 === 0) {
        console.log(`${done}/${actors.length} done (${failed} failed)...`)
      }

      await new Promise(r => setTimeout(r, 80))

    } catch (err) {
      failed++
      console.error(`Failed: ${actor.name} — ${err instanceof Error ? err.message : err}`)
    }
  }

  console.log(`\nDone. ${done} nationality back-fills, ${failed} failed.`)
}

main().catch(console.error)
