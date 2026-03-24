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

type Selections = Record<string, string> // role → actor name

export default function CastingPage({ movie, actors }: Props) {
  const [selections, setSelections] = useState<Selections>({})
  const [query, setQuery] = useState('')
  const [visibleActors, setVisibleActors] = useState<PoolActor[]>(actors)
  const [searching, setSearching] = useState(false)
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
      // Remove actor from any role they were already in
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
    if (!val.trim()) {
      setVisibleActors(actors)
      return
    }
    const lower = val.toLowerCase()
    setVisibleActors(actors.filter(a => a.name.toLowerCase().includes(lower)))
  }

  async function handleAISearch() {
    if (!query.trim()) return
    setSearching(true)
    try {
      const res = await fetch('/api/actor-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, actors: actors.map(a => a.name) }),
      })
      const data = await res.json() as { actors: string[] }
      if (data.actors?.length) {
        const nameSet = new Set(data.actors)
        const ranked = data.actors
          .map(name => actors.find(a => a.name === name))
          .filter((a): a is PoolActor => Boolean(a))
        const rest = actors.filter(a => !nameSet.has(a.name))
        setVisibleActors([...ranked, ...rest])
      }
    } catch {
      // silently fail
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

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#09090b', color: '#f8fafc' }}>

        {/* Header */}
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '16px 28px', display: 'flex', alignItems: 'center', gap: '24px', flexShrink: 0 }}>
          <Link href="/" style={{ color: '#64748b', fontSize: '13px', textDecoration: 'none', flexShrink: 0 }}>
            ← All movies
          </Link>

          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontWeight: 800, fontSize: '18px' }}>{movie.title}</span>
            <span style={{ color: '#52525b', fontSize: '14px', marginLeft: '8px' }}>{movie.year}</span>
          </div>

          {/* Budget bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
            <div style={{ fontSize: '13px', color: overBudget ? '#f87171' : '#4ade80', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              ${remaining}M left
            </div>
            <div style={{ width: '100px' }}>
              <div style={{ height: '4px', background: '#27272a', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min((spent / movie.budget) * 100, 100)}%`,
                  background: overBudget ? '#ef4444' : '#22c55e',
                  transition: 'width 0.2s',
                }} />
              </div>
              <div style={{ fontSize: '11px', color: '#3f3f46', marginTop: '3px' }}>${spent}M of ${movie.budget}M</div>
            </div>
          </div>

          {allFilled && !overBudget && (
            <button
              onClick={handleShareCast}
              style={{ background: '#f8fafc', color: '#09090b', border: 'none', borderRadius: '8px', padding: '8px 14px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
            >
              Share cast ↗
            </button>
          )}
        </div>

        {/* Body */}
        <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', flex: 1, minHeight: 0 }}>

          {/* Left: Cast board */}
          <div style={{ borderRight: '1px solid rgba(255,255,255,0.08)', padding: '24px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#52525b', marginBottom: '6px' }}>
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
          <div style={{ padding: '24px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Search */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                value={query}
                onChange={e => handleQueryChange(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAISearch() }}
                placeholder='Search by name, or try "intense 30-year-old" and hit AI Search'
                style={{
                  flex: 1,
                  background: '#18181b',
                  border: '1px solid #27272a',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  color: '#f8fafc',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
              <button
                onClick={handleAISearch}
                disabled={searching || !query.trim()}
                style={{
                  background: '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px 16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: searching ? 'not-allowed' : 'pointer',
                  opacity: (searching || !query.trim()) ? 0.5 : 1,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {searching ? 'Searching…' : 'AI Search'}
              </button>
              {visibleActors.length < actors.length && (
                <button
                  onClick={() => { setQuery(''); setVisibleActors(actors) }}
                  style={{ background: '#27272a', color: '#a1a1aa', border: 'none', borderRadius: '10px', padding: '10px 12px', fontSize: '13px', cursor: 'pointer', flexShrink: 0 }}
                >
                  Reset
                </button>
              )}
            </div>

            <div style={{ fontSize: '11px', color: '#3f3f46' }}>
              {visibleActors.length} of {actors.length} actors
            </div>

            {/* Actor grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '8px' }}>
              {visibleActors.map(actor => (
                <ActorCard
                  key={actor.name}
                  actor={actor}
                  isCast={castNames.has(actor.name)}
                  isDraggingThis={activeId === actor.name}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Drag overlay — what you see while dragging */}
      <DragOverlay>
        {activeActor && (
          <div style={{
            border: '1px solid #3b82f6',
            borderRadius: '10px',
            padding: '12px',
            background: '#1e3a5f',
            color: '#f8fafc',
            width: '150px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            cursor: 'grabbing',
          }}>
            <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '3px' }}>{activeActor.name}</div>
            <div style={{ fontSize: '11px', color: '#93c5fd' }}>${activeActor.cost}M</div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}

// ─────────────────────────────────────────────
// Role slot (droppable)
// ─────────────────────────────────────────────

function RoleSlot({
  role,
  originalActor,
  castActor,
  onClear,
}: {
  role: string
  originalActor: string
  castActor: PoolActor | undefined
  onClear: () => void
}) {
  const { isOver, setNodeRef } = useDroppable({ id: role })

  return (
    <div
      ref={setNodeRef}
      style={{
        border: `1.5px solid ${isOver ? '#3b82f6' : castActor ? '#27272a' : 'rgba(255,255,255,0.07)'}`,
        borderRadius: '12px',
        padding: '14px 16px',
        background: isOver ? 'rgba(59,130,246,0.1)' : castActor ? '#111115' : 'transparent',
        transition: 'border-color 0.12s, background 0.12s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: '68px',
      }}
    >
      <div>
        <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '3px' }}>{role}</div>
        <div style={{ fontSize: '11px', color: '#3f3f46' }}>orig. {originalActor}</div>
      </div>

      {castActor ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0' }}>{castActor.name}</div>
            <div style={{ fontSize: '11px', color: '#52525b' }}>${castActor.cost}M</div>
          </div>
          <button
            onClick={onClear}
            style={{ background: 'none', border: 'none', color: '#3f3f46', cursor: 'pointer', fontSize: '20px', lineHeight: 1, padding: '2px', flexShrink: 0 }}
            title="Remove"
          >
            ×
          </button>
        </div>
      ) : (
        <div style={{ fontSize: '12px', color: isOver ? '#60a5fa' : '#27272a', fontStyle: 'italic' }}>
          {isOver ? 'drop here' : 'drag actor here'}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// Actor card (draggable)
// ─────────────────────────────────────────────

function ActorCard({
  actor,
  isCast,
  isDraggingThis,
}: {
  actor: PoolActor
  isCast: boolean
  isDraggingThis: boolean
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: actor.name })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        border: `1px solid ${isCast ? '#1c1c1f' : '#27272a'}`,
        borderRadius: '10px',
        padding: '12px',
        background: isCast ? '#0d0d0f' : '#18181b',
        opacity: isCast ? 0.35 : isDraggingThis ? 0 : 1,
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
