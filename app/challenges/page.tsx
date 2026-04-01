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
          <div style={{ fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#fbbf24', marginBottom: '10px', fontWeight: 700 }}>
            Challenges
          </div>
          <h1 style={{ fontSize: '36px', fontWeight: 900, margin: '0 0 8px', lineHeight: 1.05 }}>
            Weekly Challenges
          </h1>
          <p style={{ fontSize: '15px', color: '#71717a', margin: 0 }}>
            Constrained casting challenges. See how your cast stacks up.
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
                border: '1px solid rgba(251,191,36,0.25)',
                borderRadius: '16px',
                padding: '24px',
                background: 'rgba(251,191,36,0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <span style={{ fontSize: '22px' }}>{challenge.badge}</span>
                <span style={{ fontSize: '12px', color: '#fbbf24', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  {challenge.label}
                </span>
              </div>

              <div style={{ fontSize: '20px', fontWeight: 800, color: '#fef3c7', lineHeight: 1.3, marginBottom: '8px' }}>
                {challenge.headline}
              </div>

              <div style={{ fontSize: '14px', color: '#d97706', lineHeight: 1.6, marginBottom: '20px' }}>
                {challenge.description}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <Link
                  href={`/challenge/${challenge.id}`}
                  style={{
                    display: 'inline-block',
                    background: 'rgba(251,191,36,0.12)',
                    border: '1px solid rgba(251,191,36,0.35)',
                    borderRadius: '8px',
                    padding: '9px 16px',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#fbbf24',
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
