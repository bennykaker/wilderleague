import Link from 'next/link'
import { getTitles } from './data/titles'
import { getActiveChallenge } from './data/challenges'
import NewHereModal from './components/NewHereModal'
import TitleSearch from './components/TitleSearch'
import AuthButton from './components/AuthButton'
import { createClient } from '../lib/supabase/server'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let isMember = false
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('is_member').eq('id', user.id).single()
    isMember = profile?.is_member ?? false
  }
  const all = await getTitles()
  const featured = all.slice(0, 5)
  const challenge = getActiveChallenge()

  return (
    <main style={{ minHeight: '100vh', background: '#09090b', color: '#f8fafc', padding: '48px 28px', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>
      <style>{`
        .title-card { transition: border-color 0.15s; }
        .title-card:hover { border-color: rgba(255,255,255,0.18) !important; }
        .poster-card { transition: transform 0.15s, box-shadow 0.15s; }
        .poster-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(0,0,0,0.6) !important; }
        .challenge-card:hover { border-color: rgba(251,191,36,0.5) !important; background: rgba(251,191,36,0.08) !important; }
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
              <Link href="/actors" style={{ fontSize: '15px', color: '#a1a1aa', textDecoration: 'none', borderBottom: '1px solid #52525b', paddingBottom: '2px' }}>
                Browse actor pool →
              </Link>
              <Link href="/pricing" style={{ fontSize: '15px', color: '#a1a1aa', textDecoration: 'none', borderBottom: '1px solid #52525b', paddingBottom: '2px' }}>
                Membership →
              </Link>
              <AuthButton user={user ? { email: user.email, isMember } : null} />
            </div>
          </div>

          {/* Weekly challenge card */}
          {challenge && (
            <Link href={`/challenge/${challenge.id}`} style={{ textDecoration: 'none', flexShrink: 0, width: '300px' }}>
              <div className="challenge-card" style={{
                border: '1px solid rgba(251,191,36,0.3)',
                borderRadius: '16px',
                padding: '20px',
                background: 'rgba(251,191,36,0.05)',
                transition: 'border-color 0.15s, background 0.15s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '22px' }}>{challenge.badge}</span>
                  <span style={{ fontSize: '14px', color: '#fbbf24', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{challenge.label}</span>
                </div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#fef3c7', lineHeight: 1.3, marginBottom: '8px' }}>
                  {challenge.headline}
                </div>
                <div style={{ fontSize: '15px', color: '#d97706', lineHeight: 1.5, marginBottom: '16px' }}>
                  {challenge.description}
                </div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#fbbf24' }}>
                  Take the challenge →
                </div>
              </div>
            </Link>
          )}
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
                  {t.poster_path ? (
                    <img
                      src={t.poster_path}
                      alt={t.title}
                      style={{ width: '100%', aspectRatio: '2/3', objectFit: 'cover', display: 'block' }}
                    />
                  ) : (
                    <div style={{ width: '100%', aspectRatio: '2/3', background: '#111115', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a1a1aa', fontSize: '14px', padding: '12px', textAlign: 'center' }}>
                      {t.title}
                    </div>
                  )}
                  <div style={{ padding: '10px 12px', background: '#111115' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9', lineHeight: 1.3, marginBottom: '4px' }}>{t.title}</div>
                    <div style={{ fontSize: '13px', color: '#a1a1aa' }}>{t.year} · ${t.budget}M</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Searchable title list */}
        <div style={{ marginBottom: '20px' }}>
          <TitleSearch titles={all.map(t => ({ slug: t.slug, title: t.title, year: t.year, type: t.type, budget: t.budget, poster_path: t.poster_path }))} />
        </div>

      </div>
    </main>
  )
}
