'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function SubmitArtPage() {
  const [form, setForm] = useState({ name: '', email: '', title: '', character: '', message: '' })
  const [agreed, setAgreed] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  function update(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.email || !form.title || !file) {
      setErrorMsg('Please fill in all required fields and attach your artwork.')
      return
    }

    if (!agreed) {
      setErrorMsg('Please confirm the licence declaration before submitting.')
      return
    }

    setStatus('sending')
    setErrorMsg('')

    const data = new FormData()
    data.append('name', form.name)
    data.append('email', form.email)
    data.append('title', form.title)
    data.append('character', form.character)
    data.append('message', form.message)
    data.append('file', file)

    const res = await fetch('/api/submit-art', { method: 'POST', body: data })
    if (res.ok) {
      setStatus('done')
    } else {
      const d = await res.json().catch(() => ({}))
      setErrorMsg(d.error || 'Something went wrong. Try again.')
      setStatus('error')
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', background: '#18181b', border: '1px solid #3f3f46',
    borderRadius: '8px', color: '#f1f5f9', fontSize: '15px', outline: 'none',
    fontFamily: 'inherit',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '13px', fontWeight: 600, color: '#a1a1aa', marginBottom: '6px',
  }

  return (
    <main style={{ minHeight: '100vh', background: '#09090b', color: '#f8fafc', padding: '48px 28px', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>
      <div style={{ maxWidth: '560px', margin: '0 auto' }}>

        <Link href="/" style={{ fontSize: '14px', color: '#71717a', textDecoration: 'none', display: 'inline-block', marginBottom: '32px' }}>
          ← Back
        </Link>

        <div style={{ fontSize: '12px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#818cf8', marginBottom: '8px', fontWeight: 700 }}>
          BookCast
        </div>
        <h1 style={{ fontSize: '28px', fontWeight: 900, margin: '0 0 10px' }}>Submit Character Art</h1>
        <p style={{ fontSize: '16px', color: '#a1a1aa', lineHeight: 1.6, margin: '0 0 36px' }}>
          Got original art for a character from one of our titles? We'd love to see it.
          The best submissions become the definitive art for that character on the site.
        </p>

        {status === 'done' ? (
          <div style={{ background: '#0f2218', border: '1px solid #166534', borderRadius: '12px', padding: '28px 24px' }}>
            <div style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>Submitted. Thank you.</div>
            <p style={{ color: '#a1a1aa', margin: '0 0 20px', lineHeight: 1.6 }}>
              We review all submissions and will be in touch if we'd like to feature your work.
            </p>
            <Link href="/" style={{ fontSize: '14px', color: '#818cf8', textDecoration: 'none' }}>← Back to the library</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            <div>
              <label style={labelStyle}>Your name <span style={{ color: '#ef4444' }}>*</span></label>
              <input style={inputStyle} value={form.name} onChange={e => update('name', e.target.value)} placeholder="Artist name or handle" />
            </div>

            <div>
              <label style={labelStyle}>Your email <span style={{ color: '#ef4444' }}>*</span></label>
              <input style={inputStyle} type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="So we can credit you" />
            </div>

            <div>
              <label style={labelStyle}>Title (film, show, or book) <span style={{ color: '#ef4444' }}>*</span></label>
              <input style={inputStyle} value={form.title} onChange={e => update('title', e.target.value)} placeholder="e.g. Fourth Wing, The Sopranos" />
            </div>

            <div>
              <label style={labelStyle}>Character</label>
              <input style={inputStyle} value={form.character} onChange={e => update('character', e.target.value)} placeholder="e.g. Violet Sorrengail" />
            </div>

            <div>
              <label style={labelStyle}>Artwork <span style={{ color: '#ef4444' }}>*</span></label>
              <div style={{
                border: '2px dashed #3f3f46', borderRadius: '10px', padding: '24px',
                textAlign: 'center', background: '#111115', cursor: 'pointer',
                transition: 'border-color 0.15s',
              }}
                onDragOver={e => { e.preventDefault(); (e.currentTarget as HTMLDivElement).style.borderColor = '#818cf8' }}
                onDragLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#3f3f46' }}
                onDrop={e => {
                  e.preventDefault();
                  (e.currentTarget as HTMLDivElement).style.borderColor = '#3f3f46'
                  const dropped = e.dataTransfer.files[0]
                  if (dropped) setFile(dropped)
                }}
                onClick={() => document.getElementById('fileInput')?.click()}
              >
                <input id="fileInput" type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setFile(e.target.files?.[0] ?? null)} />
                {file ? (
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#f1f5f9' }}>{file.name}</div>
                    <div style={{ fontSize: '12px', color: '#71717a', marginTop: '4px' }}>{(file.size / 1024 / 1024).toFixed(1)} MB · Click to change</div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '14px', color: '#71717a' }}>Drop your image here, or click to browse</div>
                    <div style={{ fontSize: '12px', color: '#52525b', marginTop: '4px' }}>PNG, JPG, WEBP · Max 10MB</div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label style={labelStyle}>Anything else?</label>
              <textarea
                style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }}
                value={form.message}
                onChange={e => update('message', e.target.value)}
                placeholder="Context, inspiration, licensing notes — anything you'd like us to know"
              />
            </div>

            {errorMsg && (
              <div style={{ fontSize: '13px', color: '#f87171', background: '#2a0f0f', border: '1px solid #7f1d1d', borderRadius: '8px', padding: '10px 14px' }}>
                {errorMsg}
              </div>
            )}

            <label style={{
              display: 'flex', gap: '12px', alignItems: 'flex-start', cursor: 'pointer',
              background: agreed ? 'rgba(99,102,241,0.07)' : '#111115',
              border: `1px solid ${agreed ? 'rgba(99,102,241,0.4)' : '#3f3f46'}`,
              borderRadius: '10px', padding: '14px 16px', transition: 'all 0.15s',
            }}>
              <input
                type="checkbox"
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
                style={{ marginTop: '2px', width: '16px', height: '16px', accentColor: '#6366f1', flexShrink: 0, cursor: 'pointer' }}
              />
              <span style={{ fontSize: '13px', color: '#a1a1aa', lineHeight: 1.6 }}>
                <strong style={{ color: '#f1f5f9', display: 'block', marginBottom: '4px' }}>Licence declaration</strong>
                I confirm that this is my own original artwork and that I hold all rights to it. I grant Wilder League a non-exclusive, royalty-free licence to display, reproduce, and promote this work on the Wilder League platform, with credit to me as the artist. I understand that Wilder League will not sell or sublicence this work, and that I retain full ownership. I warrant that this submission does not infringe the intellectual property rights of any third party.
              </span>
            </label>

            <button
              type="submit"
              disabled={status === 'sending' || !agreed}
              style={{
                padding: '12px 24px', background: '#6366f1', color: '#fff', border: 'none',
                borderRadius: '10px', fontSize: '15px', fontWeight: 700,
                cursor: (status === 'sending' || !agreed) ? 'not-allowed' : 'pointer',
                opacity: (status === 'sending' || !agreed) ? 0.5 : 1,
                transition: 'opacity 0.15s',
              }}
            >
              {status === 'sending' ? 'Sending…' : 'Submit artwork'}
            </button>

          </form>
        )}
      </div>
    </main>
  )
}
