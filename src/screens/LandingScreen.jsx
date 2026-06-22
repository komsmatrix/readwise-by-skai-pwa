import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const _supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

const TAG_ICONS = { announcement: '📢', feature: '✨', lesson: '📚', audio: '🎧', fix: '🛠' }

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return isMobile
}

export default function LandingScreen({ onGetAccess, onTryFree, onSignIn }) {
  // onGetAccess(course), onTryFree(course)

  const [liveUpdates, setLiveUpdates] = useState([])

  useEffect(() => {
    async function loadUpdates() {
      try {
        const { data } = await _supabase
          .from('announcements')
          .select('id, title, body, tag, is_pinned, created_at')
          .eq('active', true)
          .order('is_pinned', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(5)
        if (data && data.length > 0) setLiveUpdates(data)
      } catch {}
    }
    loadUpdates()
  }, [])

  const gaugeRef    = useRef(null)
  const [pct, setPct]     = useState(0)
  const [level, setLevel] = useState('Started')
  const [levelColor, setLevelColor] = useState('#6b6560')
  const [bars, setBars]   = useState({ b1: 0, b2: 0, b3: 0, b4: 0 })
  const [studentCount, setStudentCount] = useState(null)
  const [navOpen, setNavOpen] = useState(false)
  const isMobile = useIsMobile()
  const [selectedCourse, setSelectedCourse] = useState('LET')

  const LEVELS = [
    { min: 0,  max: 30,  label: 'Started',      color: '#6b6560' },
    { min: 30, max: 50,  label: 'Consistent',   color: '#8B5CF6' },
    { min: 50, max: 70,  label: 'Preparing',    color: '#06B6D4' },
    { min: 70, max: 85,  label: 'Almost Ready', color: '#F59E0B' },
    { min: 85, max: 101, label: 'Board Ready',  color: '#22c55e' },
  ]

  function getLevel(p) {
    return LEVELS.find(l => p >= l.min && p < l.max) || LEVELS[LEVELS.length - 1]
  }

  // Animate gauge on mount
  useEffect(() => {
    const target   = 74
    const duration = 2000
    const start    = performance.now()

    function step(now) {
      const progress = Math.min((now - start) / duration, 1)
      const eased    = 1 - Math.pow(1 - progress, 3)
      const current  = Math.round(target * eased)
      const lv       = getLevel(current)
      setPct(current)
      setLevel(lv.label)
      setLevelColor(lv.color)
      if (progress < 1) requestAnimationFrame(step)
    }
    const raf = requestAnimationFrame(step)

    // Animate bars
    const targets = [82, 71, 78, 65]
    const keys    = ['b1', 'b2', 'b3', 'b4']
    targets.forEach((t, i) => {
      setTimeout(() => {
        let cur = 0
        const iv = setInterval(() => {
          cur = Math.min(cur + 2, t)
          setBars(b => ({ ...b, [keys[i]]: cur }))
          if (cur >= t) clearInterval(iv)
        }, 20)
      }, 800 + i * 150)
    })

    // Load student count
    async function loadCount() {
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/customers?select=id&is_active=eq.true`
        const res = await fetch(url, {
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          }
        })
        const data = await res.json()
        setStudentCount(Array.isArray(data) ? data.length : 3)
      } catch { setStudentCount(3) }
    }
    loadCount()

    return () => cancelAnimationFrame(raf)
  }, [])

  // Gauge arc math
  const total      = 352
  const offset     = total - (total * pct / 100)
  const arcPath    = "M 24 80 A 56 56 0 1 1 136 80"

  const STAT_COLORS = ['#06B6D4','#c9a96e','#8B5CF6','#F59E0B']
  const STAT_LABELS = ['Coverage','Mastery','Consistency','Mock Exam']
  const STAT_KEYS   = ['b1','b2','b3','b4']

  return (
    <div style={s.root}>

      {/* NAV */}
      <nav style={s.nav}>
        <div style={s.navBrand}>
          <div style={s.navLogo}>R</div>
          <div>
            <div style={s.navName}>Readwise</div>
            <div style={s.navBy}>by Skai</div>
          </div>
        </div>
        {/* Desktop nav links */}
        <div style={{ ...s.navLinks, display: isMobile ? 'none' : 'flex' }}>
          <a href="#how" style={s.navLink}>How it works</a>
          <a href="#courses" style={s.navLink}>Courses</a>
          <a href="#pricing" style={s.navLink}>Pricing</a>
          <a href="#updates" style={s.navLink}>Updates</a>
          <button style={s.navSignIn} onClick={onSignIn}>Sign In</button>
          <button style={s.navCta} onClick={() => onGetAccess(selectedCourse)}>Get Access · ₱{selectedCourse === 'TESDA' ? 99 : 249}</button>
        </div>
        {/* Mobile nav — hamburger + actions */}
        <div style={{ ...s.navMobile, display: isMobile ? 'flex' : 'none' }}>
          <button style={s.navSignInMobile} onClick={onSignIn}>Sign In</button>
          <button style={s.navCtaMobile} onClick={() => onGetAccess(selectedCourse)}>Get Access</button>
          <button style={s.hamburger} onClick={() => setNavOpen(o => !o)} aria-label="Menu">
            <span style={{ display:'block', width:20, height:2, background:'var(--text-primary)', marginBottom:4, transition:'all .2s', transform: navOpen ? 'translateY(6px) rotate(45deg)' : 'none' }}/>
            <span style={{ display:'block', width:20, height:2, background:'var(--text-primary)', marginBottom:4, opacity: navOpen ? 0 : 1, transition:'all .2s' }}/>
            <span style={{ display:'block', width:20, height:2, background:'var(--text-primary)', transition:'all .2s', transform: navOpen ? 'translateY(-6px) rotate(-45deg)' : 'none' }}/>
          </button>
        </div>
      </nav>
      {/* Mobile dropdown menu */}
      {navOpen && (
        <div style={s.mobileMenu}>
          {[['#how','How it works'],['#courses','Courses'],['#pricing','Pricing'],['#updates','Updates']].map(([href,label]) => (
            <a key={label} href={href} style={s.mobileMenuLink} onClick={() => setNavOpen(false)}>{label}</a>
          ))}
          <div style={{ height:1, background:'var(--border)', margin:'8px 0' }}/>
          <button style={s.mobileMenuSignIn} onClick={() => { setNavOpen(false); onSignIn(); }}>Sign In</button>
          <button style={s.mobileMenuCta} onClick={() => { setNavOpen(false); onGetAccess(selectedCourse); }}>Get Access · ₱{selectedCourse === 'TESDA' ? 99 : 249}</button>
        </div>
      )}

      {/* HERO */}
      <section style={s.hero}>
        <div style={s.heroGlow}/>
        <div style={s.eyebrow}>
          <span style={s.eyebrowDot}/>
          National Exam Operating System · Philippines
        </div>
        <h1 style={s.heroTitle}>
          Know what to study.<br/>
          <em style={{ fontStyle:'italic', color:'var(--accent)' }}>Pass your national exam.</em>
        </h1>
        <p style={s.heroSub}>
          Readwise remembers what you forget, finds the gaps you can't see yourself, and tells you exactly what to do — every day until exam day.
        </p>
        <div style={s.heroActions}>
          <button style={s.btnPrimary} onClick={() => onGetAccess(selectedCourse)}>Get Access · ₱{selectedCourse === 'TESDA' ? 99 : 249}</button>
          <button style={s.btnGhost}   onClick={() => onTryFree(selectedCourse)}>Try Free for 1 Hour →</button>
        </div>
        <div style={s.examBadges}>
          {['LET','NLE','NAPOLCOM','Civil Service','Criminology'].map((e,i) => (
            <span key={e} style={{ ...s.examBadge, ...(i===0 ? s.examBadgeActive : {}) }}>{e}</span>
          ))}
        </div>

        {/* Gauge demo */}
        <div style={s.gaugeDemo}>
          <div style={s.gaugeLabel}>Your readiness — tracked every day</div>
          <div style={s.gaugeWrap}>
            <div style={{ position:'relative', flexShrink: 0 }}>
              <svg viewBox="0 0 160 90" width="200" height="112">
                <path d={arcPath} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" strokeLinecap="round"/>
                <path d={arcPath} fill="none" stroke={levelColor} strokeWidth="10" strokeLinecap="round"
                  strokeDasharray={total} strokeDashoffset={offset}
                  style={{ transition:'stroke-dashoffset 2s cubic-bezier(.4,0,.2,1), stroke .3s' }}/>
              </svg>
              <div style={s.gaugeCenterText}>
                <span style={{ ...s.gaugePct, color: levelColor }}>{pct}%</span>
                <span style={{ ...s.gaugeLevel, color: levelColor }}>{level}</span>
              </div>
            </div>
            <div style={s.gaugeStats}>
              {STAT_KEYS.map((k,i) => (
                <div key={k} style={s.gaugeStatRow}>
                  <div style={s.gaugeStatLabel}>{STAT_LABELS[i]}</div>
                  <div style={s.gaugeStatBar}>
                    <div style={{ ...s.gaugeStatFill, width:`${bars[k]}%`, background: STAT_COLORS[i], transition:'width 0.8s ease' }}/>
                  </div>
                  <div style={s.gaugeStatVal}>{bars[k]}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* WHY STUDENTS FAIL */}
      <section style={{ ...s.section, background:'#141414' }}>
        <div style={s.container}>
          <div style={s.sectionEyebrow}>The real problem</div>
          <h2 style={s.sectionTitle}>5 reasons students fail national exams</h2>
          <p style={s.sectionSub}>Readwise is built to prevent all five.</p>
          <div style={s.failGrid}>
            {[
              { n:'01', t:'No consistent study habit',    d:'They study hard for a week, disappear for two, and never build real momentum.',                           fix:'Streak system + recovery flow' },
              { n:'02', t:'Missing high-weight topics',   d:'They study what\'s comfortable, not what carries the most exam weight.',                                  fix:'Board Blueprint weighting' },
              { n:'03', t:'Forgetting what they studied', d:'Without review, 70% of what you learn disappears within a week.',                                         fix:'Spaced repetition + forgetting signal' },
              { n:'04', t:'Can\'t see their weak areas',  d:'They feel productive studying, but don\'t know which topics are dragging them down.',                     fix:'Topic Health + Coach Insights' },
              { n:'05', t:'Never simulated the real exam',d:'The actual board exam feels different — pressure, timing, format — when you\'ve never practiced it.',     fix:'Full mock board simulation' },
            ].map(f => (
              <div key={f.n} style={s.failCard}>
                <div style={s.failNum}>{f.n}</div>
                <div style={s.failTitle}>{f.t}</div>
                <div style={s.failDesc}>{f.d}</div>
                <div style={s.failFix}>→ {f.fix}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" style={s.section}>
        <div style={s.container}>
          <div style={s.sectionEyebrow}>How it works</div>
          <h2 style={s.sectionTitle}>Built around how you actually learn</h2>
          <p style={s.sectionSub}>Not a content dump. Not a quiz app. A system that coaches you from enrollment to exam day.</p>
          <div style={s.stepsGrid}>
            {[
              { icon:'📋', t:'Day 1: Your plan is ready',              d:'Tell us your exam and date. Readwise builds your personalized study schedule before you take your first step.' },
              { icon:'🧠', t:'Daily: Readwise decides what to study',  d:'You never ask "what should I study today?" — Readwise already knows, and tells you why it matters.' },
              { icon:'🔄', t:'Always: It remembers what you forget',   d:'Spaced repetition resurfaces cards at exactly the right moment — before you forget them, not after.' },
              { icon:'📊', t:'Every week: See your readiness score',   d:'One number that answers "will I pass?" — weighted by actual board exam topic importance.' },
              { icon:'⚡', t:'When you fall behind: Recovery mode',    d:'Miss a week? Readwise adjusts your plan without overwhelming you. No shame. Just the next step.' },
              { icon:'🎯', t:'Final 30 days: Simulation mode',         d:'Full mock board exams, timed, in the exact format of the real test — so nothing surprises you on exam day.' },
            ].map(step => (
              <div key={step.t} style={s.stepCard}>
                <div style={s.stepIcon}>{step.icon}</div>
                <div style={s.stepTitle}>{step.t}</div>
                <div style={s.stepDesc}>{step.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COURSES */}
      <section id="courses" style={{ ...s.section, background:'#141414' }}>
        <div style={s.container}>
          <div style={s.sectionEyebrow}>Courses</div>
          <h2 style={s.sectionTitle}>Built for Philippine National Examinations</h2>
          <p style={s.sectionSub}>Board exams, licensure exams, and TESDA qualifications — all in one platform.</p>
          <div style={s.coursesGrid}>
            {[
              { code:'LET',          full:'Licensure Examination for Teachers',    live:true,  price:249, regular:399, stats:['14 topics covered','1,554+ questions','23 structured lessons','Full mock board exam'] },
              { code:'TESDA',        full:'NC Qualifications Bundle',              live:true,  price:99,  regular:199, stats:['10+ NC II qualifications','Full HTML reviewers','Video + infographics','Lifetime access to all NCs'] },
              { code:'NLE',          full:'Nursing Licensure Examination',         live:false, price:249, regular:399, stats:['9 subject areas','Content in preparation'] },
              { code:'NAPOLCOM',     full:'NAPOLCOM Examination',                  live:false, price:249, regular:399, stats:['Police Officer I & Promotion','Content in preparation'] },
              { code:'Civil Service',full:'Civil Service Examination',             live:false, price:249, regular:399, stats:['Professional & Sub-professional','Content in preparation'] },
              { code:'Criminology',  full:'Criminologist Licensure Examination',   live:false, price:249, regular:399, stats:['Content in preparation'] },
            ].map(c => {
              const isSelected = selectedCourse === c.code
              return (
                <div key={c.code}
                  onClick={() => c.live && setSelectedCourse(c.code)}
                  style={{
                    ...s.courseCard,
                    ...(c.live ? s.courseCardLive : {}),
                    ...(isSelected ? s.courseCardSelected : {}),
                    cursor: c.live ? 'pointer' : 'default',
                    opacity: c.live ? 1 : 0.5,
                  }}>
                  <div style={s.courseHeader}>
                    <div style={s.courseCode}>{c.code}</div>
                    <span style={{ ...s.courseStatus, ...(c.live ? s.courseStatusLive : s.courseStatusSoon) }}>
                      {c.live ? 'Live Now' : 'Coming Soon'}
                    </span>
                  </div>
                  <div style={s.courseFull}>{c.full}</div>
                  {c.live && (
                    <div style={{ fontSize:14, fontWeight:700, color:'var(--accent)', margin:'6px 0 8px' }}>
                      ₱{c.price} <span style={{ fontSize:11, color:'var(--text-muted)', textDecoration:'line-through', fontWeight:400 }}>₱{c.regular}</span>
                    </div>
                  )}
                  <div style={s.courseStats}>
                    {c.stats.map(st => <div key={st} style={s.courseStat}>{st}</div>)}
                  </div>
                  {c.live && (
                    <div style={{ marginTop:14 }}>
                      {isSelected ? (
                        <div style={s.courseSelectedBadge}>✓ Selected</div>
                      ) : (
                        <div style={s.courseSelectHint}>Click to select</div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" style={s.section}>
        <div style={{ ...s.container, textAlign:'center' }}>
          <div style={s.sectionEyebrow}>Pricing</div>
          <h2 style={s.sectionTitle}>One course. One price. Yours forever.</h2>
          {(() => {
            const COURSE_PRICES = {
              LET          : { price: 249, regular: 399 },
              TESDA        : { price: 99,  regular: 199 },
              NLE          : { price: 249, regular: 399 },
              NAPOLCOM     : { price: 249, regular: 399 },
              'Civil Service': { price: 249, regular: 399 },
              Criminology  : { price: 249, regular: 399 },
            }
            const COURSE_FEATURES = {
              TESDA: [
                'Full HTML reviewers for all NC II qualifications',
                'Video lessons per core competency',
                'Infographics and visual guides',
                '10+ qualifications: Cookery, Caregiving, Housekeeping, Domestic Work + more',
                'Lifetime access — all future qualifications included',
                'Works on any device, anytime',
              ],
              default: [
                `Full access to ${selectedCourse} reviewer (1,554+ questions)`,
                'Structured lessons with memory hooks',
                'Readiness Score updated daily',
                'Spaced repetition scheduling',
                'Coach Insights and daily recommendations',
                'Mock board exam simulation',
                'NLE, NAPOLCOM, Civil Service + more when available',
              ],
            }
            const cp       = COURSE_PRICES[selectedCourse] || COURSE_PRICES.LET
            const features = COURSE_FEATURES[selectedCourse] || COURSE_FEATURES.default
            return (
              <div style={s.pricingCard}>
                <div style={s.priceEyebrow}>{selectedCourse} — Introductory Price</div>
                <div style={s.priceAmount}><span style={s.priceSup}>₱</span>{cp.price}</div>
                <div style={s.priceOld}>Regular price: ₱{cp.regular}</div>
                <div style={s.priceNote}>One-time payment · Lifetime access to {selectedCourse} · Add more courses anytime</div>
                <div style={s.priceDivider}/>
                <div style={s.priceFeatures}>
                  {features.map(f => (
                    <div key={f} style={s.priceFeature}>
                      <span style={{ color:'var(--accent)', fontWeight:700 }}>✓</span> {f}
                    </div>
                  ))}
                </div>
                <button style={s.priceCta} onClick={() => onGetAccess(selectedCourse)}>
                  Get Access to {selectedCourse} · ₱{cp.price}
                </button>
                <div style={s.priceSub}>Secure payment via GCash · Maya · Card · PayMongo</div>
              </div>
            )
          })()}

          {/* Trial banner */}
          <div style={s.trialBanner}>
            <div>
              <h3 style={{ fontSize:20, fontWeight:700, color:'var(--text-primary)', marginBottom:6 }}>Not ready to buy? Try it free.</h3>
              <p style={{ fontSize:14, color:'var(--text-secondary)' }}>Register your email and get 1 hour of full access — no card required.</p>
            </div>
            <button style={s.btnTrial} onClick={() => onTryFree(selectedCourse)}>Start Free Trial →</button>
          </div>
        </div>
      </section>

      {/* UPDATES */}
      <section id="updates" style={{ ...s.section, background:'#141414' }}>
        <div style={s.container}>
          <div style={s.sectionEyebrow}>Platform Updates</div>
          <h2 style={s.sectionTitle}>What's new</h2>
          <div style={s.updatesList}>
            {(liveUpdates.length > 0 ? liveUpdates : [
              { id:'f1', tag:'lesson',       is_pinned:false, title:'Lessons tab launched',             body:'Structured lessons now live — read, learn, mark complete. Child Development first.',    created_at:'2026-06-12' },
              { id:'f2', tag:'feature',      is_pinned:false, title:'1,200+ LET questions added',       body:'All 12 LET topics now have board-weighted questions with full rationales.',              created_at:'2026-06-11' },
              { id:'f3', tag:'feature',      is_pinned:false, title:'Readiness Score system live',      body:'Coverage, Mastery, Consistency, Mock Exam — all four components now calculating.',       created_at:'2026-06-10' },
              { id:'f4', tag:'feature',      is_pinned:false, title:'Spaced repetition engine launched',body:'SM-2 algorithm with forgetting signal. Cards resurface exactly when you need them.',     created_at:'2026-06-05' },
            ]).map(u => (
              <div key={u.id} style={{ ...s.updateRow, ...(u.is_pinned ? { background:'rgba(201,169,110,0.07)', borderRadius:8, padding:'8px 10px', margin:'-4px -10px' } : {}) }}>
                <div style={s.updateDate}>
                  {u.is_pinned ? '📌' : (TAG_ICONS[u.tag] || '📢')}
                </div>
                <div style={s.updateDot}/>
                <div>
                  <div style={s.updateTitle}>{u.title}</div>
                  <div style={s.updateDesc}>{u.body}</div>
                  <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:3, opacity:.6 }}>
                    {new Date(u.created_at).toLocaleDateString('en-PH', { month:'short', day:'numeric' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{ ...s.section, textAlign:'center' }}>
        <div style={s.container}>
          <h2 style={{ ...s.sectionTitle, maxWidth:600, margin:'0 auto 16px' }}>
            Your next national exam<br/>
            <em style={{ fontStyle:'italic', color:'var(--accent)' }}>doesn't have to be your last attempt.</em>
          </h2>
          <p style={{ ...s.sectionSub, margin:'0 auto 36px' }}>
            Join students who are studying smarter — not longer — with a system that actually knows what they need.
          </p>
          <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
            <button style={s.btnPrimary} onClick={() => onGetAccess(selectedCourse)}>Get Access · ₱{selectedCourse === 'TESDA' ? 99 : 249}</button>
            <button style={s.btnGhost}   onClick={() => onTryFree(selectedCourse)}>Try Free First →</button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={s.footer}>
        <div style={s.footerBrand}>Readwise by Skai</div>
        <div style={s.footerSub}>Board Exam & National Examination Operating System · Philippines</div>
        <div style={s.footerLinks}>
          {['How it works','Courses','Pricing','Updates'].map(l => (
            <a key={l} href={l === 'How it works' ? '#how' : l === 'Updates' ? '#updates' : `#${l.toLowerCase()}`} style={s.footerLink}>{l}</a>
          ))}
          <a href="/privacy" style={s.footerLink}>Privacy Policy</a>
          <button style={{ ...s.footerLink, background:'none', border:'none', cursor:'pointer' }} onClick={onSignIn}>Sign In</button>
          <button style={{ ...s.footerLink, background:'none', border:'none', cursor:'pointer' }} onClick={() => onGetAccess(selectedCourse)}>Buy Access</button>
        </div>
        <div style={s.footerCopy}>© 2026 Readwise by Skai · All rights reserved · <a href="/privacy" style={{ color:"var(--text-muted)", textDecoration:"underline" }}>Privacy Policy</a></div>
      </footer>

    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  root:             { minHeight:'100vh', background:'var(--bg-base)', color:'var(--text-primary)', fontFamily:'var(--font-ui)', overflowX:'hidden' },

  // Nav
  nav:              { position:'fixed', top:0, left:0, right:0, zIndex:100, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 32px', background:'rgba(13,13,13,0.9)', backdropFilter:'blur(12px)', borderBottom:'1px solid var(--border)' },
  navBrand:         { display:'flex', alignItems:'center', gap:10, textDecoration:'none', cursor:'default' },
  navLogo:          { width:32, height:32, background:'var(--accent-dim)', border:'1px solid var(--accent)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:16, color:'var(--accent)' },
  navName:          { fontWeight:700, fontSize:16, color:'var(--text-primary)' },
  navBy:            { fontSize:10, color:'var(--accent)', textTransform:'uppercase', letterSpacing:'.06em' },
  navLinks:         { display:'flex', alignItems:'center', gap:20 },
  navMobile:        { display:'none', alignItems:'center', gap:8 },
  navSignInMobile:  { background:'none', border:'1px solid var(--border)', color:'var(--text-secondary)', padding:'7px 12px', borderRadius:8, fontWeight:600, fontSize:13, cursor:'pointer', fontFamily:'inherit' },
  navCtaMobile:     { background:'var(--accent)', color:'#0d0d0d', padding:'7px 14px', borderRadius:8, fontWeight:700, fontSize:13, border:'none', cursor:'pointer', fontFamily:'inherit' },
  hamburger:        { background:'none', border:'none', cursor:'pointer', padding:'6px', display:'flex', flexDirection:'column', justifyContent:'center' },
  mobileMenu:       { position:'fixed', top:65, left:0, right:0, zIndex:99, background:'var(--bg-surface)', borderBottom:'1px solid var(--border)', padding:'16px 24px', display:'flex', flexDirection:'column', gap:4, boxShadow:'0 8px 32px rgba(0,0,0,0.4)' },
  mobileMenuLink:   { color:'var(--text-primary)', textDecoration:'none', fontSize:16, fontWeight:500, padding:'12px 0', borderBottom:'1px solid var(--border)' },
  mobileMenuSignIn: { background:'none', border:'1px solid var(--border)', color:'var(--text-secondary)', padding:'12px', borderRadius:8, fontWeight:600, fontSize:15, cursor:'pointer', fontFamily:'inherit', marginTop:8 },
  mobileMenuCta:    { background:'var(--accent)', color:'#0d0d0d', padding:'14px', borderRadius:8, fontWeight:700, fontSize:15, border:'none', cursor:'pointer', fontFamily:'inherit', marginTop:8 },
  navLink:          { color:'var(--text-secondary)', textDecoration:'none', fontSize:14, background:'none', border:'none', cursor:'pointer' },
  navSignIn:        { background:'none', border:'1px solid var(--border)', color:'var(--text-secondary)', padding:'8px 16px', borderRadius:8, fontWeight:600, fontSize:14, cursor:'pointer', fontFamily:'inherit' },
  navCta:           { background:'var(--accent)', color:'#0d0d0d', padding:'8px 20px', borderRadius:8, fontWeight:700, fontSize:14, border:'none', cursor:'pointer', fontFamily:'inherit' },

  // Hero
  hero:             { minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', padding:'120px 24px 80px', position:'relative', overflow:'hidden' },
  heroGlow:         { position:'absolute', top:'-100px', left:'50%', transform:'translateX(-50%)', width:800, height:800, borderRadius:'50%', background:'radial-gradient(circle, rgba(201,169,110,0.08) 0%, transparent 65%)', pointerEvents:'none' },
  eyebrow:          { display:'inline-flex', alignItems:'center', gap:8, background:'var(--accent-dim)', border:'1px solid rgba(201,169,110,0.25)', borderRadius:20, padding:'6px 16px', fontSize:12, fontWeight:600, color:'var(--accent)', letterSpacing:'.04em', textTransform:'uppercase', marginBottom:28 },
  eyebrowDot:       { width:6, height:6, background:'var(--accent)', borderRadius:'50%' },
  heroTitle:        { fontFamily:'Georgia, serif', fontSize:'clamp(36px, 7vw, 72px)', fontWeight:400, lineHeight:1.1, color:'var(--text-primary)', letterSpacing:'-.02em', marginBottom:20, maxWidth:800 },
  heroSub:          { fontSize:'clamp(15px, 2vw, 18px)', color:'var(--text-secondary)', lineHeight:1.7, maxWidth:520, marginBottom:36 },
  heroActions:      { display:'flex', gap:12, flexWrap:'wrap', justifyContent:'center', marginBottom:48 },
  btnPrimary:       { background:'var(--accent)', color:'#0d0d0d', padding:'14px 32px', borderRadius:10, fontWeight:700, fontSize:16, border:'none', cursor:'pointer', fontFamily:'inherit', transition:'opacity .15s' },
  btnGhost:         { background:'none', color:'var(--text-secondary)', padding:'14px 32px', borderRadius:10, fontWeight:600, fontSize:16, border:'1px solid var(--border)', cursor:'pointer', fontFamily:'inherit', transition:'all .15s' },
  examBadges:       { display:'flex', gap:8, flexWrap:'wrap', justifyContent:'center' },
  examBadge:        { background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:6, padding:'6px 14px', fontSize:12, fontWeight:700, color:'var(--text-muted)', fontFamily:"'DM Mono', monospace" },
  examBadgeActive:  { borderColor:'rgba(201,169,110,0.3)', color:'var(--accent)' },

  // Gauge
  gaugeDemo:        { marginTop:64 },
  gaugeLabel:       { fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.06em', textAlign:'center', marginBottom:16 },
  gaugeWrap:        { background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:20, padding:'28px 36px', display:'inline-flex', alignItems:'center', gap:36, maxWidth:560 },
  gaugeCenterText:  { position:'absolute', bottom:8, left:0, right:0, textAlign:'center' },
  gaugePct:         { fontFamily:'Georgia, serif', fontSize:28, fontWeight:700, display:'block', lineHeight:1 },
  gaugeLevel:       { fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em' },
  gaugeStats:       { display:'flex', flexDirection:'column', gap:12 },
  gaugeStatRow:     { display:'flex', flexDirection:'column', gap:4 },
  gaugeStatLabel:   { fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.05em' },
  gaugeStatBar:     { height:4, background:'var(--bg-elevated)', borderRadius:2, overflow:'hidden', width:160 },
  gaugeStatFill:    { height:'100%', borderRadius:2 },
  gaugeStatVal:     { fontSize:12, fontFamily:"'DM Mono', monospace", color:'var(--text-primary)' },

  // Sections
  section:          { padding:'96px 24px' },
  container:        { maxWidth:1100, margin:'0 auto' },
  sectionEyebrow:   { fontSize:11, fontWeight:700, color:'var(--accent)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:12 },
  sectionTitle:     { fontFamily:'Georgia, serif', fontSize:'clamp(26px, 4vw, 42px)', fontWeight:400, lineHeight:1.2, letterSpacing:'-.02em', color:'var(--text-primary)', marginBottom:14 },
  sectionSub:       { fontSize:17, color:'var(--text-secondary)', lineHeight:1.7, maxWidth:540, marginBottom:0 },

  // Fail cards
  failGrid:         { display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(190px, 1fr))', gap:16, marginTop:48 },
  failCard:         { background:'var(--bg-base)', border:'1px solid var(--border)', borderRadius:12, padding:24, borderTop:'2px solid #ef4444' },
  failNum:          { fontFamily:'Georgia, serif', fontSize:34, color:'#ef4444', opacity:.3, lineHeight:1, marginBottom:8 },
  failTitle:        { fontSize:14, fontWeight:700, color:'var(--text-primary)', marginBottom:6 },
  failDesc:         { fontSize:13, color:'var(--text-muted)', lineHeight:1.6 },
  failFix:          { marginTop:12, paddingTop:12, borderTop:'1px solid var(--border)', fontSize:12, color:'var(--accent)', fontWeight:600 },

  // Steps
  stepsGrid:        { display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(250px, 1fr))', gap:20, marginTop:48 },
  stepCard:         { background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:16, padding:28 },
  stepIcon:         { width:44, height:44, background:'var(--accent-dim)', border:'1px solid rgba(201,169,110,0.25)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, marginBottom:16 },
  stepTitle:        { fontSize:15, fontWeight:700, color:'var(--text-primary)', marginBottom:8 },
  stepDesc:         { fontSize:14, color:'var(--text-secondary)', lineHeight:1.7 },

  // Courses
  courseCardSelected:  { borderColor:'var(--accent)', background:'var(--accent-dim)' },
  courseSelectedBadge: { fontSize:12, fontWeight:700, color:'var(--accent)', background:'var(--accent-dim)', border:'1px solid rgba(201,169,110,0.3)', borderRadius:6, padding:'4px 10px', display:'inline-block' },
  courseSelectHint:    { fontSize:12, color:'var(--text-muted)', fontStyle:'italic' },
  coursesGrid:      { display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:16, marginTop:48 },
  courseCard:       { background:'var(--bg-base)', border:'1px solid var(--border)', borderRadius:14, padding:24 },
  courseCardLive:   { borderColor:'rgba(201,169,110,0.3)' },
  courseHeader:     { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 },
  courseCode:       { fontSize:22, fontWeight:800, fontFamily:"'DM Mono', monospace", color:'var(--text-primary)' },
  courseStatus:     { fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:4, textTransform:'uppercase', letterSpacing:'.04em' },
  courseStatusLive: { background:'rgba(34,197,94,.12)', color:'#22c55e' },
  courseStatusSoon: { background:'rgba(107,101,96,.12)', color:'var(--text-muted)' },
  courseFull:       { fontSize:13, color:'var(--text-secondary)', marginBottom:14 },
  courseStats:      { display:'flex', flexDirection:'column', gap:5 },
  courseStat:       { fontSize:12, color:'var(--text-muted)', fontFamily:"'DM Mono', monospace" },

  // Pricing
  pricingCard:      { maxWidth:460, margin:'48px auto 0', background:'var(--bg-surface)', border:'1px solid rgba(201,169,110,0.3)', borderRadius:20, padding:40, textAlign:'center' },
  priceEyebrow:     { fontSize:11, fontWeight:700, color:'var(--accent)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:8 },
  priceAmount:      { fontFamily:'Georgia, serif', fontSize:64, fontWeight:400, color:'var(--text-primary)', lineHeight:1, marginBottom:4 },
  priceSup:         { fontSize:28, verticalAlign:'top', marginTop:8, color:'var(--accent)' },
  priceOld:         { fontSize:15, color:'var(--text-muted)', textDecoration:'line-through', marginBottom:6 },
  priceNote:        { fontSize:13, color:'var(--text-secondary)', marginBottom:24 },
  priceDivider:     { height:1, background:'var(--border)', margin:'20px 0' },
  priceFeatures:    { textAlign:'left', marginBottom:28, display:'flex', flexDirection:'column', gap:10 },
  priceFeature:     { display:'flex', alignItems:'flex-start', gap:10, fontSize:14, color:'var(--text-secondary)' },
  priceCta:         { display:'block', width:'100%', background:'var(--accent)', color:'#0d0d0d', padding:16, borderRadius:10, fontWeight:800, fontSize:17, border:'none', cursor:'pointer', fontFamily:'inherit' },
  priceSub:         { fontSize:12, color:'var(--text-muted)', marginTop:10 },
  trialBanner:      { background:'var(--accent-dim)', border:'1px solid rgba(201,169,110,0.25)', borderRadius:16, padding:'28px 36px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:20, marginTop:40, textAlign:'left' },
  btnTrial:         { background:'var(--accent)', color:'#0d0d0d', padding:'12px 28px', borderRadius:8, fontWeight:700, fontSize:15, border:'none', cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' },

  // Updates
  updatesList:      { marginTop:36, display:'flex', flexDirection:'column' },
  updateRow:        { display:'flex', alignItems:'flex-start', gap:20, padding:'20px 0', borderBottom:'1px solid var(--border)' },
  updateDate:       { fontSize:12, fontFamily:"'DM Mono', monospace", color:'var(--text-muted)', minWidth:52, paddingTop:2 },
  updateDot:        { width:8, height:8, background:'var(--accent)', borderRadius:'50%', marginTop:6, flexShrink:0 },
  updateTitle:      { fontSize:15, fontWeight:600, color:'var(--text-primary)', marginBottom:3 },
  updateDesc:       { fontSize:13, color:'var(--text-muted)' },

  // Footer
  footer:           { background:'var(--bg-surface)', borderTop:'1px solid var(--border)', padding:'48px 24px', textAlign:'center' },
  footerBrand:      { fontFamily:'Georgia, serif', fontSize:22, color:'var(--text-primary)', marginBottom:6 },
  footerSub:        { fontSize:13, color:'var(--text-muted)', marginBottom:20 },
  footerLinks:      { display:'flex', justifyContent:'center', gap:20, flexWrap:'wrap', marginBottom:24 },
  footerLink:       { fontSize:13, color:'var(--text-muted)', textDecoration:'none', fontFamily:'inherit', padding:0 },
  footerCopy:       { fontSize:12, color:'var(--text-muted)' },
}
