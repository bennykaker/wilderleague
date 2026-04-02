'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function HuggedPage() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setState('loading')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      setState(data.ok ? 'done' : 'error')
    } catch {
      setState('error')
    }
  }

  return (
    <main style={{
      minHeight: '100vh', background: '#09090b', color: '#f8fafc',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '28px', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
    }}>
      <div style={{ maxWidth: '480px', width: '100%', textAlign: 'center' }}>

        <div style={{ fontSize: '56px', marginBottom: '24px' }}>🎬</div>

        <div style={{ fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#fbbf24', marginBottom: '12px', fontWeight: 700 }}>
          Wilderleague
        </div>

        <h1 style={{ fontSize: '36px', fontWeight: 900, margin: '0 0 16px', lineHeight: 1.1 }}>
          We got popular fast.
        </h1>

        <p style={{ fontSize: '17px', color: '#71717a', lineHeight: 1.7, marginBottom: '36px' }}>
          Wilder League is at capacity right now — too many casting directors, not enough chairs.
          We're letting the crowd thin out before we open the doors again.
          Leave your email and you'll be first to know when there's room.
        </p>

        {state === 'done' ? (
          <div style={{
            background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)',
            borderRadius: '14px', padding: '28px',
          }}>
            <div style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>You're on the list.</div>
            <div style={{ fontSize: '14px', color: '#71717a' }}>We'll email you when spots open up.</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px' }}>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              style={{
                flex: 1, background: '#18181b', border: '1px solid #3f3f46',
                borderRadius: '10px', padding: '12px 14px', color: '#f8fafc',
                fontSize: '15px', outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={state === 'loading' || !email.trim()}
              style={{
                background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.4)',
                borderRadius: '10px', padding: '12px 20px', color: '#fbbf24',
                fontSize: '15px', fontWeight: 700,
                cursor: state === 'loading' ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {state === 'loading' ? 'Adding…' : 'Notify me'}
            </button>
          </form>
        )}

        {state === 'error' && (
          <div style={{ marginTop: '12px', fontSize: '13px', color: '#f87171' }}>
            Something went wrong. Try again or check back later.
          </div>
        )}

        <div style={{ marginTop: '40px', fontSize: '13px', color: '#3f3f46' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: '#52525b', textDecoration: 'underline' }}>Sign in</Link>
        </div>

      </div>
    </main>
  )
}
