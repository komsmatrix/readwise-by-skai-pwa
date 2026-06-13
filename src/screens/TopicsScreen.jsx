import { useState, useEffect } from 'react'
import {
  getTopicsForExam, getSubjectsForExam, getTopicHealth,
} from '../lib/supabase.js'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

const HEALTH_COLOR = {
  Critical: '#e05c5c',
  Weak    : '#F59E0B',
  Stable  : '#EAB308',
  Strong  : '#10B981',
  Mastered: '#c9a96e',
}

const RESOURCE_ICON = {
  video      : '📹',
  audio      : '🎧',
  infographic: '📊',
  mindmap    : '🗺',
  document   : '📄',
}

export default function TopicsScreen({ customer, studentExam }) {
  const [subjects,      setSubjects]      = useState([])
  const [topics,        setTopics]        = useState([])
  const [healthMap,     setHealthMap]     = useState({})
  const [loading,       setLoading]       = useState(true)
  const [expandedTopic, setExpandedTopic] = useState(null)
  const [activeTab,     setActiveTab]     = useState({}) // topicId → tab

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
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  function toggleTopic(topicId) {
    setExpandedTopic(prev => prev === topicId ? null : topicId)
    if (!activeTab[topicId]) {
      setActiveTab(prev => ({ ...prev, [topicId]: 'overview' }))
    }
  }

  function setTab(topicId, tab) {
    setActiveTab(prev => ({ ...prev, [topicId]: tab }))
  }

  const maxWeight = subjects.length > 0
    ? Math.max(...subjects.map(s => s.weight_pct))
    : 40

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
                  width     : `${(sub.weight_pct / maxWeight) * 100}%`,
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
              .map(h => h.attempt_count > 0
                ? (h.correct_count / h.attempt_count) * 100 : 0)
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
                    const health   = healthMap[topic.id]
                    const state    = health?.health_state || 'Stable'
                    const attempts = health?.attempt_count || 0
                    const isOpen   = expandedTopic === topic.id
                    const tab      = activeTab[topic.id] || 'overview'

                    return (
                      <div key={topic.id} style={s.topicCard}>
                        {/* Topic row — tap to expand */}
                        <div style={s.topicRow} onClick={() => toggleTopic(topic.id)}>
                          <span style={s.topicName}>{topic.name}</span>
                          <div style={s.topicRight}>
                            <span style={{ ...s.healthDot, background: HEALTH_COLOR[state] }} />
                            <span style={{ ...s.healthLabel, color: HEALTH_COLOR[state] }}>{state}</span>
                            <span style={s.freqPill}>{topic.board_frequency}</span>
                            {attempts === 0 && <span style={s.unseenPill}>Not started</span>}
                            <span style={{ ...s.chevron, transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                              ▾
                            </span>
                          </div>
                        </div>

                        {/* Expanded panel */}
                        {isOpen && (
                          <div style={s.expandedPanel}>
                            {/* Tab bar */}
                            <div style={s.tabBar}>
                              {['overview', 'mnemonics', 'glossary', 'resources'].map(t => (
                                <button
                                  key={t}
                                  style={{ ...s.tabBtn, ...(tab === t ? s.tabBtnActive : {}) }}
                                  onClick={() => setTab(topic.id, t)}
                                >
                                  {t === 'overview'   ? '📋 Overview'   : ''}
                                  {t === 'mnemonics'  ? '🧠 Mnemonics'  : ''}
                                  {t === 'glossary'   ? '📖 Glossary'   : ''}
                                  {t === 'resources'  ? '🔗 Resources'  : ''}
                                </button>
                              ))}
                            </div>

                            {/* Tab content */}
                            {tab === 'overview' && (
                              <OverviewTab topic={topic} health={health} />
                            )}
                            {tab === 'mnemonics' && (
                              <MnemonicsTab topicId={topic.id} />
                            )}
                            {tab === 'glossary' && (
                              <GlossaryTab topicId={topic.id} />
                            )}
                            {tab === 'resources' && (
                              <ResourcesTab topicId={topic.id} />
                            )}
                          </div>
                        )}
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

// ── Overview Tab ──────────────────────────────────────────────────────────────
function OverviewTab({ topic, health }) {
  const attempts = health?.attempt_count || 0
  const correct  = health?.correct_count || 0
  const rate     = attempts > 0 ? Math.round((correct / attempts) * 100) : 0
  const state    = health?.health_state || 'Not Started'

  return (
    <div style={s.tabContent}>
      <div style={s.overviewGrid}>
        <div style={s.overviewStat}>
          <div style={s.overviewStatVal}>{attempts}</div>
          <div style={s.overviewStatLabel}>Attempts</div>
        </div>
        <div style={s.overviewStat}>
          <div style={{ ...s.overviewStatVal, color: '#10B981' }}>{correct}</div>
          <div style={s.overviewStatLabel}>Correct</div>
        </div>
        <div style={s.overviewStat}>
          <div style={{ ...s.overviewStatVal, color: HEALTH_COLOR[state] || 'var(--accent)' }}>{rate}%</div>
          <div style={s.overviewStatLabel}>Accuracy</div>
        </div>
        <div style={s.overviewStat}>
          <div style={{ ...s.overviewStatVal, fontSize: 13, color: HEALTH_COLOR[state] || 'var(--text-muted)' }}>{state}</div>
          <div style={s.overviewStatLabel}>Health</div>
        </div>
      </div>
      <div style={s.overviewMeta}>
        <span style={s.metaChip}>⚡ {topic.board_frequency} frequency</span>
        {topic.topic_weight && (
          <span style={s.metaChip}>📊 {topic.topic_weight}% of exam</span>
        )}
      </div>
    </div>
  )
}

// ── Mnemonics Tab ─────────────────────────────────────────────────────────────
function MnemonicsTab({ topicId }) {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [idx,     setIdx]     = useState(0)

  useEffect(() => {
    supabase
      .from('mnemonics')
      .select('*')
      .eq('topic_id', topicId)
      .then(({ data }) => { setItems(data || []); setLoading(false) })
  }, [topicId])

  if (loading) return <TabLoading />
  if (items.length === 0) return <TabEmpty icon="🧠" message="No mnemonics yet for this topic." />

  const item = items[idx]

  return (
    <div style={s.tabContent}>
      {/* Card counter */}
      <div style={s.cardCounter}>
        {items.map((_, i) => (
          <button
            key={i}
            style={{ ...s.counterDot, background: i === idx ? 'var(--accent)' : 'var(--border)' }}
            onClick={() => setIdx(i)}
          />
        ))}
      </div>

      {/* Mnemonic card */}
      <div style={s.mnemonicCard}>
        <div style={s.mnemonicBadge}>MNEMONIC {idx + 1} OF {items.length}</div>
        <div style={s.mnemonicMain}>{item.mnemonic}</div>
        <div style={s.mnemonicMeaning}>{item.meaning}</div>
        {item.concept && (
          <div style={s.mnemonicConcept}>
            <span style={s.conceptLabel}>Concept: </span>{item.concept}
          </div>
        )}
        {item.story && (
          <div style={s.mnemonicStory}>
            <div style={s.storyLabel}>📖 Story</div>
            <div style={s.storyText}>{item.story}</div>
          </div>
        )}
        {item.image_url && (
          <img src={item.image_url} alt={item.mnemonic} style={s.mnemonicImage} />
        )}
      </div>

      {/* Nav arrows */}
      {items.length > 1 && (
        <div style={s.cardNav}>
          <button style={s.navBtn} onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0}>← Prev</button>
          <button style={s.navBtn} onClick={() => setIdx(i => Math.min(items.length - 1, i + 1))} disabled={idx === items.length - 1}>Next →</button>
        </div>
      )}
    </div>
  )
}

// ── Glossary Tab ──────────────────────────────────────────────────────────────
function GlossaryTab({ topicId }) {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')

  useEffect(() => {
    supabase
      .from('glossary')
      .select('*')
      .eq('topic_id', topicId)
      .order('term')
      .then(({ data }) => { setItems(data || []); setLoading(false) })
  }, [topicId])

  if (loading) return <TabLoading />
  if (items.length === 0) return <TabEmpty icon="📖" message="No glossary terms yet for this topic." />

  const filtered = items.filter(i =>
    i.term.toLowerCase().includes(search.toLowerCase()) ||
    i.definition.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={s.tabContent}>
      <input
        style={s.searchInput}
        placeholder="Search terms…"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      <div style={s.glossaryList}>
        {filtered.map(item => (
          <div key={item.id} style={s.glossaryItem}>
            <div style={s.glossaryTerm}>{item.term}</div>
            <div style={s.glossaryDef}>{item.definition}</div>
            {item.example && (
              <div style={s.glossaryExample}>e.g. {item.example}</div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={s.emptyText}>No terms match "{search}"</div>
        )}
      </div>
    </div>
  )
}

// ── Resources Tab ─────────────────────────────────────────────────────────────
function ResourcesTab({ topicId }) {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('topic_resources')
      .select('*')
      .eq('topic_id', topicId)
      .order('resource_type')
      .then(({ data }) => { setItems(data || []); setLoading(false) })
  }, [topicId])

  if (loading) return <TabLoading />
  if (items.length === 0) return (
    <TabEmpty icon="🔗" message="No resources added yet. Check back after the content update." />
  )

  return (
    <div style={s.tabContent}>
      <div style={s.resourceList}>
        {items.map(item => (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            style={s.resourceCard}
          >
            <div style={s.resourceIcon}>{RESOURCE_ICON[item.resource_type] || '🔗'}</div>
            <div style={s.resourceInfo}>
              <div style={s.resourceTitle}>{item.title}</div>
              <div style={s.resourceMeta}>
                {item.source_label && <span style={s.resourceSource}>{item.source_label}</span>}
                {item.duration_label && <span style={s.resourceDuration}>{item.duration_label}</span>}
              </div>
            </div>
            <div style={s.resourceArrow}>→</div>
          </a>
        ))}
      </div>
    </div>
  )
}

// ── Shared helpers ────────────────────────────────────────────────────────────
function TabLoading() {
  return <div style={s.tabContent}><div style={s.emptyText}>Loading…</div></div>
}

function TabEmpty({ icon, message }) {
  return (
    <div style={s.tabContent}>
      <div style={s.emptyState}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
        <div style={s.emptyText}>{message}</div>
      </div>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
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
  topicList       : { display: 'flex', flexDirection: 'column', gap: 6 },

  // Topic card
  topicCard       : { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' },
  topicRow        : { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', cursor: 'pointer' },
  topicName       : { fontSize: 12, color: 'var(--text-primary)', fontWeight: 500 },
  topicRight      : { display: 'flex', alignItems: 'center', gap: 5 },
  healthDot       : { width: 7, height: 7, borderRadius: '50%', flexShrink: 0 },
  healthLabel     : { fontSize: 10, fontWeight: 500 },
  freqPill        : { fontSize: 9, padding: '2px 6px', borderRadius: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)' },
  unseenPill      : { fontSize: 9, padding: '2px 6px', borderRadius: 8, background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)' },
  chevron         : { fontSize: 12, color: 'var(--text-muted)', transition: 'transform 0.2s', marginLeft: 2 },

  // Expanded panel
  expandedPanel   : { borderTop: '1px solid var(--border)' },
  tabBar          : { display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', overflowX: 'auto' },
  tabBtn          : { flex: 1, padding: '8px 4px', fontSize: 10, fontWeight: 500, background: 'none', border: 'none', borderBottom: '2px solid transparent', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'all 0.15s', minWidth: 72 },
  tabBtnActive    : { color: 'var(--accent)', borderBottomColor: 'var(--accent)' },
  tabContent      : { padding: '12px' },

  // Overview tab
  overviewGrid    : { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 10 },
  overviewStat    : { background: 'var(--bg-elevated)', borderRadius: 8, padding: '8px', textAlign: 'center' },
  overviewStatVal : { fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 },
  overviewStatLabel: { fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.4px', marginTop: 2 },
  overviewMeta    : { display: 'flex', gap: 6, flexWrap: 'wrap' },
  metaChip        : { fontSize: 10, padding: '3px 8px', borderRadius: 6, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)' },

  // Mnemonics tab
  cardCounter     : { display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 10 },
  counterDot      : { width: 8, height: 8, borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0, transition: 'background 0.15s' },
  mnemonicCard    : { background: 'var(--bg-elevated)', borderRadius: 10, padding: '14px', marginBottom: 10 },
  mnemonicBadge   : { fontSize: 9, color: 'var(--accent)', fontWeight: 700, letterSpacing: '.06em', marginBottom: 8 },
  mnemonicMain    : { fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--accent)', marginBottom: 6, lineHeight: 1.3 },
  mnemonicMeaning : { fontSize: 13, color: 'var(--text-primary)', marginBottom: 8, lineHeight: 1.5 },
  mnemonicConcept : { fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, lineHeight: 1.5 },
  conceptLabel    : { fontWeight: 600, color: 'var(--text-muted)' },
  mnemonicStory   : { background: 'var(--bg-surface)', borderRadius: 8, padding: '10px', borderLeft: '3px solid var(--accent)' },
  storyLabel      : { fontSize: 10, color: 'var(--accent)', fontWeight: 700, marginBottom: 4 },
  storyText       : { fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 },
  mnemonicImage   : { width: '100%', borderRadius: 8, marginTop: 10, objectFit: 'cover' },
  cardNav         : { display: 'flex', gap: 8 },
  navBtn          : { flex: 1, padding: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit', transition: 'opacity 0.15s' },

  // Glossary tab
  searchInput     : { width: '100%', padding: '8px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, outline: 'none', marginBottom: 10, boxSizing: 'border-box', fontFamily: 'inherit' },
  glossaryList    : { display: 'flex', flexDirection: 'column', gap: 8 },
  glossaryItem    : { background: 'var(--bg-elevated)', borderRadius: 8, padding: '10px 12px' },
  glossaryTerm    : { fontSize: 13, fontWeight: 700, color: 'var(--accent)', marginBottom: 4 },
  glossaryDef     : { fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 },
  glossaryExample : { fontSize: 11, color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic' },

  // Resources tab
  resourceList    : { display: 'flex', flexDirection: 'column', gap: 8 },
  resourceCard    : { display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', textDecoration: 'none', transition: 'border-color 0.15s' },
  resourceIcon    : { fontSize: 22, flexShrink: 0 },
  resourceInfo    : { flex: 1 },
  resourceTitle   : { fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 },
  resourceMeta    : { display: 'flex', gap: 6 },
  resourceSource  : { fontSize: 10, color: 'var(--accent)', background: 'var(--accent-dim)', padding: '1px 6px', borderRadius: 4 },
  resourceDuration: { fontSize: 10, color: 'var(--text-muted)' },
  resourceArrow   : { fontSize: 14, color: 'var(--accent)', flexShrink: 0 },

  // Empty state
  emptyState      : { textAlign: 'center', padding: '16px 0' },
  emptyText       : { fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' },
}
