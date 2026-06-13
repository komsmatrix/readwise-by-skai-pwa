import { useState, useEffect } from 'react'
import { getCustomer, getStudentExam } from './lib/supabase.js'
import ActivationScreen from './screens/ActivationScreen.jsx'
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

// Apply saved theme on startup
const savedTheme = localStorage.getItem('rbs_theme') || 'dark'
if (savedTheme !== 'dark') {
  document.documentElement.setAttribute('data-theme', savedTheme)
}

export default function App() {
  const [screen,      setScreen]      = useState('loading')
  const [customer,    setCustomer]    = useState(null)
  const [studentExam, setStudentExam] = useState(null)
  const [activeTab,   setActiveTab]   = useState('home')
  const [selectedCourse, setSelectedCourse] = useState('LET')

  useEffect(() => { init() }, [])

  async function init() {
    if (window.location.pathname === '/owner') {
      const ownerPass = sessionStorage.getItem('owner_auth')
      setScreen(ownerPass ? 'owner' : 'owner_login')
      return
    }
    if (window.location.pathname === '/buy') {
      setScreen('buy')
      return
    }
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
    setScreen('activation')
  }

  async function handleActivated(result) {
    const cust = {
      id           : result.customerId,
      name         : result.name,
      email        : result.email,
      is_active    : true,
      referral_code: result.referral_code || null,
    }
    setCustomer(cust)
    localStorage.setItem('rbs_session', JSON.stringify({
      customerId: result.customerId,
      email     : result.email,
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
    setCustomer(null)
    setStudentExam(null)
    setActiveTab('home')
    setScreen('activation')
  }

  // Always check loading/owner/buy first
  if (screen === 'owner' || screen === 'owner_login') {
    return <OwnerDashboard isLoggedIn={screen === 'owner'} onLogin={() => setScreen('owner')} />
  }
  if (screen === 'buy')     return <BuyScreen />
  if (screen === 'loading') return <LoadingScreen />

  // Landing page — show to non-logged-in visitors
  if (screen === 'activation' || !customer) {
    if (screen === 'activation_form') {
      return <ActivationScreen onActivated={handleActivated} />
    }
    return (
      <LandingScreen
        onGetAccess={(course) => {
          setSelectedCourse(course)
          window.location.href = `/buy?course=${course}`
        }}
        onTryFree={(course) => {
          setSelectedCourse(course)
          setScreen('activation_form')
        }}
        onSignIn={() => setScreen('activation_form')}
      />
    )
  }

  // Onboarding — customer exists but no exam enrolled
  if (screen === 'onboarding') {
    return (
      <OnboardingScreen
        customer={customer}
        onEnrolled={handleEnrolled}
      />
    )
  }

  // Main app
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)' }}>
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'home' && (
          <HomeScreen
            customer={customer}
            studentExam={studentExam}
            onStartStudy={() => setActiveTab('study')}
            onViewTopics={() => setActiveTab('topics')}
          />
        )}
        {activeTab === 'study' && (
          <StudyScreen
            customer={customer}
            studentExam={studentExam}
            onDone={() => setActiveTab('home')}
          />
        )}
        {activeTab === 'topics' && (
          <TopicsScreen
            customer={customer}
            studentExam={studentExam}
          />
        )}
        {activeTab === 'lessons' && (
          <LessonScreen
            session={{ customerId: customer.id }}
            onBack={() => setActiveTab('home')}
          />
        )}
        {activeTab === 'profile' && (
          <ProfileScreen
            customer={customer}
            studentExam={studentExam}
            onSignOut={handleSignOut}
            onExamUpdated={setStudentExam}
          />
        )}
      </div>
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  )
}

function BottomNav({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'home',    label: 'Home',    icon: HomeIcon   },
    { id: 'study',   label: 'Study',   icon: CardsIcon  },
    { id: 'lessons', label: 'Lessons', icon: BookIcon   },
    { id: 'topics',  label: 'Topics',  icon: ChartIcon  },
    { id: 'profile', label: 'Profile', icon: PersonIcon },
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
      <circle cx="12" cy="8" r="4"/>
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    </svg>
  )
}
