import Link from 'next/link'
import { createClient } from '../../lib/supabase/server'

export default async function MarlowePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let isMember = false
  if (user) {
    const { data } = await supabase.from('profiles').select('is_member').eq('id', user.id).single()
    isMember = data?.is_member ?? false
  }

  return (
    <main style={{ minHeight: '100vh', background: '#09090b', color: '#f8fafc', padding: '64px 28px', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>

        <Link href="/" style={{ fontSize: '14px', color: '#a1a1aa', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '52px' }}>
          ← Back
        </Link>

        {/* Marlowe */}
        <div style={{ marginBottom: '64px' }}>
          <div style={{ fontSize: '13px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#3b82f6', marginBottom: '12px', fontWeight: 700 }}>
            Your casting director
          </div>
          <h1 style={{ fontSize: '42px', fontWeight: 900, lineHeight: 1.1, margin: '0 0 24px' }}>
            Meet Marlowe.
          </h1>
          <p style={{ fontSize: '18px', color: '#a1a1aa', lineHeight: 1.7, margin: '0 0 20px' }}>
            Marlowe is technically an AI but we like to think of him as a veteran Hollywood casting director with 30 years of strong opinions and zero patience for safe choices. He knows every actor in the pool — their range, their box office history, their reputation on set, and what they bring to a room.
          </p>
          <p style={{ fontSize: '18px', color: '#a1a1aa', lineHeight: 1.7, margin: '0 0 20px' }}>
            When you open a role, Marlowe's already done his homework. He pre-selects the actors he thinks can carry it — based on physicality, age, screen persona, and genre credibility. Not who's popular. Who fits.
          </p>
          <p style={{ fontSize: '18px', color: '#a1a1aa', lineHeight: 1.7, margin: 0 }}>
            You can push back. Ask for someone younger, cheaper, a wild card, or a specific type. Marlowe will argue with you if he thinks you're wrong. He'll tell you when you've made a great call too.
          </p>
        </div>

        {/* Production room */}
        <div style={{ marginBottom: '64px' }}>
          <div style={{ fontSize: '13px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#a1a1aa', marginBottom: '24px', fontWeight: 700 }}>
            The production room
          </div>
          <p style={{ fontSize: '16px', color: '#71717a', lineHeight: 1.7, margin: '0 0 32px' }}>
            Once you've filled every role and hit Submit, your cast goes to the production room. Three more voices weigh in — each with their own agenda.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            <div style={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '24px', background: '#111115' }}>
              <div style={{ fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#a1a1aa', fontWeight: 700, marginBottom: '8px' }}>The Director</div>
              <div style={{ fontSize: '17px', fontWeight: 700, color: '#f1f5f9', marginBottom: '10px' }}>Creative chemistry. Emotional weight. Vision.</div>
              <p style={{ fontSize: '15px', color: '#a1a1aa', lineHeight: 1.65, margin: 0 }}>
                She doesn't care about box office. She cares whether your cast can carry the emotional weight of the material — whether the chemistry makes sense, whether the surprising choices are inspired or reckless. She'll flag the actors she's worked with before and the ones she's been avoiding for good reason.
              </p>
            </div>

            <div style={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '24px', background: '#111115' }}>
              <div style={{ fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#a1a1aa', fontWeight: 700, marginBottom: '8px' }}>The Executive Producer</div>
              <div style={{ fontSize: '17px', fontWeight: 700, color: '#f1f5f9', marginBottom: '10px' }}>Budget. Track record. Completion risk.</div>
              <p style={{ fontSize: '15px', color: '#a1a1aa', lineHeight: 1.65, margin: 0 }}>
                She's looking at one thing: return on investment. Did you spend the money in the right places? Are the leads proven? Is there a risk someone on your list will blow up the production? She'll tell you if your budget allocation is smart or if you burned half of it on a marquee name who won't move the needle internationally.
              </p>
            </div>

            <div style={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '24px', background: '#111115' }}>
              <div style={{ fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#a1a1aa', fontWeight: 700, marginBottom: '8px' }}>The Marketing VP</div>
              <div style={{ fontSize: '17px', fontWeight: 700, color: '#f1f5f9', marginBottom: '10px' }}>Poster potential. Four-quadrant appeal. Buzz.</div>
              <p style={{ fontSize: '15px', color: '#a1a1aa', lineHeight: 1.65, margin: 0 }}>
                He's already thinking about the trailer, the press junket, and which cast members will actually show up on social media. He knows which actors have international pull and which ones are beloved domestically but dead on arrival in Asia. If your cast is unmarketable, he will not soften the blow.
              </p>
            </div>

          </div>
        </div>

        {/* Upgrade CTA */}
        <div style={{ border: '1px solid rgba(59,130,246,0.25)', borderRadius: '16px', padding: '32px', background: 'rgba(59,130,246,0.04)' }}>
          <div style={{ fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#3b82f6', fontWeight: 700, marginBottom: '12px' }}>
            Make Marlowe sharper
          </div>
          <h2 style={{ fontSize: '26px', fontWeight: 900, margin: '0 0 14px', lineHeight: 1.2 }}>
            {isMember ? 'You have the full Marlowe.' : 'Free gets you Marlowe. A membership gets you a better one.'}
          </h2>
          <p style={{ fontSize: '16px', color: '#a1a1aa', lineHeight: 1.65, margin: '0 0 24px' }}>
            {isMember
              ? 'You\'re running the upgraded AI model — sharper picks, better reasoning, more specific reactions. Thanks for the support.'
              : 'Free members get Marlowe powered by a fast, capable AI. Members get the upgraded model — sharper picks, more specific reactions, better pushback. The difference is most noticeable when you ask Marlowe to reason about tricky requests: age ranges, tone, chemistry between roles.'}
          </p>
          {!isMember && (
            <Link href="/pricing" style={{ display: 'inline-block', background: '#3b82f6', color: '#fff', textDecoration: 'none', borderRadius: '10px', padding: '13px 24px', fontSize: '15px', fontWeight: 700 }}>
              Upgrade — from $3/month →
            </Link>
          )}
          {isMember && (
            <Link href="/" style={{ display: 'inline-block', background: '#3b82f6', color: '#fff', textDecoration: 'none', borderRadius: '10px', padding: '13px 24px', fontSize: '15px', fontWeight: 700 }}>
              Start casting →
            </Link>
          )}
        </div>

      </div>
    </main>
  )
}
