/**
 * Pre-computes actor suggestions for every role in every title.
 * One Claude Haiku call per movie/show — fast and cheap.
 * Run with: npm run precompute-suggestions
 *
 * Writes: data/role-suggestions.csv (movie_slug, role_name, original_actor, suggestions)
 * Safe to re-run — skips titles already computed.
 */

import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'
import path from 'path'
import Papa from 'papaparse'

function getKey(name: string): string {
  if (process.env[name]) return process.env[name]!
  try {
    const file = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
    const match = file.match(new RegExp(`^${name}=(.+)$`, 'm'))
    return match?.[1]?.trim() ?? ''
  } catch { return '' }
}

const client = new Anthropic({ apiKey: getKey('ANTHROPIC_API_KEY') })

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

interface TitleRow { slug: string; title: string; year: string; budget: string; type: string }
interface RoleRow { movie_slug: string; role_name: string; original_actor: string }
interface ActorRow { name: string; gender: string; birth_year: string; cost: string; known_for: string; popularity: string }
interface SuggestionRow { movie_slug: string; role_name: string; original_actor: string; suggestions: string }

function loadCsv<T>(file: string): T[] {
  const raw = fs.readFileSync(path.join(process.cwd(), 'data', file), 'utf8')
  return Papa.parse<T>(raw, { header: true, skipEmptyLines: true }).data
}

async function suggestForTitle(
  title: TitleRow,
  roles: RoleRow[],
  actorPool: string,
): Promise<Record<string, string[]>> {
  const roleList = roles.map(r => `- ${r.role_name} (originally ${r.original_actor})`).join('\n')

  const prompt = `You are Marlowe, a veteran Hollywood casting director.

Film/show: ${title.title} (${title.year}) — ${title.type === 'tv' ? 'TV series' : 'film'}
Recast budget: $${title.budget}M total

For each role, pick exactly 8 actors from the pool who genuinely fit. Consider physicality, age range, genre credibility, and screen presence. Be specific — no padding with random names.

Roles to cast:
${roleList}

Actor pool (name | gender | birth year | cost | known for):
${actorPool}

Return ONLY valid JSON, no markdown:
{
  "${roles[0].role_name}": ["Exact Name", ...8 names],
  ...one key per role
}`

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
  const match = text.replace(/```json|```/g, '').trim().match(/\{[\s\S]*\}/)
  if (!match) throw new Error(`No JSON in response: ${text.slice(0, 100)}`)
  return JSON.parse(match[0])
}

async function main() {
  const outPath = path.join(process.cwd(), 'data', 'role-suggestions.csv')

  const titles = loadCsv<TitleRow>('titles.csv')
  const roles = loadCsv<RoleRow>('roles.csv')
  const actors = loadCsv<ActorRow>('enriched-actors.csv')

  // Load existing suggestions to skip already-done titles
  const existing = new Map<string, SuggestionRow>()
  if (fs.existsSync(outPath)) {
    loadCsv<SuggestionRow>('role-suggestions.csv')
      .forEach(r => existing.set(`${r.movie_slug}::${r.role_name}`, r))
  }

  // Build actor pool text — top 400 by popularity, formatted compactly
  const poolLines = actors
    .filter(a => a.name?.trim())
    .sort((a, b) => parseFloat(b.popularity) - parseFloat(a.popularity))
    .slice(0, 400)
    .map(a => `${a.name} | ${a.gender || '?'} | ${a.birth_year || '?'} | $${a.cost}M | ${(a.known_for || '').split(';').slice(0, 2).join(', ')}`)
    .join('\n')

  const allNames = new Set(actors.map(a => a.name?.trim().toLowerCase()))
  const output: SuggestionRow[] = [...existing.values()]

  for (let i = 0; i < titles.length; i++) {
    const title = titles[i]
    const titleRoles = roles.filter(r => r.movie_slug === title.slug)
    if (titleRoles.length === 0) continue

    // Skip if all roles already have suggestions
    const alreadyDone = titleRoles.every(r => existing.has(`${title.slug}::${r.role_name}`))
    if (alreadyDone) {
      console.log(`[${i + 1}/${titles.length}] ${title.title} — skipped`)
      continue
    }

    process.stdout.write(`[${i + 1}/${titles.length}] ${title.title}... `)

    try {
      const suggestions = await suggestForTitle(title, titleRoles, poolLines)

      for (const role of titleRoles) {
        const key = `${title.slug}::${role.role_name}`
        if (existing.has(key)) continue

        const names: string[] = (suggestions[role.role_name] ?? [])
          .filter((n: string) => allNames.has(n.toLowerCase()))
          .slice(0, 8)

        const row: SuggestionRow = {
          movie_slug: title.slug,
          role_name: role.role_name,
          original_actor: role.original_actor,
          suggestions: names.join('; '),
        }
        output.push(row)
        existing.set(key, row)
      }

      const filled = titleRoles.filter(r => {
        const s = existing.get(`${title.slug}::${r.role_name}`)?.suggestions
        return s && s.trim().length > 0
      }).length
      console.log(`✓ (${filled}/${titleRoles.length} roles filled)`)
    } catch (err) {
      console.log(`FAILED: ${err}`)
    }

    // Save after each title so progress isn't lost
    fs.writeFileSync(outPath, Papa.unparse(output), 'utf8')
    await sleep(500)
  }

  fs.writeFileSync(outPath, Papa.unparse(output), 'utf8')
  console.log(`\nDone. ${output.length} role suggestion sets written.`)
}

main().catch(err => { console.error(err); process.exit(1) })
