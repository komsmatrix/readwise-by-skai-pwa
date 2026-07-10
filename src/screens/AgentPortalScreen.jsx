import { useState } from 'react'

export default function AgentPortalScreen() {
  const [code,     setCode]     = useState('')
  const [pin,      setPin]      = useState('')
  const [status,   setStatus]   = useState('idle') // idle | loading | error
  const [errorMsg, setErrorMsg] = useState('')
  const [agent,    setAgent]    = useState(null)
  const [payouts,  setPayouts]  = useState([])

  async function handleLogin(e) {
    e.preventDefault()
    if (!code.trim() || !pin.trim()) return
    setStatus('loading')
    setErrorMsg('')
    try {
      const res = await fetch('/api/agent-login', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ referral_code: code.trim(), pin: pin.trim() }),
      })
      const data = await res.json()
      if (!data.success) {
        setStatus('error')
        setErrorMsg(
          data.reason === 'inactive'
            ? 'This account is currently inactive. Contact Readwise by Skai for help.'
            : 'Referral code or PIN is incorrect.'
        )
        return
      }
      setAgent(data.agent)
      setPayouts(data.payouts || [])
      setStatus('idle')
    } catch {
      setStatus('error')
      setErrorMsg('Something went wrong. Please try again.')
    }
  }

  function logout() {
    setAgent(null)
    setPayouts([])
    setCode('')
    setPin('')
  }

  if (agent) {
    const isAgency = agent.code_type === 'agency'
    return (
      <div style={s.root}>
        <div style={s.bg} />
        <div style={{ ...s.card, maxWidth: 480 }}>
          <div style={s.brand}>
            <div style={s.brandIcon}>R</div>
            <div>
              <div style={s.brandName}>Readwise by Skai</div>
              <div style={s.brandBy}>Agent Portal</div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <div style={s.heading}>{agent.name}</div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
                <span style={{
                  fontSize: 11, padding: '2px 8px', borderRadius: 6, fontWeight: 600,
                  background: isAgency ? 'rgba(139,92,246,0.15)' : 'rgba(16,185,129,0.15)',
                  color: isAgency ? '#8B5CF6' : '#10B981',
                }}>
                  {isAgency ? 'AGENCY' : 'AGENT'}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{agent.referral_code}</span>
              </div>
            </div>
            <button onClick={logout} style={s.logoutBtn}>Log out</button>
          </div>

          <div style={s.statGrid}>
            <div style={s.statBox}>
              <div style={s.statValue}>{agent.total_referrals}</div>
              <div style={s.statLabel}>Total Referrals</div>
            </div>
            <div style={s.statBox}>
              <div style={{ ...s.statValue, color: '#10B981' }}>₱{agent.owed_now}</div>
              <div style={s.statLabel}>Owed Now</div>
            </div>
            <div style={s.statBox}>
              <div style={s.statValue}>₱{agent.total_paid}</div>
              <div style={s.statLabel}>Total Paid</div>
            </div>
          </div>

          <div style={s.shareBox}>
            <div style={s.label}>Your Link</div>
            <div style={s.shareLink}>readwisebyskai.com/buy?ref={agent.referral_code}</div>
            {!isAgency && <div style={s.shareNote}>Students who use your code save ₱10. You earn ₱20 per referral.</div>}
            {isAgency && <div style={s.shareNote}>Students pay full price. You earn ₱20 per referral via your QR code.</div>}
          </div>

          <div style={s.sectionLabel}>Payout History</div>
          {payouts.length === 0 ? (
            <div style={s.emptyState}>No payouts yet. Once you're paid, it'll show up here.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {payouts.map((p, i) => (
                <div key={i} style={s.payoutRow}>
                  <div>
                    <div style={s.payoutAmount}>₱{p.amount}</div>
                    <div style={s.payoutSub}>{p.referral_count} referrals · {p.period_start} to {p.period_end}</div>
                  </div>
                  <div style={s.payoutDate}>{p.paid_at ? new Date(p.paid_at).toLocaleDateString() : ''}</div>
                </div>
              ))}
            </div>
          )}

          <div style={s.footer}>Questions about your earnings? Message Readwise by Skai directly.</div>
        </div>
      </div>
    )
  }

  return (
    <div style={s.root}>
      <div style={s.bg} />
      <div style={s.card}>
        <div style={s.brand}>
          <div style={s.brandIcon}>R</div>
          <div>
            <div style={s.brandName}>Readwise by Skai</div>
            <div style={s.brandBy}>Agent Portal</div>
          </div>
        </div>
        <div style={s.heading}>Check Your Earnings</div>
        <div style={s.sub}>Log in with your referral code and PIN to see your referrals and commission.</div>

        <form onSubmit={handleLogin} style={s.form}>
          <div style={s.field}>
            <label style={s.label}>Referral Code</label>
            <input style={s.input} type="text" placeholder="e.g. MARIA1234"
              value={code} onChange={e => setCode(e.target.value.toUpperCase())} autoCapitalize="characters" />
          </div>
          <div style={s.field}>
            <label style={s.label}>4-Digit PIN</label>
            <input style={s.input} type="password" inputMode="numeric" maxLength={4} placeholder="••••"
              value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} />
          </div>

          {status === 'error' && <div style={s.error}>{errorMsg}</div>}

          <button type="submit" style={s.btn} disabled={status === 'loading'}>
            {status === 'loading' ? 'Checking…' : 'View My Earnings'}
          </button>
        </form>

        <div style={s.footer}>Don't have a code yet? Message Readwise by Skai to become an agent.</div>
      </div>
    </div>
  )
}

const s = {
  root       : { minHeight: '100vh', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', background: 'var(--bg-base)', padding: '24px 16px 48px', position: 'relative', overflowY: 'auto' },
  bg         : { position: 'fixed', top: '-20%', left: '50%', transform: 'translateX(-50%)', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, var(--accent-dim) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 },
  card       : { width: '100%', maxWidth: 420, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: '28px 24px', position: 'relative', zIndex: 1 },
  brand      : { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 },
  brandIcon  : { width: 34, height: 34, background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, color: 'var(--accent)' },
  brandName  : { fontFamily: 'var(--font-display)', fontSize: 15, color: 'var(--text-primary)', lineHeight: 1.1 },
  brandBy    : { fontSize: 10, color: 'var(--accent)', letterSpacing: '0.06em', textTransform: 'uppercase' },
  heading    : { fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6, letterSpacing: '-0.02em', lineHeight: 1.2 },
  sub        : { fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 },
  form       : { display: 'flex', flexDirection: 'column', gap: 12 },
  field      : { display: 'flex', flexDirection: 'column', gap: 5 },
  label      : { fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em' },
  input      : { padding: '10px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' },
  error      : { fontSize: 13, color: '#e05c5c', background: 'rgba(224,92,92,0.08)', border: '1px solid rgba(224,92,92,0.2)', borderRadius: 8, padding: '10px 12px' },
  btn        : { display: 'block', width: '100%', padding: '13px', background: 'var(--accent)', color: '#0d0d0d', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 15, fontWeight: 700, cursor: 'pointer', textAlign: 'center', textDecoration: 'none', transition: 'opacity 0.15s', fontFamily: 'inherit' },
  logoutBtn  : { fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', flexShrink: 0 },
  statGrid   : { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 },
  statBox    : { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 8px', textAlign: 'center' },
  statValue  : { fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' },
  statLabel  : { fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 },
  shareBox   : { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', marginBottom: 20 },
  shareLink  : { fontSize: 13, fontFamily: 'monospace', color: 'var(--accent)', marginTop: 4, wordBreak: 'break-all' },
  shareNote  : { fontSize: 11, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.5 },
  sectionLabel: { fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 },
  emptyState : { fontSize: 13, color: 'var(--text-muted)', padding: '16px 0', textAlign: 'center' },
  payoutRow  : { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px' },
  payoutAmount: { fontSize: 15, fontWeight: 700, color: '#10B981' },
  payoutSub  : { fontSize: 11, color: 'var(--text-muted)', marginTop: 2 },
  payoutDate : { fontSize: 11, color: 'var(--text-muted)' },
  footer     : { marginTop: 20, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' },
}
