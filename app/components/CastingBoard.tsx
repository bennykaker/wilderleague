'use client'

import { useState, useEffect, useRef } from 'react'

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
  gender?: string
  birthYear?: string
  keywords?: string
  castingProfile?: string
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

type AIMatch = {
  actor: CastActor | null
  name: string
  category: 'A' | 'B'
  justification: string
  productionNote?: string
  confidence: string
  inDatabase: boolean
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
  titleType?: string
  preloadedSuggestions?: Record<string, string[]>
  challenge?: ChallengeInfo
  isMember?: boolean
  serverSearch?: boolean
}

// Per role: [primary, 2nd choice, 3rd choice]
type Selections = Record<string, string[]>

function uniqueByName(arr: CastActor[]): CastActor[] {
  const seen = new Set<string>()
  return arr.filter(a => { if (seen.has(a.name)) return false; seen.add(a.name); return true })
}

export default function CastingBoard({ actors, roles, title, slug, budget, titleType, preloadedSuggestions = {}, challenge, isMember = false, serverSearch = false }: Props) {
  const [selections, setSelections] = useState<Selections>({})
  const [activeRole, setActiveRole] = useState(roles[0]?.role_name ?? '')
  const [dragOverSlot, setDragOverSlot] = useState<{ role: string; slot: number } | null>(null)
  const [draggingActor, setDraggingActor] = useState<string | null>(null)
  const [draggingFromSlot, setDraggingFromSlot] = useState<{ role: string; slot: number } | null>(null)
  const [query, setQuery] = useState('')
  const [visibleActors, setVisibleActors] = useState<CastActor[]>([])
  const [isFiltered, setIsFiltered] = useState(false)
  const [showExportCard, setShowExportCard] = useState(false)
  const [showBlockedModal, setShowBlockedModal] = useState(false)
  const [confirmBan, setConfirmBan] = useState<string | null>(null)
  const [suggestedPerRole, setSuggestedPerRole] = useState<Record<string, CastActor[]>>({})
  const [blockedActors, setBlockedActors] = useState<Set<string>>(new Set())
  const [hoveredActor, setHoveredActor] = useState<{ actor: CastActor; rect: DOMRect } | null>(null)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [showPitchModal, setShowPitchModal] = useState(false)
  const [pitch, setPitch] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [scoreLoading, setScoreLoading] = useState(false)
  const [scoreResult, setScoreResult] = useState<{ ai_summary: string; green_light_score: number; quality_score: number; hear_me_out_score: number; award: string | null; cached: boolean } | null>(null)
  const [showAllPassed, setShowAllPassed] = useState(false)
  const [copyingImage, setCopyingImage] = useState(false)
  const shareCardRef = useRef<HTMLDivElement>(null)
  const [confirmStartOver, setConfirmStartOver] = useState(false)
  const [topPicks, setTopPicks] = useState<Record<string, { name: string; count: number }[]>>({})
  const [topPicksLoading, setTopPicksLoading] = useState(false)
  const [showTopPicks, setShowTopPicks] = useState(false)
  const [showAskYourAI, setShowAskYourAI] = useState(false)
  const [yourAIPaste, setYourAIPaste] = useState('')
  const [yourAIMatches, setYourAIMatches] = useState<AIMatch[]>([])
  const [aiPromptCopied, setAIPromptCopied] = useState(false)
  const [rolePromptModal, setRolePromptModal] = useState<{ roleName: string } | null>(null)
  const [rolePromptExtra, setRolePromptExtra] = useState('')
  const [rolePromptCopied, setRolePromptCopied] = useState(false)
  const [actorSubmissions, setActorSubmissions] = useState<Record<string, 'loading' | 'done' | 'error'>>({})
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dropSucceededRef = useRef(false)

  // Load blocklist + selections from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('wilderleague_blocked')
      if (saved) setBlockedActors(new Set(JSON.parse(saved) as string[]))
    } catch {}
    try {
      const savedSelections = localStorage.getItem(`wl_cast_${slug}`)
      if (savedSelections) setSelections(JSON.parse(savedSelections))
    } catch {}
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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

  // Persist selections to localStorage on every change
  useEffect(() => {
    if (Object.keys(selections).length > 0) {
      localStorage.setItem(`wl_cast_${slug}`, JSON.stringify(selections))
    }
  }, [selections, slug])

  const allActors = actors

  const assignedNames = new Set(
    Object.values(selections).flatMap(arr => arr).filter(Boolean)
  )

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
        if (slot === 0 && arr[0] === actorName && r !== roleName) {
          const trimmed = arr.slice(1)
          if (trimmed.some(Boolean)) next[r] = trimmed
        } else {
          next[r] = arr
        }
      }
      const current = [...(next[roleName] ?? [])]
      for (let i = 0; i < current.length; i++) {
        if (current[i] === actorName && i !== slot) current[i] = ''
      }
      current[slot] = actorName
      next[roleName] = current
      return next
    })
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

  // Load preloaded suggestions when active role changes
  useEffect(() => {
    setQuery('')
    setShowAllPassed(false)
    setShowTopPicks(false)

    const preloaded = (preloadedSuggestions[activeRole] ?? [])
      .filter(name => !blockedActors.has(name))
    if (preloaded.length > 0) {
      const picks = preloaded
        .map(name => actors.find(a => a.name.toLowerCase() === name.toLowerCase()))
        .filter((a): a is CastActor => Boolean(a))
      setVisibleActors(uniqueByName(picks))
      setIsFiltered(true)
      setSuggestedPerRole(prev => ({ ...prev, [activeRole]: picks }))
    } else if (challenge) {
      const available = actors.filter(a => !blockedActors.has(a.name))
      setVisibleActors(available)
      setIsFiltered(true)
      setSuggestedPerRole(prev => ({ ...prev, [activeRole]: available }))
    } else {
      setVisibleActors([])
      setIsFiltered(false)
    }
  }, [activeRole]) // eslint-disable-line react-hooks/exhaustive-deps

  // Tag-based local search
  function handleTagSearch(q: string) {
    setQuery(q)
    if (!q.trim()) {
      // Reset to preloaded suggestions
      const preloaded = (preloadedSuggestions[activeRole] ?? [])
        .filter(name => !blockedActors.has(name))
      if (preloaded.length > 0) {
        const picks = preloaded
          .map(name => actors.find(a => a.name.toLowerCase() === name.toLowerCase()))
          .filter((a): a is CastActor => Boolean(a))
        setVisibleActors(uniqueByName(picks))
        setIsFiltered(true)
      } else if (challenge) {
        setVisibleActors(actors.filter(a => !blockedActors.has(a.name)))
        setIsFiltered(true)
      } else {
        setVisibleActors([])
        setIsFiltered(false)
      }
      return
    }
    if (serverSearch) {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
      searchDebounceRef.current = setTimeout(async () => {
        try {
          const res = await fetch(`/api/actors/search?q=${encodeURIComponent(q)}`)
          const { actors: results } = await res.json() as { actors: CastActor[] }
          const filtered = results.filter(a => !blockedActors.has(a.name))
          setVisibleActors(filtered)
          setIsFiltered(true)
        } catch { /* silent */ }
      }, 300)
      return
    }
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean)
    const matches = actors.filter(a => {
      if (blockedActors.has(a.name)) return false
      const searchable = [
        a.name,
        a.keywords ?? '',
        a.knownFor ?? '',
        a.castingProfile ?? '',
        a.biography ?? '',
      ].join(' ').toLowerCase()
      return terms.every(term => searchable.includes(term))
    })
    setVisibleActors(matches.slice(0, 40))
    setIsFiltered(true)
  }

  function buildShareContent() {
    const params = new URLSearchParams()
    for (const [role, arr] of Object.entries(selections)) {
      if (arr[0]) params.set(role, arr[0])
    }
    const url = `${window.location.href.split('?')[0]}?${params.toString()}`

    const castLines = roles
      .map(r => {
        const name = getSlots(r.role_name)[0]
        return name ? `${r.role_name}: ${name}` : null
      })
      .filter(Boolean)

    const constraintLine = challenge ? `Challenge: ${challenge.headline} — ${challenge.description}` : ''
    const budgetLine = `Budget: $${spent.toLocaleString()}M / $${budget.toLocaleString()}M`

    const body = [
      `My recast of ${title} on Wilder League:`,
      constraintLine,
      '',
      castLines.join('\n'),
      '',
      budgetLine,
      '',
      url,
    ].filter(l => l !== undefined && !(l === '' && !castLines.length)).join('\n')

    const subject = `My ${title} recast on Wilder League`
    return { url, body, subject }
  }

  async function copyShareLink() {
    const { url } = buildShareContent()
    try {
      await navigator.clipboard.writeText(url)
      alert('Link copied to clipboard.')
    } catch {
      alert(url)
    }
  }

  async function copyAsImage() {
    if (!shareCardRef.current) return
    setCopyingImage(true)
    try {
      const { toPng } = await import('html-to-image')
      const dataUrl = await toPng(shareCardRef.current, { pixelRatio: 2, cacheBust: true })
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
        alert('Cast image copied to clipboard!')
      } catch {
        const a = document.createElement('a')
        a.href = dataUrl
        a.download = `${title.replace(/\s+/g, '-').toLowerCase()}-cast.png`
        a.click()
      }
    } catch (e) {
      console.error('Image generation failed:', e)
      alert('Could not generate image. Try again.')
    } finally {
      setCopyingImage(false)
    }
  }

  async function handleTopPicks() {
    if (topPicks[activeRole]) { setShowTopPicks(true); return }
    setTopPicksLoading(true)
    setShowTopPicks(true)
    try {
      const res = await fetch(`/api/top-picks?slug=${encodeURIComponent(slug)}&role=${encodeURIComponent(activeRole)}`)
      const data = await res.json()
      setTopPicks(prev => ({ ...prev, [activeRole]: data.picks ?? [] }))
    } catch { /* silent */ }
    finally { setTopPicksLoading(false) }
  }

  function buildAIPrompt(roleName?: string): string {
    const resolvedName = roleName ?? activeRole
    const role = roles.find(r => r.role_name === resolvedName)
    if (!role) return ''

    const tierLabel = role.tier === 'first_lead' ? '1st lead' : role.tier === 'second_lead' ? '2nd lead' : role.tier === 'third_lead' ? '3rd lead' : 'supporting role'
    const origActor = actors.find(a => a.name.toLowerCase() === (role.original_actor ?? '').toLowerCase())

    const genderLine = origActor?.gender ? `Gender: ${origActor.gender}` : ''
    const ageLine = origActor?.birthYear ? `Approximate age range: ${origActor.birthYear} birth year — cast accordingly` : ''

    const marloweDesc = (role.marlowe_cache as MarloweCache | null)?.reply
      ? `Character description (from our casting notes):\n${((role.marlowe_cache as MarloweCache).reply).slice(0, 350).trim()}…`
      : ''
    const profileLine = origActor?.castingProfile ? `Casting profile: ${origActor.castingProfile.slice(0, 300)}` : ''
    const keywordsLine = origActor?.keywords ? `Casting tags: ${origActor.keywords.split(',').slice(0, 20).join(', ')}` : ''

    const budgetNote = challenge ? '' : `Budget ceiling for this role: approximately $${Math.min(remaining + (actors.find(a => a.name === getSlots(resolvedName)[0])?.cost ?? 0), budget)}M.`
    const challengeNote = challenge ? `CONSTRAINT: This is a themed challenge — "${challenge.headline}". Only suggest actors who belong to that universe.` : ''

    // For the active role, exclude what's currently shown; for other roles just skip assigned + blocked
    const alreadyShown = resolvedName === activeRole ? visibleActors.map(a => a.name) : []
    const skipNames = [...new Set([...blockedActors, ...assignedNames, ...alreadyShown, ...(role.original_actor ? [role.original_actor] : [])])]
    const skipList = skipNames.length > 0 ? `Do not suggest any of these:\n${skipNames.map(n => `- ${n}`).join('\n')}` : ''

    const roleDetails = [genderLine, ageLine, marloweDesc, profileLine, keywordsLine, budgetNote, challengeNote].filter(Boolean).join('\n')

    return `You are a casting assistant for Wilder League, a platform where users recast famous films and TV shows.

PRODUCTION: ${title}
ROLE: ${resolvedName} (${tierLabel})
ORIGINAL ACTOR: ${role.original_actor ?? 'not specified'}
${roleDetails}

${skipList}

Your task: suggest SIX actors for this role — three matched choices and three wildcards.

CATEGORY A — Matched casting (3 actors):
Grounded, defensible choices that closely match the character's gender, approximate age, and type. These are the credible, castable picks a traditional studio would greenlight.

CATEGORY B — Wildcard casting (3 actors):
Genuinely surprising, unexpected, or genre-bending choices. May differ in age, gender, or acting style from the original. Must be genuinely defensible creative choices — not random or absurd. Think about what a visionary director might do with this role.

RULES:
- All suggested actors must be living and currently active in film or television
- Do not suggest ${role.original_actor ?? 'the original actor'}
- Do not repeat any actor across both categories
- Spell names exactly as they appear in standard film databases

OUTPUT FORMAT — return exactly these six lines and nothing else:
CATEGORY_A_1: [Actor Name] | [One sentence: why this actor fits] | [Confidence: High/Medium/Low]
CATEGORY_A_2: [Actor Name] | [One sentence: why this actor fits] | [Confidence: High/Medium/Low]
CATEGORY_A_3: [Actor Name] | [One sentence: why this actor fits] | [Confidence: High/Medium/Low]
CATEGORY_B_1: [Actor Name] | [One sentence: the creative logic] | [What would need to be true about the production for this to work] | [Confidence: High/Medium/Low]
CATEGORY_B_2: [Actor Name] | [One sentence: the creative logic] | [What would need to be true about the production for this to work] | [Confidence: High/Medium/Low]
CATEGORY_B_3: [Actor Name] | [One sentence: the creative logic] | [What would need to be true about the production for this to work] | [Confidence: High/Medium/Low]`
  }

  function handleAIPaste(text: string) {
    setYourAIPaste(text)
    if (!text.trim()) { setYourAIMatches([]); return }

    const matches: AIMatch[] = []
    const seen = new Set<string>()

    for (const line of text.split('\n')) {
      const catA = line.match(/^CATEGORY_A_\d:\s*(.+)/)
      const catB = line.match(/^CATEGORY_B_\d:\s*(.+)/)
      const match = catA ?? catB
      if (!match) continue

      const parts = match[1].split('|').map(p => p.trim())
      const name = parts[0]
      if (!name || seen.has(name.toLowerCase())) continue
      seen.add(name.toLowerCase())

      const actor = actors.find(a => a.name.toLowerCase() === name.toLowerCase())
      if (catA) {
        matches.push({ actor: actor ?? null, name, category: 'A', justification: parts[1] ?? '', confidence: parts[2] ?? '', inDatabase: !!actor })
      } else {
        matches.push({ actor: actor ?? null, name, category: 'B', justification: parts[1] ?? '', productionNote: parts[2] ?? '', confidence: parts[3] ?? '', inDatabase: !!actor })
      }
    }

    setYourAIMatches(matches)
  }

  async function submitActorRequest(name: string) {
    setActorSubmissions(prev => ({ ...prev, [name]: 'loading' }))
    try {
      const res = await fetch('/api/submit-actor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, notes: 'Suggested by AI casting assistant — not yet in database' }),
      })
      const data = await res.json()
      setActorSubmissions(prev => ({ ...prev, [name]: data.ok ? 'done' : 'error' }))
    } catch {
      setActorSubmissions(prev => ({ ...prev, [name]: 'error' }))
    }
  }

  async function copyAIPrompt() {
    const prompt = buildAIPrompt()
    try {
      await navigator.clipboard.writeText(prompt)
      setAIPromptCopied(true)
      setTimeout(() => setAIPromptCopied(false), 2000)
    } catch { /* silent */ }
  }

  const displayActors = visibleActors.filter(a => !blockedActors.has(a.name))

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#09090b', color: '#f8fafc', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ padding: '14px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#a1a1aa', fontSize: '14px', fontWeight: 600, textDecoration: 'none', flexShrink: 0 }}>
          ← All titles
        </a>
        <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />
        <div style={{ fontWeight: 900, fontSize: '18px', letterSpacing: '-0.01em' }}>{title}</div>
        {titleType === 'book' && (
          <>
            <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />
            <a href="/submit/art" style={{ fontSize: '13px', color: '#818cf8', textDecoration: 'none', flexShrink: 0, lineHeight: 1.3 }}>
              We need character art for this page. Submit yours →
            </a>
          </>
        )}
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
          {Object.keys(selections).length > 0 && (
            <button
              onClick={() => setConfirmStartOver(true)}
              style={{ background: 'none', border: '1px solid #27272a', borderRadius: '8px', padding: '7px 10px', color: '#52525b', fontSize: '13px', cursor: 'pointer' }}
            >
              Start over
            </button>
          )}
          {!challenge && (
            <>
              <div style={{ fontSize: '14px', color: overBudget ? '#f87171' : '#4ade80', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                ${remaining}M left
              </div>
              <div style={{ width: '80px' }}>
                <div style={{ height: '3px', background: '#27272a', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min((spent / budget) * 100, 100)}%`, background: overBudget ? '#ef4444' : '#22c55e', transition: 'width 0.2s' }} />
                </div>
                <div style={{ fontSize: '14px', color: '#a1a1aa', marginTop: '3px', fontVariantNumeric: 'tabular-nums' }}>${spent}M of ${budget}M</div>
              </div>
            </>
          )}
          <button
            onClick={handleScore}
            disabled={!allRolesFilled || scoreLoading}
            title={allRolesFilled ? 'Score your cast with AI' : 'Fill all roles to score'}
            style={{ background: allRolesFilled ? 'rgba(251,191,36,0.1)' : '#18181b', border: `1px solid ${allRolesFilled ? 'rgba(251,191,36,0.35)' : '#27272a'}`, borderRadius: '8px', padding: '7px 13px', color: allRolesFilled ? '#fbbf24' : '#52525b', fontSize: '14px', fontWeight: 600, cursor: allRolesFilled ? 'pointer' : 'not-allowed' }}
          >
            {scoreLoading ? 'Scoring…' : 'Score my cast'}
          </button>
          <button
            onClick={handleSave}
            disabled={saveLoading || Object.keys(selections).length === 0}
            title={!isMember ? 'Members can save casts' : Object.keys(selections).length === 0 ? 'Cast some roles first' : savedId ? 'Saved!' : 'Save cast'}
            style={{ background: savedId ? 'rgba(251,191,36,0.12)' : Object.keys(selections).length > 0 ? 'rgba(251,191,36,0.08)' : '#18181b', border: `1px solid ${savedId ? 'rgba(251,191,36,0.5)' : Object.keys(selections).length > 0 ? 'rgba(251,191,36,0.25)' : '#27272a'}`, borderRadius: '8px', padding: '7px 13px', color: savedId ? '#fbbf24' : Object.keys(selections).length > 0 ? '#a16207' : '#52525b', fontSize: '14px', fontWeight: 600, cursor: Object.keys(selections).length > 0 ? 'pointer' : 'not-allowed' }}
          >
            {saveLoading ? 'Saving…' : savedId ? '🏆 Saved' : isMember ? '🏆 Save cast' : '🔒 Save cast'}
          </button>
          <button
            onClick={() => setShowExportCard(true)}
            style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '8px', padding: '7px 13px', color: '#a1a1aa', fontSize: '14px', cursor: 'pointer' }}
          >
            Export card
          </button>
          <button
            onClick={copyAsImage}
            disabled={copyingImage || !allRolesFilled}
            title={allRolesFilled ? 'Copy cast image to clipboard' : 'Fill all roles first'}
            style={{ background: '#f8fafc', border: 'none', borderRadius: '8px', padding: '7px 13px', color: '#09090b', fontSize: '14px', fontWeight: 700, cursor: allRolesFilled ? 'pointer' : 'not-allowed', opacity: allRolesFilled ? 1 : 0.4 }}
          >
            {copyingImage ? 'Generating…' : 'Share ↗'}
          </button>
        </div>
      </div>

      {/* Challenge banner */}
      {challenge && (
        <div style={{ padding: '10px 24px', background: 'rgba(139,92,246,0.07)', borderBottom: '1px solid rgba(139,92,246,0.18)', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          <span style={{ fontSize: '20px' }}>{challenge.badge}</span>
          <div>
            <span style={{ fontSize: '11px', color: '#8b5cf6', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', marginRight: '10px' }}>{challenge.label}</span>
            <span style={{ fontSize: '14px', color: '#ede9fe', fontWeight: 700 }}>{challenge.headline}</span>
          </div>
          <div style={{ fontSize: '13px', color: '#a78bfa', marginLeft: '4px', opacity: 0.8 }}>— {challenge.description}</div>
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
                      <div style={{ color: '#94a3b8', fontSize: '20px', flexShrink: 0, paddingTop: '30px' }}>→</div>
                    </>
                  )}

                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
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
                                      ? <img src={actor.image} alt={actor.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }} draggable={false} />
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
                <button
                  onClick={e => { e.stopPropagation(); setRolePromptModal({ roleName: role.role_name }); setRolePromptExtra(''); setRolePromptCopied(false) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '5px', marginTop: '10px',
                    background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)',
                    borderRadius: '7px', padding: '5px 11px', cursor: 'pointer',
                    fontSize: '12px', color: '#34d399', fontWeight: 600, width: '100%',
                    justifyContent: 'center',
                  }}
                >
                  ✦ Ask AI for this role
                </button>
              </div>
            )
          })}
          </div>
        </div>

        {/* ── Centre: Search + tools ── */}
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

          {/* Community top picks */}
          <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '14px' }}>
            {!showTopPicks ? (
              <button
                onClick={handleTopPicks}
                style={{
                  width: '100%', background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.2)',
                  borderRadius: '8px', padding: '8px 12px', color: '#a78bfa', fontSize: '14px',
                  fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                <span>👥</span> The crowd says…
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#a78bfa', fontWeight: 700 }}>
                    Top picks — {activeRole}
                  </div>
                  <button
                    onClick={() => setShowTopPicks(false)}
                    style={{ background: 'none', border: 'none', color: '#52525b', fontSize: '16px', cursor: 'pointer', lineHeight: 1 }}
                  >
                    ×
                  </button>
                </div>
                {topPicksLoading ? (
                  <div style={{ fontSize: '13px', color: '#52525b', padding: '6px 0' }}>Loading…</div>
                ) : (topPicks[activeRole]?.length ?? 0) === 0 ? (
                  <div style={{ fontSize: '13px', color: '#52525b', padding: '6px 0' }}>No submissions yet for this role.</div>
                ) : (
                  topPicks[activeRole].map(({ name, count }, i) => {
                    const actor = allActors.find(a => a.name === name)
                    const isAssigned = assignedNames.has(name)
                    return (
                      <button
                        key={name}
                        onClick={() => {
                          if (!isAssigned) assignToSlot(activeRole, name, 0)
                        }}
                        disabled={isAssigned}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '10px',
                          background: isAssigned ? '#0f0f14' : 'rgba(167,139,250,0.05)',
                          border: `1px solid ${isAssigned ? '#1c1c1e' : 'rgba(167,139,250,0.15)'}`,
                          borderRadius: '8px', padding: '8px 10px', cursor: isAssigned ? 'default' : 'pointer',
                          opacity: isAssigned ? 0.4 : 1, textAlign: 'left', width: '100%',
                        }}
                      >
                        <span style={{ fontSize: '13px', color: '#52525b', fontWeight: 700, width: '16px', flexShrink: 0 }}>
                          {i + 1}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {name}
                          </div>
                          {actor && (
                            <div style={{ fontSize: '11px', color: '#52525b' }}>
                              ${actor.cost}M{!actor.salaryConfirmed && ' est'} · {actor.knownFor?.split(',')[0] ?? ''}
                            </div>
                          )}
                        </div>
                        <span style={{ fontSize: '11px', color: '#6366f1', background: 'rgba(99,102,241,0.12)', borderRadius: '6px', padding: '2px 7px', fontWeight: 700, flexShrink: 0 }}>
                          {count}×
                        </span>
                      </button>
                    )
                  })
                )}
              </div>
            )}
          </div>

          {/* Ask your AI */}
          <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '14px' }}>
            <button
              onClick={() => { setYourAIPaste(''); setYourAIMatches([]); setShowAskYourAI(true) }}
              style={{
                width: '100%', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)',
                borderRadius: '8px', padding: '8px 12px', color: '#34d399', fontSize: '14px',
                fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              <span>🤖</span> Ask your AI
            </button>
          </div>

          {/* Tag search */}
          <div>
            <div style={{ fontSize: '13px', color: '#a1a1aa', marginBottom: '8px', lineHeight: 1.5 }}>
              Search by name, type, or vibe
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                value={query}
                onChange={e => handleTagSearch(e.target.value)}
                placeholder='e.g. "funny british" or actor name…'
                style={{ flex: 1, background: '#1a1a22', border: '1px solid #3f3f46', borderRadius: '10px', padding: '10px 13px', color: '#f8fafc', fontSize: '14px', outline: 'none' }}
              />
              {query && (
                <button
                  onClick={() => handleTagSearch('')}
                  style={{ background: '#27272a', color: '#a1a1aa', border: 'none', borderRadius: '10px', padding: '10px 12px', fontSize: '14px', cursor: 'pointer', flexShrink: 0 }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Show full pool — challenge pages only */}
          {challenge && (
            <button
              onClick={() => {
                const all = actors.filter(a => !blockedActors.has(a.name))
                setVisibleActors(all)
                setIsFiltered(true)
                setQuery('')
              }}
              style={{
                width: '100%', background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.2)',
                borderRadius: '8px', padding: '8px 12px', color: '#a78bfa', fontSize: '14px',
                fontWeight: 600, cursor: 'pointer', textAlign: 'left',
              }}
            >
              Show all {actors.filter(a => !blockedActors.has(a.name)).length} eligible actors →
            </button>
          )}

        </div>

        {/* ── Right: Actor headshots ── */}
        <div style={{ padding: '20px 14px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0 }}>
          <div>
            <div style={{ fontSize: '14px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#a1a1aa', fontWeight: 600, marginBottom: '6px' }}>
              {query.trim()
                ? `Results · ${displayActors.length}`
                : displayActors.length > 0 ? `Picks · ${displayActors.length}` : 'Picks'}
            </div>
            {displayActors.length > 0 && !query.trim() && (
              <div style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.6 }}>
                Search by name or describe what you&apos;re looking for — younger, funnier, British, a wild card.
              </div>
            )}
            {displayActors.length === 0 && !query.trim() && (
              <div style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.6 }}>
                Select a role on the left, then search or browse picks here.
              </div>
            )}
            {displayActors.length === 0 && query.trim() && (
              <div style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.6 }}>
                No matches for &quot;{query}&quot; — try different terms.
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '8px' }}>
            {displayActors.map(actor => {
              const isAssigned = assignedNames.has(actor.name)
              const isDragging = draggingActor === actor.name

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
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    background: isAssigned ? '#0f0f14' : '#18181b',
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
                        loading="lazy"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }}
                        draggable={false}
                      />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '14px' }}>?</div>
                    )}
                  </div>
                  <div style={{ padding: '6px 7px 7px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: isAssigned ? '#3f3f46' : '#f1f5f9', lineHeight: 1.25, marginBottom: '3px' }}>
                      {actor.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <div style={{ fontSize: '11px', color: '#52525b', display: 'flex', gap: '5px' }}>
                        {actor.gender && <span>{actor.gender}</span>}
                        {actor.birthYear && <span>b.{actor.birthYear}</span>}
                        <span style={{ color: isAssigned ? '#3f3f46' : '#4ade80', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                          ${actor.cost}M{!actor.salaryConfirmed && <span style={{ fontWeight: 400, color: '#3f3f46' }}> est</span>}
                        </span>
                      </div>
                      {!isAssigned && (
                        <button
                          onClick={e => { e.stopPropagation(); setConfirmBan(actor.name) }}
                          title={`Ban ${actor.name}`}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0', fontSize: '11px', lineHeight: 1, opacity: 0.35 }}
                        >
                          🚫
                        </button>
                      )}
                    </div>
                    {actor.keywords && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                        {actor.keywords.split(',').map((t: string) => t.trim()).filter(Boolean).slice(0, 3).map(tag => (
                          <span key={tag} style={{ fontSize: '10px', background: '#18181b', border: '1px solid #27272a', borderRadius: '4px', padding: '1px 5px', color: '#71717a' }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Second look */}
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
                          ? <img src={actor.image} alt={actor.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
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
                <div key={role.role_name} style={{ padding: '10px 0', borderBottom: '1px solid #1c1c1e' }}>
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
              {!challenge && (
                <div style={{ fontSize: '14px', fontWeight: 700, color: overBudget ? '#f87171' : '#4ade80', fontVariantNumeric: 'tabular-nums' }}>
                  ${spent}M / ${budget}M
                </div>
              )}
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

      {/* Start over confirm */}
      {confirmStartOver && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}
          onClick={() => setConfirmStartOver(false)}
        >
          <div
            style={{ background: '#111115', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '16px', padding: '28px 28px 24px', width: '340px', textAlign: 'center' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: '28px', marginBottom: '12px' }}>🎬</div>
            <div style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px', color: '#f8fafc' }}>Start over?</div>
            <div style={{ fontSize: '14px', color: '#71717a', marginBottom: '24px', lineHeight: 1.5 }}>
              This will clear your entire cast for {title}. Can&apos;t be undone.
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={() => setConfirmStartOver(false)}
                style={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: '10px', padding: '10px 20px', color: '#a1a1aa', fontSize: '14px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setSelections({})
                  setSavedId(null)
                  setScoreResult(null)
                  localStorage.removeItem(`wl_cast_${slug}`)
                  setConfirmStartOver(false)
                }}
                style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: '10px', padding: '10px 20px', color: '#f87171', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}
              >
                Start over
              </button>
            </div>
          </div>
        </div>
      )}

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
              They won&apos;t appear in any suggestion grid. You can unban them any time from the banned actors list.
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
              These actors won&apos;t appear in any suggestion grid. Click to unblock.
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
                          <img src={actor.image} alt={name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
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

      {/* Score result modal */}
      {scoreResult && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '24px' }}
          onClick={() => setScoreResult(null)}
        >
          <div
            style={{ background: '#111115', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '20px', padding: '36px', width: '100%', maxWidth: '460px' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: '11px', color: '#8b5cf6', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>
              {scoreResult.cached ? 'Cached score' : 'AI score'}
            </div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#f1f5f9', lineHeight: 1.4, marginBottom: '28px', fontStyle: 'italic' }}>
              &quot;{scoreResult.ai_summary}&quot;
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
                best_in_show:        { emoji: '🏆', label: 'Best in Show',            color: '#a78bfa' },
                makable_unwatchable: { emoji: '💰', label: 'Makable but Unwatchable', color: '#f87171' },
                genius_unmakable:    { emoji: '🧠', label: 'Genius but Unmakable',    color: '#a78bfa' },
                hear_me_out:         { emoji: '🔮', label: 'Hear Me Out',             color: '#a855f7' },
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
            <div style={{ fontSize: '20px', fontWeight: 800, marginBottom: '12px' }}>Couldn&apos;t submit</div>
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

      {/* Pitch modal */}
      {showPitchModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '24px' }}
          onClick={() => setShowPitchModal(false)}
        >
          <div
            style={{ background: '#111115', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '480px' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#7c3aed', fontWeight: 800, marginBottom: '10px' }}>
              Save Cast
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#f8fafc', margin: '0 0 8px' }}>
              Want to add an elevator pitch?
            </h2>
            <p style={{ fontSize: '14px', color: '#71717a', margin: '0 0 20px', lineHeight: 1.6 }}>
              Why does this cast work? Why now? Sell it in a few sentences.
            </p>
            <textarea
              value={pitch}
              onChange={e => setPitch(e.target.value)}
              placeholder="e.g. This is a grittier, street-level take. Instead of spectacle, we lean into character — every actor here disappears into the role..."
              maxLength={600}
              rows={5}
              autoFocus
              style={{
                width: '100%', boxSizing: 'border-box',
                background: '#0e0e12', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px', padding: '12px 14px',
                fontSize: '14px', color: '#e2e8f0', lineHeight: 1.6,
                resize: 'vertical', outline: 'none', fontFamily: 'inherit',
              }}
            />
            <div style={{ fontSize: '12px', color: '#3f3f46', textAlign: 'right', marginTop: '4px', marginBottom: '20px' }}>
              {pitch.length}/600
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => handleSaveWithPitch(pitch)}
                style={{ flex: 1, background: '#7c3aed', border: 'none', borderRadius: '10px', padding: '12px', fontSize: '14px', fontWeight: 700, color: '#fff', cursor: 'pointer' }}
              >
                {pitch.trim() ? '🏆 Save with pitch' : '🏆 Save cast'}
              </button>
              <button
                onClick={() => setShowPitchModal(false)}
                style={{ background: 'none', border: '1px solid #27272a', borderRadius: '10px', padding: '12px 18px', fontSize: '14px', color: '#71717a', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Per-role AI prompt modal */}
      {rolePromptModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: '24px' }}
          onClick={() => setRolePromptModal(null)}
        >
          <div
            style={{ background: '#111115', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '640px', maxHeight: '85vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '6px' }}>AI casting prompt</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#f1f5f9' }}>{rolePromptModal.roleName}</div>
                <div style={{ fontSize: '13px', color: '#52525b', marginTop: '4px' }}>Copy this prompt into any AI to get casting suggestions.</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                  {[
                    { label: 'ChatGPT', href: 'https://chat.openai.com', note: 'free' },
                    { label: 'Claude', href: 'https://claude.ai', note: 'free' },
                    { label: 'Gemini', href: 'https://gemini.google.com', note: 'free' },
                    { label: 'Copilot', href: 'https://copilot.microsoft.com', note: 'free' },
                    { label: 'Meta AI', href: 'https://meta.ai', note: 'free' },
                  ].map(({ label, href, note }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px', padding: '5px 10px', fontSize: '12px',
                        color: '#a1a1aa', textDecoration: 'none', fontWeight: 600,
                      }}
                    >
                      {label}
                      <span style={{ fontSize: '10px', color: '#34d399', fontWeight: 700 }}>{note}</span>
                    </a>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setRolePromptModal(null)}
                style={{ background: 'none', border: 'none', color: '#52525b', fontSize: '24px', cursor: 'pointer', lineHeight: 1, marginTop: '-4px', flexShrink: 0 }}
              >×</button>
            </div>

            {/* Prompt box */}
            <div style={{ position: 'relative', marginBottom: '20px' }}>
              <pre style={{
                background: '#0d0d12', border: '1px solid #27272a', borderRadius: '12px',
                padding: '16px', paddingRight: '100px', fontSize: '13px', color: '#94a3b8', lineHeight: 1.65,
                whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, fontFamily: 'inherit',
                maxHeight: '240px', overflowY: 'auto',
              }}>
                {buildAIPrompt(rolePromptModal.roleName)}{rolePromptExtra.trim() ? `\n\nAdditional context from the user:\n${rolePromptExtra.trim()}` : ''}
              </pre>
              <button
                onClick={async () => {
                  const base = buildAIPrompt(rolePromptModal.roleName)
                  const full = rolePromptExtra.trim() ? `${base}\n\nAdditional context from the user:\n${rolePromptExtra.trim()}` : base
                  try { await navigator.clipboard.writeText(full) } catch { /* silent */ }
                  setRolePromptCopied(true)
                  setTimeout(() => setRolePromptCopied(false), 2000)
                }}
                style={{
                  position: 'absolute', top: '10px', right: '10px',
                  background: rolePromptCopied ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${rolePromptCopied ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.12)'}`,
                  borderRadius: '8px', padding: '5px 12px', fontSize: '12px', fontWeight: 700,
                  color: rolePromptCopied ? '#34d399' : '#a1a1aa', cursor: 'pointer',
                }}
              >
                {rolePromptCopied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            {/* Extra detail */}
            <div>
              <div style={{ fontSize: '13px', color: '#a1a1aa', marginBottom: '8px', fontWeight: 600 }}>
                Add extra context <span style={{ color: '#52525b', fontWeight: 400 }}>(optional — appended to the prompt)</span>
              </div>
              <textarea
                value={rolePromptExtra}
                onChange={e => setRolePromptExtra(e.target.value)}
                placeholder={`e.g. The tone is darkly comedic. We want someone who can do physical comedy. Budget is tight so lean toward emerging talent.`}
                rows={4}
                style={{
                  width: '100%', background: '#1a1a22', border: '1px solid #3f3f46', borderRadius: '10px',
                  padding: '12px', color: '#f8fafc', fontSize: '14px', outline: 'none',
                  resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box',
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Actor hover popup */}
      {ActorHoverCard()}

      {/* Ask your AI modal */}
      {showAskYourAI && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: '24px' }}
          onClick={() => setShowAskYourAI(false)}
        >
          <div
            style={{ background: '#111115', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '640px', maxHeight: '85vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '6px' }}>Ask your AI</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#f1f5f9' }}>Casting prompt — {activeRole}</div>
                <div style={{ fontSize: '13px', color: '#52525b', marginTop: '4px' }}>Copy this prompt into any AI. Paste the response back below.</div>
                <div style={{ fontSize: '13px', color: '#52525b', lineHeight: 1.6, marginTop: '12px', padding: '12px 14px', background: '#0d0d12', border: '1px solid #1c1c1e', borderRadius: '10px' }}>
                  We built this originally with an AI search feature baked right into the website. Between you and me, it cost too much. When you activate an AI from a website, each submission costs money. But if you take a prompt we create for you, slap it into another AI, and bring the info back, the cost is zero. Not the greatest User Experience in the history of the internet, but it does keep our costs down. Theoretically you could just play this whole game right in an AI. But it organizes a little better here. So copy the prompt. Drop it in Claude or whatever, and paste the result back into this little box.
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                  {[
                    { label: 'ChatGPT', href: 'https://chat.openai.com', note: 'free tier' },
                    { label: 'Claude', href: 'https://claude.ai', note: 'free tier' },
                    { label: 'Gemini', href: 'https://gemini.google.com', note: 'free tier' },
                    { label: 'Copilot', href: 'https://copilot.microsoft.com', note: 'free' },
                    { label: 'Meta AI', href: 'https://meta.ai', note: 'free' },
                  ].map(({ label, href, note }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px', padding: '5px 10px', fontSize: '12px',
                        color: '#a1a1aa', textDecoration: 'none', fontWeight: 600,
                      }}
                    >
                      {label}
                      <span style={{ fontSize: '10px', color: '#34d399', fontWeight: 700 }}>{note}</span>
                    </a>
                  ))}
                </div>
              </div>
              <button onClick={() => setShowAskYourAI(false)} style={{ background: 'none', border: 'none', color: '#52525b', fontSize: '24px', cursor: 'pointer', lineHeight: 1, marginTop: '-4px' }}>×</button>
            </div>

            {/* Prompt box */}
            <div style={{ position: 'relative', marginBottom: '24px' }}>
              <pre style={{
                background: '#0d0d12', border: '1px solid #27272a', borderRadius: '12px',
                padding: '16px', fontSize: '13px', color: '#94a3b8', lineHeight: 1.65,
                whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, fontFamily: 'inherit',
                maxHeight: '260px', overflowY: 'auto',
              }}>
                {buildAIPrompt()}
              </pre>
              <button
                onClick={copyAIPrompt}
                style={{
                  position: 'absolute', top: '10px', right: '10px',
                  background: aiPromptCopied ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${aiPromptCopied ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.12)'}`,
                  borderRadius: '8px', padding: '5px 12px', fontSize: '12px', fontWeight: 700,
                  color: aiPromptCopied ? '#34d399' : '#a1a1aa', cursor: 'pointer',
                }}
              >
                {aiPromptCopied ? 'Copied!' : 'Copy prompt'}
              </button>
            </div>

            {/* Paste back */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', color: '#a1a1aa', marginBottom: '8px', fontWeight: 600 }}>
                Paste the AI&apos;s response here
              </div>
              <textarea
                value={yourAIPaste}
                onChange={e => handleAIPaste(e.target.value)}
                placeholder={'1. Cate Blanchett\n2. Tilda Swinton\n3. …'}
                rows={6}
                style={{
                  width: '100%', background: '#1a1a22', border: '1px solid #3f3f46', borderRadius: '10px',
                  padding: '12px', color: '#f8fafc', fontSize: '14px', outline: 'none',
                  resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Results */}
            {yourAIMatches.length > 0 && (() => {
              const catA = yourAIMatches.filter(m => m.category === 'A')
              const catB = yourAIMatches.filter(m => m.category === 'B')
              const inDb = yourAIMatches.filter(m => m.inDatabase).length

              function MatchCard({ m }: { m: AIMatch }) {
                const isAssigned = assignedNames.has(m.name)
                const isBlocked = blockedActors.has(m.name)
                const castable = m.inDatabase && !isAssigned && !isBlocked
                return (
                  <div style={{ background: '#0d0d12', border: `1px solid ${m.inDatabase ? 'rgba(255,255,255,0.08)' : '#1c1c1e'}`, borderRadius: '10px', overflow: 'hidden', opacity: isAssigned || isBlocked ? 0.4 : 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px' }}>
                      {m.actor && (
                        <div style={{ width: '36px', height: '50px', borderRadius: '5px', overflow: 'hidden', flexShrink: 0, background: '#1c1c1e' }}>
                          {m.actor.image
                            ? <img src={m.actor.image} alt={m.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                            : <div style={{ width: '100%', height: '100%', background: '#27272a' }} />
                          }
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 700, color: m.inDatabase ? '#f1f5f9' : '#52525b' }}>{m.name}</span>
                          {!m.inDatabase && <span style={{ fontSize: '10px', color: '#3f3f46', fontWeight: 600, background: '#18181b', border: '1px solid #27272a', borderRadius: '4px', padding: '1px 5px' }}>not in database</span>}
                          {m.confidence && <span style={{ fontSize: '10px', color: m.confidence === 'High' ? '#4ade80' : m.confidence === 'Medium' ? '#fbbf24' : '#94a3b8', fontWeight: 700 }}>{m.confidence}</span>}
                        </div>
                        {m.actor && (
                          <div style={{ fontSize: '11px', color: '#52525b' }}>
                            ${m.actor.cost}M{!m.actor.salaryConfirmed && ' est'}
                            {m.actor.knownFor && <> · {m.actor.knownFor.split(',')[0]}</>}
                          </div>
                        )}
                      </div>
                      {castable && (
                        <button
                          onClick={() => { assignToSlot(activeRole, m.name, 0); setShowAskYourAI(false) }}
                          style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '7px', padding: '5px 10px', fontSize: '12px', fontWeight: 700, color: '#34d399', cursor: 'pointer', flexShrink: 0 }}
                        >
                          Cast →
                        </button>
                      )}
                      {!m.inDatabase && !isAssigned && !isBlocked && (() => {
                        const status = actorSubmissions[m.name]
                        return (
                          <button
                            onClick={() => status !== 'done' && submitActorRequest(m.name)}
                            disabled={status === 'loading' || status === 'done'}
                            style={{
                              background: status === 'done' ? 'rgba(16,185,129,0.1)' : 'rgba(59,130,246,0.1)',
                              border: `1px solid ${status === 'done' ? 'rgba(16,185,129,0.3)' : 'rgba(59,130,246,0.3)'}`,
                              borderRadius: '7px', padding: '5px 10px', fontSize: '12px', fontWeight: 700,
                              color: status === 'done' ? '#34d399' : status === 'error' ? '#f87171' : '#60a5fa',
                              cursor: status === 'loading' || status === 'done' ? 'default' : 'pointer',
                              flexShrink: 0,
                            }}
                          >
                            {status === 'loading' ? 'Requesting…' : status === 'done' ? '✓ Requested' : status === 'error' ? 'Try again' : '+ Add to database'}
                          </button>
                        )
                      })()}
                      {isAssigned && <span style={{ fontSize: '11px', color: '#52525b', flexShrink: 0 }}>Already cast</span>}
                      {isBlocked && <span style={{ fontSize: '11px', color: '#52525b', flexShrink: 0 }}>Banned</span>}
                    </div>
                    {m.justification && (
                      <div style={{ padding: '0 12px 10px', fontSize: '12px', color: '#71717a', lineHeight: 1.55, borderTop: '1px solid #18181b', paddingTop: '8px' }}>
                        {m.justification}
                        {m.productionNote && (
                          <div style={{ marginTop: '5px', fontSize: '11px', color: '#3f3f46', fontStyle: 'italic' }}>
                            Would work if: {m.productionNote}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              }

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ fontSize: '11px', color: '#52525b' }}>
                    {inDb} of {yourAIMatches.length} suggestions found in our database
                  </div>

                  {catA.length > 0 && (
                    <div>
                      <div style={{ fontSize: '11px', color: '#60a5fa', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>
                        Category A — Matched casting
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {catA.map(m => <MatchCard key={m.name} m={m} />)}
                      </div>
                    </div>
                  )}

                  {catB.length > 0 && (
                    <div>
                      <div style={{ fontSize: '11px', color: '#a78bfa', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>
                        Category B — Wildcard casting
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {catB.map(m => <MatchCard key={m.name} m={m} />)}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}

            {yourAIPaste.trim() && yourAIMatches.length === 0 && (
              <div style={{ fontSize: '14px', color: '#52525b', lineHeight: 1.6 }}>
                No results parsed. Make sure the AI returned lines starting with <code style={{ background: '#18181b', padding: '1px 5px', borderRadius: '4px', fontSize: '12px' }}>CATEGORY_A_1:</code> — you may need to ask it to reformat.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hidden share card — captured by html-to-image */}
      <div
        ref={shareCardRef}
        style={{
          position: 'fixed', left: '-9999px', top: 0,
          width: '680px',
          background: '#09090b',
          padding: '32px',
          fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
          color: '#f8fafc',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <div style={{ fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#3b82f6', fontWeight: 700, marginBottom: '4px' }}>Wilder League</div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#f8fafc' }}>{title}</div>
            {challenge && <div style={{ fontSize: '12px', color: '#a78bfa', marginTop: '4px' }}>{challenge.badge} {challenge.headline}</div>}
          </div>
          {scoreResult && (
            <div style={{ display: 'flex', gap: '12px' }}>
              {[
                { label: 'Hear Me Out', value: scoreResult.hear_me_out_score, color: '#a855f7' },
                { label: 'Greenlight', value: scoreResult.green_light_score, color: '#22c55e' },
                { label: 'Quality', value: scoreResult.quality_score, color: '#3b82f6' },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 900, color: s.color, fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
                  <div style={{ fontSize: '10px', color: '#71717a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {scoreResult?.ai_summary && (
          <div style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic', marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            &quot;{scoreResult.ai_summary}&quot;
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          {roles.map(r => {
            const actorName = selections[r.role_name]?.[0]
            const actor = allActors.find(a => a.name === actorName)
            return (
              <div key={r.role_name} style={{ background: '#111115', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ display: 'flex', gap: '10px', padding: '10px' }}>
                  <div style={{ width: '48px', height: '64px', borderRadius: '6px', overflow: 'hidden', background: '#1c1c1e', flexShrink: 0 }}>
                    {actor?.image
                      ? <img src={actor.image} alt={actor.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} crossOrigin="anonymous" />
                      : <div style={{ width: '100%', height: '100%', background: '#27272a' }} />
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '10px', color: '#71717a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.role_name}</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: actorName ? '#f1f5f9' : '#3f3f46', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{actorName || '—'}</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ marginTop: '20px', fontSize: '11px', color: '#3f3f46', textAlign: 'right' }}>wilderleague.com</div>
      </div>

    </div>
  )

  // ── Save cast ──
  function handleSave() {
    if (saveLoading) return
    if (!isMember) return
    setPitch('')
    setShowPitchModal(true)
  }

  async function handleSaveWithPitch(pitchText: string) {
    setShowPitchModal(false)
    setSaveLoading(true)
    try {
      const primarySelections: Record<string, string> = {}
      for (const [role, slots] of Object.entries(selections)) {
        if (slots[0]) primarySelections[role] = slots[0]
      }
      const res = await fetch('/api/save-cast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title_slug: slug,
          title_name: title,
          poster_path: null,
          selections: primarySelections,
          total_cost: spent,
          budget,
          pitch: pitchText || null,
        }),
      })
      const data = await res.json()
      if (data.id) setSavedId(data.id)
    } catch {}
    finally { setSaveLoading(false) }
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
        body: JSON.stringify({ movie_slug: slug, movie_title: title, budget, cast: castWithDetails, isChallenge: !!challenge }),
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

    const popupWidth = 240
    const spaceRight = window.innerWidth - rect.right
    const left = spaceRight > popupWidth + 12
      ? rect.right + 8
      : rect.left - popupWidth - 8

    const top = Math.min(rect.top, window.innerHeight - 340)

    return (
      <div
        onMouseEnter={() => { if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current) }}
        onMouseLeave={() => {
          if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
          hoverTimeoutRef.current = setTimeout(() => setHoveredActor(null), 100)
        }}
        style={{
          position: 'fixed', left, top,
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
          <div style={{ width: '100%', aspectRatio: '2/3', overflow: 'hidden', background: '#111' }}>
            <img src={actor.image} alt={actor.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
        )}

        <div style={{ padding: '12px 14px 14px' }}>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#f8fafc', marginBottom: '2px' }}>{actor.name}</div>
          <div style={{ fontSize: '12px', color: '#52525b', marginBottom: '8px', display: 'flex', gap: '8px' }}>
            {actor.gender && <span>{actor.gender}</span>}
            {actor.birthYear && <span>b. {actor.birthYear}</span>}
            <span style={{ color: '#4ade80', fontWeight: 700 }}>${actor.cost}M{!actor.salaryConfirmed && <span style={{ color: '#3f3f46', fontWeight: 400 }}> est</span>}</span>
          </div>

          {knownForItems.length > 0 && (
            <div style={{ marginBottom: '8px' }}>
              {knownForItems.map(item => (
                <div key={item} style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.4 }}>· {item}</div>
              ))}
            </div>
          )}

          {bioSnippet && (
            <div style={{ fontSize: '12px', color: '#71717a', lineHeight: 1.5 }}>{bioSnippet}</div>
          )}

          <button
            onClick={() => { assignToSlot(activeRole, actor.name, 0); setHoveredActor(null) }}
            disabled={assignedNames.has(actor.name)}
            style={{
              marginTop: '10px', width: '100%',
              background: assignedNames.has(actor.name) ? '#18181b' : 'rgba(59,130,246,0.12)',
              border: `1px solid ${assignedNames.has(actor.name) ? '#27272a' : 'rgba(59,130,246,0.3)'}`,
              borderRadius: '8px', padding: '7px',
              color: assignedNames.has(actor.name) ? '#3f3f46' : '#60a5fa',
              fontSize: '13px', fontWeight: 600, cursor: assignedNames.has(actor.name) ? 'default' : 'pointer',
            }}
          >
            {assignedNames.has(actor.name) ? 'Already cast' : `Cast as ${activeRole}`}
          </button>
        </div>
      </div>
    )
  }
}

// ── CastSlot component ──────────────────────────────────────────────────────

type CastSlotProps = {
  actor: CastActor | undefined
  isDragOver: boolean
  isPrimary?: boolean
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  draggable?: boolean
  onSlotDragStart?: (e: React.DragEvent) => void
  onSlotDragEnd?: (e: React.DragEvent) => void
  onClear?: () => void
}

function CastSlot({ actor, isDragOver, isPrimary, onDragOver, onDragLeave, onDrop, draggable, onSlotDragStart, onSlotDragEnd, onClear }: CastSlotProps) {
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      style={{
        border: `2px ${isDragOver ? 'solid #6366f1' : actor ? 'solid rgba(59,130,246,0.4)' : 'dashed #2d2d3a'}`,
        borderRadius: '10px',
        background: isDragOver ? 'rgba(99,102,241,0.1)' : actor ? 'rgba(15,23,42,0.8)' : 'transparent',
        padding: actor ? '10px 12px' : '14px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        minHeight: '64px',
        transition: 'border-color 0.12s, background 0.12s',
        cursor: actor && draggable ? 'grab' : 'default',
      }}
      draggable={draggable && !!actor}
      onDragStart={onSlotDragStart}
      onDragEnd={onSlotDragEnd}
    >
      {actor ? (
        <>
          <div style={{ width: '44px', height: '58px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0, background: '#1c1c1e' }}>
            {actor.image
              ? <img src={actor.image} alt={actor.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }} draggable={false} />
              : <div style={{ width: '100%', height: '100%', background: '#27272a' }} />
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#f1f5f9', lineHeight: 1.2, marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {actor.name}
            </div>
            <div style={{ fontSize: '13px', color: '#4ade80', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              ${actor.cost}M{!actor.salaryConfirmed && <span style={{ fontSize: '12px', fontWeight: 400, color: '#52525b' }}> est</span>}
            </div>
            {actor.knownFor && (
              <div style={{ fontSize: '12px', color: '#52525b', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {actor.knownFor.split(';')[0]?.trim()}
              </div>
            )}
          </div>
          {onClear && (
            <button
              onClick={e => { e.stopPropagation(); onClear() }}
              style={{ background: 'none', border: 'none', color: '#52525b', cursor: 'pointer', fontSize: '18px', lineHeight: 1, padding: '2px', flexShrink: 0 }}
            >
              ×
            </button>
          )}
        </>
      ) : (
        <div style={{ fontSize: '14px', color: isDragOver ? '#a5b4fc' : '#3f3f46', fontStyle: 'italic', flex: 1, textAlign: 'center' }}>
          {isDragOver ? 'Drop here' : isPrimary ? 'Drag an actor here' : 'Optional'}
        </div>
      )}
    </div>
  )
}
