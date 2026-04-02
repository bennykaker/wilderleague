'use client'

import { useState } from 'react'
import Link from 'next/link'

type Title = {
  slug: string
  title: string
  year: number
  type: string
  budget: number
  poster_path: string | null
  author?: string | null
}

export default function TitleSearch({ titles }: { titles: Title[] }) {
  const [query, setQuery] = useState('')

  const filtered = query.trim()
    ? titles.filter(t => t.title.toLowerCase().includes(query.toLowerCase()))
    : titles

  return (
    <>
      <div style={{ marginBottom: '24px' }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder='Search films & shows…'
          style={{
            width: '100%',
            boxSizing: 'border-box',
            background: '#18181b',
            border: '1px solid #27272a',
            borderRadius: '12px',
            padding: '13px 18px',
            color: '#f8fafc',
            fontSize: '16px',
            outline: 'none',
            fontFamily: 'inherit',
          }}
        />
      </div>

      <div style={{ fontSize: '14px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#a1a1aa', marginBottom: '16px', fontWeight: 600 }}>
        {query.trim()
          ? `${filtered.length} result${filtered.length !== 1 ? 's' : ''}`
          : `All titles — ${titles.length} films, shows & books`}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
        {filtered.map(t => (
          <Link key={t.slug} href={`/${t.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="title-card" style={{
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '12px',
              padding: '16px 18px',
              background: '#111115',
              display: 'flex',
              gap: '14px',
              alignItems: 'center',
            }}>
              {t.poster_path ? (
                <img src={t.poster_path} alt={t.title} style={{ width: '44px', height: '66px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }} />
              ) : t.type === 'book' ? (
                <div style={{
                  width: '44px', height: '66px', borderRadius: '6px', flexShrink: 0,
                  background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
                  border: '1px solid rgba(99,102,241,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px',
                }}>
                  <span style={{ fontSize: '8px', color: '#a5b4fc', fontWeight: 700, textAlign: 'center', lineHeight: 1.3, wordBreak: 'break-word' }}>
                    {t.title.split(' ').slice(0, 3).join(' ')}
                  </span>
                </div>
              ) : (
                <div style={{
                  width: '44px', height: '66px', borderRadius: '6px', flexShrink: 0,
                  background: 'linear-gradient(160deg, #0f172a 0%, #1e293b 60%, #0f2027 100%)',
                  border: '1px solid rgba(148,163,184,0.15)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px', padding: '4px',
                }}>
                  <span style={{ fontSize: '13px', lineHeight: 1 }}>🎬</span>
                  <span style={{ fontSize: '7px', color: '#94a3b8', fontWeight: 700, textAlign: 'center', lineHeight: 1.3, wordBreak: 'break-word', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {t.title.split(' ').slice(0, 3).join(' ')}
                  </span>
                </div>
              )}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#f1f5f9', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</div>
                <div style={{ fontSize: '14px', color: '#a1a1aa', marginBottom: '6px' }}>
                  {t.type === 'book' ? (
                    <>{t.year} · <span style={{ color: '#818cf8' }}>Novel</span>{t.author ? ` · ${t.author}` : ''}</>
                  ) : (
                    <>{t.year} · {t.type === 'tv' ? 'TV' : 'Film'} · ${t.budget}M</>
                  )}
                </div>
                <div style={{ fontSize: '14px', color: '#3b82f6', fontWeight: 600 }}>
                  {t.type === 'book' ? 'Cast it →' : 'Recast →'}
                </div>
              </div>
            </div>
          </Link>
        ))}
        {filtered.length === 0 && (
          <div style={{ gridColumn: '1 / -1', padding: '40px 0', textAlign: 'center', color: '#a1a1aa', fontSize: '15px' }}>
            No titles matching &ldquo;{query}&rdquo;
          </div>
        )}
      </div>
    </>
  )
}
