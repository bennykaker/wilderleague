import { redirect } from 'next/navigation'
import { createClient } from '../../lib/supabase/server'
import Link from 'next/link'

const AWARD_LABELS: Record<string, { label: string; color: string }> = {
  best_in_show:      { label: 'Best in Show',       color: '#f59e0b' },
  genius_unmakable:  { label: 'Genius / Unmakable',  color: '#8b5cf6' },
  makable_unwatchable: { label: 'Makable / Unwatchable', color: '#ef4444' },
  hear_me_out:       { label: 'Hear Me Out',          color: '#3b82f6' },
}

export default async function LeaderboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login?next=/leaderboard')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_member, is_director')
    .eq('id', user.id)
    .single()

  if (!profile?.is_member && !profile?.is_director) redirect('/pricing')

  // Top 50 scored submissions, ordered by composite score
  const { data: rows } = await supabase
    .from('submissions')
    .select('id, username, movie_slug, ai_summary, green_light_score, quality_score, hear_me_out_score, award, created_at')
    .eq('scored', true)
    .not('username', 'is', null)
    .order('hear_me_out_score', { ascending: false })
    .limit(50)

  const entries = (rows ?? []).map(r => ({
    ...r,
    avg: Math.round(((r.green_light_score ?? 0) + (r.quality_score ?? 0) + (r.hear_me_out_score ?? 0)) / 3),
  })).sort((a, b) => b.avg - a.avg)

  return (
    <main style={{ minHeight: '100vh', background: '#09090b', color: '#f8fafc', padding: '48px 28px', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>
      <div style={{ maxWidth: '860px', margin: '0 auto' }}>

        <Link href="/" style={{ fontSize: '13px', color: '#71717a', textDecoration: 'none', display: 'inline-block', marginBottom: '40px' }}>
          ← Home
        </Link>

        <div style={{ marginBottom: '40px' }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#3b82f6', marginBottom: '10px', fontWeight: 700 }}>
            Members Only
          </div>
          <h1 style={{ fontSize: '38px', fontWeight: 900, margin: '0 0 10px' }}>Leaderboard</h1>
          <p style={{ fontSize: '16px', color: '#71717a', margin: 0 }}>
            Top 50 community casts, ranked by average score.
          </p>
        </div>

        {entries.length === 0 ? (
          <div style={{ color: '#52525b', fontSize: '16px' }}>No scored casts yet. Be the first.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {entries.map((entry, i) => {
              const award = entry.award ? AWARD_LABELS[entry.award] : null
              return (
                <Link key={entry.id} href={`/${entry.movie_slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '16px',
                    padding: '16px 20px',
                    background: i === 0 ? 'rgba(245,158,11,0.06)' : '#111115',
                    border: `1px solid ${i === 0 ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.07)'}`,
                    borderRadius: '12px',
                    transition: 'border-color 0.15s',
                  }}>

                    {/* Rank */}
                    <div style={{ width: '32px', textAlign: 'center', flexShrink: 0 }}>
                      <span style={{
                        fontSize: i < 3 ? '18px' : '14px',
                        fontWeight: 900,
                        color: i === 0 ? '#f59e0b' : i === 1 ? '#a1a1aa' : i === 2 ? '#b45309' : '#3f3f46',
                      }}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                      </span>
                    </div>

                    {/* Main info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '15px', fontWeight: 700, color: '#f1f5f9' }}>
                          {entry.movie_slug.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                        </span>
                        {award && (
                          <span style={{
                            fontSize: '10px', fontWeight: 800, textTransform: 'uppercase',
                            letterSpacing: '0.08em', padding: '2px 8px', borderRadius: '5px',
                            background: `${award.color}18`, color: award.color,
                            border: `1px solid ${award.color}44`,
                          }}>
                            {award.label}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: '#52525b', marginTop: '3px' }}>
                        by @{entry.username}
                      </div>
                      {entry.ai_summary && (
                        <div style={{ fontSize: '13px', color: '#a1a1aa', marginTop: '5px', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          "{entry.ai_summary}"
                        </div>
                      )}
                    </div>

                    {/* Scores */}
                    <div style={{ display: 'flex', gap: '16px', flexShrink: 0 }}>
                      {[
                        { label: 'GL', value: entry.green_light_score, color: '#22c55e' },
                        { label: 'Q',  value: entry.quality_score,     color: '#3b82f6' },
                        { label: 'HMO', value: entry.hear_me_out_score, color: '#8b5cf6' },
                      ].map(s => (
                        <div key={s.label} style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '18px', fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
                          <div style={{ fontSize: '9px', color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '2px' }}>{s.label}</div>
                        </div>
                      ))}
                      <div style={{ textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.07)', paddingLeft: '16px' }}>
                        <div style={{ fontSize: '18px', fontWeight: 900, color: '#f1f5f9', lineHeight: 1 }}>{entry.avg}</div>
                        <div style={{ fontSize: '9px', color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '2px' }}>avg</div>
                      </div>
                    </div>

                  </div>
                </Link>
              )
            })}
          </div>
        )}

      </div>
    </main>
  )
}
