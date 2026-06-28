import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const INTRO_PRICE   = 249
const REGULAR_PRICE = 399
const REFERRAL_DISC = 20

const ALL_COURSES = [
  { id:'LET',          name:'LET',          full:'Licensure Exam for Teachers',    price:249, regular:399, available:true,  topics:14, questions:'1,554+', type:'board' },
  { id:'NLE',          name:'NLE',           full:'Nursing Licensure Exam',         price:249, regular:399, available:false, type:'board' },
  { id:'NAPOLCOM',     name:'NAPOLCOM',      full:'NAPOLCOM Examination',           price:249, regular:399, available:false, type:'board' },
  { id:'Civil Service',name:'Civil Service', full:'Civil Service Examination',      price:249, regular:399, available:false, type:'board' },
  { id:'TESDA',        name:'TESDA',         full:'NC Qualifications Bundle',       price:99,  regular:199, available:true,  qualifications:'10+', type:'tesda' },
]

export default function BuyScreen() {
  const urlParams  = new URLSearchParams(window.location.search)
  const initCourse = urlParams.get('course') || 'LET'
  const initRef    = urlParams.get('ref') || ''

  const COURSES = ALL_COURSES

  const [selectedCourse, setSelectedCourse] = useState(initCourse)
  const [name,         setName]         = useState('')
  const [email,        setEmail]        = useState('')
  const [referralCode, setReferralCode] = useState(initRef)
  const [codeStatus,   setCodeStatus]   = useState(initRef ? 'checking' : 'idle')
  const [agentName,    setAgentName]    = useState('')
  const [discountAmt,  setDiscountAmt]  = useState(REFERRAL_DISC)
  const [status,       setStatus]       = useState('idle')
  const [errorMsg,     setErrorMsg]     = useState('')
  const [success,      setSuccess]      = useState(false)
  const [cancelled,    setCancelled]    = useState(false)
  const [studentCount, setStudentCount] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('success') === 'true')   setSuccess(true)
    if (params.get('cancelled') === 'true') setCancelled(true)
    loadStudentCount()
    if (initRef) checkReferralCode(initRef)
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

  const activeCourse = COURSES.find(c => c.id === selectedCourse) || COURSES[0]
  const basePrice    = activeCourse.price
  const regularPrice = activeCourse.regular
  const finalPrice   = codeStatus === 'valid' ? basePrice - discountAmt : basePrice

  async function checkReferralCode(code) {
    if (!code.trim()) { setCodeStatus('idle'); setAgentName(''); setDiscountAmt(REFERRAL_DISC); return }
    setCodeStatus('checking')
    try {
      const res = await fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'referral', code, email, course: selectedCourse }),
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
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, referralCode, amount: finalPrice, course: selectedCourse }),
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
          <div style={{ fontSize: 48, textAlign: 'center', marginBottom: 16 }}>🎓</div>
          <h1 style={s.heading}>You're in.</h1>
          <p style={s.sub}>Check your email for your access key. You're one step closer to passing your national exam.</p>
          <a href="/" style={s.btn}>Open Readwise →</a>
        </div>
      </div>
    )
  }

  return (
    <div style={s.root}>
      <div style={s.bg} />
      <div style={s.card}>

        {/* Back button */}
        <button onClick={() => window.history.back()} style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', color:'var(--accent)', fontSize:13, fontWeight:600, cursor:'pointer', padding:'0 0 16px', fontFamily:'inherit' }}>
          ← Back
        </button>

        {/* Brand */}
        <div style={s.brand}>
          <div style={s.brandIcon}>R</div>
          <div>
            <div style={s.brandName}>Readwise by Skai</div>
            <div style={s.brandBy}>National Exam Operating System</div>
          </div>
        </div>

        {/* Headline */}
        <h1 style={s.heading}>Pass your national exam.</h1>
        <p style={s.sub}>
          Spaced repetition · Readiness Score · Daily Coaching — built for Filipino board exam and TESDA examinees.
        </p>

        {/* Course selector */}
        <div style={s.courseGrid}>
          {COURSES.map(c => (
            <button key={c.id}
              onClick={() => c.available && setSelectedCourse(c.id)}
              disabled={!c.available}
              style={{
                background: selectedCourse === c.id ? 'var(--accent-dim)' : 'var(--bg-elevated)',
                border: selectedCourse === c.id ? '1.5px solid var(--accent)' : '1.5px solid var(--border)',
                borderRadius: 10, padding: '10px 12px', cursor: c.available ? 'pointer' : 'not-allowed',
                textAlign: 'left', opacity: c.available ? 1 : 0.4, fontFamily: 'inherit', transition: 'all .15s'
              }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: selectedCourse === c.id ? 'var(--accent)' : 'var(--text-primary)', marginBottom: 2 }}>{c.name}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{c.available ? c.full : 'Coming Soon'}</div>
            </button>
          ))}
        </div>

        {activeCourse.available && (
          <div style={s.courseNote}>
            {activeCourse.type === 'tesda'
              ? `${activeCourse.qualifications} qualifications · HTML reviewers · Lifetime access`
              : `${activeCourse.topics} topics · ${activeCourse.questions} questions · Lifetime access`}
          </div>
        )}

        {/* TESDA description */}
        {selectedCourse === 'TESDA' && (
          <div style={{ background:'rgba(59,130,246,0.06)', border:'1px solid rgba(59,130,246,0.2)', borderRadius:10, padding:'12px 14px', marginBottom:4, display:'flex', flexDirection:'column', gap:10 }}>
            <div style={{ fontSize:12, color:'var(--text-secondary)', lineHeight:1.7 }}>
              📋 Includes full HTML reviewers for <strong style={{ color:'var(--text-primary)' }}>30 NC II qualifications</strong> — Cookery, Caregiving, Housekeeping, Food & Beverage, Masonry, Electrical Installation, and more. Each reviewer includes video lessons and infographics.
            </div>
            <div style={{ fontSize:12, color:'var(--text-muted)', lineHeight:1.6 }}>
              ℹ️ Free trial is not yet available for TESDA. Want to preview the reviewer before buying?
            </div>
            <a href="https://www.youtube.com/@readwisebyskai" target="_blank" rel="noopener noreferrer"
              style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, background:'#FF0000', color:'white', borderRadius:8, padding:'9px 14px', fontWeight:700, fontSize:12, textDecoration:'none' }}>
              ▶ Watch Sneak Peek on YouTube
            </a>
          </div>
        )}

        <div style={s.divider} />

        {/* Price */}
        <div style={s.priceRow}>
          <div>
            <div style={s.priceLabel}>Introductory Price</div>
            <div style={s.price}>
              ₱{finalPrice}
              <span style={s.priceOld}>₱{regularPrice}</span>
            </div>
            <div style={s.priceNote}>One-time · Lifetime access</div>
          </div>
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
              autoComplete="name" autoFocus />
          </div>
          <div style={s.field}>
            <label style={s.label}>Email address</label>
            <input style={s.input} type="email" placeholder="your@email.com"
              value={email} onChange={e => setEmail(e.target.value)}
              autoComplete="email" />
          </div>
          <div style={s.field}>
            <label style={s.label}>
              Referral code <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional · saves ₱{selectedCourse === 'TESDA' ? 10 : REFERRAL_DISC})</span>
            </label>
            <input style={s.input} type="text" placeholder="e.g. SKAI2025"
              value={referralCode}
              onChange={e => { setReferralCode(e.target.value.toUpperCase()); checkReferralCode(e.target.value) }} />
            {codeStatus === 'valid' && (
              <div style={s.codeValid}>✓ ₱{discountAmt} off{agentName ? ` via ${agentName}` : ''}</div>
            )}
            {codeStatus === 'invalid' && (
              <div style={s.codeInvalid}>Invalid code</div>
            )}
          </div>

          {errorMsg && <div style={s.error}>{errorMsg}</div>}

          <button
            style={{ ...s.btn, ...(status === 'loading' ? { opacity: 0.7, cursor: 'not-allowed' } : {}) }}
            onClick={handlePurchase}
            disabled={status === 'loading'}>
            {status === 'loading' ? 'Setting up payment…' : `Get ${selectedCourse} Access · ₱${finalPrice}`}
          </button>

          <p style={s.payNote}>Secure payment via PayMongo · QRPh · GrabPay · BPI · UBP</p>
        </div>

        <p style={s.footer}>
          Already have an account? <a href="/" style={{ color: 'var(--accent)' }}>Sign in here →</a>
        </p>
      </div>
    </div>
  )
}

const s = {
  // KEY FIX: use overflowY auto + alignItems flex-start so page scrolls properly on mobile
  root       : { minHeight: '100vh', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', background: 'var(--bg-base)', padding: '24px 16px 48px', position: 'relative', overflowY: 'auto' },
  bg         : { position: 'fixed', top: '-20%', left: '50%', transform: 'translateX(-50%)', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, var(--accent-dim) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 },
  card       : { width: '100%', maxWidth: 420, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: '28px 24px', position: 'relative', zIndex: 1 },
  brand      : { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 },
  brandIcon  : { width: 34, height: 34, background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, color: 'var(--accent)' },
  brandName  : { fontFamily: 'var(--font-display)', fontSize: 15, color: 'var(--text-primary)', lineHeight: 1.1 },
  brandBy    : { fontSize: 10, color: 'var(--accent)', letterSpacing: '0.06em', textTransform: 'uppercase' },
  heading    : { fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6, letterSpacing: '-0.02em', lineHeight: 1.2 },
  sub        : { fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 },
  courseGrid : { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 },
  courseNote : { fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-elevated)', borderRadius: 6, padding: '6px 10px', marginBottom: 4 },
  divider    : { height: 1, background: 'var(--border)', margin: '14px 0' },
  priceRow   : { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 },
  priceLabel : { fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 },
  price      : { fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, color: 'var(--accent)', lineHeight: 1 },
  priceOld   : { fontSize: 15, color: 'var(--text-muted)', textDecoration: 'line-through', marginLeft: 8, fontWeight: 400 },
  priceNote  : { fontSize: 10, color: 'var(--text-muted)', marginTop: 3 },
  socialProof: { fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 8px' },
  cancelNote : { fontSize: 12, color: '#F59E0B', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, padding: '8px 12px', marginBottom: 12 },
  form       : { display: 'flex', flexDirection: 'column', gap: 12 },
  field      : { display: 'flex', flexDirection: 'column', gap: 5 },
  label      : { fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em' },
  input      : { padding: '10px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' },
  codeValid  : { marginTop: 4, fontSize: 12, color: '#10B981', fontWeight: 600 },
  codeInvalid: { marginTop: 4, fontSize: 12, color: '#e05c5c' },
  error      : { fontSize: 13, color: '#e05c5c', background: 'rgba(224,92,92,0.08)', border: '1px solid rgba(224,92,92,0.2)', borderRadius: 8, padding: '10px 12px' },
  btn        : { display: 'block', width: '100%', padding: '13px', background: 'var(--accent)', color: '#0d0d0d', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 15, fontWeight: 700, cursor: 'pointer', textAlign: 'center', textDecoration: 'none', transition: 'opacity 0.15s', fontFamily: 'inherit' },
  payNote    : { fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: -4 },
  footer     : { marginTop: 16, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' },
}
