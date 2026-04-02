import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'
import fs from 'fs'
import path from 'path'
import { getEnrichedActors, type EnrichedActor } from '../../data/enrichedActors'
import { getTitle } from '../../data/titles'
import { createClient } from '../../../lib/supabase/server'
import { extractJson } from '../../../lib/extractJson'

function getApiKey(): string {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY
  try {
    const file = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
    const match = file.match(/^ANTHROPIC_API_KEY=(.+)$/m)
    return match?.[1]?.trim() ?? ''
  } catch { return '' }
}

const client = new Anthropic({ apiKey: getApiKey() })

interface RoleChatRequest {
  action: 'describe' | 'search' | 'react'
  role: string
  movie: string
  movieSlug?: string
  originalActor: string
  roleTier?: string
  budget?: number
  query?: string
  pickedActor?: string
  pickedActorCost?: number
  excludeActors?: string[]
  useSonnet?: boolean
}

interface RoleChatResponse {
  reply: string
  actors?: string[]
  suggestion?: string | null
}

// Format an actor as a single rich line for Marlowe
function formatActor(a: EnrichedActor): string {
  const parts: string[] = [`${a.name}`]
  const meta: string[] = []
  if (a.gender) meta.push(a.gender)
  if (a.birth_year) meta.push(`b.${a.birth_year}`)
  meta.push(`$${a.cost}M`)
  if (meta.length) parts.push(`(${meta.join(', ')})`)
  if (a.known_for) parts.push(`known for: ${a.known_for}`)
  if (a.keywords) parts.push(`[${a.keywords}]`)
  return parts.join(' — ')
}

// Pre-filter actors to a relevant subset before sending to Marlowe
function selectPool(actors: EnrichedActor[], query: string, originalGender?: string, roleTier?: string, budget?: number, originalRace?: string, limit = 200): EnrichedActor[] {
  const q = query.toLowerCase()
  const currentYear = new Date().getFullYear()

  // Detect explicit gender requests
  const wantsFemale = /\b(woman|female|girl|she|her|actress)\b/.test(q)
  const wantsMale = /\b(man|male|guy|he|him|actor)\b/.test(q)
  // Detect explicit gender swap request
  const wantsSwap = /\b(gender.?swap|opposite gender|swap gender|as a woman|as a man|female version|male version)\b/.test(q)

  // Detect age hints
  const wantsYoung = /\b(young|younger|twenties|20s|teen|fresh|new face|emerging|rising)\b/.test(q)
  const wantsOlder = /\b(old|older|veteran|seasoned|mature|fifties|50s|sixties|60s)\b/.test(q)
  const wantsMidCareer = /\b(mid.career|thirties|30s|forties|40s)\b/.test(q)

  // Detect cost hints
  const wantsCheaper = /\b(cheap|cheaper|budget|affordable|low.cost|under \$|less expensive)\b/.test(q)
  const wantsExpensive = /\b(expensive|big name|star|marquee|bankable)\b/.test(q)

  let pool = actors

  // Gender filter: explicit request overrides default; otherwise lock to original actor's gender
  if (wantsFemale && !wantsSwap) {
    pool = pool.filter(a => a.gender?.toLowerCase() === 'female')
  } else if (wantsMale && !wantsSwap) {
    pool = pool.filter(a => a.gender?.toLowerCase() === 'male')
  } else if (!wantsSwap && originalGender) {
    pool = pool.filter(a => a.gender?.toLowerCase() === originalGender.toLowerCase())
  }

  if (wantsYoung) {
    pool = pool.filter(a => {
      const age = a.birth_year ? currentYear - parseInt(a.birth_year) : 999
      return age < 40
    })
  } else if (wantsOlder) {
    pool = pool.filter(a => {
      const age = a.birth_year ? currentYear - parseInt(a.birth_year) : 0
      return age > 50
    })
  } else if (wantsMidCareer) {
    pool = pool.filter(a => {
      const age = a.birth_year ? currentYear - parseInt(a.birth_year) : 999
      return age >= 30 && age <= 50
    })
  }

  if (wantsCheaper) pool = pool.filter(a => a.cost <= 6)
  else if (wantsExpensive) pool = pool.filter(a => a.cost >= 10)
  else if (roleTier && !wantsExpensive) {
    // Cap cost for non-lead roles — no point sending $12M actors when the budget says $4–8M
    const b = budget ?? 100
    const tierCaps: Record<string, number> = {
      second_lead: Math.round(b * 0.25),  // generous ceiling above the 20% guideline
      third_lead:  Math.round(b * 0.16),
      supporting:  Math.round(b * 0.12),
    }
    const cap = tierCaps[roleTier]
    if (cap) pool = pool.filter(a => a.cost <= cap)
  }

  // Detect genre hints
  const genres = ['action', 'drama', 'comedy', 'thriller', 'sci-fi', 'horror', 'romance', 'crime']
  const wantedGenres = genres.filter(g => q.includes(g))
  if (wantedGenres.length > 0) {
    const genreMatches = pool.filter(a => wantedGenres.some(g => a.keywords.includes(g)))
    if (genreMatches.length >= 20) pool = genreMatches
  }

  // If filters made the pool tiny, relax and take top by popularity
  if (pool.length < 20) pool = actors.slice(0, limit)

  // Race boost: if we know the original actor's race, surface matching actors first.
  // Keep the full pool so Marlowe has fallbacks, but matching actors occupy the top slots.
  const wantsEthnicitySwap = /\b(any race|any ethnicity|different race|white version|black version|asian version|latino version)\b/.test(query.toLowerCase())
  if (originalRace && originalRace !== 'white' && originalRace !== 'unknown' && !wantsEthnicitySwap) {
    const matching = pool.filter(a => a.race_ethnicity === originalRace)
    const rest = pool.filter(a => a.race_ethnicity !== originalRace)
    // Fill first 2/3 of pool with matching actors, rest with everyone else
    const matchSlice = matching.slice(0, Math.ceil(limit * 0.67))
    const restSlice = rest.slice(0, limit - matchSlice.length)
    return [...matchSlice, ...restSlice]
  }

  return pool.slice(0, limit)
}

export async function POST(request: NextRequest) {
  const body = await request.json() as RoleChatRequest
  const { action, role, movie, movieSlug, originalActor, roleTier, budget, query = '', pickedActor, pickedActorCost, excludeActors = [], useSonnet = false } = body

  if (!action || !role) {
    return Response.json({ reply: '', actors: [] })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let isMember = false
  let isDirector = false
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('is_member, is_director').eq('id', user.id).single()
    isMember = profile?.is_member ?? false
    isDirector = profile?.is_director ?? false
  }

  // Rolling 3-day limits: guests 50, members 300, directors 500
  // Directors also get a Sonnet toggle with a separate 50/day hard cap
  const trackingKey = user ? user.id : (request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown')
  const userTierLabel = isDirector ? 'Director' : isMember ? 'Member' : 'Guest'

  // Rolling 3-day window: sum counts for today and the past 2 days
  const today = new Date().toISOString().split('T')[0]
  const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0]
  const { data: recentUsage } = await supabase
    .from('review_usage')
    .select('count')
    .eq('ip', trackingKey)
    .eq('type', 'chat')
    .gte('date', twoDaysAgo)
  const rollingCount = (recentUsage ?? []).reduce((sum: number, r: { count: number }) => sum + (r.count ?? 0), 0)
  const rollingLimit = isDirector ? 500 : isMember ? 300 : 50

  if (rollingCount >= rollingLimit) {
    return Response.json({
      error: `${userTierLabel} limit reached (${rollingLimit} Marlowe chats per 3 days).${!user ? ' Sign in for more.' : ''}`,
      reply: '', actors: [], limitReached: true,
      remaining: 0,
    }, { status: 429 })
  }

  // Sonnet cap: directors only, 50/day hard cap
  const wantsSonnet = useSonnet && isDirector
  const SONNET_DAILY_LIMIT = 50
  if (wantsSonnet) {
    const { data: sonnetUsage } = await supabase
      .from('review_usage')
      .select('count')
      .eq('ip', trackingKey)
      .eq('date', today)
      .eq('type', 'chat_sonnet')
      .single()
    const sonnetCount = sonnetUsage?.count ?? 0
    if (sonnetCount >= SONNET_DAILY_LIMIT) {
      return Response.json({
        error: `Sonnet limit reached (${SONNET_DAILY_LIMIT}/day). Switching to Haiku.`,
        reply: '', actors: [], sonnetLimitReached: true,
        remaining: rollingLimit - rollingCount,
      }, { status: 429 })
    }
    await supabase.from('review_usage').upsert(
      { ip: trackingKey, date: today, type: 'chat_sonnet', count: sonnetCount + 1 },
      { onConflict: 'ip,date,type' }
    )
  }

  // Record haiku chat usage
  const { data: todayUsage } = await supabase
    .from('review_usage')
    .select('count')
    .eq('ip', trackingKey)
    .eq('date', today)
    .eq('type', 'chat')
    .single()
  const todayCount = todayUsage?.count ?? 0
  await supabase.from('review_usage').upsert(
    { ip: trackingKey, date: today, type: 'chat', count: todayCount + 1 },
    { onConflict: 'ip,date,type' }
  )

  const [allActors, titleData] = await Promise.all([
    getEnrichedActors(),
    movieSlug ? getTitle(movieSlug) : Promise.resolve(null),
  ])
  const originalActorData = allActors.find(a => a.name.toLowerCase() === originalActor.toLowerCase())
  const originalGender = originalActorData?.gender ?? undefined
  const originalRace = originalActorData?.race_ethnicity ?? undefined
  const pool = selectPool(allActors, query || role, originalGender, roleTier, budget, originalRace)
  const excludeSet = new Set(excludeActors.map((n: string) => n.toLowerCase()))
  const filteredPool = excludeSet.size > 0 ? pool.filter(a => !excludeSet.has(a.name.toLowerCase())) : pool
  const poolText = filteredPool.map(formatActor).join('\n')
  const allNames = new Set(allActors.map(a => a.name))

  // Budget allocation guidance based on role tier
  const tierLabel = roleTier === 'first_lead' ? 'FIRST LEAD'
    : roleTier === 'second_lead' ? 'SECOND LEAD'
    : roleTier === 'third_lead' ? 'THIRD LEAD'
    : 'SUPPORTING'

  const tierBudgetGuide = budget ? (() => {
    const pcts: Record<string, [number, number]> = {
      first_lead:   [0.35, 0.40],
      second_lead:  [0.15, 0.20],
      third_lead:   [0.08, 0.12],
      supporting:   [0.04, 0.08],
    }
    const [lo, hi] = pcts[roleTier ?? 'supporting'] ?? pcts.supporting
    const loM = Math.round(budget * lo)
    const hiM = Math.round(budget * hi)
    return `This is a ${tierLabel} role. Industry standard budget allocation for this tier: $${loM}–$${hiM}M (${Math.round(lo*100)}–${Math.round(hi*100)}% of total $${budget}M casting budget). Call out actors who are dramatically over or under this range.`
  })() : `This is a ${tierLabel} role.`

  const castingBriefSection = (titleData as any)?.casting_brief
    ? `\nCasting brief for this property: ${(titleData as any).casting_brief}`
    : ''

  const persona = `You are Marlowe, a veteran Hollywood casting director with 30 years of experience. You are male. You love this work — finding the right actor for a role is one of life's genuine pleasures and you bring real enthusiasm to the hunt. You have strong opinions and encyclopedic knowledge of actors — their range, box office history, screen presence, and reputation on set. You are collaborative and fun to work with. You get excited about inspired choices. You push back on bad instincts but you do it with wit, not contempt. This is a creative conversation, not a performance review.

Each actor line includes birth year (b.YYYY) and cost ($XM). Use birth year to calculate current age (current year: ${new Date().getFullYear()}) when the director requests younger, older, or a specific age range. Use cost to filter by budget when requested.

Race and ethnicity: You know who ${originalActor} is. Use that knowledge. When suggesting replacements, the overwhelming majority of your picks — ideally all of them — must share the same racial and ethnic background as the original actor. Do not whitewash roles. If the actor pool doesn't give you enough matching options, return fewer names and say so rather than suggesting mismatched actors. Only deviate if the director explicitly asks for a different ethnicity.
${castingBriefSection}
${tierBudgetGuide}`

  const isBook = !originalActor
  const roleContext = isBook
    ? `an adaptation of "${movie}". The role is ${role} — a character from the book.`
    : `a reboot of "${movie}". The role is ${role}, originally played by ${originalActor}.`

  let prompt = ''

  try {
    if (action === 'describe') {
      prompt = `${persona}

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

    } else if (action === 'search') {
      prompt = `${persona}

You are working on ${roleContext}

The director just said: "${query}"

Actor pool (suggest ONLY names that appear exactly in this list):
${poolText}

Your tasks:
1. Pick 6–10 actors from the pool who genuinely match this request. Be rigorous — if only 4 truly fit, return 4.
2. Give a 1–2 sentence reaction: is this a smart instinct, a bold swing, or a safe play? Be specific.
3. Optionally write a pointed follow-up question (10–15 words), or null.

Return ONLY this JSON (no markdown):
{
  "reply": "your reaction",
  "actors": ["Exact Name", ...],
  "suggestion": "follow-up question or null"
}`

    } else if (action === 'react') {
      prompt = `${persona}

You are working on ${isBook ? `an adaptation of "${movie}"` : `a reboot of "${movie}"`}. The director just cast ${pickedActor} as ${role}${!isBook ? ` (originally ${originalActor})` : ''}.${pickedActorCost != null ? ` Cost: $${pickedActorCost}M.` : ''}

Give a 1–2 sentence reaction — smart move, bold risk, or mistake? Be specific about why this actor works or doesn't for this exact role. If their cost is significantly outside the expected range for a ${tierLabel}, call that out.

Then write a sharp follow-up suggestion (10–15 words).

Return ONLY this JSON (no markdown):
{
  "reply": "your reaction",
  "suggestion": "follow-up suggestion"
}`
    }

    // Haiku for everyone by default; directors can opt into Sonnet
    const model = wantsSonnet ? 'claude-sonnet-4-6' : 'claude-haiku-4-5-20251001'

    const message = await client.messages.create({
      model,
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const cleaned = text.replace(/```json|```/g, '').trim()

    const jsonStr = extractJson(cleaned)
    if (!jsonStr) {
      console.error('No JSON in role-chat response:', text)
      return Response.json({ reply: 'Marlowe is thinking — try again in a moment.', actors: [], suggestion: null })
    }

    const parsed = JSON.parse(jsonStr) as RoleChatResponse

    // Validate returned names against full actor list
    const validActors = (parsed.actors ?? []).filter(n =>
      allNames.has(n) || allActors.some(a => a.name.toLowerCase() === n.toLowerCase())
    )

    return Response.json({
      reply: parsed.reply ?? '',
      actors: validActors,
      suggestion: parsed.suggestion ?? null,
      remaining: rollingLimit - rollingCount - 1,
      usedSonnet: wantsSonnet,
    })
  } catch (err) {
    console.error('Role chat error:', err)
    const msg = err instanceof Error ? err.message : String(err)
    return Response.json({ error: msg, reply: '', actors: [] })
  }
}
