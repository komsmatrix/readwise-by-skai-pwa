import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

const EXAM_CONFIG = {
  LET: { questions: 150, duration: 180, pass: 75, label: 'LET Board Exam' },
}

export default function MockBoardScreen({ customer, studentExam, onDone }) {
  const [phase,    setPhase]    = useState('intro')   // intro | loading | exam | review | summary
  const [cards,    setCards]    = useState([])
  const [idx,      setIdx]      = useState(0)
  const [answers,  setAnswers]  = useState({})        // cardId → chosen index
  const [flagged,  setFlagged]  = useState(new Set())
  const [timeLeft, setTimeLeft] = useState(0)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [summary,  setSummary]  = useState(null)
  const timerRef = useRef(null)
  const scrollRef = useRef(null)

  const examId  = studentExam?.exam_id || 'LET'
  const config  = EXAM_CONFIG[examId] || EXAM_CONFIG.LET
  const answered = Object.keys(answers).length
  const current  = cards[idx]

  // Timer
  useEffect(() => {
    if (phase !== 'exam') return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current)
          submitExam()
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [phase])

  async function startExam() {
    setLoading(true)
    setError('')
    try {
      // Fetch cards from all topics for this exam, weighted by board_frequency
      const { data: topics } = await supabase
        .from('topics')
        .select('id, name, board_frequency, topic_weight')
        .order('topic_weight', { ascending: false })

      if (!topics?.length) throw new Error('No topics found')

      // Fetch cards per topic
      const allCards = []
      for (const topic of topics) {
        const limit = topic.board_frequency === 'Very High' ? 20
          : topic.board_frequency === 'High' ? 15
          : topic.board_frequency === 'Medium' ? 10 : 5

        const { data: topicCards } = await supabase
          .from('cards')
          .select('id, question, choices, correct_index, explanation, topic_id, difficulty, bloom_level')
          .eq('topic_id', topic.id)
          .eq('is_active', true)
          .limit(limit * 3) // fetch more, then sample

        if (topicCards?.length) {
          // Shuffle and take `limit`
          const shuffled = topicCards.sort(() => Math.random() - 0.5).slice(0, limit)
          shuffled.forEach(c => allCards.push({ ...c, topicName: topic.name }))
        }
      }

      if (allCards.length < 10) throw new Error('Not enough questions available')

      // Shuffle final queue and cap at config.questions
      const queue = allCards.sort(() => Math.random() - 0.5).slice(0, config.questions)

      setCards(queue)
      setAnswers({})
      setFlagged(new Set())
      setIdx(0)
      setTimeLeft(config.duration * 60)
      setPhase('exam')
    } catch(e) {
      setError(e.message || 'Failed to load exam. Please try again.')
    }
    setLoading(false)
  }

  async function submitExam() {
    clearInterval(timerRef.current)
    setPhase('loading')

    let correct = 0
    const byTopic = {}

    cards.forEach(card => {
      const chosen = answers[card.id]
      const isCorrect = chosen === card.correct_index
      if (isCorrect) correct++

      if (!byTopic[card.topicName]) byTopic[card.topicName] = { correct: 0, total: 0 }
      byTopic[card.topicName].total++
      if (isCorrect) byTopic[card.topicName].correct++
    })

    const total   = cards.length
    const scorePct = Math.round((correct / total) * 100)
    const passed  = scorePct >= config.pass

    // Save to Supabase
    try {
      await supabase.from('mock_results').insert({
        student_id: customer.id,
        exam_id:    examId,
        score_pct:  scorePct,
        completed:  true,
      })
    } catch(e) { console.error('Failed to save mock result', e) }

    setSummary({ correct, total, scorePct, passed, byTopic })
    setPhase('summary')
  }

  function formatTime(secs) {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
    return `${m}:${String(s).padStart(2,'0')}`
  }

  const timeColor = timeLeft < 300 ? '#ef4444' : timeLeft < 600 ? '#F59E0B' : 'var(--accent)'

  // ── INTRO ─────────────────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div style={s.root}>
        <div style={s.scroll}>
          <div style={s.introWrap}>
            <div style={{ fontSize:48, marginBottom:16 }}>📝</div>
            <h1 style={s.introTitle}>{config.label}</h1>
            <p style={s.introSub}>Simulate the real board exam before exam day.</p>

            <div style={s.infoGrid}>
              {[
                { label:'Questions', val: config.questions },
                { label:'Time Limit', val: `${config.duration} min` },
                { label:'Passing Score', val: `${config.pass}%` },
                { label:'Format', val: 'Multiple Choice' },
              ].map(i => (
                <div key={i.label} style={s.infoCard}>
                  <div style={s.infoVal}>{i.val}</div>
                  <div style={s.infoLabel}>{i.label}</div>
                </div>
              ))}
            </div>

            <div style={s.rulesList}>
              {[
                'You can navigate between questions freely',
                'Flag questions to review before submitting',
                'Timer counts down — exam auto-submits at 0',
                'Your score will update your Readiness Score',
              ].map(r => (
                <div key={r} style={s.ruleRow}>
                  <span style={{ color:'var(--accent)', fontWeight:700 }}>›</span>
                  <span style={{ fontSize:14, color:'var(--text-secondary)' }}>{r}</span>
                </div>
              ))}
            </div>

            {error && (
              <div style={{ padding:'10px 14px', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:8, fontSize:13, color:'#ef4444', marginBottom:12 }}>
                {error}
              </div>
            )}

            <button style={s.startBtn} onClick={startExam} disabled={loading}>
              {loading ? 'Loading questions…' : `Start ${config.label} →`}
            </button>
            <button style={s.backBtn} onClick={onDone}>← Back</button>
          </div>
        </div>
      </div>
    )
  }

  // ── LOADING ───────────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div style={{ ...s.root, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:32, marginBottom:12 }}>⏳</div>
          <div style={{ fontSize:14, color:'var(--text-muted)' }}>Processing your results…</div>
        </div>
      </div>
    )
  }

  // ── SUMMARY ───────────────────────────────────────────────────────────────
  if (phase === 'summary' && summary) {
    const topicList = Object.entries(summary.byTopic)
      .map(([name, d]) => ({ name, pct: Math.round((d.correct/d.total)*100), correct: d.correct, total: d.total }))
      .sort((a,b) => a.pct - b.pct)

    return (
      <div style={s.root}>
        <div style={s.scroll}>
          <div style={{ padding:'24px 20px 100px', maxWidth:600, margin:'0 auto' }}>

            {/* Score card */}
            <div style={{ background: summary.passed ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)', border:`1px solid ${summary.passed ? '#10B981' : '#ef4444'}`, borderRadius:16, padding:28, textAlign:'center', marginBottom:20 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>
                {config.label} — Mock Board Result
              </div>
              <div style={{ fontFamily:'var(--font-display)', fontSize:72, fontWeight:800, color: summary.passed ? '#10B981' : '#ef4444', lineHeight:1 }}>
                {summary.scorePct}%
              </div>
              <div style={{ fontSize:16, fontWeight:700, color: summary.passed ? '#10B981' : '#ef4444', marginTop:8 }}>
                {summary.passed ? '✅ PASSED' : '❌ FAILED'}
              </div>
              <div style={{ fontSize:13, color:'var(--text-muted)', marginTop:6 }}>
                {summary.correct} of {summary.total} correct · Passing: {config.pass}%
              </div>
            </div>

            {/* Stats row */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:20 }}>
              {[
                { label:'Correct',  val: summary.correct,                   color:'#10B981' },
                { label:'Wrong',    val: summary.total - summary.correct,    color:'#ef4444' },
                { label:'Score',    val: `${summary.scorePct}%`,            color:'var(--accent)' },
              ].map(s2 => (
                <div key={s2.label} style={{ background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:12, padding:'14px 10px', textAlign:'center' }}>
                  <div style={{ fontSize:26, fontWeight:800, color:s2.color, fontFamily:'var(--font-display)' }}>{s2.val}</div>
                  <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:3, textTransform:'uppercase', letterSpacing:'0.05em' }}>{s2.label}</div>
                </div>
              ))}
            </div>

            {/* Topic breakdown */}
            <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:12, padding:16, marginBottom:20 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12 }}>
                Score by Topic
              </div>
              {topicList.map(t => (
                <div key={t.name} style={{ marginBottom:10 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
                    <span style={{ color:'var(--text-secondary)', fontWeight:500 }}>{t.name}</span>
                    <span style={{ color: t.pct >= 75 ? '#10B981' : t.pct >= 50 ? '#F59E0B' : '#ef4444', fontWeight:700 }}>{t.pct}%</span>
                  </div>
                  <div style={{ height:5, background:'var(--bg-elevated)', borderRadius:3, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${t.pct}%`, background: t.pct >= 75 ? '#10B981' : t.pct >= 50 ? '#F59E0B' : '#ef4444', borderRadius:3, transition:'width 0.8s ease' }}/>
                  </div>
                </div>
              ))}
            </div>

            {/* Weakest topic callout */}
            {topicList[0]?.pct < 75 && (
              <div style={{ background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:12, padding:14, marginBottom:20 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#ef4444', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.06em' }}>⚠ Focus Area</div>
                <div style={{ fontSize:13, color:'var(--text-secondary)' }}>
                  Your weakest topic is <strong style={{ color:'var(--text-primary)' }}>{topicList[0].name}</strong> at {topicList[0].pct}%.
                  Study this topic before your next mock board.
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <button style={s.startBtn} onClick={startExam}>🔄 Retake Mock Board</button>
              <button style={{ ...s.backBtn, marginTop:0 }} onClick={onDone}>← Back to Home</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── EXAM ──────────────────────────────────────────────────────────────────
  if (phase !== 'exam' || !current) return null

  const choices = Array.isArray(current.choices) && current.choices.length > 0 ? current.choices : []
  const chosen  = answers[current.id]
  const isFlagged = flagged.has(current.id)

  return (
    <div style={s.root}>
      {/* Sticky exam header */}
      <div style={s.examHeader}>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{config.label}</div>
          <div style={{ fontSize:12, color:'var(--text-secondary)', marginTop:1 }}>
            Q {idx + 1} / {cards.length} · {answered} answered
          </div>
        </div>
        <div style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:800, color:timeColor, minWidth:80, textAlign:'right' }}>
          {formatTime(timeLeft)}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height:3, background:'var(--bg-elevated)' }}>
        <div style={{ height:'100%', background:'var(--accent)', width:`${((idx+1)/cards.length)*100}%`, transition:'width 0.3s' }}/>
      </div>

      <div style={{ flex:1, overflowY:'auto' }} ref={scrollRef}>
        <div style={{ padding:'16px 20px 20px', maxWidth:680, margin:'0 auto' }}>

          {/* Topic label */}
          <div style={{ fontSize:10, fontWeight:700, color:'var(--accent)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>
            {current.topicName}
          </div>

          {/* Question */}
          <div style={{ fontSize:15, fontWeight:600, color:'var(--text-primary)', lineHeight:1.65, marginBottom:20, fontFamily:'var(--font-display)' }}>
            {idx + 1}. {current.question}
          </div>

          {/* Choices */}
          <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:20 }}>
            {choices.map((choice, i) => {
              const isChosen = chosen === i
              return (
                <button key={i} onClick={() => setAnswers(a => ({ ...a, [current.id]: i }))}
                  style={{
                    background: isChosen ? 'var(--accent-dim)' : 'var(--bg-elevated)',
                    border: `1.5px solid ${isChosen ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius:10, padding:'12px 16px',
                    fontSize:14, cursor:'pointer', textAlign:'left',
                    color: isChosen ? 'var(--accent)' : 'var(--text-primary)',
                    fontFamily:'inherit', transition:'all 0.15s',
                    display:'flex', alignItems:'flex-start', gap:12,
                  }}>
                  <span style={{ fontWeight:700, flexShrink:0, width:20, color: isChosen ? 'var(--accent)' : 'var(--text-muted)' }}>
                    {String.fromCharCode(65+i)}.
                  </span>
                  <span style={{ lineHeight:1.5 }}>{choice}</span>
                </button>
              )
            })}
          </div>

          {/* Flag button */}
          <button onClick={() => setFlagged(f => { const n = new Set(f); n.has(current.id) ? n.delete(current.id) : n.add(current.id); return n })}
            style={{ background: isFlagged ? 'rgba(245,158,11,0.1)' : 'var(--bg-elevated)', border:`1px solid ${isFlagged ? '#F59E0B' : 'var(--border)'}`, borderRadius:8, padding:'8px 14px', fontSize:12, fontWeight:600, cursor:'pointer', color: isFlagged ? '#F59E0B' : 'var(--text-muted)', fontFamily:'inherit', marginBottom:20 }}>
            {isFlagged ? '🚩 Flagged for review' : '⚑ Flag this question'}
          </button>

          {/* Question navigator */}
          <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:12, padding:14, marginBottom:20 }}>
            <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>
              Question Navigator
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {cards.map((c, i) => {
                const isAnswered = answers[c.id] !== undefined
                const isCurrent  = i === idx
                const isFlag     = flagged.has(c.id)
                return (
                  <button key={i} onClick={() => { setIdx(i); scrollRef.current?.scrollTo(0,0) }}
                    style={{
                      width:32, height:32, borderRadius:6, fontSize:11, fontWeight:700,
                      cursor:'pointer', fontFamily:'inherit', border:'1px solid',
                      background: isCurrent ? 'var(--accent)' : isFlag ? 'rgba(245,158,11,0.15)' : isAnswered ? 'rgba(16,185,129,0.15)' : 'var(--bg-elevated)',
                      borderColor: isCurrent ? 'var(--accent)' : isFlag ? '#F59E0B' : isAnswered ? '#10B981' : 'var(--border)',
                      color: isCurrent ? '#0d0d0d' : isFlag ? '#F59E0B' : isAnswered ? '#10B981' : 'var(--text-muted)',
                    }}>
                    {i+1}
                  </button>
                )
              })}
            </div>
            <div style={{ display:'flex', gap:16, marginTop:10, fontSize:11, color:'var(--text-muted)', flexWrap:'wrap' }}>
              <span>🟩 Answered ({answered})</span>
              <span>🟨 Flagged ({flagged.size})</span>
              <span>⬜ Unanswered ({cards.length - answered})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom navigation */}
      <div style={{ padding:'12px 20px', background:'var(--bg-surface)', borderTop:'1px solid var(--border)', display:'flex', gap:8, flexShrink:0 }}>
        <button onClick={() => { setIdx(i => Math.max(0, i-1)); scrollRef.current?.scrollTo(0,0) }}
          style={{ flex:1, padding:'11px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:10, fontSize:14, cursor:idx===0?'not-allowed':'pointer', color: idx===0?'var(--text-muted)':'var(--text-primary)', fontFamily:'inherit', opacity:idx===0?0.4:1 }}
          disabled={idx===0}>
          ← Prev
        </button>
        {idx < cards.length - 1 ? (
          <button onClick={() => { setIdx(i => i+1); scrollRef.current?.scrollTo(0,0) }}
            style={{ flex:2, padding:'11px', background:'var(--accent)', border:'none', borderRadius:10, fontSize:14, fontWeight:700, cursor:'pointer', color:'#0d0d0d', fontFamily:'inherit' }}>
            Next →
          </button>
        ) : (
          <button onClick={() => {
            const unanswered = cards.length - answered
            if (unanswered > 0) {
              if (!window.confirm(`You have ${unanswered} unanswered question${unanswered>1?'s':''}. Submit anyway?`)) return
            }
            submitExam()
          }}
            style={{ flex:2, padding:'11px', background: answered === cards.length ? '#10B981' : 'var(--accent)', border:'none', borderRadius:10, fontSize:14, fontWeight:700, cursor:'pointer', color:'#0d0d0d', fontFamily:'inherit' }}>
            Submit Exam ✓
          </button>
        )}
      </div>
    </div>
  )
}

const s = {
  root        : { height:'100vh', display:'flex', flexDirection:'column', background:'var(--bg-base)', overflow:'hidden' },
  scroll      : { flex:1, overflowY:'auto' },
  introWrap   : { maxWidth:500, margin:'0 auto', padding:'32px 20px 100px', display:'flex', flexDirection:'column', gap:16, alignItems:'center', textAlign:'center' },
  introTitle  : { fontFamily:'var(--font-display)', fontSize:28, fontWeight:800, color:'var(--text-primary)', margin:0 },
  introSub    : { fontSize:15, color:'var(--text-secondary)', margin:0 },
  infoGrid    : { display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, width:'100%' },
  infoCard    : { background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:12, padding:'16px 12px', textAlign:'center' },
  infoVal     : { fontFamily:'var(--font-display)', fontSize:22, fontWeight:800, color:'var(--accent)', marginBottom:4 },
  infoLabel   : { fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em' },
  rulesList   : { display:'flex', flexDirection:'column', gap:8, width:'100%', textAlign:'left' },
  ruleRow     : { display:'flex', gap:10, alignItems:'flex-start' },
  startBtn    : { width:'100%', padding:'15px', background:'var(--accent)', color:'#0d0d0d', border:'none', borderRadius:12, fontSize:15, fontWeight:800, cursor:'pointer', fontFamily:'inherit' },
  backBtn     : { width:'100%', padding:'12px', background:'none', color:'var(--text-muted)', border:'1px solid var(--border)', borderRadius:12, fontSize:14, cursor:'pointer', fontFamily:'inherit', marginTop:4 },
  examHeader  : { display:'flex', alignItems:'center', padding:'12px 20px', background:'var(--bg-surface)', borderBottom:'1px solid var(--border)', flexShrink:0, gap:12 },
}
