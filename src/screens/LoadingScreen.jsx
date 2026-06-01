export default function LoadingScreen() {
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)', gap: 16 }}>
      <svg width="40" height="40" viewBox="0 0 36 36" fill="none">
        <rect width="36" height="36" rx="10" fill="var(--accent)" fillOpacity="0.15"/>
        <path d="M10 27V10h10a7 7 0 0 1 0 14H10" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M10 24h14" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
      <div style={{ width: 28, height: 28, border: '2.5px solid var(--bg-elevated)', borderTop: '2.5px solid var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}/>
    </div>
  )
}
