import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

function getKey(): string {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY
  try {
    const fs = require('fs')
    const path = require('path')
    const file = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
    const match = file.match(/^ANTHROPIC_API_KEY=(.+)$/m)
    return match?.[1]?.trim() ?? ''
  } catch { return '' }
}

async function generateSummary(
  movie: string,
  selections: Record<string, string>
): Promise<{ summary: string; is_cursed: boolean; curse_reason: string }> {
  const castLines = Object.entries(selections)
    .map(([role, actor]) => `${role}: ${actor}`)
    .join('\n')

  const prompt = `You are Marlowe, veteran Hollywood casting director.

Movie: ${movie}
Proposed cast:
${castLines}

Give a one-line casting verdict (max 20 words). Sharp, specific, no filler.

Also decide: is this cast "cursed"? Cursed means the choices are baffling, against-type, or chaotic in a way that somehow intrigues — not just bad, but deliciously wrong. High bar.

Return ONLY this JSON:
{
  "summary": "one-line verdict",
  "is_cursed": true or false,
  "curse_reason": "one sentence explaining the curse, or empty string if not cursed"
}`

  const client = new Anthropic({ apiKey: getKey() })
  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = msg.content[0].type === 'text' ? msg.content[0].text : '{}'
  const json = text.replace(/```json|```/g, '').trim()
  const match = json.match(/\{[\s\S]*\}/)
  if (!match) return { summary: 'An interesting cast.', is_cursed: false, curse_reason: '' }
  return JSON.parse(match[0])
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { movie_slug, movie_title, selections, challenge_id } = body

  if (!movie_slug || !selections || Object.keys(selections).length === 0) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const cookieStore = await cookies()
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Rate limit: 3 submissions/day for guests
  if (!user) {
    const today = new Date().toISOString().split('T')[0]
    const { data: usage } = await supabase
      .from('review_usage')
      .select('count')
      .eq('ip', ip)
      .eq('date', today)
      .eq('type', 'submit')
      .single()

    const count = usage?.count ?? 0
    if (count >= 3) {
      return NextResponse.json({ error: 'Guest limit reached (3 submissions/day). Sign in for more.' }, { status: 429 })
    }

    // Upsert usage
    await supabase.from('review_usage').upsert(
      { ip, date: today, type: 'submit', count: count + 1 },
      { onConflict: 'ip,date' }
    )
  }

  // Generate AI summary
  let summary = 'An interesting cast.'
  let is_cursed = false
  let curse_reason = ''
  try {
    const result = await generateSummary(movie_title ?? movie_slug, selections)
    summary = result.summary
    is_cursed = result.is_cursed
    curse_reason = result.curse_reason
  } catch (e) {
    console.error('AI summary failed:', e)
  }

  // Insert submission
  const { data, error } = await supabase.from('submissions').insert({
    user_id: user?.id ?? null,
    movie_slug,
    challenge_id: challenge_id ?? null,
    selections,
    ai_summary: summary,
    is_cursed,
    curse_reason,
    ip,
  }).select('id').single()

  if (error) {
    console.error('Insert error:', error)
    return NextResponse.json({ error: 'Failed to save submission' }, { status: 500 })
  }

  return NextResponse.json({ id: data.id, summary, is_cursed, curse_reason })
}
