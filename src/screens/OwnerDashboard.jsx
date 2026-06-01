import { useState, useEffect } from 'react'

const OWNER_PASSWORD = '' // Set via prompt on first use

export default function OwnerDashboard({ isLoggedIn, onLogin }) {
  const [password,    setPassword]    = useState('')
  const [authError,   setAuthError]   = useState('')
  const [tab,         setTab]         = useState('generate')
  const [customers,   setCustomers]   = useState([])
  const [loading,     setLoading]     = useState(false)

  // Generate key state
  const [genName,     setGenName]     = useState('')
  const [genEmail,    setGenEmail]    = useState('')
  const [genResult,   setGenResult]   = useState(null)
  const [genStatus,   setGenStatus]   = useState('idle')

  // Send update state
  const [updSubject,  setUpdSubject]  = useState('')
  const [updBooks,    setUpdBooks]    = useState('')
  const [updMessage,  setUpdMessage]  = useState('')
  const [updStatus,   setUpdStatus]   = useState('idle')
  const [updResult,   setUpdResult]   = useState(null)

  const savedPass = () => sessionStorage.getItem('owner_auth')

  useEffect(() => {
    if (isLoggedIn) loadCustomers()
  }, [isLoggedIn])

  async function handleLogin() {
    if (!password) return setAuthError('Enter password')
    // Verify against API
    const res  = await fetch('/api/generate-key', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({ name: 'test', email: 'test@test.com', password, isOwnerKey: false }),
    })
    const data = await res.json()
    if (data.error === 'Unauthorized') { setAuthError('Wrong password'); return }
    sessionStorage.setItem('owner_auth', password)
    onLogin()
  }

  async function loadCustomers() {
    setLoading(true)
    const res  = await fetch('/api/get-customers', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({ password: savedPass() }),
    })
    const data = await res.json()
    if (data.customers) setCustomers(data.customers)
    setLoading(false)
  }

  async function handleGenerate() {
    if (!genName.trim() || !genEmail.trim()) return
    setGenStatus('loading'); setGenResult(null)
    const res  = await fetch('/api/generate-key', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({ name: genName.trim(), email: genEmail.trim(), password: savedPass() }),
    })
    const data = await res.json()
    if (data.success) {
      setGenResult(data); setGenStatus('success')
      setGenName(''); setGenEmail('')
      loadCustomers()
    } else {
      setGenStatus('error'); setGenResult({ error: data.error || 'Failed' })
    }
  }

  async function handleSendUpdate() {
    const bookList = updBooks.split('\n').map(b => b.trim()).filter(Boolean)
    if (!updSubject.trim()) return
    setUpdStatus('loading'); setUpdResult(null)
    const res  = await fetch('/api/send-update', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({ password: savedPass(), subject: updSubject, newBooks: bookList, message: updMessage }),
    })
    const data = await res.json()
    setUpdResult(data)
    setUpdStatus(data.success ? 'success' : 'error')
  }

  function copyEmails() {
    const emails = customers.map(c => c.email).filter(Boolean).join(', ')
    navigator.clipboard.writeText(emails)
  }

  // ── Login screen ──────────────────────────────────────────────────────────
  if (!isLoggedIn) {
    return (
      <div style={s.root}>
        <div style={s.loginCard} className="animate-up">
          <div style={s.brand}>
            <svg width="32" height="32" viewBox="0 0 36 36" fill="none"><rect width="36" height="36" rx="10" fill="var(--accent)" fillOpacity="0.15"/><path d="M10 27V10h10a7 7 0 0 1 0 14H10" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M10 24h14" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round"/></svg>
            <div>
              <div style={s.brandName}>Readwise by Skai</div>
              <div style={s.brandBy}>Owner Dashboard</div>
            </div>
          </div>
          <div style={s.field}>
            <label style={s.label}>Owner password</label>
            <input style={s.input} type="password" placeholder="Enter password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} autoFocus/>
          </div>
          {authError && <p style={s.error}>{authError}</p>}
          <button style={s.btn} onClick={handleLogin}>Enter Dashboard</button>
        </div>
      </div>
    )
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────
  return (
    <div style={s.dashboard}>
      {/* Header */}
      <div style={s.dashHeader}>
        <div>
          <div style={s.brandName}>Readwise by Skai</div>
          <div style={s.brandBy}>Owner Dashboard</div>
        </div>
        <div style={s.statPill}>{customers.length} customers</div>
      </div>

      {/* Tabs */}
      <div style={s.tabs}>
        {[['generate','Generate Key'],['customers','Customers'],['update','Send Update']].map(([id, label]) => (
          <button key={id} style={{ ...s.tab, ...(tab === id ? s.tabActive : {}) }} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      <div style={s.tabContent}>

        {/* ── Generate Key ── */}
        {tab === 'generate' && (
          <div style={s.section}>
            <p style={s.sectionDesc}>Generate a new access key and send it to the customer automatically.</p>
            <div style={s.field}><label style={s.label}>Customer full name</label><input style={s.input} placeholder="Juan Dela Cruz" value={genName} onChange={e => setGenName(e.target.value)}/></div>
            <div style={s.field}><label style={s.label}>Customer email</label><input style={s.input} type="email" placeholder="juan@gmail.com" value={genEmail} onChange={e => setGenEmail(e.target.value)}/></div>
            <button style={{ ...s.btn, ...(!genName.trim() || !genEmail.trim() || genStatus === 'loading' ? s.btnDisabled : {}) }} onClick={handleGenerate} disabled={!genName.trim() || !genEmail.trim() || genStatus === 'loading'}>
              {genStatus === 'loading' ? <><span style={s.spinner}/> Generating…</> : genStatus === 'success' ? '✓ Key Generated & Sent!' : 'Generate Key & Send Email'}
            </button>

            {genResult?.success && (
              <div style={s.resultBox} className="animate-in">
                <p style={s.resultLabel}>Key generated</p>
                <p style={s.keyDisplay}>{genResult.key}</p>
                <p style={s.resultNote}>Email sent to {genEmail} ✓</p>
                <p style={s.resultNote}>Expires: {genResult.expiresAt ? new Date(genResult.expiresAt).toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' }) : 'Never'}</p>
              </div>
            )}

            {genResult?.error && <p style={s.error}>{genResult.error}</p>}
          </div>
        )}

        {/* ── Customers ── */}
        {tab === 'customers' && (
          <div style={s.section}>
            <div style={s.sectionRow}>
              <p style={s.sectionDesc}>{customers.length} total customers</p>
              <button style={s.smallBtn} onClick={copyEmails}>Copy all emails</button>
            </div>

            {loading ? (
              <div style={s.loading}><div style={s.spinner}/></div>
            ) : customers.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '32px 0' }}>No customers yet.</p>
            ) : (
              <div style={s.customerList}>
                {customers.map((c, i) => (
                  <div key={i} style={s.customerRow}>
                    <div style={s.customerAvatar}>{c.name?.[0]?.toUpperCase() || '?'}</div>
                    <div style={s.customerInfo}>
                      <p style={s.customerName}>{c.name}</p>
                      <p style={s.customerEmail}>{c.email}</p>
                    </div>
                    <div style={s.customerDate}>{new Date(c.activated_at).toLocaleDateString('en-US', { month:'short', day:'numeric' })}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Send Update ── */}
        {tab === 'update' && (
          <div style={s.section}>
            <p style={s.sectionDesc}>Send a library update email to all {customers.length} customers.</p>
            <div style={s.field}><label style={s.label}>Email subject</label><input style={s.input} placeholder="New Books Added to Your Library 📚" value={updSubject} onChange={e => setUpdSubject(e.target.value)}/></div>
            <div style={s.field}>
              <label style={s.label}>New book titles (one per line)</label>
              <textarea style={{ ...s.input, resize:'vertical', minHeight:100, lineHeight:1.6 }} placeholder={"Atomic Habits\nDeep Work\nThe 48 Laws of Power"} value={updBooks} onChange={e => setUpdBooks(e.target.value)}/>
            </div>
            <div style={s.field}><label style={s.label}>Extra message (optional)</label><input style={s.input} placeholder="Hope you enjoy the new additions!" value={updMessage} onChange={e => setUpdMessage(e.target.value)}/></div>
            <button style={{ ...s.btn, ...(!updSubject.trim() || updStatus === 'loading' ? s.btnDisabled : {}) }} onClick={handleSendUpdate} disabled={!updSubject.trim() || updStatus === 'loading'}>
              {updStatus === 'loading' ? <><span style={s.spinner}/> Sending…</> : updStatus === 'success' ? `✓ Sent to ${updResult?.sent} customers!` : `Send to ${customers.length} customers`}
            </button>
            {updResult?.error && <p style={s.error}>{updResult.error}</p>}
          </div>
        )}
      </div>
    </div>
  )
}

const s = {
  root        : { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg-base)', padding:20 },
  loginCard   : { width:'100%', maxWidth:380, background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-xl)', padding:'36px 28px', display:'flex', flexDirection:'column', gap:20 },
  dashboard   : { minHeight:'100vh', background:'var(--bg-base)', display:'flex', flexDirection:'column' },
  dashHeader  : { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'20px 20px 0', flexShrink:0 },
  brand       : { display:'flex', alignItems:'center', gap:10 },
  brandName   : { fontFamily:'var(--font-display)', fontSize:17, color:'var(--text-primary)', letterSpacing:'-0.02em' },
  brandBy     : { fontSize:10, color:'var(--accent)', letterSpacing:'0.06em', textTransform:'uppercase' },
  statPill    : { fontSize:12, color:'var(--accent)', background:'var(--accent-dim)', padding:'4px 12px', borderRadius:99, border:'1px solid rgba(201,169,110,0.2)' },
  tabs        : { display:'flex', gap:4, padding:'16px 20px 0', borderBottom:'1px solid var(--border)', flexShrink:0 },
  tab         : { padding:'8px 16px', background:'transparent', border:'none', borderBottom:'2px solid transparent', color:'var(--text-muted)', fontSize:13, fontWeight:500, cursor:'pointer', transition:'all var(--transition)', marginBottom:-1 },
  tabActive   : { color:'var(--accent)', borderBottomColor:'var(--accent)' },
  tabContent  : { flex:1, overflowY:'auto' },
  section     : { padding:'20px', display:'flex', flexDirection:'column', gap:16, maxWidth:500 },
  sectionDesc : { fontSize:13, color:'var(--text-muted)', lineHeight:1.6 },
  sectionRow  : { display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 },
  field       : { display:'flex', flexDirection:'column', gap:7 },
  label       : { fontSize:11, fontWeight:500, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'0.07em' },
  input       : { padding:'10px 12px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', color:'var(--text-primary)', fontSize:14, outline:'none', width:'100%' },
  btn         : { display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'12px', background:'var(--accent)', color:'#0d0d0d', border:'none', borderRadius:'var(--radius-md)', fontSize:14, fontWeight:500, cursor:'pointer', transition:'all var(--transition)' },
  btnDisabled : { opacity:0.45, cursor:'not-allowed' },
  smallBtn    : { padding:'6px 12px', background:'transparent', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', color:'var(--text-secondary)', fontSize:12, cursor:'pointer', flexShrink:0 },
  error       : { fontSize:13, color:'#e05c5c', padding:'10px 12px', background:'rgba(224,92,92,0.08)', borderRadius:'var(--radius-sm)' },
  spinner     : { width:14, height:14, border:'2px solid rgba(0,0,0,0.2)', borderTop:'2px solid #0d0d0d', borderRadius:'50%', animation:'spin 0.7s linear infinite', display:'inline-block' },
  resultBox   : { padding:'16px', background:'rgba(58,154,106,0.08)', border:'1px solid rgba(58,154,106,0.25)', borderRadius:'var(--radius-md)', display:'flex', flexDirection:'column', gap:8 },
  resultLabel : { fontSize:11, color:'#3a9a6a', textTransform:'uppercase', letterSpacing:'0.07em', fontWeight:500 },
  keyDisplay  : { fontFamily:'monospace', fontSize:22, color:'var(--accent)', fontWeight:700, letterSpacing:'0.1em' },
  resultNote  : { fontSize:12, color:'var(--text-muted)' },
  loading     : { display:'flex', justifyContent:'center', padding:40 },
  customerList: { display:'flex', flexDirection:'column', gap:2 },
  customerRow : { display:'flex', alignItems:'center', gap:12, padding:'10px 12px', background:'var(--bg-elevated)', borderRadius:'var(--radius-md)', border:'1px solid var(--border)' },
  customerAvatar: { width:36, height:36, borderRadius:'50%', background:'var(--accent-dim)', color:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:600, flexShrink:0 },
  customerInfo: { flex:1, minWidth:0 },
  customerName: { fontSize:13, color:'var(--text-primary)', fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  customerEmail: { fontSize:12, color:'var(--text-muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  customerDate: { fontSize:11, color:'var(--text-muted)', flexShrink:0 },
}
