'use client'

import { useState, useEffect, useRef } from 'react'
import AdBanner from './AdBanner'

export type CastActor = {
  id: string
  name: string
  image: string
  popularity: number
  cost: number
  salaryConfirmed?: boolean
  knownFor?: string
  biography?: string
  universeTags?: string[]
}

type MarloweCache = { reply: string; actors: string[]; suggestion: string | null }

export type CastRole = {
  role_name: string
  original_actor: string | null
  original_actor_image?: string | null
  tier?: string
  role_description?: string | null
  marlowe_cache?: MarloweCache | null
  marlowe_quick?: Record<string, MarloweCache> | null
}

type ChatMsg = {
  text: string
  suggestion?: string | null
}

type ChallengeInfo = {
  id: string
  label: string
  headline: string
  description: string
  badge: string
}

type Props = {
  actors: CastActor[]
  roles: CastRole[]
  title: string
  slug: string
  budget: number
  preloadedSuggestions?: Record<string, string[]>
  challenge?: ChallengeInfo
  isMember?: boolean
  isDirector?: boolean
}

// Per role: [primary, 2nd choice, 3rd choice]
type Selections = Record<string, string[]>

function uniqueByName(arr: CastActor[]): CastActor[] {
  const seen = new Set<string>()
  return arr.filter(a => { if (seen.has(a.name)) return false; seen.add(a.name); return true })
}

export default function CastingBoard({ actors, roles, title, slug, budget, preloadedSuggestions = {}, challenge, isMember = false, isDirector = false }: Props) {
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
  const [showReview, setShowReview] = useState(false)
  const [reviewLoading, setReviewLoading] = useState(false)
  const [reviewData, setReviewData] = useState<{ director: { verdict: string; notes: string }; execProducer: { verdict: string; notes: string }; marketer: { verdict: string; notes: string } } | null>(null)
  const [suggestedPerRole, setSuggestedPerRole] = useState<Record<string, CastActor[]>>({})
  const [blockedActors, setBlockedActors] = useState<Set<string>>(new Set())
  const [hoveredActor, setHoveredActor] = useState<{ actor: CastActor; rect: DOMRect } | null>(null)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [scoreLoading, setScoreLoading] = useState(false)
  const [scoreResult, setScoreResult] = useState<{ ai_summary: string; green_light_score: number; quality_score: number; hear_me_out_score: number; award: string | null; cached: boolean } | null>(null)
  const [showAllPassed, setShowAllPassed] = useState(false)
  const [expandedMessages, setExpandedMessages] = useState<Set<number>>(new Set())
  const [showMarloweFirst, setShowMarloweFirst] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [showDeepDive, setShowDeepDive] = useState(false)
  const [deepDiveQuery, setDeepDiveQuery] = useState('')
  const [deepDiveLoading, setDeepDiveLoading] = useState(false)
  const [deepDiveRemaining, setDeepDiveRemaining] = useState<number | null>(null)
  const [deepDiveActors, setDeepDiveActors] = useState<CastActor[]>([])
  const [extraActors, setExtraActors] = useState<CastActor[]>([])
  const [chatRemaining, setChatRemaining] = useState<number | null>(null)
  const [chatLimitReached, setChatLimitReached] = useState(false)
  const [useSonnet, setUseSonnet] = useState(false)
  const [sonnetLimitReached, setSonnetLimitReached] = useState(false)
  const [manualSearch, setManualSearch] = useState('')
  const [isCached, setIsCached] = useState(false)
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const dropSucceededRef = useRef(false)
  // Pre-fetched describe results keyed by role name
  const prefetchedRef = useRef<Record<string, { reply: string; actors: string[]; suggestion: string | null; remaining?: number } | 'loading' | 'error'>>({})
  const prefetchFiredRef = useRef(false)

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

  // Merge server actors with any deep-dive additions for this session
  const allActors = extraActors.length > 0
    ? [...actors, ...extraActors.filter(e => !actors.find(a => a.name === e.name))]
    : actors

  // All actor names assigned to any slot across all roles
  const assignedNames = new Set(
    Object.values(selections).flatMap(arr => arr).filter(Boolean)
  )

  // Budget only counts primary (slot 0) choices
  const spent = Object.values(selections).reduce((sum, arr) => {
    const name = arr[0]
    return sum + (name ? (allActors.find(a => a.name === name)?.cost ?? 0) : 0)
  }, 0)
  const remaining = budget - spent
  const overBudget = remaining < 0
  const allRolesFilled = roles.every(r => (selections[r.role_name]?.[0] ?? '') !== '')

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
      const actor = allActors.find(a => a.name === actorName)
      fetch('/api/role-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'react',
          role: roleName,
          movie: title,
          originalActor: role?.original_actor ?? '',
          roleDescription: role?.role_description ?? null,
          roleTier: role?.tier,
          budget,
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

  // Helper: apply a prefetched describe result to state
  function applyDescribeResult(roleName: string, data: { reply: string; actors: string[]; suggestion: string | null; remaining?: number }) {
    if (data.remaining != null) setChatRemaining(data.remaining)
    setChatMessages(prev => ({
      ...prev,
      [roleName]: [{ text: data.reply || 'No response from AI.', suggestion: data.suggestion ?? null }],
    }))
    if (data.actors?.length) {
      const picks = data.actors
        .filter((name: string) => !blockedActors.has(name))
        .map((name: string) => actors.find(a => a.name === name))
        .filter((a): a is CastActor => Boolean(a))
      setVisibleActors(uniqueByName(picks))
      setIsFiltered(true)
      setSuggestedPerRole(prev => {
        const existing = prev[roleName] ?? []
        const existingNames = new Set(existing.map(a => a.name))
        return { ...prev, [roleName]: [...existing, ...picks.filter(a => !existingNames.has(a.name))] }
      })
    }
  }

  // Pre-fetch all role descriptions in parallel on mount
  useEffect(() => {
    if (prefetchFiredRef.current || challenge) return
    prefetchFiredRef.current = true

    // Seed the prefetch cache from DB-stored marlowe_cache first (instant, no API call)
    for (const role of roles) {
      if (role.marlowe_cache) {
        prefetchedRef.current[role.role_name] = { ...role.marlowe_cache, remaining: undefined }
      }
    }

    // Apply DB cache to the initial active role immediately
    const firstRole = roles.find(r => r.role_name === activeRole)
    if (firstRole?.marlowe_cache) {
      applyDescribeResult(activeRole, { ...firstRole.marlowe_cache, remaining: undefined })
      setIsCached(true)
      setAiLoading(false)
    }

    // Only fetch from API for roles that have no DB cache
    const rolesToFetch = roles.filter(r => !r.marlowe_cache && !(preloadedSuggestions[r.role_name]?.length))
    for (const role of rolesToFetch) {
      prefetchedRef.current[role.role_name] = 'loading'
      fetch('/api/role-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'describe',
          role: role.role_name,
          movie: title,
          movieSlug: slug,
          originalActor: role.original_actor,
          roleDescription: role.role_description ?? null,
          roleTier: role.tier,
          budget,
          useSonnet: false,
        }),
      })
        .then(r => r.json())
        .then(data => {
          if (data.limitReached) { setChatLimitReached(true); prefetchedRef.current[role.role_name] = 'error'; return }
          if (data.remaining != null) setChatRemaining(data.remaining)
          prefetchedRef.current[role.role_name] = { reply: data.reply ?? '', actors: data.actors ?? [], suggestion: data.suggestion ?? null, remaining: data.remaining }
          if (role.role_name === activeRole) {
            applyDescribeResult(role.role_name, prefetchedRef.current[role.role_name] as any)
            setAiLoading(false)
          }
        })
        .catch(() => { prefetchedRef.current[role.role_name] = 'error' })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
      setVisibleActors(uniqueByName(picks))
      setIsFiltered(true)
      setSuggestedPerRole(prev => ({ ...prev, [activeRole]: picks }))
      setAiLoading(false)
      return
    } else if (challenge) {
      const available = actors.filter(a => !blockedActors.has(a.name))
      setVisibleActors(available)
      setIsFiltered(true)
      setSuggestedPerRole(prev => ({ ...prev, [activeRole]: available }))
      return
    } else {
      setVisibleActors([])
    }

    const role = roles.find(r => r.role_name === activeRole)
    if (!role) return

    // Check if already prefetched
    const cached = prefetchedRef.current[activeRole]
    if (cached && cached !== 'loading' && cached !== 'error') {
      applyDescribeResult(activeRole, cached)
      setAiLoading(false)
      return
    }

    // Still loading from prefetch — wait for it (show spinner, prefetch will apply when done)
    if (cached === 'loading') {
      setAiLoading(true)
      return
    }

    // Not prefetched (e.g. challenge mode or error) — fetch now
    setAiLoading(true)
    let cancelled = false

    fetch('/api/role-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'describe',
        role: activeRole,
        movie: title,
        movieSlug: slug,
        originalActor: role.original_actor,
        roleTier: role.tier,
        budget,
        actors: actors.map(a => a.name),
        useSonnet,
      }),
    })
      .then(r => r.json())
      .then(data => {
        if (cancelled) return
        if (data.limitReached) { setChatLimitReached(true); setAiLoading(false); return }
        if (data.sonnetLimitReached) { setSonnetLimitReached(true) }
        if (data.remaining != null) setChatRemaining(data.remaining)
        applyDescribeResult(activeRole, { reply: data.reply ?? '', actors: data.actors ?? [], suggestion: data.suggestion ?? null, remaining: data.remaining })
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
    const container = chatContainerRef.current
    if (container) container.scrollTop = container.scrollHeight
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
          movieSlug: slug,
          originalActor: role?.original_actor ?? '',
          roleTier: role?.tier,
          budget,
          query,
          excludeActors: (suggestedPerRole[activeRole] ?? []).map(a => a.name),
          useSonnet,
        }),
      })
      const data = await res.json()
      if (data.limitReached) { setChatLimitReached(true); return }
      if (data.sonnetLimitReached) setSonnetLimitReached(true)
      if (data.remaining != null) setChatRemaining(data.remaining)
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
      setVisibleActors(uniqueByName(picks))
      setIsFiltered(true)
      setSuggestedPerRole(prev => {
        const existing = prev[activeRole] ?? []
        const existingNames = new Set(existing.map(a => a.name))
        return { ...prev, [activeRole]: [...existing, ...picks.filter(a => !existingNames.has(a.name))] }
      })
      setQuery('')
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

  async function handleCastReview() {
    setReviewLoading(true)
    setShowReview(true)
    setReviewData(null)
    const cast = roles
      .map(r => {
        const name = getSlots(r.role_name)[0]
        if (!name) return null
        const actor = allActors.find(a => a.name === name)
        return { role: r.role_name, tier: r.tier ?? 'supporting', originalActor: r.original_actor, newActor: name, cost: actor?.cost ?? 0, salaryConfirmed: actor?.salaryConfirmed ?? false }
      })
      .filter(Boolean) as { role: string; tier: string; originalActor: string; newActor: string; cost: number; salaryConfirmed: boolean }[]
    const uncastRoles = roles.filter(r => !getSlots(r.role_name)[0]).map(r => r.role_name)
    try {
      const res = await fetch('/api/cast-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movie: title, budget, spent, cast, uncastRoles }),
      })
      const data = await res.json()
      setReviewData(data)
    } catch { setReviewData(null) }
    finally { setReviewLoading(false) }
  }

  const currentMessages = chatMessages[activeRole] ?? []

  async function handleDeepDive() {
    if (!deepDiveQuery.trim()) return
    setDeepDiveLoading(true)
    const excludeNames = actors.map(a => a.name)
    try {
      const res = await fetch('/api/deep-dive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: deepDiveQuery, excludeNames }),
      })
      const data = await res.json()
      if (!res.ok) { alert(data.error ?? 'Deep dive failed'); return }
      setDeepDiveActors(data.actors ?? [])
      if (data.remaining != null) setDeepDiveRemaining(data.remaining)
    } catch { alert('Deep dive failed. Try again.') }
    finally { setDeepDiveLoading(false) }
  }

  // Filter blocked actors from visible grid
  const displayActors = visibleActors.filter(a => !blockedActors.has(a.name))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#09090b', color: '#f8fafc', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ padding: '14px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#a1a1aa', fontSize: '14px', fontWeight: 600, textDecoration: 'none', flexShrink: 0 }}>
          ← All titles
        </a>
        <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />
        <div style={{ fontWeight: 900, fontSize: '18px', letterSpacing: '-0.01em' }}>{title}</div>
        <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />
        <a href="/marlowe" style={{ color: '#3b82f6', fontSize: '14px', fontWeight: 600, textDecoration: 'none', flexShrink: 0 }}>
          Meet Marlowe
        </a>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {blockedActors.size > 0 && (
            <button
              onClick={() => setShowBlockedModal(true)}
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', padding: '6px 10px', color: '#f87171', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              🚫 {blockedActors.size} banned
            </button>
          )}
          <div style={{ fontSize: '14px', color: overBudget ? '#f87171' : '#4ade80', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
            ${remaining}M left
          </div>
          <div style={{ width: '80px' }}>
            <div style={{ height: '3px', background: '#27272a', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min((spent / budget) * 100, 100)}%`, background: overBudget ? '#ef4444' : '#22c55e', transition: 'width 0.2s' }} />
            </div>
            <div style={{ fontSize: '14px', color: '#a1a1aa', marginTop: '3px', fontVariantNumeric: 'tabular-nums' }}>${spent}M of ${budget}M</div>
          </div>
          <button
            onClick={handleScore}
            disabled={!allRolesFilled || scoreLoading}
            title={allRolesFilled ? 'Score your cast with AI' : 'Fill all roles to score'}
            style={{ background: allRolesFilled ? 'rgba(251,191,36,0.1)' : '#18181b', border: `1px solid ${allRolesFilled ? 'rgba(251,191,36,0.35)' : '#27272a'}`, borderRadius: '8px', padding: '7px 13px', color: allRolesFilled ? '#fbbf24' : '#52525b', fontSize: '14px', fontWeight: 600, cursor: allRolesFilled ? 'pointer' : 'not-allowed' }}
          >
            {scoreLoading ? 'Scoring…' : 'Score my cast'}
          </button>
          <button
            onClick={() => {
              if (Object.keys(selections).length === 0) return
              if (!isDirector) { setShowUpgradeModal(true); return }
              setShowMarloweFirst(true)
            }}
            disabled={Object.keys(selections).length === 0 || reviewLoading}
            style={{ background: Object.keys(selections).length > 0 ? 'rgba(139,92,246,0.15)' : '#18181b', border: `1px solid ${Object.keys(selections).length > 0 ? 'rgba(139,92,246,0.4)' : '#27272a'}`, borderRadius: '8px', padding: '7px 13px', color: Object.keys(selections).length > 0 ? '#a78bfa' : '#52525b', fontSize: '14px', fontWeight: 600, cursor: Object.keys(selections).length > 0 ? 'pointer' : 'not-allowed' }}
          >
            {reviewLoading ? 'Reading the room…' : isDirector ? 'Production Meeting' : '🔒 Production Meeting'}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!allRolesFilled || submitLoading}
            title={allRolesFilled ? 'Submit your cast to the vote' : 'Fill all roles to submit'}
            style={{ background: allRolesFilled ? 'rgba(34,197,94,0.12)' : '#18181b', border: `1px solid ${allRolesFilled ? 'rgba(34,197,94,0.35)' : '#27272a'}`, borderRadius: '8px', padding: '7px 13px', color: allRolesFilled ? '#4ade80' : '#52525b', fontSize: '14px', fontWeight: 600, cursor: allRolesFilled ? 'pointer' : 'not-allowed' }}
          >
            {submitLoading ? 'Submitting…' : 'Submit cast ↑'}
          </button>
          <button
            onClick={() => setShowExportCard(true)}
            style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '8px', padding: '7px 13px', color: '#a1a1aa', fontSize: '14px', cursor: 'pointer' }}
          >
            Export card
          </button>
          <button
            onClick={copyShareLink}
            style={{ background: '#f8fafc', border: 'none', borderRadius: '8px', padding: '7px 13px', color: '#09090b', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}
          >
            Share ↗
          </button>
        </div>
      </div>

      {/* Challenge banner */}
      {challenge && (
        <div style={{ padding: '10px 24px', background: 'rgba(251,191,36,0.07)', borderBottom: '1px solid rgba(251,191,36,0.2)', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          <span style={{ fontSize: '20px' }}>{challenge.badge}</span>
          <div>
            <span style={{ fontSize: '14px', color: '#fbbf24', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginRight: '10px' }}>{challenge.label}</span>
            <span style={{ fontSize: '14px', color: '#fef3c7', fontWeight: 700 }}>{challenge.headline}</span>
          </div>
          <div style={{ fontSize: '14px', color: '#d97706', marginLeft: '4px' }}>— {challenge.description}</div>
        </div>
      )}

      {/* Body */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', flex: 1, minHeight: 0, overflow: 'hidden' }}>

        {/* ── Left: Cast board ── */}
        <div style={{ borderRight: '1px solid rgba(255,255,255,0.08)', padding: '20px 24px', overflowY: 'auto', minHeight: 0 }}>
          <div style={{ fontSize: '14px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '12px' }}>
            Cast board
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))', gap: '14px' }}>
          {roles.map(role => {
            const slots = getSlots(role.role_name)
            const primaryName = slots[0]
            const primaryActor = primaryName ? actors.find(a => a.name === primaryName) : undefined

            return (
              <div
                key={role.role_name}
                onClick={() => setActiveRole(role.role_name)}
                style={{
                  border: `1px solid ${activeRole === role.role_name ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.13)'}`,
                  borderRadius: '16px',
                  padding: '18px 20px',
                  background: activeRole === role.role_name ? '#1a2035' : '#22222e',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                  <div style={{ fontSize: '16px', color: '#e2e8f0', letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 800 }}>
                    {role.role_name}
                  </div>
                  {role.tier && (
                    <div style={{
                      fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: '4px',
                      background: role.tier === 'first_lead' ? 'rgba(251,191,36,0.15)' : role.tier === 'second_lead' ? 'rgba(148,163,184,0.15)' : role.tier === 'third_lead' ? 'rgba(180,130,80,0.15)' : 'rgba(100,100,120,0.15)',
                      color: role.tier === 'first_lead' ? '#fbbf24' : role.tier === 'second_lead' ? '#94a3b8' : role.tier === 'third_lead' ? '#b48250' : '#6b6b8a',
                      border: `1px solid ${role.tier === 'first_lead' ? 'rgba(251,191,36,0.3)' : role.tier === 'second_lead' ? 'rgba(148,163,184,0.3)' : role.tier === 'third_lead' ? 'rgba(180,130,80,0.3)' : 'rgba(100,100,120,0.3)'}`,
                      flexShrink: 0,
                    }}>
                      {role.tier === 'first_lead' ? '1st Lead' : role.tier === 'second_lead' ? '2nd Lead' : role.tier === 'third_lead' ? '3rd Lead' : 'Supporting'}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                  {/* Original actor — hidden for books (no original actor) */}
                  {role.original_actor && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                        <div style={{ width: '64px', height: '90px', borderRadius: '8px', background: '#2a2a38', overflow: 'hidden', flexShrink: 0 }}>
                          {role.original_actor_image ? (
                            <img src={role.original_actor_image} alt={role.original_actor} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a1a1aa', fontSize: '18px' }}>?</div>
                          )}
                        </div>
                        <div>
                          <div style={{ fontSize: '14px', color: '#a1a1aa', marginBottom: '4px' }}>Original</div>
                          <div style={{ fontSize: '15px', fontWeight: 700, color: '#94a3b8', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {role.original_actor}
                          </div>
                        </div>
                      </div>
                      {/* Arrow */}
                      <div style={{ color: '#94a3b8', fontSize: '20px', flexShrink: 0, paddingTop: '30px' }}>→</div>
                    </>
                  )}

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
                              padding: '6px 8px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '7px',
                              minHeight: '44px',
                              transition: 'border-color 0.12s, background 0.12s',
                            }}
                          >
                            <span style={{ fontSize: '14px', color: '#94a3b8', flexShrink: 0, fontWeight: 700 }}>{slot + 1}</span>
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
                                  <div style={{ width: '28px', height: '38px', borderRadius: '4px', overflow: 'hidden', flexShrink: 0, background: '#1c1c1e' }}>
                                    {actor.image
                                      ? <img src={actor.image} alt={actor.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }} draggable={false} />
                                      : <div style={{ width: '100%', height: '100%', background: '#27272a' }} />
                                    }
                                  </div>
                                  <span style={{ fontSize: '14px', color: '#94a3b8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{actor.name}</span>
                                </div>
                                <button
                                  onClick={() => clearSlot(role.role_name, slot)}
                                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '14px', lineHeight: 1, padding: '1px', flexShrink: 0 }}
                                >
                                  ×
                                </button>
                              </>
                            ) : (
                              <span style={{ fontSize: '14px', color: '#a1a1aa', fontStyle: 'italic' }}>
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
        </div>

        {/* ── Centre: Marlowe chat ── */}
        <div style={{ borderRight: '1px solid rgba(255,255,255,0.08)', padding: '20px 18px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', minHeight: 0 }}>

          {/* Role selector */}
          <div>
            <div style={{ fontSize: '14px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#a1a1aa', marginBottom: '8px', fontWeight: 600 }}>
              Working on
            </div>
            <select
              value={activeRole}
              onChange={e => setActiveRole(e.target.value)}
              style={{ width: '100%', background: '#1a1a22', border: '1px solid #3f3f46', borderRadius: '10px', padding: '10px 13px', color: '#f8fafc', fontSize: '15px', fontWeight: 600, outline: 'none', cursor: 'pointer' }}
            >
              {roles.map(r => (
                <option key={r.role_name} value={r.role_name}>{r.role_name}</option>
              ))}
            </select>
          </div>

          {/* Search — top of chat */}
          <div>
            {/* Counter + Sonnet toggle row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ fontSize: '13px', color: '#a1a1aa', lineHeight: 1.5 }}>
                {chatLimitReached
                  ? 'Marlowe is resting — search by name below.'
                  : 'Search by name or describe what you need — younger, cheaper, a comedian, a wildcard.'}
              </div>
              {chatRemaining != null && !chatLimitReached && (
                <div style={{ fontSize: '12px', color: chatRemaining <= 10 ? '#f59e0b' : '#52525b', flexShrink: 0, marginLeft: '8px' }}>
                  {chatRemaining} left
                </div>
              )}
            </div>

            {/* Sonnet toggle — directors only */}
            {isDirector && !chatLimitReached && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <button
                  onClick={() => { setUseSonnet(v => !v); setSonnetLimitReached(false) }}
                  style={{
                    background: useSonnet ? 'rgba(139,92,246,0.15)' : '#1a1a22',
                    border: `1px solid ${useSonnet ? '#7c3aed' : '#3f3f46'}`,
                    borderRadius: '8px', padding: '5px 10px', fontSize: '12px', fontWeight: 600,
                    color: useSonnet ? '#a78bfa' : '#71717a', cursor: 'pointer',
                  }}
                >
                  {useSonnet ? 'Sonnet ON' : 'Sonnet'}
                </button>
                {sonnetLimitReached && (
                  <span style={{ fontSize: '12px', color: '#f59e0b' }}>Sonnet limit hit — switched to Haiku</span>
                )}
              </div>
            )}

            {/* Normal Marlowe search (hidden when limit reached) */}
            {!chatLimitReached && (
              <>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSearch() }}
                    placeholder='Younger? Cheaper? Funnier? Ask Marlowe…'
                    style={{ flex: 1, background: '#1a1a22', border: '1px solid #3f3f46', borderRadius: '10px', padding: '10px 13px', color: '#f8fafc', fontSize: '14px', outline: 'none' }}
                  />
                  <button
                    onClick={handleSearch}
                    disabled={aiLoading || !query.trim()}
                    style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 16px', fontSize: '14px', fontWeight: 700, cursor: aiLoading || !query.trim() ? 'not-allowed' : 'pointer', opacity: aiLoading || !query.trim() ? 0.5 : 1, flexShrink: 0 }}
                  >
                    Ask
                  </button>
                  {isFiltered && (
                    <button
                      onClick={() => { setVisibleActors([]); setIsFiltered(false); setQuery('') }}
                      style={{ background: '#27272a', color: '#a1a1aa', border: 'none', borderRadius: '10px', padding: '10px 12px', fontSize: '14px', cursor: 'pointer', flexShrink: 0 }}
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Quick search buttons — use DB cache if available, otherwise hit API */}
                {(() => {
                  const currentRole = roles.find(r => r.role_name === activeRole)
                  const quickLabels = ['Younger', 'Cheaper', 'Older', 'Comedian', 'Action star']
                  return (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                      {quickLabels.map(label => {
                        const key = label.toLowerCase()
                        const cached = currentRole?.marlowe_quick?.[key]
                        return (
                          <button
                            key={label}
                            disabled={aiLoading}
                            onClick={() => {
                              if (cached) {
                                applyDescribeResult(activeRole, cached)
                              } else {
                                setQuery(label)
                                handleSearchWithQuery(label)
                              }
                            }}
                            style={{ background: '#1a1a22', border: '1px solid #3f3f46', borderRadius: '8px', padding: '5px 11px', fontSize: '13px', color: cached ? '#60a5fa' : '#a1a1aa', cursor: aiLoading ? 'not-allowed' : 'pointer', opacity: aiLoading ? 0.5 : 1 }}
                          >
                            {label}
                          </button>
                        )
                      })}
                      {!isCached && (
                        <span style={{ fontSize: '12px', color: '#3f3f46', alignSelf: 'center', marginLeft: '4px' }}>
                          Less popular titles may take a moment to load
                        </span>
                      )}
                    </div>
                  )
                })()}
              </>
            )}

            {/* Fail state: manual name search when limit reached */}
            {chatLimitReached && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  value={manualSearch}
                  onChange={e => {
                    const val = e.target.value
                    setManualSearch(val)
                    if (val.trim().length >= 2) {
                      const q = val.toLowerCase()
                      const matches = actors.filter(a => a.name.toLowerCase().includes(q) && !blockedActors.has(a.name))
                      setVisibleActors(matches.slice(0, 20))
                      setIsFiltered(true)
                    } else if (!val.trim()) {
                      setVisibleActors([])
                      setIsFiltered(false)
                    }
                  }}
                  placeholder='Search actor by name…'
                  style={{ flex: 1, background: '#1a1a22', border: '1px solid #3f3f46', borderRadius: '10px', padding: '10px 13px', color: '#f8fafc', fontSize: '14px', outline: 'none' }}
                />
                {isFiltered && (
                  <button
                    onClick={() => { setVisibleActors([]); setIsFiltered(false); setManualSearch('') }}
                    style={{ background: '#27272a', color: '#a1a1aa', border: 'none', borderRadius: '10px', padding: '10px 12px', fontSize: '14px', cursor: 'pointer', flexShrink: 0 }}
                  >
                    Clear
                  </button>
                )}
              </div>
            )}
          </div>

          {/* AI chat — hidden when limit reached */}
          {!chatLimitReached && (
          <div ref={chatContainerRef} style={{ background: '#16161e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflowY: 'auto' }}>
            {aiLoading && currentMessages.length === 0 && (
              <div style={{ fontSize: '14px', color: '#a1a1aa', fontStyle: 'italic' }}>Thinking…</div>
            )}
            {currentMessages.map((msg, i) => {
              const words = msg.text.split(' ')
              const isLong = words.length > 25
              const isExpanded = expandedMessages.has(i)
              const displayText = isLong && !isExpanded ? words.slice(0, 25).join(' ') + '…' : msg.text
              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '14px', color: '#3b82f6', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '2px', flexShrink: 0 }}>
                      Marlowe
                    </span>
                    <div style={{ fontSize: '14px', color: '#cbd5e1', lineHeight: 1.6 }}>
                      {displayText}
                      {isLong && (
                        <button
                          onClick={() => setExpandedMessages(prev => { const next = new Set(prev); isExpanded ? next.delete(i) : next.add(i); return next })}
                          style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '13px', cursor: 'pointer', marginLeft: '4px', padding: 0 }}
                        >
                          {isExpanded ? 'less' : 'more'}
                        </button>
                      )}
                    </div>
                  </div>
                  {msg.suggestion && (
                    <button
                      onClick={() => { setQuery(msg.suggestion!); handleSearchWithQuery(msg.suggestion!) }}
                      style={{ alignSelf: 'flex-start', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '8px', padding: '7px 13px', fontSize: '14px', color: '#60a5fa', cursor: 'pointer', textAlign: 'left', lineHeight: 1.4 }}
                    >
                      💬 {msg.suggestion}
                    </button>
                  )}
                </div>
              )
            })}
            {aiLoading && currentMessages.length > 0 && (
              <div style={{ fontSize: '14px', color: '#a1a1aa', fontStyle: 'italic' }}>Thinking…</div>
            )}
          </div>
          )}

        </div>

        {/* ── Right: Actor headshots ── */}
        <div style={{ padding: '20px 14px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0 }}>
          <div>
            <div style={{ fontSize: '14px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#a1a1aa', fontWeight: 600, marginBottom: '6px' }}>
              {aiLoading ? 'Finding actors…' : displayActors.length === 0 ? 'Waiting for Marlowe…' : `Marlowe's picks · ${displayActors.length}`}
            </div>
            {displayActors.length > 0 && !aiLoading && (
              <div style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.6 }}>
                These are suggestions — not your only options. Want someone younger? Cheaper? A wild card? Just ask Marlowe.
              </div>
            )}
            {displayActors.length === 0 && !aiLoading && (
              <div style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.6 }}>
                Marlowe will suggest actors when you select a role. Or describe what you're looking for — younger, cheaper, comedic, a wild card.
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '8px' }}>
            {displayActors.map((actor, i) => {
              const isAssigned = assignedNames.has(actor.name)
              const isDragging = draggingActor === actor.name
              const isAiPick = isFiltered && i < 8

              return (
                <div
                  key={actor.name}
                  draggable={!isAssigned}
                  onMouseEnter={e => {
                    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                    hoverTimeoutRef.current = setTimeout(() => setHoveredActor({ actor, rect }), 300)
                  }}
                  onMouseLeave={() => {
                    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
                    hoverTimeoutRef.current = setTimeout(() => setHoveredActor(null), 150)
                  }}
                  onDragStart={e => {
                    if (isAssigned) { e.preventDefault(); return }
                    setHoveredActor(null)
                    e.dataTransfer.setData('text/plain', actor.name)
                    e.dataTransfer.effectAllowed = 'move'
                    setDraggingActor(actor.name)
                    setDraggingFromSlot(null)
                    dropSucceededRef.current = false
                  }}
                  onDragEnd={() => setDraggingActor(null)}
                  style={{
                    border: `1px solid ${isAiPick ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: '8px',
                    overflow: 'hidden',
                    background: isAssigned ? '#0f0f14' : isAiPick ? 'rgba(15,26,48,1)' : '#18181b',
                    opacity: isAssigned ? 0.25 : isDragging ? 0.3 : 1,
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
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '14px' }}>?</div>
                    )}
                  </div>
                  <div style={{ padding: '5px 6px 6px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: isAssigned ? '#3f3f46' : '#e2e8f0', lineHeight: 1.25, marginBottom: '2px' }}>
                      {actor.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ fontSize: '14px', color: '#a1a1aa', fontVariantNumeric: 'tabular-nums' }}>
                        ${actor.cost}M{!actor.salaryConfirmed && <span style={{ fontSize: '9px' }}> est</span>}
                      </div>
                      {!isAssigned && (
                        <button
                          onClick={e => { e.stopPropagation(); setConfirmBan(actor.name) }}
                          title={`Ban ${actor.name}`}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0', fontSize: '14px', lineHeight: 1, opacity: 0.5 }}
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

          {/* Second look — bottom of right column */}
          {(() => {
            const primaryName = getSlots(activeRole)[0]
            const passed = (suggestedPerRole[activeRole] ?? []).filter(a =>
              a.name !== primaryName &&
              !blockedActors.has(a.name) &&
              !displayActors.find(v => v.name === a.name)
            )
            if (passed.length === 0) return null
            const visible = showAllPassed ? passed : passed.slice(0, 4)
            return (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '14px' }}>
                <div style={{ fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#a1a1aa', marginBottom: '10px', fontWeight: 600 }}>
                  Second look?
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {visible.map(actor => (
                    <button
                      key={actor.name}
                      onClick={() => assignToSlot(activeRole, actor.name, 0)}
                      title={actor.knownFor ? actor.knownFor.split(';').slice(0, 4).map((s: string) => s.trim()).filter(Boolean).join(' · ') : `Cast ${actor.name}`}
                      style={{ display: 'flex', alignItems: 'center', gap: '7px', background: '#1a1a22', border: '1px solid #3f3f46', borderRadius: '8px', padding: '5px 10px 5px 6px', cursor: 'pointer' }}
                    >
                      <div style={{ width: '28px', height: '28px', borderRadius: '4px', overflow: 'hidden', flexShrink: 0, background: '#27272a' }}>
                        {actor.image
                          ? <img src={actor.image} alt={actor.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '9px' }}>?</div>
                        }
                      </div>
                      <span style={{ fontSize: '13px', color: '#94a3b8', whiteSpace: 'nowrap' }}>{actor.name}</span>
                    </button>
                  ))}
                </div>
                {passed.length > 4 && (
                  <button
                    onClick={() => setShowAllPassed(p => !p)}
                    style={{ marginTop: '10px', background: 'none', border: 'none', color: '#60a5fa', fontSize: '13px', cursor: 'pointer', padding: 0 }}
                  >
                    {showAllPassed ? 'Show less' : `Show all ${passed.length}`}
                  </button>
                )}
              </div>
            )
          })()}

          {/* Deep Dive */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '14px' }}>
            {!showDeepDive ? (
              <div
                title={isMember ? undefined : 'Expand your search past the top 2,000 working actors.'}
                style={{ position: 'relative', display: 'inline-block', width: '100%' }}
              >
                <button
                  onClick={() => {
                    if (!isMember) { setShowUpgradeModal(true); return }
                    setShowDeepDive(true)
                  }}
                  style={{
                    width: '100%',
                    background: isMember ? 'rgba(59,130,246,0.08)' : '#18181b',
                    border: `1px solid ${isMember ? 'rgba(59,130,246,0.3)' : '#27272a'}`,
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: isMember ? '#60a5fa' : '#52525b',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {isMember ? null : <span style={{ fontSize: '14px' }}>🔒</span>}
                  Deep Dive
                  <span style={{ fontSize: '11px', color: isMember ? '#3b82f6' : '#3f3f46', fontWeight: 400, marginLeft: '2px' }}>
                    beyond top 2,000
                  </span>
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#3b82f6', fontWeight: 700 }}>
                    Deep Dive
                  </div>
                  {deepDiveRemaining != null && (
                    <div style={{ fontSize: '12px', color: '#52525b' }}>{deepDiveRemaining} left today</div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    value={deepDiveQuery}
                    onChange={e => setDeepDiveQuery(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleDeepDive() }}
                    placeholder='Search by name, role, genre…'
                    style={{ flex: 1, background: '#1a1a22', border: '1px solid #3f3f46', borderRadius: '8px', padding: '8px 10px', color: '#f8fafc', fontSize: '14px', outline: 'none' }}
                  />
                  <button
                    onClick={handleDeepDive}
                    disabled={deepDiveLoading || !deepDiveQuery.trim()}
                    style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 12px', fontSize: '14px', fontWeight: 700, cursor: deepDiveLoading || !deepDiveQuery.trim() ? 'not-allowed' : 'pointer', opacity: deepDiveLoading || !deepDiveQuery.trim() ? 0.5 : 1, flexShrink: 0 }}
                  >
                    {deepDiveLoading ? '…' : 'Go'}
                  </button>
                </div>
                {deepDiveActors.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ fontSize: '13px', color: '#a1a1aa', marginBottom: '2px' }}>{deepDiveActors.length} found — drag to cast or click to add to pool</div>
                    {deepDiveActors.map(a => (
                      <button
                        key={a.name}
                        onClick={() => {
                          // Add to extra actors pool so cost lookups work
                          setExtraActors(prev => prev.find(p => p.name === a.name) ? prev : [a, ...prev])
                          setVisibleActors(prev => {
                            if (prev.find(p => p.name === a.name)) return prev
                            return [a, ...prev]
                          })
                          setSuggestedPerRole(prev => {
                            const existing = prev[activeRole] ?? []
                            if (existing.find(p => p.name === a.name)) return prev
                            return { ...prev, [activeRole]: [a, ...existing] }
                          })
                          setIsFiltered(true)
                          setDeepDiveActors(prev => prev.filter(d => d.name !== a.name))
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#1a1a22', border: '1px solid #3f3f46', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', textAlign: 'left' }}
                      >
                        <div style={{ width: '32px', height: '44px', borderRadius: '4px', overflow: 'hidden', flexShrink: 0, background: '#27272a' }}>
                          {a.image
                            ? <img src={a.image} alt={a.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                            : <div style={{ width: '100%', height: '100%', background: '#2a2a38' }} />
                          }
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</div>
                          <div style={{ fontSize: '12px', color: '#94a3b8' }}>${a.cost}M</div>
                        </div>
                        <span style={{ fontSize: '12px', color: '#3b82f6', flexShrink: 0 }}>+ add</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {!isMember && (
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px', marginTop: '4px' }}>
              <AdBanner slot="casting-footer" />
            </div>
          )}
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
            <div style={{ fontSize: '14px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#3b82f6', marginBottom: '10px' }}>
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
                      <div style={{ fontSize: '14px', color: '#a1a1aa', marginBottom: '2px' }}>{role.role_name}</div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: primaryName ? '#f1f5f9' : '#3f3f46', fontStyle: primaryName ? 'normal' : 'italic' }}>
                        {primaryName ?? 'Uncast'}
                      </div>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: primaryActor ? '#4ade80' : '#27272a', fontVariantNumeric: 'tabular-nums' }}>
                      {primaryActor ? <>{`$${primaryActor.cost}M`}{!primaryActor.salaryConfirmed && <span style={{ fontSize: '14px', fontWeight: 400, color: '#94a3b8' }}> est</span>}</> : '—'}
                    </div>
                  </div>
                  {possibles.length > 0 && (
                    <div style={{ marginTop: '4px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {possibles.map((a, i) => (
                        <span key={a.name} style={{ fontSize: '14px', color: '#a1a1aa' }}>
                          {i + 2}. {a.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: overBudget ? '#f87171' : '#4ade80', fontVariantNumeric: 'tabular-nums' }}>
                ${spent}M / ${budget}M
              </div>
              <button
                onClick={copyShareLink}
                style={{ background: '#f8fafc', border: 'none', borderRadius: '8px', padding: '8px 14px', color: '#09090b', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}
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
            <div style={{ fontSize: '14px', color: '#a1a1aa', marginBottom: '24px', lineHeight: 1.5 }}>
              They won't appear in any suggestion grid. You can unban them any time from the banned actors list.
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setConfirmBan(null)}
                style={{ flex: 1, background: '#18181b', border: '1px solid #27272a', borderRadius: '10px', padding: '10px', fontSize: '14px', color: '#a1a1aa', cursor: 'pointer', fontWeight: 600 }}
              >
                Cancel
              </button>
              <button
                onClick={() => { blockActor(confirmBan); setConfirmBan(null) }}
                style={{ flex: 1, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '10px', padding: '10px', fontSize: '14px', color: '#f87171', cursor: 'pointer', fontWeight: 700 }}
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
              <button onClick={() => setShowBlockedModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '18px', cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '14px' }}>
              These actors won't appear in any suggestion grid. Click to unblock.
            </div>
            {blockedActors.size === 0 ? (
              <div style={{ fontSize: '14px', color: '#94a3b8', fontStyle: 'italic' }}>No one blocked yet.</div>
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
                      <span style={{ flex: 1, fontSize: '14px', color: '#94a3b8' }}>{name}</span>
                      <button
                        onClick={() => unblockActor(name)}
                        style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '6px', padding: '4px 10px', fontSize: '14px', color: '#60a5fa', cursor: 'pointer' }}
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

      {/* Marlowe-first prompt */}
      {showMarloweFirst && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: '24px' }}
          onClick={() => setShowMarloweFirst(false)}
        >
          <div
            style={{ background: '#111115', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '18px', padding: '32px', width: '100%', maxWidth: '420px', textAlign: 'center' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: '36px', marginBottom: '16px' }}>🎬</div>
            <div style={{ fontSize: '20px', fontWeight: 800, marginBottom: '10px', color: '#f8fafc' }}>Don&apos;t you think Marlowe should have a look first?</div>
            <div style={{ fontSize: '15px', color: '#94a3b8', lineHeight: 1.6, marginBottom: '28px' }}>
              Marlowe has been doing this for 30 years. A second opinion before you walk into that room never hurt anyone.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={() => { setShowMarloweFirst(false) }}
                style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '10px', padding: '13px', fontSize: '15px', fontWeight: 700, color: '#60a5fa', cursor: 'pointer' }}
              >
                Good point — back to Marlowe
              </button>
              <button
                onClick={() => { setShowMarloweFirst(false); handleCastReview() }}
                style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)', borderRadius: '10px', padding: '13px', fontSize: '15px', fontWeight: 600, color: '#a78bfa', cursor: 'pointer' }}
              >
                I&apos;m ready — go to Production Meeting
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cast review modal */}
      {showReview && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '24px' }}
          onClick={() => setShowReview(false)}
        >
          <div
            style={{ background: '#111115', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '860px', maxHeight: '85vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
              <div>
                <div style={{ fontSize: '14px', color: '#94a3b8', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, marginBottom: '4px' }}>Cast review</div>
                <div style={{ fontSize: '22px', fontWeight: 800 }}>{title}</div>
              </div>
              <button onClick={() => setShowReview(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '24px', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>

            {reviewLoading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {['Director', 'Executive Producer', 'Marketing'].map(label => (
                  <div key={label} style={{ background: '#18181b', borderRadius: '14px', padding: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#27272a', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', color: '#a1a1aa', marginBottom: '8px' }}>{label}</div>
                      <div style={{ height: '12px', background: '#27272a', borderRadius: '4px', width: '60%', marginBottom: '6px' }} />
                      <div style={{ height: '10px', background: '#1c1c1e', borderRadius: '4px', width: '90%', marginBottom: '4px' }} />
                      <div style={{ height: '10px', background: '#1c1c1e', borderRadius: '4px', width: '75%' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {reviewData && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  { key: 'director', label: 'The Director', icon: '🎬', color: '#818cf8', bg: 'rgba(99,102,241,0.06)', border: 'rgba(99,102,241,0.2)', data: reviewData.director },
                  { key: 'execProducer', label: 'The Executive Producer', icon: '💰', color: '#4ade80', bg: 'rgba(74,222,128,0.06)', border: 'rgba(74,222,128,0.2)', data: reviewData.execProducer },
                  { key: 'marketer', label: 'The Marketing VP', icon: '📣', color: '#fb923c', bg: 'rgba(251,146,60,0.06)', border: 'rgba(251,146,60,0.2)', data: reviewData.marketer },
                ].map(({ label, icon, color, bg, border, data }) => (
                  <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: '14px', padding: '22px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                      <span style={{ fontSize: '22px' }}>{icon}</span>
                      <div>
                        <div style={{ fontSize: '14px', color, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</div>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: '#f8fafc', marginTop: '2px' }}>{data.verdict}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: '14px', color: '#cbd5e1', lineHeight: 1.65 }}>{data.notes}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Score result modal */}
      {scoreResult && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '24px' }}
          onClick={() => setScoreResult(null)}
        >
          <div
            style={{ background: '#111115', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '20px', padding: '36px', width: '100%', maxWidth: '460px' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: '11px', color: '#fbbf24', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>
              {scoreResult.cached ? 'Cached score' : 'AI score'}
            </div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#f1f5f9', lineHeight: 1.4, marginBottom: '28px', fontStyle: 'italic' }}>
              "{scoreResult.ai_summary}"
            </div>
            <div style={{ display: 'flex', gap: '20px', marginBottom: '28px' }}>
              {([
                { label: 'Greenlight', value: scoreResult.green_light_score, color: scoreResult.green_light_score >= 70 ? '#22c55e' : scoreResult.green_light_score >= 40 ? '#f59e0b' : '#ef4444' },
                { label: 'Quality',   value: scoreResult.quality_score,      color: scoreResult.quality_score >= 70      ? '#3b82f6' : scoreResult.quality_score >= 40      ? '#f59e0b' : '#ef4444' },
                { label: 'Hear Me Out', value: scoreResult.hear_me_out_score, color: scoreResult.hear_me_out_score >= 70 ? '#a855f7' : scoreResult.hear_me_out_score >= 40  ? '#f97316' : '#6b7280' },
              ] as { label: string; value: number; color: string }[]).map(s => (
                <div key={s.label} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#52525b', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>{s.label}</div>
                  <div style={{ fontSize: '40px', fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
                </div>
              ))}
            </div>
            {scoreResult.award && (() => {
              const AWARD_META: Record<string, { emoji: string; label: string; color: string }> = {
                best_in_show:        { emoji: '🏆', label: 'Best in Show',            color: '#fbbf24' },
                makable_unwatchable: { emoji: '💰', label: 'Makable but Unwatchable', color: '#f87171' },
                genius_unmakable:    { emoji: '🧠', label: 'Genius but Unmakable',    color: '#a78bfa' },
                hear_me_out:         { emoji: '🔮', label: 'Hear Me Out',             color: '#fb923c' },
              }
              const a = AWARD_META[scoreResult.award!]
              return a ? (
                <div style={{ textAlign: 'center', marginBottom: '24px', fontSize: '15px', fontWeight: 700, color: a.color }}>
                  {a.emoji} {a.label}
                </div>
              ) : null
            })()}
            <button
              onClick={() => setScoreResult(null)}
              style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '12px', color: '#94a3b8', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Submit error modal */}
      {submitError && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '24px' }}
          onClick={() => setSubmitError(null)}
        >
          <div
            style={{ background: '#111115', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '480px' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: '20px', fontWeight: 800, marginBottom: '12px' }}>Couldn't submit</div>
            <div style={{ fontSize: '14px', color: '#f87171', marginBottom: '24px' }}>{submitError}</div>
            <button
              onClick={() => setSubmitError(null)}
              style={{ display: 'block', background: 'none', border: 'none', color: '#94a3b8', fontSize: '14px', cursor: 'pointer', padding: 0 }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Upgrade modal */}
      {showUpgradeModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '24px' }}
          onClick={() => setShowUpgradeModal(false)}
        >
          <div
            style={{ background: '#111115', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '20px', padding: '36px', width: '100%', maxWidth: '420px', textAlign: 'center' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: '36px', marginBottom: '16px' }}>🎬</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#f1f5f9', marginBottom: '8px' }}>Members only</div>
            <div style={{ fontSize: '15px', color: '#94a3b8', lineHeight: 1.6, marginBottom: '24px' }}>
              The Production Meeting — Director, Executive Producer, and Marketing VP in the same room — is a Director-tier feature. Upgrade to $10/month to run the full review.
            </div>
            <a
              href="/auth"
              style={{ display: 'block', background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.4)', borderRadius: '10px', padding: '12px 20px', color: '#a78bfa', fontSize: '15px', fontWeight: 700, textDecoration: 'none', marginBottom: '10px' }}
            >
              Sign up for full access →
            </a>
            <button
              onClick={() => setShowUpgradeModal(false)}
              style={{ background: 'none', border: 'none', color: '#52525b', fontSize: '14px', cursor: 'pointer', padding: 0 }}
            >
              Maybe later
            </button>
          </div>
        </div>
      )}

      {/* Actor hover popup */}
      {ActorHoverCard()}
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
          movieSlug: slug,
          originalActor: role?.original_actor ?? '',
          roleTier: role?.tier,
          budget,
          query: q,
          excludeActors: (suggestedPerRole[activeRole] ?? []).map(a => a.name),
          useSonnet,
        }),
      })
      const data = await res.json()
      if (data.limitReached) { setChatLimitReached(true); return }
      if (data.sonnetLimitReached) setSonnetLimitReached(true)
      if (data.remaining != null) setChatRemaining(data.remaining)
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
        setVisibleActors(uniqueByName(picks))
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

  // ── Submit cast ──
  async function handleSubmit() {
    if (!allRolesFilled || submitLoading) return
    setSubmitLoading(true)
    setSubmitError(null)
    try {
      const primarySelections: Record<string, string> = {}
      roles.forEach(r => {
        const primary = selections[r.role_name]?.[0]
        if (primary) primarySelections[r.role_name] = primary
      })
      const castWithDetails = roles
        .filter(r => primarySelections[r.role_name])
        .map(r => {
          const actorName = primarySelections[r.role_name]
          const actor = allActors.find(a => a.name === actorName)
          return { role: r.role_name, tier: r.tier ?? 'supporting', actor: actorName, cost: actor?.cost ?? 0 }
        })
      const res = await fetch('/api/submit-cast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movie_slug: slug,
          movie_title: title,
          selections: primarySelections,
          challenge_id: challenge?.id ?? null,
          budget,
          cast: castWithDetails,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setSubmitError(data.error ?? 'Submission failed'); return }
      window.location.href = `/results/${data.id}`
    } catch {
      setSubmitError('Something went wrong. Try again.')
    } finally {
      setSubmitLoading(false)
    }
  }

  // ── Score cast ──
  async function handleScore() {
    if (!allRolesFilled || scoreLoading) return
    setScoreLoading(true)
    try {
      const primarySelections: Record<string, string> = {}
      roles.forEach(r => {
        const primary = selections[r.role_name]?.[0]
        if (primary) primarySelections[r.role_name] = primary
      })
      const castWithDetails = roles
        .filter(r => primarySelections[r.role_name])
        .map(r => {
          const actorName = primarySelections[r.role_name]
          const actor = allActors.find(a => a.name === actorName)
          return { role: r.role_name, tier: r.tier ?? 'supporting', actor: actorName, cost: actor?.cost ?? 0 }
        })
      const res = await fetch('/api/score-cast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movie_slug: slug, movie_title: title, budget, cast: castWithDetails }),
      })
      const data = await res.json()
      if (res.ok) setScoreResult(data)
      else setSubmitError(data.error ?? 'Scoring failed')
    } catch {
      setSubmitError('Something went wrong. Try again.')
    } finally {
      setScoreLoading(false)
    }
  }

  // ── Actor hover popup ──
  function ActorHoverCard() {
    if (!hoveredActor) return null
    const { actor, rect } = hoveredActor

    const knownForItems = (actor.knownFor ?? '')
      .split(';').map(s => s.trim()).filter(Boolean).slice(0, 5)

    const bio = (actor.biography ?? '').slice(0, 220).trim()
    const bioSnippet = bio.length === 220 ? bio + '…' : bio

    // Position: prefer left of card, fall back to right
    const popupWidth = 240
    const spaceRight = window.innerWidth - rect.right
    const left = spaceRight > popupWidth + 12
      ? rect.right + 8
      : rect.left - popupWidth - 8

    const top = Math.min(
      rect.top,
      window.innerHeight - 340
    )

    return (
      <div
        onMouseEnter={() => { if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current) }}
        onMouseLeave={() => {
          if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
          hoverTimeoutRef.current = setTimeout(() => setHoveredActor(null), 100)
        }}
        style={{
          position: 'fixed',
          left,
          top,
          width: `${popupWidth}px`,
          background: '#1a1a24',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '14px',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
          zIndex: 999,
          animation: 'actorCardPop 0.15s ease-out',
          pointerEvents: 'auto',
        }}
      >
        <style>{`
          @keyframes actorCardPop {
            from { opacity: 0; transform: scale(0.92) translateY(4px); }
            to   { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}</style>

        {actor.image && (
          <div style={{ width: '100%', height: '200px', overflow: 'hidden' }}>
            <img src={actor.image} alt={actor.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 15%', display: 'block' }} />
          </div>
        )}

        <div style={{ padding: '14px' }}>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#f1f5f9', marginBottom: '4px' }}>{actor.name}</div>
          <div style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '10px' }}>${actor.cost}M{!actor.salaryConfirmed && ' est'}</div>

          {knownForItems.length > 0 && (
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '6px' }}>Known for</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {knownForItems.map(item => (
                  <div key={item} style={{ fontSize: '14px', color: '#a1a1aa' }}>{item}</div>
                ))}
              </div>
            </div>
          )}

          {(actor.universeTags ?? []).length > 0 && (
            <div style={{ marginBottom: '10px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {(actor.universeTags ?? []).map(tag => (
                <span key={tag} style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  background: 'rgba(139,92,246,0.15)',
                  border: '1px solid rgba(139,92,246,0.3)',
                  color: '#a78bfa',
                  borderRadius: '5px',
                  padding: '2px 6px',
                }}>
                  {tag}
                </span>
              ))}
            </div>
          )}

          {bioSnippet && (
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '6px' }}>Bio</div>
              <div style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.5 }}>{bioSnippet}</div>
            </div>
          )}
        </div>
      </div>
    )
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
          gap: '12px',
          border: `1px solid ${isDragOver ? '#3b82f6' : 'rgba(255,255,255,0.1)'}`,
          borderRadius: '10px',
          padding: '10px 12px',
          background: isDragOver ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.02)',
          cursor: draggable ? 'grab' : 'default',
          transition: 'border-color 0.12s',
        }}
      >
        <div style={{ width: '64px', height: '90px', borderRadius: '7px', overflow: 'hidden', flexShrink: 0, background: '#1c1c1e' }}>
          {actor.image
            ? <img src={actor.image} alt={actor.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }} draggable={false} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '14px' }}>?</div>
          }
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '15px', color: '#4ade80', fontWeight: 700, fontVariantNumeric: 'tabular-nums', marginBottom: '4px' }}>
            ${actor.cost}M{!actor.salaryConfirmed && <span style={{ color: '#94a3b8', fontWeight: 400 }}> est</span>}
          </div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {actor.name}
          </div>
          {isPrimary && (
            <div style={{ fontSize: '14px', color: '#94a3b8', marginTop: '4px' }}>drag away to remove</div>
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
        height: '90px',
        borderRadius: '10px',
        border: `1px dashed ${isDragOver ? '#3b82f6' : '#27272a'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '14px',
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
