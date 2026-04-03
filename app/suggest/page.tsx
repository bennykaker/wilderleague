'use client'

import { useState } from 'react'
import Link from 'next/link'

type MediaType = 'movie' | 'tv' | 'book'

export default function SuggestPage() {
  const [form, setForm] = useState({
    title: '',
    author: '',
    year: '',
    type: 'movie' as MediaType,
    link: '',
    characters: '',
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
    width: '100%', background: '#18181b', border: '1px solid #3f3f46',
    borderRadius: '10px', padding: '11px 14px', color: '#f8fafc',
    fontSize: '15px', outline: 'none', boxSizing: 'border-box' as const,
    fontFamily: 'inherit',
  }
  const labelStyle = {
    fontSize: '13px', color: '#a1a1aa', fontWeight: 600 as const,
    display: 'block' as const, marginBottom: '6px',
  }

  const typeOptions: { value: MediaType; label: string }[] = [
    { value: 'movie', label: 'Movie' },
    { value: 'tv', label: 'TV series' },
    { value: 'book', label: 'Book' },
  ]

  return (
    <main style={{ minHeight: '100vh', background: '#09090b', color: '#f8fafc', padding: '64px 28px', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>
      <div style={{ maxWidth: '580px', margin: '0 auto' }}>

        <Link href="/" style={{ fontSize: '14px', color: '#a1a1aa', textDecoration: 'none', display: 'inline-block', marginBottom: '40px' }}>
          ← Back
        </Link>

        <div style={{ fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#a78bfa', marginBottom: '10px', fontWeight: 700 }}>
          Suggest a title
        </div>
        <h1 style={{ fontSize: '32px', fontWeight: 900, margin: '0 0 12px', lineHeight: 1.1 }}>
          What should we add?
        </h1>
        <p style={{ fontSize: '16px', color: '#71717a', marginBottom: '40px', lineHeight: 1.6 }}>
          Got a movie, show, or book you'd love to recast? Tell us what it is and which characters matter most. We review every suggestion and prioritise requests from Members and Directors.
        </p>

        {done ? (
          <div style={{ background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.25)', borderRadius: '14px', padding: '32px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>✓</div>
            <div style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>We've got it.</div>
            <div style={{ fontSize: '14px', color: '#71717a', marginBottom: '24px' }}>We'll review it and add it to the queue.</div>
            <button
              onClick={() => { setDone(false); setForm({ title: '', author: '', year: '', type: 'movie', link: '', characters: '', reason: '' }) }}
              style={{ background: 'none', border: '1px solid #3f3f46', borderRadius: '8px', padding: '8px 20px', color: '#a1a1aa', fontSize: '14px', cursor: 'pointer' }}
            >
              Suggest another
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>

            {/* Type selector */}
            <div>
              <label style={labelStyle}>Type</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {typeOptions.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => set('type', opt.value)}
                    style={{
                      padding: '8px 20px', borderRadius: '8px', fontSize: '14px', cursor: 'pointer',
                      background: form.type === opt.value ? 'rgba(139,92,246,0.12)' : '#1a1a22',
                      border: `1px solid ${form.type === opt.value ? 'rgba(139,92,246,0.45)' : '#3f3f46'}`,
                      color: form.type === opt.value ? '#a78bfa' : '#a1a1aa',
                      fontFamily: 'inherit', transition: 'all 0.15s',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label style={labelStyle}>
                Title <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                value={form.title}
                onChange={e => set('title', e.target.value)}
                placeholder={form.type === 'movie' ? 'e.g. Mulholland Drive' : form.type === 'tv' ? 'e.g. Deadwood' : 'e.g. Fourth Wing'}
                required
                style={inputStyle}
              />
            </div>

            {/* Author — books only */}
            {form.type === 'book' && (
              <div>
                <label style={labelStyle}>Author</label>
                <input
                  value={form.author}
                  onChange={e => set('author', e.target.value)}
                  placeholder="e.g. Rebecca Yarros"
                  style={inputStyle}
                />
              </div>
            )}

            {/* Year — movies/TV */}
            {form.type !== 'book' && (
              <div>
                <label style={labelStyle}>Year</label>
                <input
                  value={form.year}
                  onChange={e => set('year', e.target.value)}
                  placeholder="e.g. 2001"
                  maxLength={4}
                  style={{ ...inputStyle, width: '120px' }}
                />
              </div>
            )}

            {/* Characters */}
            <div>
              <label style={labelStyle}>Characters to include</label>
              <textarea
                value={form.characters}
                onChange={e => set('characters', e.target.value)}
                placeholder={form.type === 'book'
                  ? 'e.g. Violet Sorrengail, Xaden Riorson, Dain Aetos — list the key roles'
                  : "e.g. the main cast you'd want to see recast"}
                rows={4}
                style={{ ...inputStyle, resize: 'vertical' as const }}
              />
            </div>

            {/* Link */}
            <div>
              <label style={labelStyle}>
                {form.type === 'book' ? 'Goodreads / publisher link' : 'IMDb or Wikipedia link'}
              </label>
              <input
                value={form.link}
                onChange={e => set('link', e.target.value)}
                placeholder={form.type === 'book' ? 'https://www.goodreads.com/book/…' : 'https://www.imdb.com/title/…'}
                type="url"
                style={inputStyle}
              />
            </div>

            {/* Reason */}
            <div>
              <label style={labelStyle}>Why should we add it?</label>
              <textarea
                value={form.reason}
                onChange={e => set('reason', e.target.value)}
                placeholder="The original casting was wrong, it's a cult classic that deserves better, you've been waiting your whole life — whatever the reason"
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' as const }}
              />
            </div>

            {error && (
              <div style={{ fontSize: '14px', color: '#f87171', background: '#2a0f0f', border: '1px solid #7f1d1d', borderRadius: '8px', padding: '10px 14px' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !form.title.trim()}
              style={{
                background: form.title.trim() ? 'rgba(139,92,246,0.15)' : '#1a1a22',
                color: form.title.trim() ? '#a78bfa' : '#52525b',
                border: `1px solid ${form.title.trim() ? 'rgba(139,92,246,0.4)' : '#27272a'}`,
                borderRadius: '10px', padding: '14px',
                fontSize: '15px', fontWeight: 700,
                cursor: loading || !form.title.trim() ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', transition: 'all 0.15s',
              }}
            >
              {loading ? 'Submitting…' : 'Submit suggestion'}
            </button>

          </form>
        )}
      </div>
    </main>
  )
}
