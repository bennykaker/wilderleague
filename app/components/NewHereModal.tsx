'use client'

import { useState } from 'react'

const STEPS = [
  { icon: '🎬', heading: 'Pick a movie', body: 'Choose from our library of films and TV shows. Every title has its original cast ready to be replaced.' },
  { icon: '🎭', heading: 'Ask Marlowe', body: 'Our AI casting director, Marlowe, will suggest actors for each role and argue his case. Push back, ask for cheaper options, go weird — he can handle it.' },
  { icon: '🖱️', heading: 'Drag and drop your cast', body: 'Drag actors into roles. Track your budget. Add a 2nd and 3rd choice. Ban anyone you never want to see again.' },
  { icon: '🎤', heading: 'Go to Production Meeting', body: 'Submit your cast and hear from an AI director, executive producer, and marketing VP. They have opinions. Strong ones.' },
  { icon: '🏆', heading: 'Weekly challenge', body: 'Each week there\'s a themed challenge — a restricted actor pool, a specific universe, a budget constraint. The best cast and the most cursed cast get voted on.' },
]

export default function NewHereModal() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          background: 'rgba(59,130,246,0.1)',
          border: '1px solid rgba(59,130,246,0.3)',
          borderRadius: '10px',
          padding: '9px 16px',
          color: '#60a5fa',
          fontSize: '13px',
          fontWeight: 700,
          cursor: 'pointer',
          letterSpacing: '0.01em',
        }}
      >
        New here? →
      </button>

      {open && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '24px' }}
          onClick={() => setOpen(false)}
        >
          <div
            style={{ background: '#111115', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '40px', width: '100%', maxWidth: '560px' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#3b82f6', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '8px' }}>Welcome to</div>
                <div style={{ fontSize: '28px', fontWeight: 900, lineHeight: 1.1 }}>Wilder League</div>
              </div>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#52525b', fontSize: '24px', cursor: 'pointer', lineHeight: 1, marginTop: '-4px' }}>×</button>
            </div>

            <p style={{ fontSize: '16px', color: '#94a3b8', lineHeight: 1.65, marginBottom: '32px' }}>
              Recast a movie with the actors you think would do it better. Here's how it works:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '36px' }}>
              {STEPS.map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#1c1c24', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                    {step.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#f1f5f9', marginBottom: '4px' }}>{step.heading}</div>
                    <div style={{ fontSize: '13px', color: '#71717a', lineHeight: 1.6 }}>{step.body}</div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setOpen(false)}
              style={{ width: '100%', background: '#f8fafc', border: 'none', borderRadius: '12px', padding: '14px', color: '#09090b', fontSize: '15px', fontWeight: 800, cursor: 'pointer', letterSpacing: '-0.01em' }}
            >
              Let's cast something →
            </button>
          </div>
        </div>
      )}
    </>
  )
}
