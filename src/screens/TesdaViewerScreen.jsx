import { useState, useEffect, useRef } from 'react'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY

const BANNER_URL = 'https://tizegwvlksgqtvlkiwvb.supabase.co/storage/v1/object/public/lesson-images/banner_courses.png'
const OUTRO_URL  = 'https://tizegwvlksgqtvlkiwvb.supabase.co/storage/v1/object/public/lesson-images/outro_for_the_tesda_lecture.png'
const YT_CHANNEL = 'https://www.youtube.com/@readwisebyskai'

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

function isYouTubeUrl(url) {
  return url && (url.includes('youtube.com') || url.includes('youtu.be'))
}

function isAudioUrl(url) {
  if (!url) return false
  return url.match(/\.(mp3|m4a|ogg|wav|aac|flac)(\?|$)/i) !== null
}

function MediaCard({ url, label, index }) {
  if (!url) return null
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  const videoId  = getYouTubeVideoId(url)
  const ytUrl    = videoId ? `https://www.youtube.com/watch?v=${videoId}` : url
  const subUrl   = `${YT_CHANNEL}?sub_confirmation=1`

  if (isAudioUrl(url)) {
    return (
      <div style={r.mediaCard}>
        <div style={r.mediaLabel}>🎧 {label}</div>
        <audio controls style={{ width:'100%', borderRadius:8, marginTop:6 }} src={url}>
          Your browser does not support audio.
        </audio>
      </div>
    )
  }

  if (isYouTubeUrl(url)) {
    return (
      <div style={r.mediaCard}>
        <div style={r.mediaLabel}>📹 {label}</div>
        {isMobile ? (
          <a href={ytUrl} target="_blank" rel="noopener noreferrer" style={r.mobileBtn}>
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
            style={{ width:'100%', aspectRatio:'16/9', borderRadius:10, border:'none', display:'block', marginTop:6 }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        )}
        <div style={r.ytBtnRow}>
          <a href={ytUrl} target="_blank" rel="noopener noreferrer" style={r.likeBtn}>👍 Like on YouTube</a>
          <a href={subUrl} target="_blank" rel="noopener noreferrer" style={r.subBtn}>🔔 Subscribe</a>
        </div>
      </div>
    )
  }

  // Generic link
  return (
    <div style={r.mediaCard}>
      <div style={r.mediaLabel}>🔗 {label}</div>
      <a href={url} target="_blank" rel="noopener noreferrer" style={r.linkBtn}>Open Resource ↗</a>
    </div>
  )
}

function useHtmlBlobUrl(html) {
  const [blobUrl, setBlobUrl] = useState(null)
  useEffect(() => {
    if (!html) { setBlobUrl(null); return }
    const blob = new Blob([html], { type: 'text/html' })
    const url  = URL.createObjectURL(blob)
    setBlobUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [html])
  return blobUrl
}

export default function TesdaViewerScreen({ qualification, subtopic, onBack }) {
  const [detail,  setDetail]  = useState(subtopic || qualification)
  const [tab,     setTab]     = useState('reviewer')
  const [lang,    setLang]    = useState('en')
  const [loading, setLoading] = useState(true)
  const iframeRef = useRef(null)

  useEffect(() => { loadDetail() }, [subtopic?.id, qualification?.id])

  async function loadDetail() {
    setLoading(true)
    try {
      const id  = subtopic?.id || qualification?.id
      const tbl = subtopic ? 'tesda_subtopics' : 'tesda_qualifications'
      const res = await fetch(`${supabaseUrl}/rest/v1/${tbl}?id=eq.${id}`, {
        headers: { 'apikey': supabaseAnon, 'Authorization': `Bearer ${supabaseAnon}` }
      })
      const data = await res.json()
      if (Array.isArray(data) && data[0]) setDetail(data[0])
    } catch {}
    setLoading(false)
  }

  const hasEn  = detail?.html_content || detail?.html_url
  const hasFil = detail?.html_content_fil || detail?.html_url_fil
  const hasAnyReviewer = hasEn || hasFil

  const activeLang = (lang === 'fil' && !hasFil) ? 'en'
                   : (lang === 'en'  && !hasEn)  ? 'fil'
                   : lang

  const rawHtmlContent = activeLang === 'fil'
    ? (detail?.html_content_fil || detail?.html_content)
    : detail?.html_content

  const blobUrl = useHtmlBlobUrl(rawHtmlContent)

  const activeHtmlUrl = activeLang === 'fil'
    ? (detail?.html_url_fil || detail?.html_url)
    : detail?.html_url

  const iframeSrc = blobUrl || activeHtmlUrl

  const mediaUrls = [1,2,3,4,5]
    .map(n => detail?.[`media_url_${n}`])
    .filter(Boolean)

  const hasVideos      = detail?.video_url_1 || detail?.video_url_2
  const hasInfographic = detail?.infographic_url
  const hasResources   = mediaUrls.length > 0

  const tabs = [
    { id:'reviewer',    label:'📖 Reviewer',   show: true },
    { id:'videos',      label:'📹 Videos',     show: !!hasVideos },
    { id:'resources',   label:'📦 Resources',  show: hasResources },
    { id:'infographic', label:'🖼 Infographic', show: !!hasInfographic },
  ].filter(t => t.show)

  function handlePrint() {
    if (!iframeRef.current) return
    try { iframeRef.current.contentWindow.print() }
    catch { window.print() }
  }

  const title = subtopic?.name || qualification?.name || 'Reviewer'
  const nc    = qualification?.nc || subtopic?.nc || 'NC II'

  return (
    <div style={s.root}>
      {/* Header */}
      <div style={s.header}>
        <button onClick={onBack} style={s.backBtn}>← Back</button>
        <div style={s.headerCenter}>
          <div style={s.headerEmoji}>{qualification?.emoji || '📋'}</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={s.headerName}>{title}</div>
            <div style={s.headerNc}>{nc} · TESDA</div>
          </div>
          {tab === 'reviewer' && hasAnyReviewer && (
            <button onClick={handlePrint} style={s.printBtn} title="Print / Save as PDF">🖨️</button>
          )}
        </div>
      </div>

      {/* Tabs + Language toggle */}
      <div style={s.tabBar}>
        <div style={s.tabRow}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              ...s.tab, ...(tab === t.id ? s.tabActive : {})
            }}>{t.label}</button>
          ))}
        </div>
        {tab === 'reviewer' && (hasEn || hasFil) && (
          <div style={s.langToggle}>
            <button onClick={() => setLang('en')}
              style={{ ...s.langBtn, ...(activeLang === 'en' ? s.langBtnActive : {}) }}
              disabled={!hasEn}>🇺🇸 EN</button>
            <button onClick={() => setLang('fil')}
              style={{ ...s.langBtn, ...(activeLang === 'fil' ? s.langBtnActive : {}), ...(hasFil ? {} : s.langBtnDisabled) }}
              disabled={!hasFil} title={!hasFil ? 'Filipino version coming soon' : ''}>🇵🇭 FIL</button>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={s.content}>

        {/* Reviewer tab */}
        {tab === 'reviewer' && (
          <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'auto' }}>
            {loading ? (
              <div style={s.center}><div style={s.muted}>Loading reviewer…</div></div>
            ) : iframeSrc ? (
              <>
                {/* Banner — full image scaled down */}
                <a href="#resources-tab" onClick={e => { e.preventDefault(); setTab('resources') }}
                  style={{ display:'block', flexShrink:0, background:'#0a0f2e' }}>
                  <img src={BANNER_URL} alt="All resources in one place"
                    style={{ width:'100%', maxHeight:90, objectFit:'contain', display:'block', cursor:'pointer' }} />
                </a>
                {/* Reviewer iframe */}
                <iframe
                  ref={iframeRef}
                  src={iframeSrc}
                  style={{ width:'100%', height:'calc(100vh - 90px)', minHeight:600, border:'none', display:'block', flexShrink:0 }}
                  title={title}
                  sandbox="allow-scripts allow-popups allow-forms allow-modals allow-popups-to-escape-sandbox"
                />
                {/* Outro — full image scaled down */}
                <a href={YT_CHANNEL} target="_blank" rel="noopener noreferrer"
                  style={{ display:'block', flexShrink:0, background:'#0a0f2e' }}>
                  <img src={OUTRO_URL} alt="Like, Subscribe and Turn on the Bell"
                    style={{ width:'100%', maxHeight:90, objectFit:'contain', display:'block', cursor:'pointer' }} />
                </a>
              </>
            ) : (
              <div style={s.center}>
                <div style={{ fontSize:32, marginBottom:12 }}>📋</div>
                <div style={{ fontSize:16, fontWeight:700, color:'var(--text-primary)', marginBottom:8 }}>
                  {activeLang === 'fil' ? 'Filipino version coming soon' : 'Reviewer Coming Soon'}
                </div>
                <div style={s.muted}>
                  {activeLang === 'fil'
                    ? 'The Filipino version of this reviewer is being prepared.'
                    : `The ${title} reviewer is being prepared. Check back soon.`}
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
            {detail?.video_url_1 && (
              <div style={r.mediaCard}>
                <div style={r.mediaLabel}>📹 Video Reviewer 1</div>
                <iframe src={toYouTubeEmbed(detail.video_url_1)}
                  style={{ width:'100%', aspectRatio:'16/9', borderRadius:10, border:'none', display:'block', marginTop:6 }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                <div style={r.ytBtnRow}>
                  <a href={`https://www.youtube.com/watch?v=${getYouTubeVideoId(detail.video_url_1)}`} target="_blank" rel="noopener noreferrer" style={r.likeBtn}>👍 Like</a>
                  <a href={`${YT_CHANNEL}?sub_confirmation=1`} target="_blank" rel="noopener noreferrer" style={r.subBtn}>🔔 Subscribe</a>
                </div>
              </div>
            )}
            {detail?.video_url_2 && (
              <div style={r.mediaCard}>
                <div style={r.mediaLabel}>📹 Video Reviewer 2</div>
                <iframe src={toYouTubeEmbed(detail.video_url_2)}
                  style={{ width:'100%', aspectRatio:'16/9', borderRadius:10, border:'none', display:'block', marginTop:6 }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                <div style={r.ytBtnRow}>
                  <a href={`https://www.youtube.com/watch?v=${getYouTubeVideoId(detail.video_url_2)}`} target="_blank" rel="noopener noreferrer" style={r.likeBtn}>👍 Like</a>
                  <a href={`${YT_CHANNEL}?sub_confirmation=1`} target="_blank" rel="noopener noreferrer" style={r.subBtn}>🔔 Subscribe</a>
                </div>
              </div>
            )}
            {!detail?.video_url_1 && !detail?.video_url_2 && (
              <div style={s.center}><div style={s.muted}>No videos added yet.</div></div>
            )}
            <div style={{ height:24 }} />
          </div>
        )}

        {/* Resources tab */}
        {tab === 'resources' && (
          <div style={s.scrollPad} id="resources-tab">
            <div style={r.sectionHeader}>
              <div style={r.sectionTitle}>📦 Resources</div>
              <div style={r.sectionSub}>Audio reviews, video lessons, and study materials for {title}</div>
            </div>

            {mediaUrls.length === 0 ? (
              <div style={s.center}><div style={s.muted}>No resources added yet.</div></div>
            ) : (
              mediaUrls.map((url, i) => (
                <MediaCard key={i} url={url} label={`Resource ${i + 1}`} index={i} />
              ))
            )}

            {/* Outro banner in resources tab too */}
            <a href={YT_CHANNEL} target="_blank" rel="noopener noreferrer"
              style={{ display:'block', marginTop:16, borderRadius:10, overflow:'hidden' }}>
              <img src={OUTRO_URL} alt="Like Subscribe"
                style={{ width:'100%', display:'block' }}
                onError={e => e.target.style.display='none'} />
            </a>
            <div style={{ height:24 }} />
          </div>
        )}

        {/* Infographic tab */}
        {tab === 'infographic' && (
          <div style={s.scrollPad}>
            {detail?.infographic_url ? (
              <>
                <img src={detail.infographic_url} alt={`${title} infographic`}
                  style={{ width:'100%', borderRadius:12, border:'1px solid var(--border)', display:'block' }} />
                <a href={detail.infographic_url} target="_blank" rel="noopener noreferrer" style={s.openFullBtn}>
                  Open Full Size ↗
                </a>
              </>
            ) : (
              <div style={s.center}><div style={s.muted}>No infographic added yet.</div></div>
            )}
            <div style={{ height:24 }} />
          </div>
        )}

      </div>
    </div>
  )
}

const s = {
  root          : { flex:1, display:'flex', flexDirection:'column', overflow:'hidden', height:'100%' },
  header        : { padding:'12px 16px', borderBottom:'1px solid var(--border)', background:'var(--bg-surface)', flexShrink:0 },
  backBtn       : { background:'none', border:'none', color:'var(--accent)', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', padding:'0 0 8px', display:'block' },
  headerCenter  : { display:'flex', alignItems:'center', gap:10 },
  headerEmoji   : { fontSize:22, flexShrink:0 },
  headerName    : { fontSize:13, fontWeight:700, color:'var(--text-primary)', lineHeight:1.3 },
  headerNc      : { fontSize:11, color:'var(--accent)', marginTop:1 },
  printBtn      : { background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:8, padding:'6px 10px', fontSize:14, cursor:'pointer', flexShrink:0 },
  tabBar        : { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px', borderBottom:'1px solid var(--border)', background:'var(--bg-base)', flexShrink:0, gap:8, flexWrap:'wrap' },
  tabRow        : { display:'flex', gap:4, overflowX:'auto' },
  tab           : { padding:'6px 12px', borderRadius:20, fontSize:11, fontWeight:500, cursor:'pointer', background:'none', border:'1px solid var(--border)', color:'var(--text-muted)', fontFamily:'inherit', whiteSpace:'nowrap' },
  tabActive     : { background:'var(--accent-dim)', borderColor:'var(--accent)', color:'var(--accent)', fontWeight:700 },
  langToggle    : { display:'flex', gap:4, flexShrink:0 },
  langBtn       : { padding:'5px 10px', borderRadius:20, fontSize:11, fontWeight:500, cursor:'pointer', background:'none', border:'1px solid var(--border)', color:'var(--text-muted)', fontFamily:'inherit' },
  langBtnActive : { background:'var(--bg-elevated)', borderColor:'var(--accent)', color:'var(--text-primary)', fontWeight:700 },
  langBtnDisabled: { opacity:0.4, cursor:'not-allowed' },
  content       : { flex:1, display:'flex', flexDirection:'column', overflow:'hidden' },
  center        : { flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:32, gap:8 },
  muted         : { fontSize:13, color:'var(--text-muted)', textAlign:'center', lineHeight:1.6 },
  scrollPad     : { flex:1, overflowY:'auto', padding:'16px 16px 0' },
  iframe        : { border:'none', width:'100%', height:'100%', minHeight:'calc(100vh - 200px)' },
  switchBtn     : { marginTop:16, padding:'10px 24px', background:'var(--accent)', color:'#0d0d0d', border:'none', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' },
  openFullBtn   : { display:'block', textAlign:'center', margin:'12px 0', fontSize:13, color:'var(--accent)', fontWeight:600, textDecoration:'none' },
}

const r = {
  sectionHeader : { marginBottom:16 },
  sectionTitle  : { fontSize:16, fontWeight:700, color:'var(--text-primary)', marginBottom:4 },
  sectionSub    : { fontSize:12, color:'var(--text-muted)', lineHeight:1.5 },
  mediaCard     : { background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:12, padding:'14px', marginBottom:14 },
  mediaLabel    : { fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6 },
  ytBtnRow      : { display:'flex', gap:8, marginTop:10 },
  likeBtn       : { flex:1, padding:'9px 0', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:8, fontSize:12, fontWeight:600, color:'var(--text-primary)', textDecoration:'none', textAlign:'center' },
  subBtn        : { flex:1, padding:'9px 0', background:'#FF0000', border:'none', borderRadius:8, fontSize:12, fontWeight:700, color:'#fff', textDecoration:'none', textAlign:'center' },
  mobileBtn     : { display:'flex', alignItems:'center', gap:10, background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:10, padding:'12px 16px', textDecoration:'none', color:'var(--text-primary)' },
  linkBtn       : { display:'inline-block', marginTop:8, padding:'9px 20px', background:'var(--accent-dim)', border:'1px solid var(--accent)', borderRadius:8, fontSize:13, fontWeight:600, color:'var(--accent)', textDecoration:'none' },
}
