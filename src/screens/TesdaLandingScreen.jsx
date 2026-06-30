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

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width:'100%', padding:'14px 18px', background:'none', border:'none', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, fontFamily:'inherit', textAlign:'left' }}>
        <span style={{ fontSize:14, fontWeight:600, color:'var(--text-primary)', lineHeight:1.4 }}>{q}</span>
        <span style={{ fontSize:18, color:'var(--text-muted)', flexShrink:0, transition:'transform .2s', transform: open ? 'rotate(180deg)' : 'none' }}>▾</span>
      </button>
      {open && (
        <div style={{ padding:'0 18px 14px', fontSize:13, color:'var(--text-secondary)', lineHeight:1.7, borderTop:'1px solid var(--border)' }}>
          {a}
        </div>
      )}
    </div>
  )
}

export default function TesdaLandingScreen({ onGetAccess, onTryFree, onSignIn }) {
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
  const [selectedCourse] = useState('TESDA') // locked to TESDA on this page
  const [tesdaQuals, setTesdaQuals] = useState([])

  useEffect(() => {
    async function loadQuals() {
      try {
        const { data } = await _supabase
          .from('tesda_qualifications')
          .select('name, emoji, subtopic_count')
          .eq('is_active', true)
          .gt('subtopic_count', 0)
          .order('sort_order')
        if (data) setTesdaQuals(data)
      } catch {}
    }
    loadQuals()
  }, [])

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
          <a href="#how" style={s.navLink}>What's Included</a>
          <a href="#available" style={s.navLink}>Available Now</a>
          <a href="#pricing" style={s.navLink}>Pricing</a>
          <a href="#faq" style={s.navLink}>FAQ</a>
          <a href="/" style={s.navLink}>LET Board Exam</a>
          <button style={s.navSignIn} onClick={onSignIn}>Sign In</button>
          <button style={{ ...s.navCta, background:'#3b82f6' }} onClick={() => onGetAccess('TESDA')}>Get TESDA · ₱99 →</button>
        </div>
        {/* Mobile nav — hamburger + actions */}
        <div style={{ ...s.navMobile, display: isMobile ? 'flex' : 'none' }}>
          <button style={s.navSignInMobile} onClick={onSignIn}>Sign In</button>
          <button style={{ ...s.navCtaMobile, background:'#3b82f6' }} onClick={() => onGetAccess('TESDA')}>Get Access</button>
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
          {[['#how',"What's Included"],['#available','Available Now'],['#pricing','Pricing'],['#faq','FAQ'],['/','LET Board Exam']].map(([href,label]) => (
            <a key={label} href={href} style={s.mobileMenuLink} onClick={() => setNavOpen(false)}>{label}</a>
          ))}
          <div style={{ height:1, background:'var(--border)', margin:'8px 0' }}/>
          <button style={s.mobileMenuSignIn} onClick={() => { setNavOpen(false); onSignIn(); }}>Sign In</button>
          <button style={{ ...s.mobileMenuCta, background:'#3b82f6' }} onClick={() => { setNavOpen(false); onGetAccess('TESDA') }}>Get TESDA · ₱99 →</button>
        </div>
      )}

      {/* HERO */}
      <section style={s.hero}>
        <div style={s.heroGlow}/>
        <div style={{ ...s.eyebrow, background:'rgba(59,130,246,0.1)', borderColor:'rgba(59,130,246,0.3)', color:'#3b82f6' }}>
          <span style={{ ...s.eyebrowDot, background:'#3b82f6' }}/>
          TESDA NC II Reviewer · Philippines
        </div>
        <h1 style={s.heroTitle}>
          The Ultimate TESDA NC II<br/>
          <em style={{ fontStyle:'italic', color:'#3b82f6' }}>Reviewer Hub.</em>
        </h1>
        <p style={s.heroSub}>
          Full HTML reviewers, video lessons, and infographics for every TESDA NC II qualification — in one app, on your phone, in English or Filipino. ₱99 lang. Lifetime access.
        </p>
        <div style={s.heroActions}>
          <button style={{ ...s.btnPrimary, background:'#3b82f6' }} onClick={() => onGetAccess('TESDA')}>
            Get TESDA Bundle · ₱99 →
          </button>
          <button style={s.btnGhost} onClick={() => {
            document.getElementById('available')?.scrollIntoView({ behavior:'smooth' })
          }}>See What's Available →</button>
        </div>
        <div style={s.examBadges}>
          {[
            'Cookery NC II','Caregiving NC II','Housekeeping NC II','Beauty Care NC II',
            'Welding NC II','Food & Beverage NC II','Masonry NC II','Machining NC II',
            'Warehousing NC II','Automotive Servicing NC II',
          ].map((e) => (
            <span key={e} style={{ ...s.examBadge, background:'rgba(59,130,246,0.08)', color:'#3b82f6', border:'1px solid rgba(59,130,246,0.25)' }}>{e}</span>
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

      {/* WHY THE OLD WAY FAILS */}
      <section style={{ ...s.section, background:'#141414' }}>
        <div style={s.container}>
          <div style={{ ...s.sectionEyebrow, color:'#3b82f6' }}>The real problem</div>
          <h2 style={s.sectionTitle}>Bakit mahirap ang traditional na review</h2>
          <p style={s.sectionSub}>Readwise ay ginawa para ayusin ang lahat ng ito.</p>
          <div style={s.failGrid}>
            {[
              { n:'01', t:'Mahal ang review center',        d:'Maraming review center na nangongolekta ng libo-libong piso para lang sa basic na lecture.',          fix:'₱99 lang — lifetime access' },
              { n:'02', t:'Kalat na photocopied modules',   d:'Mawawala, mababasa, at hindi organized — hirap hanapin ang topic na kailangan mo.',                   fix:'Organized HTML reviewer per qualification' },
              { n:'03', t:'Walang video reference',         d:'Mahirap intindihin ang practical skills kung text lang ang available.',                                fix:'Video lessons embedded sa app' },
              { n:'04', t:'Hindi mo alam kung handa ka na', d:'Wala kang paraan para malaman kung kumpleto na ang alam mo bago ka mag-assess.',                       fix:'Complete competency reviewer' },
              { n:'05', t:'English-only materials',         d:'Mas madaling maintindihan kung Filipino — pero karamihan ng materials ay English lang.',                fix:'EN / FIL toggle sa bawat reviewer' },
            ].map(f => (
              <div key={f.n} style={{ ...s.failCard, borderTopColor:'#3b82f6' }}>
                <div style={{ ...s.failNum, color:'#3b82f6' }}>{f.n}</div>
                <div style={s.failTitle}>{f.t}</div>
                <div style={s.failDesc}>{f.d}</div>
                <div style={{ ...s.failFix, color:'#3b82f6' }}>→ {f.fix}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT'S INCLUDED */}
      <section id="how" style={s.section}>
        <div style={s.container}>
          <div style={{ ...s.sectionEyebrow, color:'#3b82f6' }}>What's Included</div>
          <h2 style={s.sectionTitle}>Lahat ng kailangan mo, isang app lang</h2>
          <p style={s.sectionSub}>Hindi lang flashcards. Kumpletong reviewer system para sa bawat TESDA NC II qualification.</p>
          <div style={s.stepsGrid}>
            {[
              { icon:'📖', t:'Full HTML Reviewers',     d:'Structured, complete content para sa bawat core competency. Basahin tulad ng libro — maganda ang format sa kahit anong screen.' },
              { icon:'🎬', t:'Video Lessons',            d:'YouTube video reviewers na naka-embed mismo sa app. Walang kailangan pang maghanap — lahat nasa iisang lugar.' },
              { icon:'🖼', t:'Infographics',             d:'Visual na summary ng mahahalagang topics para mas mabilis ang review bago ang assessment day.' },
              { icon:'🌐', t:'English at Filipino',      d:'I-toggle sa English o Filipino version ng reviewer — kahit kailan, isang tap lang.' },
              { icon:'🖨', t:'I-print Para Offline',     d:'I-print ang iyong reviewer bilang PDF at mag-aral kahit walang internet connection.' },
              { icon:'🔄', t:'Laging May Bago',          d:'Regular kaming naglalabas ng bagong resources at qualifications. Bumili ka isang beses, makukuha mo ang lahat ng bago.' },
            ].map(step => (
              <div key={step.t} style={s.stepCard}>
                <div style={{ ...s.stepIcon, background:'rgba(59,130,246,0.1)', borderColor:'rgba(59,130,246,0.25)' }}>{step.icon}</div>
                <div style={s.stepTitle}>{step.t}</div>
                <div style={s.stepDesc}>{step.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AVAILABLE QUALIFICATIONS */}
      <section id="available" style={{ ...s.section, background:'#141414' }}>
        <div style={s.container}>
          <div style={{ ...s.sectionEyebrow, color:'#3b82f6' }}>Available Now</div>
          <h2 style={s.sectionTitle}>{tesdaQuals.length || '10'} Qualifications Ready Today</h2>
          <p style={s.sectionSub}>Patuloy kaming nag-a-upload ng bagong qualifications. Lahat ng darating — kasama na sa iyong ₱99.</p>
          <div style={s.coursesGrid}>
            {(tesdaQuals.length > 0 ? tesdaQuals : [
              { name:'Cookery NC II', emoji:'🍳' },
              { name:'Caregiving NC II', emoji:'🤝' },
              { name:'Housekeeping NC II', emoji:'🏨' },
              { name:'Beauty Care NC II', emoji:'💅' },
              { name:'Shielded Metal Arc Welding NC II', emoji:'🔧' },
              { name:'Food and Beverage Services NC II', emoji:'🍽️' },
              { name:'Masonry NC II', emoji:'🧱' },
              { name:'Machining NC II', emoji:'⚙️' },
              { name:'Warehousing NC II', emoji:'🏭' },
              { name:'Automotive Servicing NC II', emoji:'🚘' },
            ]).map((q,i) => (
              <div key={i} style={{ ...s.courseCard, ...s.courseCardLive, borderColor:'rgba(59,130,246,0.3)' }}>
                <div style={s.courseHeader}>
                  <div style={{ fontSize:28 }}>{q.emoji || '📋'}</div>
                  <span style={{ ...s.courseStatus, background:'rgba(59,130,246,0.12)', color:'#3b82f6' }}>Available</span>
                </div>
                <div style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)', marginTop:8 }}>{q.name}</div>
                <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:6 }}>NC II · Full reviewer + videos</div>
              </div>
            ))}
            <div style={{ ...s.courseCard, opacity:0.5, display:'flex', alignItems:'center', justifyContent:'center', textAlign:'center' }}>
              <div>
                <div style={{ fontSize:28, marginBottom:8 }}>🔜</div>
                <div style={{ fontSize:13, color:'var(--text-muted)' }}>More qualifications<br/>added regularly</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" style={s.section}>
        <div style={{ ...s.container, textAlign:'center' }}>
          <div style={{ ...s.sectionEyebrow, color:'#3b82f6' }}>Pricing</div>
          <h2 style={s.sectionTitle}>Isang bundle. Isang bayad. Habambuhay.</h2>
          <p style={{ fontSize:14, color:'var(--text-secondary)', marginBottom:8, lineHeight:1.6 }}>
            Ang presyong ito ay <strong style={{ color:'#3b82f6' }}>introductory price</strong> — ma-lock mo ito habambuhay kapag bumili ka ngayon.
          </p>

          <div style={{ display:'flex', justifyContent:'center', marginBottom:24 }}>
            <div style={{ ...s.pricingCard, maxWidth:420, textAlign:'left', borderColor:'rgba(59,130,246,0.35)' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#3b82f6', textTransform:'uppercase', letterSpacing:'.08em' }}>TESDA NC Bundle</div>
                <span style={{ fontSize:10, padding:'2px 8px', background:'rgba(59,130,246,0.12)', color:'#3b82f6', borderRadius:20, fontWeight:600, border:'1px solid rgba(59,130,246,0.25)' }}>Live Now</span>
              </div>
              <div style={{ ...s.priceAmount, color:'#3b82f6' }}><span style={{ ...s.priceSup, color:'#3b82f6' }}>₱</span>99</div>
              <div style={s.priceOld}>Regular price: ₱199</div>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:16 }}>One-time · All NC qualifications included</div>
              <div style={s.priceDivider}/>
              <div style={s.priceFeatures}>
                {[
                  '✅ 10 NC II qualifications available now',
                  '✅ Cookery, Caregiving, Housekeeping',
                  '✅ Beauty Care, Welding, Food & Beverage',
                  '✅ Masonry, Machining, Warehousing, Automotive',
                  '🔜 More qualifications added regularly',
                  '📖 Full HTML reviewer per qualification',
                  '🎬 Video lessons embedded in the app',
                  '🌐 English and Filipino toggle',
                  '🖨 Print for offline study',
                  '♾ Lifetime access — pay once, study forever',
                ].map(f => (
                  <div key={f} style={s.priceFeature}>{f}</div>
                ))}
              </div>
              <button style={{ ...s.priceCta, background:'#3b82f6' }} onClick={() => onGetAccess('TESDA')}>Get TESDA Bundle · ₱99</button>
              <div style={s.priceSub}>QRPh · GrabPay · PayMongo</div>
            </div>
          </div>

          {/* Intro price notice */}
          <div style={{ background:'rgba(59,130,246,0.06)', border:'1px solid rgba(59,130,246,0.15)', borderRadius:12, padding:'14px 20px', fontSize:13, color:'var(--text-secondary)', lineHeight:1.7, marginBottom:24, maxWidth:560, margin:'0 auto 24px' }}>
            ⚡ <strong style={{ color:'#3b82f6' }}>Introductory pricing</strong> ang ₱99 na ito. Habambuhay na ito kapag bumili ka ngayon — kahit tumaas pa ang presyo sa hinaharap.
          </div>

          {/* YouTube preview banner — instead of trial */}
          <div style={{ ...s.trialBanner, background:'rgba(59,130,246,0.08)', borderColor:'rgba(59,130,246,0.25)' }}>
            <div>
              <h3 style={{ fontSize:20, fontWeight:700, color:'var(--text-primary)', marginBottom:6 }}>Gusto mo munang makita?</h3>
              <p style={{ fontSize:14, color:'var(--text-secondary)' }}>Panoorin ang sneak peek ng aming reviewers sa YouTube — libre, walang kailangang bayaran.</p>
            </div>
            <a href="https://www.youtube.com/@readwisebyskai" target="_blank" rel="noopener noreferrer"
              style={{ ...s.btnTrial, background:'#FF0000', textDecoration:'none', display:'inline-block' }}>
              ▶ Watch on YouTube →
            </a>
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

      {/* TESDA SPOTLIGHT SECTION */}
      <section id="tesda" style={{ ...s.section, background:'rgba(59,130,246,0.03)', borderTop:'1px solid rgba(59,130,246,0.1)', borderBottom:'1px solid rgba(59,130,246,0.1)' }}>
        <div style={s.container}>
          <div style={{ textAlign:'center', marginBottom:36 }}>
            <div style={{ display:'inline-block', padding:'4px 14px', background:'rgba(59,130,246,0.1)', border:'1px solid rgba(59,130,246,0.25)', borderRadius:20, fontSize:11, fontWeight:700, color:'#3b82f6', letterSpacing:'.08em', marginBottom:12 }}>
              🏅 TESDA NC II REVIEWER BUNDLE
            </div>
            <h2 style={{ ...s.sectionTitle, color:'var(--text-primary)', marginBottom:12 }}>
              The Ultimate TESDA NC II Hub
            </h2>
            <p style={{ ...s.sectionSub, maxWidth:560, margin:'0 auto' }}>
              Everything you need to pass your TESDA assessment — in one app, on your phone, in English or Filipino. No review center. No scattered photocopied modules. Just complete, organized, always-updated reviewers.
            </p>
          </div>

          {/* How TESDA works differently */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:16, marginBottom:36 }}>
            {[
              { icon:'📖', title:'Full HTML Reviewers', desc:'Structured, complete content for every core competency. Read it like a book — beautifully formatted on any screen.' },
              { icon:'🎬', title:'Video Lessons', desc:'YouTube video reviewers embedded directly in the app. No searching needed — everything in one place.' },
              { icon:'🖼', title:'Infographics', desc:'Visual summaries of key topics so you can review faster and retain more before assessment day.' },
              { icon:'🌐', title:'English & Filipino', desc:'Switch between English and Filipino versions of the reviewer with one tap — your choice, anytime.' },
              { icon:'🖨', title:'Print for Offline Study', desc:'Print your reviewer as a PDF and study anywhere — even without internet connection.' },
              { icon:'🔄', title:'Always Updated', desc:'We upload new resources and qualifications regularly. Buy once and get everything new automatically.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} style={{ background:'var(--bg-surface)', border:'1px solid rgba(59,130,246,0.15)', borderRadius:14, padding:'18px 16px' }}>
                <div style={{ fontSize:24, marginBottom:8 }}>{icon}</div>
                <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)', marginBottom:6 }}>{title}</div>
                <div style={{ fontSize:12, color:'var(--text-secondary)', lineHeight:1.6 }}>{desc}</div>
              </div>
            ))}
          </div>

          {/* Who this is for */}
          <div style={{ background:'rgba(59,130,246,0.06)', border:'1px solid rgba(59,130,246,0.2)', borderRadius:14, padding:'20px 24px', marginBottom:24 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#3b82f6', marginBottom:12 }}>🎯 Who is this for?</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:8 }}>
              {[
                'Cookery NC II candidates',
                'Housekeeping NC II candidates',
                'Beauty Care NC II candidates',
                'Welding NC II candidates',
                'Food & Beverage NC II candidates',
                'Masonry NC II candidates',
                'OFW applicants needing TESDA cert',
                'Anyone preparing for NC II assessment',
              ].map(w => (
                <div key={w} style={{ fontSize:12, color:'var(--text-secondary)', display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ color:'#3b82f6', fontWeight:700 }}>→</span> {w}
                </div>
              ))}
            </div>
          </div>

          <div style={{ textAlign:'center' }}>
            <button style={{ ...s.btnPrimary, background:'#3b82f6', fontSize:16, padding:'14px 32px' }}
              onClick={() => onGetAccess('TESDA')}>
              Get TESDA Bundle — ₱99 Only →
            </button>
            <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:8 }}>One-time · Lifetime access · All qualifications included</div>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" style={s.section}>
        <div style={s.container}>
          <div style={{ textAlign:'center', marginBottom:32 }}>
            <h2 style={s.sectionTitle}>Frequently Asked Questions</h2>
            <p style={s.sectionSub}>Everything you need to know before buying.</p>
          </div>
          <div style={{ maxWidth:640, margin:'0 auto', display:'flex', flexDirection:'column', gap:12 }}>
            {[
              { q:'Pwede ba ito gamitin sa phone?', a:'Oo — Readwise by Skai ay mobile-first. Dinisenyo ito para sa mga nagaaral sa kanilang phone, kahit nasa commute, break time, o gabi bago matulog.' },
              { q:'Kailangan ba ng internet?', a:'Kailangan ng internet para buksan ang app at i-load ang reviewers. Pero pwede mong i-print ang HTML reviewer para mag-aral offline.' },
              { q:'Isang beses lang babayaran?', a:'Oo. Isang beses lang — walang monthly fee, walang subscription. Bayad mo ngayon, lifetime na access mo.' },
              { q:'Kasama ba lahat ng NC II qualifications?', a:'Ang kasalukuyang available: Cookery, Housekeeping, Beauty Care, Shielded Metal Arc Welding, Food and Beverage Services, at Masonry. Patuloy kaming nag-a-upload ng bagong qualifications. Lahat ng darating — kasama na sa iyong ₱99.' },
              { q:'Paano kung hindi pa available ang qualification ko?', a:'Mag-follow sa aming Facebook at YouTube para sa updates. Regular kaming naglalabas ng bagong qualifications. Ang iyong access ay valid habambuhay — kasama lahat ng magiging available.' },
              { q:'Paano ako makakapag-access pagkatapos bumili?', a:'Pagkabayad mo sa PayMongo, matatanggap mo ang confirmation sa email mo. Buksan ang readwisebyskai.com, i-enter ang iyong email, at mag-aral na agad.' },
              { q:'May Filipino version ba?', a:'Oo — ang bawat reviewer ay may English at Filipino toggle. I-tap lang ang FIL button para lumipat sa Filipino version.' },
              { q:'Pwede ba itong i-print?', a:'Oo — may Print button sa loob ng bawat reviewer. I-print mo bilang PDF para mag-aral kahit walang internet.' },
              { q:'Paano makipag-ugnayan sa inyo?', a:'Bisitahin kami sa readwisebyskai.com, i-message kami sa Facebook (facebook.com/readwisebyskai), o manood sa YouTube (youtube.com/@readwisebyskai). Palagi kaming nandito para tulungan kayo.' },
            ].map(({ q, a }, i) => (
              <FaqItem key={i} q={q} a={a} />
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{ ...s.section, textAlign:'center' }}>
        <div style={s.container}>
          <h2 style={{ ...s.sectionTitle, maxWidth:600, margin:'0 auto 16px' }}>
            Hindi mo na kailangan mag-isa.<br/>
            <em style={{ fontStyle:'italic', color:'#3b82f6' }}>Handa ka na para sa TESDA assessment mo.</em>
          </h2>
          <p style={{ ...s.sectionSub, margin:'0 auto 36px' }}>
            Sumali sa mga estudyante na nag-aaral nang mas matalino — ₱99 lang, lifetime access, lahat ng qualifications.
          </p>
          <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
            <button style={{ ...s.btnPrimary, background:'#3b82f6' }} onClick={() => onGetAccess('TESDA')}>Get TESDA Bundle · ₱99 →</button>
            <a href="https://www.youtube.com/@readwisebyskai" target="_blank" rel="noopener noreferrer" style={{ ...s.btnGhost, textDecoration:'none', display:'inline-block' }}>Watch Preview First →</a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={s.footer}>
        <div style={s.footerBrand}>Readwise by Skai</div>
        <div style={s.footerSub}>TESDA NC II Reviewer Hub · Philippines</div>
        <div style={s.footerLinks}>
          {['How it works','Available','Pricing','FAQ'].map(l => (
            <a key={l} href={l === 'How it works' ? '#how' : l === 'Available' ? '#available' : `#${l.toLowerCase()}`} style={s.footerLink}>{l}</a>
          ))}
          <a href="/" style={s.footerLink}>LET Board Exam →</a>
          <a href="/privacy" style={s.footerLink}>Privacy Policy</a>
          <button style={{ ...s.footerLink, background:'none', border:'none', cursor:'pointer' }} onClick={onSignIn}>Sign In</button>
          <button style={{ ...s.footerLink, background:'none', border:'none', cursor:'pointer' }} onClick={() => onGetAccess('TESDA')}>Buy Access</button>
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
