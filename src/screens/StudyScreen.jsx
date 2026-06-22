import { useState, useEffect } from 'react'
import {
  getCardsForExam, getCardReviews, getDueCards, saveCardReview,
  startSession, endSession, upsertTopicHealth,
  computeHealthState, getTopicHealth,
} from '../lib/supabase.js'

const MODE_SIZES = { Light: 10, Standard: 25, Intensive: 50, 'Exam Sprint': 80 }

// ─── Markdown renderer (same as LessonScreen) ─────────────────────────────────
function renderMarkdown(text) {
  if (!text) return ""

  const lines = text.split("\n")
  let html = ""
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Blank line
    if (!line.trim()) { i++; continue }

    // Headings
    if (line.startsWith("### ")) { html += `<h3 style="font-size:14px;font-weight:700;color:var(--text-primary);margin:14px 0 6px;line-height:1.3">${inlineFormat(line.slice(4))}</h3>`; i++; continue }
    if (line.startsWith("## "))  { html += `<h2 style="font-size:15px;font-weight:700;color:var(--text-primary);margin:16px 0 8px;line-height:1.3">${inlineFormat(line.slice(3))}</h2>`; i++; continue }
    if (line.startsWith("# "))   { html += `<h1 style="font-size:16px;font-weight:800;color:var(--text-primary);margin:18px 0 8px;line-height:1.3">${inlineFormat(line.slice(2))}</h1>`; i++; continue }

    // Horizontal rule
    if (line.trim() === "---" || line.trim() === "***") { html += `<hr style="border:none;border-top:1px solid var(--border);margin:12px 0"/>`; i++; continue }

    // Blockquote
    if (line.startsWith("> ")) {
      let bq = ""
      while (i < lines.length && lines[i].startsWith("> ")) { bq += inlineFormat(lines[i].slice(2)) + " "; i++ }
      html += `<blockquote style="border-left:3px solid var(--accent);padding:6px 12px;margin:8px 0;color:var(--text-secondary);font-style:italic;background:var(--bg-elevated);border-radius:0 6px 6px 0">${bq.trim()}</blockquote>`
      continue
    }

    // Code block
    if (line.startsWith("```")) {
      i++
      let code = ""
      while (i < lines.length && !lines[i].startsWith("```")) { code += lines[i] + "\n"; i++ }
      i++ // skip closing ```
      html += `<pre style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:6px;padding:10px;overflow-x:auto;margin:8px 0"><code style="font-size:11px;color:var(--text-primary);line-height:1.6;white-space:pre;font-family:monospace">${escHtml(code.trimEnd())}</code></pre>`
      continue
    }

    // Unordered list
    if (line.match(/^[-*+] /)) {
      let items = ""
      while (i < lines.length && lines[i].match(/^[-*+] /)) {
        items += `<li style="margin:3px 0;line-height:1.6">${inlineFormat(lines[i].slice(2))}</li>`
        i++
      }
      html += `<ul style="margin:6px 0;padding-left:18px;color:var(--text-secondary)">${items}</ul>`
      continue
    }

    // Numbered list
    if (line.match(/^\d+\. /)) {
      let items = ""
      while (i < lines.length && lines[i].match(/^\d+\. /)) {
        items += `<li style="margin:3px 0;line-height:1.6">${inlineFormat(lines[i].replace(/^\d+\. /, ""))}</li>`
        i++
      }
      html += `<ol style="margin:6px 0;padding-left:18px;color:var(--text-secondary)">${items}</ol>`
      continue
    }

    // Table
    if (line.includes("|") && line.trim().startsWith("|")) {
      const tableLines = []
      while (i < lines.length && lines[i].includes("|")) { tableLines.push(lines[i]); i++ }
      const rows = tableLines.filter(r => !r.match(/^[|\s-:]+$/))
      let tableHtml = `<div style="overflow-x:auto;margin:8px 0"><table style="width:100%;border-collapse:collapse;font-size:11px">`
      rows.forEach((row, ri) => {
        const cells = row.split("|").filter((_, ci) => ci > 0 && ci < row.split("|").length - 1)
        const tag = ri === 0 ? "th" : "td"
        const rowStyle = ri === 0 ? "background:var(--bg-elevated)" : ri % 2 === 0 ? "background:var(--bg-surface)" : ""
        tableHtml += `<tr style="${rowStyle}">${cells.map(c => `<${tag} style="padding:6px 10px;border:1px solid var(--border);text-align:left;color:var(--text-primary)">${inlineFormat(c.trim())}</${tag}>`).join("")}</tr>`
      })
      tableHtml += "</table></div>"
      html += tableHtml
      continue
    }

    // Regular paragraph
    let para = ""
    while (i < lines.length && lines[i].trim() && !lines[i].match(/^[#>\-*+\d`|]/) && lines[i].trim() !== "---") {
      para += (para ? " " : "") + lines[i]
      i++
    }
    if (para) html += `<p style="margin:6px 0;line-height:1.7;color:var(--text-secondary)">${inlineFormat(para)}</p>`
  }

  return html
}

function inlineFormat(text) {
  return text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong style=\"color:var(--text-primary)\">$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code style=\"background:var(--bg-elevated);padding:1px 5px;border-radius:4px;font-size:11px;font-family:monospace;color:var(--accent)\">$1</code>")
}

function escHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}
// ─────────────────────────────────────────────────────────────────────────────

export default function StudyScreen({ customer, studentExam, onDone }) {
  const [phase,    setPhase]    = useState('loading') // loading | session | summary
  const [cards,    setCards]    = useState([])
  const [idx,      setIdx]      = useState(0)
  const [answered, setAnswered] = useState(false)
  const [chosen,   setChosen]   = useState(null)
  const [conf,     setConf]     = useState(null)
  const [results,  setResults]  = useState([]) // {cardId, topicId, correct, confidence}
  const [sessionId,setSessionId]= useState(null)
  const [summary,  setSummary]  = useState(null)
  const [healthBefore, setHealthBefore] = useState({})

  const mode     = studentExam?.study_mode || 'Standard'
  const target   = MODE_SIZES[mode] || 25
  const examId   = studentExam?.exam_id

  useEffect(() => {
    if (customer?.id && examId) buildQueue()
  }, [customer?.id, examId])

  async function buildQueue() {
    setPhase('loading')
    try {
      const healthMap = await getTopicHealth(customer.id)
      setHealthBefore(healthMap)

      const allCards = await getCardsForExam(examId)
      if (!allCards.length) { setCards([]); setPhase('no-cards'); return }

      // Get all review records for this student
      const allReviews = await getCardReviews(customer.id)
      const reviewMap  = {}
      for (const r of allReviews) reviewMap[r.card_id] = r

      const today = new Date().toISOString().split('T')[0]

      // Categorize cards into 3 buckets:
      // 1. Due (next_review_at <= today) — highest priority, needs review
      // 2. Unseen (never reviewed) — medium priority
      // 3. Not due (next_review_at > today) — skip unless queue is short
      const dueCards    = []
      const unseenCards = []
      const notDueCards = []

      for (const card of allCards) {
        const review = reviewMap[card.id]
        if (!review) {
          unseenCards.push(card)
        } else if (review.next_review_at <= today) {
          dueCards.push(card)
        } else {
          notDueCards.push(card)
        }
      }

      // Shuffle each pool
      const shuffle = arr => [...arr].sort(() => Math.random() - 0.5)
      const shuffledDue    = shuffle(dueCards)
      const shuffledUnseen = shuffle(unseenCards)
      const shuffledNotDue = shuffle(notDueCards)

      // Round-robin across topics for unseen cards
      function spreadAcrossTopics(cards) {
        const buckets = {}
        for (const c of cards) {
          const tid = c.topic_id || 'x'
          if (!buckets[tid]) buckets[tid] = []
          buckets[tid].push(c)
        }
        const lists = Object.values(buckets)
        const result = []
        let i = 0
        while (result.length < cards.length) {
          const b = lists[i % lists.length]
          if (b && b.length > 0) result.push(b.shift())
          i++
          if (lists.every(l => l.length === 0)) break
        }
        return result
      }

      const spreadUnseen = spreadAcrossTopics(shuffledUnseen)
      const spreadNotDue = spreadAcrossTopics(shuffledNotDue)

      // Fill queue: due first (max 40%), then unseen (spread), then not-due as fallback
      const dueSlots    = Math.min(shuffledDue.length,  Math.floor(target * 0.4))
      const unseenSlots = Math.min(spreadUnseen.length, target - dueSlots)
      const fallback    = target - dueSlots - unseenSlots

      let queue = [
        ...shuffledDue.slice(0, dueSlots),
        ...spreadUnseen.slice(0, unseenSlots),
        ...spreadNotDue.slice(0, fallback),
      ]

      // Final shuffle so due cards don't cluster
      queue = shuffle(queue)

      if (!queue.length) { setCards([]); setPhase('no-cards'); return }

      const sess = await startSession(customer.id, examId, 'Foundation')
      setSessionId(sess?.id)
      setCards(queue)
      setIdx(0)
      setResults([])
      setAnswered(false)
      setChosen(null)
      setConf(null)
      setPhase('session')
    } catch (e) {
      console.error(e)
      setPhase('error')
    }
  }

  function pickAnswer(i) {
    if (answered) return
    setChosen(i)
    setAnswered(true)
  }

  async function nextCard() {
    const card    = cards[idx]
    const correct = chosen === correctIndex

    // Save review
    await saveCardReview(customer.id, card.id, correct, conf)

    const newResults = [...results, { cardId: card.id, topicId: card.topic_id, correct, confidence: conf }]
    setResults(newResults)

    if (idx + 1 >= cards.length) {
      await finishSession(newResults)
    } else {
      setIdx(i => i + 1)
      setAnswered(false)
      setChosen(null)
      setConf(null)
    }
  }

  async function finishSession(finalResults) {
    const correct = finalResults.filter(r => r.correct).length
    const total   = finalResults.length

    // End session
    if (sessionId) await endSession(sessionId, total, correct)

    // Update topic health per topic
    const topicMap = {}
    for (const r of finalResults) {
      if (!r.topicId) continue
      if (!topicMap[r.topicId]) topicMap[r.topicId] = { correct: 0, total: 0, streak: 0 }
      topicMap[r.topicId].total++
      if (r.correct) { topicMap[r.topicId].correct++; topicMap[r.topicId].streak++ }
      else topicMap[r.topicId].streak = 0
    }
    const healthChanges = []
    for (const [topicId, stats] of Object.entries(topicMap)) {
      const before    = healthBefore[topicId]
      const newState  = computeHealthState(
        (before?.attempt_count || 0) + stats.total,
        (before?.correct_count || 0) + stats.correct,
        stats.streak
      )
      await upsertTopicHealth(customer.id, topicId, {
        health_state  : newState,
        attempt_count : (before?.attempt_count || 0) + stats.total,
        correct_count : (before?.correct_count || 0) + stats.correct,
        mistake_count : (before?.mistake_count || 0) + (stats.total - stats.correct),
        streak        : stats.streak,
        last_reviewed_at: new Date().toISOString(),
      })
      const topicName = cards.find(c => c.topic_id === topicId)?.topic?.name || 'Topic'
      healthChanges.push({
        name  : topicName,
        before: before?.health_state || 'Stable',
        after : newState,
      })
    }

    setSummary({ correct, total, healthChanges })
    setPhase('summary')
  }

  // ── No cards state ────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div style={s.center}>
        <div style={s.loading}>Building your session…</div>
      </div>
    )
  }

  if (phase === 'no-cards') {
    return (
      <div style={s.center}>
        <div style={s.emptyIcon}>📭</div>
        <div style={s.emptyTitle}>No cards yet</div>
        <div style={s.emptySub}>Your question bank is being prepared. Check back soon.</div>
        <button style={s.doneBtn} onClick={onDone}>Back to Home</button>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div style={s.center}>
        <div style={s.emptyTitle}>Something went wrong</div>
        <button style={s.doneBtn} onClick={buildQueue}>Try again</button>
      </div>
    )
  }

  // ── Study Receipt ────────────────────────────────────────────────────────
  if (phase === 'summary' && summary) {
    const pct         = Math.round((summary.correct / summary.total) * 100)
    const missed      = summary.total - summary.correct
    const grade       = pct >= 80 ? 'Strong' : pct >= 60 ? 'Good' : 'Keep Going'
    const gradeColor  = pct >= 80 ? '#10B981' : pct >= 60 ? 'var(--accent)' : '#e05c5c'
    const gradeEmoji  = pct >= 80 ? '🔥' : pct >= 60 ? '💪' : '📖'
    const worstTopic  = summary.healthChanges.find(h => h.after === 'Critical' || h.after === 'Weak')
    const improvedTopics = summary.healthChanges.filter(h => h.before !== h.after)

    const coachLine = pct >= 80
      ? 'Outstanding session. Your recall is strong — keep this up and your readiness score will reflect it.'
      : pct >= 60
      ? worstTopic
        ? `Good effort. Focus on ${worstTopic.name} next — it needs one more strong session.`
        : 'Good session. Consistency over time is what moves the score. Come back tomorrow.'
      : worstTopic
        ? `${worstTopic.name} needs attention. Review the rationales for your missed questions before your next session.`
        : 'Every session builds your foundation. The missed ones are exactly what you need to review.'

    return (
      <div style={s.root}>
        <div style={s.scroll}>
          <div style={s.summaryWrap}>

            {/* Score ring */}
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginBottom:24 }}>
              <div style={{
                width:110, height:110, borderRadius:'50%',
                border:`4px solid ${gradeColor}`,
                display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                background:'var(--bg-elevated)', marginBottom:12,
                boxShadow:`0 0 24px ${gradeColor}30`,
              }}>
                <div style={{ fontSize:28, lineHeight:1 }}>{gradeEmoji}</div>
                <div style={{ fontFamily:'var(--font-display)', fontSize:26, fontWeight:800, color:gradeColor, lineHeight:1.1 }}>{pct}%</div>
                <div style={{ fontSize:9, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.05em' }}>accuracy</div>
              </div>
              <div style={{ fontFamily:'var(--font-display)', fontSize:22, color:'var(--text-primary)', marginBottom:4 }}>
                {grade} Session
              </div>
              <div style={{ fontSize:12, color:'var(--text-muted)' }}>
                {summary.total} cards reviewed · {summary.correct} correct · {missed} missed
              </div>
            </div>

            {/* Stats grid */}
            <div style={s.statsRow}>
              {[
                { val: summary.total,   label: 'Reviewed', color: 'var(--accent)',   icon: '📚' },
                { val: summary.correct, label: 'Correct',  color: '#10B981',         icon: '✅' },
                { val: missed,          label: 'Missed',   color: missed === 0 ? '#10B981' : '#e05c5c', icon: missed === 0 ? '🏆' : '❌' },
              ].map(stat => (
                <div key={stat.label} style={s.statBox}>
                  <div style={{ fontSize:18, marginBottom:4 }}>{stat.icon}</div>
                  <div style={{ ...s.statNum, color: stat.color }}>{stat.val}</div>
                  <div style={s.statLabel}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Topic changes */}
            {summary.healthChanges.length > 0 && (
              <div style={s.healthCard}>
                <div style={s.healthTitle}>Topic Health This Session</div>
                {summary.healthChanges.map((h, i) => (
                  <div key={i} style={s.healthRow}>
                    <span style={{ fontSize:12, color:'var(--text-secondary)', flex:1 }}>{h.name}</span>
                    <span style={{ fontSize:11, fontWeight:600, color: getHealthColor(h.after) }}>
                      {h.before !== h.after ? `${h.before} → ${h.after} ↑` : h.after}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Coach insight */}
            <div style={s.insightCard}>
              <div style={s.insightHead}>🧠 Coach</div>
              <div style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.7 }}>
                {coachLine}
              </div>
            </div>

            {/* Next step hint */}
            {worstTopic && (
              <div style={{ background:'var(--bg-elevated)', border:'1px solid var(--border)', borderLeft:`3px solid #e05c5c`, borderRadius:'var(--radius-md)', padding:'10px 14px' }}>
                <div style={{ fontSize:10, color:'#e05c5c', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:4, fontWeight:700 }}>Focus Next</div>
                <div style={{ fontSize:13, color:'var(--text-primary)' }}>{worstTopic.name}</div>
                <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>This topic needs one more focused session</div>
              </div>
            )}

            <div style={s.summaryBtns}>
              <button style={s.btnPrimary} onClick={onDone}>Done ✓</button>
              <button style={s.btnGhost} onClick={buildQueue}>Study More</button>
            </div>

          </div>
        </div>
      </div>
    )
  }

  // ── Active session ────────────────────────────────────────────────────────
  const card = cards[idx]
  if (!card) return null
  // Parse choices from question format: "Question [A) opt1 | B) opt2 | C) opt3 | D) opt4]"
  // or use card.choices if available (legacy format)
  let choices = []
  let correctIndex = 0
  if (Array.isArray(card.choices) && card.choices.length > 0) {
    choices = card.choices
    correctIndex = card.correct_index || 0
  } else {
    // Parse from question string format
    const match = card.question?.match(/\[([^\]]+)\]$/)
    if (match) {
      const parts = match[1].split('|').map(p => p.trim())
      choices = parts.map(p => p.replace(/^[A-D]\)\s*/, '').trim())
      // Find correct answer index
      const answerText = card.answer?.trim()
      correctIndex = choices.findIndex(c => c === answerText)
      if (correctIndex === -1) correctIndex = 0
    } else {
      // Fallback: treat answer as single choice
      choices = [card.answer || 'True', 'False']
      correctIndex = 0
    }
  }

  return (
    <div style={s.root}>
      <div style={s.scroll}>
        {/* Header */}
        <div style={s.sessionHeader}>
          <div>
            <div style={s.topicLabel}>{card.topic?.name || 'Board Review'}</div>
            <div style={s.sessionTitle}>Today's Session</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <div style={s.modeBadge}>{mode}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{idx + 1}/{cards.length}</div>
          </div>
        </div>

        {/* Progress */}
        <div style={s.progressWrap}>
          <div style={s.progressMeta}>
            <span>Card {idx + 1} of {cards.length}</span>
            <span>{Math.round((idx / cards.length) * 100)}%</span>
          </div>
          <div style={s.progressBar}>
            <div style={{ ...s.progressFill, width: `${(idx / cards.length) * 100}%` }} />
          </div>
        </div>

        {/* Card */}
        <div style={s.cardWrap}>
          {/* Tags row */}
          <div style={s.tagRow}>
            {card.difficulty && (
              <span style={{ ...s.tag, background: '#1A2D1A', color: '#10B981' }}>{card.difficulty}</span>
            )}
            {card.bloom_level && (
              <span style={{ ...s.tag, background: '#2D1A2A', color: '#8B5CF6' }}>{card.bloom_level}</span>
            )}
            {card.topic?.board_frequency && (
              <span style={{ ...s.tag, background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                {card.topic.board_frequency} freq
              </span>
            )}
          </div>

          {/* Question */}
          <div style={s.question}>{card.question}</div>

          {/* Choices */}
          <div style={s.choices}>
            {choices.map((choice, i) => {
              const letters = ['A', 'B', 'C', 'D']
              let border = 'var(--border)', bg = 'var(--bg-elevated)', color = 'var(--text-secondary)', letterColor = 'var(--text-muted)'
              if (answered) {
                if (i === correctIndex)                       { border = '#10B981'; bg = 'rgba(16,185,129,0.10)'; color = '#10B981'; letterColor = '#10B981' }
                else if (i === chosen && i !== correctIndex)  { border = '#e05c5c'; bg = 'rgba(224,92,92,0.10)';  color = '#e05c5c'; letterColor = '#e05c5c' }
                else { color = 'var(--text-muted)'; letterColor = 'var(--text-muted)' }
              } else if (!answered) {
                border = 'var(--border-strong)'
              }
              return (
                <button key={i} onClick={() => pickAnswer(i)} disabled={answered} style={{
                  background: bg, border: `1.5px solid ${border}`,
                  borderRadius: 'var(--radius-md)', padding: '12px 14px',
                  fontSize: 13, cursor: answered ? 'default' : 'pointer',
                  textAlign: 'left', color, fontFamily: 'inherit',
                  transition: 'all 0.15s', display: 'flex', alignItems: 'flex-start', gap: 10,
                }}>
                  <span style={{ fontWeight: 700, color: letterColor, minWidth: 16, fontSize: 12, marginTop: 1 }}>{letters[i]}</span>
                  <span>{choice}</span>
                </button>
              )
            })}
          </div>

          {/* Explanation */}
          {answered && card.explanation && (
            <div style={s.explanation}
              dangerouslySetInnerHTML={{ __html: renderMarkdown(card.explanation) }}
            />
          )}
        </div>

        {/* Confidence — shown prominently after answering */}
        {answered && (
          <>
            <div style={s.confSection}>
              <div style={s.confLabel}>How confident were you?</div>
              <div style={s.confRow}>
                {[
                  { label: 'Sure',    emoji: '✅', color: '#10B981' },
                  { label: 'Guessed', emoji: '🤔', color: 'var(--accent)' },
                  { label: 'No Idea', emoji: '❌', color: '#e05c5c' },
                ].map(({ label, emoji, color }) => (
                  <button key={label} onClick={() => setConf(label)} style={{
                    flex: 1, padding: '12px 8px',
                    background: conf === label ? `rgba(${color === '#10B981' ? '16,185,129' : color === '#e05c5c' ? '224,92,92' : '201,169,110'},0.15)` : 'var(--bg-surface)',
                    border: `2px solid ${conf === label ? color : 'var(--border)'}`,
                    borderRadius: 'var(--radius-md)', fontSize: 12, fontWeight: conf === label ? 700 : 400,
                    color: conf === label ? color : 'var(--text-muted)',
                    cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  }}>
                    <span style={{ fontSize: 18 }}>{emoji}</span>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <button style={s.nextBtn} onClick={nextCard}>
              {idx + 1 >= cards.length ? '🏁 Finish Session' : 'Next Card →'}
            </button>
          </>
        )}

        <div style={{ height: 16 }} />
      </div>
    </div>
  )
}

function getHealthColor(state) {
  return { Critical: '#e05c5c', Weak: '#F59E0B', Stable: '#EAB308', Strong: '#10B981', Mastered: 'var(--accent)' }[state] || 'var(--text-muted)'
}

const s = {
  root          : { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  scroll        : { flex: 1, overflowY: 'auto', paddingBottom: 12 },
  center        : { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  loading       : { fontSize: 14, color: 'var(--text-muted)' },
  emptyIcon     : { fontSize: 40, marginBottom: 8 },
  emptyTitle    : { fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--text-primary)' },
  emptySub      : { fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.6 },
  doneBtn       : { marginTop: 8, padding: '12px 28px', background: 'var(--accent)', color: '#0d0d0d', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  // Header
  sessionHeader : { padding: '16px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  topicLabel    : { fontSize: 10, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 600, marginBottom: 2 },
  sessionTitle  : { fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--text-primary)' },
  modeBadge     : { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 20, padding: '3px 10px', fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 },
  // Progress
  progressWrap  : { padding: '10px 20px' },
  progressMeta  : { display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginBottom: 5 },
  progressBar   : { height: 3, background: 'var(--bg-elevated)', borderRadius: 2, overflow: 'hidden' },
  progressFill  : { height: '100%', background: 'var(--accent)', borderRadius: 2, transition: 'width .4s' },
  // Card
  cardWrap      : { margin: '0 16px', background: 'var(--bg-surface)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-xl)', padding: '20px 18px', boxShadow: '0 2px 12px rgba(0,0,0,0.15)' },
  tagRow        : { display: 'flex', gap: 5, marginBottom: 12, flexWrap: 'wrap' },
  tag           : { fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 600 },
  question      : { fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--text-primary)', lineHeight: 1.65, marginBottom: 18 },
  choices       : { display: 'flex', flexDirection: 'column', gap: 9 },
  explanation   : { marginTop: 14, padding: '12px 14px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent)', borderRadius: '0 var(--radius-md) var(--radius-md) 0', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 },
  // Confidence — upgraded
  confSection   : { margin: '12px 16px 0' },
  confLabel     : { fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.05em' },
  confRow       : { display: 'flex', gap: 8 },
  nextBtn       : { margin: '12px 16px 0', width: 'calc(100% - 32px)', background: 'var(--accent)', color: '#0d0d0d', border: 'none', borderRadius: 'var(--radius-md)', padding: '14px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '.01em' },
  // Summary
  summaryWrap   : { padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 12 },
  summaryH      : { fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--text-primary)', marginBottom: 2 },
  summarySub    : { fontSize: 13, color: 'var(--text-muted)' },
  statsRow      : { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 },
  statBox       : { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px 10px', textAlign: 'center' },
  statNum       : { fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700 },
  statLabel     : { fontSize: 10, color: 'var(--text-muted)', marginTop: 3, textTransform: 'uppercase', letterSpacing: '.04em' },
  healthCard    : { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px 14px' },
  healthTitle   : { fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 },
  healthRow     : { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 12 },
  insightCard   : { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px 14px' },
  insightHead   : { fontSize: 10, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: 600, marginBottom: 6 },
  summaryBtns   : { display: 'flex', gap: 8 },
  btnPrimary    : { flex: 2, background: 'var(--accent)', color: '#0d0d0d', border: 'none', borderRadius: 'var(--radius-md)', padding: 13, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  btnGhost      : { flex: 1, background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: 'var(--radius-md)', padding: 13, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' },
}
