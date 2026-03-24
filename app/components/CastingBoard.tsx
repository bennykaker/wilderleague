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
}

export default function CastingBoard({ actors, roles, title, budget }: Props) {
  const [selections, setSelections] = useState<Record<string, string>>({})
  const [activeRole, setActiveRole] = useState(roles[0]?.role_name ?? '')
  const [dragOverRole, setDragOverRole] = useState<string | null>(null)
  const [draggingActor, setDraggingActor] = useState<string | null>(null)
  const [chatMessages, setChatMessages] = useState<Record<string, ChatMsg[]>>({})
  const [aiLoading, setAiLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [visibleActors, setVisibleActors] = useState<CastActor[]>([])
  const [isFiltered, setIsFiltered] = useState(false)
  const [showExportCard, setShowExportCard] = useState(false)
  const [suggestedPerRole, setSuggestedPerRole] = useState<Record<string, CastActor[]>>({})
  const chatEndRef = useRef<HTMLDivElement>(null)

  const assignedNames = new Set(Object.values(selections).filter(Boolean))

  const spent = Object.values(selections).reduce((sum, name) => {
    return sum + (actors.find(a => a.name === name)?.cost ?? 0)
  }, 0)
  const remaining = budget - spent
  const overBudget = remaining < 0

  // Fetch role description when active role changes
  useEffect(() => {
    setQuery('')
    setIsFiltered(false)
    setVisibleActors([])
    setChatMessages(prev => ({ ...prev, [activeRole]: [] }))

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

  // Scroll chat to bottom when messages change
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

  function assignActorToRole(roleName: string, actorName: string) {
    setSelections(prev => {
      const next: Record<string, string> = {}
      for (const [r, a] of Object.entries(prev)) {
        if (a !== actorName) next[r] = a
      }
      next[roleName] = actorName
      return next
    })
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
          // Switch to the role that was just cast to show the reaction
          setActiveRole(roleName)
        }
      })
      .catch(() => {})
  }

  function clearRole(roleName: string) {
    setSelections(prev => {
      const next = { ...prev }
      delete next[roleName]
      return next
    })
  }

  async function copyShareLink() {
    const params = new URLSearchParams()
    for (const [role, name] of Object.entries(selections)) {
      if (name) params.set(role, name)
    }
    const url = `${window.location.origin}/matrix?${params.toString()}`
    try {
      await navigator.clipboard.writeText(url)
      alert('Link copied to clipboard.')
    } catch {
      alert(url)
    }
  }

  const currentMessages = chatMessages[activeRole] ?? []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#09090b', color: '#f8fafc', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ padding: '14px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
        <div style={{ fontWeight: 900, fontSize: '18px', letterSpacing: '-0.01em' }}>{title}</div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
      <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', flex: 1, minHeight: 0 }}>

        {/* ── Left: Cast board ── */}
        <div style={{ borderRight: '1px solid rgba(255,255,255,0.08)', padding: '20px 18px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#52525b', marginBottom: '4px' }}>
            Cast board
          </div>

          {roles.map(role => {
            const castActorName = selections[role.role_name]
            const castActor = castActorName ? actors.find(a => a.name === castActorName) : undefined
            const isDragOver = dragOverRole === role.role_name

            return (
              <div
                key={role.role_name}
                onDragOver={e => { e.preventDefault(); setDragOverRole(role.role_name) }}
                onDragEnter={e => { e.preventDefault(); setDragOverRole(role.role_name) }}
                onDragLeave={() => setDragOverRole(prev => prev === role.role_name ? null : prev)}
                onDrop={e => {
                  e.preventDefault()
                  const actorName = e.dataTransfer.getData('text/plain')
                  if (actorName) assignActorToRole(role.role_name, actorName)
                  setDragOverRole(null)
                }}
                style={{
                  border: `1px solid ${isDragOver ? '#3b82f6' : 'rgba(255,255,255,0.07)'}`,
                  borderRadius: '14px',
                  padding: '12px 14px',
                  background: isDragOver ? 'rgba(59,130,246,0.08)' : '#111115',
                  transition: 'border-color 0.12s, background 0.12s',
                }}
              >
                <div style={{ fontSize: '10px', color: '#52525b', marginBottom: '8px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {role.role_name}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>

                  {/* Original actor */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                    <div style={{ width: '40px', height: '56px', borderRadius: '6px', background: '#1c1c1e', overflow: 'hidden', flexShrink: 0 }}>
                      {role.original_actor_image ? (
                        <img
                          src={role.original_actor_image}
                          alt={role.original_actor}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3f3f46', fontSize: '16px' }}>?</div>
                      )}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '10px', color: '#3f3f46' }}>Original</div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#71717a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {role.original_actor}
                      </div>
                    </div>
                  </div>

                  {/* Arrow */}
                  <div style={{ color: '#27272a', fontSize: '14px', flexShrink: 0 }}>→</div>

                  {/* New cast slot */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {castActor ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '40px', height: '56px', borderRadius: '6px', background: '#1c1c1e', overflow: 'hidden', flexShrink: 0 }}>
                          {castActor.image ? (
                            <img
                              src={castActor.image}
                              alt={castActor.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3f3f46', fontSize: '10px' }}>?</div>
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '11px', color: '#4ade80', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>${castActor.cost}M{!castActor.salaryConfirmed && <span style={{ color: '#3f3f46', fontWeight: 400 }}> est</span>}</div>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {castActor.name}
                          </div>
                        </div>
                        <button
                          onClick={() => clearRole(role.role_name)}
                          style={{ background: 'none', border: 'none', color: '#3f3f46', cursor: 'pointer', fontSize: '18px', lineHeight: 1, padding: '2px', flexShrink: 0 }}
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div style={{
                        height: '56px',
                        borderRadius: '6px',
                        border: `1px dashed ${isDragOver ? '#3b82f6' : '#27272a'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        color: isDragOver ? '#60a5fa' : '#3f3f46',
                        fontStyle: 'italic',
                      }}>
                        {isDragOver ? 'drop here' : 'drag here'}
                      </div>
                    )}
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
            {aiLoading ? '' : isFiltered ? `${visibleActors.length} suggestions — drag to cast` : visibleActors.length === 0 ? 'Search or ask Marlowe for suggestions' : `${visibleActors.length} actors`}
          </div>

          {/* Actor grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px', minHeight: visibleActors.length === 0 && !aiLoading ? '0' : undefined }}>
            {visibleActors.map((actor, i) => {
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
                  <div style={{ padding: '8px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: isAssigned ? '#3f3f46' : '#f1f5f9', lineHeight: 1.3, marginBottom: '2px' }}>
                      {actor.name}
                    </div>
                    <div style={{ fontSize: '10px', color: '#52525b', fontVariantNumeric: 'tabular-nums' }}>
                      ${actor.cost}M{!actor.salaryConfirmed && <span style={{ fontSize: '9px' }}> est</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          {/* Passed on */}
          {(() => {
            const castInRole = selections[activeRole]
            const passed = (suggestedPerRole[activeRole] ?? []).filter(a => a.name !== castInRole && !visibleActors.find(v => v.name === a.name))
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
                      onClick={() => assignActorToRole(activeRole, actor.name)}
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
            style={{ background: '#111115', border: '1px solid #27272a', borderRadius: '16px', padding: '28px', width: '360px' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#3b82f6', marginBottom: '10px' }}>
              Wilderleague
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, marginBottom: '20px' }}>
              {title}
            </div>

            {roles.map(role => {
              const actorName = selections[role.role_name]
              const actor = actorName ? actors.find(a => a.name === actorName) : undefined
              return (
                <div
                  key={role.role_name}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #1c1c1e' }}
                >
                  <div>
                    <div style={{ fontSize: '10px', color: '#52525b', marginBottom: '2px' }}>{role.role_name}</div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: actorName ? '#f1f5f9' : '#3f3f46', fontStyle: actorName ? 'normal' : 'italic' }}>
                      {actorName ?? 'Uncast'}
                    </div>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: actor ? '#4ade80' : '#27272a', fontVariantNumeric: 'tabular-nums' }}>
                    {actor ? <>{`$${actor.cost}M`}{!actor.salaryConfirmed && <span style={{ fontSize: '10px', fontWeight: 400, color: '#3f3f46' }}> est</span>}</> : '—'}
                  </div>
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
