import { useState } from 'react'
import { enrollStudentExam, getExams } from '../lib/supabase.js'

const EXAM_OPTIONS = [
  { id: 'LET', name: 'LET — Licensure Exam for Teachers', sub: 'Elementary / Secondary · PRC · 150 questions' },
  { id: 'NLE', name: 'NLE — Nursing Licensure Exam',      sub: '500 questions · 5 sub-exams' },
  { id: 'CPA', name: 'CPA Board Exam',                    sub: '300 questions · 6 subjects' },
]

const MODE_OPTIONS = [
  { id: 'Light',     name: 'Light',     detail: '~7 min/day · 10 cards',  sub: 'habit maintenance' },
  { id: 'Standard',  name: 'Standard',  detail: '~18 min/day · 25 cards', sub: 'working professional' },
  { id: 'Intensive', name: 'Intensive', detail: '~35 min/day · 50 cards', sub: 'full-time reviewee' },
]

const DAY_OPTIONS = [
  { label: '~180 days', value: 180 },
  { label: '~112 days', value: 112 },
  { label: '~45 days',  value: 45  },
  { label: '~7 days',   value: 7   },
]

export default function OnboardingScreen({ customer, onEnrolled }) {
  const [step,   setStep]   = useState(1)
  const [exam,   setExam]   = useState('LET')
  const [mode,   setMode]   = useState('Standard')
  const [days,   setDays]   = useState(112)
  const [status, setStatus] = useState('idle')

  function getExamDate(daysFromNow) {
    const d = new Date()
    d.setDate(d.getDate() + daysFromNow)
    return d.toISOString().split('T')[0]
  }

  async function handleStart() {
    setStatus('loading')
    try {
      const examDate   = getExamDate(days)
      const enrollment = await enrollStudentExam(customer.id, exam, examDate, mode)
      setStatus('idle')
      onEnrolled(enrollment)
    } catch {
      setStatus('error')
    }
  }

  return (
    <div style={s.root}>
      <div style={s.card}>

        {/* Brand */}
        <div style={s.brand}>
          <BookIcon />
          <div>
            <div style={s.brandName}>Readwise</div>
            <div style={s.brandBy}>by Skai</div>
          </div>
        </div>

        {step === 1 && (
          <>
            <div style={s.stepLabel}>Step 1 of 3</div>
            <h1 style={s.heading}>What exam are you<br />preparing for?</h1>
            <p style={s.sub}>We'll build your plan before you take your first step.</p>
            <div style={s.options}>
              {EXAM_OPTIONS.map(e => (
                <button key={e.id} style={{ ...s.option, ...(exam === e.id ? s.optionActive : {}) }}
                  onClick={() => setExam(e.id)}>
                  <div style={s.optionName}>{e.name}</div>
                  <div style={s.optionSub}>{e.sub}</div>
                </button>
              ))}
            </div>
            <button style={s.btn} onClick={() => setStep(2)}>Continue →</button>
          </>
        )}

        {step === 2 && (
          <>
            <div style={s.stepLabel}>Step 2 of 3</div>
            <h1 style={s.heading}>How much can you<br />study per day?</h1>
            <div style={s.options}>
              {MODE_OPTIONS.map(m => (
                <button key={m.id} style={{ ...s.option, ...(mode === m.id ? s.optionActive : {}) }}
                  onClick={() => setMode(m.id)}>
                  <div style={s.optionName}>{m.name} <span style={s.optionDetail}>— {m.detail}</span></div>
                  <div style={s.optionSub}>{m.sub}</div>
                </button>
              ))}
            </div>
            <div style={s.daysLabel}>When is your exam?</div>
            <div style={s.daysRow}>
              {DAY_OPTIONS.map(d => (
                <button key={d.value}
                  style={{ ...s.dayBtn, ...(days === d.value ? s.dayBtnActive : {}) }}
                  onClick={() => setDays(d.value)}>
                  {d.label}
                </button>
              ))}
            </div>
            <button style={s.btn} onClick={() => setStep(3)}>Continue →</button>
          </>
        )}

        {step === 3 && (
          <>
            <div style={s.stepLabel}>Step 3 of 3</div>
            <h1 style={s.heading}>Your plan is ready.</h1>
            <div style={s.planCard}>
              <div style={s.planRow}>
                <div>
                  <div style={s.planLabel}>Exam</div>
                  <div style={s.planVal}>{exam}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={s.planLabel}>Days left</div>
                  <div style={{ ...s.planVal, color: 'var(--accent)' }}>{days}</div>
                </div>
              </div>
              <div style={s.planDivider} />
              <div style={s.planRow}>
                <div>
                  <div style={s.planLabel}>Study Mode</div>
                  <div style={s.planVal}>{mode}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={s.planLabel}>Starting Score</div>
                  <div style={{ ...s.planVal, color: 'var(--accent)' }}>0% <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>(estimated)</span></div>
                </div>
              </div>
              <div style={s.planDivider} />
              <div style={s.weekList}>
                {days > 60 && <div style={s.weekRow}><span style={s.weekDot} />Week 1–4 — Foundation: learn core topics</div>}
                {days > 30 && <div style={s.weekRow}><span style={s.weekDot} />Week 5–8 — Build: quizzes + spaced review</div>}
                <div style={s.weekRow}><span style={s.weekDot} />Reinforce Phase — mock boards + weak topics</div>
              </div>
            </div>
            <div style={s.milestone}>
              <span style={{ color: 'var(--accent)' }}>Next milestone:</span> Halfway There — reach 50% readiness
            </div>
            <button style={{ ...s.btn, opacity: status === 'loading' ? 0.7 : 1 }}
              onClick={handleStart}
              disabled={status === 'loading'}>
              {status === 'loading' ? 'Setting up your plan…' : 'Start Studying →'}
            </button>
            {status === 'error' && (
              <p style={s.error}>Something went wrong. Please try again.</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function BookIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 36 36" fill="none">
      <rect width="36" height="36" rx="10" fill="var(--accent)" fillOpacity="0.15"/>
      <path d="M10 27V10h10a7 7 0 0 1 0 14H10" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M10 24h14" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
}

const s = {
  root        : { minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)', padding: 20, position: 'relative', overflow: 'hidden' },
  card        : { width: '100%', maxWidth: 420, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: '36px 32px' },
  brand       : { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 },
  brandName   : { fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.1 },
  brandBy     : { fontSize: 10, color: 'var(--accent)', letterSpacing: '0.06em', textTransform: 'uppercase' },
  stepLabel   : { fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' },
  heading     : { fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 400, color: 'var(--text-primary)', marginBottom: 8, letterSpacing: '-0.02em', lineHeight: 1.3 },
  sub         : { fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.6 },
  options     : { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 },
  option      : { background: 'var(--bg-elevated)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px 14px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', fontFamily: 'inherit' },
  optionActive: { borderColor: 'var(--accent)', background: 'var(--accent-dim)' },
  optionName  : { fontSize: 14, color: 'var(--text-primary)', fontWeight: 500, marginBottom: 2 },
  optionDetail: { color: 'var(--text-muted)', fontWeight: 400 },
  optionSub   : { fontSize: 11, color: 'var(--text-muted)' },
  daysLabel   : { fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 },
  daysRow     : { display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' },
  dayBtn      : { flex: 1, minWidth: 70, padding: '9px 8px', background: 'var(--bg-elevated)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'inherit', transition: 'all 0.15s' },
  dayBtnActive: { borderColor: 'var(--accent)', color: 'var(--accent)', background: 'var(--accent-dim)' },
  btn         : { width: '100%', padding: 14, background: 'var(--accent)', color: '#0d0d0d', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 15, fontWeight: 500, cursor: 'pointer', transition: 'opacity 0.15s', fontFamily: 'inherit', marginTop: 4 },
  planCard    : { background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: 12 },
  planRow     : { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  planLabel   : { fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 },
  planVal     : { fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' },
  planDivider : { height: 1, background: 'var(--border)', margin: '12px 0' },
  weekList    : { display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 },
  weekRow     : { fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 },
  weekDot     : { width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 },
  milestone   : { fontSize: 12, color: 'var(--text-muted)', background: 'var(--accent-dim)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '10px 12px', marginBottom: 16, lineHeight: 1.6 },
  error       : { fontSize: 13, color: '#e05c5c', marginTop: 8, textAlign: 'center' },
}
