import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'
import path from 'path'

const env = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
for (const line of env.split('\n')) {
  const m = line.match(/^([^=]+)=(.*)$/)
  if (m) process.env[m[1].trim()] = m[2].trim()
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

async function generateTags(name: string, bio: string, knownFor: string, castingProfile: string): Promise<string> {
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 220,
    messages: [{
      role: 'user',
      content: `Generate exactly 50 casting tags for actor ${name}.
Known for: ${knownFor}
Bio: ${bio.slice(0, 600)}
Casting profile: ${castingProfile}

Cover ALL of these dimensions:
- Physical: build (lean, stocky, wiry, broad-shouldered, petite, statuesque), height feel (tall, compact), hair (dark hair, blonde, redhead, bald, silver-haired), face (angular, round, weathered, boyish, striking)
- Age range: which decades they read as (20s, 30s, 40s, 50s+, ageless)
- Voice & accent: deep voice, soft-spoken, raspy, british accent, southern drawl, new york accent, no accent, precise diction, mumbly, fast-talking
- Tone: dramatic, comedic, deadpan, sardonic, warm, intense, menacing, gentle, quirky, dry wit, physical comedy, improvisational
- Archetypes: hero, antihero, villain, everyman, mentor, love interest, comic relief, best friend, authority figure, outsider, underdog, femme fatale, wise elder, ingenue, tough guy, charmer
- Genre strengths: action, thriller, drama, romantic comedy, dark comedy, horror, sci-fi, period drama, prestige TV, indie, blockbuster
- Energy: quiet intensity, high energy, laid-back, unpredictable, grounded, magnetic, understated, larger than life
- Screen presence: scene-stealer, ensemble player, carries a film, better in support, character actor, leading man/woman
- Vibe comparisons: use "type" tags like "young de niro type", "classic hollywood", "new hollywood", "mumblecore", "method actor"
- Specific skills or traits: martial arts, singer, dancer, comedian, improviser, accents, dialect work, physical transformation roles
- Casting sweet spots: what kind of roles they always get, what they subvert

Return ONLY a comma-separated list of lowercase tags. No numbers, no explanation, no markdown.`
    }],
  })
  return msg.content[0].type === 'text' ? msg.content[0].text.trim() : ''
}

async function main() {
  // Fetch all actors missing keywords, in batches
  const PAGE = 500
  let from = 0
  let totalProcessed = 0
  let totalErrors = 0

  while (true) {
    const { data, error } = await sb
      .from('actors')
      .select('id, name, biography, known_for, casting_profile, keywords')
      .range(from, from + PAGE - 1)

    if (error) { console.error('Fetch error:', error.message); break }
    if (!data || data.length === 0) break

    console.log(`\nBatch ${from / PAGE + 1}: processing ${data.length} actors...`)

    for (const actor of data) {
      process.stdout.write(`  ${actor.name}... `)
      try {
        const tags = await generateTags(
          actor.name,
          actor.biography ?? '',
          actor.known_for ?? '',
          actor.casting_profile ?? ''
        )
        if (!tags) { console.log('EMPTY'); totalErrors++; continue }

        const { error: updateError } = await sb
          .from('actors')
          .update({ keywords: tags })
          .eq('id', actor.id)

        if (updateError) { console.log(`ERROR: ${updateError.message}`); totalErrors++ }
        else { console.log('done'); totalProcessed++ }
      } catch (e: any) {
        console.log(`EXCEPTION: ${e.message}`)
        totalErrors++
      }
      // Small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 100))
    }

    if (data.length < PAGE) break
    from += PAGE
  }

  console.log(`\nDone. Tagged ${totalProcessed} actors, ${totalErrors} errors.`)
}

main()
