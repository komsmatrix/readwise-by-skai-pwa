import { useState } from 'react'
import { activateKey, getCustomer } from '../lib/supabase.js'

export default function ActivationScreen({ onActivated, onBack }) {
  const [tab,      setTab]      = useState('returning') // 'returning' | 'new'
  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [key,      setKey]      = useState('')
  const [status,   setStatus]   = useState('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [agreedTC, setAgreedTC] = useState(false)
  const wasKicked = new URLSearchParams(window.location.search).get('kicked') === '1'

  function formatKey(val) {
    const clean = val.toUpperCase().replace(/[^A-Z0-9]/g, '')
    const parts = [clean.slice(0, 4), clean.slice(4, 8), clean.slice(8, 12)]
    return parts.filter(Boolean).join('-')
  }

  function reset() {
    setStatus('idle'); setErrorMsg('')
    setName(''); setEmail(''); setKey('')
  }

  // ── Returning customer — email only ──────────────────────────────────────
  async function handleReturningLogin() {
    if (!email.trim())          return showError('Please enter your email address.')
    if (!email.includes('@'))   return showError('Please enter a valid email address.')
    setStatus('loading'); setErrorMsg('')
    try {
      const { customer } = await getCustomer(email.trim().toLowerCase())
      if (customer && customer.is_active) {
        setStatus('success')
        setTimeout(() => onActivated({
          success    : true,
          customerId : customer.id,
          name       : customer.name,
          email      : customer.email,
          referral_code: customer.referral_code,
        }), 600)
      } else if (customer && !customer.is_active) {
        showError('This account is inactive. Please contact support.')
      } else {
        showError('No account found with this email. If you\'re new, use the "New Customer" tab to activate your key.')
      }
    } catch {
      showError('Something went wrong. Please try again.')
    }
  }

  // ── New customer — name + email + key ────────────────────────────────────
  async function handleActivate() {
    if (!name.trim())  return showError('Please enter your full name.')
    if (!email.trim()) return showError('Please enter your email address.')
    if (!email.includes('@')) return showError('Please enter a valid email address.')
    if (key.replace(/-/g, '').length < 12) return showError('Access key must be 12 characters (e.g. ABCD-1234-WXYZ).')
    if (!agreedTC) return showError('Please agree to the Terms & Conditions and Privacy Policy to continue.')
    setStatus('loading'); setErrorMsg('')
    const result = await activateKey(key, name.trim(), email.trim())
    if (result.success) {
      setStatus('success')
      setTimeout(() => onActivated(result), 800)
    } else {
      const msgs = {
        invalid_format    : 'Invalid key format. Please check your key.',
        invalid_key       : 'This access key was not found. Please check your key or contact support.',
        already_activated : 'This key has already been used. If this is your account, use the "Returning Customer" tab and enter just your email.',
        key_expired       : 'This key has expired. Please contact support.',
        error             : 'Something went wrong. Please try again.',
      }
      showError(msgs[result.reason] || 'Activation failed. Please contact support.')
    }
  }

  function showError(msg) { setErrorMsg(msg); setStatus('error') }

  return (
    <div style={s.root}>
      <div style={s.bg}/>
      <div style={s.card} className="animate-up">

        {/* Brand */}
        <div style={s.brand}>
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <rect width="36" height="36" rx="10" fill="var(--accent)" fillOpacity="0.15"/>
            <path d="M10 27V10h10a7 7 0 0 1 0 14H10" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M10 24h14" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          <div>
            <div style={s.brandName}>Readwise</div>
            <div style={s.brandBy}>by Skai</div>
          </div>
        </div>

        {onBack && (
          <button style={s.backBtn} onClick={onBack}>← Back</button>
        )}
        <h1 style={s.heading}>Welcome.</h1>
        <p style={s.sub}>Your board exam operating system.</p>

        {wasKicked && (
          <div style={s.kickedBanner}>
            ⚠️ You were signed out because your account was opened on another device. Sign in again to continue.
          </div>
        )}

        {/* Tabs */}
        <div style={s.tabs}>
          <button style={{ ...s.tabBtn, ...(tab === 'returning' ? s.tabActive : {}) }}
            onClick={() => { setTab('returning'); reset() }}>
            Returning Customer
          </button>
          <button style={{ ...s.tabBtn, ...(tab === 'new' ? s.tabActive : {}) }}
            onClick={() => { setTab('new'); reset() }}>
            New Customer
          </button>
        </div>

        {/* Returning — email only */}
        {tab === 'returning' && (
          <div style={s.form} className="animate-in">
            <p style={s.tabHint}>Already have an account? Enter your email to continue studying.</p>
            <div style={s.field}>
              <label style={s.label}>Email address</label>
              <input style={s.input} type="email" placeholder="your@email.com"
                value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleReturningLogin()}
                autoFocus autoComplete="email"/>
            </div>
            {errorMsg && <p style={s.error} className="animate-in">{errorMsg}</p>}
            <button
              style={{ ...s.btn, ...(status === 'loading' ? s.btnLoading : {}), ...(status === 'success' ? s.btnSuccess : {}) }}
              onClick={handleReturningLogin}
              disabled={status === 'loading' || status === 'success'}>
              {status === 'loading' ? <><span style={s.spinner}/> Looking up account…</>
               : status === 'success' ? 'Welcome back ✓'
               : 'Open my study space'}
            </button>
          </div>
        )}

        {/* New — name + email + key */}
        {tab === 'new' && (
          <div style={s.form} className="animate-in">
            <p style={s.tabHint}>For offline or agent purchases only. If you paid online at readwisebyskai.com, use the <strong style={{ color:'var(--accent)' }}>Returning Customer</strong> tab and just enter your email — no key needed.</p>
            <div style={s.field}>
              <label style={s.label}>Full name</label>
              <input style={s.input} type="text" placeholder="e.g. Juan Dela Cruz"
                value={name} onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleActivate()}
                autoFocus autoComplete="name"/>
            </div>
            <div style={s.field}>
              <label style={s.label}>Email address</label>
              <input style={s.input} type="email" placeholder="your@email.com"
                value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleActivate()}
                autoComplete="email"/>
            </div>
            <div style={s.field}>
              <label style={s.label}>Access key</label>
              <input style={{ ...s.input, fontFamily:'monospace', letterSpacing:'0.1em', fontSize:18 }}
                type="text" placeholder="XXXX-XXXX-XXXX"
                value={key} onChange={e => setKey(formatKey(e.target.value))}
                onKeyDown={e => e.key === 'Enter' && handleActivate()}
                maxLength={14} spellCheck={false} autoComplete="off"/>
            </div>
            {/* T&C Checkbox */}
            <div style={s.tcRow}>
              <input type="checkbox" id="tc" checked={agreedTC}
                onChange={e => setAgreedTC(e.target.checked)}
                style={{ width:16, height:16, accentColor:'var(--accent)', cursor:'pointer', flexShrink:0 }} />
              <label htmlFor="tc" style={s.tcLabel}>
                I agree to the{' '}
                <a href="/terms" target="_blank" rel="noopener noreferrer" style={s.tcLink}>Terms & Conditions</a>
                {' '}and{' '}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" style={s.tcLink}>Privacy Policy</a>
              </label>
            </div>
            {errorMsg && <p style={s.error} className="animate-in">{errorMsg}</p>}
            <button
              style={{ ...s.btn, ...(status === 'loading' ? s.btnLoading : {}), ...(status === 'success' ? s.btnSuccess : {}), ...(!agreedTC ? { opacity:0.5, cursor:'not-allowed' } : {}) }}
              onClick={handleActivate}
              disabled={status === 'loading' || status === 'success' || !agreedTC}>
              {status === 'loading' ? <><span style={s.spinner}/> Activating…</>
               : status === 'success' ? 'Welcome ✓'
               : 'Activate my access key'}
            </button>
          </div>
        )}

        <p style={s.footer}>
          {tab === 'returning'
            ? 'Paid online? Your account is ready — just enter your email above.'
            : 'Use this tab only if you received a key from an agent or offline purchase.'}
        </p>
      </div>
    </div>
  )
}

const s = {
  root     : { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg-base)', padding:20, position:'relative', overflow:'hidden' },
  bg       : { position:'absolute', top:'-20%', left:'50%', transform:'translateX(-50%)', width:600, height:600, borderRadius:'50%', background:'radial-gradient(circle, var(--accent-dim) 0%, transparent 70%)', pointerEvents:'none' },
  card     : { width:'100%', maxWidth:420, background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-xl)', padding:'40px 36px', position:'relative', zIndex:1 },
  brand    : { display:'flex', alignItems:'center', gap:10, marginBottom:28 },
  brandName: { fontFamily:'var(--font-display)', fontSize:18, color:'var(--text-primary)', letterSpacing:'-0.02em', lineHeight:1.1 },
  brandBy  : { fontSize:10, color:'var(--accent)', letterSpacing:'0.06em', textTransform:'uppercase', lineHeight:1 },
  heading  : { fontFamily:'var(--font-display)', fontSize:36, fontWeight:400, color:'var(--text-primary)', marginBottom:6, letterSpacing:'-0.02em' },
  sub      : { fontSize:14, color:'var(--text-secondary)', marginBottom:24 },
  tabs     : { display:'flex', gap:4, background:'var(--bg-elevated)', borderRadius:'var(--radius-md)', padding:4, marginBottom:24 },
  tabBtn   : { flex:1, padding:'9px 8px', border:'none', borderRadius:8, fontSize:13, fontWeight:500, cursor:'pointer', background:'transparent', color:'var(--text-muted)', transition:'all var(--transition)', fontFamily:'inherit' },
  tabActive: { background:'var(--bg-surface)', color:'var(--text-primary)', boxShadow:'0 1px 4px rgba(0,0,0,0.15)' },
  tabHint  : { fontSize:13, color:'var(--text-muted)', lineHeight:1.6, marginBottom:4 },
  form     : { display:'flex', flexDirection:'column', gap:16 },
  field    : { display:'flex', flexDirection:'column', gap:7 },
  label    : { fontSize:11, fontWeight:500, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'0.07em' },
  input    : { padding:'11px 14px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', color:'var(--text-primary)', fontSize:14, outline:'none', width:'100%', transition:'border-color var(--transition)' },
  error    : { fontSize:13, color:'#e05c5c', lineHeight:1.6, padding:'10px 14px', background:'rgba(224,92,92,0.08)', borderRadius:'var(--radius-sm)' },
  btn      : { display:'flex', alignItems:'center', justifyContent:'center', gap:8, width:'100%', padding:14, background:'var(--accent)', color:'#0d0d0d', border:'none', borderRadius:'var(--radius-md)', fontSize:15, fontWeight:500, cursor:'pointer', transition:'all var(--transition)', marginTop:4 },
  btnLoading: { opacity:0.7, cursor:'not-allowed' },
  btnSuccess: { background:'#3a9a6a', color:'#fff' },
  spinner  : { width:14, height:14, border:'2px solid rgba(0,0,0,0.2)', borderTop:'2px solid #0d0d0d', borderRadius:'50%', animation:'spin 0.7s linear infinite' },
  backBtn  : { display:'inline-flex', alignItems:'center', gap:6, background:'none', border:'none', color:'var(--text-muted)', fontSize:13, cursor:'pointer', padding:'0 0 16px', fontFamily:'inherit', transition:'color var(--transition)' },
  footer   : { marginTop:20, fontSize:12, color:'var(--text-muted)', textAlign:'center', lineHeight:1.7 },
  tcRow       : { display:'flex', alignItems:'flex-start', gap:10, padding:'4px 0' },
  tcLabel     : { fontSize:12, color:'var(--text-muted)', lineHeight:1.6, cursor:'pointer' },
  tcLink      : { color:'var(--accent)', textDecoration:'underline' },
  kickedBanner: { fontSize:13, color:'#e05c5c', background:'rgba(224,92,92,0.08)', border:'1px solid rgba(224,92,92,0.2)', borderRadius:8, padding:'10px 14px', marginBottom:16, lineHeight:1.6 },
}

