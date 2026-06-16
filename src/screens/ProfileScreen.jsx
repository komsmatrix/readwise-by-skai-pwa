import { useState } from 'react'
import { updateStudyMode } from '../lib/supabase.js'

const MODE_OPTIONS = ['Light', 'Standard', 'Intensive', 'Exam Sprint']

const MILESTONES = [
  { id: 'first_step',    icon: '▶', name: 'First Step',       sub: 'Complete first session',  trigger: 'sessions',  threshold: 1   },
  { id: 'centurion',     icon: '💯', name: 'Centurion',        sub: '100 questions answered',  trigger: 'reviews',   threshold: 100 },
  { id: 'thousandaire',  icon: '📚', name: 'Thousandaire',     sub: '1,000 questions answered',trigger: 'reviews',   threshold: 1000},
  { id: 'week_warrior',  icon: '🔥', name: 'Week Warrior',     sub: '7-day streak',            trigger: 'streak',    threshold: 7   },
  { id: 'month_strong',  icon: '⚡', name: 'Month Strong',     sub: '30-day streak',           trigger: 'streak',    threshold: 30  },
  { id: 'halfway',       icon: '⭐', name: 'Halfway There',    sub: 'Reach 50% readiness',     trigger: 'readiness', threshold: 50  },
  { id: 'almost_ready',  icon: '🏆', name: 'Almost Ready',     sub: 'Reach 70% readiness',     trigger: 'readiness', threshold: 70  },
  { id: 'board_ready',   icon: '🎓', name: 'Board Ready',      sub: 'Reach 85% readiness',     trigger: 'readiness', threshold: 85  },
  { id: 'mock_survivor', icon: '📝', name: 'Mock Survivor',    sub: 'Complete first mock board',trigger: 'mocks',    threshold: 1   },
]

export default function ProfileScreen({ customer, studentExam, onSignOut, onExamUpdated }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('rbs_theme') || 'dark')
  const [showFeedback,   setShowFeedback]   = useState(false)
  const [feedback,       setFeedback]       = useState('')
  const [feedbackType,   setFeedbackType]   = useState('feedback')
  const [feedbackStatus, setFeedbackStatus] = useState('idle')
  const [mode,       setMode]       = useState(studentExam?.study_mode || 'Standard')
  const [saving,     setSaving]     = useState(false)
  const [showSignOut,setShowSignOut]= useState(false)

  function applyTheme(t) {
    setTheme(t)
    localStorage.setItem('rbs_theme', t)
    document.documentElement.setAttribute('data-theme', t === 'dark' ? '' : t)
  }

  async function submitFeedback() {
    if (!feedback.trim()) return
    setFeedbackStatus('loading')
    try {
      await fetch('/api/send-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: customer?.name,
          email: customer?.email,
          message: feedback.trim(),
          type: feedbackType,
        }),
      })
      setFeedbackStatus('success')
      setFeedback('')
      setTimeout(() => { setFeedbackStatus('idle'); setShowFeedback(false) }, 2000)
    } catch {
      setFeedbackStatus('error')
    }
  }

  const initials = customer?.name
    ? customer.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  async function handleModeChange(newMode) {
    setMode(newMode)
    setSaving(true)
    await updateStudyMode(customer.id, newMode)
    if (onExamUpdated && studentExam) {
      onExamUpdated({ ...studentExam, study_mode: newMode })
    }
    setSaving(false)
  }

  return (
    <div style={s.root}>
      <div style={s.scroll}>

        {/* Avatar */}
        <div style={s.hero}>
          <div style={s.avatar}>{initials}</div>
          <div style={s.name}>{customer?.name || 'Student'}</div>
          <div style={s.meta}>
            {studentExam?.exam_id && <span style={s.metaBadge}>{studentExam.exam_id}</span>}
            {studentExam?.study_mode && <span style={s.metaBadge}>{studentExam.study_mode} mode</span>}
          </div>
        </div>

        {/* Milestones */}
        <div style={s.sectionLabel}>Milestones</div>
        <div style={s.milestonesGrid}>
          {MILESTONES.map(m => {
            // For now all locked except first_step if they have a session
            const unlocked = false
            return (
              <div key={m.id} style={{ ...s.milestone, opacity: unlocked ? 1 : 0.35 }}>
                <span style={{ fontSize: 20 }}>{m.icon}</span>
                <div>
                  <div style={s.milestoneName}>{m.name}</div>
                  <div style={s.milestoneSub}>{m.sub}</div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Theme */}
        <div style={s.sectionLabel}>Theme</div>
        <div style={{ padding:'0 20px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
          {[
            { id:'dark',      label:'🌑 Dark',       sub:'Default' },
            { id:'parchment', label:'📜 Parchment',  sub:'Warm & focused' },
            { id:'slate',     label:'💼 Slate',       sub:'Cool & professional' },
            { id:'cosmos',    label:'🌌 Cosmos',      sub:'Deep & immersive' },
            { id:'aurora',    label:'🌿 Aurora',      sub:'Calm & refreshing' },
            { id:'sakura',    label:'🌸 Sakura',      sub:'Soft & cheerful' },
            { id:'forest',    label:'🌲 Forest',      sub:'Natural & grounded' },
            { id:'rosegold',  label:'🌹 Rose Gold',   sub:'Warm & elegant' },
          ].map(t => (
            <button key={t.id}
              onClick={() => applyTheme(t.id)}
              style={{
                background: theme === t.id ? 'var(--accent-dim)' : 'var(--bg-elevated)',
                border: theme === t.id ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                borderRadius:'var(--radius-md)', padding:'10px 12px',
                cursor:'pointer', textAlign:'left', fontFamily:'inherit',
                transition:'all 0.15s',
              }}>
              <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)', marginBottom:2 }}>{t.label}</div>
              <div style={{ fontSize:10, color:'var(--text-muted)' }}>{t.sub}</div>
            </button>
          ))}
        </div>

        {/* Study Mode */}
        <div style={s.sectionLabel}>Study Mode</div>
        <div style={s.modeSection}>
          {MODE_OPTIONS.map(m => (
            <button key={m} style={{ ...s.modeBtn, ...(mode === m ? s.modeBtnActive : {}) }}
              onClick={() => handleModeChange(m)}>
              <div style={s.modeName}>{m}</div>
              <div style={s.modeSub}>{modeDetail(m)}</div>
            </button>
          ))}
          {saving && <div style={s.savingNote}>Saving…</div>}
        </div>

        {/* Account */}
        <div style={s.sectionLabel}>Account</div>
        <div style={s.settingsList}>
          <div style={s.settingRow}>
            <span>Email</span>
            <span style={s.settingVal}>{customer?.email || '—'}</span>
          </div>
          <div style={s.settingRow}>
            <span>Exam</span>
            <span style={s.settingVal}>{studentExam?.exam_id || '—'}</span>
          </div>
          {studentExam?.exam_date && (
            <div style={s.settingRow}>
              <span>Exam date</span>
              <span style={s.settingVal}>{new Date(studentExam.exam_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
          )}
        </div>

        {/* Feedback */}
        <div style={s.sectionLabel}>Feedback & Bug Reports</div>
        <div style={{ padding:'0 20px', marginBottom:8 }}>
          {!showFeedback ? (
            <button style={s.feedbackBtn} onClick={() => setShowFeedback(true)}>
              💬 Send Feedback or Report a Bug
            </button>
          ) : (
            <div style={s.feedbackCard}>
              <div style={{ display:'flex', gap:6, marginBottom:10 }}>
                {[
                  { id:'feedback', label:'💬 Feedback' },
                  { id:'bug',      label:'🐛 Bug Report' },
                  { id:'content',  label:'📝 Content Error' },
                ].map(t => (
                  <button key={t.id}
                    style={{ ...s.feedbackTypeBtn, ...(feedbackType === t.id ? s.feedbackTypeBtnActive : {}) }}
                    onClick={() => setFeedbackType(t.id)}>
                    {t.label}
                  </button>
                ))}
              </div>
              <textarea
                style={s.feedbackInput}
                rows={4}
                placeholder={
                  feedbackType === 'bug' ? 'Describe the bug — what happened, what screen, what you expected...' :
                  feedbackType === 'content' ? 'Which topic/question has an error? What should it say?' :
                  'What would make Readwise better for you?'
                }
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
              />
              {feedbackStatus === 'success' && (
                <div style={{ fontSize:12, color:'#10B981', marginBottom:8 }}>✓ Sent! Thank you for your feedback.</div>
              )}
              {feedbackStatus === 'error' && (
                <div style={{ fontSize:12, color:'#ef4444', marginBottom:8 }}>Something went wrong. Please try again.</div>
              )}
              <div style={{ display:'flex', gap:8 }}>
                <button style={s.feedbackSubmit} onClick={submitFeedback} disabled={feedbackStatus === 'loading'}>
                  {feedbackStatus === 'loading' ? 'Sending…' : 'Send →'}
                </button>
                <button style={s.feedbackCancel} onClick={() => { setShowFeedback(false); setFeedback('') }}>Cancel</button>
              </div>
            </div>
          )}
        </div>

        {/* Sign out */}
        {!showSignOut ? (
          <button style={s.signOutBtn} onClick={() => setShowSignOut(true)}>Sign Out</button>
        ) : (
          <div style={s.signOutConfirm}>
            <div style={s.signOutQ}>Sign out of your account?</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={s.confirmYes} onClick={onSignOut}>Yes, sign out</button>
              <button style={s.confirmNo} onClick={() => setShowSignOut(false)}>Cancel</button>
            </div>
          </div>
        )}

        <div style={{ margin: '20px 20px 8px', textAlign: 'center', fontSize: 11, color: 'var(--text-muted)' }}>
          Readwise by Skai · Board Exam OS
        </div>
        <div style={{ height: 8 }} />
      </div>
    </div>
  )
}

function modeDetail(mode) {
  return {
    'Light'      : '~7 min/day · 10 cards · habit maintenance',
    'Standard'   : '~18 min/day · 25 cards · working professional',
    'Intensive'  : '~35 min/day · 50 cards · full-time reviewee',
    'Exam Sprint': '~55 min/day · 80 cards · final 30 days',
  }[mode] || ''
}

const s = {
  root           : { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  scroll         : { flex: 1, overflowY: 'auto', paddingBottom: 8 },
  hero           : { padding: '28px 20px 16px', textAlign: 'center' },
  avatar         : { width: 64, height: 64, borderRadius: '50%', background: 'var(--accent-dim)', border: '2px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--accent)', margin: '0 auto 10px' },
  name           : { fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--text-primary)', marginBottom: 6 },
  meta           : { display: 'flex', justifyContent: 'center', gap: 6, flexWrap: 'wrap' },
  metaBadge      : { background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 20, padding: '3px 10px', fontSize: 11, color: 'var(--accent)' },
  sectionLabel   : { fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.5px', padding: '12px 20px 6px' },
  milestonesGrid : { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '0 20px 4px' },
  milestone      : { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 },
  milestoneName  : { fontSize: 11, fontWeight: 500, color: 'var(--text-primary)' },
  milestoneSub   : { fontSize: 10, color: 'var(--text-muted)', marginTop: 1 },
  modeSection    : { padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 6 },
  modeBtn        : { background: 'var(--bg-elevated)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '11px 14px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.15s' },
  modeBtnActive  : { borderColor: 'var(--accent)', background: 'var(--accent-dim)' },
  modeName       : { fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 },
  modeSub        : { fontSize: 11, color: 'var(--text-muted)' },
  savingNote     : { fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' },
  settingsList   : { padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 6 },
  settingRow     : { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '11px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: 'var(--text-primary)' },
  settingVal     : { fontSize: 12, color: 'var(--accent)' },
  feedbackBtn    : { display:'block', width:'100%', padding:'11px 14px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', color:'var(--text-secondary)', fontSize:13, cursor:'pointer', fontFamily:'inherit', textAlign:'left', transition:'all 0.15s' },
  feedbackCard   : { background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', padding:'14px', display:'flex', flexDirection:'column', gap:8 },
  feedbackTypeBtn: { flex:1, padding:'6px 8px', background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:6, color:'var(--text-muted)', fontSize:11, cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s' },
  feedbackTypeBtnActive: { background:'var(--accent-dim)', border:'1px solid var(--accent)', color:'var(--accent)' },
  feedbackInput  : { padding:'10px 12px', background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', color:'var(--text-primary)', fontSize:13, outline:'none', resize:'vertical', fontFamily:'inherit', lineHeight:1.5 },
  feedbackSubmit : { flex:1, padding:'9px', background:'var(--accent)', color:'#0d0d0d', border:'none', borderRadius:'var(--radius-md)', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' },
  feedbackCancel : { padding:'9px 14px', background:'none', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', color:'var(--text-muted)', fontSize:13, cursor:'pointer', fontFamily:'inherit' },
  signOutBtn     : { display: 'block', margin: '16px 20px 0', width: 'calc(100% - 40px)', padding: 12, background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' },
  signOutConfirm : { margin: '16px 20px 0', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '14px' },
  signOutQ       : { fontSize: 13, color: 'var(--text-primary)', marginBottom: 12 },
  confirmYes     : { flex: 1, padding: '10px', background: '#e05c5c', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' },
  confirmNo      : { flex: 1, padding: '10px', background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: 'var(--radius-md)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' },
}
