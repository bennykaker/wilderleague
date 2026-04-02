'use client'

import { useState } from 'react'
import Link from 'next/link'

type Submission = {
  id: string
  username: string | null
  selections: Record<string, string>
  ai_summary: string
  green_light_score: number
  quality_score: number
  hear_me_out_score: number
  award: string | null
}

type SortKey = 'green_light_score' | 'quality_score' | 'hear_me_out_score'

const SORT_OPTIONS: { key: SortKey; label: string; color: string }[] = [
  { key: 'green_light_score', label: 'Greenlight', color: '#22c55e' },
  { key: 'quality_score',     label: 'Quality',    color: '#3b82f6' },
  { key: 'hear_me_out_score', label: 'Hear Me Out', color: '#a855f7' },
]

const AWARD_META: Record<string, { emoji: string; label: string; color: string }> = {
  best_in_show:        { emoji: '🏆', label: 'Best in Show',            color: '#fbbf24' },
  makable_unwatchable: { emoji: '💰', label: 'Makable but Unwatchable', color: '#f87171' },
  genius_unmakable:    { emoji: '🧠', label: 'Genius but Unmakable',    color: '#a78bfa' },
  hear_me_out:         { emoji: '🔮', label: 'Hear Me Out',             color: '#fb923c' },
}

function scoreColor(value: number, key: SortKey) {
  if (key === 'hear_me_out_score') {
    return value >= 70 ? '#a855f7' : value >= 40 ? '#f97316' : '#6b7280'
  }
  if (key === 'quality_score') {
    return value >= 70 ? '#3b82f6' : value >= 40 ? '#f59e0b' : '#ef4444'
  }
  return value >= 70 ? '#22c55e' : value >= 40 ? '#f59e0b' : '#ef4444'
}

export default function ChallengeTop10Client({
  submissions,
  challengeHeadline,
  challengeId,
  movieTitle,
}: {
  submissions: Submission[]
  challengeHeadline: string
  challengeId: string
  movieTitle: string
}) {
  const [sort, setSort] = useState<SortKey>('green_light_score')
  const [expanded, setExpanded] = useState<string | null>(null)

  const sorted = [...submissions]
    .sort((a, b) => b[sort] - a[sort])
    .slice(0, 10)

  const activeSortColor = SORT_OPTIONS.find(o => o.key === sort)?.color ?? '#22c55e'

  return (
    <main style={{ minHeight: '100vh', background: '#09090b', color: '#f8fafc', padding: '48px 28px', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>

        <div style={{ marginBottom: '36px' }}>
          <Link href="/challenges" style={{ fontSize: '13px', color: '#71717a', fontWeight: 600, textDecoration: 'none', display: 'inline-block', marginBottom: '20px' }}>
            ← Challenges
          </Link>
          <div style={{ fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#fbbf24', marginBottom: '10px', fontWeight: 700 }}>
            Top 10
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: 900, margin: '0 0 6px', lineHeight: 1.1 }}>
            {challengeHeadline}
          </h1>
          <p style={{ fontSize: '14px', color: '#71717a', margin: '0 0 24px' }}>
            {movieTitle} · ranked by AI score · {submissions.length} submission{submissions.length !== 1 ? 's' : ''}
          </p>

          {/* Sort controls */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#52525b', fontWeight: 600 }}>Rank by:</span>
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => setSort(opt.key)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: `1px solid ${sort === opt.key ? opt.color : 'rgba(255,255,255,0.1)'}`,
                  background: sort === opt.key ? `${opt.color}18` : 'transparent',
                  color: sort === opt.key ? opt.color : '#71717a',
                  transition: 'all 0.12s',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {sorted.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#3f3f46' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎬</div>
            <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>No scored submissions yet</div>
            <div style={{ fontSize: '14px', marginBottom: '24px' }}>Be the first to cast this challenge</div>
            <Link href={`/challenge/${challengeId}`} style={{ fontSize: '13px', fontWeight: 700, color: '#fbbf24', textDecoration: 'none' }}>
              Take the challenge →
            </Link>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {sorted.map((sub, i) => {
            const isExpanded = expanded === sub.id
            const award = sub.award ? AWARD_META[sub.award] : null

            return (
              <div
                key={sub.id}
                onClick={() => setExpanded(isExpanded ? null : sub.id)}
                style={{
                  border: `1px solid ${isExpanded ? activeSortColor : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: '14px',
                  padding: isExpanded ? '20px' : '16px 18px',
                  background: isExpanded ? 'rgba(255,255,255,0.03)' : '#111115',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s, padding 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                  {/* Rank number */}
                  <div style={{ fontSize: '22px', fontWeight: 900, color: i === 0 ? '#fbbf24' : '#3f3f46', minWidth: '28px', lineHeight: 1, paddingTop: '1px' }}>
                    {i + 1}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {sub.username && (
                      <div style={{ fontSize: '11px', color: '#52525b', fontWeight: 600, marginBottom: '4px' }}>
                        @{sub.username}
                      </div>
                    )}
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9', lineHeight: 1.4 }}>
                      "{sub.ai_summary}"
                    </div>

                    {/* Score pills */}
                    {!isExpanded && (
                      <div style={{ display: 'flex', gap: '10px', marginTop: '8px', flexWrap: 'wrap' }}>
                        {SORT_OPTIONS.map(opt => (
                          <span
                            key={opt.key}
                            style={{
                              fontSize: '12px',
                              fontWeight: 700,
                              color: sort === opt.key ? scoreColor(sub[opt.key], opt.key) : '#52525b',
                            }}
                          >
                            {opt.label} {sub[opt.key]}
                          </span>
                        ))}
                        {award && (
                          <span style={{ fontSize: '12px', fontWeight: 700, color: award.color }}>
                            {award.emoji} {award.label}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Primary score badge */}
                  <div style={{
                    fontSize: '22px',
                    fontWeight: 900,
                    color: scoreColor(sub[sort], sort),
                    minWidth: '40px',
                    textAlign: 'right',
                    lineHeight: 1,
                    paddingTop: '1px',
                    flexShrink: 0,
                  }}>
                    {sub[sort]}
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    {/* All three scores */}
                    <div style={{ display: 'flex', gap: '20px', marginBottom: '16px', flexWrap: 'wrap' }}>
                      {SORT_OPTIONS.map(opt => (
                        <div key={opt.key}>
                          <div style={{ fontSize: '11px', color: '#52525b', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '2px' }}>{opt.label}</div>
                          <div style={{ fontSize: '24px', fontWeight: 900, color: scoreColor(sub[opt.key], opt.key) }}>{sub[opt.key]}</div>
                        </div>
                      ))}
                      {award && (
                        <div>
                          <div style={{ fontSize: '11px', color: '#52525b', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '2px' }}>Award</div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: award.color }}>{award.emoji} {award.label}</div>
                        </div>
                      )}
                    </div>

                    {/* Cast list */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {Object.entries(sub.selections).map(([role, actor]) => (
                        <div key={role} style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                          <span style={{ fontSize: '11px', color: '#52525b', flexShrink: 0, width: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {role}
                          </span>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0' }}>{actor}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {sorted.length > 0 && (
          <div style={{ marginTop: '32px', textAlign: 'center' }}>
            <Link
              href={`/challenge/${challengeId}`}
              style={{ fontSize: '14px', fontWeight: 700, color: '#fbbf24', textDecoration: 'none' }}
            >
              Take the challenge →
            </Link>
          </div>
        )}

      </div>
    </main>
  )
}
