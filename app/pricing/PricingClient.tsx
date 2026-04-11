'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function PricingClient({
  user,
  isMember,
}: {
  user: { email?: string } | null
  isMember: boolean
}) {
  const [loading, setLoading] = useState<'member' | 'portal' | null>(null)

  async function handleUpgrade() {
    if (!user) {
      window.location.href = '/login?next=/pricing'
      return
    }
    setLoading('member')
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: 'member' }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else { alert(data.error ?? 'Something went wrong. Please try again.'); setLoading(null) }
    } catch {
      alert('Something went wrong. Please try again.')
      setLoading(null)
    }
  }

  async function handleManage() {
    setLoading('portal')
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else { alert(data.error ?? 'Something went wrong. Please try again.'); setLoading(null) }
    } catch {
      alert('Something went wrong. Please try again.')
      setLoading(null)
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: '#09090b', color: '#f8fafc', padding: '64px 28px', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>

        <Link href="/" style={{ fontSize: '14px', color: '#a1a1aa', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '48px' }}>
          ← Back
        </Link>

        <div style={{ marginBottom: '48px' }}>
          <div style={{ fontSize: '13px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#3b82f6', marginBottom: '12px', fontWeight: 700 }}>
            Membership
          </div>
          <h1 style={{ fontSize: '40px', fontWeight: 900, lineHeight: 1.1, margin: '0 0 16px' }}>
            Pick your tier.
          </h1>
          <p style={{ fontSize: '18px', color: '#a1a1aa', maxWidth: '500px', lineHeight: 1.6, margin: 0 }}>
            Free gets you in the room. A membership keeps the lights on.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '48px' }}>

          {/* Free */}
          <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '28px', background: '#111115' }}>
            <div style={{ fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#a1a1aa', fontWeight: 700, marginBottom: '8px' }}>Free</div>
            <div style={{ fontSize: '36px', fontWeight: 900, marginBottom: '4px' }}>$0</div>
            <div style={{ fontSize: '14px', color: '#71717a', marginBottom: '28px' }}>forever</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                'Recast any film or show',
                '3 cast submissions/day',
                'Vote on community casts',
                'Weekly challenges',
              ].map(f => (
                <li key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#a1a1aa' }}>
                  <span style={{ color: '#3b82f6', fontWeight: 700 }}>✓</span> {f}
                </li>
              ))}
            </ul>
            {!isMember && (
              <div style={{ fontSize: '14px', color: '#52525b', fontWeight: 600 }}>Your current plan</div>
            )}
          </div>

          {/* Member — $3 */}
          <div style={{ border: '1px solid rgba(59,130,246,0.4)', borderRadius: '16px', padding: '28px', background: 'rgba(59,130,246,0.04)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '16px', right: '16px', background: '#3b82f6', color: '#fff', fontSize: '12px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '4px 10px', borderRadius: '6px' }}>
              Most popular
            </div>
            <div style={{ fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#3b82f6', fontWeight: 700, marginBottom: '8px' }}>Member</div>
            <div style={{ fontSize: '36px', fontWeight: 900, marginBottom: '4px' }}>$3</div>
            <div style={{ fontSize: '14px', color: '#71717a', marginBottom: '28px' }}>per month</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                'Everything in Free',
                '20 cast submissions/day',
                'Save your casts',
                'Early access to new features',
                'Supports independent development',
              ].map(f => (
                <li key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#f1f5f9' }}>
                  <span style={{ color: '#3b82f6', fontWeight: 700 }}>✓</span> {f}
                </li>
              ))}
            </ul>
            {isMember ? (
              <button
                onClick={handleManage}
                disabled={loading !== null}
                style={{ width: '100%', background: 'transparent', border: '1px solid rgba(59,130,246,0.4)', color: '#60a5fa', borderRadius: '10px', padding: '13px', fontSize: '15px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
              >
                {loading === 'portal' ? 'Loading…' : 'Manage membership'}
              </button>
            ) : (
              <button
                onClick={handleUpgrade}
                disabled={loading !== null}
                style={{ width: '100%', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '10px', padding: '13px', fontSize: '15px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
              >
                {loading === 'member' ? 'Loading…' : user ? 'Join — $3/month' : 'Sign in to join'}
              </button>
            )}
          </div>

        </div>

        <p style={{ fontSize: '14px', color: '#52525b', textAlign: 'center' }}>
          Cancel any time. No commitments. Billed via Stripe.{' '}
          <a href="/contact" style={{ color: '#71717a', textDecoration: 'underline' }}>Billing questions?</a>
        </p>

      </div>
    </main>
  )
}
