/**
 * Pre-compute Marlowe describe responses for all roles and cache in DB.
 * Run with: npx tsx scripts/prefetch-marlowe.ts
 * Safe to re-run — skips roles that already have marlowe_cache unless --force flag passed.
 *
 * Usage:
 *   npx tsx scripts/prefetch-marlowe.ts           # skip already cached
 *   npx tsx scripts/prefetch-marlowe.ts --force   # recompute all
 */

import fs from 'fs'
import path from 'path'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { extractJson } from '../lib/extractJson'

const FORCE = process.argv.includes('--force')

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

// ── Inline the actor pool logic so we don't depend on Next.js imports ──

interface ActorRow {
  name: string
  gender: string
  birth_year: string
  cost: number
  known_for: string
  keywords: string
  popularity: number
}

function formatActor(a: ActorRow): string {
  const parts: string[] = [a.name]
  const meta: string[] = []
  if (a.gender) meta.push(a.gender)
  if (a.birth_year) meta.push(`b.${a.birth_year}`)
  meta.push(`$${a.cost}M`)
  if (meta.length) parts.push(`(${meta.join(', ')})`)
  if (a.known_for) parts.push(`known for: ${a.known_for}`)
  if (a.keywords) parts.push(`[${a.keywords}]`)
  return parts.join(' — ')
}

function popularityToCost(pop: number): number {
  if (pop >= 20) return 12
  if (pop >= 15) return 10
  if (pop >= 12) return 8
  if (pop >= 10) return 6
  if (pop >= 6) return 4
  return 3
}

function selectPool(actors: ActorRow[], query: string, originalGender?: string, limit = 200): ActorRow[] {
  const q = query.toLowerCase()
  const currentYear = new Date().getFullYear()
  const wantsSwap = /\b(gender.?swap|opposite gender|swap gender|as a woman|as a man|female version|male version)\b/.test(q)
  let pool = actors
  if (!wantsSwap && originalGender) {
    pool = pool.filter(a => a.gender?.toLowerCase() === originalGender.toLowerCase())
  }
  return pool.slice(0, limit)
}

async function fetchAllActors(): Promise<ActorRow[]> {
  const all: ActorRow[] = []
  let from = 0
  const PAGE = 1000
  while (true) {
    const { data, error } = await supabase
      .from('actors')
      .select('name, gender, birth_year, popularity, cost, salary_estimate, known_for, keywords')
      .order('popularity', { ascending: false })
      .range(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    if (!data || data.length === 0) break
    for (const row of data as any[]) {
      const pop = Number(row.popularity) || 0
      all.push({
        name: row.name,
        gender: row.gender ?? '',
        birth_year: row.birth_year ?? '',
        cost: row.salary_estimate ?? row.cost ?? popularityToCost(pop),
        known_for: row.known_for ?? '',
        keywords: row.keywords ?? '',
        popularity: pop,
      })
    }
    if (data.length < PAGE) break
    from += PAGE
  }
  return all
}

async function describeRole(params: {
  roleName: string
  movie: string
  originalActor: string | null
  roleDescription?: string | null
  roleTier: string
  castingBrief: string | null
  budget: number
  allActors: ActorRow[]
  overrideQuery?: string
}): Promise<{ reply: string; actors: string[]; suggestion: string | null }> {
  const { roleName, movie, originalActor, roleDescription, roleTier, castingBrief, budget, allActors, overrideQuery } = params
  const isBook = !originalActor

  const originalActorData = originalActor ? allActors.find(a => a.name.toLowerCase() === originalActor.toLowerCase()) : undefined
  const originalGender = originalActorData?.gender ?? undefined
  const pool = selectPool(allActors, overrideQuery ?? roleName, originalGender)
  const poolText = pool.map(formatActor).join('\n')

  const tierLabel = roleTier === 'first_lead' ? 'FIRST LEAD'
    : roleTier === 'second_lead' ? 'SECOND LEAD'
    : roleTier === 'third_lead' ? 'THIRD LEAD'
    : 'SUPPORTING'

  const pcts: Record<string, [number, number]> = {
    first_lead:   [0.35, 0.40],
    second_lead:  [0.15, 0.20],
    third_lead:   [0.08, 0.12],
    supporting:   [0.04, 0.08],
  }
  const [lo, hi] = pcts[roleTier] ?? pcts.supporting
  const loM = Math.round(budget * lo)
  const hiM = Math.round(budget * hi)
  const tierBudgetGuide = `This is a ${tierLabel} role. Industry standard budget allocation: $${loM}–$${hiM}M (${Math.round(lo*100)}–${Math.round(hi*100)}% of $${budget}M total). Call out actors dramatically over or under this range.`

  const castingBriefSection = castingBrief ? `\nCasting brief for this property: ${castingBrief}` : ''

  const persona = `You are Marlowe, a veteran Hollywood casting director with 30 years of experience. You are male. You have deep encyclopedic knowledge of actors — their range, box office track record, screen presence, and reputation on set. You are precise, authoritative, and respected in the industry. You give clear professional assessments: why an actor fits, what the risks are, what the opportunity is. You have strong opinions and you state them directly.

Each actor line includes birth year (b.YYYY) and cost ($XM). Current year: ${new Date().getFullYear()}.
${castingBriefSection}
${tierBudgetGuide}`

  const baseRole = roleName.includes(' — ') ? roleName.split(' — ')[0] : roleName
  const roleContext = isBook
    ? `an adaptation of "${movie}". The role is ${baseRole} — a character from the book.${roleDescription ? ` Character description: ${roleDescription}` : ''}`
    : `a reboot of "${movie}". The role is ${baseRole}, originally played by ${originalActor}.`

  const prompt = overrideQuery
    ? `${persona}

You are working on ${roleContext}

The director wants: "${overrideQuery}"

Actor pool (suggest ONLY names that appear exactly in this list):
${poolText}

Your tasks:
1. Pick 6–10 actors from the pool who genuinely match this request.
2. Give a 1–2 sentence reaction: is this a smart instinct, a bold swing, or a safe play?
3. Optionally write a pointed follow-up question (10–15 words), or null.

Return ONLY this JSON (no markdown):
{
  "reply": "your reaction",
  "actors": ["Exact Name", ...],
  "suggestion": "follow-up question or null"
}`
    : `${persona}

You are working on ${roleContext}

Actor pool (suggest ONLY names that appear exactly in this list):
${poolText}

Your tasks:
1. Write 2 sharp sentences describing this character — their essence, what they demand from an actor.${isBook ? ' Draw on your knowledge of the book.' : ' Note what the original performance got right or wrong.'}
2. Pick 6–10 actors from the pool who genuinely fit — think physicality, age, screen persona, genre credibility.
3. Write a punchy follow-up question (10–15 words) offering to go deeper.

Return ONLY this JSON (no markdown):
{
  "reply": "2-sentence character description",
  "actors": ["Exact Name", ...],
  "suggestion": "follow-up question"
}`

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const jsonStr = extractJson(text.replace(/```json|```/g, '').trim())
  if (!jsonStr) throw new Error(`No JSON: ${text.slice(0, 80)}`)

  const parsed = JSON.parse(jsonStr)

  // Validate actor names
  const allNames = new Set(allActors.map(a => a.name))
  const validActors = (parsed.actors ?? []).filter((n: string) =>
    allNames.has(n) || allActors.some(a => a.name.toLowerCase() === n.toLowerCase())
  )

  return {
    reply: parsed.reply ?? '',
    actors: validActors,
    suggestion: parsed.suggestion ?? null,
  }
}

async function main() {
  console.log('Fetching actors...')
  const allActors = await fetchAllActors()
  console.log(`Loaded ${allActors.length} actors.\n`)

  // Fetch all roles with pagination (Supabase default limit is 1000)
  const allRoles: any[] = []
  let rolesFrom = 0
  while (true) {
    const { data: batch, error } = await supabase
      .from('roles')
      .select('title_slug, role_name, original_actor, role_description, tier, marlowe_cache')
      .order('title_slug', { ascending: true })
      .range(rolesFrom, rolesFrom + 999)
    if (error) throw new Error(error.message)
    if (!batch || batch.length === 0) break
    allRoles.push(...batch)
    if (batch.length < 1000) break
    rolesFrom += 1000
  }
  const roles = allRoles
  const error = null

  const { data: titles } = await supabase
    .from('titles')
    .select('slug, title, budget, casting_brief')

  const titleMap = new Map((titles ?? []).map((t: any) => [t.slug, t]))

  const toProcess = FORCE
    ? roles ?? []
    : (roles ?? []).filter((r: any) => !r.marlowe_cache)

  console.log(`${toProcess.length} roles to process (${FORCE ? 'force mode' : 'skipping cached'}).\n`)

  let done = 0
  let failed = 0

  for (const role of toProcess as any[]) {
    const titleData = titleMap.get(role.title_slug)
    if (!titleData) { console.log(`  ✗ No title found for slug: ${role.title_slug}`); failed++; continue }

    try {
      const result = await describeRole({
        roleName: role.role_name,
        movie: titleData.title,
        originalActor: role.original_actor ?? null,
        roleDescription: role.role_description ?? null,
        roleTier: role.tier,
        castingBrief: titleData.casting_brief ?? null,
        budget: titleData.budget ?? 50,
        allActors,
      })

      // Pre-compute quick searches in parallel
      const quickKeys = ['younger', 'cheaper', 'older', 'comedian', 'action star']
      const quickResults = await Promise.allSettled(quickKeys.map(q =>
        describeRole({
          roleName: `${role.role_name} — ${q}`,
          movie: titleData.title,
          originalActor: role.original_actor ?? null,
          roleDescription: role.role_description ?? null,
          roleTier: role.tier,
          castingBrief: titleData.casting_brief ?? null,
          budget: titleData.budget ?? 50,
          allActors,
          overrideQuery: q,
        })
      ))
      const marlowe_quick: Record<string, { reply: string; actors: string[]; suggestion: string | null }> = {}
      quickKeys.forEach((q, i) => {
        if (quickResults[i].status === 'fulfilled') marlowe_quick[q] = (quickResults[i] as PromiseFulfilledResult<any>).value
      })

      const { error: updateError } = await supabase
        .from('roles')
        .update({ marlowe_cache: result, marlowe_quick })
        .eq('title_slug', role.title_slug)
        .eq('role_name', role.role_name)

      if (updateError) throw new Error(updateError.message)

      done++
      if (done % 10 === 0) console.log(`  ${done}/${toProcess.length} cached...`)

      await new Promise(r => setTimeout(r, 120))
    } catch (err) {
      failed++
      console.error(`  ✗ ${titleData.title} / ${role.role_name}: ${err instanceof Error ? err.message : err}`)
    }
  }

  console.log(`\nDone. ${done} cached, ${failed} failed.`)
}

main().catch(console.error)
