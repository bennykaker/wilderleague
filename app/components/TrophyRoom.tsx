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
}

function CastCard({ cast, onDelete }: { cast: SavedCast; onDelete: (id: string) => void }) {
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const roles = Object.entries(cast.selections)
  const overBudget = cast.total_cost > cast.budget
  const date = new Date(cast.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

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

  return (
    <div style={{
      background: '#111115',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '16px',
      overflow: 'hidden',
    }}>
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
          <div style={{ fontSize: '17px', fontWeight: 800, color: '#f1f5f9', marginBottom: '6px', lineHeight: 1.2 }}>{cast.title_name}</div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: overBudget ? '#f87171' : '#4ade80', fontVariantNumeric: 'tabular-nums', marginBottom: '4px' }}>
            ${cast.total_cost}M / ${cast.budget}M {overBudget ? '· over budget' : '· within budget'}
          </div>
          <div style={{ fontSize: '12px', color: '#52525b' }}>{date}</div>
        </div>
      </Link>

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
      <div style={{ padding: '10px 18px 14px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href={`/${cast.title_slug}`} style={{ fontSize: '13px', color: '#3b82f6', fontWeight: 600, textDecoration: 'none' }}>
          Recast →
        </Link>
        {confirmDelete ? (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#a1a1aa' }}>Remove this cast?</span>
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', padding: '4px 10px', color: '#f87171', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
            >
              {deleting ? 'Removing…' : 'Yes, remove'}
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

  return (
    <main style={{ minHeight: '100vh', background: '#09090b', color: '#f8fafc', padding: '48px 28px', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#71717a', fontSize: '13px', fontWeight: 600, textDecoration: 'none', marginBottom: '32px' }}>
          ← All titles
        </a>

        <div style={{ marginBottom: '40px' }}>
          <div style={{ fontSize: '14px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#fbbf24', marginBottom: '10px', fontWeight: 700 }}>
            🏆 Trophy Room
          </div>
          <h1 style={{ fontSize: '36px', fontWeight: 900, lineHeight: 1.05, margin: '0 0 10px' }}>
            {username ? `${username}'s casts` : 'Your saved casts'}
          </h1>
          <p style={{ fontSize: '16px', color: '#52525b', margin: 0 }}>
            {casts.length === 0 ? 'No saved casts yet — cast a film and hit Save.' : `${casts.length} saved cast${casts.length !== 1 ? 's' : ''}`}
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
              <CastCard key={cast.id} cast={cast} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
