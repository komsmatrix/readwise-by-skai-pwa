import { useState, useEffect } from 'react'
import { getTopicsForExam, getSubjectsForExam, getTopicHealth } from '../lib/supabase.js'

const HEALTH_COLOR = {
  Critical: '#e05c5c',
  Weak    : '#F59E0B',
  Stable  : '#EAB308',
  Strong  : '#10B981',
  Mastered: '#c9a96e',
}

export default function TopicsScreen({ customer, studentExam }) {
  const [subjects,   setSubjects]   = useState([])
  const [topics,     setTopics]     = useState([])
  const [healthMap,  setHealthMap]  = useState({})
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    if (customer?.id && studentExam?.exam_id) loadData()
  }, [customer?.id, studentExam?.exam_id])

  async function loadData() {
    setLoading(true)
    try {
      const [subs, tops, health] = await Promise.all([
        getSubjectsForExam(studentExam.exam_id),
        getTopicsForExam(studentExam.exam_id),
        getTopicHealth(customer.id),
      ])
      setSubjects(subs)
      setTopics(tops)
      setHealthMap(health)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const maxWeight = subjects.length > 0 ? Math.max(...subjects.map(s => s.weight_pct)) : 40

  return (
    <div style={s.root}>
      <div style={s.scroll}>

        {/* Header */}
        <div style={s.header}>
          <div style={s.title}>Topics</div>
          <div style={s.subtitle}>{studentExam?.exam_id} Board Blueprint</div>
        </div>

        {/* Blueprint bar chart */}
        <div style={s.blueprintSection}>
          <div style={s.sectionLabel}>Exam Weight by Subject</div>
          {subjects.map(sub => (
            <div key={sub.id} style={s.bpRow}>
              <div style={s.bpLabel}>{sub.name}</div>
              <div style={s.bpBarWrap}>
                <div style={{
                  ...s.bpFill,
                  width    : `${(sub.weight_pct / maxWeight) * 100}%`,
                  background: sub.color || 'var(--accent)',
                }} />
              </div>
              <div style={s.bpPct}>{sub.weight_pct}%</div>
            </div>
          ))}
        </div>

        <div style={s.divider} />

        {/* Health legend */}
        <div style={s.legend}>
          {Object.entries(HEALTH_COLOR).map(([state, color]) => (
            <span key={state} style={s.legendItem}>
              <span style={{ ...s.dot, background: color }} />{state}
            </span>
          ))}
        </div>

        {loading ? (
          <div style={s.loadingText}>Loading topics…</div>
        ) : (
          subjects.map(sub => {
            const subTopics = topics.filter(t => t.subject_id === sub.id)
            const masteryVals = subTopics
              .map(t => healthMap[t.id])
              .filter(Boolean)
              .map(h => h.attempt_count > 0 ? (h.correct_count / h.attempt_count) * 100 : 0)
            const avgMastery = masteryVals.length > 0
              ? Math.round(masteryVals.reduce((a, b) => a + b, 0) / masteryVals.length)
              : 0

            return (
              <div key={sub.id} style={s.subjectBlock}>
                <div style={s.subjectHeader}>
                  <div style={s.subjectName}>
                    {sub.name}
                    <span style={s.subjectWeight}> ({sub.weight_pct}%)</span>
                  </div>
                  <div style={{ ...s.subjectMastery, color: sub.color || 'var(--accent)' }}>
                    {avgMastery}%
                  </div>
                </div>
                <div style={s.subjectBarWrap}>
                  <div style={{
                    ...s.subjectBarFill,
                    width     : `${avgMastery}%`,
                    background: sub.color || 'var(--accent)',
                  }} />
                </div>

                <div style={s.topicList}>
                  {subTopics.map(topic => {
                    const health = healthMap[topic.id]
                    const state  = health?.health_state || 'Stable'
                    const attempts = health?.attempt_count || 0
                    return (
                      <div key={topic.id} style={s.topicRow}>
                        <span style={s.topicName}>{topic.name}</span>
                        <div style={s.topicRight}>
                          <span style={{ ...s.healthDot, background: HEALTH_COLOR[state] }} />
                          <span style={{ ...s.healthLabel, color: HEALTH_COLOR[state] }}>{state}</span>
                          <span style={s.freqPill}>{topic.board_frequency}</span>
                          {attempts === 0 && <span style={s.unseenPill}>Not started</span>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}

        <div style={{ height: 16 }} />
      </div>
    </div>
  )
}

const s = {
  root            : { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  scroll          : { flex: 1, overflowY: 'auto', paddingBottom: 8 },
  header          : { padding: '20px 20px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title           : { fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text-primary)' },
  subtitle        : { fontSize: 12, color: 'var(--text-muted)' },
  blueprintSection: { margin: '0 20px 16px' },
  sectionLabel    : { fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 },
  bpRow           : { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 },
  bpLabel         : { fontSize: 11, width: 140, flexShrink: 0, color: 'var(--text-secondary)' },
  bpBarWrap       : { flex: 1, height: 6, background: 'var(--bg-elevated)', borderRadius: 3, overflow: 'hidden' },
  bpFill          : { height: '100%', borderRadius: 3, transition: 'width .6s' },
  bpPct           : { fontSize: 11, color: 'var(--text-muted)', width: 32, textAlign: 'right' },
  divider         : { height: 1, background: 'var(--border)', margin: '0 20px 12px' },
  legend          : { padding: '0 20px', fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 },
  legendItem      : { display: 'flex', alignItems: 'center', gap: 4 },
  dot             : { width: 7, height: 7, borderRadius: '50%', flexShrink: 0 },
  loadingText     : { padding: '20px', fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' },
  subjectBlock    : { margin: '0 20px 16px' },
  subjectHeader   : { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  subjectName     : { fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' },
  subjectWeight   : { fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 },
  subjectMastery  : { fontSize: 13, fontWeight: 600 },
  subjectBarWrap  : { height: 5, background: 'var(--bg-elevated)', borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  subjectBarFill  : { height: '100%', borderRadius: 3, transition: 'width .6s' },
  topicList       : { display: 'flex', flexDirection: 'column', gap: 5 },
  topicRow        : { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '8px 12px' },
  topicName       : { fontSize: 12, color: 'var(--text-primary)' },
  topicRight      : { display: 'flex', alignItems: 'center', gap: 5 },
  healthDot       : { width: 7, height: 7, borderRadius: '50%', flexShrink: 0 },
  healthLabel     : { fontSize: 10, fontWeight: 500 },
  freqPill        : { fontSize: 9, padding: '2px 6px', borderRadius: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)' },
  unseenPill      : { fontSize: 9, padding: '2px 6px', borderRadius: 8, background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)' },
}
