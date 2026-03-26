'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type Submission = {
  id: string
  selections: Record<string, string>
  ai_summary: string
  is_cursed: boolean
  curse_reason: string
  score: number
  like_count: number
}

type VoteValue = 'like' | 'meh' | 'dislike'

export default function CastsPage({ slug, title }: { slug: string; title: string }) {
  const [best, setBest] = useState<Submission[]>([])
  const [cursed, setCursed] = useState<Submission[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [voted, setVoted] = useState<Record<string, VoteValue>>({})

  useEffect(() => {
    fetch(`/api/casts/${slug}`)
      .then(r => r.json())
      .then(data => {
        setBest(data.best ?? [])
        setCursed(data.cursed ?? [])
        setTotal(data.total ?? 0)
      })
      .finally(() => setLoading(false))
  }, [slug])

  async function vote(submissionId: string, value: VoteValue) {
    setVoted(prev => ({ ...prev, [submissionId]: value }))
    await fetch('/api/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submission_id: submissionId, value }),
    })
  }

  function CastCard({ sub, accent }: { sub: Submission; accent: string }) {
    const isExpanded = expanded === sub.id
    return (
      <div
        onClick={() => setExpanded(isExpanded ? null : sub.id)}
        style={{
          border: `1px solid ${isExpanded ? accent : 'rgba(255,255,255,0.08)'}`,
          borderRadius: '14px',
          padding: isExpanded ? '20px' : '16px 18px',
          background: isExpanded ? 'rgba(255,255,255,0.03)' : '#111115',
          cursor: 'pointer',
          transition: 'border-color 0.15s, padding 0.15s',
        }}
      >
        <div style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9', lineHeight: 1.4, marginBottom: isExpanded ? '16px' : '0' }}>
          "{sub.ai_summary}"
        </div>

        {isExpanded && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
              {Object.entries(sub.selections).map(([role, actor]) => (
                <div key={role} style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#52525b', flexShrink: 0, width: '140px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{role}</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0' }}>{actor}</span>
                </div>
              ))}
            </div>

            {sub.is_cursed && sub.curse_reason && (
              <div style={{ fontSize: '12px', color: '#fb923c', background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.15)', borderRadius: '8px', padding: '10px 12px', marginBottom: '16px', lineHeight: 1.5 }}>
                {sub.curse_reason}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px' }} onClick={e => e.stopPropagation()}>
              {(['like', 'meh', 'dislike'] as VoteValue[]).map(v => {
                const labels = { like: '👍 Inspired', meh: '🤷 Interesting', dislike: '👎 No' }
                const isVoted = voted[sub.id] === v
                return (
                  <button
                    key={v}
                    onClick={() => vote(sub.id, v)}
                    style={{
                      fontSize: '12px', fontWeight: 600,
                      padding: '7px 12px', borderRadius: '8px', cursor: 'pointer',
                      background: isVoted ? accent : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${isVoted ? accent : 'rgba(255,255,255,0.1)'}`,
                      color: isVoted ? '#09090b' : '#a1a1aa',
                      transition: 'all 0.12s',
                    }}
                  >
                    {labels[v]}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: '#09090b', color: '#f8fafc', padding: '48px 28px', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>

        <div style={{ marginBottom: '40px' }}>
          <Link href={`/${slug}`} style={{ fontSize: '13px', color: '#71717a', fontWeight: 600, textDecoration: 'none', display: 'inline-block', marginBottom: '16px' }}>
            ← Back to casting board
          </Link>
          <div style={{ fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#3b82f6', marginBottom: '10px' }}>Community casts</div>
          <h1 style={{ fontSize: '36px', fontWeight: 900, margin: '0 0 8px', lineHeight: 1.05 }}>{title}</h1>
          {!loading && <p style={{ fontSize: '14px', color: '#52525b', margin: 0 }}>{total} cast{total !== 1 ? 's' : ''} submitted · click to expand · vote for your favourites</p>}
        </div>

        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[1,2,3].map(i => <div key={i} style={{ height: '56px', background: '#111115', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' }} />)}
          </div>
        )}

        {!loading && total === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#3f3f46' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎬</div>
            <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>No casts yet</div>
            <div style={{ fontSize: '14px', marginBottom: '24px' }}>Be the first to submit a cast for {title}</div>
            <Link href={`/${slug}`} style={{ fontSize: '13px', fontWeight: 700, color: '#3b82f6', textDecoration: 'none' }}>Go cast it →</Link>
          </div>
        )}

        {!loading && best.length > 0 && (
          <div style={{ marginBottom: '48px' }}>
            <div style={{ fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#52525b', marginBottom: '16px', fontWeight: 700 }}>
              Top casts
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {best.map(sub => <CastCard key={sub.id} sub={sub} accent="#3b82f6" />)}
            </div>
          </div>
        )}

        {!loading && cursed.length > 0 && (
          <div>
            <div style={{ fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#f97316', marginBottom: '8px', fontWeight: 700 }}>
              🔮 Cursed casts
            </div>
            <div style={{ fontSize: '13px', color: '#78716c', marginBottom: '16px', lineHeight: 1.5 }}>
              A cursed cast shouldn't work. The chemistry is wrong, the choices are baffling, the director is probably crying. And yet… there's something there.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {cursed.map(sub => <CastCard key={sub.id} sub={sub} accent="#f97316" />)}
            </div>
          </div>
        )}

      </div>
    </main>
  )
}
