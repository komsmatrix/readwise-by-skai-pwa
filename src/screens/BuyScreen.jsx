import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const INTRO_PRICE   = 249
const REGULAR_PRICE = 399
const REFERRAL_DISC = 20

export default function BuyScreen() {
  const [name,         setName]         = useState('')
  const [email,        setEmail]        = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [codeStatus,   setCodeStatus]   = useState('idle')
  const [agentName,    setAgentName]    = useState('')
  const [discountAmt,  setDiscountAmt]  = useState(REFERRAL_DISC)
  const [status,       setStatus]       = useState('idle')
  const [errorMsg,     setErrorMsg]     = useState('')
  const [success,      setSuccess]      = useState(false)
  const [cancelled,    setCancelled]    = useState(false)
  const [studentCount, setStudentCount] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('success') === 'true')    setSuccess(true)
    if (params.get('cancelled') === 'true')  setCancelled(true)
    loadStudentCount()
  }, [])

  async function loadStudentCount() {
    try {
      const { count } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
      if (count !== null) setStudentCount(count)
    } catch(e) {}
  }

  const finalPrice = codeStatus === 'valid' ? INTRO_PRICE - discountAmt : INTRO_PRICE

  async function checkReferralCode(code) {
    if (!code.trim()) { setCodeStatus('idle'); setAgentName(''); setDiscountAmt(REFERRAL_DISC); return }
    setCodeStatus('checking')
    try {
      const res = await fetch('/api/validate-referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, email }),
      })
      const data = await res.json()
      if (data.valid) {
        setCodeStatus('valid')
        setAgentName(data.agentName || '')
        setDiscountAmt(data.discount || REFERRAL_DISC)
      } else {
        setCodeStatus('invalid')
      }
    } catch {
      setCodeStatus('invalid')
    }
  }

  async function handlePurchase() {
    if (!name.trim())  return setErrorMsg('Please enter your full name.')
    if (!email.trim() || !email.includes('@')) return setErrorMsg('Please enter a valid email address.')
    setStatus('loading'); setErrorMsg('')
    try {
      const res = await fetch('/api/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, referralCode, amount: finalPrice }),
      })
      const data = await res.json()
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      } else {
        setErrorMsg(data.error || 'Payment setup failed. Please try again.')
        setStatus('idle')
      }
    } catch {
      setErrorMsg('Something went wrong. Please try again.')
      setStatus('idle')
    }
  }

  if (success) {
    return (
      <div style={s.root}>
        <div style={s.card}>
          <div style={s.successIcon}>🎓</div>
          <h1 style={s.heading}>You're in.</h1>
          <p style={s.sub}>Check your email for your access key. You're one step closer to passing your board exam.</p>
          <a href="/" style={s.btn}>Open Readwise →</a>
        </div>
      </div>
    )
  }

  return (
    <div style={s.root}>
      <div style={s.bg} />
      <div style={s.card}>

        {/* Brand */}
        <div style={s.brand}>
          <div style={s.brandIcon}>R</div>
          <div>
            <div style={s.brandName}>Readwise</div>
            <div style={s.brandBy}>by Skai · Board Exam OS</div>
          </div>
        </div>

        {/* Hero */}
        <h1 style={s.heading}>Pass your board exam.</h1>
        <p style={s.sub}>
          Spaced repetition, readiness tracking, daily coaching — built specifically for Philippine licensure examinees.
        </p>

        {/* Exam badges */}
        <div style={s.examRow}>
          {['LET', 'NLE', 'CPA', 'Bar'].map(e => (
            <span key={e} style={s.examBadge}>{e}</span>
          ))}
        </div>

        {/* Features */}
        <div style={s.features}>
          {[
            { icon: '🧠', title: 'Spaced Repetition', desc: 'Platform remembers what you forget and brings it back at the right time' },
            { icon: '📊', title: 'Readiness Score', desc: 'Know exactly where you stand vs. the passing mark — every day' },
            { icon: '⚡', title: 'Daily Coaching', desc: 'Your Next Best Action — what to study, why, and how much it matters' },
            { icon: '📖', title: 'Structured Lessons', desc: 'Board-weighted lessons with memory hooks, glossary, and mnemonics' },
          ].map(f => (
            <div key={f.title} style={s.feature}>
              <span style={s.featureIcon}>{f.icon}</span>
              <div>
                <div style={s.featureTitle}>{f.title}</div>
                <div style={s.featureDesc}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={s.divider} />

        {/* Pricing */}
        <div style={s.priceRow}>
          <div>
            <div style={s.priceLabel}>Introductory Price</div>
            <div style={s.price}>
              ₱{finalPrice}
              <span style={s.priceOld}>₱{REGULAR_PRICE}</span>
            </div>
            <div style={s.priceNote}>One-time · Lifetime access · All exams included</div>
          </div>
          {studentCount > 0 && (
            <div style={s.socialProof}>{studentCount} students enrolled</div>
          )}
        </div>

        {cancelled && (
          <div style={s.cancelNote}>Payment was cancelled. No charge was made.</div>
        )}

        {/* Form */}
        <div style={s.form}>
          <div style={s.field}>
            <label style={s.label}>Full name</label>
            <input style={s.input} type="text" placeholder="e.g. Juan Dela Cruz"
              value={name} onChange={e => setName(e.target.value)}
              autoComplete="name" />
          </div>
          <div style={s.field}>
            <label style={s.label}>Email address</label>
            <input style={s.input} type="email" placeholder="your@email.com"
              value={email} onChange={e => setEmail(e.target.value)}
              autoComplete="email" />
          </div>
          <div style={s.field}>
            <label style={s.label}>Referral code <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
            <div style={{ position: 'relative' }}>
              <input style={s.input} type="text" placeholder="e.g. SKAI2025"
                value={referralCode}
                onChange={e => { setReferralCode(e.target.value.toUpperCase()); checkReferralCode(e.target.value) }} />
              {codeStatus === 'valid' && (
                <div style={s.codeValid}>✓ ₱{discountAmt} off {agentName ? `via ${agentName}` : ''}</div>
              )}
              {codeStatus === 'invalid' && (
                <div style={s.codeInvalid}>Invalid code</div>
              )}
            </div>
          </div>

          {errorMsg && <div style={s.error}>{errorMsg}</div>}

          <button style={{ ...s.btn, ...(status === 'loading' ? { opacity: 0.7, cursor: 'not-allowed' } : {}) }}
            onClick={handlePurchase}
            disabled={status === 'loading'}>
            {status === 'loading' ? 'Setting up payment…' : `Get Access · ₱${finalPrice}`}
          </button>

          <p style={s.payNote}>Secure payment via PayMongo · GCash · Card · Maya</p>
        </div>

        <p style={s.footer}>
          Already have an account? <a href="/" style={{ color: 'var(--accent)' }}>Sign in here →</a>
        </p>
      </div>
    </div>
  )
}

const s = {
  root        : { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)', padding: '20px 16px', position: 'relative', overflow: 'hidden' },
  bg          : { position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, var(--accent-dim) 0%, transparent 70%)', pointerEvents: 'none' },
  card        : { width: '100%', maxWidth: 440, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: '36px 28px', position: 'relative', zIndex: 1 },
  brand       : { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 },
  brandIcon   : { width: 36, height: 36, background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, color: 'var(--accent)' },
  brandName   : { fontFamily: 'var(--font-display)', fontSize: 17, color: 'var(--text-primary)', lineHeight: 1.1 },
  brandBy     : { fontSize: 10, color: 'var(--accent)', letterSpacing: '0.06em', textTransform: 'uppercase' },
  heading     : { fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, letterSpacing: '-0.02em', lineHeight: 1.2 },
  sub         : { fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 16 },
  examRow     : { display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' },
  examBadge   : { background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 20, padding: '3px 12px', fontSize: 11, fontWeight: 700, color: 'var(--accent)' },
  features    : { display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 },
  feature     : { display: 'flex', gap: 12, alignItems: 'flex-start' },
  featureIcon : { fontSize: 18, flexShrink: 0, marginTop: 1 },
  featureTitle: { fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 },
  featureDesc : { fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 },
  divider     : { height: 1, background: 'var(--border)', margin: '4px 0 16px' },
  priceRow    : { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 },
  priceLabel  : { fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 },
  price       : { fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, color: 'var(--accent)', lineHeight: 1 },
  priceOld    : { fontSize: 16, color: 'var(--text-muted)', textDecoration: 'line-through', marginLeft: 8, fontWeight: 400 },
  priceNote   : { fontSize: 11, color: 'var(--text-muted)', marginTop: 4 },
  socialProof : { fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 10px' },
  cancelNote  : { fontSize: 12, color: '#F59E0B', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, padding: '8px 12px', marginBottom: 12 },
  form        : { display: 'flex', flexDirection: 'column', gap: 14 },
  field       : { display: 'flex', flexDirection: 'column', gap: 6 },
  label       : { fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em' },
  input       : { padding: '11px 14px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: 14, outline: 'none', width: '100%' },
  codeValid   : { marginTop: 6, fontSize: 12, color: '#10B981', fontWeight: 600 },
  codeInvalid : { marginTop: 6, fontSize: 12, color: '#e05c5c' },
  error       : { fontSize: 13, color: '#e05c5c', background: 'rgba(224,92,92,0.08)', border: '1px solid rgba(224,92,92,0.2)', borderRadius: 8, padding: '10px 12px' },
  btn         : { display: 'block', width: '100%', padding: '14px', background: 'var(--accent)', color: '#0d0d0d', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 15, fontWeight: 700, cursor: 'pointer', textAlign: 'center', textDecoration: 'none', transition: 'opacity 0.15s' },
  payNote     : { fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: -4 },
  footer      : { marginTop: 20, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' },
  successIcon : { fontSize: 48, textAlign: 'center', marginBottom: 16 },
}
