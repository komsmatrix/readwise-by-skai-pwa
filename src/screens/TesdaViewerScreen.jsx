import { useState, useEffect, useRef } from 'react'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY

const BANNER_URL = 'https://tizegwvlksgqtvlkiwvb.supabase.co/storage/v1/object/public/lesson-images/Banner%20above%20the%20lecture.png'
const OUTRO_URL  = 'https://tizegwvlksgqtvlkiwvb.supabase.co/storage/v1/object/public/lesson-images/outro%20after%20the%20lecture.JPG'
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

const INJECTED_PROTECTION = `
<script>
  // Auto-fit images to their containers after load
  window.addEventListener('load', function() {
    var imgs = document.querySelectorAll('img');
    imgs.forEach(function(img) {
      var parent = img.parentElement;
      if (!parent) return;
      // If image is wider than its container, constrain it
      if (img.naturalWidth > parent.offsetWidth) {
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
        img.style.width = 'auto';
      }
      // Remove hardcoded width/height attributes that break layout
      if (img.hasAttribute('width') && parseInt(img.getAttribute('width')) > parent.offsetWidth) {
        img.removeAttribute('width');
        img.removeAttribute('height');
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
      }
    });
  });

  // Disable right-click
  document.addEventListener('contextmenu', function(e) { e.preventDefault(); return false; });
  // Disable common copy shortcuts
  document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'u' || e.key === 's' || e.key === 'p' || e.key === 'a')) {
      e.preventDefault(); return false;
    }
  });
  // Disable drag to select + drag image
  document.addEventListener('dragstart', function(e) { e.preventDefault(); });
</script>
<style>
  body, * {
    -webkit-user-select: none !important;
    -moz-user-select: none !important;
    -ms-user-select: none !important;
    user-select: none !important;
    -webkit-touch-callout: none !important;
  }
</style>`

const INJECTED_CSS = `
<style id="rbs-responsive-fix">
  *, *::before, *::after { box-sizing: border-box !important; }
  html, body {
    overflow-x: hidden !important;
    max-width: 100% !important;
    width: 100% !important;
  }
  /* Force all containers to never exceed viewport width */
  body > *, div, section, article, main, header, footer, aside, nav {
    max-width: 100% !important;
    min-width: 0 !important;
  }
  img {
    max-width: 100% !important;
    height: auto !important;
    box-sizing: border-box !important;
  }
  /* Inject a JS fix after load to constrain overflowing images */
  /* Tables: always scrollable horizontally */
  table {
    display: block !important;
    width: 100% !important;
    max-width: 100% !important;
    overflow-x: auto !important;
    -webkit-overflow-scrolling: touch !important;
    border-collapse: collapse !important;
  }
  td, th {
    white-space: normal !important;
    min-width: 60px !important;
    max-width: 300px !important;
    word-break: break-word !important;
    overflow-wrap: break-word !important;
  }
  /* Override any hardcoded fixed widths on common containers */
  [style*="width"] {
    max-width: 100% !important;
  }
  pre, code {
    white-space: pre-wrap !important;
    word-break: break-word !important;
    overflow-x: auto !important;
    max-width: 100% !important;
  }
  /* Landscape mobile adjustments */
  @media (max-width: 768px) {
    body { font-size: 14px !important; }
    h1   { font-size: 1.5em !important; }
    h2   { font-size: 1.3em !important; }
    h3   { font-size: 1.1em !important; }
    td, th { font-size: 13px !important; }
  }
  @media (orientation: landscape) and (max-width: 900px) {
    body { font-size: 13px !important; }
    h1   { font-size: 1.3em !important; }
    h2   { font-size: 1.1em !important; }
  }
  /* Keep photo grids in 2 columns on mobile */
  @media (max-width: 640px) {
    .photo-grid-2 { grid-template-columns: 1fr 1fr !important; }
    .photo-grid-2 img { max-height: 160px !important; }
    .photo-grid-3 { grid-template-columns: 1fr 1fr !important; }
    .photo-grid-3 img { max-height: 130px !important; }
  }
</style>`

const INJECTED_GRID_FIX = `
<style id="rbs-grid-fix">
  /* Override any media query that collapses 2-col grids on mobile */
  @media (max-width: 700px) {
    .photo-grid-2,
    .two-col,
    .image-pair,
    .img-duo,
    .col-2,
    .grid-2 {
      display: grid !important;
      grid-template-columns: 1fr 1fr !important;
      gap: 8px !important;
    }
    .photo-grid-2 img,
    .two-col img,
    .image-pair img,
    .img-duo img {
      max-height: 160px !important;
      width: 100% !important;
      object-fit: cover !important;
    }
    .photo-grid-3,
    .three-col,
    .col-3,
    .grid-3 {
      display: grid !important;
      grid-template-columns: 1fr 1fr !important;
      gap: 8px !important;
    }
    .photo-grid-3 img {
      max-height: 130px !important;
      width: 100% !important;
      object-fit: cover !important;
    }
  }
</style>`

function injectResponsiveFix(html) {
  if (!html) return html
  if (html.includes('rbs-responsive-fix')) {
    // Already injected head CSS — just append grid fix at end of body
    if (html.includes('</body>')) {
      return html.replace('</body>', INJECTED_GRID_FIX + '\n</body>')
    }
    return html + INJECTED_GRID_FIX
  }
  // Fresh injection — add both to head and grid fix to body end
  let result = html
  if (result.includes('</head>')) {
    result = result.replace('</head>', INJECTED_PROTECTION + '\n' + INJECTED_CSS + '\n</head>')
  } else {
    result = INJECTED_PROTECTION + '\n' + INJECTED_CSS + '\n' + result
  }
  if (result.includes('</body>')) {
    result = result.replace('</body>', INJECTED_GRID_FIX + '\n</body>')
  } else {
    result = result + INJECTED_GRID_FIX
  }
  return result
}

function useHtmlBlobUrl(html) {
  const [blobUrl, setBlobUrl] = useState(null)
  useEffect(() => {
    if (!html) { setBlobUrl(null); return }
    const fixed = injectResponsiveFix(html)
    const blob  = new Blob([fixed], { type: 'text/html' })
    const url   = URL.createObjectURL(blob)
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
  const [doneTopics, setDoneTopics] = useState(() => {
    try { return JSON.parse(localStorage.getItem('rbs_tesda_done') || '{}') } catch { return {} }
  })

  function toggleDone(subtopicId) {
    setDoneTopics(prev => {
      const next = { ...prev, [subtopicId]: !prev[subtopicId] }
      localStorage.setItem('rbs_tesda_done', JSON.stringify(next))
      return next
    })
  }
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

  const videoUrls = [
    detail?.video_url_1,
    detail?.video_url_2,
    detail?.video_url_3,
    detail?.video_url_4,
  ].filter(Boolean)

  const hasVideos      = videoUrls.length > 0
  const hasInfographic = detail?.infographic_url
  const hasResources   = mediaUrls.length > 0 || hasVideos

  const tabs = [
    { id:'reviewer',    label:'📖 Reviewer',   show: true },
    { id:'resources',   label:'🎬 Resources',  show: hasResources },
    { id:'infographic', label:'🖼 Infographic', show: !!hasInfographic },
  ].filter(t => t.show)

  function handlePrint() {
    if (!iframeRef.current) return
    try { iframeRef.current.contentWindow.print() }
    catch { window.print() }
  }

  const isDone = subtopic ? doneTopics[subtopic.id] : false

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
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              {subtopic && (
                <button
                  onClick={() => toggleDone(subtopic.id)}
                  style={{ background: doneTopics[subtopic.id] ? 'rgba(16,185,129,0.15)' : 'var(--bg-elevated)', border: doneTopics[subtopic.id] ? '1px solid rgba(16,185,129,0.4)' : '1px solid var(--border)', color: doneTopics[subtopic.id] ? '#10B981' : 'var(--text-muted)', fontSize:11, fontWeight:700, padding:'6px 10px', borderRadius:8, cursor:'pointer', fontFamily:'inherit' }}>
                  {doneTopics[subtopic.id] ? '✓ Done' : '○ Mark Done'}
                </button>
              )}
              <button onClick={handlePrint} style={s.printBtn} title="Print / Save as PDF">🖨️</button>
            </div>
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
          {/* Highlighted Resources quick link — always visible */}
          {hasResources && tab !== 'resources' && (
            <button onClick={() => setTab('resources')} style={s.resourcesQuickBtn}>
              🎬 Videos & Resources ✨
            </button>
          )}
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
                {/* Reviewer iframe */}
                <iframe
                  ref={iframeRef}
                  src={iframeSrc}
                  style={{ width:'100%', flex:1, border:'none', display:'block', minHeight:400 }}
                  title={title}
                  sandbox="allow-scripts allow-popups allow-forms allow-modals allow-popups-to-escape-sandbox allow-same-origin"
                />
                {/* Outro — full width on mobile, 50% centered on desktop */}
                <a href={YT_CHANNEL} target="_blank" rel="noopener noreferrer"
                  style={{ display:'flex', justifyContent:'center', flexShrink:0, background:'var(--bg-base)' }}>
                  <img src={OUTRO_URL} alt="Like, Subscribe and Turn on the Bell"
                    style={{ width: window.innerWidth < 768 ? '100%' : '50%', height:'auto', display:'block', cursor:'pointer' }} />
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
                  <button onClick={() => setTab('resources')} style={s.switchBtn}>
                    🎬 Watch Videos & Resources →
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Resources tab — Videos + media all in one place */}
        {tab === 'resources' && (
          <div style={s.scrollPad} id="resources-tab">

            {/* Highlighted header */}
            <div style={{ margin:'0 0 16px', background:'linear-gradient(135deg, rgba(201,169,110,0.15), rgba(201,169,110,0.05))', border:'1.5px solid rgba(201,169,110,0.4)', borderRadius:14, padding:'14px 16px' }}>
              <div style={{ fontSize:15, fontWeight:800, color:'var(--accent)', marginBottom:4 }}>🎬 Videos & Resources</div>
              <div style={{ fontSize:12, color:'var(--text-secondary)', lineHeight:1.5 }}>
                Watch the video reviewers, then read the HTML reviewer above to master this topic.
              </div>
            </div>

            {/* YouTube Videos — all 4 */}
            {videoUrls.length > 0 && (
              <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                {videoUrls.map((url, i) => (
                  <div key={i} style={r.mediaCard}>
                    <div style={r.mediaLabel}>📹 Video Reviewer {i + 1}</div>
                    <iframe src={toYouTubeEmbed(url)}
                      style={{ width:'100%', aspectRatio:'16/9', borderRadius:10, border:'none', display:'block', marginTop:6 }}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                    <div style={r.ytBtnRow}>
                      <a href={`https://www.youtube.com/watch?v=${getYouTubeVideoId(url)}`} target="_blank" rel="noopener noreferrer" style={r.likeBtn}>👍 Like</a>
                      <a href={`${YT_CHANNEL}?sub_confirmation=1`} target="_blank" rel="noopener noreferrer" style={r.subBtn}>🔔 Subscribe</a>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Other media resources */}
            {mediaUrls.length > 0 && (
              <div style={{ marginTop: videoUrls.length > 0 ? 20 : 0 }}>
                <div style={r.sectionTitle}>📦 Additional Resources</div>
                {mediaUrls.map((url, i) => (
                  <MediaCard key={i} url={url} label={`Resource ${i + 1}`} index={i} />
                ))}
              </div>
            )}

            {!hasResources && (
              <div style={s.center}><div style={s.muted}>No resources added yet.</div></div>
            )}

            {/* Outro banner */}
            <a href={YT_CHANNEL} target="_blank" rel="noopener noreferrer"
              style={{ display:'block', marginTop:20, borderRadius:10, overflow:'hidden' }}>
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
  resourcesQuickBtn: { padding:'6px 12px', borderRadius:20, fontSize:11, fontWeight:700, cursor:'pointer', background:'linear-gradient(135deg, #c9a96e, #e8c97a)', border:'none', color:'#0d0d0d', fontFamily:'inherit', whiteSpace:'nowrap', animation:'pulse 2s infinite', flexShrink:0 },
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
