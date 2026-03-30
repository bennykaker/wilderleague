'use client'

import { useState } from 'react'
import type { EnrichedActor } from '../data/enrichedActors'

interface Props {
  actors: EnrichedActor[]
}

type CorrectionField = 'gender' | 'birth_year' | 'biography' | 'known_for' | 'keywords' | 'headshot_url' | 'other'

const FIELDS: CorrectionField[] = ['gender', 'birth_year', 'biography', 'known_for', 'keywords', 'headshot_url', 'other']

function CorrectionModal({ actor, onClose }: { actor: EnrichedActor; onClose: () => void }) {
  const [field, setField] = useState<CorrectionField>('gender')
  const [suggestedValue, setSuggestedValue] = useState('')
  const [notes, setNotes] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const currentValue = actor[field as keyof EnrichedActor]?.toString() ?? ''

  async function handleSubmit() {
    if (!suggestedValue.trim()) return
    setSending(true)
    try {
      await fetch('/api/actor-correction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actorName: actor.name,
          actorId: actor.tmdb_id,
          field,
          currentValue,
          suggestedValue,
          notes,
        }),
      })
      setSent(true)
    } catch {}
    finally { setSending(false) }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
      onClick={onClose}
    >
      <div
        style={{ background: '#111115', border: '1px solid #27272a', borderRadius: '16px', padding: '24px', width: '420px' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontWeight: 800, fontSize: '16px', marginBottom: '4px' }}>Suggest a correction</div>
        <div style={{ fontSize: '13px', color: '#52525b', marginBottom: '20px' }}>{actor.name}</div>

        {sent ? (
          <div style={{ fontSize: '14px', color: '#4ade80', padding: '12px 0' }}>Thanks — correction sent.</div>
        ) : (
          <>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '11px', color: '#52525b', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Field</label>
              <select
                value={field}
                onChange={e => setField(e.target.value as CorrectionField)}
                style={{ width: '100%', background: '#18181b', border: '1px solid #27272a', borderRadius: '8px', padding: '8px 12px', color: '#f8fafc', fontSize: '13px', outline: 'none' }}
              >
                {FIELDS.map(f => <option key={f} value={f}>{f.replace('_', ' ')}</option>)}
              </select>
            </div>

            {field !== 'other' && (
              <div style={{ marginBottom: '14px', padding: '10px 12px', background: '#0d0d0f', borderRadius: '8px', fontSize: '12px', color: '#52525b' }}>
                Current: <span style={{ color: '#a1a1aa' }}>{currentValue || '(empty)'}</span>
              </div>
            )}

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '11px', color: '#52525b', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Suggested value</label>
              <input
                value={suggestedValue}
                onChange={e => setSuggestedValue(e.target.value)}
                placeholder='What should it be?'
                style={{ width: '100%', background: '#18181b', border: '1px solid #27272a', borderRadius: '8px', padding: '8px 12px', color: '#f8fafc', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '11px', color: '#52525b', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Notes (optional)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder='Any context or source...'
                rows={2}
                style={{ width: '100%', background: '#18181b', border: '1px solid #27272a', borderRadius: '8px', padding: '8px 12px', color: '#f8fafc', fontSize: '13px', outline: 'none', resize: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={onClose} style={{ background: '#27272a', border: 'none', borderRadius: '8px', padding: '8px 14px', color: '#a1a1aa', fontSize: '13px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={sending || !suggestedValue.trim()}
                style={{ background: '#3b82f6', border: 'none', borderRadius: '8px', padding: '8px 14px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: sending || !suggestedValue.trim() ? 'not-allowed' : 'pointer', opacity: sending || !suggestedValue.trim() ? 0.5 : 1 }}
              >
                {sending ? 'Sending…' : 'Send correction'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function ActorCard({ actor }: { actor: EnrichedActor }) {
  const [expanded, setExpanded] = useState(false)
  const [correcting, setCorrecting] = useState(false)

  const tags = actor.keywords ? actor.keywords.split(';').map(t => t.trim()).filter(Boolean) : []
  const credits = actor.known_for ? actor.known_for.split(';').map(t => t.trim()).filter(Boolean) : []

  return (
    <>
      <div
        style={{
          background: '#111115',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '14px',
          overflow: 'hidden',
          cursor: 'pointer',
          transition: 'border-color 0.15s',
        }}
        onClick={() => setExpanded(!expanded)}
        className="actor-card"
      >
        {/* Photo */}
        <div style={{ aspectRatio: '2/3', background: '#0d0d0f', overflow: 'hidden' }}>
          {actor.headshot_url ? (
            <img src={actor.headshot_url} alt={actor.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3f3f46', fontSize: '11px' }}>No photo</div>
          )}
        </div>

        {/* Info */}
        <div style={{ padding: '12px' }}>
          <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '3px', color: '#f1f5f9' }}>{actor.name}</div>
          <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: '#52525b', marginBottom: '8px' }}>
            {actor.gender && <span>{actor.gender}</span>}
            {actor.birth_year && <span>b. {actor.birth_year}</span>}
            <span style={{ color: '#4ade80', fontWeight: 700 }}>
              ${actor.cost}M{!actor.salary_confirmed && <span style={{ color: '#3f3f46', fontWeight: 400, fontSize: '10px' }}> est</span>}
            </span>
          </div>
          {tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {tags.slice(0, 3).map(tag => (
                <span key={tag} style={{ fontSize: '10px', background: '#18181b', border: '1px solid #27272a', borderRadius: '4px', padding: '2px 6px', color: '#71717a' }}>
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Expanded bio */}
        {expanded && (
          <div style={{ padding: '0 12px 12px', borderTop: '1px solid #1c1c1e' }} onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setExpanded(false)}
              style={{ float: 'right', marginTop: '10px', background: 'none', border: 'none', color: '#52525b', fontSize: '18px', cursor: 'pointer', lineHeight: 1, padding: '0 2px' }}
              aria-label="Close"
            >×</button>

            {/* Marlowe's casting profile */}
            {actor.casting_profile && (
              <div style={{ margin: '12px 0 14px', background: '#0d0f14', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '10px', padding: '12px 14px' }}>
                <div style={{ fontSize: '10px', color: '#3b82f6', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Marlowe's assessment
                </div>
                <p style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: 1.6, margin: 0 }}>
                  {actor.casting_profile}
                </p>
              </div>
            )}

            {actor.biography && (
              <p style={{ fontSize: '12px', color: '#71717a', lineHeight: 1.6, margin: '0 0 10px' }}>
                {actor.biography.slice(0, 300)}{actor.biography.length > 300 ? '…' : ''}
              </p>
            )}
            {credits.length > 0 && (
              <div style={{ marginBottom: '10px' }}>
                <div style={{ fontSize: '10px', color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '5px' }}>Known for</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {credits.map(c => (
                    <span key={c} style={{ fontSize: '11px', background: '#18181b', border: '1px solid #27272a', borderRadius: '4px', padding: '2px 7px', color: '#a1a1aa' }}>{c}</span>
                  ))}
                </div>
              </div>
            )}
            {tags.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '10px', color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '5px' }}>Keywords</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {tags.map(tag => (
                    <span key={tag} style={{ fontSize: '10px', background: '#18181b', border: '1px solid #27272a', borderRadius: '4px', padding: '2px 6px', color: '#71717a' }}>{tag}</span>
                  ))}
                </div>
              </div>
            )}
            <button
              onClick={e => { e.stopPropagation(); setCorrecting(true) }}
              style={{ fontSize: '11px', color: '#52525b', background: 'none', border: '1px solid #27272a', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer' }}
            >
              Flag a correction
            </button>
          </div>
        )}
      </div>

      {correcting && <CorrectionModal actor={actor} onClose={() => setCorrecting(false)} />}
    </>
  )
}

export default function ActorBrowser({ actors }: Props) {
  const [search, setSearch] = useState('')
  const [genderFilter, setGenderFilter] = useState('')
  const [maxCost, setMaxCost] = useState(12)

  const filtered = actors.filter(a => {
    if (genderFilter && a.gender !== genderFilter) return false
    if (a.cost > maxCost) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        a.name.toLowerCase().includes(q) ||
        a.keywords.toLowerCase().includes(q) ||
        a.known_for.toLowerCase().includes(q) ||
        a.biography.toLowerCase().includes(q)
      )
    }
    return true
  })

  return (
    <div style={{ minHeight: '100vh', background: '#09090b', color: '#f8fafc', padding: '32px 24px 64px', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>
      <style>{`.actor-card:hover { border-color: rgba(255,255,255,0.16) !important; }`}</style>

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '32px' }}>
          <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#71717a', fontSize: '13px', fontWeight: 600, textDecoration: 'none', marginBottom: '16px' }}>← All titles</a>
          <div style={{ fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#3b82f6', marginBottom: '10px' }}>Wilderleague</div>
          <h1 style={{ fontSize: '36px', fontWeight: 900, margin: '0 0 8px', lineHeight: 1.05 }}>Actor pool</h1>
          <p style={{ fontSize: '14px', color: '#52525b', margin: 0 }}>{actors.length} actors · click a card to see bio · flag corrections below</p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder='Search by name, genre, keyword…'
            style={{ flex: 1, minWidth: '220px', background: '#18181b', border: '1px solid #27272a', borderRadius: '10px', padding: '9px 13px', color: '#f8fafc', fontSize: '13px', outline: 'none' }}
          />
          <select
            value={genderFilter}
            onChange={e => setGenderFilter(e.target.value)}
            style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '10px', padding: '9px 13px', color: '#f8fafc', fontSize: '13px', outline: 'none', cursor: 'pointer' }}
          >
            <option value=''>All genders</option>
            <option value='male'>Male</option>
            <option value='female'>Female</option>
            <option value='non-binary'>Non-binary</option>
          </select>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#71717a' }}>
            <span>Max cost</span>
            <input
              type='range'
              min={3}
              max={12}
              value={maxCost}
              onChange={e => setMaxCost(Number(e.target.value))}
              style={{ width: '80px' }}
            />
            <span style={{ color: '#4ade80', fontWeight: 700, minWidth: '32px' }}>${maxCost}M</span>
          </div>
          <div style={{ fontSize: '12px', color: '#3f3f46' }}>{filtered.length} results</div>
        </div>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '14px' }}>
          {filtered.map(actor => (
            <ActorCard key={actor.tmdb_id || actor.name} actor={actor} />
          ))}
        </div>
      </div>
    </div>
  )
}
