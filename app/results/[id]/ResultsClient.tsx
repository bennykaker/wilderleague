'use client'

import { useState, useEffect } from 'react'

type CastItem = {
  role: string
  tier: string
  actor: string
  cost: number
}

type Props = {
  submissionId: string
  movieTitle: string
  movieSlug: string
  summary: string
  greenLight: number
  quality: number
  hearMeOut: number
  award: string | null
  cast: CastItem[]
  budget: number
  spent: number
}

const TIER_LABEL: Record<string, string> = {
  first_lead: '1st Lead',
  second_lead: '2nd Lead',
  third_lead: '3rd Lead',
  supporting: 'Supporting',
}

const TIER_COLOR: Record<string, string> = {
  first_lead: '#fbbf24',
  second_lead: '#94a3b8',
  third_lead: '#b48250',
  supporting: '#52525b',
}

const AWARD_META: Record<string, { emoji: string; label: string; color: string }> = {
  best_in_show:        { emoji: '🏆', label: 'Best in Show',             color: '#fbbf24' },
  makable_unwatchable: { emoji: '💰', label: 'Makable but Unwatchable',  color: '#f87171' },
  genius_unmakable:    { emoji: '🧠', label: 'Genius but Unmakable',     color: '#a78bfa' },
  hear_me_out:         { emoji: '🔮', label: 'Hear Me Out',              color: '#fb923c' },
}

function scoreColor(value: number, type: 'green' | 'quality' | 'hmu') {
  if (type === 'hmu') {
    if (value >= 70) return '#a855f7'
    if (value >= 40) return '#f97316'
    return '#6b7280'
  }
  if (type === 'quality') {
    if (value >= 70) return '#3b82f6'
    if (value >= 40) return '#f59e0b'
    return '#ef4444'
  }
  // green light
  if (value >= 70) return '#22c55e'
  if (value >= 40) return '#f59e0b'
  return '#ef4444'
}

function scoreSubtitle(value: number, type: 'green' | 'quality' | 'hmu') {
  if (type === 'green') {
    if (value >= 85) return 'Studio will write the cheque today.'
    if (value >= 70) return 'Solid. A producer could sell this.'
    if (value >= 50) return 'Possible, with the right pitch.'
    if (value >= 30) return 'Uphill battle to get this made.'
    return 'This film will never exist.'
  }
  if (type === 'quality') {
    if (value >= 85) return 'Could be genuinely great.'
    if (value >= 70) return 'Strong. Worth the price of admission.'
    if (value >= 50) return 'Fine. Nothing special.'
    if (value >= 30) return 'Rough. Some serious miscasting.'
    return 'A disaster in the making.'
  }
  // hmu
  if (value >= 85) return 'Completely unhinged. Respect.'
  if (value >= 70) return 'Bold swings across the board.'
  if (value >= 50) return 'A few eyebrow-raisers in there.'
  if (value >= 30) return 'Mostly by the book.'
  return 'Safe. Very, very safe.'
}

function useCountUp(target: number, duration: number, active: boolean) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!active) { setValue(0); return }
    const startTime = performance.now()
    let raf: number
    function tick(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * target))
      if (progress < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active, target, duration])
  return value
}

function ScoreCard({ label, value, type, phase, myPhase, emoji }: {
  label: string
  value: number
  type: 'green' | 'quality' | 'hmu'
  phase: number
  myPhase: number
  emoji: string
}) {
  const active = phase >= myPhase
  const count = useCountUp(value, 1200, active)
  const color = scoreColor(value, type)

  return (
    <div style={{
      opacity: active ? 1 : 0,
      transform: active ? 'translateY(0) scale(1)' : 'translateY(-40px) scale(1.2)',
      transition: 'opacity 0.4s cubic-bezier(0.34,1.56,0.64,1), transform 0.4s cubic-bezier(0.34,1.56,0.64,1)',
      background: '#111115',
      border: `1px solid ${active ? color + '40' : 'transparent'}`,
      borderRadius: '20px',
      padding: '28px 32px',
      display: 'flex',
      alignItems: 'center',
      gap: '24px',
    }}>
      <div style={{ fontSize: '40px', flexShrink: 0 }}>{emoji}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#52525b', fontWeight: 700, marginBottom: '4px' }}>{label}</div>
        <div style={{ fontSize: '13px', color: '#71717a', lineHeight: 1.4 }}>{active ? scoreSubtitle(value, type) : ''}</div>
      </div>
      <div style={{
        fontSize: '64px',
        fontWeight: 900,
        color: active ? color : '#27272a',
        fontVariantNumeric: 'tabular-nums',
        lineHeight: 1,
        minWidth: '90px',
        textAlign: 'right',
        transition: 'color 0.5s',
        fontFamily: 'ui-monospace, monospace',
      }}>
        {active ? count : '—'}
      </div>
    </div>
  )
}

export default function ResultsClient({
  movieTitle, movieSlug, summary, greenLight, quality, hearMeOut, award, cast, budget, spent,
}: Props) {
  const [phase, setPhase] = useState(0)
  const overBudget = spent > budget

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 800),
      setTimeout(() => setPhase(2), 2800),
      setTimeout(() => setPhase(3), 4800),
      setTimeout(() => setPhase(4), 6600),
    ]
    return () => timers.forEach(clearTimeout)
  }, [])

  const awardMeta = award ? AWARD_META[award] : null

  return (
    <div style={{
      minHeight: '100vh',
      background: '#09090b',
      color: '#f8fafc',
      fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
      display: 'flex',
    }}>
      {/* inject slam animation */}
      <style>{`
        @keyframes clapperIn {
          0%   { transform: scale(0.5) rotate(-10deg); opacity: 0; }
          60%  { transform: scale(1.1) rotate(2deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes awardDrop {
          0%   { transform: translateY(-30px); opacity: 0; }
          60%  { transform: translateY(4px); opacity: 1; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes fadeUp {
          from { transform: translateY(16px); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      {/* Left sidebar — cast */}
      <div style={{
        width: '280px',
        flexShrink: 0,
        borderRight: '1px solid rgba(255,255,255,0.06)',
        padding: '32px 20px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}>
        <a href={`/${movieSlug}`} style={{ color: '#52525b', fontSize: '13px', fontWeight: 600, textDecoration: 'none', marginBottom: '8px', display: 'block' }}>← Back to casting</a>
        <div style={{ fontSize: '18px', fontWeight: 800, marginBottom: '4px', lineHeight: 1.2 }}>{movieTitle}</div>
        <div style={{ fontSize: '13px', color: '#52525b', marginBottom: '16px', fontVariantNumeric: 'tabular-nums' }}>
          ${spent}M of ${budget}M{overBudget && <span style={{ color: '#f87171' }}> · over budget</span>}
        </div>

        {cast.map(item => (
          <div key={item.role} style={{
            background: '#111115',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '10px',
            padding: '10px 12px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
              <div style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, color: TIER_COLOR[item.tier] ?? '#52525b' }}>
                {TIER_LABEL[item.tier] ?? item.tier}
              </div>
              <div style={{ fontSize: '11px', color: '#52525b', fontVariantNumeric: 'tabular-nums' }}>${item.cost}M</div>
            </div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#f1f5f9', marginBottom: '1px' }}>{item.actor}</div>
            <div style={{ fontSize: '11px', color: '#71717a' }}>as {item.role}</div>
          </div>
        ))}
      </div>

      {/* Main — reveal */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 32px',
        gap: '16px',
        maxWidth: '720px',
        margin: '0 auto',
        width: '100%',
      }}>

        {/* Clapperboard intro */}
        <div style={{
          fontSize: '52px',
          animation: 'clapperIn 0.6s cubic-bezier(0.34,1.56,0.64,1) both',
          marginBottom: '8px',
        }}>🎬</div>

        <div style={{ fontSize: '13px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#52525b', fontWeight: 700, marginBottom: '8px' }}>
          Cast Review — {movieTitle}
        </div>

        {/* Three scores */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
          <ScoreCard label="Green Light Score" value={greenLight} type="green"  emoji="🟢" phase={phase} myPhase={1} />
          <ScoreCard label="Quality Score"      value={quality}    type="quality" emoji="⭐" phase={phase} myPhase={2} />
          <ScoreCard label="Hear Me Out Score"  value={hearMeOut}  type="hmu"    emoji="🔮" phase={phase} myPhase={3} />
        </div>

        {/* Award */}
        {awardMeta && phase >= 4 && (
          <div style={{
            animation: 'awardDrop 0.5s cubic-bezier(0.34,1.56,0.64,1) both',
            background: `${awardMeta.color}14`,
            border: `1px solid ${awardMeta.color}40`,
            borderRadius: '14px',
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            width: '100%',
          }}>
            <div style={{ fontSize: '28px' }}>{awardMeta.emoji}</div>
            <div>
              <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: awardMeta.color, fontWeight: 700, marginBottom: '2px' }}>Award</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#f1f5f9' }}>{awardMeta.label}</div>
            </div>
          </div>
        )}

        {/* Marlowe verdict + links */}
        {phase >= 4 && (
          <div style={{ animation: 'fadeUp 0.5s ease both', width: '100%', display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
            <div style={{
              background: '#111115',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '14px',
              padding: '20px 24px',
            }}>
              <div style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#52525b', fontWeight: 700, marginBottom: '8px' }}>Marlowe's verdict</div>
              <div style={{ fontSize: '16px', fontStyle: 'italic', color: '#cbd5e1', lineHeight: 1.6 }}>"{summary}"</div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <a href={`/${movieSlug}/casts`} style={{
                flex: 1,
                display: 'block',
                textAlign: 'center',
                background: '#18181b',
                border: '1px solid #27272a',
                borderRadius: '10px',
                padding: '12px',
                fontSize: '14px',
                fontWeight: 700,
                color: '#f1f5f9',
                textDecoration: 'none',
              }}>
                Hall of Fame →
              </a>
              <a href={`/${movieSlug}`} style={{
                flex: 1,
                display: 'block',
                textAlign: 'center',
                background: 'rgba(59,130,246,0.1)',
                border: '1px solid rgba(59,130,246,0.25)',
                borderRadius: '10px',
                padding: '12px',
                fontSize: '14px',
                fontWeight: 700,
                color: '#60a5fa',
                textDecoration: 'none',
              }}>
                Recast again
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
