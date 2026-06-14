import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://tizegwvlksgqtvlkiwvb.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpemVnd3Zsa3NncXR2bGtpd3ZiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDI0NTg3MCwiZXhwIjoyMDk1ODIxODcwfQ.Qn4rIczVEwa6Y_8ABlac6oByv3PioE1Q24Fc2ZTvnUA'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const TABS = [
  { id: 'overview',      label: '📊 Overview'      },
  { id: 'questions',     label: '❓ Questions'      },
  { id: 'lessons',       label: '📚 Lessons'        },
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
    const res = await fetch('/api/generate-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'test', email: 'test@test.com', password, isOwnerKey: false }),
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

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [{ data: t }, { data: c }] = await Promise.all([
      supabase.from('topics').select('id, name, subject_id').order('name'),
      supabase.from('cards').select('id, question, topic_id, difficulty, board_frequency').order('created_at', { ascending: false }),
    ])
    setTopics(t || [])
    setCards(c || [])
    setLoading(false)
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
        {['overview', 'import', 'browse'].map(st => (
          <button key={st} style={{ ...s.subtabBtn, ...(subtab === st ? s.subtabBtnActive : {}) }}
            onClick={() => setSubtab(st)}>
            {st.charAt(0).toUpperCase() + st.slice(1)}
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
                  <span style={s.chip}>{c.board_frequency}</span>
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
  const [subtab, setSubtab] = useState('overview')
  const [topics, setTopics] = useState([])
  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(true)
  const [editLesson, setEditLesson] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [{ data: t }, { data: l }] = await Promise.all([
      supabase.from('topics').select('id, name').order('name'),
      supabase.from('lessons').select('id, topic_id, title, content, memory_hook, board_relevance').order('title'),
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
      }).eq('id', editLesson.id)
    } else {
      await supabase.from('lessons').insert([{
        topic_id: editLesson.topic_id,
        title: editLesson.title,
        content: editLesson.content,
        memory_hook: editLesson.memory_hook,
        board_relevance: editLesson.board_relevance,
      }])
    }
    setSaving(false)
    setEditLesson(null)
    loadData()
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
        <button style={s.btn} onClick={saveLesson} disabled={saving}>
          {saving ? 'Saving…' : 'Save Lesson'}
        </button>
      </div>
    )
  }

  return (
    <div style={s.section}>
      <div style={s.subtabBar}>
        {['overview', 'edit'].map(st => (
          <button key={st} style={{ ...s.subtabBtn, ...(subtab === st ? s.subtabBtnActive : {}) }}
            onClick={() => setSubtab(st)}>
            {st.charAt(0).toUpperCase() + st.slice(1)}
          </button>
        ))}
      </div>

      {subtab === 'overview' && (
        <>
          <div style={s.statRow}>
            <div style={s.bigStat}>{lessons.length} <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>/ {topics.length}</span></div>
            <div style={s.bigStatLabel}>Topics with lessons</div>
          </div>
          {missing.length > 0 && (
            <>
              <div style={{ ...s.sectionLabel, color: '#e05c5c' }}>⚠ Missing lessons ({missing.length})</div>
              {missing.map(t => (
                <div key={t.id} style={s.missingRow}>
                  <span style={s.missingName}>{t.name}</span>
                  <button style={s.addBtn}
                    onClick={() => setEditLesson({ topic_id: t.id, title: '', content: '', memory_hook: '', board_relevance: '' })}>
                    + Add
                  </button>
                </div>
              ))}
            </>
          )}
        </>
      )}

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
                <button style={s.editBtn} onClick={() => setEditLesson(l)}>Edit</button>
              </div>
            ))}
          </div>
        </>
      )}
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
    const ownerPass = sessionStorage.getItem('owner_auth')
    const res = await fetch('/api/generate-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password: ownerPass, course }),
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
    const { data } = supabase.storage.from('payout-screenshots').getPublicUrl(path)
    return data.publicUrl
  }

  async function markPaid(agent) {
    if (!payout.period_start || !payout.period_end) return
    setPaying(true)

    // Upload screenshot if selected
    let screenshotUrl = ''
    if (screenshotRef.current?.files?.[0]) {
      screenshotUrl = await uploadScreenshot(screenshotRef.current.files[0]) || ''
    }

    const referralCount = agent.total_referrals || 0
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
    await fetch('/api/send-payout-confirmation', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        agent_name:    agent.name,
        agent_email:   agent.email,
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
              <button style={ag.payBtn} onClick={() => setPayoutModal(agent)}>
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
      .select('id, name, email, created_at, agent_code')
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

  const totalRevenue   = sales.length * 249
  const withAgent      = sales.filter(s => s.agent_code).length
  const commissions    = withAgent * 50
  const discounts      = withAgent * 20
  const netRevenue     = totalRevenue - discounts

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
                  ₱{sale.agent_code ? '229' : '249'}
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

  const typeIcon = { feedback: '💬', bug: '🐛', content: '📝' }
  const typeColor = { feedback: '#10B981', bug: '#ef4444', content: '#F59E0B' }

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
        ].map(stat => (
          <div key={stat.label} style={ow.statCard}>
            <div style={{ ...ow.statVal, color: stat.color }}>{stat.val}</div>
            <div style={ow.statLabel}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={s.subtabBar}>
        {['all','feedback','bug','content'].map(f => (
          <button key={f}
            style={{ ...s.subtabBtn, ...(filter === f ? s.subtabBtnActive : {}) }}
            onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : f === 'feedback' ? '💬 Feedback' : f === 'bug' ? '🐛 Bugs' : '📝 Content'}
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
                  <div style={{ display:'flex', gap:8 }}>
                    {item.email && (
                      <a href={`mailto:${item.email}?subject=Re: Your Readwise Feedback`}
                        style={{ fontSize:12, color:'var(--accent)', textDecoration:'none', padding:'5px 12px', border:'1px solid var(--accent)', borderRadius:6 }}>
                        Reply →
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
  created_at timestamptz default now()
);
alter table feedback enable row level security;
create policy "Service role" on feedback for all using (true);`}
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
