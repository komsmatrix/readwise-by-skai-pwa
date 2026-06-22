import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const TABS = [
  { id: 'overview',      label: '📊 Overview'      },
  { id: 'questions',     label: '❓ Questions'      },
  { id: 'lessons',       label: '📚 Lessons'        },
  { id: 'tesda',         label: '🏅 TESDA'          },
  { id: 'announcements', label: '📢 Announcements'  },
  { id: 'agents',        label: '🤝 Agents'         },
  { id: 'sales',         label: '💰 Sales'          },
  { id: 'trials',        label: '⏱ Trials'          },
  { id: 'students',      label: '👥 Students'        },
  { id: 'keys',          label: '🔑 Keys'            },
  { id: 'feedback',      label: '💬 Feedback'       },
]

export default function OwnerDashboard({ isLoggedIn, onLogin }) {
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [tab, setTab] = useState('overview')

  async function handleLogin() {
    if (!password) return setAuthError('Enter password')
    const res = await fetch('/api/owner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'get-customers', password }),
    })
    const data = await res.json()
    if (data.error === 'Unauthorized') { setAuthError('Wrong password'); return }
    sessionStorage.setItem('owner_auth', password)
    onLogin()
  }

  if (!isLoggedIn) {
    return (
      <div style={s.root}>
        <div style={s.loginCard}>
          <div style={s.brand}>
            <div style={s.brandIcon}>R</div>
            <div>
              <div style={s.brandName}>Readwise Owner</div>
              <div style={s.brandBy}>Dashboard · Private</div>
            </div>
          </div>
          <input style={s.input} type="password" placeholder="Password"
            value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()} autoFocus />
          {authError && <div style={s.error}>{authError}</div>}
          <button style={s.btn} onClick={handleLogin}>Enter Dashboard</button>
        </div>
      </div>
    )
  }

  return (
    <div style={s.dashboard}>
      {/* Header */}
      <div style={s.dashHeader}>
        <div style={s.brand}>
          <div style={s.brandIcon}>R</div>
          <div>
            <div style={s.brandName}>Readwise</div>
            <div style={s.brandBy}>Owner Dashboard</div>
          </div>
        </div>
        <a href="/" style={s.exitBtn}>← Back to app</a>
      </div>

      {/* Tab bar */}
      <div style={s.tabBar}>
        {TABS.map(t => (
          <button key={t.id}
            style={{ ...s.tabBtn, ...(tab === t.id ? s.tabBtnActive : {}) }}
            onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={s.tabContent}>
        {tab === 'overview'      && <OverviewTab />}
        {tab === 'questions'     && <QuestionsTab />}
        {tab === 'lessons'       && <LessonsTab />}
        {tab === 'tesda'         && <TesdaTab />}
        {tab === 'announcements' && <AnnouncementsTab />}
        {tab === 'agents'        && <AgentsTab />}
        {tab === 'sales'         && <SalesTab />}
        {tab === 'trials'        && <TrialsTab />}
        {tab === 'students'      && <StudentsTab />}
        {tab === 'keys'          && <KeysTab />}
        {tab === 'feedback'      && <FeedbackTab />}
      </div>
    </div>
  )
}

// ── Overview Tab ──────────────────────────────────────────────────────────────
function OverviewTab() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadStats() }, [])

  async function loadStats() {
    const [
      { count: students },
      { count: cards },
      { count: lessons },
      { count: trials },
      { count: trialConverted },
      { data: recentStudents },
    ] = await Promise.all([
      supabase.from('customers').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('cards').select('*', { count: 'exact', head: true }),
      supabase.from('lessons').select('*', { count: 'exact', head: true }),
      supabase.from('trial_sessions').select('*', { count: 'exact', head: true }),
      supabase.from('trial_sessions').select('*', { count: 'exact', head: true }).eq('converted', true),
      supabase.from('customers').select('name, email, created_at').eq('is_active', true).order('created_at', { ascending: false }).limit(5),
    ])
    setStats({ students, cards, lessons, trials, trialConverted, recentStudents: recentStudents || [] })
    setLoading(false)
  }

  if (loading) return <Loading />

  const convRate = stats.trials > 0
    ? Math.round((stats.trialConverted / stats.trials) * 100)
    : 0

  return (
    <div style={s.section}>
      <div style={ow.grid}>
        {[
          { label: 'Active Students', val: stats.students,   color: '#10B981' },
          { label: 'Total Cards',     val: stats.cards,      color: 'var(--accent)' },
          { label: 'Lessons',         val: stats.lessons,    color: '#06B6D4' },
          { label: 'Trials Started',  val: stats.trials,     color: '#8B5CF6' },
          { label: 'Converted',       val: stats.trialConverted, color: '#F59E0B' },
          { label: 'Conv. Rate',      val: `${convRate}%`,   color: '#F59E0B' },
        ].map(stat => (
          <div key={stat.label} style={ow.statCard}>
            <div style={{ ...ow.statVal, color: stat.color }}>{stat.val ?? '—'}</div>
            <div style={ow.statLabel}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div style={s.sectionLabel}>Recent Students</div>
      {stats.recentStudents.map((c, i) => (
        <div key={i} style={ow.studentRow}>
          <div style={ow.avatar}>{c.name?.[0]?.toUpperCase() || '?'}</div>
          <div style={{ flex: 1 }}>
            <div style={ow.studentName}>{c.name}</div>
            <div style={ow.studentEmail}>{c.email}</div>
          </div>
          <div style={ow.studentDate}>{new Date(c.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</div>
        </div>
      ))}
    </div>
  )
}

// ── Questions Tab ─────────────────────────────────────────────────────────────
function QuestionsTab() {
  const [subtab, setSubtab] = useState('overview')
  const [topics, setTopics] = useState([])
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [sql, setSql] = useState('')
  const [sqlStatus, setSqlStatus] = useState('idle')
  const [sqlMsg, setSqlMsg] = useState('')
  const [filterTopic, setFilterTopic] = useState('')
  const [search, setSearch] = useState('')

  // Generate tab state
  const [genTopic, setGenTopic] = useState('')
  const [genCount, setGenCount] = useState(20)
  const [genMix, setGenMix] = useState('60')
  const [genDiff, setGenDiff] = useState('mixed')
  const [genStatus, setGenStatus] = useState('idle')
  const [genMsg, setGenMsg] = useState('')
  const [genResults, setGenResults] = useState([])
  const [genSelected, setGenSelected] = useState(new Set())
  const [saveStatus, setSaveStatus] = useState('idle')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [{ data: t }, { data: c }] = await Promise.all([
      supabase.from('topics').select('id, name, subject_id').order('name'),
      supabase.from('cards').select('id, question, topic_id, difficulty, bloom_level').order('created_at', { ascending: false }),
    ])
    setTopics(t || [])
    setCards(c || [])
    setLoading(false)
  }

  async function generateQuestions() {
    if (!genTopic) return setGenMsg('Please select a topic first.')
    const topicName = topics.find(t => t.id === genTopic)?.name || genTopic
    setGenStatus('loading')
    setGenMsg('')
    setGenResults([])
    setGenSelected(new Set())

    // Prompt is handled server-side in api/generate-questions.js
    try {
      const ownerPass = sessionStorage.getItem('owner_auth') || sessionStorage.getItem('ownerPassword') || localStorage.getItem('owner_auth') || ''
      const res = await fetch('/api/get-customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password      : ownerPass,
          topicName,
          topicId       : genTopic,
          count         : genCount,
          situationalPct: genMix,
          difficulty    : genDiff,
        }),
      })

      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Generation failed')

      const questions = data.questions
      setGenResults(questions)
      setGenSelected(new Set(questions.map(q => q.id)))
      setGenMsg(`${questions.length} questions generated. Review and select which to save.`)
      setGenStatus('success')

    } catch (err) {
      setGenStatus('error')
      setGenMsg(`Error: ${err.message}. Try again.`)
    }
  }

  async function saveSelected() {
    const toSave = genResults.filter(q => genSelected.has(q.id))
    if (toSave.length === 0) return setGenMsg('No questions selected.')
    setSaveStatus('loading')

    let saved = 0
    let dupes = 0

    for (const q of toSave) {
      const fullQuestion = `${q.question} [A) ${q.options?.A} | B) ${q.options?.B} | C) ${q.options?.C} | D) ${q.options?.D}]`
      const answer = q.options?.[q.answer] || q.answer

      // Duplicate check
      const { data: existing } = await supabase
        .from('cards')
        .select('id')
        .ilike('question', `%${q.question.slice(0, 50)}%`)
        .limit(1)

      if (existing && existing.length > 0) {
        dupes++
        continue
      }

      await supabase.from('cards').insert({
        question       : fullQuestion,
        answer         : answer,
        explanation    : q.explanation || '',
        topic_id       : q.topic_id,
        difficulty     : q.difficulty || 'Medium',
        board_frequency: q.board_frequency || 'High',
        bloom_level    : q.type === 'situational' ? 'Apply' : 'Remember',
      })
      saved++
    }

    setSaveStatus('idle')
    setGenMsg(`✓ ${saved} questions saved to Supabase. ${dupes > 0 ? `${dupes} duplicates skipped.` : ''}`)
    loadData()
  }

  function toggleSelect(id) {
    setGenSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function runSQL() {
    if (!sql.trim()) return
    setSqlStatus('loading')
    try {
      const { error } = await supabase.rpc('exec_sql', { query: sql })
      if (error) throw error
      setSqlStatus('success')
      setSqlMsg('SQL ran successfully.')
      loadData()
    } catch (e) {
      setSqlStatus('error')
      setSqlMsg(e.message || 'SQL error.')
    }
  }

  async function deleteCard(id) {
    await supabase.from('cards').delete().eq('id', id)
    setCards(prev => prev.filter(c => c.id !== id))
  }

  async function handleR2Upload(e, field) {
    const file = e.target.files?.[0]
    if (!file) return
    setEditLesson(p => ({ ...p, [`${field}_uploading`]: true }))
    try {
      // Upload via Cloudflare Worker
      const folder   = field === 'audio_url' ? 'audio' : 'infographic'
      const fileName = folder + '/' + Date.now() + '.' + file.name.split('.').pop()
      const ownerPass = sessionStorage.getItem('owner_auth') || ''
      const res = await fetch('https://readwise-upload.komsmatrix.workers.dev', {
        method: 'PUT',
        headers: {
          'Content-Type':     file.type,
          'X-Owner-Password': ownerPass,
          'X-File-Name':      fileName,
        },
        body: file,
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setEditLesson(p => ({ ...p, [field]: data.publicUrl, [`${field}_uploading`]: false }))
    } catch(err) {
      alert('Upload failed: ' + err.message)
      setEditLesson(p => ({ ...p, [`${field}_uploading`]: false }))
    }
    e.target.value = ''
  }

  const topicMap = Object.fromEntries(topics.map(t => [t.id, t.name]))

  const filtered = cards.filter(c => {
    const matchTopic = !filterTopic || c.topic_id === filterTopic
    const matchSearch = !search || c.question?.toLowerCase().includes(search.toLowerCase())
    return matchTopic && matchSearch
  })

  // Per-topic count
  const topicCounts = topics.map(t => ({
    ...t,
    count: cards.filter(c => c.topic_id === t.id).length,
  }))

  return (
    <div style={s.section}>
      <div style={s.subtabBar}>
        {['overview', 'import', 'generate', 'browse'].map(st => (
          <button key={st} style={{ ...s.subtabBtn, ...(subtab === st ? s.subtabBtnActive : {}) }}
            onClick={() => setSubtab(st)}>
            {st === 'generate' ? '✨ Generate' : st.charAt(0).toUpperCase() + st.slice(1)}
          </button>
        ))}
      </div>

      {subtab === 'overview' && (
        <>
          <div style={s.statRow}>
            <div style={s.bigStat}>{cards.length}</div>
            <div style={s.bigStatLabel}>Total Questions</div>
          </div>
          {loading ? <Loading /> : (
            <div style={s.topicBars}>
              {topicCounts.map(t => (
                <div key={t.id} style={s.topicBarRow}>
                  <div style={s.topicBarName}>{t.name}</div>
                  <div style={s.topicBarWrap}>
                    <div style={{ ...s.topicBarFill, width: `${Math.min(100, (t.count / Math.max(1, cards.length)) * 100 * topicCounts.length)}%` }} />
                  </div>
                  <div style={s.topicBarCount}>{t.count}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {subtab === 'generate' && (
        <>
          <div style={s.sectionLabel}>AI Question Generator</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
            Generates LET board exam questions using OpenRouter AI. Questions are checked for duplicates before saving.
          </div>

          <div style={s.field}>
            <label style={s.label}>Topic</label>
            <select style={s.select} value={genTopic} onChange={e => setGenTopic(e.target.value)}>
              <option value="">Select topic…</option>
              {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div style={s.field}>
              <label style={s.label}>Questions</label>
              <select style={s.select} value={genCount} onChange={e => setGenCount(parseInt(e.target.value))}>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={30}>30</option>
                <option value={50}>50</option>
              </select>
            </div>
            <div style={s.field}>
              <label style={s.label}>Situational %</label>
              <select style={s.select} value={genMix} onChange={e => setGenMix(e.target.value)}>
                <option value="40">40% situational</option>
                <option value="60">60% situational</option>
                <option value="80">80% situational</option>
                <option value="100">100% situational</option>
              </select>
            </div>
            <div style={s.field}>
              <label style={s.label}>Difficulty</label>
              <select style={s.select} value={genDiff} onChange={e => setGenDiff(e.target.value)}>
                <option value="mixed">Mixed</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
          </div>

          <button style={{ ...s.btn, opacity: genStatus === 'loading' ? 0.6 : 1 }}
            onClick={generateQuestions} disabled={genStatus === 'loading'}>
            {genStatus === 'loading' ? '⏳ Generating…' : `✨ Generate ${genCount} Questions`}
          </button>

          {genMsg && (
            <div style={{ ...s.msg, color: genStatus === 'error' ? '#e05c5c' : '#10B981', marginTop: 10 }}>
              {genMsg}
            </div>
          )}

          {genResults.length > 0 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 0 8px' }}>
                <div style={s.sectionLabel}>
                  {genSelected.size} of {genResults.length} selected
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={s.subtabBtn} onClick={() => setGenSelected(new Set(genResults.map(q => q.id)))}>
                    Select All
                  </button>
                  <button style={s.subtabBtn} onClick={() => setGenSelected(new Set())}>
                    Deselect All
                  </button>
                </div>
              </div>

              <div style={s.cardList}>
                {genResults.map(q => (
                  <div key={q.id} style={{
                    ...s.cardRow,
                    background: genSelected.has(q.id) ? 'rgba(201,169,110,0.06)' : 'var(--bg-elevated)',
                    border: genSelected.has(q.id) ? '1px solid rgba(201,169,110,0.3)' : '1px solid var(--border)',
                    cursor: 'pointer',
                  }} onClick={() => toggleSelect(q.id)}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{
                        width: 18, height: 18, borderRadius: 4, flexShrink: 0, marginTop: 2,
                        background: genSelected.has(q.id) ? 'var(--accent)' : 'transparent',
                        border: `1px solid ${genSelected.has(q.id) ? 'var(--accent)' : 'var(--border)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, color: '#0d0d0d',
                      }}>
                        {genSelected.has(q.id) ? '✓' : ''}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={s.cardQ}>{q.question}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0' }}>
                          A) {q.options?.A} · B) {q.options?.B} · C) {q.options?.C} · D) {q.options?.D}
                        </div>
                        <div style={{ fontSize: 11, color: '#10B981' }}>✓ {q.answer}) {q.options?.[q.answer]}</div>
                        {q.explanation && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic' }}>
                            {q.explanation}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                          <span style={s.chip}>{q.type}</span>
                          <span style={s.chip}>{q.difficulty}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button style={{ ...s.btn, marginTop: 12, opacity: saveStatus === 'loading' ? 0.6 : 1 }}
                onClick={saveSelected} disabled={saveStatus === 'loading'}>
                {saveStatus === 'loading' ? 'Saving…' : `💾 Save ${genSelected.size} Selected Questions`}
              </button>
            </>
          )}
        </>
      )}

      {subtab === 'import' && (
        <>
          <div style={s.sectionLabel}>Paste SQL</div>
          <textarea style={s.textarea} rows={10}
            placeholder="Paste INSERT SQL here…"
            value={sql} onChange={e => setSql(e.target.value)} />
          {sqlMsg && (
            <div style={{ ...s.msg, color: sqlStatus === 'error' ? '#e05c5c' : '#10B981' }}>{sqlMsg}</div>
          )}
          <button style={s.btn} onClick={runSQL} disabled={sqlStatus === 'loading'}>
            {sqlStatus === 'loading' ? 'Running…' : 'Run SQL →'}
          </button>
          <div style={s.hint}>
            After importing, switch to Browse to verify cards loaded correctly.
          </div>
        </>
      )}

      {subtab === 'browse' && (
        <>
          <div style={s.filterRow}>
            <select style={s.select} value={filterTopic} onChange={e => setFilterTopic(e.target.value)}>
              <option value="">All topics</option>
              {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <input style={s.searchInput} placeholder="Search questions…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={s.listCount}>{filtered.length} questions</div>
          <div style={s.cardList}>
            {filtered.slice(0, 100).map(c => (
              <div key={c.id} style={s.cardRow}>
                <div style={s.cardQ}>{c.question}</div>
                <div style={s.cardMeta}>
                  <span style={s.chip}>{topicMap[c.topic_id] || 'Unknown'}</span>
                  <span style={s.chip}>{c.difficulty}</span>
                  <span style={s.chip}>{c.bloom_level}</span>
                </div>
                <button style={s.deleteBtn} onClick={() => deleteCard(c.id)}>✕</button>
              </div>
            ))}
            {filtered.length > 100 && (
              <div style={s.hint}>Showing first 100. Use topic filter to narrow down.</div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ── Lessons Tab ───────────────────────────────────────────────────────────────
function LessonsTab() {
  const [subtab, setSubtab] = useState('edit')
  const [topics, setTopics] = useState([])
  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(true)
  const [editLesson, setEditLesson] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [{ data: t }, { data: l }] = await Promise.all([
      supabase.from('topics').select('id, name').order('name'),
      supabase.from('lessons').select('id, topic_id, title, content, memory_hook, board_relevance, image_url, video_url, audio_url, infographic_url, mindmap_url').order('title'),
    ])
    setTopics(t || [])
    setLessons(l || [])
    setLoading(false)
  }

  async function saveLesson() {
    if (!editLesson) return
    setSaving(true)
    if (editLesson.id) {
      await supabase.from('lessons').update({
        title: editLesson.title,
        content: editLesson.content,
        memory_hook: editLesson.memory_hook,
        board_relevance: editLesson.board_relevance,
        image_url: editLesson.image_url || null,
        video_url: editLesson.video_url || null,
        audio_url: editLesson.audio_url || null,
        infographic_url: editLesson.infographic_url || null,
        mindmap_url: editLesson.mindmap_url || null,
      }).eq('id', editLesson.id)
    } else {
      await supabase.from('lessons').insert([{
        topic_id: editLesson.topic_id,
        title: editLesson.title,
        content: editLesson.content,
        memory_hook: editLesson.memory_hook,
        board_relevance: editLesson.board_relevance,
        image_url: editLesson.image_url || null,
        video_url: editLesson.video_url || null,
        audio_url: editLesson.audio_url || null,
        infographic_url: editLesson.infographic_url || null,
        mindmap_url: editLesson.mindmap_url || null,
      }])
    }
    setSaving(false)
    setEditLesson(null)
    loadData()
  }

  async function deleteLesson(id, title) {
    if (!window.confirm('Delete lesson "' + title + '"? This cannot be undone.')) return
    await supabase.from('lessons').delete().eq('id', id)
    setLessons(prev => prev.filter(l => l.id !== id))
  }

  function handleMdUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      setEditLesson(p => ({ ...p, content: ev.target.result }))
      // Auto-fill title from filename if title is empty
      if (!editLesson?.title) {
        const name = file.name.replace(/\.md$/i, '').replace(/[_-]/g, ' ')
        setEditLesson(p => ({ ...p, content: ev.target.result, title: p.title || name }))
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  async function uploadToR2(file, folder) {
    const ext      = file.name.split('.').pop()
    const fileName = folder + '/' + Date.now() + '.' + ext
    const ownerPass = sessionStorage.getItem('owner_auth') || ''

    // Upload via Cloudflare Worker — no CORS, no signature issues
    const res = await fetch('https://readwise-upload.komsmatrix.workers.dev', {
      method: 'PUT',
      headers: {
        'Content-Type':      file.type,
        'X-Owner-Password':  ownerPass,
        'X-File-Name':       fileName,
      },
      body: file,
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error)
    return data.publicUrl
  }

  async function handleR2Upload(e, field) {
    const file = e.target.files?.[0]
    if (!file) return
    const folder = field.includes('audio') ? 'audio' : 'infographic'
    setEditLesson(p => ({ ...p, [field + '_uploading']: true }))
    try {
      const url = await uploadToR2(file, folder)
      setEditLesson(p => ({ ...p, [field]: url, [field + '_uploading']: false }))
    } catch(err) {
      alert('R2 upload failed: ' + err.message)
      setEditLesson(p => ({ ...p, [field + '_uploading']: false }))
    }
    e.target.value = ''
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setEditLesson(p => ({ ...p, image_uploading: true }))
    try {
      const ext = file.name.split('.').pop()
      const path = `lessons/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('lesson-images').upload(path, file, { upsert: true })
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('lesson-images').getPublicUrl(path)
      setEditLesson(p => ({ ...p, image_url: publicUrl, image_uploading: false }))
    } catch(err) {
      alert('Image upload failed: ' + err.message + '. Make sure lesson-images bucket exists in Supabase Storage.')
      setEditLesson(p => ({ ...p, image_uploading: false }))
    }
    e.target.value = ''
  }

  async function handleR2Upload(e, field) {
    const file = e.target.files?.[0]
    if (!file) return
    setEditLesson(p => ({ ...p, [`${field}_uploading`]: true }))
    try {
      // Upload via Cloudflare Worker
      const folder   = field === 'audio_url' ? 'audio' : 'infographic'
      const fileName = folder + '/' + Date.now() + '.' + file.name.split('.').pop()
      const ownerPass = sessionStorage.getItem('owner_auth') || ''
      const res = await fetch('https://readwise-upload.komsmatrix.workers.dev', {
        method: 'PUT',
        headers: {
          'Content-Type':     file.type,
          'X-Owner-Password': ownerPass,
          'X-File-Name':      fileName,
        },
        body: file,
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setEditLesson(p => ({ ...p, [field]: data.publicUrl, [`${field}_uploading`]: false }))
    } catch(err) {
      alert('Upload failed: ' + err.message)
      setEditLesson(p => ({ ...p, [`${field}_uploading`]: false }))
    }
    e.target.value = ''
  }

  const topicMap = Object.fromEntries(topics.map(t => [t.id, t.name]))
  const coveredTopics = new Set(lessons.map(l => l.topic_id))
  const missing = topics.filter(t => !coveredTopics.has(t.id))

  if (editLesson) {
    return (
      <div style={s.section}>
        <button style={s.backBtn} onClick={() => setEditLesson(null)}>← Back</button>
        <div style={s.sectionLabel}>
          {editLesson.id ? `Editing: ${editLesson.title}` : 'New Lesson'}
        </div>
        {!editLesson.id && (
          <div style={s.field}>
            <label style={s.label}>Topic</label>
            <select style={s.select} value={editLesson.topic_id || ''}
              onChange={e => setEditLesson(p => ({ ...p, topic_id: e.target.value }))}>
              <option value="">Select topic…</option>
              {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        )}
        <div style={s.field}>
          <label style={s.label}>Title</label>
          <input style={s.input} value={editLesson.title || ''}
            onChange={e => setEditLesson(p => ({ ...p, title: e.target.value }))} />
        </div>
        <div style={s.field}>
          <label style={s.label}>Content (Markdown)</label>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
            <label style={{ display:'flex', alignItems:'center', gap:6, background:'var(--bg-elevated)', border:'1px solid var(--accent)', borderRadius:6, padding:'5px 12px', cursor:'pointer', fontSize:12, color:'var(--accent)', fontWeight:600 }}>
              📄 Upload .md file
              <input type="file" accept=".md,.txt" style={{ display:'none' }} onChange={handleMdUpload} />
            </label>
            {editLesson.content && (
              <span style={{ fontSize:11, color:'var(--text-muted)' }}>
                {editLesson.content.length.toLocaleString()} chars loaded
              </span>
            )}
          </div>
          <textarea style={s.textarea} rows={12} value={editLesson.content || ''}
            onChange={e => setEditLesson(p => ({ ...p, content: e.target.value }))} />
        </div>
        <div style={s.field}>
          <label style={s.label}>Memory Hook</label>
          <input style={s.input} value={editLesson.memory_hook || ''}
            onChange={e => setEditLesson(p => ({ ...p, memory_hook: e.target.value }))} />
        </div>
        <div style={s.field}>
          <label style={s.label}>Board Relevance</label>
          <input style={s.input} value={editLesson.board_relevance || ''}
            onChange={e => setEditLesson(p => ({ ...p, board_relevance: e.target.value }))} />
        </div>
        {/* Image Upload */}
        <div style={s.field}>
          <label style={s.label}>🖼 Lesson Image</label>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
            <label style={{ display:'flex', alignItems:'center', gap:6, background:'var(--bg-elevated)', border:'1px solid var(--accent)', borderRadius:6, padding:'5px 12px', cursor:'pointer', fontSize:12, color:'var(--accent)', fontWeight:600 }}>
              📷 Upload Image
              <input type="file" accept="image/*" style={{ display:'none' }} onChange={handleImageUpload} />
            </label>
            {editLesson.image_uploading && <span style={{ fontSize:11, color:'var(--text-muted)' }}>Uploading…</span>}
            {editLesson.image_url && <span style={{ fontSize:11, color:'#10B981' }}>✓ Uploaded</span>}
          </div>
          {editLesson.image_url && (
            <div style={{ position:'relative', marginBottom:6 }}>
              <img src={editLesson.image_url} alt="" style={{ maxWidth:'100%', maxHeight:140, borderRadius:8, border:'1px solid var(--border)', display:'block' }} />
              <button onClick={() => setEditLesson(p => ({ ...p, image_url: '' }))}
                style={{ position:'absolute', top:6, right:6, background:'rgba(0,0,0,0.7)', border:'none', color:'#fff', borderRadius:4, padding:'2px 8px', fontSize:11, cursor:'pointer' }}>✕</button>
            </div>
          )}
          <input style={s.input} placeholder="Or paste image URL…" value={editLesson.image_url || ''}
            onChange={e => setEditLesson(p => ({ ...p, image_url: e.target.value }))} />
        </div>

        {/* Video URL */}
        <div style={s.field}>
          <label style={s.label}>🎬 YouTube Video URL</label>
          <input style={s.input} placeholder="https://youtu.be/... (Full lesson video)"
            value={editLesson.video_url || ''}
            onChange={e => setEditLesson(p => ({ ...p, video_url: e.target.value }))} />
          <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:3 }}>Shows as embedded video in the lesson</div>
        </div>

        {/* Audio YouTube URL */}
        <div style={s.field}>
          <label style={s.label}>🎧 YouTube Audio Reviewer URL</label>
          <input style={s.input} placeholder="https://youtu.be/... (Audio reviewer on YouTube)"
            value={editLesson.audio_url || ''}
            onChange={e => setEditLesson(p => ({ ...p, audio_url: e.target.value }))} />
          <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:3 }}>Links to the audio reviewer on YouTube — opens in new tab</div>
        </div>

        {/* Infographic URL */}
        <div style={s.field}>
          <label style={s.label}>🖼 Infographic URL</label>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
            <label style={{ display:'flex', alignItems:'center', gap:6, background:'var(--bg-elevated)', border:'1px solid var(--accent)', borderRadius:6, padding:'5px 12px', cursor:'pointer', fontSize:12, color:'var(--accent)', fontWeight:600 }}>
              ☁️ Upload to R2
              <input type="file" accept="image/*" style={{ display:'none' }} onChange={e => handleR2Upload(e, 'infographic_url')} />
            </label>
            {editLesson.infographic_url_uploading && <span style={{ fontSize:11, color:'var(--text-muted)' }}>Uploading…</span>}
            {editLesson.infographic_url && !editLesson.infographic_url_uploading && <span style={{ fontSize:11, color:'#10B981' }}>✓</span>}
          </div>
          <input style={s.input} placeholder="Or paste image URL"
            value={editLesson.infographic_url || ''}
            onChange={e => setEditLesson(p => ({ ...p, infographic_url: e.target.value }))} />
        </div>

        {/* Mindmap URL */}
        <div style={s.field}>
          <label style={s.label}>🗺 Mindmap URL</label>
          <input style={s.input} placeholder="https://… (Canva, Miro, or image link)"
            value={editLesson.mindmap_url || ''}
            onChange={e => setEditLesson(p => ({ ...p, mindmap_url: e.target.value }))} />
        </div>

        <button style={s.btn} onClick={saveLesson} disabled={saving}>
          {saving ? 'Saving…' : 'Save Lesson'}
        </button>
      </div>
    )
  }

  return (
    <div style={s.section}>
      <div style={s.subtabBar}>
        {['edit', 'resources'].map(st => (
          <button key={st} style={{ ...s.subtabBtn, ...(subtab === st ? s.subtabBtnActive : {}) }}
            onClick={() => setSubtab(st)}>
            {st.charAt(0).toUpperCase() + st.slice(1)}
          </button>
        ))}
      </div>

      {subtab === 'edit' && (
        <>
          <button style={s.btn}
            onClick={() => setEditLesson({ topic_id: '', title: '', content: '', memory_hook: '', board_relevance: '' })}>
            + New Lesson
          </button>
          <div style={s.cardList}>
            {lessons.map(l => (
              <div key={l.id} style={s.cardRow}>
                <div>
                  <div style={s.cardQ}>{l.title}</div>
                  <div style={s.cardMeta}>
                    <span style={s.chip}>{topicMap[l.topic_id] || 'Unknown topic'}</span>
                  </div>
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  <button style={s.editBtn} onClick={() => setEditLesson(l)}>Edit</button>
                  <button style={s.deleteBtn} onClick={() => deleteLesson(l.id, l.title)}>✕</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {subtab === 'resources' && (
        <ResourcesTab topics={topics} />
      )}
    </div>
  )
}


// ── Resources Tab (inside LessonsTab) ────────────────────────────────────────
function ResourcesTab({ topics }) {
  const [selectedTopic, setSelectedTopic] = useState('')
  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ video_url: '', audio_url: '', infographic_url: '', mindmap_url: '' })
  const [saving, setSaving] = useState(false)
  const [existing, setExisting] = useState(null)

  async function loadResources(topicId) {
    setLoading(true)
    const { data } = await supabase.from('topic_resources').select('*').eq('topic_id', topicId)
    if (data?.[0]) {
      setExisting(data[0])
      setForm({
        video_url: data[0].video_url || '',
        audio_url: data[0].audio_url || '',
        infographic_url: data[0].infographic_url || '',
        mindmap_url: data[0].mindmap_url || '',
      })
    } else {
      setExisting(null)
      setForm({ video_url: '', audio_url: '', infographic_url: '', mindmap_url: '' })
    }
    setLoading(false)
  }

  function handleTopicChange(topicId) {
    setSelectedTopic(topicId)
    if (topicId) loadResources(topicId)
  }

  async function saveResources() {
    if (!selectedTopic) return
    setSaving(true)
    if (existing) {
      await supabase.from('topic_resources').update(form).eq('id', existing.id)
    } else {
      await supabase.from('topic_resources').insert([{ topic_id: selectedTopic, ...form }])
    }
    setSaving(false)
    loadResources(selectedTopic)
    alert('Resources saved!')
  }

  return (
    <div>
      <div style={s.sectionLabel}>Topic Resources</div>
      <div style={s.field}>
        <label style={s.label}>Select Topic</label>
        <select style={s.select} value={selectedTopic} onChange={e => handleTopicChange(e.target.value)}>
          <option value="">Choose a topic…</option>
          {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      {selectedTopic && !loading && (
        <>
          <div style={s.field}>
            <label style={s.label}>🎬 YouTube Video URL</label>
            <input style={s.input} value={form.video_url}
              placeholder="https://youtube.com/watch?v=..."
              onChange={e => setForm(p => ({ ...p, video_url: e.target.value }))} />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              Paste YouTube link — shows as embedded video in Topics screen
            </div>
          </div>
          <div style={s.field}>
            <label style={s.label}>🎧 Audio URL</label>
            <input style={s.input} value={form.audio_url}
              placeholder="https://... (Supabase storage or direct link)"
              onChange={e => setForm(p => ({ ...p, audio_url: e.target.value }))} />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              NotebookLM audio or any direct audio file link
            </div>
          </div>
          <div style={s.field}>
            <label style={s.label}>🖼 Infographic URL</label>
            <input style={s.input} value={form.infographic_url}
              placeholder="https://... (image link)"
              onChange={e => setForm(p => ({ ...p, infographic_url: e.target.value }))} />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              Direct image link — shown inline in Resources tab
            </div>
          </div>
          <div style={s.field}>
            <label style={s.label}>🗺 Mindmap URL</label>
            <input style={s.input} value={form.mindmap_url}
              placeholder="https://... (Canva, Miro, or image link)"
              onChange={e => setForm(p => ({ ...p, mindmap_url: e.target.value }))} />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              Canva, Miro, or any image/embed link
            </div>
          </div>
          <button style={s.btn} onClick={saveResources} disabled={saving}>
            {saving ? 'Saving…' : existing ? 'Update Resources' : 'Save Resources'}
          </button>
          {existing && (
            <div style={{ fontSize: 11, color: '#10B981', marginTop: 8 }}>
              ✓ Resources already saved for this topic — updating will overwrite
            </div>
          )}
        </>
      )}
      {loading && <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 12 }}>Loading…</div>}
    </div>
  )
}

// ── Announcements Tab ─────────────────────────────────────────────────────────
function AnnouncementsTab() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ title: '', body: '', active: true })
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => { loadItems() }, [])

  async function loadItems() {
    const { data } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }

  async function save() {
    if (!form.title.trim() || !form.body.trim()) return
    setSaving(true)
    await supabase.from('announcements').insert([{
      title: form.title.trim(),
      body: form.body.trim(),
      active: form.active,
    }])
    setSaving(false)
    setForm({ title: '', body: '', active: true })
    setShowForm(false)
    loadItems()
  }

  async function toggle(id, active) {
    await supabase.from('announcements').update({ active: !active }).eq('id', id)
    setItems(prev => prev.map(i => i.id === id ? { ...i, active: !active } : i))
  }

  async function remove(id) {
    await supabase.from('announcements').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  return (
    <div style={s.section}>
      {!showForm ? (
        <button style={s.btn} onClick={() => setShowForm(true)}>+ New Announcement</button>
      ) : (
        <div style={s.formCard}>
          <div style={s.field}>
            <label style={s.label}>Title</label>
            <input style={s.input} placeholder="e.g. New content added for Child Development"
              value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} autoFocus />
          </div>
          <div style={s.field}>
            <label style={s.label}>Message</label>
            <textarea style={s.textarea} rows={4}
              placeholder="What's new or what should students know?"
              value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} />
          </div>
          <div style={s.checkRow}>
            <input type="checkbox" id="active-check" checked={form.active}
              onChange={e => setForm(p => ({ ...p, active: e.target.checked }))} />
            <label htmlFor="active-check" style={s.checkLabel}>Active (visible to students)</label>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={s.btn} onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Post'}</button>
            <button style={s.ghostBtn} onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? <Loading /> : items.length === 0 ? (
        <div style={s.empty}>No announcements yet.</div>
      ) : items.map(item => (
        <div key={item.id} style={s.announcementCard}>
          <div style={s.announcementHeader}>
            <div>
              <div style={s.announcementTitle}>{item.title}</div>
              <div style={s.announcementDate}>
                {new Date(item.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button
                style={{ ...s.statusBtn, background: item.active ? 'rgba(16,185,129,0.1)' : 'var(--bg-elevated)', color: item.active ? '#10B981' : 'var(--text-muted)', border: `1px solid ${item.active ? '#10B981' : 'var(--border)'}` }}
                onClick={() => toggle(item.id, item.active)}>
                {item.active ? 'Active' : 'Inactive'}
              </button>
              <button style={s.deleteBtn} onClick={() => remove(item.id)}>✕</button>
            </div>
          </div>
          <div style={s.announcementBody}>{item.body}</div>
        </div>
      ))}
    </div>
  )
}

// ── Trials Tab ────────────────────────────────────────────────────────────────
function TrialsTab() {
  const [trials, setTrials] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadTrials() }, [])

  async function loadTrials() {
    const { data } = await supabase
      .from('trial_sessions')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(100)
    setTrials(data || [])
    setLoading(false)
  }

  const total     = trials.length
  const converted = trials.filter(t => t.converted).length
  const convRate  = total > 0 ? Math.round((converted / total) * 100) : 0
  const byLET     = trials.filter(t => t.course_id === 'LET').length

  return (
    <div style={s.section}>
      <div style={ow.grid}>
        {[
          { label: 'Total Trials',   val: total,     color: '#8B5CF6' },
          { label: 'Converted',      val: converted, color: '#10B981' },
          { label: 'Conv. Rate',     val: `${convRate}%`, color: '#F59E0B' },
          { label: 'LET Trials',     val: byLET,     color: 'var(--accent)' },
        ].map(stat => (
          <div key={stat.label} style={ow.statCard}>
            <div style={{ ...ow.statVal, color: stat.color }}>{stat.val}</div>
            <div style={ow.statLabel}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div style={s.sectionLabel}>Recent Trials</div>
      {loading ? <Loading /> : (
        <div style={s.cardList}>
          {trials.map(t => (
            <div key={t.id} style={s.cardRow}>
              <div style={{ flex: 1 }}>
                <div style={s.cardQ}>{t.name} <span style={s.chip}>{t.course_id}</span></div>
                <div style={s.cardMeta}>
                  <span style={s.chip}>{t.email}</span>
                  <span style={s.chip}>{new Date(t.started_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</span>
                </div>
              </div>
              <span style={{
                ...s.chip,
                color: t.converted ? '#10B981' : 'var(--text-muted)',
                borderColor: t.converted ? '#10B981' : 'var(--border)',
              }}>
                {t.converted ? '✓ Paid' : 'Trial'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Students Tab ──────────────────────────────────────────────────────────────
function StudentsTab() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => { loadStudents() }, [])

  async function loadStudents() {
    const { data } = await supabase
      .from('customers')
      .select('id, name, email, created_at, is_active, referral_code')
      .order('created_at', { ascending: false })
    setStudents(data || [])
    setLoading(false)
  }

  const filtered = students.filter(s =>
    !search ||
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={s.section}>
      <input style={s.searchInput} placeholder="Search students…"
        value={search} onChange={e => setSearch(e.target.value)} />
      <div style={s.listCount}>{filtered.length} students</div>
      {loading ? <Loading /> : (
        <div style={s.cardList}>
          {filtered.map(st => (
            <div key={st.id} style={s.cardRow}>
              <div style={ow.avatar}>{st.name?.[0]?.toUpperCase() || '?'}</div>
              <div style={{ flex: 1 }}>
                <div style={s.cardQ}>{st.name}</div>
                <div style={s.cardMeta}>
                  <span style={s.chip}>{st.email}</span>
                  {st.referral_code && <span style={s.chip}>ref: {st.referral_code}</span>}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ ...s.chip, color: st.is_active ? '#10B981' : '#e05c5c' }}>
                  {st.is_active ? 'Active' : 'Inactive'}
                </span>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>
                  {new Date(st.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Keys Tab ──────────────────────────────────────────────────────────────────
function KeysTab() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [course, setCourse] = useState('LET')
  const [result, setResult] = useState(null)
  const [status, setStatus] = useState('idle')

  async function generate() {
    if (!name.trim() || !email.trim()) return
    setStatus('loading')
    const ownerPass = sessionStorage.getItem('owner_auth') || sessionStorage.getItem('ownerPassword') || localStorage.getItem('owner_auth')
    const res = await fetch('/api/owner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'generate-key', name, email, password: ownerPass, course }),
    })
    const data = await res.json()
    if (data.key) {
      setResult(data)
      setStatus('success')
      setName('')
      setEmail('')
    } else {
      setStatus('error')
    }
  }

  return (
    <div style={s.section}>
      <div style={s.sectionLabel}>Generate Access Key</div>
      <div style={s.field}>
        <label style={s.label}>Student Name</label>
        <input style={s.input} value={name} onChange={e => setName(e.target.value)} placeholder="Juan dela Cruz" />
      </div>
      <div style={s.field}>
        <label style={s.label}>Email</label>
        <input style={s.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="juan@email.com" />
      </div>
      <div style={s.field}>
        <label style={s.label}>Course</label>
        <select style={s.select} value={course} onChange={e => setCourse(e.target.value)}>
          <option value="LET">LET</option>
          <option value="TESDA">TESDA</option>
          <option value="NLE">NLE</option>
          <option value="CPA">CPA</option>
          <option value="BAR">Bar</option>
        </select>
      </div>
      <button style={s.btn} onClick={generate} disabled={status === 'loading'}>
        {status === 'loading' ? 'Generating…' : 'Generate Key'}
      </button>
      {result && (
        <div style={s.resultBox}>
          <div style={s.resultLabel}>Access Key</div>
          <div style={s.keyDisplay}>{result.key}</div>
          <div style={s.resultNote}>Send this key to {result.email || email}</div>
          <button style={s.ghostBtn} onClick={() => navigator.clipboard.writeText(result.key)}>
            Copy Key
          </button>
        </div>
      )}
    </div>
  )
}

// ── Shared helpers ────────────────────────────────────────────────────────────
function Loading() {
  return <div style={{ padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
}

// ── Styles ────────────────────────────────────────────────────────────────────
const ow = {
  grid        : { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 },
  statCard    : { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px', textAlign: 'center' },
  statVal     : { fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, lineHeight: 1 },
  statLabel   : { fontSize: 10, color: 'var(--text-muted)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '.04em' },
  studentRow  : { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)' },
  avatar      : { width: 34, height: 34, borderRadius: '50%', background: 'var(--accent-dim)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--accent)', flexShrink: 0 },
  studentName : { fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 },
  studentEmail: { fontSize: 11, color: 'var(--text-muted)' },
  studentDate : { fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 },
}

const s = {
  root            : { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)', padding: 20 },
  loginCard       : { width: '100%', maxWidth: 360, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: '36px 28px', display: 'flex', flexDirection: 'column', gap: 16 },
  dashboard       : { minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column' },
  dashHeader      : { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 0', flexShrink: 0 },
  brand           : { display: 'flex', alignItems: 'center', gap: 10 },
  brandIcon       : { width: 34, height: 34, background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, color: 'var(--accent)' },
  brandName       : { fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--text-primary)', lineHeight: 1.1 },
  brandBy         : { fontSize: 10, color: 'var(--accent)', letterSpacing: '0.06em', textTransform: 'uppercase' },
  exitBtn         : { fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none', padding: '6px 12px', border: '1px solid var(--border)', borderRadius: 8 },
  tabBar          : { display: 'flex', gap: 0, padding: '16px 20px 0', borderBottom: '1px solid var(--border)', flexShrink: 0, overflowX: 'auto' },
  tabBtn          : { padding: '8px 12px', background: 'transparent', border: 'none', borderBottom: '2px solid transparent', color: 'var(--text-muted)', fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s', marginBottom: -1, whiteSpace: 'nowrap', fontFamily: 'inherit' },
  tabBtnActive    : { color: 'var(--accent)', borderBottomColor: 'var(--accent)' },
  tabContent      : { flex: 1, overflowY: 'auto' },
  section         : { padding: '20px', display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 600 },
  sectionLabel    : { fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 600 },
  subtabBar       : { display: 'flex', gap: 6, marginBottom: 4 },
  subtabBtn       : { padding: '6px 14px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 20, fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' },
  subtabBtnActive : { background: 'var(--accent-dim)', border: '1px solid var(--accent)', color: 'var(--accent)' },
  field           : { display: 'flex', flexDirection: 'column', gap: 6 },
  label           : { fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em' },
  input           : { padding: '10px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' },
  textarea        : { padding: '10px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'monospace', resize: 'vertical' },
  select          : { padding: '10px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', width: '100%', fontFamily: 'inherit' },
  btn             : { padding: '11px 16px', background: 'var(--accent)', color: '#0d0d0d', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'opacity 0.15s' },
  ghostBtn        : { padding: '10px 16px', background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' },
  backBtn         : { padding: '6px 12px', background: 'none', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', alignSelf: 'flex-start' },
  error           : { fontSize: 13, color: '#e05c5c', padding: '8px 12px', background: 'rgba(224,92,92,0.08)', borderRadius: 8 },
  msg             : { fontSize: 13, padding: '8px 12px', borderRadius: 8 },
  hint            : { fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' },
  statRow         : { display: 'flex', alignItems: 'baseline', gap: 8 },
  bigStat         : { fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 700, color: 'var(--accent)', lineHeight: 1 },
  bigStatLabel    : { fontSize: 13, color: 'var(--text-muted)' },
  topicBars       : { display: 'flex', flexDirection: 'column', gap: 6 },
  topicBarRow     : { display: 'flex', alignItems: 'center', gap: 8 },
  topicBarName    : { fontSize: 11, color: 'var(--text-secondary)', width: 160, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  topicBarWrap    : { flex: 1, height: 6, background: 'var(--bg-elevated)', borderRadius: 3, overflow: 'hidden' },
  topicBarFill    : { height: '100%', background: 'var(--accent)', borderRadius: 3, transition: 'width 0.5s' },
  topicBarCount   : { fontSize: 11, color: 'var(--text-muted)', width: 28, textAlign: 'right' },
  filterRow       : { display: 'flex', gap: 8 },
  searchInput     : { flex: 1, padding: '8px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, outline: 'none', fontFamily: 'inherit' },
  listCount       : { fontSize: 11, color: 'var(--text-muted)' },
  cardList        : { display: 'flex', flexDirection: 'column', gap: 6 },
  cardRow         : { display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' },
  cardQ           : { fontSize: 12, color: 'var(--text-primary)', marginBottom: 4, flex: 1 },
  cardMeta        : { display: 'flex', gap: 4, flexWrap: 'wrap' },
  chip            : { fontSize: 10, padding: '2px 6px', borderRadius: 6, background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' },
  deleteBtn       : { padding: '4px 8px', background: 'none', border: '1px solid rgba(224,92,92,0.3)', borderRadius: 6, color: '#e05c5c', fontSize: 11, cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit' },
  editBtn         : { padding: '5px 10px', background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 6, color: 'var(--accent)', fontSize: 11, cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit' },
  missingRow      : { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(224,92,92,0.06)', border: '1px solid rgba(224,92,92,0.2)', borderRadius: 8 },
  missingName     : { fontSize: 13, color: 'var(--text-primary)' },
  addBtn          : { padding: '4px 10px', background: 'var(--accent)', color: '#0d0d0d', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' },
  formCard        : { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 },
  checkRow        : { display: 'flex', alignItems: 'center', gap: 8 },
  checkLabel      : { fontSize: 13, color: 'var(--text-secondary)' },
  announcementCard: { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px' },
  announcementHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  announcementTitle: { fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 },
  announcementDate: { fontSize: 11, color: 'var(--text-muted)' },
  announcementBody: { fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 },
  statusBtn       : { fontSize: 11, padding: '3px 8px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 },
  resultBox       : { background: 'rgba(58,154,106,0.08)', border: '1px solid rgba(58,154,106,0.25)', borderRadius: 10, padding: '16px', display: 'flex', flexDirection: 'column', gap: 8 },
  resultLabel     : { fontSize: 11, color: '#3a9a6a', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 },
  keyDisplay      : { fontFamily: 'monospace', fontSize: 22, color: 'var(--accent)', fontWeight: 700, letterSpacing: '0.1em' },
  resultNote      : { fontSize: 12, color: 'var(--text-muted)' },
  empty           : { fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' },
}

// ── Agents Tab ────────────────────────────────────────────────────────────────
function AgentsTab() {
  const [agents,    setAgents]    = useState([])
  const [loading,   setLoading]   = useState(true)
  const [showForm,  setShowForm]  = useState(false)
  const [form,      setForm]      = useState({ name:'', email:'', gcash_number:'' })
  const [saving,    setSaving]    = useState(false)
  const [savedMsg,  setSavedMsg]  = useState('')
  const [payoutModal, setPayoutModal] = useState(null) // agent object
  const [payout,    setPayout]    = useState({ period_start:'', period_end:'', gcash_ref:'', screenshot_url:'' })
  const [paying,    setPaying]    = useState(false)
  const [showBlast, setShowBlast] = useState(false)
  const [blast,     setBlast]     = useState({ subject:"", message:"", resource_url:"", resource_label:"" })
  const [blasting,  setBlasting]  = useState(false)
  const [blastMsg,  setBlastMsg]  = useState("")
  const screenshotRef = useRef(null)

  useEffect(() => { loadAgents() }, [])

  async function loadAgents() {
    try {
      const { data: agentData } = await supabase
        .from('agents')
        .select('*')
        .order('created_at', { ascending: false })

      const agents = agentData || []

      // Fetch payouts separately for each agent
      if (agents.length > 0) {
        const { data: payoutData } = await supabase
          .from('agent_payouts')
          .select('*')
          .in('agent_id', agents.map(a => a.id))

        const payouts = payoutData || []
        agents.forEach(a => {
          a.agent_payouts = payouts.filter(p => p.agent_id === a.id)
        })
      }

      setAgents(agents)
    } catch(e) {
      console.error('loadAgents error:', e)
    }
    setLoading(false)
  }

  function generateCode(name) {
    const base = name.toUpperCase().replace(/[^A-Z]/g,'').slice(0,4).padEnd(4,'X')
    const rand  = Math.floor(1000 + Math.random() * 9000)
    return `${base}${rand}`
  }

  async function sendBlast() {
    if (!blast.subject.trim() || !blast.message.trim()) return
    setBlasting(true)
    setBlastMsg("")
    const res = await fetch("/api/send-agent-blast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(blast),
    })
    const data = await res.json()
    if (data.success) {
      setBlastMsg(`Sent to ${data.sent} agent${data.sent !== 1 ? "s" : ""}${data.failed > 0 ? ` (${data.failed} failed)` : ""}.`)
      setBlast({ subject:"", message:"", resource_url:"", resource_label:"" })
      setShowBlast(false)
    } else {
      setBlastMsg("Failed to send. Try again.")
    }
    setBlasting(false)
  }

  async function deleteAgent(id) {
    if (!window.confirm('Delete this agent? This cannot be undone.')) return
    await supabase.from('agents').delete().eq('id', id)
    setAgents(prev => prev.filter(a => a.id !== id))
  }

  async function enrollAgent() {
    if (!form.name.trim() || !form.email.trim() || !form.gcash_number.trim()) return
    setSaving(true)
    setSavedMsg('')
    const code = generateCode(form.name)
    const { data, error } = await supabase.from('agents').insert([{
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      gcash_number: form.gcash_number.trim(),
      referral_code: code,
    }]).select().single()

    if (!error && data) {
      // Send welcome email
      await fetch('/api/send-agent-welcome', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          referral_code: code,
          gcash_number: form.gcash_number,
        }),
      })
      setSavedMsg(`Agent enrolled! Code: ${code} — Welcome email sent.`)
      setForm({ name:'', email:'', gcash_number:'' })
      setShowForm(false)
      loadAgents()
    }
    setSaving(false)
  }

  async function uploadScreenshot(file) {
    const ext  = file.name.split('.').pop()
    const path = `payouts/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('payout-screenshots').upload(path, file)
    if (error) return null
    // Try public URL first; fall back to signed URL (valid 7 days) if bucket is private
    const { data: pubData } = supabase.storage.from('payout-screenshots').getPublicUrl(path)
    if (pubData?.publicUrl && !pubData.publicUrl.includes('undefined')) return pubData.publicUrl
    const { data: signedData } = await supabase.storage.from('payout-screenshots').createSignedUrl(path, 60 * 60 * 24 * 7)
    return signedData?.signedUrl || null
  }

  async function markPaid(agent) {
    if (!payout.period_start || !payout.period_end) return
    setPaying(true)

    // Upload screenshot if selected
    let screenshotUrl = ''
    if (screenshotRef.current?.files?.[0]) {
      screenshotUrl = await uploadScreenshot(screenshotRef.current.files[0]) || ''
    }

    const referralCount = agent._unpaidReferrals ?? (agent.total_referrals || 0)
    const amount = referralCount * 50

    // Insert payout record
    await supabase.from('agent_payouts').insert([{
      agent_id:       agent.id,
      amount,
      referral_count: referralCount,
      period_start:   payout.period_start,
      period_end:     payout.period_end,
      paid:           true,
      paid_at:        new Date().toISOString(),
      gcash_ref:      payout.gcash_ref,
      screenshot_url: screenshotUrl,
      email_sent:     true,
    }])

    // Send payout email
    await fetch('/api/send-email', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        type:           'payout',
        agent_id:       agent.id,
        agent_name:     agent.name,
        agent_email:    agent.email,
        amount,
        referral_count: referralCount,
        gcash_ref:      payout.gcash_ref,
        screenshot_url: screenshotUrl,
        period_start:   payout.period_start,
        period_end:     payout.period_end,
      }),
    })

    setPaying(false)
    setPayoutModal(null)
    setPayout({ period_start:'', period_end:'', gcash_ref:'', screenshot_url:'' })
    loadAgents()
  }

  return (
    <div style={s.section}>
      {savedMsg && <div style={{ ...s.msg, color: "#10B981" }}>{savedMsg}</div>}
      {blastMsg && <div style={{ ...s.msg, color: "#10B981" }}>{blastMsg}</div>}

      {showBlast && (
        <div style={s.formCard}>
          <div style={s.sectionLabel}>Email All Agents</div>
          <div style={s.field}><label style={s.label}>Subject</label><input style={s.input} placeholder="e.g. New resources available!" value={blast.subject} onChange={e => setBlast(p => ({ ...p, subject: e.target.value }))} /></div>
          <div style={s.field}><label style={s.label}>Message</label><textarea style={s.textarea} rows={6} placeholder="Write your update here..." value={blast.message} onChange={e => setBlast(p => ({ ...p, message: e.target.value }))} /></div>
          <div style={s.field}><label style={s.label}>Resource Link (optional)</label><input style={s.input} placeholder="https://..." value={blast.resource_url} onChange={e => setBlast(p => ({ ...p, resource_url: e.target.value }))} /></div>
          <div style={s.field}><label style={s.label}>Link Button Label (optional)</label><input style={s.input} placeholder="e.g. View New Resources →" value={blast.resource_label} onChange={e => setBlast(p => ({ ...p, resource_label: e.target.value }))} /></div>
          <div style={{ display:"flex", gap:8 }}>
            <button style={s.btn} onClick={sendBlast} disabled={blasting}>{blasting ? "Sending..." : "Send to All Agents"}</button>
            <button style={s.ghostBtn} onClick={() => setShowBlast(false)}>Cancel</button>
          </div>
        </div>
      )}

      {!showForm ? (
        <div style={{ display:"flex", gap:8 }}>
          <button style={s.btn} onClick={() => setShowForm(true)}>+ Enroll New Agent</button>
          <button style={s.ghostBtn} onClick={() => setShowBlast(true)}>📣 Email All Agents</button>
        </div>
      ) : (
        <div style={s.formCard}>
          <div style={s.sectionLabel}>New Agent</div>
          {[
            { label:'Full Name',     key:'name',         type:'text',  ph:'Maria Santos' },
            { label:'Email',         key:'email',        type:'email', ph:'maria@email.com' },
            { label:'GCash Number',  key:'gcash_number', type:'text',  ph:'09XX XXX XXXX' },
          ].map(f => (
            <div key={f.key} style={s.field}>
              <label style={s.label}>{f.label}</label>
              <input style={s.input} type={f.type} placeholder={f.ph}
                value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
            </div>
          ))}
          <div style={{ display:'flex', gap:8 }}>
            <button style={s.btn} onClick={enrollAgent} disabled={saving}>
              {saving ? 'Enrolling…' : 'Enroll + Send Email'}
            </button>
            <button style={s.ghostBtn} onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? <Loading /> : agents.length === 0 ? (
        <div style={s.empty}>No agents yet.</div>
      ) : agents.map(agent => {
        const unpaidReferrals = agent.total_referrals -
          (agent.agent_payouts?.filter(p => p.paid).reduce((sum, p) => sum + p.referral_count, 0) || 0)
        const owedAmount = Math.max(0, unpaidReferrals) * 50

        return (
          <div key={agent.id} style={ag.agentCard}>
            <div style={ag.agentHeader}>
              <div style={ow.avatar}>{agent.name?.[0]?.toUpperCase()}</div>
              <div style={{ flex:1 }}>
                <div style={ag.agentName}>{agent.name}</div>
                <div style={ag.agentMeta}>{agent.email} · GCash: {agent.gcash_number}</div>
              </div>
              <div style={ag.codeBox}>{agent.referral_code}</div>
              <button style={ag.deleteAgentBtn} onClick={() => deleteAgent(agent.id)} title="Delete agent">✕</button>
            </div>

            <div style={ag.statsRow}>
              <div style={ag.stat}>
                <div style={ag.statVal}>{agent.total_referrals}</div>
                <div style={ag.statLabel}>Total Referrals</div>
              </div>
              <div style={ag.stat}>
                <div style={{ ...ag.statVal, color: owedAmount > 0 ? '#F59E0B' : '#10B981' }}>
                  ₱{owedAmount}
                </div>
                <div style={ag.statLabel}>Owed This Week</div>
              </div>
              <div style={ag.stat}>
                <div style={ag.statVal}>₱{agent.total_commission}</div>
                <div style={ag.statLabel}>Total Earned</div>
              </div>
            </div>

            {owedAmount > 0 && (
              <button style={ag.payBtn} onClick={() => setPayoutModal({ ...agent, _unpaidReferrals: unpaidReferrals })}>
                💸 Mark Paid — ₱{owedAmount}
              </button>
            )}
          </div>
        )
      })}

      {/* Payout modal */}
      {payoutModal && (
        <div style={ag.modalOverlay}>
          <div style={ag.modal}>
            <div style={s.sectionLabel}>Pay {payoutModal.name}</div>
            <div style={ag.modalAmount}>₱{payoutModal.total_referrals * 50}</div>
            <div style={ag.modalSub}>{payoutModal.total_referrals} referrals × ₱50</div>

            <div style={s.field}>
              <label style={s.label}>Period Start</label>
              <input style={s.input} type="date"
                value={payout.period_start}
                onChange={e => setPayout(p => ({ ...p, period_start: e.target.value }))} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Period End</label>
              <input style={s.input} type="date"
                value={payout.period_end}
                onChange={e => setPayout(p => ({ ...p, period_end: e.target.value }))} />
            </div>
            <div style={s.field}>
              <label style={s.label}>GCash Reference Number</label>
              <input style={s.input} placeholder="e.g. 1234567890"
                value={payout.gcash_ref}
                onChange={e => setPayout(p => ({ ...p, gcash_ref: e.target.value }))} />
            </div>
            <div style={s.field}>
              <label style={s.label}>GCash Screenshot</label>
              <input type="file" accept="image/*" ref={screenshotRef} style={{ color:'var(--text-muted)', fontSize:13 }} />
              <div style={s.hint}>Screenshot will be included in the email to the agent.</div>
            </div>

            <div style={{ display:'flex', gap:8, marginTop:8 }}>
              <button style={s.btn} onClick={() => markPaid(payoutModal)} disabled={paying}>
                {paying ? 'Sending…' : 'Confirm + Send Email'}
              </button>
              <button style={s.ghostBtn} onClick={() => setPayoutModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sales Tab ─────────────────────────────────────────────────────────────────
function SalesTab() {
  const [sales,   setSales]   = useState([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState('')

  useEffect(() => { loadSales() }, [])

  async function loadSales() {
    const { data } = await supabase
      .from('customers')
      .select('id, name, email, created_at, agent_code, amount_paid, referral_code')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    setSales(data || [])
    setLoading(false)
  }

  const filtered = sales.filter(s =>
    !filter ||
    s.name?.toLowerCase().includes(filter.toLowerCase()) ||
    s.email?.toLowerCase().includes(filter.toLowerCase()) ||
    s.agent_code?.toLowerCase().includes(filter.toLowerCase())
  )

  const totalRevenue   = sales.reduce((sum, s) => sum + (s.amount_paid || 249), 0)
  const withAgent      = sales.filter(s => s.agent_code).length
  const commissions    = withAgent * 50
  const discounts      = sales.reduce((sum, s) => sum + (s.agent_code ? (249 - (s.amount_paid || 249)) : 0), 0)
  const netRevenue     = totalRevenue - commissions

  return (
    <div style={s.section}>
      <div style={ow.grid}>
        {[
          { label:'Total Sales',     val: sales.length,             color:'var(--accent)' },
          { label:'Gross Revenue',   val:`₱${totalRevenue.toLocaleString()}`, color:'#10B981' },
          { label:'Net Revenue',     val:`₱${netRevenue.toLocaleString()}`,   color:'#10B981' },
          { label:'Agent Sales',     val: withAgent,                color:'#8B5CF6' },
          { label:'Commissions',     val:`₱${commissions.toLocaleString()}`,  color:'#F59E0B' },
          { label:'Discounts Given', val:`₱${discounts.toLocaleString()}`,    color:'#e05c5c' },
        ].map(stat => (
          <div key={stat.label} style={ow.statCard}>
            <div style={{ ...ow.statVal, color:stat.color }}>{stat.val}</div>
            <div style={ow.statLabel}>{stat.label}</div>
          </div>
        ))}
      </div>

      <input style={s.searchInput} placeholder="Search by name, email, or agent code…"
        value={filter} onChange={e => setFilter(e.target.value)} />
      <div style={s.listCount}>{filtered.length} sales</div>

      {loading ? <Loading /> : (
        <div style={s.cardList}>
          {filtered.map(sale => (
            <div key={sale.id} style={s.cardRow}>
              <div style={ow.avatar}>{sale.name?.[0]?.toUpperCase() || '?'}</div>
              <div style={{ flex:1 }}>
                <div style={s.cardQ}>{sale.name}</div>
                <div style={s.cardMeta}>
                  <span style={s.chip}>{sale.email}</span>
                  {sale.agent_code && <span style={{ ...s.chip, color:'#8B5CF6', borderColor:'#8B5CF6' }}>ref: {sale.agent_code}</span>}
                </div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:14, fontWeight:700, color:'#10B981' }}>
                  ₱{sale.amount_paid || 249}
                </div>
                <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>
                  {new Date(sale.created_at).toLocaleDateString('en-PH', { month:'short', day:'numeric', year:'numeric' })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Feedback Tab ──────────────────────────────────────────────────────────────
function FeedbackTab() {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState('all') // all | feedback | bug | content
  const [expanded, setExpanded] = useState(null)

  useEffect(() => { loadFeedback() }, [])

  async function loadFeedback() {
    // Feedback is stored in a simple table we create below
    // Falls back gracefully if table doesn't exist yet
    try {
      const { data } = await supabase
        .from('feedback')
        .select('*')
        .order('created_at', { ascending: false })
      setItems(data || [])
    } catch {
      setItems([])
    }
    setLoading(false)
  }

  async function markRead(id) {
    await supabase.from('feedback').update({ read: true }).eq('id', id)
    setItems(prev => prev.map(i => i.id === id ? { ...i, read: true } : i))
  }

  async function deleteItem(id) {
    await supabase.from('feedback').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  async function markDone(item) {
    // 1. Mark as read/done in feedback table
    await supabase.from('feedback').update({ read: true, done: true }).eq('id', item.id)
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, read: true, done: true } : i))

    // 2. Auto-post an announcement about it
    const topicName = item.message?.slice(0, 80) || 'your requested topic'
    const announcement = `📚 New lesson available! We just uploaded a lesson based on a student request: "${topicName}". Check the Lessons tab to study it now!`
    await supabase.from('announcements').insert({
      content: announcement,
      tag: 'lesson',
      is_pinned: true,
    })

    // 3. Send email to ALL active students
    try {
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'topic-request-done',
          send_all: true,
          topic: topicName,
          requester_name: item.name || 'one of your fellow reviewees',
        }),
      })
    } catch (e) {
      console.warn('Email send failed:', e)
    }

    alert('✅ Marked as done, announcement posted, and email sent to all students!')
  }

  const typeIcon = { feedback: '💬', bug: '🐛', content: '📝', request: '📚' }
  const typeColor = { feedback: '#10B981', bug: '#ef4444', content: '#F59E0B', request: '#8B5CF6' }

  const filtered = filter === 'all' ? items : items.filter(i => i.type === filter)
  const unread = items.filter(i => !i.read).length

  return (
    <div style={s.section}>
      {/* Stats */}
      <div style={ow.grid}>
        {[
          { label: 'Total',    val: items.length,                                    color: 'var(--accent)' },
          { label: 'Unread',   val: unread,                                          color: unread > 0 ? '#ef4444' : '#10B981' },
          { label: 'Bugs',     val: items.filter(i => i.type === 'bug').length,      color: '#ef4444' },
          { label: 'Content',  val: items.filter(i => i.type === 'content').length,  color: '#F59E0B' },
          { label: 'Feedback', val: items.filter(i => i.type === 'feedback').length, color: '#10B981' },
              { label: 'Requests', val: items.filter(i => i.type === 'request').length, color: '#8B5CF6' },
        ].map(stat => (
          <div key={stat.label} style={ow.statCard}>
            <div style={{ ...ow.statVal, color: stat.color }}>{stat.val}</div>
            <div style={ow.statLabel}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={s.subtabBar}>
        {['all','feedback','bug','content','request'].map(f => (
          <button key={f}
            style={{ ...s.subtabBtn, ...(filter === f ? s.subtabBtnActive : {}) }}
            onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : f === 'feedback' ? '💬 Feedback' : f === 'bug' ? '🐛 Bugs' : f === 'content' ? '📝 Content' : '📚 Requests'}
          </button>
        ))}
      </div>

      {loading ? <Loading /> : filtered.length === 0 ? (
        <div style={s.empty}>
          {items.length === 0
            ? 'No feedback yet. Students submit via Profile → Feedback.'
            : 'No items in this category.'}
        </div>
      ) : (
        <div style={s.cardList}>
          {filtered.map(item => (
            <div key={item.id} style={{
              ...s.cardRow,
              flexDirection: 'column',
              alignItems: 'stretch',
              gap: 0,
              opacity: item.read ? 0.7 : 1,
              borderColor: item.read ? 'var(--border)' : typeColor[item.type] || 'var(--border)',
            }}>
              {/* Header row */}
              <div style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', padding:'2px 0' }}
                onClick={() => { setExpanded(expanded === item.id ? null : item.id); if (!item.read) markRead(item.id) }}>
                <span style={{ fontSize:16 }}>{typeIcon[item.type] || '💬'}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>
                    {item.name || 'Anonymous'}
                    {!item.read && <span style={{ marginLeft:6, fontSize:9, background:'#ef4444', color:'#fff', padding:'1px 5px', borderRadius:10, fontWeight:700 }}>NEW</span>}
                  </div>
                  <div style={{ fontSize:11, color:'var(--text-muted)' }}>
                    {item.email || 'No email'} · {new Date(item.created_at).toLocaleDateString('en-PH', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}
                  </div>
                </div>
                <span style={{ fontSize:11, color: typeColor[item.type], fontWeight:600 }}>
                  {item.type}
                </span>
                <span style={{ fontSize:12, color:'var(--text-muted)' }}>{expanded === item.id ? '▲' : '▼'}</span>
              </div>

              {/* Expanded content */}
              {expanded === item.id && (
                <div style={{ marginTop:10, paddingTop:10, borderTop:'1px solid var(--border)' }}>
                  <div style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.7, marginBottom:10, whiteSpace:'pre-wrap' }}>
                    {item.message}
                  </div>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    {item.type === 'request' && !item.done && (
                      <button onClick={() => markDone(item)} style={{
                        fontSize:12, fontWeight:700, color:'#fff',
                        background:'#8B5CF6', border:'none',
                        padding:'6px 14px', borderRadius:6, cursor:'pointer',
                        fontFamily:'inherit',
                      }}>
                        ✅ Mark Done + Post Announcement
                      </button>
                    )}
                    {item.done && (
                      <span style={{ fontSize:11, color:'#8B5CF6', fontWeight:600, padding:'5px 10px', border:'1px solid #8B5CF6', borderRadius:6 }}>
                        ✅ Done — Lesson uploaded
                      </span>
                    )}
                    {item.email && (
                      <a href={`mailto:${item.email}?subject=Re: Your Topic Request — Now Available on Readwise!`}
                        style={{ fontSize:12, color:'var(--accent)', textDecoration:'none', padding:'5px 12px', border:'1px solid var(--accent)', borderRadius:6 }}>
                        Notify Student →
                      </a>
                    )}
                    <button style={{ ...s.deleteBtn, fontSize:11 }} onClick={() => deleteItem(item.id)}>Delete</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* SQL to create feedback table */}
      <div style={{ marginTop:16, padding:'12px', background:'var(--bg-elevated)', borderRadius:8, fontSize:11, color:'var(--text-muted)', lineHeight:1.6 }}>
        <strong style={{ color:'var(--text-primary)' }}>Note:</strong> Feedback is sent to your email via Resend.
        To also store it here, run this SQL in Supabase once:
        <pre style={{ marginTop:6, fontSize:10, color:'var(--accent)', whiteSpace:'pre-wrap' }}>
{`create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  name text, email text, type text, message text,
  read boolean default false,
  done boolean default false,
  created_at timestamptz default now()
);
alter table feedback enable row level security;
create policy "Service role" on feedback for all using (true);

-- Add done column if table already exists:
alter table feedback add column if not exists done boolean default false;`}
        </pre>
      </div>
    </div>
  )
}


const ag = {
  agentCard   : { background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:12, padding:'14px', marginBottom:8 },
  agentHeader : { display:'flex', alignItems:'center', gap:10, marginBottom:12 },
  agentName   : { fontSize:14, fontWeight:600, color:'var(--text-primary)' },
  agentMeta   : { fontSize:11, color:'var(--text-muted)' },
  codeBox     : { fontFamily:'monospace', fontSize:14, fontWeight:700, color:'var(--accent)', background:'var(--accent-dim)', border:'1px solid var(--accent)', borderRadius:8, padding:'4px 10px' },
  statsRow    : { display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:10 },
  stat        : { background:'var(--bg-elevated)', borderRadius:8, padding:'10px', textAlign:'center' },
  statVal     : { fontSize:16, fontWeight:700, color:'var(--text-primary)', fontFamily:'var(--font-display)' },
  statLabel   : { fontSize:9, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.04em', marginTop:3 },
  deleteAgentBtn: { background:'none', border:'1px solid rgba(224,92,92,0.3)', borderRadius:6, color:'#e05c5c', fontSize:13, cursor:'pointer', padding:'4px 8px', flexShrink:0 },
  payBtn      : { width:'100%', padding:'10px', background:'rgba(16,185,129,0.1)', border:'1px solid #10B981', borderRadius:8, color:'#10B981', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' },
  modalOverlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 },
  modal       : { background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:16, padding:'24px', width:'100%', maxWidth:420, display:'flex', flexDirection:'column', gap:14 },
  modalAmount : { fontFamily:'var(--font-display)', fontSize:40, fontWeight:800, color:'#10B981', lineHeight:1 },
  modalSub    : { fontSize:12, color:'var(--text-muted)', marginTop:-8 },
}




// ── TESDA Tab ─────────────────────────────────────────────────────────────────
function TesdaTab() {
  const [quals,      setQuals]      = useState([])
  const [subtopics,  setSubtopics]  = useState([])
  const [activeQual, setActiveQual] = useState(null)
  const [editing,    setEditing]    = useState(null) // subtopic being edited
  const [saving,     setSaving]     = useState(false)
  const [loading,    setLoading]    = useState(true)
  const [uploading,  setUploading]  = useState(false)

  useEffect(() => { loadQuals() }, [])

  async function loadQuals() {
    setLoading(true)
    const { data } = await supabase.from('tesda_qualifications').select('*').order('sort_order')
    setQuals(data || [])
    setLoading(false)
  }

  async function loadSubtopics(qualId) {
    const { data } = await supabase
      .from('tesda_subtopics')
      .select('*')
      .eq('qualification_id', qualId)
      .order('sort_order')
    setSubtopics(data || [])
  }

  async function selectQual(q) {
    setActiveQual(q)
    setEditing(null)
    await loadSubtopics(q.id)
  }

  async function saveSubtopic() {
    if (!editing) return
    setSaving(true)
    const payload = {
      qualification_id: activeQual.id,
      name            : editing.name,
      description     : editing.description     || null,
      html_url        : editing.html_url         || null,
      html_content    : editing.html_content     || null,
      html_url_fil    : editing.html_url_fil     || null,
      html_content_fil: editing.html_content_fil || null,
      video_url_1     : editing.video_url_1      || null,
      video_url_2     : editing.video_url_2      || null,
      infographic_url : editing.infographic_url  || null,
      is_active       : true,
      sort_order      : editing.sort_order || subtopics.length + 1,
    }
    if (editing.id) {
      await supabase.from('tesda_subtopics').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('tesda_subtopics').insert([payload])
    }
    // Update subtopic_count on qualification
    const newCount = editing.id ? subtopics.length : subtopics.length + 1
    await supabase.from('tesda_qualifications').update({ subtopic_count: newCount }).eq('id', activeQual.id)
    setSaving(false)
    setEditing(null)
    await loadSubtopics(activeQual.id)
  }

  async function deleteSubtopic(id, name) {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return
    await supabase.from('tesda_subtopics').delete().eq('id', id)
    setSubtopics(prev => prev.filter(s => s.id !== id))
  }

  // Upload HTML file to public/tesda/ — since we can't write to the repo from here,
  // we store the path in the DB and the user uploads the file manually to public/tesda/
  // OR we store inline HTML in html_content column
  async function handleHtmlUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.endsWith('.html')) { alert('Please upload an .html file'); return }
    setUploading(true)
    try {
      // Read HTML content and store inline in DB
      const reader = new FileReader()
      reader.onload = async (ev) => {
        const htmlContent = ev.target.result
        // Store both inline content and suggested path
        const suggestedPath = `/tesda/${file.name}`
        setEditing(p => ({
          ...p,
          html_content   : htmlContent,
          html_url       : suggestedPath,
          _htmlFileName  : file.name,
          _htmlSize      : (htmlContent.length / 1024).toFixed(1) + ' KB',
        }))
        setUploading(false)
      }
      reader.readAsText(file)
    } catch (err) {
      alert('Upload failed: ' + err.message)
      setUploading(false)
    }
    e.target.value = ''
  }

  async function saveHtmlToDB() {
    if (!editing?.html_content) return
    setSaving(true)
    await supabase.from('tesda_subtopics').update({
      html_content: editing.html_content,
      html_url    : editing.html_url,
    }).eq('id', editing.id)
    setSaving(false)
    alert('HTML saved to database ✅')
  }

  // Edit form
  if (editing) {
    return (
      <div style={s.section}>
        <button style={s.backBtn} onClick={() => setEditing(null)}>← Back to {activeQual?.name}</button>
        <div style={s.sectionLabel}>
          {editing.id ? `Editing: ${editing.name}` : `New Topic in ${activeQual?.name}`}
        </div>

        <div style={s.field}>
          <label style={s.label}>Competency Name</label>
          <input style={s.input} value={editing.name || ''}
            placeholder="e.g. e.g. Topic 1: Kitchen Safety and Sanitation"
            onChange={e => setEditing(p => ({ ...p, name: e.target.value }))} />
        </div>

        <div style={s.field}>
          <label style={s.label}>Description</label>
          <input style={s.input} value={editing.description || ''}
            placeholder="Brief description of this competency"
            onChange={e => setEditing(p => ({ ...p, description: e.target.value }))} />
        </div>

        <div style={s.field}>
          <label style={s.label}>Sort Order</label>
          <input style={{ ...s.input, width: 80 }} type="number" value={editing.sort_order || ''}
            onChange={e => setEditing(p => ({ ...p, sort_order: parseInt(e.target.value) || 1 }))} />
        </div>

        {/* HTML Reviewer Upload */}
        <div style={s.field}>
          <label style={s.label}>HTML Reviewer</label>
          <div style={{ background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:10, padding:'14px 16px' }}>
            {/* Option 1: Upload HTML file */}
            <div style={{ fontSize:11, color:'var(--accent)', fontWeight:600, marginBottom:8, textTransform:'uppercase', letterSpacing:'.06em' }}>
              Option 1 — Upload HTML File (stores content in DB)
            </div>
            <label style={{ display:'flex', alignItems:'center', gap:8, background:'var(--accent-dim)', border:'1px solid var(--accent)', borderRadius:7, padding:'8px 14px', cursor:'pointer', fontSize:12, color:'var(--accent)', fontWeight:600, width:'fit-content', marginBottom:8 }}>
              {uploading ? '⏳ Reading file…' : '📄 Upload .html file'}
              <input type="file" accept=".html" style={{ display:'none' }} onChange={handleHtmlUpload} disabled={uploading} />
            </label>
            {editing._htmlFileName && (
              <div style={{ fontSize:12, color:'#10B981', marginBottom:8 }}>
                ✅ {editing._htmlFileName} ({editing._htmlSize}) loaded
                {editing.id && (
                  <button onClick={saveHtmlToDB} style={{ marginLeft:10, background:'#10B981', border:'none', borderRadius:6, color:'#0d0d0d', fontSize:11, fontWeight:700, padding:'3px 10px', cursor:'pointer' }}>
                    {saving ? 'Saving…' : 'Save HTML to DB'}
                  </button>
                )}
              </div>
            )}
            {editing.html_content && !editing._htmlFileName && (
              <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:8 }}>✅ HTML content already stored in DB</div>
            )}

            {/* Option 2: Manual URL path */}
            <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600, margin:'10px 0 6px', textTransform:'uppercase', letterSpacing:'.06em' }}>
              Option 2 — Manual file path (file must be in public/tesda/)
            </div>
            <input style={s.input} value={editing.html_url || ''}
              placeholder="/tesda/domestic-nc2-cc1.html"
              onChange={e => setEditing(p => ({ ...p, html_url: e.target.value }))} />
          </div>
        </div>

        {/* Filipino HTML Upload */}
        <div style={s.field}>
          <label style={s.label}>🇵🇭 Filipino Version HTML Reviewer</label>
          <div style={{ background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:10, padding:'14px 16px' }}>
            <label style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(59,130,246,0.1)', border:'1px solid rgba(59,130,246,0.3)', borderRadius:7, padding:'8px 14px', cursor:'pointer', fontSize:12, color:'#3b82f6', fontWeight:600, width:'fit-content', marginBottom:8 }}>
              {uploading ? '⏳ Reading file…' : '📄 Upload Filipino .html file'}
              <input type="file" accept=".html" style={{ display:'none' }} onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                setUploading(true)
                const reader = new FileReader()
                reader.onload = (ev) => {
                  setEditing(p => ({
                    ...p,
                    html_content_fil: ev.target.result,
                    html_url_fil    : `/tesda/${file.name}`,
                    _filFileName    : file.name,
                  }))
                  setUploading(false)
                }
                reader.readAsText(file)
                e.target.value = ''
              }} disabled={uploading} />
            </label>
            {editing._filFileName && (
              <div style={{ fontSize:12, color:'#10B981' }}>✅ {editing._filFileName} loaded (Filipino version)</div>
            )}
            {editing.html_content_fil && !editing._filFileName && (
              <div style={{ fontSize:11, color:'var(--text-muted)' }}>✅ Filipino HTML already stored in DB</div>
            )}
            <input style={{ ...s.input, marginTop:8 }} value={editing.html_url_fil || ''}
              placeholder="/tesda/cookery-nc2-cc1-fil.html (optional manual path)"
              onChange={e => setEditing(p => ({ ...p, html_url_fil: e.target.value }))} />
          </div>
        </div>

        <div style={s.field}>
          <label style={s.label}>YouTube Video Reviewer 1</label>
          <input style={s.input} value={editing.video_url_1 || ''}
            placeholder="https://youtu.be/..."
            onChange={e => setEditing(p => ({ ...p, video_url_1: e.target.value }))} />
        </div>

        <div style={s.field}>
          <label style={s.label}>YouTube Video Reviewer 2</label>
          <input style={s.input} value={editing.video_url_2 || ''}
            placeholder="https://youtu.be/..."
            onChange={e => setEditing(p => ({ ...p, video_url_2: e.target.value }))} />
        </div>

        <div style={s.field}>
          <label style={s.label}>Infographic URL</label>
          <input style={s.input} value={editing.infographic_url || ''}
            placeholder="https://..."
            onChange={e => setEditing(p => ({ ...p, infographic_url: e.target.value }))} />
          {editing.infographic_url && (
            <img src={editing.infographic_url} alt="infographic preview"
              style={{ marginTop:8, width:'100%', borderRadius:8, border:'1px solid var(--border)' }}
              onError={e => e.target.style.display='none'} />
          )}
        </div>

        <button style={{ ...s.saveBtn, opacity: saving ? 0.6 : 1 }} onClick={saveSubtopic} disabled={saving}>
          {saving ? 'Saving…' : editing.id ? 'Save Changes' : 'Add Topic'}
        </button>

        {/* Supplementary Resources — only shown when editing an existing topic */}
        {editing.id && (
          <div style={{ marginTop:24, borderTop:'1px solid var(--border)', paddingTop:20 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', marginBottom:4 }}>📎 Supplementary Resources</div>
            <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:14, lineHeight:1.6 }}>
              Optional extra HTML files under this topic — bonus lectures, advanced content, or additional exercises. Each is a self-contained HTML file shown below the main reviewer.
            </div>
            <SupplementaryManager topicId={editing.id} topicName={editing.name} />
          </div>
        )}
      </div>
    )
  }

  // Subtopics list view
  if (activeQual) {
    return (
      <div style={s.section}>
        <button style={s.backBtn} onClick={() => { setActiveQual(null); setSubtopics([]) }}>← All Qualifications</button>
        <div style={s.sectionLabel}>{activeQual.name} — Topics</div>
        <button style={s.newBtn} onClick={() => setEditing({ sort_order: subtopics.length + 1 })}>
          + Add Topic
        </button>
        {subtopics.length === 0 && (
          <div style={{ fontSize:13, color:'var(--text-muted)', padding:'20px 0' }}>No topics yet. Add the first one.</div>
        )}
        {subtopics.map((st, i) => (
          <div key={st.id} style={{ background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:12, padding:'14px', marginBottom:8 }}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)', marginBottom:4 }}>
                  <span style={{ fontSize:11, color:'var(--accent)', fontWeight:700, marginRight:8 }}>#{i+1}</span>
                  {st.name}
                </div>
                {st.description && <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:6 }}>{st.description}</div>}
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {(st.html_url || st.html_content) && <span style={{ fontSize:10, padding:'2px 7px', background:'rgba(16,185,129,0.1)', color:'#10B981', borderRadius:20, border:'1px solid rgba(16,185,129,0.2)' }}>📖 Reviewer</span>}
                  {st.video_url_1     && <span style={{ fontSize:10, padding:'2px 7px', background:'var(--bg-elevated)', color:'var(--text-muted)', borderRadius:20, border:'1px solid var(--border)' }}>📹 Video 1</span>}
                  {st.video_url_2     && <span style={{ fontSize:10, padding:'2px 7px', background:'var(--bg-elevated)', color:'var(--text-muted)', borderRadius:20, border:'1px solid var(--border)' }}>📹 Video 2</span>}
                  {st.infographic_url && <span style={{ fontSize:10, padding:'2px 7px', background:'var(--bg-elevated)', color:'var(--text-muted)', borderRadius:20, border:'1px solid var(--border)' }}>🖼 Infographic</span>}
                </div>
              </div>
              <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                <button style={s.editBtn} onClick={() => setEditing(st)}>Edit</button>
                {(st.html_content || st.html_url) && (
                  <button style={{ ...s.editBtn, background:'rgba(59,130,246,0.1)', color:'#3b82f6', border:'1px solid rgba(59,130,246,0.3)' }}
                    onClick={() => {
                      const blob = new Blob([st.html_content || ''], { type:'text/html' })
                      const url  = URL.createObjectURL(blob)
                      window.open(url, '_blank')
                    }}
                    title="Preview HTML">👁</button>
                )}
                {(st.html_content || st.html_url) && (
                  <button style={{ ...s.editBtn, background:'rgba(239,68,68,0.1)', color:'#ef4444', border:'1px solid rgba(239,68,68,0.3)' }}
                    onClick={async () => {
                      if (!window.confirm(`Remove HTML reviewer from "${st.name}"? The rest of the subtopic will remain.`)) return
                      await supabase.from('tesda_subtopics').update({ html_content: null, html_url: null, html_content_fil: null, html_url_fil: null }).eq('id', st.id)
                      await loadSubtopics(activeQual.id)
                    }}
                    title="Remove HTML">🗑</button>
                )}
                <button style={s.delBtn} onClick={() => deleteSubtopic(st.id, st.name)}>✕</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Qualifications list
  return (
    <div style={s.section}>
      <div style={s.sectionLabel}>TESDA NC Qualifications</div>
      <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:16, lineHeight:1.6 }}>
        Select a qualification to manage its topics and upload HTML reviewers.
      </div>
      {loading ? (
        <div style={{ fontSize:13, color:'var(--text-muted)' }}>Loading…</div>
      ) : quals.map(q => (
        <div key={q.id} style={{ background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:12, padding:'14px 16px', marginBottom:8, display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer' }}
          onClick={() => selectQual(q)}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ fontSize:24 }}>{q.emoji || '📋'}</span>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)' }}>{q.name}</div>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>
                {q.subtopic_count || 0} topics
              </div>
            </div>
          </div>
          <span style={{ fontSize:18, color:'var(--text-muted)' }}>›</span>
        </div>
      ))}
    </div>
  )
}

// ── Supplementary Resource Manager ───────────────────────────────────────────
function SupplementaryManager({ topicId, topicName }) {
  const [resources, setResources] = useState([])
  const [adding,    setAdding]    = useState(false)
  const [newName,   setNewName]   = useState('')
  const [newHtml,   setNewHtml]   = useState('')
  const [newHtmlFil,setNewHtmlFil]= useState('')
  const [fileName,  setFileName]  = useState('')
  const [filNameFil,setFilNameFil]= useState('')
  const [saving,    setSaving]    = useState(false)
  const [loading,   setLoading]   = useState(true)

  useEffect(() => { loadResources() }, [topicId])

  async function loadResources() {
    setLoading(true)
    const { data } = await supabase
      .from('tesda_supplementary')
      .select('*')
      .eq('subtopic_id', topicId)
      .order('sort_order')
    setResources(data || [])
    setLoading(false)
  }

  function readHtmlFile(file, setter, nameSetter) {
    if (!file || !file.name.endsWith('.html')) { alert('Please upload an .html file'); return }
    const reader = new FileReader()
    reader.onload = (ev) => { setter(ev.target.result); nameSetter(file.name) }
    reader.readAsText(file)
  }

  async function saveResource() {
    if (!newName.trim() || !newHtml) { alert('Name and English HTML are required'); return }
    setSaving(true)
    await supabase.from('tesda_supplementary').insert([{
      subtopic_id     : topicId,
      name            : newName.trim(),
      html_content    : newHtml,
      html_content_fil: newHtmlFil || null,
      sort_order      : resources.length + 1,
    }])
    setSaving(false)
    setAdding(false)
    setNewName('')
    setNewHtml('')
    setNewHtmlFil('')
    setFileName('')
    setFilNameFil('')
    await loadResources()
  }

  async function deleteResource(id, name) {
    if (!window.confirm(`Delete "${name}"?`)) return
    await supabase.from('tesda_supplementary').delete().eq('id', id)
    setResources(prev => prev.filter(r => r.id !== id))
  }

  if (loading) return <div style={{ fontSize:12, color:'var(--text-muted)' }}>Loading…</div>

  return (
    <div>
      {resources.length === 0 && !adding && (
        <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:10 }}>No supplementary resources yet.</div>
      )}

      {resources.map((r, i) => (
        <div key={r.id} style={{ background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:10, padding:'10px 14px', marginBottom:8, display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'var(--text-primary)' }}>#{i+1} {r.name}</div>
            <div style={{ display:'flex', gap:6, marginTop:4 }}>
              {r.html_content     && <span style={{ fontSize:10, padding:'2px 7px', background:'rgba(16,185,129,0.1)', color:'#10B981', borderRadius:20, border:'1px solid rgba(16,185,129,0.2)' }}>🇺🇸 EN</span>}
              {r.html_content_fil && <span style={{ fontSize:10, padding:'2px 7px', background:'rgba(59,130,246,0.1)', color:'#3b82f6', borderRadius:20, border:'1px solid rgba(59,130,246,0.2)' }}>🇵🇭 FIL</span>}
            </div>
          </div>
          <button onClick={() => deleteResource(r.id, r.name)}
            style={{ background:'rgba(239,68,68,0.1)', color:'#ef4444', border:'1px solid rgba(239,68,68,0.3)', borderRadius:6, padding:'4px 10px', fontSize:11, cursor:'pointer', fontFamily:'inherit' }}>
            Remove
          </button>
        </div>
      ))}

      {adding ? (
        <div style={{ background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:10, padding:14, marginBottom:8 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--text-primary)', marginBottom:10 }}>New Supplementary Resource</div>

          <input style={{ width:'100%', padding:'8px 12px', background:'var(--bg-base)', border:'1px solid var(--border)', borderRadius:7, color:'var(--text-primary)', fontSize:12, fontFamily:'inherit', outline:'none', marginBottom:10, boxSizing:'border-box' }}
            placeholder="Resource name (e.g. Advanced Knife Skills)" value={newName} onChange={e => setNewName(e.target.value)} />

          {/* EN HTML */}
          <div style={{ marginBottom:8 }}>
            <label style={{ display:'flex', alignItems:'center', gap:8, background:'var(--accent-dim)', border:'1px solid var(--accent)', borderRadius:7, padding:'7px 12px', cursor:'pointer', fontSize:11, color:'var(--accent)', fontWeight:600, width:'fit-content', marginBottom:4 }}>
              📄 Upload English HTML
              <input type="file" accept=".html" style={{ display:'none' }} onChange={e => readHtmlFile(e.target.files?.[0], setNewHtml, setFileName)} />
            </label>
            {fileName && <div style={{ fontSize:11, color:'#10B981' }}>✅ {fileName}</div>}
          </div>

          {/* FIL HTML */}
          <div style={{ marginBottom:12 }}>
            <label style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(59,130,246,0.1)', border:'1px solid rgba(59,130,246,0.3)', borderRadius:7, padding:'7px 12px', cursor:'pointer', fontSize:11, color:'#3b82f6', fontWeight:600, width:'fit-content', marginBottom:4 }}>
              📄 Upload Filipino HTML (optional)
              <input type="file" accept=".html" style={{ display:'none' }} onChange={e => readHtmlFile(e.target.files?.[0], setNewHtmlFil, setFilNameFil)} />
            </label>
            {filNameFil && <div style={{ fontSize:11, color:'#3b82f6' }}>✅ {filNameFil}</div>}
          </div>

          <div style={{ display:'flex', gap:8 }}>
            <button onClick={saveResource} disabled={saving}
              style={{ background:'var(--accent)', color:'#0d0d0d', border:'none', borderRadius:7, padding:'8px 16px', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving…' : 'Save Resource'}
            </button>
            <button onClick={() => { setAdding(false); setNewName(''); setNewHtml(''); setNewHtmlFil(''); setFileName(''); setFilNameFil('') }}
              style={{ background:'var(--bg-elevated)', color:'var(--text-muted)', border:'1px solid var(--border)', borderRadius:7, padding:'8px 16px', fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          style={{ background:'var(--bg-elevated)', border:'1px dashed var(--border)', borderRadius:8, padding:'8px 16px', fontSize:12, color:'var(--text-muted)', cursor:'pointer', fontFamily:'inherit', width:'100%' }}>
          + Add Supplementary Resource
        </button>
      )}
    </div>
  )
}
