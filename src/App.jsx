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
  const [trialData,     setTrialData]     = useState(null)   // active trial session
  const [trialExpired,  setTrialExpired]  = useState(false)  // show expired paywall

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

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)' }}>
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'home' && (
          <HomeScreen
            customer={sessionUser}
            studentExam={studentExam}
            onStartStudy={() => setActiveTab('study')}
            onViewTopics={() => setActiveTab('topics')}
          />
        )}
        {activeTab === 'study' && (
          <StudyScreen
            customer={sessionUser}
            studentExam={studentExam}
            onDone={() => setActiveTab('home')}
          />
        )}
        {activeTab === 'topics' && (
          <TopicsScreen
            customer={sessionUser}
            studentExam={studentExam}
          />
        )}
        {activeTab === 'lessons' && (
          <LessonScreen
            session={{ customerId: sessionUser.id }}
            onBack={() => setActiveTab('home')}
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

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Trial countdown — only shown during active trial */}
      {trialData && !trialExpired && (
        <TrialTimer
          expiresAt={trialData.expires_at}
          onExpire={handleTrialExpire}
        />
      )}
    </div>
  )
}

function BottomNav({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'home',    label: 'Home',    icon: HomeIcon   },
    { id: 'study',   label: 'Practice', icon: CardsIcon  },
    { id: 'lessons', label: 'Lessons', icon: BookIcon   },
    { id: 'topics',  label: 'Topics',  icon: ChartIcon  },
    { id: 'profile', label: 'Settings', icon: PersonIcon },
  ]
  return (
    <nav style={{ display: 'flex', justifyContent: 'space-around', padding: '10px 0 14px', background: 'var(--bg-surface)', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer', color: activeTab === t.id ? 'var(--accent)' : 'var(--text-muted)', fontSize: 10, fontFamily: 'inherit', padding: '0 16px', transition: 'color 0.15s' }}>
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
function PersonIcon({ size, active }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
    </svg>
  )
}
