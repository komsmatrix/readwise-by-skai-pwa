import { useState } from 'react'
import { activateKey } from '../lib/supabase.js'

export default function ActivationScreen({ onActivated }) {
  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [key,      setKey]      = useState('')
  const [status,   setStatus]   = useState('idle')
  const [errorMsg, setErrorMsg] = useState('')

  function formatKey(val) {
    const clean = val.toUpperCase().replace(/[^A-Z0-9]/g, '')
    const parts = [clean.slice(0, 4), clean.slice(4, 8), clean.slice(8, 12)]
    return parts.filter(Boolean).join('-')
  }

  async function handleActivate() {
    if (!name.trim())  return showError('Please enter your full name.')
    if (!email.trim()) return showError('Please enter your email address.')
    if (!email.includes('@')) return showError('Please enter a valid email address.')
    if (key.replace(/-/g, '').length < 12) return showError('Access key must be 12 characters (e.g. ABCD-1234-WXYZ).')

    setStatus('loading'); setErrorMsg('')

    const result = await activateKey(key, name.trim(), email.trim())

    if (result.success) {
      setStatus('success')
      setTimeout(() => onActivated(result), 800)
    } else {
      const msgs = {
        invalid_format    : 'Invalid key format. Please check your key.',
        invalid_key       : 'This access key was not found. Please check your key or contact support.',
        already_activated : 'This key has already been activated. Each key is for one account only.',
        key_expired       : 'This key has expired. Keys must be activated within 7 days. Please contact support.',
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

        <h1 style={s.heading}>Welcome.</h1>
        <p style={s.sub}>Enter your details to unlock your personal reading space.</p>

        <div style={s.form}>
          <div style={s.field}>
            <label style={s.label}>Full name</label>
            <input style={s.input} type="text" placeholder="e.g. Juan Dela Cruz" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleActivate()} autoFocus autoComplete="name"/>
          </div>
          <div style={s.field}>
            <label style={s.label}>Email address</label>
            <input style={s.input} type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleActivate()} autoComplete="email"/>
          </div>
          <div style={s.field}>
            <label style={s.label}>Access key</label>
            <input style={{ ...s.input, fontFamily: 'monospace', letterSpacing: '0.1em', fontSize: 18 }} type="text" placeholder="XXXX-XXXX-XXXX" value={key} onChange={e => setKey(formatKey(e.target.value))} onKeyDown={e => e.key === 'Enter' && handleActivate()} maxLength={14} spellCheck={false} autoComplete="off"/>
          </div>

          {errorMsg && <p style={s.error} className="animate-in">{errorMsg}</p>}

          <button
            style={{ ...s.btn, ...(status === 'loading' ? s.btnLoading : {}), ...(status === 'success' ? s.btnSuccess : {}) }}
            onClick={handleActivate}
            disabled={status === 'loading' || status === 'success'}
          >
            {status === 'loading' ? (
              <><span style={s.spinner}/> Activating…</>
            ) : status === 'success' ? 'Welcome ✓' : 'Open my reading space'}
          </button>
        </div>

        <p style={s.footer}>
          Your key is personal and tied to your account.<br/>
          Keys must be activated within 7 days of purchase.
        </p>
      </div>
    </div>
  )
}

const s = {
  root    : { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)', padding: 20, position: 'relative', overflow: 'hidden' },
  bg      : { position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, var(--accent-dim) 0%, transparent 70%)', pointerEvents: 'none' },
  card    : { width: '100%', maxWidth: 420, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: '40px 36px', position: 'relative', zIndex: 1 },
  brand   : { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 },
  brandName: { fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.1 },
  brandBy : { fontSize: 10, color: 'var(--accent)', letterSpacing: '0.06em', textTransform: 'uppercase', lineHeight: 1 },
  heading : { fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 400, color: 'var(--text-primary)', marginBottom: 8, letterSpacing: '-0.02em' },
  sub     : { fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 32 },
  form    : { display: 'flex', flexDirection: 'column', gap: 18 },
  field   : { display: 'flex', flexDirection: 'column', gap: 7 },
  label   : { fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em' },
  input   : { padding: '11px 14px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: 14, outline: 'none', width: '100%', transition: 'border-color var(--transition)' },
  error   : { fontSize: 13, color: '#e05c5c', lineHeight: 1.6, padding: '10px 14px', background: 'rgba(224,92,92,0.08)', borderRadius: 'var(--radius-sm)' },
  btn     : { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: 14, background: 'var(--accent)', color: '#0d0d0d', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 15, fontWeight: 500, cursor: 'pointer', transition: 'all var(--transition)', marginTop: 4 },
  btnLoading: { opacity: 0.7, cursor: 'not-allowed' },
  btnSuccess: { background: '#3a9a6a', color: '#fff' },
  spinner : { width: 14, height: 14, border: '2px solid rgba(0,0,0,0.2)', borderTop: '2px solid #0d0d0d', borderRadius: '50%', animation: 'spin 0.7s linear infinite' },
  footer  : { marginTop: 24, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.7 },
}
