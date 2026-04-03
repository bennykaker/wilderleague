import Link from 'next/link'
import { getTitles } from './data/titles'
import { getEnrichedActors } from './data/enrichedActors'
import NewHereModal from './components/NewHereModal'
import TitleSearch from './components/TitleSearch'
import AuthButton from './components/AuthButton'
import { createClient } from '../lib/supabase/server'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let isMember = false
  let username: string | null = null
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('is_member, username').eq('id', user.id).single()
    isMember = profile?.is_member ?? false
    username = profile?.username ?? null
  }
  const [all] = await Promise.all([
    getTitles(),
    getEnrichedActors(), // warm the cache for movie pages
  ])
  const films = all.filter(t => t.type !== 'book')
  const books = all.filter(t => t.type === 'book')

  return (
    <main style={{ minHeight: '100vh', background: '#09090b', color: '#f8fafc', padding: '48px 28px', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>
      <Link href="/challenges" style={{
        position: 'fixed', top: '20px', right: '24px', zIndex: 50,
        background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.35)',
        borderRadius: '10px', padding: '9px 16px', fontSize: '14px', fontWeight: 700,
        color: '#fbbf24', textDecoration: 'none',
      }}>
        Casting Challenges →
      </Link>
      <style>{`
        .title-card { transition: border-color 0.15s; }
        .title-card:hover { border-color: rgba(255,255,255,0.18) !important; }
        .poster-card { transition: transform 0.15s, box-shadow 0.15s; }
        .poster-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(0,0,0,0.6) !important; }
      `}</style>

      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        {/* Header row: branding + weekly challenge */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '24px', marginBottom: '52px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#3b82f6', marginBottom: '12px', fontWeight: 700 }}>
              Wilderleague
            </div>
            <h1 style={{ fontSize: '42px', fontWeight: 900, lineHeight: 1.05, margin: '0 0 14px' }}>
              Recast movies.<br />Make them better.
            </h1>
            <p style={{ fontSize: '18px', color: '#a1a1aa', maxWidth: '520px', lineHeight: 1.6, margin: '0 0 20px' }}>
              Pick a film or show. Drag actors into iconic roles. Work within the budget. Share your cast.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '4px' }}>
              <NewHereModal />
              <Link href="/marlowe" style={{ fontSize: '15px', color: '#a1a1aa', textDecoration: 'none', borderBottom: '1px solid #52525b', paddingBottom: '2px' }}>
                Meet Marlowe →
              </Link>
              <Link href="/challenges" style={{ fontSize: '15px', color: '#a1a1aa', textDecoration: 'none', borderBottom: '1px solid #52525b', paddingBottom: '2px' }}>
                Casting Challenges →
              </Link>
              <Link href="/actors" style={{ fontSize: '15px', color: '#a1a1aa', textDecoration: 'none', borderBottom: '1px solid #52525b', paddingBottom: '2px' }}>
                Browse actor pool →
              </Link>
              <Link href="/submit/movie" style={{ fontSize: '15px', color: '#a1a1aa', textDecoration: 'none', borderBottom: '1px solid #52525b', paddingBottom: '2px' }}>
                Suggest a film →
              </Link>
              <Link href="/submit/art" style={{ fontSize: '15px', color: '#a1a1aa', textDecoration: 'none', borderBottom: '1px solid #52525b', paddingBottom: '2px' }}>
                Submit art →
              </Link>
              <Link href="/pricing" style={{ fontSize: '15px', color: '#a1a1aa', textDecoration: 'none', borderBottom: '1px solid #52525b', paddingBottom: '2px' }}>
                Membership →
              </Link>
              <AuthButton user={user ? { email: user.email, username, isMember } : null} />
            </div>
          </div>

        </div>

        {/* Two-column: films left, books right */}
        <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start' }}>

          {/* Films — 3/4 */}
          <div style={{ flex: 3, minWidth: 0 }}>
            <TitleSearch titles={films.map(t => ({ slug: t.slug, title: t.title, year: t.year, type: t.type, budget: t.budget, poster_path: t.poster_path, author: null }))} />
          </div>

          {/* Books — 1/4 */}
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
