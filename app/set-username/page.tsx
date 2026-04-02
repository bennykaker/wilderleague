'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function SetUsernameForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/'

  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const isValid = /^[a-zA-Z0-9_]{3,20}$/.test(username)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/set-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      })
      const data = await res.json()
      if (data.ok) {
        router.push(next)
      } else {
        setError(data.error ?? 'Something went wrong.')
      }
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: '#09090b', color: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '28px', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>
      <div style={{ maxWidth: '400px', width: '100%' }}>
        <div style={{ fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#3b82f6', marginBottom: '10px', fontWeight: 700 }}>
          One more thing
        </div>
        <h1 style={{ fontSize: '32px', fontWeight: 900, margin: '0 0 12px', lineHeight: 1.1 }}>
          Pick a username
        </h1>
        <p style={{ fontSize: '15px', color: '#71717a', marginBottom: '32px', lineHeight: 1.6 }}>
          This is what shows up on the leaderboard. Letters, numbers, and underscores only. 3–20 characters.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#52525b', fontSize: '15px', pointerEvents: 'none' }}>@</span>
            <input
              value={username}
              onChange={e => { setUsername(e.target.value); setError('') }}
              placeholder="yourname"
              maxLength={20}
              autoFocus
              style={{
                width: '100%', background: '#18181b', border: `1px solid ${error ? '#ef4444' : isValid ? '#22c55e' : '#3f3f46'}`,
                borderRadius: '10px', padding: '12px 14px 12px 28px', color: '#f8fafc',
                fontSize: '15px', outline: 'none', boxSizing: 'border-box',
                transition: 'border-color 0.12s',
              }}
            />
          </div>

          {error && <div style={{ fontSize: '13px', color: '#f87171' }}>{error}</div>}

          {username && !isValid && (
            <div style={{ fontSize: '12px', color: '#71717a' }}>
              {username.length < 3 ? 'At least 3 characters' : username.length > 20 ? 'Max 20 characters' : 'Letters, numbers, and underscores only'}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !isValid}
            style={{
              background: isValid ? '#3b82f6' : '#18181b',
              color: isValid ? '#fff' : '#52525b',
              border: 'none', borderRadius: '10px', padding: '14px',
              fontSize: '15px', fontWeight: 700,
              cursor: loading || !isValid ? 'not-allowed' : 'pointer',
              transition: 'background 0.12s',
            }}
          >
            {loading ? 'Saving…' : 'Set username'}
          </button>
        </form>
      </div>
    </main>
  )
}

export default function SetUsernamePage() {
  return (
    <Suspense>
      <SetUsernameForm />
    </Suspense>
  )
}
