import { useState, useEffect } from 'react'
import {
  getTopicsForExam, getCardReviews, getRecentSessions,
  getMockResults, getTopicHealth,
  computeReadinessScore, getReadinessLevel, getPreparationPhase, getDaysLeft,
} from '../lib/supabase.js'

export default function HomeScreen({ customer, studentExam, onStartStudy, onViewTopics }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)

  const daysLeft = studentExam?.exam_date ? getDaysLeft(studentExam.exam_date) : null
  const phase    = daysLeft !== null ? getPreparationPhase(daysLeft) : 'Foundation'

  useEffect(() => {
    if (customer?.id && studentExam?.exam_id) loadData()
  }, [customer?.id, studentExam?.exam_id])

  async function loadData() {
    setLoading(true)
    try {
      const [topics, reviews, sessions, mocks, healthMap] = await Promise.all([
        getTopicsForExam(studentExam.exam_id),
        getCardReviews(customer.id),
        getRecentSessions(customer.id, 30),
        getMockResults(customer.id),
        getTopicHealth(customer.id),
      ])

      // Coverage: topics with ≥3 attempts
      const attemptedTopics = topics.filter(t => {
        const topicReviews = reviews.filter(r => r.card_id) // simplified
        return (healthMap[t.id]?.attempt_count || 0) >= 3
      })
      const coveragePct = topics.length > 0
        ? Math.round((attemptedTopics.length / topics.length) * 100)
        : 0

      // Mastery: avg correct rate across reviewed topics
      const reviewedTopics = Object.values(healthMap)
      const masteryPct = reviewedTopics.length > 0
        ? Math.round(reviewedTopics.reduce((sum, h) => {
            const rate = h.attempt_count > 0 ? (h.correct_count / h.attempt_count) * 100 : 0
            return sum + rate
          }, 0) / reviewedTopics.length)
        : 0

      // Consistency: study days in last 30
      const studyDays = new Set(
        sessions.map(s => s.started_at?.split('T')[0])
      ).size
      const consistencyPct = Math.round((studyDays / 30) * 100)

      // Mock exam
      const mockPct = mocks.length > 0
        ? mocks[0].score_pct  // most recent
        : null

      const { score, estimated } = computeReadinessScore({
        coveragePct,
        masteryPct,
        consistencyPct,
        mockPct,
      })

      // Critical topics for NBA
      const criticalTopics = topics.filter(t =>
        healthMap[t.id]?.health_state === 'Critical' ||
        healthMap[t.id]?.health_state === 'Weak'
      )
      const nbaTarget = criticalTopics.length > 0
        ? criticalTopics.sort((a, b) =>
            (b.topic_weight || 0) - (a.topic_weight || 0)
          )[0]
        : topics.find(t => !(healthMap[t.id])) // first unstarted topic

      // Streak
      const sortedDays = sessions
        .map(s => s.started_at?.split('T')[0])
        .filter(Boolean)
        .sort((a, b) => b.localeCompare(a))
      let streak = 0
      const today = new Date().toISOString().split('T')[0]
      let check   = today
      for (const day of [...new Set(sortedDays)]) {
        if (day === check) { streak++; const d = new Date(check); d.setDate(d.getDate() - 1); check = d.toISOString().split('T')[0] }
        else break
      }

      setData({
        score, estimated,
        coveragePct, masteryPct, consistencyPct, mockPct,
        nbaTarget,
        streak,
        totalReviews: reviews.length,
        criticalCount: criticalTopics.length,
      })
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const score = data?.score ?? 0
  const level = getReadinessLevel(score)
  const firstName = customer?.name?.split(' ')[0] || 'there'

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div style={s.root}>
      <div style={s.scroll}>

        {/* Header */}
        <div style={s.header}>
          <div>
            <div style={s.greeting}>{greeting},</div>
            <div style={s.name}>{firstName}.</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={s.examBadge}>{studentExam?.exam_id || 'LET'}</div>
            <div style={s.phaseBadge}>{phase}</div>
            {daysLeft !== null && (
              <div style={s.countdown}><span style={{ color: 'var(--accent)' }}>{daysLeft}</span> days left</div>
            )}
          </div>
        </div>

        {/* Readiness Score */}
        <div style={s.gaugeSection}>
          <GaugeArc score={score} color={level.color} />
          <div style={s.gaugeCenter}>
            <div style={{ ...s.gaugeScore, color: level.color }}>{score}%</div>
            <div style={s.gaugeLevel}>{level.label}</div>
            {data?.estimated && <div style={s.gaugeEst}>estimated</div>}
          </div>
          <div style={s.gaugeFooter}>
            {loading ? (
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Calculating…</span>
            ) : (
              <span style={{ color: 'var(--accent)', fontSize: 12, cursor: 'pointer' }}>See breakdown →</span>
            )}
          </div>
        </div>

        {/* Component scores */}
        {data && (
          <div style={s.compsGrid}>
            {[
              { label: 'Coverage',    val: data.coveragePct,    color: '#06B6D4' },
              { label: 'Mastery',     val: data.masteryPct,     color: '#c9a96e' },
              { label: 'Consistency', val: data.consistencyPct, color: '#8B5CF6' },
              { label: 'Mock Exam',   val: data.mockPct ?? 0,   color: '#F59E0B' },
            ].map(c => (
              <div key={c.label} style={s.compCard}>
                <div style={s.compLabel}>{c.label}</div>
                <div style={{ ...s.compVal, color: c.color }}>{c.val}%</div>
                <div style={s.compBarWrap}>
                  <div style={{ ...s.compBarFill, width: `${c.val}%`, background: c.color }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Next Best Action */}
        <div style={s.nba}>
          <div style={s.nbaTag}>⚡ Your Next Best Action</div>
          {loading ? (
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading your plan…</div>
          ) : data?.nbaTarget ? (
            <>
              <div style={s.nbaTitle}>Review: {data.nbaTarget.name}</div>
              <div style={s.nbaWhy}>
                <span style={{ color: 'var(--text-primary)' }}>{data.nbaTarget.board_frequency} board frequency</span>
                {daysLeft && ` · Exam in ${daysLeft} days`}
              </div>
              <div style={s.nbaImpact}>↑ Estimated impact: +2% readiness</div>
              <div style={s.nbaBtns}>
                <button style={s.btnPrimary} onClick={onStartStudy}>Start Now</button>
                <button style={s.btnGhost}>Later</button>
              </div>
            </>
          ) : (
            <>
              <div style={s.nbaTitle}>Start your first study session</div>
              <div style={s.nbaWhy}>Build your baseline readiness score.</div>
              <div style={s.nbaBtns}>
                <button style={s.btnPrimary} onClick={onStartStudy}>Start Now</button>
              </div>
            </>
          )}
        </div>

        {/* Streak + stats */}
        <div style={s.statsRow}>
          <div style={s.statChip}>
            <span style={{ fontSize: 20 }}>🔥</span>
            <div>
              <div style={s.statVal}>{data?.streak ?? 0} <span style={s.statUnit}>day streak</span></div>
              <div style={s.statSub}>Keep it going</div>
            </div>
          </div>
          <div style={s.statChip}>
            <span style={{ fontSize: 20 }}>📚</span>
            <div>
              <div style={s.statVal}>{data?.totalReviews ?? 0}</div>
              <div style={s.statSub}>cards reviewed</div>
            </div>
          </div>
        </div>

        {/* Coach Insight */}
        <div style={s.insight}>
          <div style={s.insightHead}>🧠 Coach Insight</div>
          {data?.criticalCount > 0 ? (
            <>
              <div style={s.insightBody}>
                You have <span style={{ color: 'var(--text-primary)' }}>{data.criticalCount} topic{data.criticalCount > 1 ? 's' : ''}</span> that need attention. Focus on high-frequency topics first — they carry the most exam weight.
              </div>
              <button style={s.insightAction} onClick={onViewTopics}>View all topics →</button>
            </>
          ) : (
            <>
              <div style={s.insightBody}>
                Complete your first study session to get personalized coaching based on your performance.
              </div>
              <button style={s.insightAction} onClick={onStartStudy}>Start studying →</button>
            </>
          )}
        </div>

        <div style={{ height: 16 }} />
      </div>
    </div>
  )
}

// ── Gauge Arc SVG ─────────────────────────────────────────────────────────────
function GaugeArc({ score, color }) {
  const r  = 72
  const cx = 100, cy = 100
  const clamp = Math.max(0, Math.min(100, score))

  function polarToXY(angleDeg, radius) {
    const rad = (angleDeg - 90) * (Math.PI / 180)
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) }
  }

  const startAngle = 180
  const endAngle   = 360
  const fillAngle  = startAngle + (clamp / 100) * (endAngle - startAngle)

  const s0 = polarToXY(startAngle, r)
  const e0 = polarToXY(endAngle,   r)
  const s1 = polarToXY(startAngle, r)
  const e1 = polarToXY(fillAngle,  r)
  const largeArc = (fillAngle - startAngle) > 180 ? 1 : 0

  return (
    <svg viewBox="0 0 200 110" style={{ width: 200, height: 110, display: 'block', margin: '0 auto' }}>
      <path
        d={`M ${s0.x},${s0.y} A ${r},${r} 0 1,1 ${e0.x},${e0.y}`}
        fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" strokeLinecap="round"
      />
      {clamp > 0 && (
        <path
          d={`M ${s1.x},${s1.y} A ${r},${r} 0 ${largeArc},1 ${e1.x},${e1.y}`}
          fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          style={{ transition: 'stroke 0.4s' }}
        />
      )}
    </svg>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  root         : { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  scroll       : { flex: 1, overflowY: 'auto', paddingBottom: 8 },
  header       : { padding: '24px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  greeting     : { fontSize: 13, color: 'var(--text-muted)' },
  name         : { fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.1 },
  examBadge    : { display: 'inline-block', background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 20, padding: '3px 10px', fontSize: 11, color: 'var(--accent)', fontWeight: 500 },
  phaseBadge   : { fontSize: 10, color: 'var(--text-muted)', textAlign: 'right', marginTop: 3 },
  countdown    : { fontSize: 11, color: 'var(--text-muted)', marginTop: 2 },
  gaugeSection : { padding: '12px 20px 4px', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  gaugeCenter  : { position: 'absolute', bottom: 28, textAlign: 'center' },
  gaugeScore   : { fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 700, lineHeight: 1 },
  gaugeLevel   : { fontSize: 11, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.5px', marginTop: 2 },
  gaugeEst     : { fontSize: 10, color: 'var(--text-muted)', marginTop: 2 },
  gaugeFooter  : { marginTop: 4 },
  compsGrid    : { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '4px 20px 12px' },
  compCard     : { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '10px 12px' },
  compLabel    : { fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 3 },
  compVal      : { fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 },
  compBarWrap  : { height: 3, background: 'var(--bg-elevated)', borderRadius: 2, marginTop: 5, overflow: 'hidden' },
  compBarFill  : { height: '100%', borderRadius: 2, transition: 'width .6s' },
  nba          : { margin: '0 20px 12px', background: 'var(--bg-surface)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-lg)', padding: '14px 16px' },
  nbaTag       : { fontSize: 10, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.6px', fontWeight: 600, marginBottom: 6 },
  nbaTitle     : { fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--text-primary)', marginBottom: 4 },
  nbaWhy       : { fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 8 },
  nbaImpact    : { fontSize: 11, color: '#10B981', marginBottom: 10 },
  nbaBtns      : { display: 'flex', gap: 8 },
  btnPrimary   : { flex: 1, background: 'var(--accent)', color: '#0d0d0d', border: 'none', borderRadius: 'var(--radius-md)', padding: '9px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  btnGhost     : { background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: 'var(--radius-md)', padding: '9px 14px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' },
  statsRow     : { display: 'flex', gap: 8, padding: '0 20px 12px' },
  statChip     : { flex: 1, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 },
  statVal      : { fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--text-primary)' },
  statUnit     : { fontSize: 12, fontWeight: 400, color: 'var(--text-muted)', fontFamily: 'inherit' },
  statSub      : { fontSize: 10, color: 'var(--text-muted)' },
  insight      : { margin: '0 20px 16px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px 14px' },
  insightHead  : { fontSize: 10, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.6px', fontWeight: 600, marginBottom: 6 },
  insightBody  : { fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 8 },
  insightAction: { fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 },
}
