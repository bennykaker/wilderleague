'use client'

import { useState } from 'react'
import Link from 'next/link'

type Title = {
  slug: string
  title: string
  year: number
  type: 'movie' | 'tv'
  budget: number
  poster_path: string
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
          : `All titles — ${titles.length} films & shows`}
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
              ) : (
                <div style={{ width: '44px', height: '66px', background: '#18181b', borderRadius: '6px', flexShrink: 0 }} />
              )}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#f1f5f9', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</div>
                <div style={{ fontSize: '14px', color: '#a1a1aa', marginBottom: '6px' }}>{t.year} · {t.type === 'tv' ? 'TV' : 'Film'} · ${t.budget}M</div>
                <div style={{ fontSize: '14px', color: '#3b82f6', fontWeight: 600 }}>Recast →</div>
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
