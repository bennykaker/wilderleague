import Link from 'next/link'
import { getChallenges } from '../data/challenges'

export default function ChallengesPage() {
  const challenges = getChallenges().filter(c => c.active)

  return (
    <main style={{ minHeight: '100vh', background: '#09090b', color: '#f8fafc', padding: '48px 28px', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>

        <div style={{ marginBottom: '40px' }}>
          <Link href="/" style={{ fontSize: '13px', color: '#71717a', fontWeight: 600, textDecoration: 'none', display: 'inline-block', marginBottom: '20px' }}>
            ← Home
          </Link>
          <div style={{ fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8b5cf6', marginBottom: '10px', fontWeight: 700 }}>
            Challenges
          </div>
          <h1 style={{ fontSize: '36px', fontWeight: 900, margin: '0 0 8px', lineHeight: 1.05 }}>
            Casting Challenges
          </h1>
          <p style={{ fontSize: '15px', color: '#71717a', margin: 0 }}>
            Constrained casting. One rule changes everything.
          </p>
        </div>

        {challenges.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#3f3f46' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎬</div>
            <div style={{ fontSize: '16px', fontWeight: 700 }}>No active challenges right now</div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {challenges.map(challenge => (
            <div
              key={challenge.id}
              style={{
                border: '1px solid rgba(139,92,246,0.2)',
                borderRadius: '16px',
                padding: '24px',
                background: 'rgba(139,92,246,0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <span style={{ fontSize: '22px' }}>{challenge.badge}</span>
                <span style={{ fontSize: '11px', color: '#7c3aed', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  {challenge.label}
                </span>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '22px', fontWeight: 900, color: '#ede9fe', lineHeight: 1.2 }}>
                  {challenge.teaser.split('\n')[0]}
                </div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#a78bfa', lineHeight: 1.2 }}>
                  {challenge.teaser.split('\n')[1]}
                </div>
              </div>

              <div style={{ fontSize: '14px', color: '#c4b5fd', lineHeight: 1.6, marginBottom: '20px', opacity: 0.75 }}>
                {challenge.description}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <Link
                  href={`/challenge/${challenge.id}`}
                  style={{
                    display: 'inline-block',
                    background: 'rgba(139,92,246,0.14)',
                    border: '1px solid rgba(139,92,246,0.35)',
                    borderRadius: '8px',
                    padding: '9px 16px',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#a78bfa',
                    textDecoration: 'none',
                  }}
                >
                  Take the challenge →
                </Link>
                <Link
                  href={`/challenge/${challenge.id}/top10`}
                  style={{
                    display: 'inline-block',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    padding: '9px 16px',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#a1a1aa',
                    textDecoration: 'none',
                  }}
                >
                  Top 10 →
                </Link>
              </div>
            </div>
          ))}
        </div>

      </div>
    </main>
  )
}
