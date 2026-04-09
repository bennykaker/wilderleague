export default function Loading() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: '#09090b',
      color: '#f8fafc',
      fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
      gap: '16px',
    }}>
      <div style={{ fontSize: '32px' }}>⚡</div>
      <div style={{ fontSize: '18px', fontWeight: 700, color: '#f1f5f9' }}>
        Loading challenge…
      </div>
      <div style={{ fontSize: '14px', color: '#52525b' }}>
        Building the actor pool.
      </div>
    </div>
  )
}
