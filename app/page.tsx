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
  const featured = films.filter(t => t.poster_path).slice(0, 5)

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
              <Link href="/pricing" style={{ fontSize: '15px', color: '#a1a1aa', textDecoration: 'none', borderBottom: '1px solid #52525b', paddingBottom: '2px' }}>
                Membership →
              </Link>
              <AuthButton user={user ? { email: user.email, username, isMember } : null} />
            </div>
          </div>

        </div>

        {/* Featured poster strip */}
        <div style={{ marginBottom: '52px' }}>
          <div style={{ fontSize: '14px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#a1a1aa', marginBottom: '16px', fontWeight: 600 }}>
            Featured
          </div>
          <div style={{ display: 'flex', gap: '14px', overflowX: 'auto', paddingBottom: '8px' }}>
            {featured.map(t => (
              <Link key={t.slug} href={`/${t.slug}`} style={{ textDecoration: 'none', flexShrink: 0 }}>
                <div className="poster-card" style={{ width: '160px', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
                  <img
                    src={t.poster_path}
                    alt={t.title}
                    style={{ width: '100%', aspectRatio: '2/3', objectFit: 'cover', display: 'block' }}
                  />
                  <div style={{ padding: '10px 12px', background: '#111115' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9', lineHeight: 1.3, marginBottom: '4px' }}>{t.title}</div>
                    <div style={{ fontSize: '13px', color: '#a1a1aa' }}>
                      {t.type === 'book' ? `${t.year} · Novel` : `${t.year} · $${t.budget}M`}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Searchable films list */}
        <div style={{ marginBottom: '64px' }}>
          <TitleSearch titles={films.map(t => ({ slug: t.slug, title: t.title, year: t.year, type: t.type, budget: t.budget, poster_path: t.poster_path, author: null }))} />
        </div>

        {/* BookTok section */}
        {books.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '14px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#818cf8', marginBottom: '6px', fontWeight: 700 }}>
                BookTok
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
                  Cast the Book
                </h2>
                <span style={{ fontSize: '15px', color: '#71717a' }}>Dream adaptations for your favourite reads</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '14px', overflowX: 'auto', paddingBottom: '12px' }}>
              {books.map(t => (
                <Link key={t.slug} href={`/${t.slug}`} style={{ textDecoration: 'none', flexShrink: 0 }}>
                  <div className="poster-card" style={{ width: '148px', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(99,102,241,0.2)', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
                    <div style={{
                      width: '100%', aspectRatio: '2/3',
                      background: 'linear-gradient(160deg, #1e1b4b 0%, #312e81 60%, #4c1d95 100%)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      padding: '14px 10px', textAlign: 'center', gap: '8px',
                    }}>
                      <div style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#818cf8', fontWeight: 700 }}>Novel</div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#e0e7ff', lineHeight: 1.3 }}>{t.title}</div>
                      {(t as any).author && (
                        <div style={{ fontSize: '10px', color: '#a5b4fc', lineHeight: 1.4, marginTop: '2px' }}>{(t as any).author}</div>
                      )}
                    </div>
                    <div style={{ padding: '10px 12px', background: '#0f0f14' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#f1f5f9', lineHeight: 1.3, marginBottom: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</div>
                      <div style={{ fontSize: '12px', color: '#818cf8' }}>Cast it →</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>
    </main>
  )
}
