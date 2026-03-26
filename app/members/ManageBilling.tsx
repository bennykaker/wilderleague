'use client'

import { useState } from 'react'

export default function ManageBilling() {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    const res = await fetch('/api/stripe/portal', { method: 'POST' })
    const data = await res.json()
    if (data.url) window.location.href = data.url
    else { alert('Something went wrong.'); setLoading(false) }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      style={{ background: 'transparent', color: '#a1a1aa', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '13px 24px', fontSize: '14px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
    >
      {loading ? 'Loading…' : 'Manage billing'}
    </button>
  )
}
