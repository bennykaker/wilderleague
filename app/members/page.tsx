import { createClient } from '../../lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ManageBilling from './ManageBilling'

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/members')

  const { data: profile } = await supabase.from('profiles').select('is_member').eq('id', user.id).single()
  const isMember = profile?.is_member ?? false
  const { success } = await searchParams

  return (
    <main style={{ minHeight: '100vh', background: '#09090b', color: '#f8fafc', padding: '64px 28px', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>

        <Link href="/" style={{ fontSize: '14px', color: '#a1a1aa', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '48px' }}>
          ← Back to Wilderleague
        </Link>

        {success && (
          <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '12px', padding: '16px 20px', marginBottom: '32px', fontSize: '15px', color: '#86efac' }}>
            You're in. Welcome to the club.
          </div>
        )}

        <div style={{ marginBottom: '40px' }}>
          <div style={{ fontSize: '13px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#3b82f6', marginBottom: '12px', fontWeight: 700 }}>
            {isMember ? 'Member' : 'Account'}
          </div>
          <h1 style={{ fontSize: '36px', fontWeight: 900, margin: '0 0 12px' }}>
            {isMember ? "You're a member." : "You're on the free plan."}
          </h1>
          <p style={{ fontSize: '16px', color: '#a1a1aa', margin: 0, lineHeight: 1.6 }}>
            {isMember
              ? 'Sharper Marlowe is active. Unlimited submissions. Thanks for keeping this thing alive.'
              : 'Upgrade to get the sharper Marlowe, unlimited submissions, and early access to new features.'}
          </p>
        </div>

        {isMember ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'flex-start' }}>
            <Link href="/" style={{ display: 'inline-block', background: '#3b82f6', color: '#fff', textDecoration: 'none', borderRadius: '10px', padding: '13px 24px', fontSize: '15px', fontWeight: 700 }}>
              Start casting →
            </Link>
            <ManageBilling />
          </div>
        ) : (
          <Link href="/pricing" style={{ display: 'inline-block', background: '#3b82f6', color: '#fff', textDecoration: 'none', borderRadius: '10px', padding: '13px 24px', fontSize: '15px', fontWeight: 700 }}>
            Upgrade for $7/month →
          </Link>
        )}

      </div>
    </main>
  )
}
