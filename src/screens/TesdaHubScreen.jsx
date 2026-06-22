import { useState, useEffect } from 'react'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY

async function sb(path) {
  const res = await fetch(`${supabaseUrl}${path}`, {
    headers: { 'apikey': supabaseAnon, 'Authorization': `Bearer ${supabaseAnon}` }
  })
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

export default function TesdaHubScreen({ customer, onOpenViewer, onBack }) {
  const [view,           setView]           = useState('hub')
  const [qualifications, setQualifications] = useState([])
  const [subtopics,      setSubtopics]      = useState([])
  const [activeQual,     setActiveQual]     = useState(null)
  const [loading,        setLoading]        = useState(true)
  const [subLoading,     setSubLoading]     = useState(false)
  const [search,         setSearch]         = useState('')

  useEffect(() => { loadQualifications() }, [])

  async function loadQualifications() {
    setLoading(true)
    try {
      const data = await sb('/rest/v1/tesda_qualifications?is_active=eq.true&order=sort_order')
      setQualifications(data.length ? data : FALLBACK_QUALS)
    } catch {
      setQualifications(FALLBACK_QUALS)
    }
    setLoading(false)
  }

  async function openQualification(qual) {
    setActiveQual(qual)
    setSubLoading(true)
    setView('subtopics')
    setSearch('')
    try {
      const data = await sb(
        `/rest/v1/tesda_subtopics?qualification_id=eq.${qual.id}&is_active=eq.true&order=sort_order`
      )
      setSubtopics(data)
    } catch {
      setSubtopics([])
    }
    setSubLoading(false)
  }

  function getLastOpened(id) {
    try {
      const data = JSON.parse(localStorage.getItem('tesda_last_opened') || '{}')
      return data[id] || null
    } catch { return null }
  }

  function markOpened(id) {
    try {
      const data = JSON.parse(localStorage.getItem('tesda_last_opened') || '{}')
      data[id] = new Date().toISOString()
      localStorage.setItem('tesda_last_opened', JSON.stringify(data))
    } catch {}
  }

  function formatLastOpened(iso) {
    if (!iso) return null
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    const hrs  = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (mins < 1)  return 'Just now'
    if (mins < 60) return `${mins}m ago`
    if (hrs  < 24) return `${hrs}h ago`
    if (days < 7)  return `${days}d ago`
    return new Date(iso).toLocaleDateString('en-PH', { month:'short', day:'numeric' })
  }

  function backToHub() {
    setView('hub')
    setActiveQual(null)
    setSubtopics([])
    setSearch('')
  }

  // ── Hub view ──────────────────────────────────────────────────────────────
  if (view === 'hub') {
    const filtered = qualifications.filter(q =>
      q.name.toLowerCase().includes(search.toLowerCase()) ||
      (q.description || '').toLowerCase().includes(search.toLowerCase())
    )

    return (
      <div style={s.root}>
        <div style={s.scroll}>
          {/* All Courses back button */}
          <div style={{ padding:'12px 20px 0' }}>
            <button onClick={onBack} style={s.backBtn}>← All Courses</button>
          </div>

          <div style={s.header}>
            <div style={s.badge}>TESDA · NC Qualifications</div>
            <h1 style={s.title}>Your TESDA Bundle</h1>
            <p style={s.sub}>Select a qualification to view its core competencies and full reviewers.</p>
          </div>

          <div style={s.searchWrap}>
            <span>🔍</span>
            <input style={s.searchInput} placeholder="Search qualifications…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <div style={s.statsRow}>
            <div style={s.statBox}>
              <div style={s.statNum}>{qualifications.length}</div>
              <div style={s.statLabel}>Qualifications</div>
            </div>
            <div style={s.statBox}>
              <div style={s.statNum}>✓</div>
              <div style={s.statLabel}>Lifetime Access</div>
            </div>
            <div style={s.statBox}>
              <div style={s.statNum}>📹</div>
              <div style={s.statLabel}>Video + Guides</div>
            </div>
          </div>

          {loading ? (
            <div style={s.center}><div style={s.muted}>Loading…</div></div>
          ) : filtered.length === 0 ? (
            <div style={s.center}><div style={s.muted}>No qualifications found.</div></div>
          ) : (
            <div style={s.listWrap}>
              {filtered.map(q => (
                <button key={q.id} style={s.qualCard} onClick={() => openQualification(q)}>
                  <div style={s.qualEmoji}>{q.emoji || '📋'}</div>
                  <div style={s.qualBody}>
                    <div style={s.qualName}>{q.name}</div>
                    <div style={s.qualDesc}>{q.description || 'Tap to view core competencies'}</div>
                    <div style={s.qualMeta}>
                      <span style={s.ncBadge}>{q.nc || 'NC II'}</span>
                      {q.subtopic_count > 0 && (
                        <span style={s.countBadge}>{q.subtopic_count} competencies</span>
                      )}
                    </div>
                  </div>
                  <div style={s.arrow}>›</div>
                </button>
              ))}
            </div>
          )}
          <div style={{ height:24 }} />
        </div>
      </div>
    )
  }

  // ── Subtopics view ────────────────────────────────────────────────────────
  if (view === 'subtopics') {
    const filtered = subtopics.filter(st =>
      st.name.toLowerCase().includes(search.toLowerCase()) ||
      (st.description || '').toLowerCase().includes(search.toLowerCase())
    )

    return (
      <div style={s.root}>
        <div style={s.scroll}>
          <div style={s.subHeader}>
            <button onClick={backToHub} style={s.backBtn}>← All Qualifications</button>
            <div style={s.subHeaderInner}>
              <span style={{ fontSize:28 }}>{activeQual?.emoji || '📋'}</span>
              <div>
                <div style={s.subHeaderName}>{activeQual?.name}</div>
                <div style={s.subHeaderNc}>{activeQual?.nc || 'NC II'} · TESDA</div>
              </div>
            </div>
          </div>

          {activeQual?.overview && (
            <div style={s.overviewBox}>
              <div style={s.overviewLabel}>📌 Qualification Overview</div>
              <div style={s.overviewText}>{activeQual.overview}</div>
            </div>
          )}

          <div style={{ padding:'0 20px 8px' }}>
            <div style={s.searchWrap}>
              <span>🔍</span>
              <input style={s.searchInput} placeholder="Search core competencies…"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          <div style={s.sectionLabel}>
            📚 Core Competencies
            {subtopics.length > 0 && (
              <span style={s.sectionCount}>{subtopics.length} units</span>
            )}
          </div>

          {(() => {
            const recent = subtopics
              .filter(st => getLastOpened(st.id))
              .sort((a, b) => new Date(getLastOpened(b.id)) - new Date(getLastOpened(a.id)))
              .slice(0, 2)
            if (!recent.length) return null
            return (
              <div style={{ padding:'0 20px 12px' }}>
                <div style={{ fontSize:10, fontWeight:600, color:'var(--accent)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:6 }}>🕐 Recently Opened</div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {recent.map(st => (
                    <button key={st.id} style={{ ...s.stCard, padding:'10px 14px' }}
                      onClick={() => { markOpened(st.id); onOpenViewer(st, activeQual) }}>
                      <div style={{ flex:1, textAlign:'left' }}>
                        <div style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)' }}>{st.name}</div>
                        <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>Last opened {formatLastOpened(getLastOpened(st.id))}</div>
                      </div>
                      <div style={s.arrow}>›</div>
                    </button>
                  ))}
                </div>
              </div>
            )
          })()}

          {subLoading ? (
            <div style={s.center}><div style={s.muted}>Loading competencies…</div></div>
          ) : filtered.length === 0 ? (
            <div style={s.center}>
              <div style={{ fontSize:32, marginBottom:12 }}>📋</div>
              <div style={s.emptyTitle}>Coming Soon</div>
              <div style={s.muted}>Core competencies for {activeQual?.name} are being prepared.</div>
            </div>
          ) : (
            <div style={s.listWrap}>
              {filtered.map((st, i) => (
                <button key={st.id} style={s.stCard}
                  onClick={() => { markOpened(st.id); onOpenViewer(st, activeQual) }}>
                  <div style={s.stNum}>{i + 1}</div>
                  <div style={s.stBody}>
                    <div style={s.stName}>{st.name}</div>
                    {st.description && <div style={s.stDesc}>{st.description}</div>}
                    <div style={s.stMeta}>
                      {(st.html_url || st.html_content)
                        ? <span style={s.hasBadge}>📖 EN Reviewer</span>
                        : <span style={s.soonBadge}>📖 Coming Soon</span>}
                      {(st.html_url_fil || st.html_content_fil) && <span style={s.hasBadge}>🇵🇭 FIL Reviewer</span>}
                      {st.video_url_1     && <span style={s.hasBadge}>📹 Video 1</span>}
                      {st.video_url_2     && <span style={s.hasBadge}>📹 Video 2</span>}
                      {st.infographic_url && <span style={s.hasBadge}>🖼 Infographic</span>}
                    </div>
                    {getLastOpened(st.id) && (
                      <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:5 }}>
                        🕐 Last opened {formatLastOpened(getLastOpened(st.id))}
                      </div>
                    )}
                  </div>
                  <div style={s.arrow}>›</div>
                </button>
              ))}
            </div>
          )}
          <div style={{ height:24 }} />
        </div>
      </div>
    )
  }

  return null
}

const FALLBACK_QUALS = [
  { id:'cookery',      name:'Cookery NC II',                    emoji:'👨‍🍳', nc:'NC II', description:'Food preparation, kitchen safety, and cooking techniques',       subtopic_count:4 },
  { id:'caregiving',   name:'Caregiving NC II',                 emoji:'🏥',  nc:'NC II', description:'Patient care, health monitoring, and home assistance',            subtopic_count:4 },
  { id:'housekeeping', name:'Housekeeping NC II',               emoji:'🏨',  nc:'NC II', description:'Room servicing, linen management, and hotel standards',           subtopic_count:4 },
  { id:'domestic',     name:'Domestic Work NC II',              emoji:'🏠',  nc:'NC II', description:'Household management and family support services',                subtopic_count:4 },
  { id:'beauty',       name:'Beauty Care NC II',                emoji:'💅',  nc:'NC II', description:'Hair, skin, and nail care services and techniques',               subtopic_count:4 },
  { id:'electrical',   name:'Electrical Installation NC II',    emoji:'⚡',  nc:'NC II', description:'Wiring, installation, and electrical safety standards',           subtopic_count:4 },
  { id:'welding',      name:'Shielded Metal Arc Welding NC II', emoji:'🔧',  nc:'NC II', description:'SMAW techniques, safety, and quality standards',                 subtopic_count:4 },
  { id:'driving',      name:'Driving NC II',                    emoji:'🚗',  nc:'NC II', description:'Traffic laws, defensive driving, and vehicle maintenance',        subtopic_count:4 },
  { id:'baking',       name:'Bread & Pastry Production NC II',  emoji:'🍞',  nc:'NC II', description:'Baking, pastry production, and food safety',                     subtopic_count:4 },
  { id:'massage',      name:'Massage Therapy NC II',            emoji:'💆',  nc:'NC II', description:'Therapeutic massage techniques and body mechanics',               subtopic_count:4 },
]

const s = {
  root          : { flex:1, display:'flex', flexDirection:'column', overflow:'hidden' },
  scroll        : { flex:1, overflowY:'auto' },
  center        : { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'40px 20px', gap:8 },
  muted         : { fontSize:13, color:'var(--text-muted)', textAlign:'center' },
  emptyTitle    : { fontSize:16, fontWeight:700, color:'var(--text-primary)', marginBottom:4 },
  header        : { padding:'12px 20px 12px' },
  badge         : { fontSize:10, fontWeight:600, color:'var(--accent)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:8 },
  title         : { fontFamily:'var(--font-display)', fontSize:24, color:'var(--text-primary)', marginBottom:6, lineHeight:1.2 },
  sub           : { fontSize:13, color:'var(--text-secondary)', lineHeight:1.6 },
  searchWrap    : { display:'flex', alignItems:'center', gap:10, background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:10, padding:'10px 14px', margin:'0 20px 12px' },
  searchInput   : { flex:1, background:'none', border:'none', outline:'none', color:'var(--text-primary)', fontSize:13, fontFamily:'inherit' },
  statsRow      : { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, margin:'0 20px 16px' },
  statBox       : { background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:10, padding:'10px 8px', textAlign:'center' },
  statNum       : { fontFamily:'var(--font-display)', fontSize:20, fontWeight:700, color:'var(--accent)' },
  statLabel     : { fontSize:10, color:'var(--text-muted)', marginTop:2, textTransform:'uppercase', letterSpacing:'.04em' },
  listWrap      : { padding:'0 20px', display:'flex', flexDirection:'column', gap:8 },
  qualCard      : { display:'flex', alignItems:'center', gap:14, background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:14, padding:'14px 16px', cursor:'pointer', textAlign:'left', fontFamily:'inherit', transition:'all .15s', width:'100%' },
  qualEmoji     : { fontSize:26, flexShrink:0, width:44, height:44, background:'var(--bg-elevated)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center' },
  qualBody      : { flex:1, minWidth:0 },
  qualName      : { fontSize:14, fontWeight:700, color:'var(--text-primary)', marginBottom:3 },
  qualDesc      : { fontSize:11, color:'var(--text-secondary)', lineHeight:1.5, marginBottom:6 },
  qualMeta      : { display:'flex', gap:6, flexWrap:'wrap' },
  ncBadge       : { fontSize:10, padding:'2px 8px', background:'var(--accent-dim)', color:'var(--accent)', borderRadius:20, fontWeight:600 },
  countBadge    : { fontSize:10, padding:'2px 8px', background:'var(--bg-elevated)', color:'var(--text-muted)', borderRadius:20, border:'1px solid var(--border)' },
  arrow         : { fontSize:20, color:'var(--text-muted)', flexShrink:0 },
  backBtn       : { background:'none', border:'none', color:'var(--accent)', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', padding:'0 0 10px', display:'block' },
  subHeader     : { padding:'16px 20px 12px', borderBottom:'1px solid var(--border)' },
  subHeaderInner: { display:'flex', alignItems:'center', gap:12 },
  subHeaderName : { fontSize:16, fontWeight:700, color:'var(--text-primary)', lineHeight:1.2 },
  subHeaderNc   : { fontSize:11, color:'var(--accent)', marginTop:2 },
  overviewBox   : { margin:'12px 20px', background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:10, padding:'12px 14px' },
  overviewLabel : { fontSize:11, fontWeight:600, color:'var(--accent)', marginBottom:4, textTransform:'uppercase', letterSpacing:'.06em' },
  overviewText  : { fontSize:13, color:'var(--text-secondary)', lineHeight:1.6 },
  sectionLabel  : { fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.08em', padding:'0 20px 8px', display:'flex', alignItems:'center', gap:8 },
  sectionCount  : { fontSize:10, padding:'2px 8px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:20, color:'var(--text-muted)', fontWeight:400 },
  stCard        : { display:'flex', alignItems:'flex-start', gap:12, background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:12, padding:'14px 14px', cursor:'pointer', textAlign:'left', fontFamily:'inherit', width:'100%', transition:'all .15s' },
  stNum         : { width:28, height:28, background:'var(--accent-dim)', border:'1px solid var(--accent)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'var(--accent)', flexShrink:0, marginTop:1 },
  stBody        : { flex:1, minWidth:0 },
  stName        : { fontSize:13, fontWeight:700, color:'var(--text-primary)', marginBottom:4, lineHeight:1.3 },
  stDesc        : { fontSize:11, color:'var(--text-secondary)', lineHeight:1.5, marginBottom:6 },
  stMeta        : { display:'flex', gap:5, flexWrap:'wrap' },
  hasBadge      : { fontSize:10, padding:'2px 7px', background:'rgba(16,185,129,0.1)', color:'#10B981', borderRadius:20, border:'1px solid rgba(16,185,129,0.2)' },
  soonBadge     : { fontSize:10, padding:'2px 7px', background:'var(--bg-elevated)', color:'var(--text-muted)', borderRadius:20, border:'1px solid var(--border)' },
}
