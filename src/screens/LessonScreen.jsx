import { useState, useEffect } from "react";

// ─── Supabase config ──────────────────────────────────────────────────────────
const SUPA_URL = import.meta.env.VITE_SUPABASE_URL
const SUPA_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

async function sbFetch(path, options = {}) {
  const res = await fetch(`${SUPA_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      'apikey': SUPA_KEY,
      'Authorization': `Bearer ${SUPA_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...(options.headers || {}),
    },
  })
  if (!res.ok) throw new Error(await res.text())
  const text = await res.text()
  return text ? JSON.parse(text) : []
}

// ─── Markdown renderer ────────────────────────────────────────────────────────
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
    if (line.startsWith("### ")) { html += `<h3 style="font-size:16px;font-weight:700;color:var(--text-primary);margin:20px 0 8px;line-height:1.3">${inlineFormat(line.slice(4))}</h3>`; i++; continue }
    if (line.startsWith("## "))  { html += `<h2 style="font-size:19px;font-weight:700;color:var(--text-primary);margin:24px 0 10px;line-height:1.3">${inlineFormat(line.slice(3))}</h2>`; i++; continue }
    if (line.startsWith("# "))   { html += `<h1 style="font-size:22px;font-weight:800;color:var(--text-primary);margin:28px 0 12px;line-height:1.3">${inlineFormat(line.slice(2))}</h1>`; i++; continue }

    // Horizontal rule
    if (line.trim() === "---" || line.trim() === "***") { html += `<hr style="border:none;border-top:1px solid var(--border);margin:20px 0"/>`; i++; continue }

    // Blockquote
    if (line.startsWith("> ")) {
      let bq = ""
      while (i < lines.length && lines[i].startsWith("> ")) { bq += inlineFormat(lines[i].slice(2)) + " "; i++ }
      html += `<blockquote style="border-left:3px solid var(--accent);padding:8px 14px;margin:12px 0;color:var(--text-secondary);font-style:italic;background:var(--bg-elevated);border-radius:0 8px 8px 0">${bq.trim()}</blockquote>`
      continue
    }

    // Code block
    if (line.startsWith("```")) {
      i++
      let code = ""
      while (i < lines.length && !lines[i].startsWith("```")) { code += lines[i] + "\n"; i++ }
      i++ // skip closing ```
      html += `<pre style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:8px;padding:14px;overflow-x:auto;margin:12px 0"><code style="font-size:12px;color:var(--text-primary);line-height:1.6;white-space:pre;font-family:monospace">${escHtml(code.trimEnd())}</code></pre>`
      continue
    }

    // Unordered list
    if (line.match(/^[-*+] /)) {
      let items = ""
      while (i < lines.length && lines[i].match(/^[-*+] /)) {
        items += `<li style="margin:4px 0;line-height:1.7">${inlineFormat(lines[i].slice(2))}</li>`
        i++
      }
      html += `<ul style="margin:10px 0;padding-left:20px;color:var(--text-secondary)">${items}</ul>`
      continue
    }

    // Numbered list
    if (line.match(/^\d+\. /)) {
      let items = ""
      while (i < lines.length && lines[i].match(/^\d+\. /)) {
        items += `<li style="margin:4px 0;line-height:1.7">${inlineFormat(lines[i].replace(/^\d+\. /, ""))}</li>`
        i++
      }
      html += `<ol style="margin:10px 0;padding-left:20px;color:var(--text-secondary)">${items}</ol>`
      continue
    }

    // Table
    if (line.includes("|") && line.trim().startsWith("|")) {
      const tableLines = []
      while (i < lines.length && lines[i].includes("|")) { tableLines.push(lines[i]); i++ }
      const rows = tableLines.filter(r => !r.match(/^[|\s-:]+$/))
      let tableHtml = `<div style="overflow-x:auto;margin:12px 0"><table style="width:100%;border-collapse:collapse;font-size:13px">`
      rows.forEach((row, ri) => {
        const cells = row.split("|").filter((_,ci) => ci > 0 && ci < row.split("|").length - 1)
        const tag = ri === 0 ? "th" : "td"
        const rowStyle = ri === 0 ? "background:var(--bg-elevated)" : ri % 2 === 0 ? "background:var(--bg-surface)" : ""
        tableHtml += `<tr style="${rowStyle}">${cells.map(c => `<${tag} style="padding:8px 12px;border:1px solid var(--border);text-align:left;color:var(--text-primary)">${inlineFormat(c.trim())}</${tag}>`).join("")}</tr>`
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
    if (para) html += `<p style="margin:10px 0;line-height:1.8;color:var(--text-secondary)">${inlineFormat(para)}</p>`
  }

  return html
}

function inlineFormat(text) {
  return text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong style=\"color:var(--text-primary)\">$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code style=\"background:var(--bg-elevated);padding:2px 6px;border-radius:4px;font-size:12px;font-family:monospace;color:var(--accent)\">$1</code>")
}

function escHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function freqColor(freq) {
  return { "Very High": "#ef4444", "High": "#f97316", "Medium": "#eab308", "Low": "#6b7280" }[freq] || "#6b7280";
}

export default function LessonScreen({ session, onBack }) {
  const [subjects,  setSubjects]  = useState([]);  // [{id, name, color, topics:[...]}]
  const [expanded,  setExpanded]  = useState({});  // subjectId → bool
  const [selected,  setSelected]  = useState(null);
  const [lessons,   setLessons]   = useState([]);
  const [activeId,  setActiveId]  = useState(null);
  const [progress,  setProgress]  = useState({});
  const [loading,   setLoading]   = useState(true);
  const [lessonLoading, setLL]    = useState(false);
  const [view,      setView]      = useState("list");

  const customerId = session?.customerId;

  // ── Load subjects + topics ────────────────────────────────────────────────
  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [subs, tops] = await Promise.all([
      sbFetch('subjects?select=id,name,color,weight_pct,sort_order&order=sort_order'),
      sbFetch('topics?select=id,name,board_frequency,topic_weight,subject_id&order=sort_order'),
    ]);
    // Group topics under subjects
    const grouped = (subs || []).map(s => ({
      ...s,
      topics: (tops || []).filter(t => t.subject_id === s.id),
    }));
    setSubjects(grouped);
    // Expand first subject by default
    if (grouped.length) setExpanded({ [grouped[0].id]: true });
    setLoading(false);
  }

  // ── Load lessons when topic selected ─────────────────────────────────────
  useEffect(() => {
    if (!selected) return;
    loadLessons(selected.id);
  }, [selected]);

  async function loadLessons(topicId) {
    setLL(true);
    const lessonData = await sbFetch(`lessons?topic_id=eq.${topicId}&is_active=eq.true&order=sort_order&select=id,title,memory_hook,board_relevance,read_time_mins,sort_order,topic_id`);
    setLessons(lessonData || []);
    if (customerId && lessonData?.length) {
      const ids = lessonData.map(l => l.id).join(',');
      const prog = await sbFetch(`lesson_progress?customer_id=eq.${customerId}&lesson_id=in.(${ids})&select=lesson_id,completed`);
      const map = {};
      (prog || []).forEach(p => { map[p.lesson_id] = p.completed; });
      setProgress(map);
    }
    setLL(false);
  }

  async function markComplete(lessonId) {
    setProgress(p => ({ ...p, [lessonId]: true }));
    await sbFetch('lesson_progress', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify({ customer_id: customerId, lesson_id: lessonId, completed: true, completed_at: new Date().toISOString() })
    });
  }

  function toggleSubject(subId) {
    setExpanded(e => ({ ...e, [subId]: !e[subId] }));
  }

  function selectTopic(topic) {
    setSelected(topic);
    setView("topic");
  }

  const [fullLesson, setFullLesson] = useState(null)
  const activeLesson = fullLesson || lessons.find(l => l.id === activeId);
  const completedCount = lessons.filter(l => progress[l.id]).length;

  // ─── TTS Player ───────────────────────────────────────────────────────────
  function TTSPlayer({ lesson }) {
    const [ttsState, setTtsState] = useState('idle') // idle | playing | paused
    const [ttsAvailable] = useState(() => 'speechSynthesis' in window)

    function getPlainText(lesson) {
      const parts = []
      if (lesson.title)         parts.push(lesson.title + '.')
      if (lesson.board_relevance) parts.push(lesson.board_relevance + '.')
      if (lesson.content)       parts.push(lesson.content.replace(/[#*`>_~]/g, '').replace(/\n+/g, ' '))
      if (lesson.memory_hook)   parts.push('Memory Hook. ' + lesson.memory_hook)
      return parts.join(' ')
    }

    function handlePlay() {
      if (!ttsAvailable) return
      if (ttsState === 'playing') {
        window.speechSynthesis.pause()
        setTtsState('paused')
        return
      }
      if (ttsState === 'paused') {
        window.speechSynthesis.resume()
        setTtsState('playing')
        return
      }
      window.speechSynthesis.cancel()
      const utt = new SpeechSynthesisUtterance(getPlainText(lesson))
      utt.rate  = 0.95
      utt.pitch = 1
      utt.onend   = () => setTtsState('idle')
      utt.onerror = () => setTtsState('idle')
      window.speechSynthesis.speak(utt)
      setTtsState('playing')
    }

    function handleStop() {
      window.speechSynthesis.cancel()
      setTtsState('idle')
    }

    if (!ttsAvailable) return null

    return (
      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', margin:'0 0 12px' }}>
        <button onClick={handlePlay} style={{ display:'flex', alignItems:'center', gap:6, background:'var(--accent-dim)', border:'1px solid var(--accent)', borderRadius:'var(--radius-sm)', padding:'7px 14px', cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight:600, color:'var(--accent)', transition:'all 0.15s' }}>
          {ttsState === 'playing' ? '⏸ Pause' : ttsState === 'paused' ? '▶ Resume' : '▶ Listen'}
        </button>
        {ttsState !== 'idle' && (
          <button onClick={handleStop} style={{ background:'transparent', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', padding:'7px 12px', cursor:'pointer', fontFamily:'inherit', fontSize:13, color:'var(--text-muted)', transition:'all 0.15s' }}>
            ⏹ Stop
          </button>
        )}
        <span style={{ fontSize:11, color:'var(--text-muted)', flex:1 }}>
          {ttsState === 'playing' ? 'Reading aloud…' : ttsState === 'paused' ? 'Paused' : 'Listen to this lesson'}
        </span>
      </div>
    )
  }

  // ─── Lesson Reader ────────────────────────────────────────────────────────
  if (view === "lesson" && activeLesson) {
    return (
      <div style={s.screen}>
        <div style={s.readerHeader}>
          <button style={s.backBtn} onClick={() => { window.speechSynthesis?.cancel(); setView("topic"); setFullLesson(null); }}>← Back</button>
          <span style={s.readerTopic}>{selected?.name}</span>
          {progress[activeLesson.id]
            ? <span style={s.doneBadge}>✓ Done</span>
            : <button style={s.doneBtn} onClick={() => markComplete(activeLesson.id)}>Mark Complete</button>
          }
        </div>
        {activeLesson.board_relevance && (
          <div style={s.relevanceBanner}>📋 {activeLesson.board_relevance}</div>
        )}
        <div style={s.readerMeta}>
          <h1 style={s.lessonTitle}>{activeLesson.title}</h1>
          <span style={s.readTime}>⏱ ~{activeLesson.read_time_mins} min read</span>
        </div>
        <div style={{ padding:'0 20px 8px' }}>
          <TTSPlayer lesson={activeLesson} />
        </div>
        <div style={s.lessonContent} dangerouslySetInnerHTML={{ __html: renderMarkdown(activeLesson.content) }} />
        {activeLesson.memory_hook && (
          <div style={s.memoryHook}>
            <div style={s.memoryHookLabel}>🧠 Memory Hook</div>
            <pre style={s.memoryHookText}>{activeLesson.memory_hook}</pre>
          </div>
        )}
        {!progress[activeLesson.id] && (
          <button style={s.doneBtnBottom} onClick={() => { window.speechSynthesis?.cancel(); markComplete(activeLesson.id); setView("topic"); setFullLesson(null); }}>
            ✓ Lesson Complete — Back to List
          </button>
        )}
      </div>
    );
  }

  // ─── Topic Lesson List ────────────────────────────────────────────────────
  if (view === "topic" && selected) {
    return (
      <div style={s.screen}>
        <div style={s.header}>
          <button style={s.backBtn} onClick={() => setView("list")}>← Subjects</button>
          <span style={s.headerTitle}>{selected.name}</span>
        </div>
        <div style={s.topicInfo}>
          <div style={s.topicMeta}>
            <span style={{ ...s.freqBadge, background: freqColor(selected.board_frequency) }}>
              {selected.board_frequency} frequency
            </span>
            {lessons.length > 0 && (
              <span style={s.progressLabel}>{completedCount}/{lessons.length} done</span>
            )}
          </div>
          {lessons.length > 0 && (
            <div style={s.progressBar}>
              <div style={{ ...s.progressFill, width: `${(completedCount / lessons.length) * 100}%` }} />
            </div>
          )}
        </div>
        {lessonLoading ? (
          <div style={s.empty}>Loading…</div>
        ) : lessons.length === 0 ? (
          <div style={s.empty}>
            <div style={s.emptyIcon}>📖</div>
            <div style={s.emptyTitle}>No lessons yet</div>
            <div style={s.emptySubtitle}>Lessons for {selected.name} are being prepared.</div>
          </div>
        ) : (
          <div style={s.lessonList}>
            {lessons.map((lesson, idx) => {
              const done = progress[lesson.id];
              return (
                <button key={lesson.id} style={{ ...s.lessonCard, ...(done ? s.lessonCardDone : {}) }}
                  onClick={async () => {
                    setActiveId(lesson.id);
                    setView("lesson");
                    setFullLesson(null);
                    const full = await sbFetch(`lessons?id=eq.${lesson.id}&select=*`);
                    if (full?.[0]) setFullLesson(full[0]);
                  }}>
                  <div style={s.lessonCardLeft}>
                    <div style={s.lessonNum}>{done ? "✓" : idx + 1}</div>
                    <div>
                      <div style={s.lessonCardTitle}>{lesson.title}</div>
                      <div style={s.lessonCardMeta}>⏱ {lesson.read_time_mins} min{lesson.memory_hook && " · 🧠 Memory hook"}</div>
                    </div>
                  </div>
                  <span style={s.lessonArrow}>›</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ─── Subject + Topic List (Home) ─────────────────────────────────────────
  return (
    <div style={s.screen}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={onBack}>← Home</button>
        <span style={s.headerTitle}>Lessons</span>
      </div>

      {loading ? (
        <div style={s.empty}>Loading…</div>
      ) : (
        <div style={{ padding: "12px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
          {subjects.map(subject => {
            const isOpen = expanded[subject.id];
            return (
              <div key={subject.id} style={s.subjectGroup}>
                {/* Subject header — tap to expand/collapse */}
                <button style={s.subjectHeader} onClick={() => toggleSubject(subject.id)}>
                  <div style={s.subjectLeft}>
                    <div style={{ ...s.subjectDot, background: subject.color || '#c9a84c' }} />
                    <div>
                      <div style={s.subjectName}>{subject.name}</div>
                      <div style={s.subjectMeta}>
                        {subject.weight_pct}% of exam · {subject.topics.length} topics
                      </div>
                    </div>
                  </div>
                  <span style={{ ...s.chevron, transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                    ▾
                  </span>
                </button>

                {/* Topics inside subject */}
                {isOpen && (
                  <div style={s.topicList}>
                    {subject.topics.length === 0 ? (
                      <div style={s.noTopics}>No topics yet</div>
                    ) : subject.topics.map(topic => (
                      <button key={topic.id} style={s.topicRow}
                        onClick={() => selectTopic(topic)}>
                        <div style={s.topicRowLeft}>
                          <div style={{ ...s.freqDot, background: freqColor(topic.board_frequency) }} />
                          <span style={s.topicRowName}>{topic.name}</span>
                        </div>
                        <div style={s.topicRowRight}>
                          <span style={{ ...s.freqLabel, color: freqColor(topic.board_frequency) }}>
                            {topic.board_frequency}
                          </span>
                          <span style={s.topicArrow}>›</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = {
  screen:         { minHeight: "100vh", background: "var(--bg-base)", color: "var(--text-primary)", fontFamily: "var(--font-ui)", paddingBottom: 80 },
  header:         { display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", borderBottom: "1px solid #1e1e1e" },
  readerHeader:   { display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", borderBottom: "1px solid #1e1e1e", position: "sticky", top: 0, background: "#0f0f0f", zIndex: 10 },
  headerTitle:    { fontSize: 18, fontWeight: 700, color: "#f0ede6", flex: 1 },
  readerTopic:    { fontSize: 13, color: "#888", flex: 1 },
  backBtn:        { background: "none", border: "none", color: "#c9a84c", fontSize: 14, cursor: "pointer", padding: "4px 0", fontWeight: 600 },

  // Subject group
  subjectGroup:   { background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, overflow: "hidden" },
  subjectHeader:  { width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left" },
  subjectLeft:    { display: "flex", alignItems: "center", gap: 12 },
  subjectDot:     { width: 10, height: 10, borderRadius: "50%", flexShrink: 0 },
  subjectName:    { fontSize: 15, fontWeight: 700, color: "#f0ede6" },
  subjectMeta:    { fontSize: 11, color: "#555", marginTop: 2 },
  chevron:        { fontSize: 16, color: "#555", transition: "transform 0.2s" },

  // Topic list inside subject
  topicList:      { borderTop: "1px solid #1e1e1e" },
  topicRow:       { width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px 12px 20px", background: "none", border: "none", borderBottom: "1px solid #1a1a1a", cursor: "pointer", textAlign: "left" },
  topicRowLeft:   { display: "flex", alignItems: "center", gap: 10 },
  freqDot:        { width: 6, height: 6, borderRadius: "50%", flexShrink: 0 },
  topicRowName:   { fontSize: 13, color: "#d0cdc6", fontWeight: 500 },
  topicRowRight:  { display: "flex", alignItems: "center", gap: 8 },
  freqLabel:      { fontSize: 10, fontWeight: 700 },
  topicArrow:     { fontSize: 16, color: "#444" },
  noTopics:       { padding: "12px 20px", fontSize: 12, color: "#444" },

  // Topic lesson list
  topicInfo:      { padding: "12px 20px", borderBottom: "1px solid #1e1e1e" },
  topicMeta:      { display: "flex", alignItems: "center", gap: 12, marginBottom: 8 },
  freqBadge:      { fontSize: 11, fontWeight: 700, color: "#fff", borderRadius: 4, padding: "2px 8px" },
  progressLabel:  { fontSize: 12, color: "#888" },
  progressBar:    { height: 4, background: "#1e1e1e", borderRadius: 2, overflow: "hidden" },
  progressFill:   { height: "100%", background: "#c9a84c", borderRadius: 2, transition: "width 0.3s" },
  lessonList:     { padding: "12px 20px", display: "flex", flexDirection: "column", gap: 8 },
  lessonCard:     { background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", textAlign: "left", width: "100%" },
  lessonCardDone: { borderColor: "#c9a84c33", opacity: 0.7 },
  lessonCardLeft: { display: "flex", alignItems: "center", gap: 14 },
  lessonNum:      { width: 28, height: 28, background: "#2a2a2a", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#c9a84c", flexShrink: 0 },
  lessonCardTitle:{ fontSize: 14, fontWeight: 600, color: "#f0ede6", marginBottom: 3 },
  lessonCardMeta: { fontSize: 11, color: "#666" },
  lessonArrow:    { fontSize: 20, color: "#444" },

  // Reader
  relevanceBanner:{ background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.2)", padding: "10px 20px", fontSize: 12, color: "#c9a84c", lineHeight: 1.5 },
  readerMeta:     { padding: "20px 20px 0" },
  lessonTitle:    { fontSize: 24, fontWeight: 800, color: "#f0ede6", marginBottom: 6, lineHeight: 1.3 },
  readTime:       { fontSize: 12, color: "#666" },
  lessonContent:  { padding: "20px", fontSize: 15, lineHeight: 1.8, color: "var(--text-secondary)" },
  memoryHook:     { margin: "0 20px 20px", background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.25)", borderRadius: 12, padding: 16 },
  memoryHookLabel:{ fontSize: 12, fontWeight: 700, color: "#c9a84c", marginBottom: 10, letterSpacing: 1, textTransform: "uppercase" },
  memoryHookText: { fontSize: 13, color: "#f0ede6", lineHeight: 1.8, whiteSpace: "pre-wrap", fontFamily: "'DM Mono', monospace", margin: 0 },
  doneBadge:      { fontSize: 12, fontWeight: 700, color: "#22c55e", background: "rgba(34,197,94,0.1)", padding: "4px 10px", borderRadius: 20 },
  doneBtn:        { fontSize: 12, fontWeight: 700, color: "#c9a84c", background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.3)", padding: "6px 14px", borderRadius: 20, cursor: "pointer" },
  doneBtnBottom:  { display: "block", margin: "0 20px 20px", width: "calc(100% - 40px)", padding: "14px", background: "#c9a84c", color: "#0f0f0f", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 800, cursor: "pointer", textAlign: "center" },
  empty:          { padding: 40, textAlign: "center", color: "#666" },
  emptyIcon:      { fontSize: 40, marginBottom: 12 },
  emptyTitle:     { fontSize: 16, fontWeight: 700, color: "#888", marginBottom: 8 },
  emptySubtitle:  { fontSize: 13, color: "#555" },
};
