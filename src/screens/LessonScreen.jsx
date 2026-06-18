import React, { useState, useEffect, useRef } from "react";

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

// ─── Beautiful Markdown Renderer ─────────────────────────────────────────────
function renderMarkdown(text) {
  if (!text) return ""

  // Pre-process: detect plain prose (no markdown) and auto-structure it
  const hasMarkdown = /^#{1,3} |^[-*+] |^\d+\. |^>|^```|\*\*|__|\|/.test(text)
  if (!hasMarkdown) {
    return renderPlainProse(text)
  }

  const lines = text.split("\n")
  let html = ""
  let i = 0
  let sectionCount = 0

  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) { i++; continue }

    // H1 — large section title with accent underline
    if (line.startsWith("# ")) {
      sectionCount++
      html += `<h1 style="font-size:22px;font-weight:800;color:var(--text-primary);margin:32px 0 6px;line-height:1.3;padding-bottom:8px;border-bottom:2px solid var(--accent)">${inlineFormat(line.slice(2))}</h1>`
      i++; continue
    }

    // H2 — subsection with left accent bar
    if (line.startsWith("## ")) {
      html += `<h2 style="font-size:17px;font-weight:700;color:var(--text-primary);margin:28px 0 8px;line-height:1.3;padding-left:12px;border-left:3px solid var(--accent)">${inlineFormat(line.slice(3))}</h2>`
      i++; continue
    }

    // H3 — small label style
    if (line.startsWith("### ")) {
      html += `<h3 style="font-size:14px;font-weight:700;color:var(--accent);margin:20px 0 6px;line-height:1.3;text-transform:uppercase;letter-spacing:0.05em">${inlineFormat(line.slice(4))}</h3>`
      i++; continue
    }

    // HR — decorative divider
    if (line.trim() === "---" || line.trim() === "***") {
      html += `<div style="display:flex;align-items:center;gap:12px;margin:24px 0"><div style="flex:1;height:1px;background:var(--border)"></div><div style="width:6px;height:6px;border-radius:50%;background:var(--accent);opacity:0.5"></div><div style="flex:1;height:1px;background:var(--border)"></div></div>`
      i++; continue
    }

    // Blockquote — styled as key concept callout
    if (line.startsWith("> ")) {
      let bq = ""
      while (i < lines.length && lines[i].startsWith("> ")) { bq += inlineFormat(lines[i].slice(2)) + " "; i++ }
      html += `<div style="background:rgba(201,168,76,0.08);border:1px solid rgba(201,168,76,0.25);border-left:4px solid var(--accent);border-radius:0 10px 10px 0;padding:14px 16px;margin:16px 0"><div style="font-size:10px;font-weight:700;color:var(--accent);letter-spacing:0.08em;margin-bottom:6px;text-transform:uppercase">Key Concept</div><div style="font-size:14px;color:var(--text-primary);line-height:1.7">${bq.trim()}</div></div>`
      continue
    }

    // Code block
    if (line.startsWith("```")) {
      i++
      let code = ""
      while (i < lines.length && !lines[i].startsWith("```")) { code += lines[i] + "\n"; i++ }
      i++
      html += `<pre style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:10px;padding:16px;overflow-x:auto;margin:16px 0"><code style="font-size:12px;color:var(--text-primary);line-height:1.7;white-space:pre;font-family:monospace">${escHtml(code.trimEnd())}</code></pre>`
      continue
    }

    // Unordered list — styled bullets
    if (line.match(/^[-*+] /)) {
      let items = ""
      while (i < lines.length && lines[i].match(/^[-*+] /)) {
        items += `<li style="margin:6px 0;line-height:1.75;color:var(--text-secondary);padding-left:4px">${inlineFormat(lines[i].slice(2))}</li>`
        i++
      }
      html += `<ul style="margin:12px 0;padding-left:20px;list-style:none">${items.replace(/<li /g, '<li style="margin:6px 0;line-height:1.75;color:var(--text-secondary);padding-left:4px;position:relative" ').replace(/padding-left:4px" >/g, 'padding-left:20px" ><span style="position:absolute;left:0;color:var(--accent);font-weight:700">›</span>')}</ul>`
      continue
    }

    // Numbered list — clean numbered style
    if (line.match(/^\d+\. /)) {
      let items = ""
      let num = 1
      while (i < lines.length && lines[i].match(/^\d+\. /)) {
        items += `<li style="margin:8px 0;line-height:1.75;color:var(--text-secondary);display:flex;gap:12px;align-items:flex-start"><span style="min-width:24px;height:24px;background:var(--accent-dim);border:1px solid var(--accent);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--accent);flex-shrink:0;margin-top:2px">${num}</span><span>${inlineFormat(lines[i].replace(/^\d+\. /, ""))}</span></li>`
        num++; i++
      }
      html += `<ol style="margin:12px 0;padding:0;list-style:none">${items}</ol>`
      continue
    }

    // Table — styled with alternating rows
    if (line.includes("|") && line.trim().startsWith("|")) {
      const tableLines = []
      while (i < lines.length && lines[i].includes("|")) { tableLines.push(lines[i]); i++ }
      const rows = tableLines.filter(r => !r.match(/^[|\s-:]+$/))
      let tableHtml = `<div style="overflow-x:auto;margin:16px 0;border-radius:10px;border:1px solid var(--border);overflow:hidden"><table style="width:100%;border-collapse:collapse;font-size:13px">`
      rows.forEach((row, ri) => {
        const cells = row.split("|").filter((_, ci) => ci > 0 && ci < row.split("|").length - 1)
        const tag = ri === 0 ? "th" : "td"
        const rowBg = ri === 0 ? "background:var(--bg-elevated)" : ri % 2 === 0 ? "background:rgba(255,255,255,0.02)" : ""
        tableHtml += `<tr style="${rowBg}">${cells.map(c => `<${tag} style="padding:10px 14px;border-bottom:1px solid var(--border);text-align:left;color:${ri===0?'var(--accent)':'var(--text-secondary)'};font-weight:${ri===0?700:400};font-size:${ri===0?'11px':'13px'};${ri===0?'text-transform:uppercase;letter-spacing:0.05em':''}">${inlineFormat(c.trim())}</${tag}>`).join("")}</tr>`
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
    if (para) html += `<p style="margin:0 0 14px;line-height:1.85;color:var(--text-secondary);font-size:15px">${inlineFormat(para)}</p>`
  }

  return html
}

// Chunked lesson content — renders large files without crashing
function LessonContent({ text, contentRef }) {
  const CHUNK = 15000
  const [chunks, setChunks] = useState(1)
  const display = text.slice(0, CHUNK * chunks)
  const hasMore = display.length < text.length
  return (
    <>
      <div ref={contentRef} className="lesson-reader-content lesson-reader-body"
        style={{ fontSize:15, lineHeight:1.9, color:'var(--text-secondary)', fontFamily:'var(--font-reader)' }}
        dangerouslySetInnerHTML={{ __html: renderMarkdown(display) }} />
      {hasMore && (
        <button onClick={() => setChunks(c => c + 1)}
          style={{ marginTop:16, padding:'10px 20px', background:'var(--accent-dim)', border:'1px solid var(--accent)', borderRadius:8, color:'var(--accent)', cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight:600, width:'100%' }}>
          Continue reading — {Math.round((text.length - display.length) / 1000)}k chars remaining ↓
        </button>
      )}
    </>
  )
}

// Plain prose renderer — auto-structures paragraphs beautifully
function renderPlainProse(text) {
  // Step 1: normalize line breaks
  let normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  // Step 2: if no double newlines exist, auto-split on sentence boundaries
  // This handles Tool 2 output that's one giant block of text
  if (!normalized.includes('\n\n')) {
    // Split into sentences using a simple approach (no lookbehind for compatibility)
    const raw = normalized.replace(/([.!?])\s+([A-ZÁÉÍÓÚ])/g, '$1\n$2')
    const sentences = raw.split('\n').filter(s => s.trim())
    const PARA_SIZE = 4
    const groups = []
    for (let i = 0; i < sentences.length; i += PARA_SIZE) {
      groups.push(sentences.slice(i, i + PARA_SIZE).join(' '))
    }
    normalized = groups.join('\n\n')
  }

  const paragraphs = normalized.split(/\n\n+/).filter(p => p.trim())
  let html = ""
  paragraphs.forEach((para, i) => {
    const clean = para.replace(/\n/g, " ").trim()
    if (!clean) return
    if (i === 0) {
      html += `<p style="margin:0 0 20px;line-height:1.95;color:var(--text-primary);font-size:16px;font-weight:500;font-family:var(--font-reader)">${inlineFormat(clean)}</p>`
    } else {
      html += `<p style="margin:0 0 16px;line-height:1.9;color:var(--text-secondary);font-size:15px;font-family:var(--font-reader)">${inlineFormat(clean)}</p>`
    }
  })
  return html
}

function inlineFormat(text) {
  return text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong style=\"color:var(--text-primary);background:rgba(201,168,76,0.1);padding:1px 3px;border-radius:3px\">$1</strong>")
    .replace(/\*(.+?)\*/g, "<em style=\"color:var(--text-primary)\">$1</em>")
    .replace(/__(.+?)__/g, "<strong style=\"color:var(--text-primary)\">$1</strong>")
    .replace(/`(.+?)`/g, "<code style=\"background:var(--bg-elevated);border:1px solid var(--border);padding:2px 7px;border-radius:5px;font-size:12px;font-family:monospace;color:var(--accent)\">$1</code>")
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
    const lessonData = await sbFetch(`lessons?topic_id=eq.${topicId}&is_active=eq.true&order=sort_order&select=id,title,memory_hook,board_relevance,read_time_mins,sort_order,topic_id,image_url,video_url,audio_url,infographic_url,mindmap_url`);
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
  const contentRef = useRef(null)
  const activeLesson = fullLesson || lessons.find(l => l.id === activeId);
  const completedCount = lessons.filter(l => progress[l.id]).length;

  // ─── Quiz state ───────────────────────────────────────────────────────────
  const [quizCards,   setQuizCards]   = useState([])
  const [quizIdx,     setQuizIdx]     = useState(0)
  const [quizChosen,  setQuizChosen]  = useState(null)
  const [quizAnswered,setQuizAnswered]= useState(false)
  const [quizResults, setQuizResults] = useState([])
  const [quizPhase,   setQuizPhase]   = useState('idle') // idle | session | summary

  // ─── Lesson Bridge Quiz state (3 Qs before + after lesson) ───────────────
  const [bridgeCards,   setBridgeCards]   = useState([])
  const [bridgeIdx,     setBridgeIdx]     = useState(0)
  const [bridgeChosen,  setBridgeChosen]  = useState(null)
  const [bridgeAnswered,setBridgeAnswered]= useState(false)
  const [bridgeResults, setBridgeResults] = useState([])
  const [bridgePhase,   setBridgePhase]   = useState('idle') // idle | pre | post
  const [bridgeScorePre, setBridgeScorePre] = useState(null)

  async function startBridgeQuiz(topicId, phase) {
    const data = await sbFetch(`cards?topic_id=eq.${topicId}&is_active=eq.true&select=id,question,choices,correct_index,explanation,difficulty&limit=100`)
    if (!data?.length) {
      // No cards — go straight to lesson
      if (phase === 'pre') { setView('lesson'); return }
      else { setView('lesson'); return }
    }
    const shuffled = data.sort(() => Math.random() - 0.5).slice(0, 3)
    setBridgeCards(shuffled)
    setBridgeIdx(0)
    setBridgeChosen(null)
    setBridgeAnswered(false)
    setBridgeResults([])
    setBridgePhase(phase)
    setView('bridge')
  }

  function pickBridgeAnswer(i) {
    if (bridgeAnswered) return
    setBridgeChosen(i)
    setBridgeAnswered(true)
  }

  function nextBridgeCard() {
    const card = bridgeCards[bridgeIdx]
    const correct = bridgeChosen === card.correct_index
    const newResults = [...bridgeResults, { correct }]
    setBridgeResults(newResults)
    if (bridgeIdx + 1 >= bridgeCards.length) {
      const score = Math.round((newResults.filter(r => r.correct).length / newResults.length) * 100)
      if (bridgePhase === 'pre') {
        setBridgeScorePre(score)
        setView('lesson')  // Go to lesson after pre-quiz
      } else {
        // Post-quiz done — show comparison then go home
        setBridgePhase('compare')
      }
    } else {
      setBridgeIdx(i => i + 1)
      setBridgeChosen(null)
      setBridgeAnswered(false)
    }
  }

  async function startQuiz(topicId) {
    const data = await sbFetch(`cards?topic_id=eq.${topicId}&is_active=eq.true&select=id,question,choices,correct_index,explanation,difficulty,bloom_level&limit=100`)
    if (!data?.length) return
    // Shuffle and take 10
    const shuffled = data.sort(() => Math.random() - 0.5).slice(0, 10)
    setQuizCards(shuffled)
    setQuizIdx(0)
    setQuizChosen(null)
    setQuizAnswered(false)
    setQuizResults([])
    setQuizPhase('session')
    setView('quiz')
  }

  function pickQuizAnswer(i) {
    if (quizAnswered) return
    setQuizChosen(i)
    setQuizAnswered(true)
  }

  function nextQuizCard() {
    const card = quizCards[quizIdx]
    const correct = quizChosen === card.correct_index
    const newResults = [...quizResults, { correct, question: card.question }]
    setQuizResults(newResults)
    if (quizIdx + 1 >= quizCards.length) {
      setQuizResults(newResults)
      setQuizPhase('summary')
    } else {
      setQuizIdx(i => i + 1)
      setQuizChosen(null)
      setQuizAnswered(false)
    }
  }

  // ─── TTS Player v4 — paragraph highlight, works desktop + mobile ──────────
  function TTSPlayer({ lesson, contentRef }) {
    const [ttsState,      setTtsState]      = useState('idle')
    const [speed,         setSpeed]         = useState(1.0)
    const [ttsAvailable]                    = useState(() => 'speechSynthesis' in window)
    const [audioConflict, setAudioConflict] = useState(false)
    const ttsStateRef  = useRef('idle')
    const paraSpansRef = useRef([])   // array of <p>/<div> elements used as highlight targets
    const paraTextsRef = useRef([])   // plain text per paragraph
    const paraIdxRef   = useRef(0)

    const setTtsStateSync = (s) => { ttsStateRef.current = s; setTtsState(s) }

    // Detect audio conflict
    useEffect(() => {
      const check = () => {
        const playing = Array.from(document.querySelectorAll('audio')).some(a => !a.paused)
        setAudioConflict(playing)
        if (playing && ttsStateRef.current === 'playing') stopAll()
      }
      document.addEventListener('play',  check, true)
      document.addEventListener('pause', check, true)
      document.addEventListener('ended', check, true)
      return () => {
        document.removeEventListener('play',  check, true)
        document.removeEventListener('pause', check, true)
        document.removeEventListener('ended', check, true)
      }
    }, [])

    // Build paragraph list from contentRef DOM
    function buildParagraphs() {
      if (!contentRef?.current) return []
      // Get all block-level elements that contain text
      const blocks = Array.from(contentRef.current.querySelectorAll('p, li, h1, h2, h3, h4, blockquote'))
      if (blocks.length === 0) {
        // Fallback: split plain text into chunks if no block elements
        const text = contentRef.current.innerText || ''
        const chunks = text.split(/[\n]{2,}/).filter(c => c.trim().length > 0)
        paraTextsRef.current = chunks
        paraSpansRef.current = []  // no DOM elements to highlight
        return chunks
      }
      const texts = []
      const els   = []
      blocks.forEach(el => {
        const t = (el.innerText || el.textContent || '').trim()
        if (t.length < 3) return
        texts.push(t)
        els.push(el)
      })
      paraTextsRef.current = texts
      paraSpansRef.current = els
      return texts
    }

    function hlParagraph(idx) {
      // Clear previous
      paraSpansRef.current.forEach(el => {
        el.style.background   = ''
        el.style.borderRadius = ''
        el.style.transition   = ''
        el.style.padding      = ''
        el.style.margin       = ''
      })
      const el = paraSpansRef.current[idx]
      if (!el) return
      el.style.background   = 'var(--accent-dim)'
      el.style.borderRadius = '6px'
      el.style.transition   = 'background 0.3s'
      el.style.padding      = '2px 4px'
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }

    function clearHL() {
      paraSpansRef.current.forEach(el => {
        el.style.background   = ''
        el.style.borderRadius = ''
        el.style.padding      = ''
      })
    }

    function stopAll() {
      window.speechSynthesis.cancel()
      clearHL()
      paraSpansRef.current = []
      paraTextsRef.current = []
      paraIdxRef.current   = 0
      setTtsStateSync('idle')
    }

    function speakParagraphs(texts, fromIdx = 0) {
      if (!texts || texts.length === 0 || fromIdx >= texts.length || ttsStateRef.current === 'idle') {
        clearHL()
        setTtsStateSync('idle')
        return
      }
      if (!texts[fromIdx] || texts[fromIdx].trim().length === 0) {
        speakParagraphs(texts, fromIdx + 1)
        return
      }
      paraIdxRef.current = fromIdx
      hlParagraph(fromIdx)

      const utt  = new SpeechSynthesisUtterance(texts[fromIdx])
      utt.rate   = speed
      utt.pitch  = 1
      utt.lang   = 'en-PH'

      utt.onend = () => {
        if (ttsStateRef.current !== 'playing') return
        speakParagraphs(texts, fromIdx + 1)
      }
      utt.onerror = (e) => {
        if (e.error === 'interrupted') return
        clearHL(); setTtsStateSync('idle')
      }

      window.speechSynthesis.speak(utt)
    }

    function handlePlay() {
      if (!ttsAvailable || audioConflict) return

      if (ttsState === 'playing') {
        window.speechSynthesis.pause()
        setTtsStateSync('paused')
        return
      }
      if (ttsState === 'paused') {
        window.speechSynthesis.resume()
        setTtsStateSync('playing')
        return
      }

      // Fresh start
      stopAll()
      const texts = buildParagraphs()
      if (!texts || texts.length === 0) {
        alert('No content to read in this lesson yet.')
        return
      }

      // Speak first paragraph immediately (iOS gesture requirement)
      setTtsStateSync('playing')
      speakParagraphs(texts, 0)
    }

    function handleParaClick(idx) {
      // Click any paragraph to start TTS from there
      stopAll()
      const texts = buildParagraphs()
      if (texts.length === 0) return
      setTtsStateSync('playing')
      speakParagraphs(texts, idx)
    }

    function handleSpeedChange(newSpeed) {
      const wasPlaying = ttsStateRef.current === 'playing'
      const fromIdx    = paraIdxRef.current
      stopAll()
      setSpeed(newSpeed)
      if (wasPlaying) {
        const texts = buildParagraphs()
        setTimeout(() => { setTtsStateSync('playing'); speakParagraphs(texts, fromIdx) }, 50)
      }
    }

    // Make paragraphs clickable when TTS is idle
    useEffect(() => {
      if (!contentRef?.current) return
      const blocks = Array.from(contentRef.current.querySelectorAll('p, li, h1, h2, h3, h4, blockquote'))
      const handlers = blocks.map((el, idx) => {
        const fn = (e) => {
          if (ttsStateRef.current !== 'idle') return
          e.stopPropagation()
          stopAll()
          const texts = buildParagraphs()
          if (texts.length === 0) return
          setTtsStateSync('playing')
          speakParagraphs(texts, idx)
        }
        el.style.cursor = 'pointer'
        el.addEventListener('click', fn)
        return { el, fn }
      })
      return () => {
        handlers.forEach(({ el, fn }) => {
          el.removeEventListener('click', fn)
          el.style.cursor = ''
        })
      }
    }, [lesson?.id])

    useEffect(() => {
      return () => { window.speechSynthesis?.cancel(); clearHL() }
    }, [])

    if (!ttsAvailable) return null

    const speeds = [0.75, 1.0, 1.25, 1.5]

    return (
      <div style={{
        position: 'sticky', bottom: 0, zIndex: 50,
        background: 'var(--bg-surface)',
        borderTop: '1px solid var(--border)',
        padding: '8px 14px',
        display: 'flex', alignItems: 'center', gap: 8,
        boxShadow: '0 -4px 16px rgba(0,0,0,0.25)',
        flexWrap: 'wrap',
      }}>
        {/* Play / Pause */}
        <button onClick={handlePlay} disabled={audioConflict} style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: audioConflict ? 'var(--bg-elevated)' : ttsState === 'playing' ? 'var(--bg-elevated)' : 'var(--accent)',
          border: 'none', borderRadius: 'var(--radius-md)',
          padding: '8px 16px', cursor: audioConflict ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
          color: audioConflict ? 'var(--text-muted)' : ttsState === 'playing' ? 'var(--text-primary)' : '#0d0d0d',
          transition: 'all 0.15s', flexShrink: 0, opacity: audioConflict ? 0.5 : 1,
        }}>
          {ttsState === 'playing' ? '⏸ Pause' : ttsState === 'paused' ? '▶ Resume' : '▶ Listen'}
        </button>

        {/* Stop */}
        {ttsState !== 'idle' && (
          <button onClick={stopAll} style={{
            background: 'transparent', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)', padding: '7px 11px',
            cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
            color: 'var(--text-muted)', flexShrink: 0,
          }}>⏹</button>
        )}

        {/* Status */}
        <span style={{ fontSize: 11, color: 'var(--text-muted)', flex: 1, minWidth: 80 }}>
          {audioConflict
            ? '🔇 Stop audio to use TTS'
            : ttsState === 'playing'
            ? 'Tap any paragraph to jump'
            : ttsState === 'paused'
            ? 'Paused'
            : 'Tap ▶ or any paragraph to start'}
        </span>

        {/* Speed */}
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {speeds.map(s => (
            <button key={s} onClick={() => handleSpeedChange(s)} style={{
              padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: speed === s ? 700 : 400,
              border: speed === s ? '1.5px solid var(--accent)' : '1px solid var(--border)',
              background: speed === s ? 'var(--accent-dim)' : 'transparent',
              color: speed === s ? 'var(--accent)' : 'var(--text-muted)',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              {s}x
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ─── Lesson Reader ────────────────────────────────────────────────────────
  // ─── Lesson Reader ────────────────────────────────────────────────────────
  if (view === "lesson" && activeLesson) {
    return (
      <>
      <div style={s.screen}>
        {/* Sticky header */}
        <div style={s.readerHeader}>
          <button style={s.backBtn} onClick={() => { window.speechSynthesis?.cancel(); setView("topic"); setFullLesson(null); }}>← Back</button>
          <span style={s.readerTopic}>{selected?.name}</span>
          {progress[activeLesson.id]
            ? <span style={s.doneBadge}>✓ Done</span>
            : <button style={s.doneBtn} onClick={() => markComplete(activeLesson.id)}>Mark done</button>
          }
        </div>

        {/* Board relevance banner */}
        {activeLesson.board_relevance && (
          <div style={{ background:'rgba(201,168,76,0.07)', borderBottom:'1px solid rgba(201,168,76,0.15)', padding:'10px 20px', fontSize:12, color:'#c9a84c', lineHeight:1.5, display:'flex', gap:8, alignItems:'flex-start' }}>
            <span style={{ flexShrink:0 }}>📋</span>
            <span>{activeLesson.board_relevance}</span>
          </div>
        )}

        {/* Reader body */}
        <div style={{ maxWidth:680, margin:'0 auto', padding:'0 20px 100px', width:'100%', boxSizing:'border-box' }}>

          {/* Title block */}
          <div style={{ padding:'28px 0 20px', borderBottom:'1px solid var(--border)', marginBottom:24 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--accent)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:10 }}>
              {selected?.name}
            </div>
            <h1 style={{ fontSize:26, fontWeight:800, color:'var(--text-primary)', lineHeight:1.25, margin:'0 0 12px', fontFamily:'var(--font-display)' }}>
              {activeLesson.title}
            </h1>
            <div style={{ display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
              <span style={{ fontSize:12, color:'var(--text-muted)' }}>⏱ ~{activeLesson.read_time_mins || 10} min read</span>
              {progress[activeLesson.id] && (
                <span style={{ fontSize:11, fontWeight:700, color:'#22c55e', background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.2)', padding:'3px 10px', borderRadius:20 }}>✓ Completed</span>
              )}
            </div>
          </div>

          {/* Lesson image if available */}
          {activeLesson.image_url && (
            <div style={{ marginBottom:24, borderRadius:12, overflow:'hidden', border:'1px solid var(--border)' }}>
              <img src={activeLesson.image_url} alt={activeLesson.title}
                style={{ width:'100%', display:'block', maxHeight:320, objectFit:'cover' }} />
            </div>
          )}

          {/* Media resources — above content so students can queue audio first */}
          {(activeLesson.video_url || activeLesson.audio_url || activeLesson.infographic_url || activeLesson.mindmap_url) && (
            <div style={{ marginTop:28, background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:14, padding:18 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--accent)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:14 }}>
                📎 Resources
              </div>
              {activeLesson.video_url && (
                <div style={{ marginBottom:14 }}>
                  <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:6 }}>🎬 Video</div>
                  <iframe
                    src={activeLesson.video_url.replace('watch?v=', 'embed/')}
                    style={{ width:'100%', aspectRatio:'16/9', borderRadius:10, border:'none' }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen />
                </div>
              )}
              {activeLesson.audio_url && (
                <div style={{ marginBottom:14 }}>
                  <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:6 }}>🎧 Audio</div>
                  <audio controls style={{ width:'100%', borderRadius:8 }} src={activeLesson.audio_url} />
                </div>
              )}
              {activeLesson.infographic_url && (
                <div style={{ marginBottom:14 }}>
                  <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:6 }}>🖼 Infographic</div>
                  <img src={activeLesson.infographic_url} alt="Infographic"
                    style={{ width:'100%', borderRadius:10, border:'1px solid var(--border)' }} />
                </div>
              )}
              {activeLesson.mindmap_url && (
                <div style={{ marginBottom:4 }}>
                  <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:6 }}>🗺 Mindmap</div>
                  <a href={activeLesson.mindmap_url} target="_blank" rel="noopener noreferrer"
                    style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:10, textDecoration:'none', color:'var(--accent)', fontSize:13, fontWeight:600 }}>
                    Open Mindmap →
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Memory hook */}
          {activeLesson.memory_hook && (
            <div style={{ marginTop:32, background:'rgba(201,168,76,0.06)', border:'1px solid rgba(201,168,76,0.2)', borderRadius:14, padding:20, position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg, var(--accent), transparent)' }} />
              <div style={{ fontSize:11, fontWeight:700, color:'var(--accent)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:12, display:'flex', alignItems:'center', gap:6 }}>
                <span>🧠</span> Memory Hook
              </div>
              <div style={{ fontSize:14, color:'var(--text-primary)', lineHeight:1.8, fontFamily:"'DM Mono', monospace", whiteSpace:'pre-wrap' }}>
                {activeLesson.memory_hook}
              </div>
            </div>
          )}

          {/* Main content — progressive chunked rendering, no size limit */}
          <LessonContent text={activeLesson.content || ''} contentRef={contentRef} />

          {/* Action buttons */}
          <div style={{ marginTop:28, display:'flex', flexDirection:'column', gap:10 }}>
            {!progress[activeLesson.id] && (
              <button style={{ width:'100%', padding:'15px', background:'var(--accent)', color:'#0d0d0d', border:'none', borderRadius:12, fontSize:14, fontWeight:800, cursor:'pointer', fontFamily:'inherit' }}
                onClick={() => { window.speechSynthesis?.cancel(); markComplete(activeLesson.id); setView("topic"); setFullLesson(null); }}>
                ✓ Mark Complete & Continue
              </button>
            )}
            <button style={{ width:'100%', padding:'14px', background:'var(--bg-elevated)', color:'var(--accent)', border:'1px solid var(--accent)', borderRadius:12, fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}
              onClick={() => { window.speechSynthesis?.cancel(); selected?.id ? startBridgeQuiz(selected.id, 'post') : startQuiz(selected?.id) }}>
              🧪 Test Yourself — 3 Quick Questions
            </button>
            {progress[activeLesson.id] && (
              <button style={{ width:'100%', padding:'13px', background:'none', color:'var(--text-muted)', border:'1px solid var(--border)', borderRadius:12, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}
                onClick={() => { window.speechSynthesis?.cancel(); setView("topic"); setFullLesson(null); }}>
                ← Back to Topic
              </button>
            )}
          </div>
        </div>
      </div>
      {/* Sticky TTS bar — always visible while reading */}
      <TTSPlayer lesson={activeLesson} contentRef={contentRef} />
    </>
    );
  }

  // ─── Quiz Session ─────────────────────────────────────────────────────────
  // ─── Bridge Quiz View ───────────────────────────────────────────────────
  if (view === 'bridge' && (bridgePhase === 'pre' || bridgePhase === 'post') && bridgeCards.length > 0) {
    const card    = bridgeCards[bridgeIdx]
    const choices = Array.isArray(card.choices) && card.choices.length > 0 ? card.choices : []
    const correctIndex = card.correct_index || 0
    const letters = ['A','B','C','D']
    const isPre   = bridgePhase === 'pre'

    return (
      <div style={s.screen}>
        <div style={{ ...s.readerHeader, position:'sticky', top:0 }}>
          <button style={s.backBtn} onClick={() => { setBridgePhase('idle'); setView('lesson') }}>← Skip</button>
          <span style={s.readerTopic}>{selected?.name}</span>
          <span style={{ fontSize:12, color:'var(--text-muted)' }}>{bridgeIdx + 1}/3</span>
        </div>

        <div style={{ padding:'16px 20px', flex:1, overflowY:'auto' }}>
          {/* Bridge header */}
          <div style={{ background: isPre ? 'var(--accent-dim)' : 'rgba(16,185,129,0.08)', border:`1px solid ${isPre ? 'var(--accent)' : '#10B981'}`, borderRadius:'var(--radius-md)', padding:'10px 14px', marginBottom:16 }}>
            <div style={{ fontSize:11, fontWeight:700, color: isPre ? 'var(--accent)' : '#10B981', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:2 }}>
              {isPre ? '📋 Before the Lesson' : '✅ After the Lesson'}
            </div>
            <div style={{ fontSize:12, color:'var(--text-muted)' }}>
              {isPre ? "Let's see what you already know — 3 quick questions." : "Great job reading! Let's see what stuck — 3 quick questions."}
            </div>
          </div>

          {/* Question */}
          <div style={{ fontFamily:'var(--font-display)', fontSize:15, color:'var(--text-primary)', lineHeight:1.65, marginBottom:16 }}>
            {card.question}
          </div>

          {/* Choices */}
          <div style={{ display:'flex', flexDirection:'column', gap:9, marginBottom:16 }}>
            {choices.map((choice, i) => {
              let border = 'var(--border-strong)', bg = 'var(--bg-elevated)', color = 'var(--text-secondary)', letterColor = 'var(--text-muted)'
              if (bridgeAnswered) {
                if (i === correctIndex)                         { border = '#10B981'; bg = 'rgba(16,185,129,0.10)'; color = '#10B981'; letterColor = '#10B981' }
                else if (i === bridgeChosen && i !== correctIndex) { border = '#e05c5c'; bg = 'rgba(224,92,92,0.10)'; color = '#e05c5c'; letterColor = '#e05c5c' }
                else { color = 'var(--text-muted)'; letterColor = 'var(--text-muted)' }
              }
              return (
                <button key={i} onClick={() => pickBridgeAnswer(i)} disabled={bridgeAnswered} style={{
                  background:bg, border:`1.5px solid ${border}`, borderRadius:'var(--radius-md)',
                  padding:'12px 14px', fontSize:13, cursor: bridgeAnswered ? 'default' : 'pointer',
                  textAlign:'left', color, fontFamily:'inherit', transition:'all 0.15s',
                  display:'flex', alignItems:'flex-start', gap:10,
                }}>
                  <span style={{ fontWeight:700, color:letterColor, minWidth:16, fontSize:12, marginTop:1 }}>{letters[i]}</span>
                  <span>{choice}</span>
                </button>
              )
            })}
          </div>

          {/* Explanation */}
          {bridgeAnswered && card.explanation && (
            <div style={{ padding:'12px 14px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderLeft:'3px solid var(--accent)', borderRadius:'0 var(--radius-md) var(--radius-md) 0', fontSize:12, color:'var(--text-secondary)', lineHeight:1.7, marginBottom:16 }}>
              {card.explanation}
            </div>
          )}

          {bridgeAnswered && (
            <button onClick={nextBridgeCard} style={{
              width:'100%', padding:14, background:'var(--accent)', color:'#0d0d0d',
              border:'none', borderRadius:'var(--radius-md)', fontSize:14, fontWeight:700,
              cursor:'pointer', fontFamily:'inherit',
            }}>
              {bridgeIdx + 1 >= bridgeCards.length
                ? isPre ? '📖 Start the Lesson →' : '🏁 See Results →'
                : 'Next Question →'}
            </button>
          )}
        </div>
      </div>
    )
  }

  // ─── Bridge Compare View (before vs after) ───────────────────────────────
  if (view === 'bridge' && bridgePhase === 'compare') {
    const postScore = Math.round((bridgeResults.filter(r => r.correct).length / bridgeResults.length) * 100)
    const improved  = bridgeScorePre !== null && postScore > bridgeScorePre
    const diff      = bridgeScorePre !== null ? postScore - bridgeScorePre : null

    return (
      <div style={s.screen}>
        <div style={{ ...s.readerHeader, position:'sticky', top:0 }}>
          <button style={s.backBtn} onClick={() => { setBridgePhase('idle'); setView('topic') }}>← Topics</button>
          <span style={s.readerTopic}>Lesson Complete</span>
        </div>
        <div style={{ padding:'24px 20px', display:'flex', flexDirection:'column', gap:16, overflowY:'auto', flex:1 }}>
          <div style={{ textAlign:'center', marginBottom:8 }}>
            <div style={{ fontSize:40, marginBottom:8 }}>{improved ? '📈' : '📚'}</div>
            <div style={{ fontFamily:'var(--font-display)', fontSize:22, color:'var(--text-primary)', marginBottom:4 }}>
              {improved ? 'You improved!' : 'Good effort!'}
            </div>
            <div style={{ fontSize:13, color:'var(--text-muted)' }}>
              {improved
                ? `Your score went up ${diff}% after reading the lesson.`
                : 'Keep reviewing — each session builds your foundation.'}
            </div>
          </div>

          {bridgeScorePre !== null && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div style={{ background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', padding:16, textAlign:'center' }}>
                <div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:6 }}>Before Lesson</div>
                <div style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:800, color:'var(--text-muted)' }}>{bridgeScorePre}%</div>
              </div>
              <div style={{ background:'var(--bg-elevated)', border:`1px solid ${improved ? '#10B981' : 'var(--border)'}`, borderRadius:'var(--radius-md)', padding:16, textAlign:'center' }}>
                <div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:6 }}>After Lesson</div>
                <div style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:800, color: improved ? '#10B981' : 'var(--accent)' }}>
                  {postScore}%{improved && <span style={{ fontSize:14 }}> ↑</span>}
                </div>
              </div>
            </div>
          )}

          <button style={{ width:'100%', padding:14, background:'var(--accent)', color:'#0d0d0d', border:'none', borderRadius:'var(--radius-md)', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}
            onClick={() => { setBridgePhase('idle'); setView('topic') }}>
            Back to Topics ✓
          </button>
          <button style={{ width:'100%', padding:13, background:'none', border:'1px solid var(--border)', color:'var(--text-muted)', borderRadius:'var(--radius-md)', fontSize:13, cursor:'pointer', fontFamily:'inherit' }}
            onClick={() => startQuiz(selected?.id)}>
            Take Full Quiz — 10 Questions
          </button>
        </div>
      </div>
    )
  }

  if (view === 'quiz' && quizPhase === 'session' && quizCards.length > 0) {
    const card = quizCards[quizIdx]
    const choices = Array.isArray(card.choices) && card.choices.length > 0 ? card.choices : []
    const correctIndex = card.correct_index || 0

    return (
      <div style={s.screen}>
        <div style={{ ...s.readerHeader, position: 'sticky', top: 0 }}>
          <button style={s.backBtn} onClick={() => { setView('lesson'); setQuizPhase('idle'); }}>← Back to Lesson</button>
          <span style={s.readerTopic}>{selected?.name}</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{quizIdx + 1}/{quizCards.length}</span>
        </div>

        {/* Progress bar */}
        <div style={{ padding: '10px 20px 0' }}>
          <div style={{ height: 4, background: 'var(--bg-elevated)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'var(--accent)', borderRadius: 2, width: `${((quizIdx) / quizCards.length) * 100}%`, transition: 'width .4s' }} />
          </div>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Tags */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: '#1A2D1A', color: '#10B981', fontWeight: 600 }}>{card.difficulty}</span>
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: '#2D1A2A', color: '#8B5CF6', fontWeight: 600 }}>{card.bloom_level}</span>
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: 'rgba(201,168,76,0.1)', color: '#c9a84c', fontWeight: 600 }}>Test Yourself</span>
          </div>

          {/* Question */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.6, marginBottom: 16 }}>{card.question}</div>

            {/* Choices */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {choices.map((choice, i) => {
                let border = 'var(--border)', bg = 'var(--bg-elevated)', color = 'var(--text-primary)'
                if (quizAnswered) {
                  if (i === correctIndex)                                     { border = '#10B981'; bg = 'rgba(16,185,129,0.08)'; color = '#10B981' }
                  else if (i === quizChosen && i !== correctIndex) { border = '#e05c5c'; bg = 'rgba(224,92,92,0.08)'; color = '#e05c5c' }
                  else { color = 'var(--text-muted)' }
                }
                return (
                  <button key={i} onClick={() => pickQuizAnswer(i)} style={{
                    background: bg, border: `1.5px solid ${border}`, borderRadius: 10,
                    padding: '11px 14px', fontSize: 13, cursor: quizAnswered ? 'default' : 'pointer',
                    textAlign: 'left', color, fontFamily: 'inherit', transition: 'all 0.15s',
                  }}>{choice}</button>
                )
              })}
            </div>

            {/* Explanation */}
            {quizAnswered && card.explanation && (
              <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}
                dangerouslySetInnerHTML={{ __html: card.explanation }} />
            )}
          </div>

          {quizAnswered && (
            <button style={{ width: '100%', background: 'var(--accent)', color: '#0d0d0d', border: 'none', borderRadius: 12, padding: 14, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
              onClick={nextQuizCard}>
              {quizIdx + 1 >= quizCards.length ? 'See Results' : 'Next Question →'}
            </button>
          )}
        </div>
      </div>
    )
  }

  // ─── Quiz Summary ─────────────────────────────────────────────────────────
  if (view === 'quiz' && quizPhase === 'summary') {
    const correct = quizResults.filter(r => r.correct).length
    const total = quizResults.length
    const pct = Math.round((correct / total) * 100)
    const passed = pct >= 70

    return (
      <div style={s.screen}>
        <div style={s.readerHeader}>
          <button style={s.backBtn} onClick={() => { setView('topic'); setQuizPhase('idle'); }}>← Back to Topic</button>
          <span style={s.readerTopic}>{selected?.name}</span>
        </div>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Score */}
          <div style={{ background: 'var(--bg-surface)', border: `1px solid ${passed ? '#10B981' : '#e05c5c'}`, borderRadius: 16, padding: 24, textAlign: 'center' }}>
            <div style={{ fontSize: 56, fontWeight: 800, color: passed ? '#10B981' : '#e05c5c', lineHeight: 1 }}>{pct}%</div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 8 }}>{correct} of {total} correct</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginTop: 12 }}>
              {passed ? '✅ Good job! Keep it up.' : '📖 Review the lesson again and retry.'}
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {[
              { label: 'Correct', val: correct, color: '#10B981' },
              { label: 'Wrong', val: total - correct, color: '#e05c5c' },
              { label: 'Score', val: `${pct}%`, color: 'var(--accent)' },
            ].map(s2 => (
              <div key={s2.label} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: s2.color }}>{s2.val}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>{s2.label}</div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <button style={{ width: '100%', background: 'var(--accent)', color: '#0d0d0d', border: 'none', borderRadius: 12, padding: 14, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            onClick={() => startQuiz(selected?.id)}>
            🔄 Retry Quiz
          </button>
          <button style={{ width: '100%', background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 12, padding: 14, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
            onClick={() => { setView('lesson'); setQuizPhase('idle'); }}>
            ← Back to Lesson
          </button>
          <button style={{ width: '100%', background: 'none', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 12, padding: 14, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}
            onClick={() => { setView('topic'); setQuizPhase('idle'); }}>
            Back to Topic List
          </button>
        </div>
      </div>
    )
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
                    if (selected?.id) {
                      startBridgeQuiz(selected.id, 'pre')
                    } else {
                      setView("lesson");
                    }
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

// ─── Styles — all CSS variables for full theme support ────────────────────────
const s = {
  screen:         { height: "100vh", overflowY: "auto", background: "var(--bg-base)", color: "var(--text-primary)", fontFamily: "var(--font-ui)", paddingBottom: 80 },
  header:         { display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", borderBottom: "1px solid var(--border)" },
  readerHeader:   { display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", borderBottom: "1px solid var(--border)", position: "sticky", top: 0, background: "var(--bg-base)", zIndex: 10 },
  headerTitle:    { fontSize: 18, fontWeight: 700, color: "var(--text-primary)", flex: 1 },
  readerTopic:    { fontSize: 13, color: "var(--text-muted)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  backBtn:        { background: "none", border: "none", color: "var(--accent)", fontSize: 14, cursor: "pointer", padding: "4px 0", fontWeight: 600, flexShrink: 0 },

  // Subject group
  subjectGroup:   { background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" },
  subjectHeader:  { width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left" },
  subjectLeft:    { display: "flex", alignItems: "center", gap: 12 },
  subjectDot:     { width: 10, height: 10, borderRadius: "50%", flexShrink: 0 },
  subjectName:    { fontSize: 15, fontWeight: 700, color: "var(--text-primary)" },
  subjectMeta:    { fontSize: 11, color: "var(--text-muted)", marginTop: 2 },
  chevron:        { fontSize: 16, color: "var(--text-muted)", transition: "transform 0.2s" },

  // Topic list inside subject
  topicList:      { borderTop: "1px solid var(--border)" },
  topicRow:       { width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px 12px 20px", background: "none", border: "none", borderBottom: "1px solid var(--border)", cursor: "pointer", textAlign: "left" },
  topicRowLeft:   { display: "flex", alignItems: "center", gap: 10 },
  freqDot:        { width: 6, height: 6, borderRadius: "50%", flexShrink: 0 },
  topicRowName:   { fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 },
  topicRowRight:  { display: "flex", alignItems: "center", gap: 8 },
  freqLabel:      { fontSize: 10, fontWeight: 700 },
  topicArrow:     { fontSize: 16, color: "var(--text-muted)" },
  noTopics:       { padding: "12px 20px", fontSize: 12, color: "var(--text-muted)" },

  // Topic lesson list
  topicInfo:      { padding: "12px 20px", borderBottom: "1px solid var(--border)" },
  topicMeta:      { display: "flex", alignItems: "center", gap: 12, marginBottom: 8 },
  freqBadge:      { fontSize: 11, fontWeight: 700, color: "#fff", borderRadius: 4, padding: "2px 8px" },
  progressLabel:  { fontSize: 12, color: "var(--text-muted)" },
  progressBar:    { height: 4, background: "var(--bg-elevated)", borderRadius: 2, overflow: "hidden" },
  progressFill:   { height: "100%", background: "var(--accent)", borderRadius: 2, transition: "width 0.3s" },
  lessonList:     { padding: "12px 20px", display: "flex", flexDirection: "column", gap: 8 },
  lessonCard:     { background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", textAlign: "left", width: "100%" },
  lessonCardDone: { borderColor: "var(--accent)", opacity: 0.7 },
  lessonCardLeft: { display: "flex", alignItems: "center", gap: 14 },
  lessonNum:      { width: 28, height: 28, background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "var(--accent)", flexShrink: 0 },
  lessonCardTitle:{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 3 },
  lessonCardMeta: { fontSize: 11, color: "var(--text-muted)" },
  lessonArrow:    { fontSize: 20, color: "var(--text-muted)" },

  // Reader (legacy — kept for fallback)
  relevanceBanner:{ background: "var(--accent-dim)", border: "1px solid var(--border)", padding: "10px 20px", fontSize: 12, color: "var(--accent)", lineHeight: 1.5 },
  readerMeta:     { padding: "20px 20px 0" },
  lessonTitle:    { fontSize: 24, fontWeight: 800, color: "var(--text-primary)", marginBottom: 6, lineHeight: 1.3 },
  readTime:       { fontSize: 12, color: "var(--text-muted)" },
  lessonContent:  { padding: "20px", fontSize: 15, lineHeight: 1.85, color: "var(--text-secondary)" },
  memoryHook:     { margin: "0 20px 20px", background: "var(--accent-dim)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 },
  memoryHookLabel:{ fontSize: 12, fontWeight: 700, color: "var(--accent)", marginBottom: 10, letterSpacing: 1, textTransform: "uppercase" },
  memoryHookText: { fontSize: 13, color: "var(--text-primary)", lineHeight: 1.8, whiteSpace: "pre-wrap", fontFamily: "'DM Mono', monospace", margin: 0 },
  doneBadge:      { fontSize: 12, fontWeight: 700, color: "#22c55e", background: "rgba(34,197,94,0.1)", padding: "4px 10px", borderRadius: 20 },
  doneBtn:        { fontSize: 12, fontWeight: 700, color: "var(--accent)", background: "var(--accent-dim)", border: "1px solid var(--accent)", padding: "6px 14px", borderRadius: 20, cursor: "pointer" },
  doneBtnBottom:  { display: "block", margin: "0 20px 20px", width: "calc(100% - 40px)", padding: "14px", background: "var(--accent)", color: "var(--bg-base)", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 800, cursor: "pointer", textAlign: "center" },
  empty:          { padding: 40, textAlign: "center", color: "var(--text-muted)" },
  emptyIcon:      { fontSize: 40, marginBottom: 12 },
  emptyTitle:     { fontSize: 16, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 8 },
  emptySubtitle:  { fontSize: 13, color: "var(--text-muted)" },
};
