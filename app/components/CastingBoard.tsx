'use client'

import { useState, useEffect, useRef } from 'react'

export type CastActor = {
  id: string
  name: string
  image: string
  popularity: number
  cost: number
  salaryConfirmed?: boolean
}

export type CastRole = {
  role_name: string
  original_actor: string
  original_actor_image?: string
}

type ChatMsg = {
  text: string
  suggestion?: string | null
}

type Props = {
  actors: CastActor[]
  roles: CastRole[]
  title: string
  budget: number
  preloadedSuggestions?: Record<string, string[]>
}

// Per role: [primary, 2nd choice, 3rd choice]
type Selections = Record<string, string[]>

export default function CastingBoard({ actors, roles, title, budget, preloadedSuggestions = {} }: Props) {
  const [selections, setSelections] = useState<Selections>({})
  const [activeRole, setActiveRole] = useState(roles[0]?.role_name ?? '')
  const [dragOverSlot, setDragOverSlot] = useState<{ role: string; slot: number } | null>(null)
  const [draggingActor, setDraggingActor] = useState<string | null>(null)
  const [draggingFromSlot, setDraggingFromSlot] = useState<{ role: string; slot: number } | null>(null)
  const [chatMessages, setChatMessages] = useState<Record<string, ChatMsg[]>>({})
  const [aiLoading, setAiLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [visibleActors, setVisibleActors] = useState<CastActor[]>([])
  const [isFiltered, setIsFiltered] = useState(false)
  const [showExportCard, setShowExportCard] = useState(false)
  const [showBlockedModal, setShowBlockedModal] = useState(false)
  const [confirmBan, setConfirmBan] = useState<string | null>(null)
  const [suggestedPerRole, setSuggestedPerRole] = useState<Record<string, CastActor[]>>({})
  const [blockedActors, setBlockedActors] = useState<Set<string>>(new Set())
  const chatEndRef = useRef<HTMLDivElement>(null)
  const dropSucceededRef = useRef(false)

  // Load blocklist from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('wilderleague_blocked')
      if (saved) setBlockedActors(new Set(JSON.parse(saved) as string[]))
    } catch {}
  }, [])

  function blockActor(name: string) {
    setBlockedActors(prev => {
      const next = new Set(prev)
      next.add(name)
      localStorage.setItem('wilderleague_blocked', JSON.stringify([...next]))
      return next
    })
  }

  function unblockActor(name: string) {
    setBlockedActors(prev => {
      const next = new Set(prev)
      next.delete(name)
      localStorage.setItem('wilderleague_blocked', JSON.stringify([...next]))
      return next
    })
  }

  // All actor names assigned to any slot across all roles
  const assignedNames = new Set(
    Object.values(selections).flatMap(arr => arr).filter(Boolean)
  )

  // Budget only counts primary (slot 0) choices
  const spent = Object.values(selections).reduce((sum, arr) => {
    const name = arr[0]
    return sum + (name ? (actors.find(a => a.name === name)?.cost ?? 0) : 0)
  }, 0)
  const remaining = budget - spent
  const overBudget = remaining < 0

  function getSlots(roleName: string): string[] {
    return selections[roleName] ?? []
  }

  function assignToSlot(roleName: string, actorName: string, slot: number) {
    setSelections(prev => {
      const next: Selections = {}
      for (const [r, arr] of Object.entries(prev)) {
        // For primary slot: remove actor from any other role's slot 0
        if (slot === 0 && arr[0] === actorName && r !== roleName) {
          const trimmed = arr.slice(1)
          if (trimmed.some(Boolean)) next[r] = trimmed
        } else {
          next[r] = arr
        }
      }
      const current = [...(next[roleName] ?? [])]
      // Remove this actor from other slots in the same role
      for (let i = 0; i < current.length; i++) {
        if (current[i] === actorName && i !== slot) current[i] = ''
      }
      current[slot] = actorName
      next[roleName] = current
      return next
    })

    // Only fire reaction message when assigning primary slot
    if (slot === 0) {
      const role = roles.find(r => r.role_name === roleName)
      const actor = actors.find(a => a.name === actorName)
      fetch('/api/role-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'react',
          role: roleName,
          movie: title,
          originalActor: role?.original_actor ?? '',
          pickedActor: actorName,
          pickedActorCost: actor?.cost,
        }),
      })
        .then(r => r.json())
        .then(data => {
          if (data.reply) {
            setChatMessages(prev => ({
              ...prev,
              [roleName]: [...(prev[roleName] ?? []), { text: data.reply, suggestion: data.suggestion }],
            }))
            setActiveRole(roleName)
          }
        })
        .catch(() => {})
    }
  }

  function clearSlot(roleName: string, slot: number) {
    setSelections(prev => {
      const current = [...(prev[roleName] ?? [])]
      current[slot] = ''
      const next = { ...prev }
      const remaining = current.filter(Boolean)
      if (remaining.length === 0) {
        delete next[roleName]
      } else {
        next[roleName] = current
      }
      return next
    })
  }

  // Fetch role description when active role changes
  useEffect(() => {
    setQuery('')
    setIsFiltered(false)
    setChatMessages(prev => ({ ...prev, [activeRole]: [] }))

    const preloaded = (preloadedSuggestions[activeRole] ?? [])
      .filter(name => !blockedActors.has(name))
    if (preloaded.length > 0) {
      const picks = preloaded
        .map(name => actors.find(a => a.name.toLowerCase() === name.toLowerCase()))
        .filter((a): a is CastActor => Boolean(a))
      setVisibleActors(picks)
      setIsFiltered(true)
      setSuggestedPerRole(prev => ({ ...prev, [activeRole]: picks }))
    } else {
      setVisibleActors([])
    }

    const role = roles.find(r => r.role_name === activeRole)
    if (!role) return

    setAiLoading(true)
    let cancelled = false

    fetch('/api/role-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'describe',
        role: activeRole,
        movie: title,
        originalActor: role.original_actor,
        actors: actors.map(a => a.name),
      }),
    })
      .then(r => r.json())
      .then(data => {
        if (cancelled) return
        const reply = data.reply || data.error || 'No response from AI.'
        setChatMessages(prev => ({
          ...prev,
          [activeRole]: [{ text: reply, suggestion: data.suggestion ?? null }],
        }))
        if (data.actors?.length) {
          const picks = (data.actors as string[])
            .filter(name => !blockedActors.has(name))
            .map(name => actors.find(a => a.name === name))
            .filter((a): a is CastActor => Boolean(a))
          setVisibleActors(picks)
          setIsFiltered(true)
          setSuggestedPerRole(prev => {
            const existing = prev[activeRole] ?? []
            const existingNames = new Set(existing.map(a => a.name))
            return { ...prev, [activeRole]: [...existing, ...picks.filter(a => !existingNames.has(a.name))] }
          })
        }
      })
      .catch(err => {
        if (cancelled) return
        setChatMessages(prev => ({
          ...prev,
          [activeRole]: [{ text: `Error: ${err?.message ?? 'fetch failed'}`, suggestion: null }],
        }))
      })
      .finally(() => { if (!cancelled) setAiLoading(false) })

    return () => { cancelled = true }
  }, [activeRole]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  async function handleSearch() {
    if (!query.trim()) return
    setVisibleActors([])
    setAiLoading(true)
    const role = roles.find(r => r.role_name === activeRole)
    try {
      const res = await fetch('/api/role-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'search',
          role: activeRole,
          movie: title,
          originalActor: role?.original_actor ?? '',
          query,
          excludeActors: (suggestedPerRole[activeRole] ?? []).map(a => a.name),
        }),
      })
      const data = await res.json()
      if (data.reply) {
        setChatMessages(prev => ({
          ...prev,
          [activeRole]: [...(prev[activeRole] ?? []), { text: data.reply, suggestion: data.suggestion }],
        }))
      }
      const pickedNames: string[] = data.actors ?? []
      const picks = pickedNames
        .filter(name => !blockedActors.has(name))
        .map(name => actors.find(a => a.name.toLowerCase() === name.toLowerCase()))
        .filter((a): a is CastActor => Boolean(a))
      setVisibleActors(picks)
      setIsFiltered(true)
      setSuggestedPerRole(prev => {
        const existing = prev[activeRole] ?? []
        const existingNames = new Set(existing.map(a => a.name))
        return { ...prev, [activeRole]: [...existing, ...picks.filter(a => !existingNames.has(a.name))] }
      })
    } catch {}
    finally { setAiLoading(false) }
  }

  async function copyShareLink() {
    const params = new URLSearchParams()
    for (const [role, arr] of Object.entries(selections)) {
      if (arr[0]) params.set(role, arr[0])
    }
    const url = `${window.location.href.split('?')[0]}?${params.toString()}`
    try {
      await navigator.clipboard.writeText(url)
      alert('Link copied to clipboard.')
    } catch {
      alert(url)
    }
  }

  const currentMessages = chatMessages[activeRole] ?? []

  // Filter blocked actors from visible grid
  const displayActors = visibleActors.filter(a => !blockedActors.has(a.name))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#09090b', color: '#f8fafc', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ padding: '14px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
        <div style={{ fontWeight: 900, fontSize: '18px', letterSpacing: '-0.01em' }}>{title}</div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {blockedActors.size > 0 && (
            <button
              onClick={() => setShowBlockedModal(true)}
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', padding: '6px 10px', color: '#f87171', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              🚫 {blockedActors.size} banned
            </button>
          )}
          <div style={{ fontSize: '13px', color: overBudget ? '#f87171' : '#4ade80', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
            ${remaining}M left
          </div>
          <div style={{ width: '80px' }}>
            <div style={{ height: '3px', background: '#27272a', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min((spent / budget) * 100, 100)}%`, background: overBudget ? '#ef4444' : '#22c55e', transition: 'width 0.2s' }} />
            </div>
            <div style={{ fontSize: '10px', color: '#3f3f46', marginTop: '3px', fontVariantNumeric: 'tabular-nums' }}>${spent}M of ${budget}M</div>
          </div>
          <button
            onClick={() => setShowExportCard(true)}
            style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '8px', padding: '7px 13px', color: '#a1a1aa', fontSize: '12px', cursor: 'pointer' }}
          >
            Export card
          </button>
          <button
            onClick={copyShareLink}
            style={{ background: '#f8fafc', border: 'none', borderRadius: '8px', padding: '7px 13px', color: '#09090b', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
          >
            Share ↗
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', flex: 1, minHeight: 0 }}>

        {/* ── Left: Cast board ── */}
        <div style={{ borderRight: '1px solid rgba(255,255,255,0.08)', padding: '20px 18px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#52525b', marginBottom: '4px' }}>
            Cast board
          </div>

          {roles.map(role => {
            const slots = getSlots(role.role_name)
            const primaryName = slots[0]
            const primaryActor = primaryName ? actors.find(a => a.name === primaryName) : undefined

            return (
              <div
                key={role.role_name}
                style={{
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '14px',
                  padding: '12px 14px',
                  background: '#111115',
                }}
              >
                <div style={{ fontSize: '10px', color: '#52525b', marginBottom: '8px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {role.role_name}
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  {/* Original actor */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <div style={{ width: '36px', height: '50px', borderRadius: '6px', background: '#1c1c1e', overflow: 'hidden', flexShrink: 0 }}>
                      {role.original_actor_image ? (
                        <img src={role.original_actor_image} alt={role.original_actor} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3f3f46', fontSize: '14px' }}>?</div>
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: '9px', color: '#3f3f46' }}>Original</div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#52525b', maxWidth: '60px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {role.original_actor}
                      </div>
                    </div>
                  </div>

                  {/* Arrow */}
                  <div style={{ color: '#27272a', fontSize: '14px', flexShrink: 0, paddingTop: '18px' }}>→</div>

                  {/* Slots column */}
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {/* Primary slot */}
                    <CastSlot
                      actor={primaryActor}
                      isDragOver={dragOverSlot?.role === role.role_name && dragOverSlot?.slot === 0}
                      isPrimary
                      onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDragOverSlot({ role: role.role_name, slot: 0 }) }}
                      onDragLeave={() => setDragOverSlot(prev => (prev?.role === role.role_name && prev?.slot === 0) ? null : prev)}
                      onDrop={e => {
                        e.preventDefault()
                        e.stopPropagation()
                        const actorName = e.dataTransfer.getData('text/plain')
                        if (actorName) {
                          assignToSlot(role.role_name, actorName, 0)
                          dropSucceededRef.current = true
                          if (draggingFromSlot && !(draggingFromSlot.role === role.role_name && draggingFromSlot.slot === 0)) {
                            clearSlot(draggingFromSlot.role, draggingFromSlot.slot)
                          }
                        }
                        setDragOverSlot(null)
                      }}
                      draggable={!!primaryName}
                      onSlotDragStart={e => {
                        if (!primaryName) return
                        e.dataTransfer.setData('text/plain', primaryName)
                        e.dataTransfer.effectAllowed = 'move'
                        setDraggingActor(primaryName)
                        setDraggingFromSlot({ role: role.role_name, slot: 0 })
                        dropSucceededRef.current = false
                      }}
                      onSlotDragEnd={() => {
                        if (!dropSucceededRef.current && draggingFromSlot?.role === role.role_name && draggingFromSlot?.slot === 0) {
                          clearSlot(role.role_name, 0)
                        }
                        setDraggingActor(null)
                        setDraggingFromSlot(null)
                      }}
                      onClear={() => clearSlot(role.role_name, 0)}
                    />

                    {/* Possibles row (2nd and 3rd choice) */}
                    <div style={{ display: 'flex', gap: '5px' }}>
                      {[1, 2].map(slot => {
                        const name = slots[slot]
                        const actor = name ? actors.find(a => a.name === name) : undefined
                        const isDragOver = dragOverSlot?.role === role.role_name && dragOverSlot?.slot === slot
                        return (
                          <div
                            key={slot}
                            onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDragOverSlot({ role: role.role_name, slot }) }}
                            onDragLeave={() => setDragOverSlot(prev => (prev?.role === role.role_name && prev?.slot === slot) ? null : prev)}
                            onDrop={e => {
                              e.preventDefault()
                              e.stopPropagation()
                              const actorName = e.dataTransfer.getData('text/plain')
                              if (actorName) {
                                assignToSlot(role.role_name, actorName, slot)
                                dropSucceededRef.current = true
                                if (draggingFromSlot && !(draggingFromSlot.role === role.role_name && draggingFromSlot.slot === slot)) {
                                  clearSlot(draggingFromSlot.role, draggingFromSlot.slot)
                                }
                              }
                              setDragOverSlot(null)
                            }}
                            style={{
                              flex: 1,
                              border: `1px dashed ${isDragOver ? '#6366f1' : actor ? 'rgba(99,102,241,0.3)' : '#1f1f23'}`,
                              borderRadius: '8px',
                              background: isDragOver ? 'rgba(99,102,241,0.08)' : actor ? 'rgba(99,102,241,0.05)' : 'transparent',
                              padding: '4px 6px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                              minHeight: '32px',
                              transition: 'border-color 0.12s, background 0.12s',
                            }}
                          >
                            <span style={{ fontSize: '9px', color: '#3f3f46', flexShrink: 0, fontWeight: 600 }}>{slot + 1}</span>
                            {actor ? (
                              <>
                                <div
                                  draggable
                                  onDragStart={e => {
                                    e.stopPropagation()
                                    e.dataTransfer.setData('text/plain', actor.name)
                                    e.dataTransfer.effectAllowed = 'move'
                                    setDraggingActor(actor.name)
                                    setDraggingFromSlot({ role: role.role_name, slot })
                                    dropSucceededRef.current = false
                                  }}
                                  onDragEnd={() => {
                                    if (!dropSucceededRef.current && draggingFromSlot?.role === role.role_name && draggingFromSlot?.slot === slot) {
                                      clearSlot(role.role_name, slot)
                                    }
                                    setDraggingActor(null)
                                    setDraggingFromSlot(null)
                                  }}
                                  style={{ display: 'flex', alignItems: 'center', gap: '5px', flex: 1, minWidth: 0, cursor: 'grab' }}
                                >
                                  <div style={{ width: '20px', height: '28px', borderRadius: '3px', overflow: 'hidden', flexShrink: 0, background: '#1c1c1e' }}>
                                    {actor.image
                                      ? <img src={actor.image} alt={actor.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }} draggable={false} />
                                      : <div style={{ width: '100%', height: '100%', background: '#27272a' }} />
                                    }
                                  </div>
                                  <span style={{ fontSize: '10px', color: '#94a3b8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{actor.name}</span>
                                </div>
                                <button
                                  onClick={() => clearSlot(role.role_name, slot)}
                                  style={{ background: 'none', border: 'none', color: '#52525b', cursor: 'pointer', fontSize: '12px', lineHeight: 1, padding: '1px', flexShrink: 0 }}
                                >
                                  ×
                                </button>
                              </>
                            ) : (
                              <span style={{ fontSize: '9px', color: '#2a2a2e', fontStyle: 'italic' }}>
                                {isDragOver ? 'drop here' : slot === 1 ? '2nd choice' : '3rd choice'}
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Right: Actor finder ── */}
        <div style={{ padding: '20px 18px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Role selector */}
          <div>
            <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#52525b', marginBottom: '6px' }}>
              Working on
            </div>
            <select
              value={activeRole}
              onChange={e => setActiveRole(e.target.value)}
              style={{ width: '100%', background: '#18181b', border: '1px solid #27272a', borderRadius: '10px', padding: '9px 13px', color: '#f8fafc', fontSize: '14px', fontWeight: 600, outline: 'none', cursor: 'pointer' }}
            >
              {roles.map(r => (
                <option key={r.role_name} value={r.role_name}>{r.role_name}</option>
              ))}
            </select>
          </div>

          {/* AI chat */}
          <div style={{ background: '#111115', border: '1px solid #27272a', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px', minHeight: '80px' }}>
            {aiLoading && currentMessages.length === 0 && (
              <div style={{ fontSize: '13px', color: '#52525b', fontStyle: 'italic' }}>Thinking…</div>
            )}
            {currentMessages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '10px', color: '#3b82f6', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '2px', flexShrink: 0 }}>
                    AI
                  </span>
                  <div style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: 1.55 }}>{msg.text}</div>
                </div>
                {msg.suggestion && (
                  <button
                    onClick={() => { setQuery(msg.suggestion!); handleSearchWithQuery(msg.suggestion!) }}
                    style={{ alignSelf: 'flex-start', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', color: '#60a5fa', cursor: 'pointer', textAlign: 'left', lineHeight: 1.4 }}
                  >
                    💬 {msg.suggestion}
                  </button>
                )}
              </div>
            ))}
            {aiLoading && currentMessages.length > 0 && (
              <div style={{ fontSize: '12px', color: '#52525b', fontStyle: 'italic' }}>Thinking…</div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Search */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSearch() }}
              placeholder='e.g. "young, intense, physical presence"'
              style={{ flex: 1, background: '#18181b', border: '1px solid #27272a', borderRadius: '10px', padding: '9px 13px', color: '#f8fafc', fontSize: '13px', outline: 'none' }}
            />
            <button
              onClick={handleSearch}
              disabled={aiLoading || !query.trim()}
              style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '10px', padding: '9px 16px', fontSize: '13px', fontWeight: 600, cursor: aiLoading || !query.trim() ? 'not-allowed' : 'pointer', opacity: aiLoading || !query.trim() ? 0.5 : 1, flexShrink: 0 }}
            >
              Search
            </button>
            {isFiltered && (
              <button
                onClick={() => { setVisibleActors([]); setIsFiltered(false); setQuery('') }}
                style={{ background: '#27272a', color: '#a1a1aa', border: 'none', borderRadius: '10px', padding: '9px 12px', fontSize: '13px', cursor: 'pointer', flexShrink: 0 }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Count */}
          <div style={{ fontSize: '11px', color: '#3f3f46' }}>
            {aiLoading ? '' : isFiltered ? `${displayActors.length} suggestions — drag to cast` : displayActors.length === 0 ? 'Search or ask Marlowe for suggestions' : `${displayActors.length} actors`}
          </div>

          {/* Actor grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px' }}>
            {displayActors.map((actor, i) => {
              const isAssigned = assignedNames.has(actor.name)
              const isDragging = draggingActor === actor.name
              const isAiPick = isFiltered && i < 8

              return (
                <div
                  key={actor.name}
                  draggable={!isAssigned}
                  onDragStart={e => {
                    if (isAssigned) { e.preventDefault(); return }
                    e.dataTransfer.setData('text/plain', actor.name)
                    e.dataTransfer.effectAllowed = 'move'
                    setDraggingActor(actor.name)
                    setDraggingFromSlot(null)
                    dropSucceededRef.current = false
                  }}
                  onDragEnd={() => setDraggingActor(null)}
                  style={{
                    border: `1px solid ${isAiPick ? 'rgba(59,130,246,0.45)' : '#27272a'}`,
                    borderRadius: '10px',
                    overflow: 'hidden',
                    background: isAssigned ? '#0d0d0f' : isAiPick ? 'rgba(15,26,48,1)' : '#18181b',
                    opacity: isAssigned ? 0.3 : isDragging ? 0.35 : 1,
                    cursor: isAssigned ? 'default' : 'grab',
                    transition: 'opacity 0.15s',
                    userSelect: 'none',
                    position: 'relative',
                  }}
                >
                  <div style={{ aspectRatio: '2/3', background: '#111115', overflow: 'hidden' }}>
                    {actor.image ? (
                      <img
                        src={actor.image}
                        alt={actor.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }}
                        draggable={false}
                      />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3f3f46', fontSize: '11px' }}>
                        No photo
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '7px 8px 8px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: isAssigned ? '#3f3f46' : '#f1f5f9', lineHeight: 1.3, marginBottom: '2px' }}>
                      {actor.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ fontSize: '10px', color: '#52525b', fontVariantNumeric: 'tabular-nums' }}>
                        ${actor.cost}M{!actor.salaryConfirmed && <span style={{ fontSize: '9px' }}> est</span>}
                      </div>
                      {!isAssigned && (
                        <button
                          onClick={e => { e.stopPropagation(); setConfirmBan(actor.name) }}
                          title={`Ban ${actor.name} from your talent pool`}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0', fontSize: '11px', lineHeight: 1, color: '#3f3f46', opacity: 0.6 }}
                        >
                          🚫
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Passed on */}
          {(() => {
            const primaryName = getSlots(activeRole)[0]
            const passed = (suggestedPerRole[activeRole] ?? []).filter(a =>
              a.name !== primaryName &&
              !blockedActors.has(a.name) &&
              !displayActors.find(v => v.name === a.name)
            )
            if (passed.length === 0) return null
            return (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '14px' }}>
                <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#3f3f46', marginBottom: '10px' }}>
                  Passed on · Second look?
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {passed.map(actor => (
                    <button
                      key={actor.name}
                      onClick={() => assignToSlot(activeRole, actor.name, 0)}
                      title={`Cast ${actor.name} as ${activeRole}`}
                      style={{ display: 'flex', alignItems: 'center', gap: '7px', background: '#111115', border: '1px solid #27272a', borderRadius: '8px', padding: '5px 9px 5px 5px', cursor: 'pointer' }}
                    >
                      <div style={{ width: '28px', height: '28px', borderRadius: '4px', overflow: 'hidden', flexShrink: 0, background: '#1c1c1e' }}>
                        {actor.image
                          ? <img src={actor.image} alt={actor.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3f3f46', fontSize: '9px' }}>?</div>
                        }
                      </div>
                      <span style={{ fontSize: '11px', color: '#71717a', whiteSpace: 'nowrap' }}>{actor.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )
          })()}
        </div>
      </div>

      {/* Export card modal */}
      {showExportCard && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
          onClick={() => setShowExportCard(false)}
        >
          <div
            style={{ background: '#111115', border: '1px solid #27272a', borderRadius: '16px', padding: '28px', width: '380px', maxHeight: '80vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#3b82f6', marginBottom: '10px' }}>
              Wilderleague
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, marginBottom: '20px' }}>
              {title}
            </div>

            {roles.map(role => {
              const slots = getSlots(role.role_name)
              const primaryName = slots[0]
              const primaryActor = primaryName ? actors.find(a => a.name === primaryName) : undefined
              const possibles = slots.slice(1).filter(Boolean).map(n => actors.find(a => a.name === n)).filter(Boolean) as CastActor[]
              return (
                <div
                  key={role.role_name}
                  style={{ padding: '10px 0', borderBottom: '1px solid #1c1c1e' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '10px', color: '#52525b', marginBottom: '2px' }}>{role.role_name}</div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: primaryName ? '#f1f5f9' : '#3f3f46', fontStyle: primaryName ? 'normal' : 'italic' }}>
                        {primaryName ?? 'Uncast'}
                      </div>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: primaryActor ? '#4ade80' : '#27272a', fontVariantNumeric: 'tabular-nums' }}>
                      {primaryActor ? <>{`$${primaryActor.cost}M`}{!primaryActor.salaryConfirmed && <span style={{ fontSize: '10px', fontWeight: 400, color: '#3f3f46' }}> est</span>}</> : '—'}
                    </div>
                  </div>
                  {possibles.length > 0 && (
                    <div style={{ marginTop: '4px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {possibles.map((a, i) => (
                        <span key={a.name} style={{ fontSize: '10px', color: '#52525b' }}>
                          {i + 2}. {a.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: overBudget ? '#f87171' : '#4ade80', fontVariantNumeric: 'tabular-nums' }}>
                ${spent}M / ${budget}M
              </div>
              <button
                onClick={copyShareLink}
                style={{ background: '#f8fafc', border: 'none', borderRadius: '8px', padding: '8px 14px', color: '#09090b', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
              >
                Copy share link ↗
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ban confirmation dialog */}
      {confirmBan && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}
          onClick={() => setConfirmBan(null)}
        >
          <div
            style={{ background: '#111115', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '16px', padding: '28px 28px 24px', width: '340px', textAlign: 'center' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: '28px', marginBottom: '12px' }}>🚫</div>
            <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px', lineHeight: 1.4 }}>
              Ban {confirmBan}?
            </div>
            <div style={{ fontSize: '13px', color: '#71717a', marginBottom: '24px', lineHeight: 1.5 }}>
              They won't appear in any suggestion grid. You can unban them any time from the banned actors list.
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setConfirmBan(null)}
                style={{ flex: 1, background: '#18181b', border: '1px solid #27272a', borderRadius: '10px', padding: '10px', fontSize: '13px', color: '#a1a1aa', cursor: 'pointer', fontWeight: 600 }}
              >
                Cancel
              </button>
              <button
                onClick={() => { blockActor(confirmBan); setConfirmBan(null) }}
                style={{ flex: 1, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '10px', padding: '10px', fontSize: '13px', color: '#f87171', cursor: 'pointer', fontWeight: 700 }}
              >
                Ban permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Blocked actors modal */}
      {showBlockedModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
          onClick={() => setShowBlockedModal(false)}
        >
          <div
            style={{ background: '#111115', border: '1px solid #27272a', borderRadius: '16px', padding: '24px', width: '360px', maxHeight: '70vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700 }}>Banned actors</div>
              <button onClick={() => setShowBlockedModal(false)} style={{ background: 'none', border: 'none', color: '#52525b', fontSize: '18px', cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ fontSize: '12px', color: '#52525b', marginBottom: '14px' }}>
              These actors won't appear in any suggestion grid. Click to unblock.
            </div>
            {blockedActors.size === 0 ? (
              <div style={{ fontSize: '13px', color: '#3f3f46', fontStyle: 'italic' }}>No one blocked yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {[...blockedActors].sort().map(name => {
                  const actor = actors.find(a => a.name === name)
                  return (
                    <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', background: '#18181b', borderRadius: '8px' }}>
                      {actor?.image && (
                        <div style={{ width: '28px', height: '28px', borderRadius: '4px', overflow: 'hidden', flexShrink: 0 }}>
                          <img src={actor.image} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        </div>
                      )}
                      <span style={{ flex: 1, fontSize: '13px', color: '#94a3b8' }}>{name}</span>
                      <button
                        onClick={() => unblockActor(name)}
                        style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', color: '#60a5fa', cursor: 'pointer' }}
                      >
                        Unblock
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )

  async function handleSearchWithQuery(q: string) {
    if (!q.trim()) return
    setVisibleActors([])
    setAiLoading(true)
    const role = roles.find(r => r.role_name === activeRole)
    try {
      const res = await fetch('/api/role-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'search',
          role: activeRole,
          movie: title,
          originalActor: role?.original_actor ?? '',
          query: q,
          excludeActors: (suggestedPerRole[activeRole] ?? []).map(a => a.name),
        }),
      })
      const data = await res.json()
      if (data.reply) {
        setChatMessages(prev => ({
          ...prev,
          [activeRole]: [...(prev[activeRole] ?? []), { text: data.reply, suggestion: data.suggestion }],
        }))
      }
      if (data.actors?.length) {
        const picks = (data.actors as string[])
          .filter(name => !blockedActors.has(name))
          .map(name => actors.find(a => a.name.toLowerCase() === name.toLowerCase()))
          .filter((a): a is CastActor => Boolean(a))
        setVisibleActors(picks)
        setIsFiltered(true)
        setSuggestedPerRole(prev => {
          const existing = prev[activeRole] ?? []
          const existingNames = new Set(existing.map(a => a.name))
          return { ...prev, [activeRole]: [...existing, ...picks.filter(a => !existingNames.has(a.name))] }
        })
      }
    } catch {}
    finally { setAiLoading(false) }
  }
}

// ── CastSlot component ──
type CastSlotProps = {
  actor: CastActor | undefined
  isDragOver: boolean
  isPrimary: boolean
  onDragOver: React.DragEventHandler
  onDragLeave: React.DragEventHandler
  onDrop: React.DragEventHandler
  draggable: boolean
  onSlotDragStart: React.DragEventHandler
  onSlotDragEnd: React.DragEventHandler
  onClear: () => void
}

function CastSlot({ actor, isDragOver, isPrimary, onDragOver, onDragLeave, onDrop, draggable, onSlotDragStart, onSlotDragEnd, onClear }: CastSlotProps) {
  if (actor) {
    return (
      <div
        draggable={draggable}
        onDragStart={onSlotDragStart}
        onDragEnd={onSlotDragEnd}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          border: `1px solid ${isDragOver ? '#3b82f6' : 'rgba(255,255,255,0.1)'}`,
          borderRadius: '8px',
          padding: '6px 8px',
          background: isDragOver ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.02)',
          cursor: draggable ? 'grab' : 'default',
          transition: 'border-color 0.12s',
        }}
      >
        <div style={{ width: '36px', height: '50px', borderRadius: '5px', overflow: 'hidden', flexShrink: 0, background: '#1c1c1e' }}>
          {actor.image
            ? <img src={actor.image} alt={actor.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }} draggable={false} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3f3f46', fontSize: '10px' }}>?</div>
          }
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '11px', color: '#4ade80', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
            ${actor.cost}M{!actor.salaryConfirmed && <span style={{ color: '#3f3f46', fontWeight: 400 }}> est</span>}
          </div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {actor.name}
          </div>
          {isPrimary && (
            <div style={{ fontSize: '9px', color: '#52525b', marginTop: '1px' }}>drag away to remove</div>
          )}
        </div>
        <button
          onClick={e => { e.stopPropagation(); onClear() }}
          title="Remove"
          style={{
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: '6px',
            color: '#f87171',
            cursor: 'pointer',
            fontSize: '14px',
            lineHeight: 1,
            padding: '4px 7px',
            flexShrink: 0,
            fontWeight: 700,
          }}
        >
          ×
        </button>
      </div>
    )
  }

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      style={{
        height: '50px',
        borderRadius: '8px',
        border: `1px dashed ${isDragOver ? '#3b82f6' : '#27272a'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '11px',
        color: isDragOver ? '#60a5fa' : '#3f3f46',
        fontStyle: 'italic',
        background: isDragOver ? 'rgba(59,130,246,0.06)' : 'transparent',
        transition: 'border-color 0.12s, background 0.12s',
      }}
    >
      {isDragOver ? 'drop here' : '1st choice — drag here'}
    </div>
  )
}
