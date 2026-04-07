export default function TermsPage() {
  return (
    <main style={{ minHeight: '100vh', background: '#09090b', color: '#f8fafc', padding: '60px 28px', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        <div style={{ fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#3b82f6', marginBottom: '10px', fontWeight: 700 }}>
          Legal
        </div>
        <h1 style={{ fontSize: '36px', fontWeight: 900, margin: '0 0 8px', lineHeight: 1.1 }}>
          Terms of Service
        </h1>
        <p style={{ fontSize: '13px', color: '#52525b', marginBottom: '48px' }}>
          Last updated: April 2026
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '36px', fontSize: '15px', lineHeight: 1.8, color: '#a1a1aa' }}>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc', marginBottom: '10px' }}>Who can use Wilder League</h2>
            <p>You must be at least 13 years old to create an account. If you are under 18, you should have a parent or guardian&apos;s permission. By signing up, you confirm you meet this requirement.</p>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc', marginBottom: '10px' }}>What Wilder League is</h2>
            <p>Wilder League is a fan entertainment platform for casting movies and TV shows with real actors. It is not affiliated with any studio, network, or talent agency. Cast submissions are for fun — they have no commercial value and confer no rights.</p>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc', marginBottom: '10px' }}>Your account</h2>
            <p>You sign in with Google. You are responsible for activity under your account. We reserve the right to suspend accounts that abuse the platform, harass other users, or violate these terms.</p>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc', marginBottom: '10px' }}>Content you submit</h2>
            <p>Cast submissions, usernames, and any text you enter on Wilder League are visible to other users. Don&apos;t post anything defamatory, hateful, or that you don&apos;t have the right to share. We may remove content that violates these terms.</p>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc', marginBottom: '10px' }}>Data and privacy</h2>
            <p>We collect your Google account email and profile information when you sign in, and we store your cast submissions and activity on the platform. We do not sell your data. We use it only to run Wilder League.</p>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc', marginBottom: '10px' }}>Changes</h2>
            <p>We may update these terms from time to time. Continued use of the platform after changes means you accept the updated terms.</p>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc', marginBottom: '10px' }}>Contact</h2>
            <p>Questions? Reach us through the platform.</p>
          </section>

        </div>
      </div>
    </main>
  )
}
