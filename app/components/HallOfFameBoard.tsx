'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type HofEntry = {
  id: string
  title_slug: string
  title_name: string
  poster_path: string | null
  selections: Record<string, string>
  total_cost: number
  budget: number
  cast_name: string | null
  ai_score: number
  quality_score: number
  hear_me_out_score: number
  ai_summary: string | null
  created_at: string
  username: string | null
}

function ScoreChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
      <div style={{ fontSize: '18px', fontWeight: 900, color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontSize: '10px', color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
    </div>
  )
}

function HofCard({ entry, rank, category }: { entry: HofEntry; rank: number; category: 'best_cast' | 'hear_me_out' }) {
  const [expanded, setExpanded] = useState(false)
  const roles = Object.entries(entry.selections)
  const overBudget = entry.total_cost > entry.budget
  const mainScore = category === 'hear_me_out' ? entry.hear_me_out_score : entry.ai_score
  const date = new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  const medalColors: Record<number, string> = { 1: '#fbbf24', 2: '#94a3b8', 3: '#b45309' }
  const medal = rank <= 3 ? medalColors[rank] : null

  return (
    <div style={{
      background: '#111115',
      border: `1px solid ${medal ? `${medal}33` : 'rgba(255,255,255,0.07)'}`,
      borderRadius: '16px',
      overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', gap: '14px', padding: '16px', alignItems: 'flex-start' }}>
        {/* Rank */}
        <div style={{
          width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
          background: medal ? `${medal}22` : 'rgba(255,255,255,0.04)',
          border: `1px solid ${medal ?? 'rgba(255,255,255,0.08)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '13px', fontWeight: 800, color: medal ?? '#52525b',
        }}>
          {rank}
        </div>

        {/* Poster */}
        <Link href={`/${entry.title_slug}`} style={{ textDecoration: 'none', flexShrink: 0 }}>
          {entry.poster_path ? (
            <img src={entry.poster_path} alt={entry.title_name} style={{ width: '44px', height: '66px', objectFit: 'cover', borderRadius: '6px', display: 'block' }} />
          ) : (
            <div style={{ width: '44px', height: '66px', borderRadius: '6px', background: '#1c1c1e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3f3f46', fontSize: '16px' }}>🎬</div>
          )}
        </Link>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <Link href={`/${entry.title_slug}`} style={{ textDecoration: 'none' }}>
            <div style={{ fontSize: '13px', color: '#71717a', marginBottom: '2px' }}>{entry.title_name}</div>
          </Link>
          {entry.cast_name ? (
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#f1f5f9', marginBottom: '4px', fontStyle: 'italic' }}>"{entry.cast_name}"</div>
          ) : (
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#f1f5f9', marginBottom: '4px' }}>
              {entry.username ? `${entry.username}'s cast` : 'Anonymous cast'}
            </div>
          )}
          {entry.username && entry.cast_name && (
            <div style={{ fontSize: '12px', color: '#52525b', marginBottom: '4px' }}>by {entry.username}</div>
          )}
          <div style={{ fontSize: '12px', color: overBudget ? '#f87171' : '#4ade80', fontVariantNumeric: 'tabular-nums' }}>
            ${entry.total_cost}M / ${entry.budget}M
          </div>
        </div>

        {/* Scores */}
        <div style={{ display: 'flex', gap: '14px', flexShrink: 0, alignItems: 'center' }}>
          <ScoreChip
            label={category === 'hear_me_out' ? 'Hear Me Out' : 'Greenlight'}
            value={mainScore}
            color={mainScore >= 70 ? (category === 'hear_me_out' ? '#a855f7' : '#22c55e') : mainScore >= 40 ? '#f59e0b' : '#ef4444'}
          />
        </div>
      </div>

      {/* Marlowe verdict */}
      {entry.ai_summary && (
        <div style={{ padding: '0 16px 10px', fontSize: '12px', color: '#71717a', fontStyle: 'italic', lineHeight: 1.4 }}>
          "{entry.ai_summary}"
        </div>
      )}

      {/* Expand / cast list */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '8px 16px' }}>
        <button
          onClick={() => setExpanded(!expanded)}
          style={{ background: 'none', border: 'none', color: '#52525b', fontSize: '12px', cursor: 'pointer', padding: 0 }}
        >
          {expanded ? '▲ Hide cast' : `▼ See cast (${roles.length} roles)`}
        </button>
        {expanded && (
          <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {roles.map(([role, actor]) => (
              <div key={role} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                <div style={{ fontSize: '12px', color: '#52525b', flexShrink: 0 }}>{role}</div>
                <div style={{ height: '1px', flex: 1, background: 'rgba(255,255,255,0.05)' }} />
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0', flexShrink: 0 }}>{actor}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function HallOfFameBoard({
  titleSlug,
  titleName,
  posterPath,
}: {
  titleSlug: string | null
  titleName: string | null
  posterPath: string | null
}) {
  const [category, setCategory] = useState<'best_cast' | 'hear_me_out'>('best_cast')
  const [entries, setEntries] = useState<HofEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load(cat: 'best_cast' | 'hear_me_out') {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ category: cat, limit: '20' })
      if (titleSlug) params.set('title_slug', titleSlug)
      const res = await fetch(`/api/hall-of-fame?${params}`)
      const data = await res.json()
      if (data.error) setError(data.error)
      else setEntries(data.entries ?? [])
    } catch {
      setError('Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(category) }, [category])

  const isGlobal = !titleSlug

  return (
    <main style={{ minHeight: '100vh', background: '#09090b', color: '#f8fafc', padding: '48px 28px', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <a href={titleSlug ? `/${titleSlug}` : '/'} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#71717a', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>
            ← {titleSlug ? titleName : 'All titles'}
          </a>
          {titleSlug && (
            <Link href="/hall-of-fame" style={{ fontSize: '13px', color: '#71717a', textDecoration: 'none' }}>
              Global Hall of Fame →
            </Link>
          )}
        </div>

        {/* Header */}
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', marginBottom: '36px' }}>
          {posterPath && (
            <img src={posterPath} alt={titleName ?? ''} style={{ width: '72px', height: '108px', objectFit: 'cover', borderRadius: '10px', flexShrink: 0 }} />
          )}
          <div>
            <div style={{ fontSize: '13px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#fbbf24', marginBottom: '8px', fontWeight: 700 }}>
              Hall of Fame
            </div>
            <h1 style={{ fontSize: '32px', fontWeight: 900, lineHeight: 1.05, margin: '0 0 8px' }}>
              {isGlobal ? 'All-Time Best Casts' : `${titleName}`}
            </h1>
            <p style={{ fontSize: '15px', color: '#52525b', margin: 0 }}>
              {isGlobal ? 'The highest-rated recast submissions across all titles.' : 'The highest-rated recast submissions for this title.'}
            </p>
          </div>
        </div>

        {/* Category tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '28px' }}>
          {[
            { key: 'best_cast', label: 'Best Cast', desc: 'Highest greenlight score' },
            { key: 'hear_me_out', label: 'Hear Me Out', desc: 'Most creative' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setCategory(tab.key as 'best_cast' | 'hear_me_out')}
              style={{
                background: category === tab.key ? 'rgba(255,255,255,0.08)' : 'transparent',
                border: `1px solid ${category === tab.key ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.07)'}`,
                borderRadius: '10px', padding: '10px 18px', cursor: 'pointer', textAlign: 'left',
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: 700, color: category === tab.key ? '#f1f5f9' : '#71717a' }}>{tab.label}</div>
              <div style={{ fontSize: '11px', color: '#52525b', marginTop: '2px' }}>{tab.desc}</div>
            </button>
          ))}
        </div>

        {/* Entries */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#52525b', fontSize: '15px' }}>Loading…</div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#f87171', fontSize: '15px' }}>{error}</div>
        ) : entries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#3f3f46' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>🏆</div>
            <div style={{ fontSize: '16px', marginBottom: '8px' }}>No entries yet</div>
            <div style={{ fontSize: '14px', color: '#27272a', marginBottom: '24px' }}>
              Cast a film, score it, then submit to the Hall of Fame from your Trophy Room.
            </div>
            <Link href="/" style={{ fontSize: '14px', color: '#3b82f6', fontWeight: 700, textDecoration: 'none' }}>
              Browse titles →
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {entries.map((entry, i) => (
              <HofCard key={entry.id} entry={entry} rank={i + 1} category={category} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
