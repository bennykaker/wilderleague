/**
 * Fills in missing role_description for book roles.
 * Run with: npx tsx scripts/patch-book-role-descriptions.ts
 * Safe to re-run — skips roles that already have role_description.
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

async function generateDescriptions(bookTitle: string, roles: { id: number; role_name: string }[]): Promise<Record<string, string>> {
  const roleList = roles.map(r => `- ${r.role_name}`).join('\n')

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: `You are a casting database editor. For the novel "${bookTitle}", write a 1-sentence character description for each of these roles. Focus on their personality, arc, and what kind of actor they demand.

Roles:
${roleList}

Return ONLY this JSON (no markdown):
{
  "descriptions": {
    "Character Name": "one sentence description",
    ...
  }
}`,
    }],
  })

  const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
  const match = text.replace(/```json|```/g, '').trim().match(/\{[\s\S]*\}/)
  if (!match) throw new Error(`No JSON: ${text.slice(0, 100)}`)
  const parsed = JSON.parse(match[0])
  return parsed.descriptions ?? {}
}

async function main() {
  // Get all book title slugs
  const { data: bookTitles, error: titlesError } = await supabase
    .from('titles')
    .select('slug, title')
    .eq('type', 'book')

  if (titlesError) throw new Error(titlesError.message)
  if (!bookTitles?.length) { console.log('No book titles found.'); return }

  // Get roles missing role_description
  const { data: roles, error: rolesError } = await supabase
    .from('roles')
    .select('id, title_slug, role_name')
    .in('title_slug', bookTitles.map(t => t.slug))
    .is('role_description', null)

  if (rolesError) throw new Error(rolesError.message)
  if (!roles?.length) { console.log('All book roles already have descriptions.'); return }

  // Group by title
  const byTitle: Record<string, typeof roles> = {}
  for (const r of roles) {
    if (!byTitle[r.title_slug]) byTitle[r.title_slug] = []
    byTitle[r.title_slug].push(r)
  }

  console.log(`Patching ${roles.length} roles across ${Object.keys(byTitle).length} books...\n`)

  let done = 0
  let failed = 0

  for (const [slug, titleRoles] of Object.entries(byTitle)) {
    const bookTitle = bookTitles.find(t => t.slug === slug)?.title ?? slug
    try {
      const descriptions = await generateDescriptions(bookTitle, titleRoles)

      for (const role of titleRoles) {
        const desc = descriptions[role.role_name]
        if (!desc) continue
        const { error } = await supabase
          .from('roles')
          .update({ role_description: desc })
          .eq('id', role.id)
        if (error) throw new Error(error.message)
        done++
      }
      console.log(`✓ ${bookTitle} — ${titleRoles.length} roles`)
    } catch (err) {
      failed += titleRoles.length
      console.error(`✗ ${bookTitle}: ${err instanceof Error ? err.message : err}`)
    }
    await new Promise(r => setTimeout(r, 300))
  }

  console.log(`\nDone. ${done} roles patched, ${failed} failed.`)
}

main().catch(console.error)
