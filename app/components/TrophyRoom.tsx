'use client'

import { useState } from 'react'
import Link from 'next/link'

type SavedCast = {
  id: string
  title_slug: string
  title_name: string
  poster_path: string | null
  selections: Record<string, string>
  total_cost: number
  budget: number
  created_at: string
  cast_name: string | null
  is_public: boolean
  ai_score: number | null
  quality_score: number | null
  hear_me_out_score: number | null
  ai_summary: string | null
}

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ fontSize: '11px', color: '#71717a', width: '76px', flexShrink: 0 }}>{label}</div>
      <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: '2px' }} />
      </div>
      <div style={{ fontSize: '11px', fontWeight: 700, color, width: '24px', textAlign: 'right' }}>{value}</div>
    </div>
  )
}

function CastCard({ cast, onDelete, onUpdate }: {
  cast: SavedCast
  onDelete: (id: string) => void
  onUpdate: (id: string, updates: Partial<SavedCast>) => void
}) {
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(cast.cast_name ?? '')
  const [nameSaving, setNameSaving] = useState(false)
  const [publicToggling, setPublicToggling] = useState(false)

  const roles = Object.entries(cast.selections)
  const overBudget = cast.total_cost > cast.budget
  const date = new Date(cast.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const hasScore = cast.ai_score !== null

  async function handleDelete() {
    setDeleting(true)
    try {
      await fetch('/api/save-cast', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cast.id }),
      })
      onDelete(cast.id)
    } catch {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  async function handleSaveName() {
    setNameSaving(true)
    try {
      await fetch('/api/save-cast', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cast.id, cast_name: nameInput.trim() || null }),
      })
      onUpdate(cast.id, { cast_name: nameInput.trim() || null })
      setEditingName(false)
    } finally {
      setNameSaving(false)
    }
  }

  async function handleTogglePublic() {
    if (!hasScore) return
    setPublicToggling(true)
    try {
      const newPublic = !cast.is_public
      await fetch('/api/save-cast', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cast.id, is_public: newPublic }),
      })
      onUpdate(cast.id, { is_public: newPublic })
    } finally {
      setPublicToggling(false)
    }
  }

  return (
    <div style={{
      background: '#111115',
      border: `1px solid ${cast.is_public ? 'rgba(251,191,36,0.2)' : 'rgba(255,255,255,0.08)'}`,
      borderRadius: '16px',
      overflow: 'hidden',
    }}>
      {cast.is_public && (
        <div style={{ background: 'rgba(251,191,36,0.08)', borderBottom: '1px solid rgba(251,191,36,0.12)', padding: '6px 18px', fontSize: '11px', fontWeight: 700, color: '#fbbf24', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          In the Hall of Fame
        </div>
      )}

      {/* Poster + title */}
      <Link href={`/${cast.title_slug}`} style={{ textDecoration: 'none', display: 'flex', gap: '16px', padding: '18px 18px 0', alignItems: 'flex-start' }}>
        {cast.poster_path ? (
          <img
            src={cast.poster_path}
            alt={cast.title_name}
            style={{ width: '56px', height: '84px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }}
          />
        ) : (
          <div style={{ width: '56px', height: '84px', borderRadius: '8px', background: '#1c1c1e', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3f3f46', fontSize: '20px' }}>
            🎬
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '17px', fontWeight: 800, color: '#f1f5f9', marginBottom: '4px', lineHeight: 1.2 }}>{cast.title_name}</div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: overBudget ? '#f87171' : '#4ade80', fontVariantNumeric: 'tabular-nums', marginBottom: '4px' }}>
            ${cast.total_cost}M / ${cast.budget}M {overBudget ? '· over budget' : '· within budget'}
          </div>
          <div style={{ fontSize: '12px', color: '#52525b' }}>{date}</div>
        </div>
      </Link>

      {/* Cast name */}
      <div style={{ padding: '10px 18px 0' }}>
        {editingName ? (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              autoFocus
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false) }}
              placeholder="Name this cast…"
              style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', padding: '5px 10px', color: '#f1f5f9', fontSize: '13px', outline: 'none' }}
            />
            <button onClick={handleSaveName} disabled={nameSaving} style={{ background: '#3b82f6', border: 'none', borderRadius: '6px', padding: '5px 12px', color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
              {nameSaving ? '…' : 'Save'}
            </button>
            <button onClick={() => setEditingName(false)} style={{ background: 'none', border: 'none', color: '#52525b', fontSize: '12px', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => { setEditingName(true); setNameInput(cast.cast_name ?? '') }}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {cast.cast_name ? (
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0', fontStyle: 'italic' }}>"{cast.cast_name}"</span>
            ) : (
              <span style={{ fontSize: '12px', color: '#3f3f46' }}>+ Name this cast</span>
            )}
          </button>
        )}
      </div>

      {/* Scores */}
      {hasScore && (
        <div style={{ padding: '12px 18px 0', display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {cast.ai_summary && (
            <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', marginBottom: '6px', lineHeight: 1.4 }}>"{cast.ai_summary}"</div>
          )}
          <ScoreBar label="Greenlight" value={cast.ai_score!} color={cast.ai_score! >= 70 ? '#22c55e' : cast.ai_score! >= 40 ? '#f59e0b' : '#ef4444'} />
          <ScoreBar label="Quality" value={cast.quality_score!} color={cast.quality_score! >= 70 ? '#3b82f6' : cast.quality_score! >= 40 ? '#f59e0b' : '#ef4444'} />
          <ScoreBar label="Hear Me Out" value={cast.hear_me_out_score!} color={cast.hear_me_out_score! >= 70 ? '#a855f7' : cast.hear_me_out_score! >= 40 ? '#f97316' : '#6b7280'} />
        </div>
      )}

      {/* Cast list */}
      <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {roles.map(([role, actor]) => (
          <div key={role} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
            <div style={{ fontSize: '12px', color: '#52525b', flexShrink: 0 }}>{role}</div>
            <div style={{ height: '1px', flex: 1, background: 'rgba(255,255,255,0.05)' }} />
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0', flexShrink: 0 }}>{actor}</div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ padding: '10px 18px 14px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Link href={`/${cast.title_slug}`} style={{ fontSize: '13px', color: '#3b82f6', fontWeight: 600, textDecoration: 'none' }}>
            Recast →
          </Link>
          {!hasScore && (
            <Link href={`/${cast.title_slug}`} style={{ fontSize: '12px', color: '#71717a', textDecoration: 'none' }}>
              Score to enter Hall of Fame
            </Link>
          )}
          {hasScore && (
            <button
              onClick={handleTogglePublic}
              disabled={publicToggling}
              style={{
                background: cast.is_public ? 'rgba(251,191,36,0.12)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${cast.is_public ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: '6px', padding: '4px 10px',
                color: cast.is_public ? '#fbbf24' : '#71717a',
                fontSize: '12px', fontWeight: 600, cursor: 'pointer',
              }}
            >
              {publicToggling ? '…' : cast.is_public ? '★ In Hall of Fame' : '☆ Submit to Hall of Fame'}
            </button>
          )}
        </div>

        {confirmDelete ? (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#a1a1aa' }}>Remove?</span>
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', padding: '4px 10px', color: '#f87171', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
            >
              {deleting ? '…' : 'Yes'}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              style={{ background: 'none', border: 'none', color: '#52525b', fontSize: '12px', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            style={{ background: 'none', border: 'none', color: '#3f3f46', fontSize: '12px', cursor: 'pointer' }}
          >
            Remove
          </button>
        )}
      </div>
    </div>
  )
}

export default function TrophyRoom({ casts: initial, username }: { casts: SavedCast[]; username: string | null }) {
  const [casts, setCasts] = useState(initial)

  function handleDelete(id: string) {
    setCasts(prev => prev.filter(c => c.id !== id))
  }

  function handleUpdate(id: string, updates: Partial<SavedCast>) {
    setCasts(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c))
  }

  const scoredCount = casts.filter(c => c.ai_score !== null).length
  const publicCount = casts.filter(c => c.is_public).length

  return (
    <main style={{ minHeight: '100vh', background: '#09090b', color: '#f8fafc', padding: '48px 28px', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#71717a', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>
            ← All titles
          </a>
          <Link href="/hall-of-fame" style={{ fontSize: '13px', color: '#fbbf24', fontWeight: 600, textDecoration: 'none' }}>
            Hall of Fame →
          </Link>
        </div>

        <div style={{ marginBottom: '40px' }}>
          <div style={{ fontSize: '14px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#fbbf24', marginBottom: '10px', fontWeight: 700 }}>
            Trophy Room
          </div>
          <h1 style={{ fontSize: '36px', fontWeight: 900, lineHeight: 1.05, margin: '0 0 10px' }}>
            {username ? `${username}'s casts` : 'Your saved casts'}
          </h1>
          <p style={{ fontSize: '16px', color: '#52525b', margin: 0 }}>
            {casts.length === 0
              ? 'No saved casts yet — cast a film and hit Save.'
              : `${casts.length} saved cast${casts.length !== 1 ? 's' : ''}${scoredCount > 0 ? ` · ${scoredCount} scored` : ''}${publicCount > 0 ? ` · ${publicCount} in Hall of Fame` : ''}`
            }
          </p>
        </div>

        {casts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#3f3f46' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎬</div>
            <div style={{ fontSize: '16px', marginBottom: '20px' }}>Your trophy room is empty</div>
            <Link href="/" style={{ fontSize: '15px', color: '#3b82f6', fontWeight: 700, textDecoration: 'none' }}>Browse titles →</Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
            {casts.map(cast => (
              <CastCard key={cast.id} cast={cast} onDelete={handleDelete} onUpdate={handleUpdate} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
