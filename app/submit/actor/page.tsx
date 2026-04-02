'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function SubmitActorPage() {
  const [form, setForm] = useState({
    name: '',
    sag_aftra: '' as '' | 'yes' | 'no',
    credits: '',
    imdb_url: '',
    tmdb_url: '',
    youtube_url: '',
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/submit-actor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          sag_aftra: form.sag_aftra === 'yes' ? true : form.sag_aftra === 'no' ? false : null,
        }),
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

        <Link href="/actors" style={{ fontSize: '14px', color: '#a1a1aa', textDecoration: 'none', display: 'inline-block', marginBottom: '40px' }}>
          ← Back to actors
        </Link>

        <div style={{ fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#3b82f6', marginBottom: '10px', fontWeight: 700 }}>
          Actor submission
        </div>
        <h1 style={{ fontSize: '32px', fontWeight: 900, margin: '0 0 12px', lineHeight: 1.1 }}>
          Someone we missed?
        </h1>
        <p style={{ fontSize: '16px', color: '#71717a', marginBottom: '36px', lineHeight: 1.6 }}>
          We did our best to get every working actor into the system. If we missed someone, let us know. We review every submission and will email you when they're added. Members and Directors get priority.
        </p>

        {done ? (
          <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '14px', padding: '28px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '10px' }}>✓</div>
            <div style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px' }}>Submission received.</div>
            <div style={{ fontSize: '14px', color: '#71717a' }}>We'll review it and email you when they're added.</div>
            <button
              onClick={() => { setDone(false); setForm({ name: '', sag_aftra: '', credits: '', imdb_url: '', tmdb_url: '', youtube_url: '', notes: '' }) }}
              style={{ marginTop: '20px', background: 'none', border: '1px solid #3f3f46', borderRadius: '8px', padding: '8px 16px', color: '#a1a1aa', fontSize: '14px', cursor: 'pointer' }}
            >
              Submit another
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            <div>
              <label style={labelStyle}>Actor name <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="Full name"
                required
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>SAG-AFTRA member?</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {(['yes', 'no', ''] as const).map(v => (
                  <button
                    key={v || 'unknown'}
                    type="button"
                    onClick={() => set('sag_aftra', v)}
                    style={{
                      padding: '8px 16px', borderRadius: '8px', fontSize: '14px', cursor: 'pointer',
                      background: form.sag_aftra === v ? 'rgba(59,130,246,0.15)' : '#1a1a22',
                      border: `1px solid ${form.sag_aftra === v ? 'rgba(59,130,246,0.5)' : '#3f3f46'}`,
                      color: form.sag_aftra === v ? '#60a5fa' : '#a1a1aa',
                    }}
                  >
                    {v === 'yes' ? 'Yes' : v === 'no' ? 'No' : 'Not sure'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={labelStyle}>Notable credits</label>
              <textarea
                value={form.credits}
                onChange={e => set('credits', e.target.value)}
                placeholder="Films, shows, or roles they're known for"
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' as const }}
              />
            </div>

            <div>
              <label style={labelStyle}>IMDb page</label>
              <input
                value={form.imdb_url}
                onChange={e => set('imdb_url', e.target.value)}
                placeholder="https://www.imdb.com/name/..."
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>TMDB page</label>
              <input
                value={form.tmdb_url}
                onChange={e => set('tmdb_url', e.target.value)}
                placeholder="https://www.themoviedb.org/person/..."
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>YouTube / reel link</label>
              <input
                value={form.youtube_url}
                onChange={e => set('youtube_url', e.target.value)}
                placeholder="https://youtube.com/..."
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Anything else we should know?</label>
              <textarea
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="Why they'd be great to have in the system, or anything else"
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' as const }}
              />
            </div>

            {error && (
              <div style={{ fontSize: '14px', color: '#f87171' }}>{error}</div>
            )}

            <button
              type="submit"
              disabled={loading || !form.name.trim()}
              style={{
                background: form.name.trim() ? '#3b82f6' : '#1a1a22',
                color: form.name.trim() ? '#fff' : '#52525b',
                border: 'none', borderRadius: '10px', padding: '14px',
                fontSize: '15px', fontWeight: 700,
                cursor: loading || !form.name.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Submitting…' : 'Submit actor'}
            </button>

          </form>
        )}
      </div>
    </main>
  )
}
