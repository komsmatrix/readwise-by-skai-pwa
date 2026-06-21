import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  getTopicsForExam, getCardReviews, getRecentSessions,
  getMockResults, getTopicHealth,
  computeReadinessScore, getReadinessLevel, getPreparationPhase, getDaysLeft,
} from '../lib/supabase.js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// ── Milestone definitions ─────────────────────────────────────────────────────
const MILESTONES = [
  { id: 'first_step',   label: 'First Step',        icon: '▶',  check: (d) => d.totalSessions >= 1 },
  { id: 'centurion',    label: 'Question Centurion', icon: '💯', check: (d) => d.totalReviews >= 100 },
  { id: 'thousandaire', label: 'Thousandaire',       icon: '📚', check: (d) => d.totalReviews >= 1000 },
  { id: 'week_warrior', label: 'Week Warrior',       icon: '🔥', check: (d) => d.streak >= 7 },
  { id: 'month_strong', label: 'Month Strong',       icon: '⚡', check: (d) => d.streak >= 30 },
  { id: 'halfway',      label: 'Halfway There',      icon: '⭐', check: (d) => d.score >= 50 },
  { id: 'almost_ready', label: 'Almost Ready',       icon: '🏆', check: (d) => d.score >= 70 },
  { id: 'board_ready',  label: 'Board Ready',        icon: '🎓', check: (d) => d.score >= 85 },
]

// Tag icon map
const TAG_ICONS = { announcement: '📢', feature: '✨', lesson: '📚', audio: '🎧', fix: '🛠' }

export default function HomeScreen({ customer, studentExam, onStartStudy, onViewTopics }) {
  const [data,        setData]        = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [showBreakdown, setShowBreakdown] = useState(false)
  const [announcement, setAnnouncement] = useState(null)
  const [showAnnouncement, setShowAnnouncement] = useState(false)
  const [updates, setUpdates]         = useState([])

  const daysLeft = studentExam?.exam_date ? getDaysLeft(studentExam.exam_date) : null
  const phase    = daysLeft !== null ? getPreparationPhase(daysLeft) : 'Foundation'
  const [showConfetti, setShowConfetti] = useState(false)
  const [confettiMsg,  setConfettiMsg]  = useState('')
  const [freezeUsed,   setFreezeUsed]   = useState(() => {
    const d = new Date().toISOString().split('T')[0]
    const saved = localStorage.getItem('streak_freeze_date')
    return saved === d
  })

  useEffect(() => {
    if (customer?.id && studentExam?.exam_id) loadData()
    loadAnnouncement()
  }, [customer?.id, studentExam?.exam_id])

  async function loadAnnouncement() {
    try {
      // Prefer pinned, fallback to latest active
      const { data: anns } = await supabase
        .from('announcements')
        .select('*')
        .eq('active', true)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(5)
      if (anns && anns.length > 0) {
        const ann = anns[0]
        setAnnouncement(ann)
        const dismissed = localStorage.getItem(`ann_dismissed_${ann.id}`)
        if (!dismissed) setShowAnnouncement(true)
        // Store rest for updates feed
        setUpdates(anns)
      }
    } catch {}
  }

  function dismissAnnouncement() {
    if (announcement) localStorage.setItem(`ann_dismissed_${announcement.id}`, '1')
    setShowAnnouncement(false)
  }

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

      const attemptedTopics = topics.filter(t => (healthMap[t.id]?.attempt_count || 0) >= 3)
      const coveragePct = topics.length > 0
        ? Math.round((attemptedTopics.length / topics.length) * 100) : 0

      const reviewedTopics = Object.values(healthMap)
      const masteryPct = reviewedTopics.length > 0
        ? Math.round(reviewedTopics.reduce((sum, h) => {
            const rate = h.attempt_count > 0 ? (h.correct_count / h.attempt_count) * 100 : 0
            return sum + rate
          }, 0) / reviewedTopics.length) : 0

      const studyDays = new Set(sessions.map(s => s.started_at?.split('T')[0])).size
      const consistencyPct = Math.round((studyDays / 30) * 100)
      const mockPct = mocks.length > 0 ? mocks[0].score_pct : null

      const { score, estimated } = computeReadinessScore({ coveragePct, masteryPct, consistencyPct, mockPct })

      const criticalTopics = topics.filter(t =>
        healthMap[t.id]?.health_state === 'Critical' || healthMap[t.id]?.health_state === 'Weak'
      )
      const nbaTarget = criticalTopics.length > 0
        ? criticalTopics.sort((a, b) => (b.topic_weight || 0) - (a.topic_weight || 0))[0]
        : topics.find(t => !(healthMap[t.id]))

      // Streak
      const sortedDays = sessions.map(s => s.started_at?.split('T')[0]).filter(Boolean).sort((a, b) => b.localeCompare(a))
      let streak = 0
      const today = new Date().toISOString().split('T')[0]
      let check = today
      for (const day of [...new Set(sortedDays)]) {
        if (day === check) { streak++; const d = new Date(check); d.setDate(d.getDate() - 1); check = d.toISOString().split('T')[0] }
        else break
      }

      // Coach insight logic
      let insight = null
      if (score > 0 && data?.score === score) {
        insight = { type: 'stalled', body: `Your Readiness Score hasn't moved recently. Try focusing on ${criticalTopics[0]?.name || 'weak topics'} to push it up.`, action: 'View Topics', onAction: onViewTopics }
      } else if (criticalTopics.length > 0) {
        insight = { type: 'critical', body: `You have ${criticalTopics.length} topic${criticalTopics.length > 1 ? 's' : ''} that need attention. Focus on high-frequency topics first — they carry the most exam weight.`, action: 'View Topics', onAction: onViewTopics }
      } else if (mocks.length === 0 && daysLeft !== null && daysLeft < 60) {
        insight = { type: 'mock', body: `You haven't taken a mock board exam yet. With ${daysLeft} days left, now is a good time to simulate the real thing.`, action: 'Start Studying', onAction: onStartStudy }
      } else {
        insight = { type: 'start', body: 'Complete your first study session to get personalized coaching based on your performance.', action: 'Start Studying', onAction: onStartStudy }
      }

      // Unlocked milestones
      // Today's reviewed count for daily goal
      const todayReviewed = reviews.filter(r => r.created_at?.startsWith(today)).length

      const d = { score, streak, totalReviews: reviews.length, totalSessions: sessions.length, todayReviewed }
      // Confetti triggers
      if (score >= 75 && score < 80) { setConfettiMsg('🎉 You hit 75% Readiness!'); setShowConfetti(true); setTimeout(() => setShowConfetti(false), 4000) }
      if (score >= 50 && score < 55) { setConfettiMsg('🌟 Halfway there — 50% Readiness!'); setShowConfetti(true); setTimeout(() => setShowConfetti(false), 4000) }
      const unlocked = MILESTONES.filter(m => m.check(d))

      setData({
        score, estimated,
        coveragePct, masteryPct, consistencyPct, mockPct,
        nbaTarget, streak, totalReviews: reviews.length,
        criticalCount: criticalTopics.length,
        insight, unlocked,
      })
    } catch (e) { console.error(e) }
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

        {/* Confetti celebration overlay */}
        {showConfetti && (
          <div style={{ position:'fixed', top:0, left:0, right:0, zIndex:999, pointerEvents:'none' }}>
            <ConfettiBurst />
            <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', background:'var(--bg-surface)', border:'2px solid var(--accent)', borderRadius:16, padding:'20px 28px', textAlign:'center', boxShadow:'0 8px 32px rgba(0,0,0,0.4)', zIndex:1000, pointerEvents:'all' }}>
              <div style={{ fontSize:32, marginBottom:8 }}>🎊</div>
              <div style={{ fontFamily:'var(--font-display)', fontSize:18, color:'var(--text-primary)', marginBottom:4 }}>{confettiMsg}</div>
              <button onClick={() => setShowConfetti(false)} style={{ marginTop:8, background:'var(--accent)', color:'#0d0d0d', border:'none', borderRadius:8, padding:'8px 20px', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Keep Going! →</button>
            </div>
          </div>
        )}

      {/* Announcement banner */}
        {showAnnouncement && announcement && (
          <div style={{ ...s.announcementBanner, ...(announcement.is_pinned ? { borderColor: 'var(--accent)', background: 'rgba(201,169,110,0.12)' } : {}) }}>
            <div style={s.announcementContent}>
              <span style={s.announcementIcon}>{TAG_ICONS[announcement.tag] || '📢'}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                  {announcement.is_pinned && <span style={{ fontSize: 10 }}>📌</span>}
                  <div style={s.announcementTitle}>{announcement.title}</div>
                </div>
                <div style={s.announcementBody}>{announcement.body}</div>
              </div>
            </div>
            <button style={s.announcementClose} onClick={dismissAnnouncement}>✕</button>
          </div>
        )}

        {/* Updates Feed */}
        {updates.length > 0 && !showAnnouncement && (
          <div style={s.updatesFeed}>
            <div style={s.updatesLabel}>📋 Recent Updates</div>
            {updates.slice(0, 3).map(u => (
              <div key={u.id} style={s.updateRow}>
                <span style={s.updateIcon}>{TAG_ICONS[u.tag] || '📢'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={s.updateTitle}>
                    {u.is_pinned && <span style={{ marginRight: 4 }}>📌</span>}
                    {u.title}
                  </div>
                  <div style={s.updateBody}>{u.body}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Hero Banner */}
        <div style={{
          ...s.heroBanner,
          height: window.innerWidth >= 768 ? 280 : 160,
        }}>
          <img
            src="/images/hero-banner.png"
            alt=""
            style={{ ...s.heroImg, objectPosition: 'center bottom' }}
          />
          <div style={s.heroFade} />
        </div>

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
              <div style={{ ...s.countdown, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                <div>
                  <span style={{ color: daysLeft <= 30 ? '#e05c5c' : daysLeft <= 60 ? '#F59E0B' : 'var(--accent)', fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-display)' }}>{daysLeft}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>days left</span>
                </div>
                {daysLeft <= 30 && <div style={{ fontSize: 9, color: '#e05c5c', fontWeight: 700, letterSpacing: '.05em' }}>⚡ FINAL STRETCH</div>}
                {daysLeft > 30 && daysLeft <= 60 && <div style={{ fontSize: 9, color: '#F59E0B', fontWeight: 700, letterSpacing: '.05em' }}>🔥 CRUNCH TIME</div>}
              </div>
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
              <span style={{ color: 'var(--accent)', fontSize: 12, cursor: 'pointer' }}
                onClick={() => setShowBreakdown(true)}>
                See breakdown →
              </span>
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
              <div key={c.label} style={s.compCard} onClick={() => setShowBreakdown(true)}>
                <div style={s.compLabel}>{c.label}</div>
                <div style={{ ...s.compVal, color: c.color }}>{c.val}%</div>
                <div style={s.compBarWrap}>
                  <div style={{ ...s.compBarFill, width: `${c.val}%`, background: c.color }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* NBA */}
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

        {/* Stats grid */}
        <div style={s.statsGrid}>
          <div style={s.statCard}>
            <div style={s.statIcon}>🔥</div>
            <div style={{ ...s.statVal, color: data?.streak > 0 ? '#F59E0B' : 'var(--text-primary)' }}>{data?.streak ?? 0}</div>
            <div style={s.statSub}>day streak</div>
          </div>
          <div style={s.statCard}>
            <div style={s.statIcon}>📚</div>
            <div style={s.statVal}>{data?.totalReviews ?? 0}</div>
            <div style={s.statSub}>cards reviewed</div>
          </div>
          <div style={s.statCard}>
            <div style={s.statIcon}>⚠️</div>
            <div style={{ ...s.statVal, color: data?.criticalCount > 0 ? '#e05c5c' : '#10B981' }}>{data?.criticalCount ?? 0}</div>
            <div style={s.statSub}>weak topics</div>
          </div>
        </div>

        {/* Milestones */}
        {data?.unlocked?.length > 0 && (
          <div style={s.milestonesRow}>
            <div style={s.milestonesLabel}>🏅 Milestones unlocked</div>
            <div style={s.milestoneChips}>
              {data.unlocked.map(m => (
                <div key={m.id} style={s.milestoneChip}>
                  <span style={{ fontSize: 16 }}>{m.icon}</span>
                  <span style={s.milestoneChipLabel}>{m.label}</span>
                </div>
              ))}
              {data.unlocked.length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Complete your first session to unlock milestones.</div>
              )}
            </div>
          </div>
        )}

        {/* Coach Insight */}
        <div style={s.insight}>
          <div style={s.insightHead}>🧠 Coach Insight</div>
          {data?.insight ? (
            <>
              <div style={s.insightBody}>{data.insight.body}</div>
              <button style={s.insightAction} onClick={data.insight.onAction}>
                {data.insight.action} →
              </button>
            </>
          ) : (
            <div style={s.insightBody}>Complete your first study session to get personalized coaching based on your performance.</div>
          )}
        </div>

        <div style={{ height: 8 }} />

        <div style={{ height: 16 }} />
      </div>

      {/* Readiness Score Breakdown Modal */}
      {showBreakdown && data && (
        <BreakdownModal
          data={data}
          score={score}
          level={level}
          daysLeft={daysLeft}
          onClose={() => setShowBreakdown(false)}
          onStartStudy={onStartStudy}
          onViewTopics={onViewTopics}
        />
      )}
    </div>
  )
}

// ── Breakdown Modal ───────────────────────────────────────────────────────────
// ── Daily Goal Ring ────────────────────────────────────────────────────────
function DailyGoalRing({ reviewed, goal, streak, freezeUsed, onFreeze }) {
  const pct = Math.min(reviewed / goal, 1)
  const r   = 28
  const circ = 2 * Math.PI * r
  const dash = pct * circ
  const done = pct >= 1
  const showFreeze = streak > 0 && !freezeUsed && reviewed === 0

  return (
    <div style={{ margin:'0 20px 12px', background:'var(--bg-surface)', border:`1px solid ${done ? '#10B981' : 'var(--border)'}`, borderRadius:'var(--radius-md)', padding:'12px 16px', display:'flex', alignItems:'center', gap:16 }}>
      {/* Ring */}
      <div style={{ position:'relative', flexShrink:0 }}>
        <svg width={68} height={68}>
          <circle cx={34} cy={34} r={r} fill="none" stroke="var(--bg-elevated)" strokeWidth={5}/>
          <circle cx={34} cy={34} r={r} fill="none"
            stroke={done ? '#10B981' : 'var(--accent)'}
            strokeWidth={5}
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            transform="rotate(-90 34 34)"
            style={{ transition:'stroke-dasharray 0.5s ease' }}
          />
        </svg>
        <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', textAlign:'center' }}>
          <div style={{ fontSize:14, fontWeight:800, color: done ? '#10B981' : 'var(--accent)', lineHeight:1 }}>{reviewed}</div>
          <div style={{ fontSize:8, color:'var(--text-muted)', lineHeight:1, marginTop:1 }}>/{goal}</div>
        </div>
      </div>
      {/* Text */}
      <div style={{ flex:1 }}>
        <div style={{ fontSize:12, fontWeight:700, color:'var(--text-primary)', marginBottom:2 }}>
          {done ? '✅ Daily Goal Complete!' : `Daily Goal — ${reviewed}/${goal} cards`}
        </div>
        <div style={{ fontSize:11, color:'var(--text-muted)', lineHeight:1.5 }}>
          {done ? 'Great work today. Come back tomorrow to keep your streak alive.' :
           `${goal - reviewed} more cards to hit your goal today.`}
        </div>
        {showFreeze && (
          <button onClick={onFreeze} style={{ marginTop:6, background:'rgba(91,163,217,0.1)', border:'1px solid #5ba3d9', borderRadius:6, padding:'4px 10px', fontSize:10, fontWeight:700, color:'#5ba3d9', cursor:'pointer', fontFamily:'inherit' }}>
            🧊 Use Streak Freeze (1 left this week)
          </button>
        )}
        {freezeUsed && reviewed === 0 && (
          <div style={{ marginTop:4, fontSize:10, color:'#5ba3d9', fontWeight:600 }}>🧊 Streak freeze used today — your streak is safe!</div>
        )}
      </div>
    </div>
  )
}

// ── Confetti Burst ───────────────────────────────────────────────────────────
function ConfettiBurst() {
  const colors = ['#c9a96e','#10B981','#5ba3d9','#F59E0B','#e05c5c','#8B5CF6']
  const pieces = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    color: colors[i % colors.length],
    x: Math.random() * 100,
    delay: Math.random() * 0.8,
    size: 6 + Math.random() * 8,
  }))
  return (
    <div style={{ position:'fixed', top:0, left:0, right:0, height:'100vh', pointerEvents:'none', overflow:'hidden' }}>
      {pieces.map(p => (
        <div key={p.id} style={{
          position:'absolute', left:`${p.x}%`, top:'-10px',
          width:p.size, height:p.size,
          background:p.color, borderRadius:'50%',
          animation:`confettiFall 2s ${p.delay}s ease-in forwards`,
        }}/>
      ))}
      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(0) rotate(0deg); opacity:1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity:0; }
        }
      `}</style>
    </div>
  )
}

function BreakdownModal({ data, score, level, daysLeft, onClose, onStartStudy, onViewTopics }) {
  const components = [
    { label: 'Coverage',    val: data.coveragePct,    color: '#06B6D4', weight: '30%', desc: 'Topics you\'ve attempted (≥3 questions each), weighted by board exam importance.' },
    { label: 'Mastery',     val: data.masteryPct,     color: '#c9a96e', weight: '30%', desc: 'Your average correct rate across all reviewed topics.' },
    { label: 'Consistency', val: data.consistencyPct, color: '#8B5CF6', weight: '20%', desc: 'Study days in the last 30 days. Showing up consistently compounds over time.' },
    { label: 'Mock Exam',   val: data.mockPct ?? 0,   color: '#F59E0B', weight: '20%', desc: data.mockPct ? 'Your most recent mock board score.' : 'No mock exam taken yet. This is pulling your score down.' },
  ]

  // Find the weakest component
  const weakest = [...components].sort((a, b) => a.val - b.val)[0]

  return (
    <div style={bm.overlay} onClick={onClose}>
      <div style={bm.modal} onClick={e => e.stopPropagation()}>
        <div style={bm.header}>
          <div>
            <div style={bm.title}>Readiness Score</div>
            <div style={{ ...bm.scoreDisplay, color: level.color }}>{score}% — {level.label}</div>
          </div>
          <button style={bm.closeBtn} onClick={onClose}>✕</button>
        </div>

        {data.estimated && (
          <div style={bm.estimatedNote}>
            📌 Estimated — complete a mock board for a more accurate score.
          </div>
        )}

        <div style={bm.componentList}>
          {components.map(c => (
            <div key={c.label} style={bm.componentRow}>
              <div style={bm.componentHeader}>
                <div style={bm.componentLabel}>{c.label}</div>
                <div style={bm.componentMeta}>
                  <span style={{ ...bm.componentVal, color: c.color }}>{c.val}%</span>
                  <span style={bm.componentWeight}>{c.weight} weight</span>
                </div>
              </div>
              <div style={bm.barTrack}>
                <div style={{ ...bm.barFill, width: `${c.val}%`, background: c.color }} />
              </div>
              <div style={bm.componentDesc}>{c.desc}</div>
            </div>
          ))}
        </div>

        <div style={bm.divider} />

        <div style={bm.insightSection}>
          <div style={bm.insightLabel}>Your biggest opportunity</div>
          <div style={bm.insightText}>
            <strong style={{ color: '#ef4444' }}>{weakest.label}</strong> is your lowest component at {weakest.val}%.
            {weakest.label === 'Mock Exam' && !data.mockPct
              ? ' Taking a mock board exam could significantly improve your score.'
              : ` Improving this area will have the most impact on your Readiness Score.`}
          </div>
        </div>

        <div style={bm.actions}>
          {!data.mockPct ? (
            <button style={bm.actionBtn} onClick={() => { onClose(); onStartStudy() }}>
              Start Studying →
            </button>
          ) : (
            <button style={bm.actionBtn} onClick={() => { onClose(); onViewTopics() }}>
              View Topic Health →
            </button>
          )}
          <button style={bm.ghostBtn} onClick={onClose}>Close</button>
        </div>
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
  const e0 = polarToXY(endAngle, r)
  const s1 = polarToXY(startAngle, r)
  const e1 = polarToXY(fillAngle, r)
  const largeArc = (fillAngle - startAngle) > 180 ? 1 : 0

  return (
    <svg viewBox="0 0 200 110" style={{ width: 200, height: 110, display: 'block', margin: '0 auto' }}>
      <path d={`M ${s0.x},${s0.y} A ${r},${r} 0 1,1 ${e0.x},${e0.y}`}
        fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" strokeLinecap="round" />
      {clamp > 0 && (
        <path d={`M ${s1.x},${s1.y} A ${r},${r} 0 ${largeArc},1 ${e1.x},${e1.y}`}
          fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          style={{ transition: 'stroke 0.4s' }} />
      )}
    </svg>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  root             : { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  scroll           : { flex: 1, overflowY: 'auto', paddingBottom: 8 },
  announcementBanner: { margin: '12px 20px 0', background: 'rgba(201,169,110,0.08)', border: '1px solid rgba(201,169,110,0.25)', borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  announcementContent: { display: 'flex', gap: 8, alignItems: 'flex-start', flex: 1 },
  announcementIcon : { fontSize: 16, flexShrink: 0, marginTop: 1 },
  announcementTitle: { fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 2 },
  announcementBody : { fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 },
  announcementClose: { background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14, padding: 0, flexShrink: 0 },
  heroBanner       : { position: 'relative', width: '100%', height: 160, overflow: 'hidden', marginBottom: -8 },
  heroImg          : { width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block' },
  heroFade         : { position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(13,13,13,0) 0%, rgba(13,13,13,0) 40%, var(--bg-base) 100%)', pointerEvents: 'none' },
  header           : { padding: '24px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  greeting         : { fontSize: 13, color: 'var(--text-muted)' },
  name             : { fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.1 },
  examBadge        : { display: 'inline-block', background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 20, padding: '3px 10px', fontSize: 11, color: 'var(--accent)', fontWeight: 500 },
  phaseBadge       : { fontSize: 10, color: 'var(--text-muted)', textAlign: 'right', marginTop: 3 },
  countdown        : { fontSize: 11, color: 'var(--text-muted)', marginTop: 2 },
  gaugeSection     : { padding: '12px 20px 4px', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  gaugeCenter      : { position: 'absolute', bottom: 28, textAlign: 'center' },
  gaugeScore       : { fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 700, lineHeight: 1 },
  gaugeLevel       : { fontSize: 11, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.5px', marginTop: 2 },
  gaugeEst         : { fontSize: 10, color: 'var(--text-muted)', marginTop: 2 },
  gaugeFooter      : { marginTop: 4 },
  compsGrid        : { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '4px 20px 12px' },
  compCard         : { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '10px 12px', cursor: 'pointer' },
  compLabel        : { fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 3 },
  compVal          : { fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 },
  compBarWrap      : { height: 3, background: 'var(--bg-elevated)', borderRadius: 2, marginTop: 5, overflow: 'hidden' },
  compBarFill      : { height: '100%', borderRadius: 2, transition: 'width .6s' },
  nba              : { margin: '0 20px 12px', background: 'var(--bg-surface)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-lg)', padding: '14px 16px' },
  nbaTag           : { fontSize: 10, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.6px', fontWeight: 600, marginBottom: 6 },
  nbaTitle         : { fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--text-primary)', marginBottom: 4 },
  nbaWhy           : { fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 8 },
  nbaImpact        : { fontSize: 11, color: '#10B981', marginBottom: 10 },
  nbaBtns          : { display: 'flex', gap: 8 },
  btnPrimary       : { flex: 1, background: 'var(--accent)', color: '#0d0d0d', border: 'none', borderRadius: 'var(--radius-md)', padding: '9px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  btnGhost         : { background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: 'var(--radius-md)', padding: '9px 14px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' },
  statsGrid        : { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, padding: '0 20px 12px' },
  statCard         : { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px 8px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 },
  statIcon         : { fontSize: 18, marginBottom: 2 },
  statVal          : { fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 },
  statUnit         : { fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', fontFamily: 'inherit' },
  statSub          : { fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.04em' },
  milestonesRow    : { margin: '0 20px 12px' },
  milestonesLabel  : { fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8, fontWeight: 600 },
  milestoneChips   : { display: 'flex', gap: 6, flexWrap: 'wrap' },
  milestoneChip    : { display: 'flex', alignItems: 'center', gap: 5, background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 20, padding: '4px 12px', fontSize: 11 },
  milestoneChipLabel: { color: 'var(--accent)', fontWeight: 600 },
  updatesFeed      : { margin: '12px 20px 0', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 },
  updatesLabel     : { fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: 600, marginBottom: 2 },
  updateRow        : { display: 'flex', alignItems: 'flex-start', gap: 8 },
  updateIcon       : { fontSize: 14, flexShrink: 0, marginTop: 1 },
  updateTitle      : { fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 1 },
  updateBody       : { fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' },
  insight          : { margin: '0 20px 16px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px 14px' },
  insightHead      : { fontSize: 10, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.6px', fontWeight: 600, marginBottom: 6 },
  insightBody      : { fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 8 },
  insightAction    : { fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 },
}

const bm = {
  overlay       : { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200, padding: '0' },
  modal         : { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '16px 16px 0 0', padding: '24px 20px 40px', width: '100%', maxWidth: 480, maxHeight: '85vh', overflowY: 'auto' },
  header        : { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  title         : { fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 },
  scoreDisplay  : { fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700 },
  closeBtn      : { background: 'none', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-muted)', fontSize: 14, cursor: 'pointer', padding: '4px 10px', fontFamily: 'inherit' },
  estimatedNote : { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5 },
  componentList : { display: 'flex', flexDirection: 'column', gap: 16 },
  componentRow  : { display: 'flex', flexDirection: 'column', gap: 5 },
  componentHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  componentLabel: { fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' },
  componentMeta : { display: 'flex', gap: 8, alignItems: 'center' },
  componentVal  : { fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 },
  componentWeight: { fontSize: 10, color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: 4 },
  barTrack      : { height: 6, background: 'var(--bg-elevated)', borderRadius: 3, overflow: 'hidden' },
  barFill       : { height: '100%', borderRadius: 3, transition: 'width .6s' },
  componentDesc : { fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 },
  divider       : { height: 1, background: 'var(--border)', margin: '16px 0' },
  insightSection: { marginBottom: 16 },
  insightLabel  : { fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 },
  insightText   : { fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 },
  actions       : { display: 'flex', gap: 8 },
  actionBtn     : { flex: 1, background: 'var(--accent)', color: '#0d0d0d', border: 'none', borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  ghostBtn      : { padding: '12px 16px', background: 'none', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' },
}
