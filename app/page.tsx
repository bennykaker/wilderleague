import Link from 'next/link'
import { getTitles } from './data/titles'
import { getEnrichedActors } from './data/enrichedActors'
import { getChallenges } from './data/challenges'
import NewHereModal from './components/NewHereModal'
import TitleSearch from './components/TitleSearch'
import AuthButton from './components/AuthButton'
import { createClient } from '../lib/supabase/server'

export default async function HomePage() {
  const allChallenges = getChallenges().filter(c => c.active)
  const featuredChallenges = allChallenges.slice(0, 9)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let isMember = false
  let username: string | null = null
  let memberNumber: number | null = null
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('is_member, username, member_number').eq('id', user.id).single()
    isMember = profile?.is_member ?? false
    username = profile?.username ?? null
    memberNumber = profile?.member_number ?? null
  }
  const [all] = await Promise.all([
    getTitles(),
    getEnrichedActors(), // warm the cache for movie pages
  ])

  const titleMap = new Map(all.map(t => [t.slug, t]))
  const films = all.filter(t => t.type !== 'book')
  const books = all.filter(t => t.type === 'book')

  return (
    <main style={{ minHeight: '100vh', background: '#09090b', color: '#f8fafc', padding: '48px 28px', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>
      <style>{`
        .title-card { transition: border-color 0.15s; }
        .title-card:hover { border-color: rgba(255,255,255,0.18) !important; }
        .featured-card { transition: transform 0.18s, box-shadow 0.18s; }
        .featured-card:hover { transform: translateY(-5px); box-shadow: 0 16px 48px rgba(0,0,0,0.7) !important; }
      `}</style>

      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '24px', marginBottom: '52px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#3b82f6', marginBottom: '12px', fontWeight: 700 }}>
              Wilderleague
            </div>
            <h1 style={{ fontSize: '42px', fontWeight: 900, lineHeight: 1.05, margin: '0 0 14px' }}>
              Recast movies.<br />Make them better.
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '4px' }}>
              <NewHereModal />
              <Link href="/actors" style={{ fontSize: '15px', color: '#a1a1aa', textDecoration: 'none', borderBottom: '1px solid #52525b', paddingBottom: '2px' }}>
                Browse actor pool →
              </Link>
              <Link href="/suggest" style={{ fontSize: '15px', color: '#a1a1aa', textDecoration: 'none', borderBottom: '1px solid #52525b', paddingBottom: '2px' }}>
                Did we miss a film? →
              </Link>
              <Link href="/submit/actor" style={{ fontSize: '15px', color: '#a1a1aa', textDecoration: 'none', borderBottom: '1px solid #52525b', paddingBottom: '2px' }}>
                Did we miss an actor? →
              </Link>
              <Link href="/leaderboard" style={{ fontSize: '15px', color: '#a1a1aa', textDecoration: 'none', borderBottom: '1px solid #52525b', paddingBottom: '2px' }}>
                Leaderboard →
              </Link>
              <AuthButton user={user ? { email: user.email, username, isMember, memberNumber } : null} />
            </div>
          </div>
        </div>

        {/* Two-column layout: main left, books right */}
        <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-start' }}>

          {/* Left: featured + full search */}
          <div style={{ flex: 3, minWidth: 0 }}>

            {/* Challenge Castings — featured grid */}
            <div style={{ marginBottom: '52px' }}>
              <div style={{ fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#7c3aed', marginBottom: '18px', fontWeight: 600 }}>
                Casting Challenges
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                {featuredChallenges.map(c => {
                  const t = titleMap.get(c.movie_slug)
                  return (
                    <Link key={c.id} href={`/challenge/${c.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <div className="featured-card" style={{
                        borderRadius: '12px',
                        overflow: 'hidden',
                        background: '#111115',
                        border: '1px solid rgba(139,92,246,0.18)',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                        position: 'relative',
                      }}>
                        <div style={{ position: 'relative' }}>
                          {t?.poster_path ? (
                            <img
                              src={t.poster_path}
                              alt={t.title}
                              style={{ width: '100%', aspectRatio: '2/3', objectFit: 'cover', display: 'block' }}
                            />
                          ) : (
                            <div style={{
                              width: '100%', aspectRatio: '2/3',
                              background: 'linear-gradient(160deg, #1e1b4b 0%, #2e1065 60%, #0f0f1a 100%)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              <span style={{ fontSize: '32px' }}>{c.badge}</span>
                            </div>
                          )}
                          <div style={{
                            position: 'absolute', top: '10px', left: '10px',
                            background: 'rgba(109,40,217,0.92)', backdropFilter: 'blur(4px)',
                            borderRadius: '6px', padding: '3px 8px',
                            fontSize: '10px', fontWeight: 800, color: '#ede9fe',
                            letterSpacing: '0.1em', textTransform: 'uppercase',
                          }}>
                            {c.badge} Challenge Cast
                          </div>
                        </div>
                        <div style={{ padding: '12px 14px 14px' }}>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#f1f5f9', marginBottom: '4px', lineHeight: 1.3 }}>
                            {c.teaser.split('\n')[0]}
                          </div>
                          <div style={{ fontSize: '11px', color: '#a78bfa', lineHeight: 1.4 }}>
                            {c.teaser.split('\n')[1]}
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* Full searchable library */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '40px' }}>
              <div style={{ fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#a1a1aa', marginBottom: '6px', fontWeight: 600 }}>
                Regular Re-casts
              </div>
              <p style={{ fontSize: '14px', color: '#71717a', marginBottom: '20px', lineHeight: 1.5 }}>
                Use our whole library of actors to come up with the best cast possible.
              </p>
              <TitleSearch titles={films.map(t => ({ slug: t.slug, title: t.title, year: t.year, type: t.type, budget: t.budget, poster_path: t.poster_path, author: null }))} />
            </div>

          </div>

          {/* Books — right column */}
          {books.length > 0 && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#818cf8', marginBottom: '4px', fontWeight: 700 }}>BookCast</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#f8fafc', marginBottom: '14px' }}>Cast the Book</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {books.map(t => (
                  <Link key={t.slug} href={`/${t.slug}`} style={{ textDecoration: 'none' }}>
                    <div className="title-card" style={{
                      display: 'flex', gap: '10px', alignItems: 'center',
                      padding: '10px 12px', borderRadius: '10px',
                      border: '1px solid rgba(99,102,241,0.15)',
                      background: '#0f0f14',
                    }}>
                      <div style={{
                        width: '30px', height: '44px', borderRadius: '4px', flexShrink: 0,
                        background: 'linear-gradient(135deg, #1e1b4b 0%, #4c1d95 100%)',
                        border: '1px solid rgba(99,102,241,0.3)',
                      }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#e0e7ff', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</div>
                        {(t as any).author && <div style={{ fontSize: '11px', color: '#6366f1', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{(t as any).author}</div>}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>
    </main>
  )
}
