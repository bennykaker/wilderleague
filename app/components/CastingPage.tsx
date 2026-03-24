'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import type { Movie } from '../data/movies'
import type { PoolActor } from '../data/actorPool'

interface Props {
  movie: Movie
  actors: PoolActor[]
}

type Selections = Record<string, string>

export default function CastingPage({ movie, actors }: Props) {
  const [selections, setSelections] = useState<Selections>({})
  const [query, setQuery] = useState('')
  const [visibleActors, setVisibleActors] = useState<PoolActor[]>(actors)
  const [searching, setSearching] = useState(false)
  const [aiReply, setAiReply] = useState<string | null>(null)
  const [isFiltered, setIsFiltered] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)

  const castNames = new Set(Object.values(selections).filter(Boolean))

  const spent = Object.values(selections).reduce((sum, name) => {
    return sum + (actors.find(a => a.name === name)?.cost ?? 0)
  }, 0)
  const remaining = movie.budget - spent
  const overBudget = remaining < 0
  const allFilled = movie.roles.every(r => selections[r])

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over) return
    const actorName = active.id as string
    const role = over.id as string
    if (!movie.roles.includes(role)) return
    setSelections(prev => {
      const next = { ...prev }
      for (const r of Object.keys(next)) {
        if (next[r] === actorName) delete next[r]
      }
      next[role] = actorName
      return next
    })
  }

  function clearRole(role: string) {
    setSelections(prev => {
      const next = { ...prev }
      delete next[role]
      return next
    })
  }

  function handleQueryChange(val: string) {
    setQuery(val)
    // Only do instant text filter if not currently showing AI results
    if (!isFiltered) {
      if (!val.trim()) {
        setVisibleActors(actors)
      } else {
        const lower = val.toLowerCase()
        setVisibleActors(actors.filter(a => a.name.toLowerCase().includes(lower)))
      }
    }
  }

  function resetSearch() {
    setQuery('')
    setVisibleActors(actors)
    setAiReply(null)
    setIsFiltered(false)
  }

  async function handleAISearch() {
    if (!query.trim()) return
    setSearching(true)
    setAiReply(null)
    try {
      const res = await fetch('/api/actor-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          actors: actors.map(a => a.name),
          movie: movie.title,
          roles: movie.roles,
          originalCast: movie.originalCast,
        }),
      })
      const data = await res.json() as { reply: string; actors: string[] }

      if (data.reply) setAiReply(data.reply)

      if (data.actors?.length) {
        const nameSet = new Set(data.actors)
        // Show AI picks first, then the rest dimmed
        const picked = data.actors
          .map(name => actors.find(a => a.name === name))
          .filter((a): a is PoolActor => Boolean(a))
        const rest = actors.filter(a => !nameSet.has(a.name))
        setVisibleActors([...picked, ...rest])
        setIsFiltered(true)
      }
    } catch {
      setAiReply('Something went wrong. Try again.')
    } finally {
      setSearching(false)
    }
  }

  function handleShareCast() {
    const params = new URLSearchParams()
    for (const [role, name] of Object.entries(selections)) {
      if (name) params.set(role, name)
    }
    const url = `${window.location.origin}/${movie.slug}?${params.toString()}`
    navigator.clipboard.writeText(url).then(() => alert('Link copied to clipboard.'))
  }

  const activeActor = activeId ? actors.find(a => a.name === activeId) : null
  const pickedCount = isFiltered
    ? visibleActors.filter(a => {
        const aiNames = isFiltered ? visibleActors.slice(0, visibleActors.length) : []
        return aiNames.length > 0
      }).length
    : 0

  // When filtered, the AI picks are the first N in visibleActors before the rest
  const aiPickedNames = isFiltered
    ? new Set(
        visibleActors
          .filter(a => !actors.slice(0, actors.length).find(orig => orig.name === a.name && !visibleActors.slice(0, visibleActors.indexOf(a)).length))
          .map(a => a.name)
      )
    : new Set<string>()

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#09090b', color: '#f8fafc' }}>

        {/* Header */}
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '14px 28px', display: 'flex', alignItems: 'center', gap: '20px', flexShrink: 0 }}>
          <Link href="/" style={{ color: '#52525b', fontSize: '13px', textDecoration: 'none', flexShrink: 0 }}>
            ← All movies
          </Link>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontWeight: 800, fontSize: '17px' }}>{movie.title}</span>
            <span style={{ color: '#52525b', fontSize: '13px', marginLeft: '8px' }}>{movie.year}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
            <div style={{ fontSize: '13px', color: overBudget ? '#f87171' : '#4ade80', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              ${remaining}M left
            </div>
            <div style={{ width: '90px' }}>
              <div style={{ height: '3px', background: '#27272a', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min((spent / movie.budget) * 100, 100)}%`, background: overBudget ? '#ef4444' : '#22c55e', transition: 'width 0.2s' }} />
              </div>
              <div style={{ fontSize: '10px', color: '#3f3f46', marginTop: '3px' }}>${spent}M of ${movie.budget}M</div>
            </div>
            {allFilled && !overBudget && (
              <button onClick={handleShareCast} style={{ background: '#f8fafc', color: '#09090b', border: 'none', borderRadius: '8px', padding: '7px 13px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                Share ↗
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', flex: 1, minHeight: 0 }}>

          {/* Left: Cast board */}
          <div style={{ borderRight: '1px solid rgba(255,255,255,0.08)', padding: '20px 18px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '9px' }}>
            <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#52525b', marginBottom: '4px' }}>
              Cast board
            </div>
            {movie.roles.map(role => (
              <RoleSlot
                key={role}
                role={role}
                originalActor={movie.originalCast[role] ?? ''}
                castActor={selections[role] ? actors.find(a => a.name === selections[role]) : undefined}
                onClear={() => clearRole(role)}
              />
            ))}
          </div>

          {/* Right: Actor pool */}
          <div style={{ padding: '20px 18px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {/* Search bar */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                value={query}
                onChange={e => handleQueryChange(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAISearch() }}
                placeholder='Try "give me a young Keanu" or "intense woman, 30s"'
                style={{ flex: 1, background: '#18181b', border: '1px solid #27272a', borderRadius: '10px', padding: '9px 13px', color: '#f8fafc', fontSize: '14px', outline: 'none' }}
              />
              <button
                onClick={handleAISearch}
                disabled={searching || !query.trim()}
                style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '10px', padding: '9px 15px', fontSize: '13px', fontWeight: 600, cursor: (searching || !query.trim()) ? 'not-allowed' : 'pointer', opacity: (searching || !query.trim()) ? 0.5 : 1, whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                {searching ? 'Asking…' : 'Ask AI'}
              </button>
              {(isFiltered || (query && !isFiltered && visibleActors.length < actors.length)) && (
                <button onClick={resetSearch} style={{ background: '#27272a', color: '#a1a1aa', border: 'none', borderRadius: '10px', padding: '9px 12px', fontSize: '13px', cursor: 'pointer', flexShrink: 0 }}>
                  Reset
                </button>
              )}
            </div>

            {/* AI reply */}
            {searching && (
              <div style={{ fontSize: '13px', color: '#52525b', fontStyle: 'italic', padding: '2px 0' }}>
                Thinking…
              </div>
            )}
            {aiReply && !searching && (
              <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '10px', padding: '11px 14px', fontSize: '13px', color: '#cbd5e1', lineHeight: 1.5 }}>
                <span style={{ color: '#3b82f6', fontWeight: 600, marginRight: '6px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>AI</span>
                {aiReply}
                {isFiltered && (
                  <span style={{ color: '#52525b', marginLeft: '8px' }}>
                    — showing best matches first
                  </span>
                )}
              </div>
            )}

            {/* Actor count */}
            <div style={{ fontSize: '11px', color: '#3f3f46' }}>
              {isFiltered
                ? `Showing all ${actors.length} actors — AI picks at the top`
                : `${visibleActors.length} of ${actors.length} actors`}
            </div>

            {/* Actor grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '8px' }}>
              {visibleActors.map((actor, i) => {
                const isAiPick = isFiltered && i < (visibleActors.length - actors.filter(a => !new Set(visibleActors.slice(0, visibleActors.length).map(v => v.name)).has(a.name)).length)
                return (
                  <ActorCard
                    key={actor.name}
                    actor={actor}
                    isCast={castNames.has(actor.name)}
                    isDraggingThis={activeId === actor.name}
                    isAiPick={false}
                    isDimmed={isFiltered && i >= (visibleActors.length - actors.length + visibleActors.length)}
                  />
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeActor && (
          <div style={{ border: '1px solid #3b82f6', borderRadius: '10px', padding: '12px', background: '#1e3a5f', color: '#f8fafc', width: '150px', boxShadow: '0 8px 32px rgba(0,0,0,0.6)', cursor: 'grabbing' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '3px' }}>{activeActor.name}</div>
            <div style={{ fontSize: '11px', color: '#93c5fd' }}>${activeActor.cost}M</div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}

// ─────────────────────────────────────────────

function RoleSlot({ role, originalActor, castActor, onClear }: {
  role: string
  originalActor: string
  castActor: PoolActor | undefined
  onClear: () => void
}) {
  const { isOver, setNodeRef } = useDroppable({ id: role })

  return (
    <div ref={setNodeRef} style={{
      border: `1.5px solid ${isOver ? '#3b82f6' : castActor ? '#27272a' : 'rgba(255,255,255,0.07)'}`,
      borderRadius: '12px',
      padding: '13px 15px',
      background: isOver ? 'rgba(59,130,246,0.1)' : castActor ? '#111115' : 'transparent',
      transition: 'border-color 0.12s, background 0.12s',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: '65px',
    }}>
      <div>
        <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '3px' }}>{role}</div>
        <div style={{ fontSize: '11px', color: '#3f3f46' }}>orig. {originalActor}</div>
      </div>
      {castActor ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0' }}>{castActor.name}</div>
            <div style={{ fontSize: '11px', color: '#52525b' }}>${castActor.cost}M</div>
          </div>
          <button onClick={onClear} style={{ background: 'none', border: 'none', color: '#3f3f46', cursor: 'pointer', fontSize: '20px', lineHeight: 1, padding: '2px' }}>×</button>
        </div>
      ) : (
        <div style={{ fontSize: '12px', color: isOver ? '#60a5fa' : '#27272a', fontStyle: 'italic' }}>
          {isOver ? 'drop here' : 'drag here'}
        </div>
      )}
    </div>
  )
}

function ActorCard({ actor, isCast, isDraggingThis, isAiPick, isDimmed }: {
  actor: PoolActor
  isCast: boolean
  isDraggingThis: boolean
  isAiPick: boolean
  isDimmed: boolean
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: actor.name })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        border: `1px solid ${isAiPick ? '#3b82f680' : '#27272a'}`,
        borderRadius: '10px',
        padding: '12px',
        background: isAiPick ? '#0f1f35' : isCast ? '#0d0d0f' : '#18181b',
        opacity: isCast ? 0.3 : isDraggingThis ? 0 : isDimmed ? 0.4 : 1,
        cursor: isCast ? 'default' : 'grab',
        transform: CSS.Translate.toString(transform),
        transition: 'opacity 0.15s',
        userSelect: 'none',
        touchAction: 'none',
      }}
    >
      <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px', color: isCast ? '#52525b' : '#f1f5f9' }}>
        {actor.name}
      </div>
      <div style={{ fontSize: '11px', color: '#52525b' }}>${actor.cost}M</div>
    </div>
  )
}
