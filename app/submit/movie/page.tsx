'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function SubmitMoviePage() {
  const [form, setForm] = useState({
    title: '',
    year: '',
    type: 'movie' as 'movie' | 'tv',
    reason: '',
  })
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/submit-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.ok) setDone(true)
      else setError(data.error ?? 'Something went wrong.')
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%', background: '#1a1a22', border: '1px solid #3f3f46',
    borderRadius: '10px', padding: '11px 14px', color: '#f8fafc',
    fontSize: '15px', outline: 'none', boxSizing: 'border-box' as const,
  }
  const labelStyle = { fontSize: '13px', color: '#a1a1aa', fontWeight: 600, display: 'block', marginBottom: '6px' }

  return (
    <main style={{ minHeight: '100vh', background: '#09090b', color: '#f8fafc', padding: '64px 28px', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>
      <div style={{ maxWidth: '560px', margin: '0 auto' }}>

        <Link href="/" style={{ fontSize: '14px', color: '#a1a1aa', textDecoration: 'none', display: 'inline-block', marginBottom: '40px' }}>
          ← Back
        </Link>

        <div style={{ fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#fbbf24', marginBottom: '10px', fontWeight: 700 }}>
          Title submission
        </div>
        <h1 style={{ fontSize: '32px', fontWeight: 900, margin: '0 0 12px', lineHeight: 1.1 }}>
          A film we missed?
        </h1>
        <p style={{ fontSize: '16px', color: '#71717a', marginBottom: '36px', lineHeight: 1.6 }}>
          Is there a movie or show you want to recast that isn't in our library? Film nerds welcome. We review every submission and prioritise requests from Members and Directors.
        </p>

        {done ? (
          <div style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '14px', padding: '28px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '10px' }}>✓</div>
            <div style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px' }}>We've got it.</div>
            <div style={{ fontSize: '14px', color: '#71717a' }}>We'll review it and add it to the queue.</div>
            <button
              onClick={() => { setDone(false); setForm({ title: '', year: '', type: 'movie', reason: '' }) }}
              style={{ marginTop: '20px', background: 'none', border: '1px solid #3f3f46', borderRadius: '8px', padding: '8px 16px', color: '#a1a1aa', fontSize: '14px', cursor: 'pointer' }}
            >
              Submit another
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            <div>
              <label style={labelStyle}>Title <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                value={form.title}
                onChange={e => set('title', e.target.value)}
                placeholder="Film or show name"
                required
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Type</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {(['movie', 'tv'] as const).map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => set('type', v)}
                    style={{
                      padding: '8px 20px', borderRadius: '8px', fontSize: '14px', cursor: 'pointer',
                      background: form.type === v ? 'rgba(251,191,36,0.12)' : '#1a1a22',
                      border: `1px solid ${form.type === v ? 'rgba(251,191,36,0.4)' : '#3f3f46'}`,
                      color: form.type === v ? '#fbbf24' : '#a1a1aa',
                    }}
                  >
                    {v === 'movie' ? 'Movie' : 'TV series'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={labelStyle}>Year</label>
              <input
                value={form.year}
                onChange={e => set('year', e.target.value)}
                placeholder="e.g. 1994"
                maxLength={4}
                style={{ ...inputStyle, width: '120px' }}
              />
            </div>

            <div>
              <label style={labelStyle}>Why do you want to recast it?</label>
              <textarea
                value={form.reason}
                onChange={e => set('reason', e.target.value)}
                placeholder="The original cast was wrong, you have a vision, it's criminally underrated — whatever the reason"
                rows={4}
                style={{ ...inputStyle, resize: 'vertical' as const }}
              />
            </div>

            {error && (
              <div style={{ fontSize: '14px', color: '#f87171' }}>{error}</div>
            )}

            <button
              type="submit"
              disabled={loading || !form.title.trim()}
              style={{
                background: form.title.trim() ? 'rgba(251,191,36,0.15)' : '#1a1a22',
                color: form.title.trim() ? '#fbbf24' : '#52525b',
                border: `1px solid ${form.title.trim() ? 'rgba(251,191,36,0.4)' : '#27272a'}`,
                borderRadius: '10px', padding: '14px',
                fontSize: '15px', fontWeight: 700,
                cursor: loading || !form.title.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Submitting…' : 'Submit title'}
            </button>

          </form>
        )}
      </div>
    </main>
  )
}
