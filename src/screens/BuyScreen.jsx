import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const INTRO_PRICE    = 249
const REGULAR_PRICE  = 399
const REFERRAL_DISC  = 20

export default function BuyScreen() {
  const [name,         setName]         = useState('')
  const [email,        setEmail]        = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [codeStatus,   setCodeStatus]   = useState('idle')
  const [agentName,    setAgentName]    = useState('')
  const [status,       setStatus]       = useState('idle')
  const [errorMsg,     setErrorMsg]     = useState('')
  const [cancelled,    setCancelled]    = useState(false)
  const [success,      setSuccess]      = useState(false)
  const [bookCount,    setBookCount]    = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('success') === 'true') setSuccess(true)
    if (params.get('cancelled') === 'true') setCancelled(true)
    loadBookCount()
  }, [])

  async function loadBookCount() {
    try {
      const { count } = await supabase
        .from('books')
        .select('*', { count: 'exact', head: true })
      if (count !== null) setBookCount(count)
    } catch(e) {}
  }

  const bookLabel = bookCount !== null ? `${bookCount}+ curated books` : '18+ curated books'
  const headlineBooks = bookCount !== null ? `${bookCount}+ Premium Books.` : '18+ Premium Books.'
  const finalPrice = codeStatus === 'valid' ? INTRO_PRICE - REFERRAL_DISC : INTRO_PRICE

  async function checkReferralCode(code) {
    if (!code.trim()) { setCodeStatus('idle'); setAgentName(''); return }
    setCodeStatus('checking')
    const res  = await fetch('/api/validate-referral', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({ code }),
    })
    const data = await res.json()
    if (data.valid) { setCodeStatus('valid'); setAgentName(data.agentName) }
    else            { setCodeStatus('invalid'); setAgentName('') }
  }

  async function handleBuy() {
    if (!name.trim() || !email.trim()) return
    setStatus('loading'); setErrorMsg('')
    const res  = await fetch('/api/create-checkout', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({ name: name.trim(), email: email.trim(), referralCode: codeStatus === 'valid' ? referralCode : '' }),
    })
    const data = await res.json()
    if (data.checkoutUrl) {
      window.location.href = data.checkoutUrl
    } else {
      setStatus('error')
      setErrorMsg(data.error || 'Something went wrong. Please try again.')
    }
  }

  if (success) {
    return (
      <div style={s.root}>
        <div style={s.card} className="animate-up">
          <div style={s.successIcon}>✅</div>
          <h2 style={s.successTitle}>Payment Successful!</h2>
          <p style={s.successDesc}>Check your email — your access key and setup guide have been sent. Check your spam folder if you don't see it within 2 minutes.</p>
          <a href="/" style={s.btn}>Open Readwise by Skai →</a>
        </div>
      </div>
    )
  }

  return (
    <div style={s.root}>
      <div style={s.urgencyBanner}>
        <span style={s.urgencyDot}/>
        <span style={s.urgencyText}>🔥 Introductory price of <strong>₱{INTRO_PRICE}</strong> — limited time only. Regular price will be ₱{REGULAR_PRICE}.</span>
      </div>

      <div style={s.wrap}>
        <div style={s.left}>
          <div style={s.logo}>
            <div style={s.logoIcon}>📖</div>
            <div>
              <div style={s.logoName}>Readwise by Skai</div>
              <div style={s.logoTagline}>Your Personal Library</div>
            </div>
          </div>

          <h1 style={s.headline}>{headlineBooks}<br/>One Lifetime Payment.</h1>
          <p style={s.subhead}>Self-help, finance, classics, and more — curated books for readers who want to grow. Works on any device, no installation needed.</p>

          <div style={s.featureList}>
            {[
              ['📚', bookLabel, 'Self-help, finance, wellness'],
              ['🔊', 'Text to Speech', 'Listen while commuting'],
              ['🔖', 'Bookmarks & Progress', 'Resume where you left off'],
              ['📱', 'Works on any device', 'Phone, tablet, laptop'],
              ['✨', 'New books added regularly', 'Library keeps growing'],
            ].map(([icon, title, desc]) => (
              <div key={title} style={s.feature}>
                <span style={s.featureIcon}>{icon}</span>
                <div>
                  <p style={s.featureTitle}>{title}</p>
                  <p style={s.featureDesc}>{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div style={s.priceBlock}>
            <span style={s.priceRegular}>₱{REGULAR_PRICE}</span>
            <span style={s.priceIntro}>₱{finalPrice}</span>
            <span style={s.priceBadge}>INTRODUCTORY</span>
          </div>
          <p style={s.priceNote}>One-time payment. Lifetime access. No subscription.</p>
        </div>

        <div style={s.right}>
          <div style={s.formCard} className="animate-up">
            {cancelled && (
              <div style={s.cancelledBox}>
                <p style={{ margin:0, fontSize:13, color:'#e0a050' }}>⚠ Payment was cancelled. You can try again below.</p>
              </div>
            )}

            <p style={s.formTitle}>Get Lifetime Access</p>
            <p style={s.formDesc}>Pay once, read forever. Key sent to your email instantly.</p>

            <div style={s.field}>
              <label style={s.label}>Full Name</label>
              <input style={s.input} placeholder="Juan Dela Cruz" value={name} onChange={e => setName(e.target.value)}/>
            </div>

            <div style={s.field}>
              <label style={s.label}>Email Address</label>
              <input style={s.input} type="email" placeholder="juan@gmail.com" value={email} onChange={e => setEmail(e.target.value)}/>
              <p style={s.inputNote}>Your access key will be sent here</p>
            </div>

            <div style={s.field}>
              <label style={s.label}>Referral Code <span style={{ color:'var(--text-muted)', fontSize:11 }}>(optional)</span></label>
              <div style={s.codeRow}>
                <input
                  style={{ ...s.input, flex:1 }}
                  placeholder="e.g. JUAN50"
                  value={referralCode}
                  onChange={e => { setReferralCode(e.target.value.toUpperCase()); setCodeStatus('idle') }}
                  onBlur={() => checkReferralCode(referralCode)}
                />
                {codeStatus === 'checking' && <span style={s.codeChecking}>checking…</span>}
                {codeStatus === 'valid'    && <span style={s.codeValid}>✓ -₱{REFERRAL_DISC}</span>}
                {codeStatus === 'invalid'  && <span style={s.codeInvalid}>✗ Invalid</span>}
              </div>
              {codeStatus === 'valid' && (
                <p style={{ margin:'4px 0 0', fontSize:12, color:'#3a9a6a' }}>Referred by {agentName} — ₱{REFERRAL_DISC} discount applied!</p>
              )}
            </div>

            <div style={s.priceSummary}>
              <div style={s.summaryRow}>
                <span style={s.summaryLabel}>Readwise by Skai — Lifetime</span>
                <span style={s.summaryValue}>₱{INTRO_PRICE}</span>
              </div>
              {codeStatus === 'valid' && (
                <div style={s.summaryRow}>
                  <span style={{ ...s.summaryLabel, color:'#3a9a6a' }}>Referral discount</span>
                  <span style={{ ...s.summaryValue, color:'#3a9a6a' }}>-₱{REFERRAL_DISC}</span>
                </div>
              )}
              <div style={s.summaryDivider}/>
              <div style={s.summaryRow}>
                <span style={{ ...s.summaryLabel, color:'var(--text-primary)', fontWeight:600 }}>Total</span>
                <span style={{ ...s.summaryValue, color:'#c9a96e', fontWeight:700, fontSize:18 }}>₱{finalPrice}</span>
              </div>
            </div>

            {errorMsg && <p style={s.error}>{errorMsg}</p>}

            <button
              style={{ ...s.buyBtn, ...(!name.trim() || !email.trim() || status === 'loading' ? s.buyBtnDisabled : {}) }}
              onClick={handleBuy}
              disabled={!name.trim() || !email.trim() || status === 'loading'}
            >
              {status === 'loading'
                ? <><span style={s.spinner}/> Setting up payment…</>
                : <>Pay ₱{finalPrice} — QR Ph / GCash / Maya / Card</>
              }
            </button>

            <div style={s.paymentLogos}>
              {['GCash', 'Maya', 'QR Ph', 'Visa', 'Mastercard'].map(p => (
                <span key={p} style={s.paymentBadge}>{p}</span>
              ))}
            </div>

            <p style={s.secureNote}>🔒 Secure payment via PayMongo · Key sent instantly after payment</p>

            <div style={s.refundNote}>
              <p style={{ margin:0, fontSize:11, color:'var(--text-muted)', lineHeight:1.6, textAlign:'center' }}>
                🛡 <strong style={{ color:'var(--text-secondary)' }}>No refunds after key activation.</strong> Please make sure you want the product before purchasing. Questions? Email us at readwisebyskai@gmail.com
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const s = {
  root         : { minHeight:'100vh', background:'var(--bg-base)', display:'flex', flexDirection:'column' },
  urgencyBanner: { background:'rgba(201,169,110,0.1)', borderBottom:'1px solid rgba(201,169,110,0.2)', padding:'10px 20px', display:'flex', alignItems:'center', justifyContent:'center', gap:8 },
  urgencyDot   : { width:8, height:8, borderRadius:'50%', background:'#c9a96e', animation:'pulse 1.5s ease infinite', flexShrink:0 },
  urgencyText  : { fontSize:13, color:'#c9a96e', textAlign:'center' },
  wrap         : { flex:1, display:'flex', flexWrap:'wrap', gap:0, maxWidth:1100, margin:'0 auto', padding:'40px 20px', width:'100%' },
  left         : { flex:'1 1 420px', padding:'0 40px 40px 0' },
  right        : { flex:'1 1 340px', minWidth:300 },
  logo         : { display:'flex', alignItems:'center', gap:10, marginBottom:32 },
  logoIcon     : { width:44, height:44, background:'rgba(201,169,110,0.15)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 },
  logoName     : { fontFamily:'var(--font-display)', fontSize:18, color:'var(--text-primary)' },
  logoTagline  : { fontSize:11, color:'var(--accent)', textTransform:'uppercase', letterSpacing:'0.08em' },
  headline     : { fontSize:32, fontWeight:700, color:'var(--text-primary)', lineHeight:1.25, letterSpacing:'-0.02em', margin:'0 0 16px' },
  subhead      : { fontSize:15, color:'var(--text-secondary)', lineHeight:1.7, margin:'0 0 32px' },
  featureList  : { display:'flex', flexDirection:'column', gap:14, marginBottom:32 },
  feature      : { display:'flex', alignItems:'flex-start', gap:12 },
  featureIcon  : { fontSize:18, flexShrink:0, marginTop:1 },
  featureTitle : { margin:'0 0 2px', fontSize:14, color:'var(--text-primary)', fontWeight:500 },
  featureDesc  : { margin:0, fontSize:12, color:'var(--text-muted)' },
  priceBlock   : { display:'flex', alignItems:'center', gap:12, marginBottom:8 },
  priceRegular : { fontSize:18, color:'var(--text-muted)', textDecoration:'line-through' },
  priceIntro   : { fontSize:36, fontWeight:700, color:'#c9a96e', letterSpacing:'-0.02em' },
  priceBadge   : { fontSize:10, fontWeight:700, color:'#c9a96e', background:'rgba(201,169,110,0.12)', border:'1px solid rgba(201,169,110,0.25)', padding:'3px 8px', borderRadius:99 },
  priceNote    : { margin:0, fontSize:13, color:'var(--text-muted)' },
  formCard     : { background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-xl)', padding:28, display:'flex', flexDirection:'column', gap:16 },
  formTitle    : { margin:0, fontSize:18, fontWeight:600, color:'var(--text-primary)' },
  formDesc     : { margin:0, fontSize:13, color:'var(--text-muted)', lineHeight:1.6 },
  field        : { display:'flex', flexDirection:'column', gap:6 },
  label        : { fontSize:11, fontWeight:500, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'0.07em' },
  input        : { padding:'10px 12px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', color:'var(--text-primary)', fontSize:14, outline:'none', width:'100%' },
  inputNote    : { margin:'4px 0 0', fontSize:11, color:'var(--text-muted)' },
  codeRow      : { display:'flex', alignItems:'center', gap:8 },
  codeChecking : { fontSize:12, color:'var(--text-muted)', flexShrink:0 },
  codeValid    : { fontSize:13, color:'#3a9a6a', fontWeight:600, flexShrink:0 },
  codeInvalid  : { fontSize:13, color:'#e05c5c', fontWeight:600, flexShrink:0 },
  priceSummary : { background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', padding:14, display:'flex', flexDirection:'column', gap:8 },
  summaryRow   : { display:'flex', justifyContent:'space-between', alignItems:'center' },
  summaryLabel : { fontSize:13, color:'var(--text-muted)' },
  summaryValue : { fontSize:14, color:'var(--text-primary)', fontWeight:500 },
  summaryDivider: { height:1, background:'var(--border)' },
  cancelledBox : { background:'rgba(224,160,80,0.08)', border:'1px solid rgba(224,160,80,0.2)', borderRadius:'var(--radius-sm)', padding:'10px 12px' },
  error        : { fontSize:13, color:'#e05c5c', background:'rgba(224,92,92,0.08)', borderRadius:'var(--radius-sm)', padding:'10px 12px', margin:0 },
  buyBtn       : { display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'14px', background:'#c9a96e', color:'#0d0d0d', border:'none', borderRadius:'var(--radius-md)', fontSize:15, fontWeight:600, cursor:'pointer' },
  buyBtnDisabled: { opacity:0.45, cursor:'not-allowed' },
  paymentLogos : { display:'flex', flexWrap:'wrap', gap:6, justifyContent:'center' },
  paymentBadge : { fontSize:11, color:'var(--text-muted)', background:'var(--bg-elevated)', border:'1px solid var(--border)', padding:'3px 8px', borderRadius:4 },
  secureNote   : { margin:0, fontSize:11, color:'var(--text-muted)', textAlign:'center', lineHeight:1.6 },
  refundNote   : { background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', padding:'10px 12px' },
  spinner      : { width:14, height:14, border:'2px solid rgba(0,0,0,0.2)', borderTop:'2px solid #0d0d0d', borderRadius:'50%', animation:'spin 0.7s linear infinite', display:'inline-block' },
  successIcon  : { fontSize:48, textAlign:'center' },
  successTitle : { margin:'0 0 12px', fontSize:24, fontWeight:600, color:'var(--text-primary)', textAlign:'center' },
  successDesc  : { margin:'0 0 24px', fontSize:14, color:'var(--text-muted)', lineHeight:1.7, textAlign:'center' },
  btn          : { display:'block', background:'#c9a96e', color:'#0d0d0d', textDecoration:'none', padding:'13px 24px', borderRadius:'var(--radius-md)', fontSize:15, fontWeight:600, textAlign:'center' },
  card         : { width:'100%', maxWidth:480, background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-xl)', padding:'40px 32px', display:'flex', flexDirection:'column', gap:16, margin:'80px auto' },
}
