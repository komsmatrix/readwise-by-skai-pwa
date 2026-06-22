import { useState, useEffect } from 'react'
import { getCustomer, getStudentExam } from './lib/supabase.js'
import ActivationScreen  from './screens/ActivationScreen.jsx'
import OnboardingScreen  from './screens/OnboardingScreen.jsx'
import HomeScreen        from './screens/HomeScreen.jsx'
import StudyScreen       from './screens/StudyScreen.jsx'
import TopicsScreen      from './screens/TopicsScreen.jsx'
import ProfileScreen     from './screens/ProfileScreen.jsx'
import LessonScreen      from './screens/LessonScreen.jsx'
import OwnerDashboard    from './screens/OwnerDashboard.jsx'
import BuyScreen         from './screens/BuyScreen.jsx'
import LoadingScreen     from './screens/LoadingScreen.jsx'
import LandingScreen     from './screens/LandingScreen.jsx'
import TrialScreen       from './screens/TrialScreen.jsx'
import TrialExpiredScreen from './screens/TrialExpiredScreen.jsx'
import TrialTimer        from './components/TrialTimer.jsx'
import MockBoardScreen   from './screens/MockBoardScreen.jsx'
import TesdaHubScreen    from './screens/TesdaHubScreen.jsx'
import TesdaViewerScreen from './screens/TesdaViewerScreen.jsx'

// Apply saved theme on startup
const savedTheme = localStorage.getItem('rbs_theme') || 'dark'
if (savedTheme !== 'dark') {
  document.documentElement.setAttribute('data-theme', savedTheme)
}

// ─── Trial helpers ────────────────────────────────────────────────────────────
function getSavedTrial() {
  try {
    const raw = localStorage.getItem('trial_session')
    if (!raw) return null
    const t = JSON.parse(raw)
    // If already expired, don't restore it as an active trial
    if (new Date(t.expires_at).getTime() < Date.now()) return { ...t, expired: true }
    return t
  } catch {
    return null
  }
}
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  const [screen,        setScreen]        = useState('loading')
  const [customer,      setCustomer]      = useState(null)
  const [studentExam,   setStudentExam]   = useState(null)
  const [activeTab,     setActiveTab]     = useState('home')
  const [selectedCourse, setSelectedCourse] = useState('LET')
  const [trialData,     setTrialData]     = useState(null)
  const [trialExpired,  setTrialExpired]  = useState(false)
  const [tesdaViewer,   setTesdaViewer]   = useState(null)  // { subtopic, qualification }

  useEffect(() => { init() }, [])

  async function init() {
    // Owner / buy routes — unchanged
    if (window.location.pathname === '/owner') {
      const ownerPass = sessionStorage.getItem('owner_auth')
      setScreen(ownerPass ? 'owner' : 'owner_login')
      return
    }
    if (window.location.pathname === '/buy') {
      setScreen('buy')
      return
    }

    // ── Paid session ──────────────────────────────────────────────────────────
    const savedSession = localStorage.getItem('rbs_session')
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession)
        if (session.email && session.customerId) {
          const { customer: cust } = await getCustomer(session.email)
          if (cust && cust.is_active) {
            setCustomer(cust)
            const enrollment = await getStudentExam(cust.id)
            setStudentExam(enrollment)
            setScreen(enrollment ? 'app' : 'onboarding')
            return
          }
        }
      } catch {}
      localStorage.removeItem('rbs_session')
    }

    // ── Trial session ─────────────────────────────────────────────────────────
    const savedTrial = getSavedTrial()
    if (savedTrial) {
      if (savedTrial.expired) {
        // Trial ran out — show paywall immediately
        setTrialData(savedTrial)
        setTrialExpired(true)
        setScreen('trial_expired')
        return
      }
      // Active trial — drop straight into app
      setTrialData(savedTrial)
      setScreen('app')
      return
    }

    // ── No session → landing ──────────────────────────────────────────────────
    setScreen('activation')
  }

  // ── Handlers ─────────────────────────────────────────────────────────────────

  async function handleActivated(result) {
    const cust = {
      id:            result.customerId,
      name:          result.name,
      email:         result.email,
      is_active:     true,
      referral_code: result.referral_code || null,
    }
    setCustomer(cust)
    // Clear any leftover trial data when a real account activates
    localStorage.removeItem('trial_session')
    setTrialData(null)
    localStorage.setItem('rbs_session', JSON.stringify({
      customerId: result.customerId,
      email:      result.email,
    }))
    const enrollment = await getStudentExam(result.customerId)
    setStudentExam(enrollment)
    setScreen(enrollment ? 'app' : 'onboarding')
  }

  function handleEnrolled(enrollment) {
    setStudentExam(enrollment)
    setScreen('app')
  }

  function handleSignOut() {
    localStorage.removeItem('rbs_session')
    localStorage.removeItem('trial_session')
    setCustomer(null)
    setStudentExam(null)
    setTrialData(null)
    setTrialExpired(false)
    setActiveTab('home')
    setScreen('activation')
  }

  // Called by TrialScreen when the student submits name + email
  function handleTrialStart(trial) {
    setTrialData(trial)
    setTrialExpired(false)
    setScreen('app')
  }

  // Called by TrialTimer when the countdown hits 0
  function handleTrialExpire() {
    setTrialExpired(true)
    setScreen('trial_expired')
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  // Owner / system screens
  if (screen === 'owner' || screen === 'owner_login') {
    return <OwnerDashboard isLoggedIn={screen === 'owner'} onLogin={() => setScreen('owner')} />
  }
  if (screen === 'buy')     return <BuyScreen />
  if (screen === 'loading') return <LoadingScreen />

  // Trial expired paywall
  if (screen === 'trial_expired') {
    return <TrialExpiredScreen trialData={trialData} readinessScore={null} />
  }

  // Trial signup screen
  if (screen === 'trial') {
    return <TrialScreen onTrialStart={handleTrialStart} />
  }

  // Landing / activation
  if (screen === 'activation' || (!customer && !trialData)) {
    if (screen === 'activation_form') {
      return <ActivationScreen onActivated={handleActivated} onBack={() => setScreen('activation')} />
    }
    return (
      <LandingScreen
        onGetAccess={(course) => {
          setSelectedCourse(course)
          window.location.href = `/buy?course=${course}`
        }}
        onTryFree={(course) => {
          setSelectedCourse(course)
          setScreen('trial')          // ← now goes to TrialScreen, not activation
        }}
        onSignIn={() => setScreen('activation_form')}
      />
    )
  }

  // Onboarding — paid customer, no exam yet
  if (screen === 'onboarding') {
    return (
      <OnboardingScreen
        customer={customer}
        onEnrolled={handleEnrolled}
      />
    )
  }

  // ── Main app (paid OR trial) ──────────────────────────────────────────────────
  // Build a unified "session user" so child screens don't need to care
  const sessionUser = customer || {
    id:            trialData?.id,
    name:          trialData?.name,
    email:         trialData?.email,
    is_active:     true,
    is_trial:      true,
    course_id:     trialData?.course_id,
  }

  // Determine if this is a TESDA-only student
  // (has TESDA in courses array but no board exam enrollment)
  const hasTesda  = sessionUser?.courses?.includes('TESDA')
  const hasBoard  = sessionUser?.courses?.some(c => c !== 'TESDA') || studentExam
  const isTesdaOnly = hasTesda && !hasBoard

  // TESDA viewer open
  if (tesdaViewer) {
    return (
      <TesdaViewerScreen
        subtopic={tesdaViewer.subtopic}
        qualification={tesdaViewer.qualification}
        onBack={() => setTesdaViewer(null)}
      />
    )
  }

  // TESDA-only students go to TESDA hub, not board exam app
  if (isTesdaOnly) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)' }}>
        <TesdaHubScreen
          customer={sessionUser}
          onOpenViewer={(subtopic, qualification) => setTesdaViewer({ subtopic, qualification })}
        />
      </div>
    )
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)' }}>
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'home' && (
          <HomeScreen
            customer={sessionUser}
            studentExam={studentExam}
            onStartStudy={() => setActiveTab('study')}
            onViewTopics={() => setActiveTab('learn')}
          />
        )}
        {activeTab === 'study' && (
          <StudyTab
            customer={sessionUser}
            studentExam={studentExam}
            onDone={() => setActiveTab('home')}
          />
        )}
        {activeTab === 'learn' && (
          <LearnTab
            customer={sessionUser}
            studentExam={studentExam}
            onBack={() => setActiveTab('home')}
          />
        )}
        {activeTab === 'tesda' && (
          <TesdaHubScreen
            customer={sessionUser}
            onOpenViewer={(subtopic, qualification) => setTesdaViewer({ subtopic, qualification })}
          />
        )}
        {activeTab === 'profile' && (
          <ProfileScreen
            customer={sessionUser}
            studentExam={studentExam}
            onSignOut={handleSignOut}
            onExamUpdated={setStudentExam}
          />
        )}
      </div>

      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        showTesda={hasTesda}
      />

      {trialData && !trialExpired && (
        <TrialTimer
          expiresAt={trialData.expires_at}
          onExpire={handleTrialExpire}
        />
      )}
    </div>
  )
}


// ── Study Tab — toggles between Practice and Mock Board ──────────────────────
function StudyTab({ customer, studentExam, onDone }) {
  const [mode, setMode] = useState('practice') // 'practice' | 'mock'

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Toggle */}
      <div style={{ display: 'flex', gap: 4, padding: '12px 16px 0', background: 'var(--bg-base)', flexShrink: 0 }}>
        <button
          onClick={() => setMode('practice')}
          style={{
            flex: 1, padding: '9px 8px', border: 'none', borderRadius: 10, fontSize: 13,
            fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
            background: mode === 'practice' ? 'var(--accent)' : 'var(--bg-elevated)',
            color: mode === 'practice' ? '#0d0d0d' : 'var(--text-muted)',
          }}>
          ⚡ Practice
        </button>
        <button
          onClick={() => setMode('mock')}
          style={{
            flex: 1, padding: '9px 8px', border: 'none', borderRadius: 10, fontSize: 13,
            fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
            background: mode === 'mock' ? 'var(--accent)' : 'var(--bg-elevated)',
            color: mode === 'mock' ? '#0d0d0d' : 'var(--text-muted)',
          }}>
          📋 Mock Board
        </button>
      </div>
      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {mode === 'practice' && (
          <StudyScreen
            customer={customer}
            studentExam={studentExam}
            onDone={onDone}
          />
        )}
        {mode === 'mock' && (
          <MockBoardScreen
            customer={customer}
            studentExam={studentExam}
            onDone={onDone}
          />
        )}
      </div>
    </div>
  )
}

// ── Learn Tab — toggles between Lessons and Topics ───────────────────────────
function LearnTab({ customer, studentExam, onBack }) {
  const [mode, setMode] = useState('lessons') // 'lessons' | 'topics'

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Toggle */}
      <div style={{ display: 'flex', gap: 4, padding: '12px 16px 0', background: 'var(--bg-base)', flexShrink: 0 }}>
        <button
          onClick={() => setMode('lessons')}
          style={{
            flex: 1, padding: '9px 8px', border: 'none', borderRadius: 10, fontSize: 13,
            fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
            background: mode === 'lessons' ? 'var(--accent)' : 'var(--bg-elevated)',
            color: mode === 'lessons' ? '#0d0d0d' : 'var(--text-muted)',
          }}>
          📚 Lessons
        </button>
        <button
          onClick={() => setMode('topics')}
          style={{
            flex: 1, padding: '9px 8px', border: 'none', borderRadius: 10, fontSize: 13,
            fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
            background: mode === 'topics' ? 'var(--accent)' : 'var(--bg-elevated)',
            color: mode === 'topics' ? '#0d0d0d' : 'var(--text-muted)',
          }}>
          📊 Topics
        </button>
      </div>
      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {mode === 'lessons' && (
          <LessonScreen
            session={{ customerId: customer?.id }}
            onBack={onBack}
          />
        )}
        {mode === 'topics' && (
          <TopicsScreen
            customer={customer}
            studentExam={studentExam}
          />
        )}
      </div>
    </div>
  )
}

function BottomNav({ activeTab, setActiveTab, showTesda }) {
  const tabs = [
    { id: 'home',    label: 'Home',     icon: HomeIcon   },
    { id: 'study',   label: 'Study',    icon: CardsIcon  },
    { id: 'learn',   label: 'Learn',    icon: BookIcon   },
    ...(showTesda ? [{ id: 'tesda', label: 'TESDA', icon: TesdaIcon }] : []),
    { id: 'profile', label: 'Settings', icon: PersonIcon },
  ]
  return (
    <nav style={{ display: 'flex', justifyContent: 'space-around', padding: '10px 0 14px', background: 'var(--bg-surface)', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer', color: activeTab === t.id ? 'var(--accent)' : 'var(--text-muted)', fontSize: 10, fontFamily: 'inherit', padding: '0 12px', transition: 'color 0.15s' }}>
          <t.icon size={22} active={activeTab === t.id} />
          {t.label}
        </button>
      ))}
    </nav>
  )
}

function HomeIcon({ size, active }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/>
      <path d="M9 21V12h6v9"/>
    </svg>
  )
}
function CardsIcon({ size, active }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="14" rx="2"/>
      <path d="M6 6V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2"/>
      <line x1="12" y1="11" x2="12" y2="17"/>
      <line x1="9" y1="14" x2="15" y2="14"/>
    </svg>
  )
}
function BookIcon({ size, active }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  )
}
function ChartIcon({ size, active }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6"  y1="20" x2="6"  y2="14"/>
    </svg>
  )
}
function MockIcon({ size, active }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
      <rect x="9" y="3" width="6" height="4" rx="1"/>
      <path d="M9 12h6M9 16h4"/>
    </svg>
  )
}
function TesdaIcon({ size, active }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z"/>
      <path d="M2 17l10 5 10-5"/>
      <path d="M2 12l10 5 10-5"/>
    </svg>
  )
}
function PersonIcon({ size, active }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
    </svg>
  )
}
