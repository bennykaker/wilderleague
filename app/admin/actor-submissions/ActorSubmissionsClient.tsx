'use client'

import { useState } from 'react'

type Submission = {
  id: string
  name: string
  sag_aftra: boolean | null
  credits: string | null
  imdb_url: string | null
  tmdb_url: string | null
  youtube_url: string | null
  notes: string | null
  submitter_email: string | null
  is_member: boolean
  status: string
  created_at: string
}

export default function ActorSubmissionsClient({ submissions }: { submissions: Submission[] }) {
  const [items, setItems] = useState(submissions)
  const [loading, setLoading] = useState<Record<string, 'adding' | 'dismissing'>>({})
  const [results, setResults] = useState<Record<string, { ok: boolean; message: string }>>({})

  async function handleAdd(sub: Submission) {
    setLoading(prev => ({ ...prev, [sub.id]: 'adding' }))
    try {
      const res = await fetch('/api/admin/seed-actor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId: sub.id, name: sub.name }),
      })
      const data = await res.json()
      setResults(prev => ({ ...prev, [sub.id]: { ok: data.ok, message: data.message ?? data.error ?? 'Done' } }))
      if (data.ok) {
        setItems(prev => prev.map(s => s.id === sub.id ? { ...s, status: 'added' } : s))
      }
    } catch {
      setResults(prev => ({ ...prev, [sub.id]: { ok: false, message: 'Request failed' } }))
    } finally {
      setLoading(prev => { const n = { ...prev }; delete n[sub.id]; return n })
    }
  }

  async function handleDismiss(id: string) {
    setLoading(prev => ({ ...prev, [id]: 'dismissing' }))
    try {
      await fetch('/api/admin/seed-actor', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId: id, status: 'dismissed' }),
      })
      setItems(prev => prev.map(s => s.id === id ? { ...s, status: 'dismissed' } : s))
    } finally {
      setLoading(prev => { const n = { ...prev }; delete n[id]; return n })
    }
  }

  const pending = items.filter(s => s.status === 'pending')
  const done = items.filter(s => s.status !== 'pending')

  return (
    <main style={{ minHeight: '100vh', background: '#09090b', color: '#f8fafc', padding: '48px 28px', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#3b82f6', fontWeight: 700 }}>Admin</div>
          <a href="/admin/users" style={{ fontSize: '13px', color: '#71717a', textDecoration: 'none', fontWeight: 600 }}>User Access →</a>
        </div>
        <h1 style={{ fontSize: '32px', fontWeight: 900, margin: '0 0 6px' }}>Actor Submissions</h1>
        <p style={{ fontSize: '14px', color: '#71717a', marginBottom: '40px' }}>
          {pending.length} pending · {done.length} processed
        </p>

        {pending.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#3f3f46', fontSize: '16px' }}>
            No pending submissions
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '48px' }}>
          {pending.map(sub => (
            <SubmissionCard
              key={sub.id}
              sub={sub}
              loadingState={loading[sub.id]}
              result={results[sub.id]}
              onAdd={() => handleAdd(sub)}
              onDismiss={() => handleDismiss(sub.id)}
            />
          ))}
        </div>

        {done.length > 0 && (
          <>
            <div style={{ fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#52525b', marginBottom: '16px', fontWeight: 600 }}>
              Processed
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {done.map(sub => (
                <div key={sub.id} style={{ padding: '14px 18px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', background: '#111115', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: sub.status === 'added' ? '#4ade80' : '#52525b' }}>{sub.name}</span>
                    {sub.submitter_email && <span style={{ fontSize: '12px', color: '#3f3f46', marginLeft: '10px' }}>{sub.submitter_email}</span>}
                  </div>
                  <span style={{ fontSize: '12px', color: sub.status === 'added' ? '#4ade80' : '#52525b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {sub.status}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  )
}

function SubmissionCard({ sub, loadingState, result, onAdd, onDismiss }: {
  sub: Submission
  loadingState?: 'adding' | 'dismissing'
  result?: { ok: boolean; message: string }
  onAdd: () => void
  onDismiss: () => void
}) {
  return (
    <div style={{
      border: `1px solid ${sub.is_member ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.08)'}`,
      borderRadius: '14px',
      padding: '20px 22px',
      background: sub.is_member ? 'rgba(139,92,246,0.04)' : '#111115',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '18px', fontWeight: 800, color: '#f1f5f9' }}>{sub.name}</span>
            {sub.is_member && <span style={{ fontSize: '11px', fontWeight: 700, color: '#a78bfa', background: 'rgba(139,92,246,0.15)', padding: '2px 8px', borderRadius: '6px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Member</span>}
            {sub.sag_aftra === true && <span style={{ fontSize: '11px', color: '#4ade80', fontWeight: 600 }}>SAG-AFTRA</span>}
          </div>
          {sub.submitter_email && <div style={{ fontSize: '12px', color: '#52525b' }}>{sub.submitter_email}</div>}
        </div>
        <div style={{ fontSize: '12px', color: '#3f3f46', flexShrink: 0 }}>
          {new Date(sub.created_at).toLocaleDateString()}
        </div>
      </div>

      {sub.credits && (
        <div style={{ fontSize: '13px', color: '#a1a1aa', marginBottom: '8px' }}>
          <span style={{ color: '#52525b' }}>Credits: </span>{sub.credits}
        </div>
      )}
      {sub.notes && (
        <div style={{ fontSize: '13px', color: '#a1a1aa', marginBottom: '8px', fontStyle: 'italic' }}>
          "{sub.notes}"
        </div>
      )}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
        {sub.imdb_url && <a href={sub.imdb_url} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: '#f59e0b', textDecoration: 'none' }}>IMDb ↗</a>}
        {sub.tmdb_url && <a href={sub.tmdb_url} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: '#3b82f6', textDecoration: 'none' }}>TMDB ↗</a>}
        {sub.youtube_url && <a href={sub.youtube_url} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: '#ef4444', textDecoration: 'none' }}>YouTube ↗</a>}
      </div>

      {result && (
        <div style={{ fontSize: '13px', color: result.ok ? '#4ade80' : '#f87171', marginBottom: '12px', fontWeight: 600 }}>
          {result.ok ? '✓' : '✗'} {result.message}
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={onAdd}
          disabled={!!loadingState}
          style={{
            background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.35)',
            borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 700,
            color: '#60a5fa', cursor: loadingState ? 'not-allowed' : 'pointer',
            opacity: loadingState ? 0.6 : 1,
          }}
        >
          {loadingState === 'adding' ? 'Adding…' : 'Add to DB'}
        </button>
        <button
          onClick={onDismiss}
          disabled={!!loadingState}
          style={{
            background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 600,
            color: '#52525b', cursor: loadingState ? 'not-allowed' : 'pointer',
            opacity: loadingState ? 0.6 : 1,
          }}
        >
          {loadingState === 'dismissing' ? 'Dismissing…' : 'Dismiss'}
        </button>
      </div>
    </div>
  )
}
