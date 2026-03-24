import Link from 'next/link'
import { movies } from './data/movies'

export default function HomePage() {
  const movieList = Object.values(movies)

  return (
    <main style={{ minHeight: '100vh', background: '#09090b', color: '#f8fafc', padding: '48px 28px' }}>
      <style>{`
        .movie-card { transition: border-color 0.15s; }
        .movie-card:hover { border-color: rgba(255,255,255,0.18) !important; }
      `}</style>

      <div style={{ maxWidth: '860px', margin: '0 auto' }}>
        <div style={{ marginBottom: '48px' }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#3b82f6', marginBottom: '12px' }}>
            Wilderleague
          </div>
          <h1 style={{ fontSize: '42px', fontWeight: 900, lineHeight: 1.05, margin: '0 0 14px' }}>
            Recast movies.<br />Under constraint.
          </h1>
          <p style={{ fontSize: '16px', color: '#71717a', maxWidth: '520px', lineHeight: 1.6, margin: 0 }}>
            Pick a movie. Drag actors into iconic roles. Work within the budget. Share your cast.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {movieList.map(movie => (
            <Link key={movie.slug} href={`/${movie.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="movie-card" style={{
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '16px',
                padding: '24px',
                background: '#111115',
                cursor: 'pointer',
              }}>
                <div style={{ fontSize: '11px', color: '#52525b', marginBottom: '8px' }}>{movie.year}</div>
                <div style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>{movie.title}</div>
                <div style={{ fontSize: '13px', color: '#71717a', lineHeight: 1.5, marginBottom: '16px' }}>{movie.logline}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                  {movie.roles.map(role => (
                    <span key={role} style={{ fontSize: '11px', background: '#18181b', border: '1px solid #27272a', borderRadius: '6px', padding: '3px 8px', color: '#a1a1aa' }}>
                      {role}
                    </span>
                  ))}
                </div>
                <div style={{ fontSize: '12px', color: '#3b82f6', fontWeight: 600 }}>
                  Recast this → ${movie.budget}M budget
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
