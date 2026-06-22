import { useState, useEffect, useRef } from 'react'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY

function getYouTubeVideoId(url) {
  if (!url) return null
  const short = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/)
  if (short) return short[1]
  const watch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/)
  if (watch) return watch[1]
  return null
}

function toYouTubeEmbed(url) {
  const id = getYouTubeVideoId(url)
  return id ? `https://www.youtube.com/embed/${id}` : url
}

function YouTubeCard({ url, label }) {
  if (!url) return null
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  const videoId  = getYouTubeVideoId(url)
  const likeUrl  = videoId ? `https://www.youtube.com/watch?v=${videoId}` : url
  const subUrl   = 'https://www.youtube.com/@readwisebyskai?sub_confirmation=1'

  return (
    <div style={s.videoWrap}>
      <div style={s.videoLabel}>{label}</div>
      {isMobile ? (
        <a href={url} target="_blank" rel="noopener noreferrer" style={s.mobileVideoBtn}>
          <span style={{ fontSize:20 }}>🎬</span>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>Watch on YouTube</div>
            <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>Opens in YouTube app</div>
          </div>
          <span style={{ fontSize:11, color:'var(--text-muted)', marginLeft:'auto' }}>↗</span>
        </a>
      ) : (
        <iframe
          src={toYouTubeEmbed(url)}
          style={{ width:'100%', aspectRatio:'16/9', borderRadius:10, border:'none', display:'block' }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      )}
      <div style={s.ytBtnRow}>
        <a href={likeUrl} target="_blank" rel="noopener noreferrer" style={s.likeBtn}>👍 Like on YouTube</a>
        <a href={subUrl}  target="_blank" rel="noopener noreferrer" style={s.subBtn}>🔔 Subscribe</a>
      </div>
    </div>
  )
}

export default function TesdaViewerScreen({ qualification, onBack }) {
  const [detail,  setDetail]  = useState(qualification)
  const [tab,     setTab]     = useState('reviewer') // reviewer | videos | infographic
  const [loading, setLoading] = useState(true)
  const iframeRef = useRef(null)

  useEffect(() => {
    loadDetail()
  }, [qualification.id])

  async function loadDetail() {
    setLoading(true)
    try {
      // Try to load from Supabase if it has an html_url (stored file) or inline content
      const res  = await fetch(`${supabaseUrl}/rest/v1/tesda_qualifications?id=eq.${qualification.id}`, {
        headers: { 'apikey': supabaseAnon, 'Authorization': `Bearer ${supabaseAnon}` }
      })
      const data = await res.json()
      if (Array.isArray(data) && data[0]) setDetail(data[0])
    } catch {}
    setLoading(false)
  }

  const hasVideos      = detail.video_url_1 || detail.video_url_2
  const hasInfographic = detail.infographic_url
  const hasReviewer    = detail.html_url || detail.html_content

  const tabs = [
    { id:'reviewer',    label:'📖 Reviewer',    show: true },
    { id:'videos',      label:'📹 Videos',      show: hasVideos },
    { id:'infographic', label:'🖼 Infographic',  show: hasInfographic },
  ].filter(t => t.show)

  return (
    <div style={s.root}>

      {/* Header */}
      <div style={s.header}>
        <button onClick={onBack} style={s.backBtn}>← Back</button>
        <div style={s.headerCenter}>
          <div style={s.headerEmoji}>{detail.emoji || '📋'}</div>
          <div>
            <div style={s.headerName}>{detail.name}</div>
            <div style={s.headerNc}>{detail.nc || 'NC II'} · TESDA</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      {tabs.length > 1 && (
        <div style={s.tabRow}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              ...s.tab,
              ...(tab === t.id ? s.tabActive : {})
            }}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div style={s.content}>

        {/* Reviewer tab — HTML content in iframe */}
        {tab === 'reviewer' && (
          <div style={{ flex:1, display:'flex', flexDirection:'column' }}>
            {loading ? (
              <div style={s.center}>
                <div style={{ fontSize:13, color:'var(--text-muted)' }}>Loading reviewer…</div>
              </div>
            ) : hasReviewer ? (
              <iframe
                ref={iframeRef}
                src={detail.html_url || undefined}
                srcDoc={detail.html_content || undefined}
                style={{ flex:1, border:'none', width:'100%', height:'100%', minHeight:'calc(100vh - 120px)' }}
                title={detail.name}
                sandbox="allow-scripts allow-same-origin"
              />
            ) : (
              <div style={s.center}>
                <div style={{ fontSize:32, marginBottom:12 }}>📋</div>
                <div style={{ fontSize:16, fontWeight:700, color:'var(--text-primary)', marginBottom:8 }}>Reviewer Coming Soon</div>
                <div style={{ fontSize:13, color:'var(--text-muted)', textAlign:'center', lineHeight:1.6 }}>
                  The {detail.name} reviewer is being prepared. Check back soon or watch the video lessons while you wait.
                </div>
                {hasVideos && (
                  <button onClick={() => setTab('videos')} style={s.switchBtn}>
                    Watch Videos Instead →
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Videos tab */}
        {tab === 'videos' && (
          <div style={s.scrollPad}>
            {detail.video_url_1 && (
              <YouTubeCard url={detail.video_url_1} label="📹 Video Reviewer 1" />
            )}
            {detail.video_url_2 && (
              <YouTubeCard url={detail.video_url_2} label="📹 Video Reviewer 2" />
            )}
            {!detail.video_url_1 && !detail.video_url_2 && (
              <div style={s.center}>
                <div style={{ fontSize:13, color:'var(--text-muted)' }}>No videos added yet.</div>
              </div>
            )}
            <div style={{ height:24 }} />
          </div>
        )}

        {/* Infographic tab */}
        {tab === 'infographic' && (
          <div style={s.scrollPad}>
            {detail.infographic_url ? (
              <>
                <img
                  src={detail.infographic_url}
                  alt={`${detail.name} infographic`}
                  style={{ width:'100%', borderRadius:12, border:'1px solid var(--border)', display:'block' }}
                />
                <a href={detail.infographic_url} target="_blank" rel="noopener noreferrer" style={s.openFullBtn}>
                  Open Full Size ↗
                </a>
              </>
            ) : (
              <div style={s.center}>
                <div style={{ fontSize:13, color:'var(--text-muted)' }}>No infographic added yet.</div>
              </div>
            )}
            <div style={{ height:24 }} />
          </div>
        )}

      </div>
    </div>
  )
}

const s = {
  root        : { flex:1, display:'flex', flexDirection:'column', overflow:'hidden', height:'100%' },
  header      : { padding:'12px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12, background:'var(--bg-surface)', flexShrink:0 },
  backBtn     : { background:'none', border:'none', color:'var(--accent)', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', padding:'4px 0', flexShrink:0 },
  headerCenter: { display:'flex', alignItems:'center', gap:10, flex:1, minWidth:0 },
  headerEmoji : { fontSize:24, flexShrink:0 },
  headerName  : { fontSize:14, fontWeight:700, color:'var(--text-primary)', lineHeight:1.2 },
  headerNc    : { fontSize:11, color:'var(--accent)', marginTop:2 },
  // Tabs
  tabRow      : { display:'flex', gap:4, padding:'8px 16px', borderBottom:'1px solid var(--border)', background:'var(--bg-base)', flexShrink:0, overflowX:'auto' },
  tab         : { padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:500, cursor:'pointer', background:'none', border:'1px solid var(--border)', color:'var(--text-muted)', fontFamily:'inherit', whiteSpace:'nowrap', transition:'all .15s' },
  tabActive   : { background:'var(--accent-dim)', borderColor:'var(--accent)', color:'var(--accent)', fontWeight:700 },
  // Content
  content     : { flex:1, display:'flex', flexDirection:'column', overflow:'hidden' },
  center      : { flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:32, gap:12 },
  scrollPad   : { flex:1, overflowY:'auto', padding:'16px 16px 0' },
  switchBtn   : { marginTop:16, padding:'10px 24px', background:'var(--accent)', color:'#0d0d0d', border:'none', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' },
  openFullBtn : { display:'block', textAlign:'center', margin:'12px 0', fontSize:13, color:'var(--accent)', fontWeight:600, textDecoration:'none' },
  // Video card
  videoWrap   : { marginBottom:20 },
  videoLabel  : { fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:8 },
  mobileVideoBtn: { display:'flex', alignItems:'center', gap:10, background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:10, padding:'12px 16px', textDecoration:'none', color:'var(--text-primary)' },
  ytBtnRow    : { display:'flex', gap:8, marginTop:8 },
  likeBtn     : { flex:1, padding:'9px 0', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:8, fontSize:12, fontWeight:600, color:'var(--text-primary)', textDecoration:'none', textAlign:'center' },
  subBtn      : { flex:1, padding:'9px 0', background:'#FF0000', border:'none', borderRadius:8, fontSize:12, fontWeight:700, color:'#fff', textDecoration:'none', textAlign:'center' },
}
