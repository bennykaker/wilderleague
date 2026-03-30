'use client'

import { useState, useEffect } from 'react'

export default function MobileGate() {
  const [isMobile, setIsMobile] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  if (!isMobile || dismissed) return null

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#09090b',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 24px',
      textAlign: 'center',
      fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
    }}>
      <div style={{ fontSize: '48px', marginBottom: '24px' }}>🎬</div>
      <div style={{ fontSize: '22px', fontWeight: 900, color: '#f1f5f9', marginBottom: '12px', lineHeight: 1.2 }}>
        Wilder League needs a bigger screen
      </div>
      <div style={{ fontSize: '15px', color: '#71717a', lineHeight: 1.6, marginBottom: '32px', maxWidth: '320px' }}>
        Casting a full movie on a phone is a squeeze. The desktop experience is where Marlowe really shines.
      </div>
      <div style={{
        background: 'rgba(139,92,246,0.1)',
        border: '1px solid rgba(139,92,246,0.3)',
        borderRadius: '14px',
        padding: '16px 20px',
        marginBottom: '32px',
        maxWidth: '320px',
      }}>
        <div style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#a78bfa', fontWeight: 700, marginBottom: '6px' }}>
          App coming soon
        </div>
        <div style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.5 }}>
          A proper mobile app is in the works. Built for casting on the go.
        </div>
      </div>
      <button
        onClick={() => setDismissed(true)}
        style={{
          background: 'none',
          border: '1px solid #27272a',
          borderRadius: '10px',
          padding: '10px 20px',
          color: '#52525b',
          fontSize: '14px',
          cursor: 'pointer',
        }}
      >
        Try it anyway
      </button>
    </div>
  )
}
