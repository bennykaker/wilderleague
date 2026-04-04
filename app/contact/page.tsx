'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/contact', {
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

  const ready = form.name.trim() && form.email.trim() && form.message.trim()

  return (
    <main style={{ minHeight: '100vh', background: '#09090b', color: '#f8fafc', padding: '64px 28px', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>
      <div style={{ maxWidth: '560px', margin: '0 auto' }}>

        <Link href="/" style={{ fontSize: '14px', color: '#a1a1aa', textDecoration: 'none', display: 'inline-block', marginBottom: '40px' }}>
          ← Back
        </Link>

        <div style={{ fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#a78bfa', marginBottom: '10px', fontWeight: 700 }}>
          Contact
        </div>
        <h1 style={{ fontSize: '32px', fontWeight: 900, margin: '0 0 12px', lineHeight: 1.1 }}>
          Get in touch
        </h1>
        <p style={{ fontSize: '16px', color: '#71717a', marginBottom: '40px', lineHeight: 1.6 }}>
          Billing questions, bug reports, feedback — we read everything.
        </p>

        {done ? (
          <div style={{ background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.25)', borderRadius: '14px', padding: '32px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>✓</div>
            <div style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>Message sent.</div>
            <div style={{ fontSize: '14px', color: '#71717a' }}>We'll get back to you at {form.email}.</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            <div>
              <label style={labelStyle}>Name <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="Your name"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Email <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="So we can reply"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Subject</label>
              <input
                value={form.subject}
                onChange={e => set('subject', e.target.value)}
                placeholder="e.g. Billing question, bug report, feedback"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Message <span style={{ color: '#ef4444' }}>*</span></label>
              <textarea
                value={form.message}
                onChange={e => set('message', e.target.value)}
                placeholder="What's on your mind?"
                rows={5}
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
              disabled={loading || !ready}
              style={{
                background: ready ? 'rgba(139,92,246,0.15)' : '#1a1a22',
                color: ready ? '#a78bfa' : '#52525b',
                border: `1px solid ${ready ? 'rgba(139,92,246,0.4)' : '#27272a'}`,
                borderRadius: '10px', padding: '14px',
                fontSize: '15px', fontWeight: 700,
                cursor: loading || !ready ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', transition: 'all 0.15s',
              }}
            >
              {loading ? 'Sending…' : 'Send message'}
            </button>

          </form>
        )}
      </div>
    </main>
  )
}
