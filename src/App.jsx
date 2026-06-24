import { useState, useEffect } from 'react'
import { getCustomer, getStudentExam, createSession, validateSession, updateLastSeen } from './lib/supabase.js'
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
import CourseHubScreen   from './screens/CourseHubScreen.jsx'
import TermsScreen       from './screens/TermsScreen.jsx'
import PrivacyScreen     from './screens/PrivacyScreen.jsx'

const savedTheme = localStorage.getItem('rbs_theme') || 'dark'
if (savedTheme !== 'dark') {
  document.documentElement.setAttribute('data-theme', savedTheme)
}

function getSavedTrial() {
  try {
    const raw = localStorage.getItem('trial_session')
    if (!raw) return null
    const t = JSON.parse(raw)
    if (new Date(t.expires_at).getTime() < Date.now()) return { ...t, expired: true }
    return t
  } catch {
    return null
  }
}

export default function App() {
  const [screen,         setScreen]         = useState('loading')
  const [customer,       setCustomer]       = useState(null)
  const [studentExam,    setStudentExam]    = useState(null)
  const [activeTab,      setActiveTab]      = useState('home')
  const [selectedCourse, setSelectedCourse] = useState('LET')
  const [activeCourse,   setActiveCourse]   = useState(null)
  const [trialData,      setTrialData]      = useState(null)
  const [trialExpired,   setTrialExpired]   = useState(false)
  const [tesdaViewer,    setTesdaViewer]    = useState(null)

  useEffect(() => { init() }, [])

  async function init() {
    if (window.location.pathname === '/owner') {
      const ownerPass = sessionStorage.getItem('owner_auth')
      setScreen(ownerPass ? 'owner' : 'owner_login')
      return
    }
    if (window.location.pathname === '/buy')     { setScreen('buy');     return }
    if (window.location.pathname === '/terms')   { setScreen('terms');   return }
    if (window.location.pathname === '/privacy') { setScreen('privacy'); return }

    const savedSession = localStorage.getItem('rbs_session')
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession)
        if (session.email && session.customerId) {
          const { customer: cust } = await getCustomer(session.email)
          if (cust && cust.is_active) {
            // Validate session token — check if this device still owns the session
            const { valid, reason } = await validateSession(cust.id)
            if (!valid) {
              localStorage.removeItem('rbs_session')
              localStorage.removeItem('rbs_session_token')
              if (reason === 'session_expired') {
                setScreen('activation')
                // Show kicked message via URL param
                window.history.replaceState({}, '', '?kicked=1')
                return
              }
              setScreen('activation')
              return
            }
            // Update last seen
            updateLastSeen(cust.id)
            setCustomer(cust)
            const enrollment = await getStudentExam(cust.id)
            setStudentExam(enrollment)
            setActiveCourse(null)
            setScreen('hub')
            return
          }
        }
      } catch {}
      localStorage.removeItem('rbs_session')
      localStorage.removeItem('rbs_session_token')
    }

    const savedTrial = getSavedTrial()
    if (savedTrial) {
      if (savedTrial.expired) {
        setTrialData(savedTrial)
        setTrialExpired(true)
        setScreen('trial_expired')
        return
      }
      setTrialData(savedTrial)
      setScreen('app')
      return
    }

    setScreen('activation')
  }

  async function handleActivated(result) {
    const cust = {
      id:            result.customerId,
      name:          result.name,
      email:         result.email,
      is_active:     true,
      referral_code: result.referral_code || null,
      courses:       result.courses || ['LET'],
    }
    setCustomer(cust)
    localStorage.removeItem('trial_session')
    setTrialData(null)
    localStorage.setItem('rbs_session', JSON.stringify({
      customerId: result.customerId,
      email:      result.email,
    }))
    // Create session token for this device
    await createSession(result.customerId)
    const enrollment = await getStudentExam(result.customerId)
    setStudentExam(enrollment)
    setActiveCourse(null)
    setScreen('hub')
  }

  function handleEnrolled(enrollment) {
    setStudentExam(enrollment)
    setScreen('app')
  }

  function handleSignOut() {
    localStorage.removeItem('rbs_session')
    localStorage.removeItem('rbs_session_token')
    localStorage.removeItem('trial_session')
    setCustomer(null)
    setStudentExam(null)
    setTrialData(null)
    setTrialExpired(false)
    setActiveTab('home')
    setScreen('activation')
  }

  function handleTrialStart(trial) {
    setTrialData(trial)
    setTrialExpired(false)
    setScreen('app')
  }

  function handleTrialExpire() {
    setTrialExpired(true)
    setScreen('trial_expired')
  }

  function handleCourseSelect(courseId) {
    if (courseId === '__signout__') { handleSignOut(); return }
    setActiveCourse(courseId)
    setActiveTab('home')
    if (courseId === 'TESDA') {
      setTesdaViewer(null)
      setScreen('tesda')
    } else {
      setScreen(studentExam ? 'app' : 'onboarding')
    }
  }

  if (screen === 'owner' || screen === 'owner_login') {
    return <OwnerDashboard isLoggedIn={screen === 'owner'} onLogin={() => setScreen('owner')} />
  }
  if (screen === 'buy')     return <BuyScreen />
  if (screen === 'terms')   return <TermsScreen />
  if (screen === 'privacy') return <PrivacyScreen />
  if (screen === 'loading') return <LoadingScreen />

  if (screen === 'trial_expired') {
    return <TrialExpiredScreen trialData={trialData} readinessScore={null} />
  }

  if (screen === 'trial') {
    return <TrialScreen onTrialStart={handleTrialStart} onBack={() => setScreen('activation')} />
  }

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
          setScreen('trial')
        }}
        onSignIn={() => setScreen('activation_form')}
      />
    )
  }

  if (screen === 'hub' && customer) {
    return (
      <CourseHubScreen
        customer={customer}
        onSelectCourse={handleCourseSelect}
      />
    )
  }

  if (screen === 'onboarding') {
    return (
      <OnboardingScreen
        customer={customer}
        onEnrolled={handleEnrolled}
      />
    )
  }

  if (screen === 'tesda' && customer) {
    if (tesdaViewer) {
      return (
        <TesdaViewerScreen
          subtopic={tesdaViewer.subtopic}
          qualification={tesdaViewer.qualification}
          onBack={() => setTesdaViewer(null)}
        />
      )
    }
    return (
      <div style={{ height:'100%', display:'flex', flexDirection:'column', background:'var(--bg-base)' }}>
        <TesdaHubScreen
          customer={customer}
          onOpenViewer={(subtopic, qualification) => setTesdaViewer({ subtopic, qualification })}
          onBack={() => setScreen('hub')}
        />
      </div>
    )
  }

  const sessionUser = customer || {
    id:        trialData?.id,
    name:      trialData?.name,
    email:     trialData?.email,
    is_active: true,
    is_trial:  true,
    course_id: trialData?.course_id,
  }

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', background:'var(--bg-base)' }}>
      <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
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
        {activeTab === 'profile' && (
          <ProfileScreen
            customer={sessionUser}
            studentExam={studentExam}
            onSignOut={handleSignOut}
            onExamUpdated={setStudentExam}
            onSwitchCourse={() => setScreen('hub')}
          />
        )}
      </div>

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {trialData && !trialExpired && (
        <TrialTimer
          expiresAt={trialData.expires_at}
          onExpire={handleTrialExpire}
        />
      )}
    </div>
  )
}

function StudyTab({ customer, studentExam, onDone }) {
  const [mode, setMode] = useState('practice')

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <div style={{ display:'flex', gap:4, padding:'12px 16px 0', background:'var(--bg-base)', flexShrink:0 }}>
        <button onClick={() => setMode('practice')} style={{ flex:1, padding:'9px 8px', border:'none', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s', background: mode === 'practice' ? 'var(--accent)' : 'var(--bg-elevated)', color: mode === 'practice' ? '#0d0d0d' : 'var(--text-muted)' }}>
          ⚡ Practice
        </button>
        <button onClick={() => setMode('mock')} style={{ flex:1, padding:'9px 8px', border:'none', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s', background: mode === 'mock' ? 'var(--accent)' : 'var(--bg-elevated)', color: mode === 'mock' ? '#0d0d0d' : 'var(--text-muted)' }}>
          📋 Mock Board
        </button>
      </div>
      <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
        {mode === 'practice' && <StudyScreen customer={customer} studentExam={studentExam} onDone={onDone} />}
        {mode === 'mock'     && <MockBoardScreen customer={customer} studentExam={studentExam} onDone={onDone} />}
      </div>
    </div>
  )
}

function LearnTab({ customer, studentExam, onBack }) {
  const [mode, setMode] = useState('lessons')

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <div style={{ display:'flex', gap:4, padding:'12px 16px 0', background:'var(--bg-base)', flexShrink:0 }}>
        <button onClick={() => setMode('lessons')} style={{ flex:1, padding:'9px 8px', border:'none', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s', background: mode === 'lessons' ? 'var(--accent)' : 'var(--bg-elevated)', color: mode === 'lessons' ? '#0d0d0d' : 'var(--text-muted)' }}>
          📚 Lessons
        </button>
        <button onClick={() => setMode('topics')} style={{ flex:1, padding:'9px 8px', border:'none', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s', background: mode === 'topics' ? 'var(--accent)' : 'var(--bg-elevated)', color: mode === 'topics' ? '#0d0d0d' : 'var(--text-muted)' }}>
          📊 Topics
        </button>
      </div>
      <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
        {mode === 'lessons' && <LessonScreen session={{ customerId: customer?.id }} onBack={onBack} />}
        {mode === 'topics'  && <TopicsScreen customer={customer} studentExam={studentExam} />}
      </div>
    </div>
  )
}

function BottomNav({ activeTab, setActiveTab }) {
  const tabs = [
    { id:'home',    label:'Home',     icon:HomeIcon   },
    { id:'study',   label:'Study',    icon:CardsIcon  },
    { id:'learn',   label:'Learn',    icon:BookIcon   },
    { id:'profile', label:'Settings', icon:PersonIcon },
  ]
  return (
    <nav style={{ display:'flex', justifyContent:'space-around', padding:'10px 0 14px', background:'var(--bg-surface)', borderTop:'1px solid var(--border)', flexShrink:0 }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, background:'none', border:'none', cursor:'pointer', color: activeTab === t.id ? 'var(--accent)' : 'var(--text-muted)', fontSize:10, fontFamily:'inherit', padding:'0 16px', transition:'color 0.15s' }}>
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
function PersonIcon({ size, active }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
    </svg>
  )
}
