import { useState, useEffect, useRef, useCallback } from 'react'
import { getBookFileUrl, getTextContent, saveProgress } from '../lib/supabase.js'

// ══════════════════════════════════════════════════════════════════════════════
// TEXT READER
// ══════════════════════════════════════════════════════════════════════════════
function TextReader({ book, customer, prefs, initialProgress, onClose, onSwitchToPdf, onProgressUpdate }) {
  const [html,        setHtml]        = useState('')
  const [loading,     setLoading]     = useState(true)
  const [loadError,   setLoadError]   = useState(false)
  const [fontSize,    setFontSize]    = useState(prefs?.fontSize || 18)
  const [bookmarks,   setBookmarks]   = useState(initialProgress?.bookmarks || [])
  const [percent,     setPercent]     = useState(initialProgress?.percent   || 0)
  const [chapters,    setChapters]    = useState([])
  const [activePanel, setActivePanel] = useState(null)
  const [ttsText,     setTtsText]     = useState('')
  const [ttsPlaying,  setTtsPlaying]  = useState(false)
  const [ttsVoices,   setTtsVoices]   = useState([])

  const containerRef = useRef(null)
  const bookmarksRef = useRef(initialProgress?.bookmarks || [])
  const saveTimerRef = useRef(null)
  const utteranceRef = useRef(null)

  useEffect(() => { loadText(); return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); stopTTS() } }, [book.id])

  async function loadText() {
    try {
      setLoading(true); setLoadError(false)
      if (!book.text_path) { setLoadError(true); setLoading(false); return }
      const content = await getTextContent(book.text_path)
      if (!content) { setLoadError(true); setLoading(false); return }
      setHtml(content); setLoading(false)
      setTimeout(() => {
        if (initialProgress?.scroll_position && containerRef.current) {
          containerRef.current.scrollTop = initialProgress.scroll_position
        }
      }, 100)
    } catch { setLoadError(true); setLoading(false) }
  }

  useEffect(() => {
    if (!html) return
    const parser = new DOMParser()
    const doc    = parser.parseFromString(html, 'text/html')
    const heads  = doc.querySelectorAll('h2.chapter-heading')
    setChapters(Array.from(heads).map((h, i) => ({ title: h.textContent, index: i })))
  }, [html])

  useEffect(() => {
    const voices = window.speechSynthesis?.getVoices() || []
    setTtsVoices(voices)
    window.speechSynthesis?.addEventListener('voiceschanged', () => setTtsVoices(window.speechSynthesis.getVoices()))
  }, [])

  function handleScroll() {
    const el = containerRef.current; if (!el) return
    const scrollTop = el.scrollTop
    const scrollMax = el.scrollHeight - el.clientHeight
    const pct       = scrollMax > 0 ? Math.round((scrollTop / scrollMax) * 100) : 0
    setPercent(pct)
    const visible = getVisibleText(); if (visible) setTtsText(visible)
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      const p = { scroll_position: scrollTop, percent: pct, bookmarks: bookmarksRef.current, updated_at: new Date().toISOString() }
      saveProgress(customer.id, book.id, p)
      onProgressUpdate(p)
    }, 1000)
  }

  function getVisibleText() {
    if (!containerRef.current) return ''
    const el   = containerRef.current, rect = el.getBoundingClientRect()
    const elms = el.querySelectorAll('p, h2')
    const vis  = []
    for (const e of elms) { const r = e.getBoundingClientRect(); if (r.top >= rect.top && r.bottom <= rect.bottom) vis.push(e.textContent) }
    return vis.join(' ').slice(0, 3000)
  }

  function toggleBookmark() {
    const el = containerRef.current; if (!el) return
    const pos = el.scrollTop
    const isMarked = bookmarksRef.current.some(b => Math.abs(b.position - pos) < 100)
    const updated  = isMarked
      ? bookmarksRef.current.filter(b => Math.abs(b.position - pos) >= 100)
      : [...bookmarksRef.current, { position: pos, percent, label: `${percent}% through` }]
    bookmarksRef.current = updated; setBookmarks([...updated])
    saveProgress(customer.id, book.id, { bookmarks: updated })
  }

  function jumpToChapter(i) {
    const heads = containerRef.current?.querySelectorAll('h2.chapter-heading')
    if (heads?.[i]) heads[i].scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActivePanel(null)
  }

  function stopTTS() {
    window.speechSynthesis?.cancel()
    setTtsPlaying(false)
  }

  function toggleTTS() {
    if (ttsPlaying) { stopTTS(); return }
    const text = ttsText || getVisibleText()
    if (!text) return
    const utt = new SpeechSynthesisUtterance(text)
    utt.rate = 1.0
    const voices = window.speechSynthesis.getVoices()
    const preferred = voices.find(v => v.name.includes('Google') || v.name.includes('Natural')) || voices[0]
    if (preferred) utt.voice = preferred
    utt.onend = () => setTtsPlaying(false)
    utt.onerror = () => setTtsPlaying(false)
    utteranceRef.current = utt
    window.speechSynthesis.speak(utt)
    setTtsPlaying(true)
  }

  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'INPUT') return
      if (e.key === ' ' || e.key === 'k')               { e.preventDefault(); toggleTTS() }
      if (e.key === 'b' || e.key === 'B')               { e.preventDefault(); toggleBookmark() }
      if (e.key === 'Escape' && activePanel)             { e.preventDefault(); setActivePanel(null) }
      if ((e.key === '+' || e.key === '=') && e.ctrlKey) { e.preventDefault(); setFontSize(f => Math.min(30, f + 1)) }
      if (e.key === '-' && e.ctrlKey)                    { e.preventDefault(); setFontSize(f => Math.max(14, f - 1)) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activePanel, ttsPlaying, ttsText, percent])

  const theme = { dark: { bg: '#111', text: '#e8e4dd', heading: '#c9a96e', border: '#2a2a2a' }, sepia: { bg: '#1e1810', text: '#e4d0a8', heading: '#d4a85a', border: '#2d2418' }, light: { bg: '#fefcf8', text: '#1a1916', heading: '#8a6a2e', border: '#e5e0d8' } }[prefs?.theme || 'dark']

  const css = `body{margin:0;padding:0;background:${theme.bg}}.book-header{text-align:center;padding:40px 20px 28px;border-bottom:1px solid ${theme.border};margin-bottom:28px}.book-title{font-family:Georgia,serif;font-size:26px;font-weight:400;color:${theme.heading};margin:0 0 8px;letter-spacing:-0.02em}.book-author{font-size:15px;color:${theme.text};opacity:0.6;margin:0}.book-content{max-width:660px;margin:0 auto;padding:0 20px 80px}p{font-family:Georgia,serif;font-size:${fontSize}px;line-height:1.85;color:${theme.text};margin:0 0 1.2em;text-align:justify}h2.chapter-heading{font-family:Georgia,serif;font-size:${Math.round(fontSize*1.3)}px;font-weight:600;color:${theme.heading};margin:2.5em 0 1em;padding-top:1em;border-top:1px solid ${theme.border}}`

  if (loadError) return (
    <div style={{ ...rs.root, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16 }}>
      <p style={{ color:'var(--text-muted)', fontSize:14 }}>Text version not available.</p>
      <button style={rs.switchBtn} onClick={onSwitchToPdf}>Switch to PDF Mode</button>
    </div>
  )

  return (
    <div style={rs.root}>
      <header style={rs.topBar}>
        <button style={rs.iconBtn} onClick={onClose}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M11 4L6 9l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <div style={rs.bookInfo}>
          <span style={rs.bookTitle}>{book.title}</span>
          <span style={rs.textBadge}>TEXT</span>
        </div>
        <div style={rs.topActions}>
          <button style={rs.iconBtn} onClick={() => setFontSize(f => Math.max(14, f-1))} title="Smaller">A-</button>
          <span style={rs.zoomLabel}>{fontSize}px</span>
          <button style={rs.iconBtn} onClick={() => setFontSize(f => Math.min(30, f+1))} title="Larger">A+</button>
          <div style={rs.divider}/>
          <div style={rs.modeToggle}>
            <button style={{ ...rs.modeBtn, ...rs.modeBtnActive }}>Text</button>
            <button style={rs.modeBtn} onClick={onSwitchToPdf}>PDF</button>
          </div>
          <div style={rs.divider}/>
          <button style={{ ...rs.iconBtn, color: 'var(--text-muted)' }} onClick={toggleBookmark} title="Bookmark (B)">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M3 2h10v12l-5-3-5 3V2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>
          </button>
          {chapters.length > 0 && (
            <button style={{ ...rs.iconBtn, color: activePanel === 'toc' ? 'var(--accent)' : 'var(--text-muted)' }} onClick={() => setActivePanel(v => v === 'toc' ? null : 'toc')}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M2 3h3M2 8h3M2 13h3M7 3h7M7 8h7M7 13h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
            </button>
          )}
        </div>
      </header>

      {activePanel === 'toc' && (
        <div style={rs.panel} className="animate-in">
          <p style={rs.panelTitle}>Chapters</p>
          {chapters.map((ch, i) => <button key={i} style={rs.panelItem} onClick={() => jumpToChapter(i)}>{ch.title}</button>)}
        </div>
      )}

      <div ref={containerRef} style={{ ...rs.textArea, background: theme.bg }} onScroll={handleScroll}>
        {loading ? (
          <div style={rs.loading}><div style={rs.loadingDot}/><p style={rs.loadingText}>Opening {book.title}…</p></div>
        ) : (
          <><style>{css}</style><div dangerouslySetInnerHTML={{ __html: html }}/></>
        )}
      </div>

      <footer style={rs.footer}>
        <div style={rs.progressRow}>
          <div style={rs.progressTrack} onClick={e => { const r = e.currentTarget.getBoundingClientRect(); const el = containerRef.current; if (el) el.scrollTop = ((e.clientX - r.left) / r.width) * (el.scrollHeight - el.clientHeight) }}>
            <div style={{ ...rs.progressFill, width: `${percent}%` }}/>
            <div style={{ ...rs.progressThumb, left: `${Math.min(percent, 98)}%` }}/>
          </div>
          <span style={rs.percentLabel}>{percent}%</span>
          <button style={{ ...rs.ttsBtn, ...(ttsPlaying ? rs.ttsBtnActive : {}) }} onClick={toggleTTS}>
            {ttsPlaying ? '⏸' : '▶'}
          </button>
        </div>
      </footer>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// PDF READER
// ══════════════════════════════════════════════════════════════════════════════
function PdfReader({ book, customer, prefs, initialProgress, onClose, onSwitchToText, hasTextMode, onProgressUpdate }) {
  const [loading,      setLoading]      = useState(true)
  const [loadError,    setLoadError]    = useState(false)
  const [pdfDoc,       setPdfDoc]       = useState(null)
  const [totalPages,   setTotalPages]   = useState(0)
  const [currentPage,  setCurrentPage]  = useState(1)
  const [scale,        setScale]        = useState(1.0)
  const [bookmarks,    setBookmarks]    = useState(initialProgress?.bookmarks || [])
  const [activePanel,  setActivePanel]  = useState(null)
  const [toc,          setToc]          = useState([])
  const [jumpValue,    setJumpValue]    = useState('')
  const [mountedPages, setMountedPages] = useState(new Set([1,2,3]))
  const [ttsText,      setTtsText]      = useState('')
  const [ttsPlaying,   setTtsPlaying]   = useState(false)

  const containerRef      = useRef(null)
  const canvasRefs        = useRef({})
  const pageHeights       = useRef({})
  const observerRef       = useRef(null)
  const saveTimerRef      = useRef(null)
  const pdfDocRef         = useRef(null)
  const scaleRef          = useRef(1.0)
  const bookmarksRef      = useRef(initialProgress?.bookmarks || [])
  const startPageRef      = useRef(initialProgress?.current_page || 1)
  const renderingRef      = useRef(new Set())
  const renderPromises    = useRef({})
  const jumpInputRef      = useRef(null)

  useEffect(() => { loadPDF(); return () => { if (observerRef.current) observerRef.current.disconnect(); if (saveTimerRef.current) clearTimeout(saveTimerRef.current); if (pdfDocRef.current) { try { pdfDocRef.current.destroy() } catch {} } } }, [book.id])

  async function loadPDF() {
    try {
      setLoading(true); setLoadError(false)
      const fileUrl = await getBookFileUrl(book.file_path)
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
      const doc = await pdfjsLib.getDocument({ url: fileUrl }).promise
      pdfDocRef.current = doc; setPdfDoc(doc); setTotalPages(doc.numPages)
      try { const outline = await doc.getOutline(); if (outline?.length) setToc(flattenOutline(outline)) } catch {}
      try { const fp = await doc.getPage(1); const vp = fp.getViewport({ scale: 1 }); const con = containerRef.current; if (con) { const f = (con.clientWidth - 48) / vp.width; scaleRef.current = f; setScale(f) } } catch {}
      setLoading(false)
    } catch { setLoadError(true); setLoading(false) }
  }

  function flattenOutline(items, depth = 0) {
    const r = []
    for (const item of items) { r.push({ title: item.title, dest: item.dest, depth }); if (item.items?.length) r.push(...flattenOutline(item.items, depth + 1)) }
    return r
  }

  function updateMountedPages(page, total) {
    const w = 5, start = Math.max(1, page-w), end = Math.min(total, page+w)
    const s = new Set(); for (let i = start; i <= end; i++) s.add(i); setMountedPages(s)
  }

  useEffect(() => {
    if (!loading && pdfDoc) {
      setTimeout(() => { if (startPageRef.current > 1) scrollToPage(startPageRef.current); updateMountedPages(startPageRef.current || 1, pdfDoc.numPages); updatePageText(startPageRef.current || 1) }, 80)
    }
  }, [loading, pdfDoc])

  const renderPage = useCallback(async (pageNum) => {
    const doc = pdfDocRef.current; if (!doc || renderingRef.current.has(pageNum)) return
    const canvas = canvasRefs.current[pageNum]; if (!canvas) return
    renderingRef.current.add(pageNum)
    try {
      const page = await doc.getPage(pageNum); const dpr = window.devicePixelRatio || 1
      const vp   = page.getViewport({ scale: scaleRef.current * dpr })
      canvas.width = vp.width; canvas.height = vp.height
      canvas.style.width = `${vp.width/dpr}px`; canvas.style.height = `${vp.height/dpr}px`
      pageHeights.current[pageNum] = vp.height / dpr
      const rt = page.render({ canvasContext: canvas.getContext('2d'), viewport: vp })
      renderPromises.current[pageNum] = rt; await rt.promise
    } catch (err) { if (err?.name !== 'RenderingCancelledException') console.warn(err?.message) }
    renderingRef.current.delete(pageNum); delete renderPromises.current[pageNum]
  }, [])

  useEffect(() => {
    if (!pdfDoc || !containerRef.current) return
    if (observerRef.current) observerRef.current.disconnect()
    observerRef.current = new IntersectionObserver((entries) => {
      let maxR = 0, mostV = currentPage
      entries.forEach(e => {
        const n = parseInt(e.target.dataset.page)
        if (e.intersectionRatio > maxR) { maxR = e.intersectionRatio; mostV = n }
        if (e.isIntersecting) { renderPage(n); if (n > 1) renderPage(n-1); if (n < totalPages) renderPage(n+1) }
      })
      if (mostV !== currentPage) {
        setCurrentPage(mostV); updateMountedPages(mostV, totalPages); updatePageText(mostV)
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
        saveTimerRef.current = setTimeout(() => {
          const p = { current_page: mostV, percent: Math.round((mostV/totalPages)*100), bookmarks: bookmarksRef.current, updated_at: new Date().toISOString() }
          saveProgress(customer.id, book.id, p); onProgressUpdate(p)
        }, 1000)
      }
    }, { root: containerRef.current, threshold: [0.1, 0.3, 0.5, 0.7, 0.9] })
    containerRef.current.querySelectorAll('[data-page]').forEach(el => observerRef.current.observe(el))
    return () => observerRef.current?.disconnect()
  }, [pdfDoc, totalPages, renderPage])

  async function updatePageText(n) {
    const doc = pdfDocRef.current; if (!doc) return
    try { const p = await doc.getPage(n); const tc = await p.getTextContent(); setTtsText(tc.items.map(i => i.str).join(' ')) } catch {}
  }

  useEffect(() => {
    if (!pdfDoc) return
    scaleRef.current = scale
    Object.values(renderPromises.current).forEach(t => { try { t.cancel() } catch {} })
    renderPromises.current = {}; renderingRef.current = new Set()
    renderPage(currentPage); if (currentPage > 1) renderPage(currentPage-1); if (currentPage < totalPages) renderPage(currentPage+1)
  }, [scale, pdfDoc])

  useEffect(() => { if (pdfDoc) fitToWidth() }, [pdfDoc])

  async function fitToWidth() {
    if (!pdfDocRef.current) return
    try { const p = await pdfDocRef.current.getPage(1); const c = containerRef.current; if (!c) return; const f = (c.clientWidth - 48) / p.getViewport({ scale: 1 }).width; scaleRef.current = f; setScale(f) } catch {}
  }

  function scrollToPage(n) { const el = containerRef.current?.querySelector(`[data-page="${n}"]`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }) }

  function toggleBookmark() {
    const isM    = bookmarksRef.current.includes(currentPage)
    const updated = isM ? bookmarksRef.current.filter(p => p !== currentPage) : [...bookmarksRef.current, currentPage].sort((a,b) => a-b)
    bookmarksRef.current = updated; setBookmarks([...updated])
    saveProgress(customer.id, book.id, { bookmarks: updated })
  }

  function toggleTTS() {
    if (ttsPlaying) { window.speechSynthesis?.cancel(); setTtsPlaying(false); return }
    if (!ttsText) return
    const utt = new SpeechSynthesisUtterance(ttsText)
    const voices = window.speechSynthesis?.getVoices() || []
    const pref = voices.find(v => v.name.includes('Google') || v.name.includes('Natural')) || voices[0]
    if (pref) utt.voice = pref
    utt.onend = () => setTtsPlaying(false)
    window.speechSynthesis?.speak(utt); setTtsPlaying(true)
  }

  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'INPUT') return
      if (e.key === ' ' || e.key === 'k')                 { e.preventDefault(); toggleTTS() }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp')   { e.preventDefault(); if (currentPage > 1) scrollToPage(currentPage-1) }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); if (currentPage < totalPages) scrollToPage(currentPage+1) }
      if (e.key === 'f' || e.key === 'F')                  { e.preventDefault(); fitToWidth() }
      if (e.key === 'b' || e.key === 'B')                  { e.preventDefault(); toggleBookmark() }
      if (e.key === 'Escape' && activePanel)               { e.preventDefault(); setActivePanel(null) }
    }
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey)
  }, [currentPage, totalPages, activePanel, ttsPlaying, ttsText])

  const isBookmarked = bookmarks.includes(currentPage)
  const percent      = totalPages ? Math.round((currentPage/totalPages)*100) : 0
  const estH         = n => pageHeights.current[n] || (Object.values(pageHeights.current).reduce((a,b)=>a+b,0) / Math.max(1, Object.values(pageHeights.current).length)) || 900

  if (loadError) return (
    <div style={{ ...rs.root, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16 }}>
      <p style={{ color:'var(--text-muted)', fontSize:14 }}>Could not open this book.</p>
      <button style={rs.switchBtn} onClick={onClose}>Back to library</button>
    </div>
  )

  return (
    <div style={rs.root}>
      <header style={rs.topBar}>
        <button style={rs.iconBtn} onClick={onClose}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M11 4L6 9l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <div style={rs.bookInfo}>
          <span style={rs.bookTitle}>{book.title}</span>
          <span style={rs.pageBadge}>{currentPage} / {totalPages}</span>
          <span style={rs.pdfBadge}>PDF</span>
        </div>
        <div style={rs.topActions}>
          <button style={rs.iconBtn} onClick={() => setScale(s => Math.max(0.5, +(s-0.1).toFixed(1)))}>-</button>
          <span style={rs.zoomLabel}>{Math.round(scale*100)}%</span>
          <button style={rs.iconBtn} onClick={() => setScale(s => Math.min(3, +(s+0.1).toFixed(1)))}>+</button>
          <button style={rs.iconBtn} onClick={fitToWidth} title="Fit (F)">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 5V2h3M11 2h3v3M14 11v3h-3M5 14H2v-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <div style={rs.divider}/>
          <div style={rs.modeToggle}>
            {hasTextMode && <button style={rs.modeBtn} onClick={onSwitchToText}>Text</button>}
            <button style={{ ...rs.modeBtn, ...rs.modeBtnActive }}>PDF</button>
          </div>
          <div style={rs.divider}/>
          <button style={{ ...rs.iconBtn, color: isBookmarked ? 'var(--accent)' : 'var(--text-muted)' }} onClick={toggleBookmark}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill={isBookmarked ? 'var(--accent)' : 'none'}><path d="M3 2h10v12l-5-3-5 3V2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>
          </button>
          {toc.length > 0 && (
            <button style={{ ...rs.iconBtn, color: activePanel === 'toc' ? 'var(--accent)' : 'var(--text-muted)' }} onClick={() => setActivePanel(v => v === 'toc' ? null : 'toc')}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M2 3h3M2 8h3M2 13h3M7 3h7M7 8h7M7 13h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
            </button>
          )}
        </div>
      </header>

      {activePanel === 'toc' && (
        <div style={rs.panel} className="animate-in">
          <p style={rs.panelTitle}>Table of Contents</p>
          {toc.map((item, i) => (
            <button key={i} style={{ ...rs.panelItem, paddingLeft: 10 + item.depth * 12, fontSize: item.depth === 0 ? 13 : 12 }} onClick={async () => {
              try { const doc = pdfDocRef.current; if (!doc) return; let res = typeof item.dest === 'string' ? await doc.getDestination(item.dest) : item.dest; if (!res) return; const pn = (await doc.getPageIndex(res[0])) + 1; scrollToPage(pn); setActivePanel(null) } catch {}
            }}>
              {item.depth > 0 && <span style={{ color:'var(--text-muted)', marginRight:4 }}>›</span>}{item.title}
            </button>
          ))}
        </div>
      )}

      <div ref={containerRef} style={rs.scrollArea}>
        {loading ? (
          <div style={rs.loading}><div style={rs.loadingDot}/><p style={rs.loadingText}>Opening {book.title}…</p></div>
        ) : (
          <div style={rs.pagesWrap}>
            {Array.from({ length: totalPages }, (_, i) => i+1).map(pageNum => (
              <div key={pageNum} data-page={pageNum} style={rs.pageWrap}>
                <div style={rs.pageNumLabel}>{pageNum}</div>
                {mountedPages.has(pageNum)
                  ? <canvas ref={el => { if (el) canvasRefs.current[pageNum] = el }} style={rs.canvas}/>
                  : <div style={{ ...rs.placeholder, height: estH(pageNum) }}><div style={rs.placeholderSpinner}/></div>
                }
              </div>
            ))}
          </div>
        )}
      </div>

      <footer style={rs.footer}>
        <div style={rs.progressRow}>
          <button style={rs.navBtn} onClick={() => scrollToPage(Math.max(1, currentPage-1))} disabled={currentPage <= 1}>‹</button>
          <div style={rs.progressTrack} onClick={e => { const r = e.currentTarget.getBoundingClientRect(); scrollToPage(Math.max(1, Math.min(totalPages, Math.round(((e.clientX-r.left)/r.width)*totalPages)))) }}>
            <div style={{ ...rs.progressFill, width: `${percent}%` }}/>
            <div style={{ ...rs.progressThumb, left: `${Math.min(percent, 98)}%` }}/>
          </div>
          <button style={rs.navBtn} onClick={() => scrollToPage(Math.min(totalPages, currentPage+1))} disabled={currentPage >= totalPages}>›</button>
          <span style={rs.percentLabel}>{percent}%</span>
          <div style={rs.jumpWrap}>
            <input ref={jumpInputRef} style={rs.jumpInput} type="number" min={1} max={totalPages} placeholder={String(currentPage)} value={jumpValue}
              onChange={e => setJumpValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { const v = parseInt(jumpValue); if (v >= 1 && v <= totalPages) { scrollToPage(v); setJumpValue(''); e.target.blur() } } if (e.key === 'Escape') { setJumpValue(''); e.target.blur() } }}
              onBlur={() => setJumpValue('')}
            />
          </div>
          <button style={{ ...rs.ttsBtn, ...(ttsPlaying ? rs.ttsBtnActive : {}) }} onClick={toggleTTS}>
            {ttsPlaying ? '⏸' : '▶'}
          </button>
        </div>
      </footer>
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function ReaderScreen({ bookData, customer, prefs, progress, onClose, onProgressUpdate }) {
  const hasTextMode  = !!bookData.text_path
  const defaultMode  = hasTextMode ? (bookData.preferred_mode || 'text') : 'pdf'
  const [mode, setMode] = useState(defaultMode)

  if (mode === 'text' && hasTextMode) {
    return <TextReader book={bookData} customer={customer} prefs={prefs} initialProgress={progress} onClose={onClose} onSwitchToPdf={() => setMode('pdf')} onProgressUpdate={onProgressUpdate}/>
  }
  return <PdfReader book={bookData} customer={customer} prefs={prefs} initialProgress={progress} onClose={onClose} hasTextMode={hasTextMode} onSwitchToText={() => setMode('text')} onProgressUpdate={onProgressUpdate}/>
}

const rs = {
  root       : { height:'100vh', display:'flex', flexDirection:'column', background:'var(--reader-bg)', overflow:'hidden', position:'relative' },
  topBar     : { display:'flex', alignItems:'center', gap:8, padding:'10px 14px', borderBottom:'1px solid var(--border)', flexShrink:0, background:'var(--bg-surface)', zIndex:10 },
  bookInfo   : { flex:1, display:'flex', alignItems:'center', gap:7, minWidth:0 },
  bookTitle  : { fontFamily:'var(--font-display)', fontSize:14, color:'var(--text-primary)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' },
  pageBadge  : { fontSize:11, color:'var(--text-muted)', background:'var(--bg-elevated)', padding:'2px 7px', borderRadius:99, flexShrink:0 },
  textBadge  : { fontSize:10, fontWeight:600, color:'#7ab87a', background:'rgba(122,184,122,0.12)', border:'1px solid rgba(122,184,122,0.25)', padding:'2px 6px', borderRadius:4, flexShrink:0 },
  pdfBadge   : { fontSize:10, fontWeight:600, color:'var(--accent)', background:'var(--accent-dim)', border:'1px solid rgba(201,169,110,0.25)', padding:'2px 6px', borderRadius:4, flexShrink:0 },
  topActions : { display:'flex', alignItems:'center', gap:2, flexShrink:0 },
  divider    : { width:1, height:16, background:'var(--border)', margin:'0 4px' },
  iconBtn    : { width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', background:'transparent', border:'none', borderRadius:6, color:'var(--text-secondary)', cursor:'pointer', fontSize:12, flexShrink:0 },
  zoomLabel  : { fontSize:11, color:'var(--text-muted)', minWidth:32, textAlign:'center' },
  modeToggle : { display:'flex', background:'var(--bg-elevated)', borderRadius:6, border:'1px solid var(--border)', overflow:'hidden' },
  modeBtn    : { padding:'4px 9px', background:'transparent', border:'none', color:'var(--text-muted)', fontSize:11, fontWeight:500, cursor:'pointer', transition:'all var(--transition)' },
  modeBtnActive: { background:'var(--accent)', color:'#0d0d0d' },
  switchBtn  : { padding:'10px 24px', background:'var(--accent)', color:'#0d0d0d', border:'none', borderRadius:'var(--radius-md)', fontSize:14, fontWeight:500, cursor:'pointer' },
  panel      : { position:'absolute', top:50, right:12, width:250, background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:12, padding:'10px 6px', zIndex:200, boxShadow:'0 8px 32px rgba(0,0,0,0.5)', maxHeight:320, overflowY:'auto' },
  panelTitle : { fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em', padding:'0 8px', marginBottom:6 },
  panelItem  : { display:'flex', alignItems:'center', gap:6, width:'100%', padding:'7px 10px', borderRadius:6, border:'none', background:'transparent', color:'var(--text-secondary)', fontSize:13, cursor:'pointer', textAlign:'left', lineHeight:1.4 },
  textArea   : { flex:1, overflowY:'auto', overflowX:'hidden' },
  scrollArea : { flex:1, overflowY:'scroll', overflowX:'hidden', display:'flex', justifyContent:'center', background:'var(--reader-bg)' },
  pagesWrap  : { display:'flex', flexDirection:'column', alignItems:'center', padding:'20px 20px 48px', gap:20, width:'100%' },
  pageWrap   : { position:'relative', display:'flex', flexDirection:'column', alignItems:'center', width:'100%' },
  pageNumLabel: { fontSize:11, color:'var(--text-muted)', marginBottom:5 },
  canvas     : { display:'block', borderRadius:4, boxShadow:'0 2px 24px rgba(0,0,0,0.4)', maxWidth:'100%' },
  placeholder: { display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg-elevated)', borderRadius:4, maxWidth:'100%', width:'100%' },
  placeholderSpinner: { width:18, height:18, border:'2px solid var(--border)', borderTop:'2px solid var(--accent)', borderRadius:'50%', animation:'spin 1s linear infinite' },
  loading    : { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14, height:'100%' },
  loadingDot : { width:10, height:10, borderRadius:'50%', background:'var(--accent)', animation:'pulse 1.2s ease infinite' },
  loadingText: { fontSize:14, color:'var(--text-muted)' },
  footer     : { padding:'10px 16px 14px', borderTop:'1px solid var(--border)', background:'var(--bg-surface)', flexShrink:0, zIndex:10 },
  progressRow: { display:'flex', alignItems:'center', gap:8 },
  navBtn     : { width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:6, color:'var(--text-secondary)', cursor:'pointer', fontSize:16, flexShrink:0 },
  progressTrack: { flex:1, height:4, background:'var(--border)', borderRadius:99, cursor:'pointer', position:'relative' },
  progressFill : { height:'100%', background:'var(--accent)', borderRadius:99 },
  progressThumb: { position:'absolute', top:'50%', transform:'translate(-50%,-50%)', width:12, height:12, borderRadius:'50%', background:'var(--accent)', border:'2px solid var(--reader-bg)', pointerEvents:'none' },
  percentLabel : { fontSize:12, color:'var(--accent)', flexShrink:0, width:32, textAlign:'right' },
  jumpWrap   : { display:'flex', alignItems:'center', gap:4, flexShrink:0 },
  jumpInput  : { width:48, padding:'3px 6px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:6, color:'var(--text-primary)', fontSize:12, outline:'none', textAlign:'center' },
  ttsBtn     : { width:32, height:28, display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:6, color:'var(--text-secondary)', cursor:'pointer', fontSize:13, flexShrink:0, transition:'all var(--transition)' },
  ttsBtnActive: { background:'var(--accent)', color:'#0d0d0d', borderColor:'var(--accent)' },
}
