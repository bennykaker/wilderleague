'use client'

import { useState } from 'react'
import Link from 'next/link'

type UserResult = {
  id: string
  email: string
  username: string | null
  is_member: boolean
}

export default function AdminUsersPage() {
  const [email, setEmail] = useState('')
  const [user, setUser] = useState<UserResult | null>(null)
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setSearching(true)
    setError(null)
    setUser(null)
    setSaved(false)
    try {
      const res = await fetch(`/api/admin/users?email=${encodeURIComponent(email.trim())}`)
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setUser(data)
    } catch {
      setError('Request failed')
    } finally {
      setSearching(false)
    }
  }

  async function handleToggle(field: 'is_member') {
    if (!user) return
    const newVal = !user[field]
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, [field]: newVal }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setUser(prev => prev ? { ...prev, [field]: newVal } : prev)
      setSaved(true)
    } catch {
      setError('Request failed')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    flex: 1, padding: '10px 14px', background: '#18181b', border: '1px solid #3f3f46',
    borderRadius: '8px', color: '#f1f5f9', fontSize: '15px', outline: 'none', fontFamily: 'inherit',
  }

  return (
    <main style={{ minHeight: '100vh', background: '#09090b', color: '#f8fafc', padding: '48px 28px', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>
      <div style={{ maxWidth: '520px', margin: '0 auto' }}>

        <Link href="/admin/actor-submissions" style={{ fontSize: '13px', color: '#71717a', textDecoration: 'none', display: 'inline-block', marginBottom: '32px' }}>
          ← Admin
        </Link>

        <h1 style={{ fontSize: '28px', fontWeight: 900, margin: '0 0 8px' }}>User Access</h1>
        <p style={{ fontSize: '15px', color: '#71717a', margin: '0 0 36px' }}>
          Look up a user by email and flip their member status.
        </p>

        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
          <input
            style={inputStyle}
            type="email"
            placeholder="user@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoFocus
          />
          <button
            type="submit"
            disabled={searching}
            style={{
              padding: '10px 20px', background: '#3b82f6', color: '#fff', border: 'none',
              borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: searching ? 'not-allowed' : 'pointer',
              opacity: searching ? 0.6 : 1, flexShrink: 0,
            }}
          >
            {searching ? 'Looking…' : 'Look up'}
          </button>
        </form>

        {error && (
          <div style={{ background: '#2a0f0f', border: '1px solid #7f1d1d', borderRadius: '10px', padding: '14px 16px', color: '#f87171', fontSize: '14px', marginBottom: '20px' }}>
            {error}
          </div>
        )}

        {user && (
          <div style={{ background: '#111115', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#f1f5f9' }}>{user.email}</div>
              {user.username && <div style={{ fontSize: '13px', color: '#71717a', marginTop: '2px' }}>@{user.username}</div>}
              <div style={{ fontSize: '11px', color: '#3f3f46', marginTop: '4px', fontFamily: 'monospace' }}>{user.id}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {([
                { field: 'is_member' as const, label: 'Member', desc: '$3/mo', color: '#22c55e' },
              ]).map(({ field, label, desc, color }) => (
                <div key={field} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: user[field] ? `${color}11` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${user[field] ? `${color}33` : 'rgba(255,255,255,0.06)'}`,
                  borderRadius: '10px', padding: '14px 16px',
                }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: user[field] ? color : '#a1a1aa' }}>{label}</div>
                    <div style={{ fontSize: '12px', color: '#52525b', marginTop: '2px' }}>{desc}</div>
                  </div>
                  <button
                    onClick={() => handleToggle(field)}
                    disabled={saving}
                    style={{
                      padding: '8px 16px',
                      background: user[field] ? 'rgba(239,68,68,0.12)' : `${color}22`,
                      border: `1px solid ${user[field] ? 'rgba(239,68,68,0.3)' : `${color}44`}`,
                      borderRadius: '8px', fontSize: '13px', fontWeight: 700,
                      color: user[field] ? '#f87171' : color,
                      cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
                    }}
                  >
                    {user[field] ? 'Revoke' : 'Grant'}
                  </button>
                </div>
              ))}
            </div>

            {saved && (
              <div style={{ fontSize: '13px', color: '#4ade80', textAlign: 'center' }}>Saved.</div>
            )}
          </div>
        )}

      </div>
    </main>
  )
}
