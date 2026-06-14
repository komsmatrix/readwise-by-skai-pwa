import { useState, useEffect } from 'react'
import {
  getCardsForExam, getDueCards, saveCardReview,
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
      // Get health snapshot before session
      const healthMap = await getTopicHealth(customer.id)
      setHealthBefore(healthMap)

      // Get all available cards for this exam
      const allCards = await getCardsForExam(examId)
      if (!allCards.length) {
        setCards([])
        setPhase('no-cards')
        return
      }

      // Get due cards
      const due = await getDueCards(customer.id)
      const dueCardIds = new Set(due.map(d => d.card_id))

      // Priority: due cards first, then unseen, then random
      const dueCards    = allCards.filter(c => dueCardIds.has(c.id))
      const unseenCards = allCards.filter(c => !dueCardIds.has(c.id))

      let queue = [...dueCards, ...unseenCards].slice(0, target)

      // Shuffle
      queue = queue.sort(() => Math.random() - 0.5)

      // Start session in DB
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

  // ── Summary ───────────────────────────────────────────────────────────────
  if (phase === 'summary' && summary) {
    const pct = Math.round((summary.correct / summary.total) * 100)
    return (
      <div style={s.root}>
        <div style={s.scroll}>
          <div style={s.summaryWrap}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>🎯</div>
              <div style={s.summaryH}>Session Complete</div>
              <div style={s.summarySub}>{pct}% correct · {summary.total} cards reviewed</div>
            </div>

            <div style={s.statsRow}>
              {[
                { val: summary.total,   label: 'reviewed',  color: 'var(--accent)'  },
                { val: summary.correct, label: 'correct',   color: '#10B981'        },
                { val: summary.total - summary.correct, label: 'missed', color: '#e05c5c' },
              ].map(stat => (
                <div key={stat.label} style={s.statBox}>
                  <div style={{ ...s.statNum, color: stat.color }}>{stat.val}</div>
                  <div style={s.statLabel}>{stat.label}</div>
                </div>
              ))}
            </div>

            {summary.healthChanges.length > 0 && (
              <div style={s.healthCard}>
                <div style={s.healthTitle}>Topic Health Changes</div>
                {summary.healthChanges.map((h, i) => (
                  <div key={i} style={s.healthRow}>
                    <span style={{ fontSize: 12 }}>{h.name}</span>
                    <span style={{ fontSize: 11, fontWeight: 500, color: getHealthColor(h.after) }}>
                      {h.before !== h.after ? `${h.before} → ${h.after}` : h.after}
                      {h.before !== h.after ? ' ↑' : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div style={s.insightCard}>
              <div style={s.insightHead}>🧠 Coach Insight</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                {summary.correct / summary.total >= 0.8
                  ? 'Strong session. Keep this consistency and your readiness score will climb steadily.'
                  : 'Review the topics you missed — focus on high board-frequency questions first.'}
              </div>
            </div>

            <div style={s.summaryBtns}>
              <button style={s.btnPrimary} onClick={onDone}>Done</button>
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
          <div style={s.modeBadge}>{mode}</div>
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
          {/* Tags */}
          <div style={s.tagRow}>
            <span style={{ ...s.tag, background: '#1A2D1A', color: '#10B981' }}>{card.difficulty}</span>
            <span style={{ ...s.tag, background: '#2D1A2A', color: '#8B5CF6' }}>{card.bloom_level}</span>
            {card.topic?.board_frequency && (
              <span style={{ ...s.tag, background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                {card.topic.board_frequency}
              </span>
            )}
          </div>

          {/* Question */}
          <div style={s.question}>{card.question}</div>

          {/* Choices */}
          <div style={s.choices}>
            {choices.map((choice, i) => {
              let border = 'var(--border)', bg = 'var(--bg-elevated)', color = 'var(--text-primary)'
              if (answered) {
                if (i === correctIndex)            { border = '#10B981'; bg = 'rgba(16,185,129,0.08)'; color = '#10B981' }
                else if (i === chosen && i !== correctIndex) { border = '#e05c5c'; bg = 'rgba(224,92,92,0.08)'; color = '#e05c5c' }
                else { color = 'var(--text-muted)' }
              }
              return (
                <button key={i} onClick={() => pickAnswer(i)} style={{
                  background: bg, border: `1.5px solid ${border}`,
                  borderRadius: 'var(--radius-md)', padding: '11px 14px',
                  fontSize: 13, cursor: answered ? 'default' : 'pointer',
                  textAlign: 'left', color, fontFamily: 'inherit',
                  transition: 'all 0.15s',
                }}>
                  {choice}
                </button>
              )
            })}
          </div>

          {/* Explanation — with markdown rendering */}
          {answered && card.explanation && (
            <div
              style={s.explanation}
              dangerouslySetInnerHTML={{ __html: renderMarkdown(card.explanation) }}
            />
          )}
        </div>

        {/* Confidence + Next */}
        {answered && (
          <>
            <div style={s.confRow}>
              {[['Sure', '#10B981'], ['Guessed', 'var(--accent)'], ['No Idea', '#e05c5c']].map(([label, color]) => (
                <button key={label} onClick={() => setConf(label)} style={{
                  flex: 1, padding: '8px 6px',
                  background: conf === label ? `${color}18` : 'var(--bg-surface)',
                  border: `1.5px solid ${conf === label ? color : 'var(--border)'}`,
                  borderRadius: 'var(--radius-md)', fontSize: 11,
                  color: conf === label ? color : 'var(--text-muted)',
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                }}>
                  {label}
                </button>
              ))}
            </div>
            <button style={s.nextBtn} onClick={nextCard}>
              {idx + 1 >= cards.length ? 'Finish Session' : 'Next Card →'}
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
  scroll        : { flex: 1, overflowY: 'auto' },
  center        : { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  loading       : { fontSize: 14, color: 'var(--text-muted)' },
  emptyIcon     : { fontSize: 40, marginBottom: 8 },
  emptyTitle    : { fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--text-primary)' },
  emptySub      : { fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.6 },
  doneBtn       : { marginTop: 8, padding: '12px 28px', background: 'var(--accent)', color: '#0d0d0d', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' },
  sessionHeader : { padding: '20px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  topicLabel    : { fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 },
  sessionTitle  : { fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--text-primary)' },
  modeBadge     : { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 20, padding: '4px 10px', fontSize: 10, color: 'var(--text-muted)' },
  progressWrap  : { padding: '12px 20px' },
  progressMeta  : { display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5 },
  progressBar   : { height: 4, background: 'var(--bg-elevated)', borderRadius: 2, overflow: 'hidden' },
  progressFill  : { height: '100%', background: 'var(--accent)', borderRadius: 2, transition: 'width .4s' },
  cardWrap      : { margin: '0 20px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20 },
  tagRow        : { display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' },
  tag           : { fontSize: 10, padding: '2px 7px', borderRadius: 10, fontWeight: 500 },
  question      : { fontFamily: 'var(--font-display)', fontSize: 15, color: 'var(--text-primary)', lineHeight: 1.6, marginBottom: 16 },
  choices       : { display: 'flex', flexDirection: 'column', gap: 8 },
  explanation   : { marginTop: 12, padding: '10px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 },
  confRow       : { display: 'flex', gap: 6, padding: '10px 20px 0' },
  nextBtn       : { margin: '10px 20px 0', width: 'calc(100% - 40px)', background: 'var(--accent)', color: '#0d0d0d', border: 'none', borderRadius: 'var(--radius-md)', padding: 12, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' },
  summaryWrap   : { padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 12 },
  summaryH      : { fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--text-primary)', marginBottom: 4 },
  summarySub    : { fontSize: 13, color: 'var(--text-muted)' },
  statsRow      : { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 },
  statBox       : { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 10, textAlign: 'center' },
  statNum       : { fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700 },
  statLabel     : { fontSize: 10, color: 'var(--text-muted)', marginTop: 2 },
  healthCard    : { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px 14px' },
  healthTitle   : { fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 },
  healthRow     : { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid var(--border)', fontSize: 12 },
  insightCard   : { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px 14px' },
  insightHead   : { fontSize: 10, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: 600, marginBottom: 5 },
  summaryBtns   : { display: 'flex', gap: 8 },
  btnPrimary    : { flex: 2, background: 'var(--accent)', color: '#0d0d0d', border: 'none', borderRadius: 'var(--radius-md)', padding: 12, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' },
  btnGhost      : { flex: 1, background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: 'var(--radius-md)', padding: 12, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' },
}
