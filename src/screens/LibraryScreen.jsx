import { useState, useEffect, useMemo, useRef } from 'react'
import { getCoverUrl, getPersonalBooks, uploadPersonalBook, deletePersonalBook } from '../lib/supabase.js'

// ── Responsive hook ───────────────────────────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}

// ── Book Card ─────────────────────────────────────────────────────────────────
function BookCard({ book, progress, onClick, isPersonal = false, onDelete, animDelay = 0 }) {
  const [coverUrl, setCoverUrl] = useState(null)
  const percent                 = progress?.percent || 0
  const isTextMode              = book.preferred_mode === 'text' || (!book.preferred_mode && book.text_path)

  const colors = [
    ['#1a1f3a','#c9a96e'],['#1e2d1e','#7ab87a'],['#2d1e1e','#b87a7a'],
    ['#1e1e2d','#8a7ab8'],['#2d2a1a','#c4b06a'],['#1a2d2d','#6ab8b8'],
  ]
  const code         = typeof book.id === 'string' ? (book.id.charCodeAt(0)||0) : parseInt(book.id)||0
  const [bg, accent] = colors[code % colors.length]

  useEffect(() => {
    const cp = book.cover_path
    if (cp) {
      const url = getCoverUrl(cp)
      if (url) setCoverUrl(url)
    }
  }, [book.cover_path])

  return (
    <div style={{ position:'relative', animationDelay:`${animDelay}ms` }} className="animate-in">
      <button style={cc.card} onClick={onClick}>
        <div style={{ ...cc.cover, background: coverUrl ? 'transparent' : bg }}>
          {coverUrl
            ? <img src={coverUrl} alt={book.title} style={cc.coverImg} onError={() => setCoverUrl(null)}/>
            : <div style={cc.placeholder}>
                <span style={{ ...cc.placeholderTitle, color: accent }}>{book.title?.slice(0,22)}</span>
                <span style={cc.placeholderAuthor}>{book.author?.slice(0,20)}</span>
              </div>
          }
          {percent > 0 && (
            <div style={cc.progressBar}><div style={{ ...cc.progressFill, width:`${percent}%` }}/></div>
          )}
          {percent === 100 && <div style={cc.completedBadge}>✓</div>}
          <div style={isTextMode ? cc.textBadge : cc.pdfBadge}>{isTextMode ? 'TEXT' : 'PDF'}</div>
          {isPersonal && <div style={cc.personalBadge}>MY BOOK</div>}
        </div>
        <div style={cc.meta}>
          <h3 style={cc.title}>{book.title}</h3>
          <p style={cc.author}>{book.author}</p>
          {percent > 0 && percent < 100 && <p style={cc.pct}>{percent}% read</p>}
          {percent === 100 && <p style={{ ...cc.pct, color:'#3a9a6a' }}>Finished ✓</p>}
        </div>
      </button>
      {isPersonal && onDelete && (
        <button style={cc.deleteBtn} onClick={e => { e.stopPropagation(); onDelete(book) }} title="Remove book">
          ✕
        </button>
      )}
    </div>
  )
}

// ── Wide card for continue reading ────────────────────────────────────────────
function WideCard({ book, progress, onClick, animDelay = 0 }) {
  const [coverUrl, setCoverUrl] = useState(null)
  const percent                 = progress?.percent || 0
  const isTextMode              = book.preferred_mode === 'text' || (!book.preferred_mode && book.text_path)

  const colors = [
    ['#1a1f3a','#c9a96e'],['#1e2d1e','#7ab87a'],['#2d1e1e','#b87a7a'],
    ['#1e1e2d','#8a7ab8'],['#2d2a1a','#c4b06a'],['#1a2d2d','#6ab8b8'],
  ]
  const code         = typeof book.id === 'string' ? (book.id.charCodeAt(0)||0) : parseInt(book.id)||0
  const [bg, accent] = colors[code % colors.length]

  useEffect(() => {
    if (book.cover_path) { const url = getCoverUrl(book.cover_path); if (url) setCoverUrl(url) }
  }, [book.cover_path])

  return (
    <button style={{ ...wc.card, animationDelay:`${animDelay}ms` }} className="animate-in" onClick={onClick}>
      <div style={{ ...wc.cover, background: coverUrl ? 'transparent' : bg }}>
        {coverUrl
          ? <img src={coverUrl} alt={book.title} style={wc.coverImg} onError={() => setCoverUrl(null)}/>
          : <div style={wc.placeholder}><span style={{ ...wc.placeholderTitle, color: accent }}>{book.title?.slice(0,18)}</span></div>
        }
      </div>
      <div style={wc.info}>
        <div style={wc.meta}>
          <span style={wc.category}>{book.category}</span>
          <span style={isTextMode ? wc.textBadge : wc.pdfBadge}>{isTextMode ? 'TEXT' : 'PDF'}</span>
        </div>
        <h3 style={wc.title}>{book.title}</h3>
        <p style={wc.author}>{book.author}</p>
        {progress?.current_page > 1 && book.pages > 0 && (
          <p style={wc.pageLabel}>Page {progress.current_page} of {book.pages}</p>
        )}
        <div style={wc.progressWrap}>
          <div style={wc.progressTrack}><div style={{ ...wc.progressFill, width:`${percent}%` }}/></div>
          <span style={wc.progressLabel}>{percent}%</span>
        </div>
      </div>
    </button>
  )
}

// ── Upload Disclaimer Modal ───────────────────────────────────────────────────
function DisclaimerModal({ onAccept, onCancel }) {
  const [checked, setChecked] = useState(false)
  return (
    <div style={modal.backdrop} onClick={e => e.target === e.currentTarget && onCancel()}>
      <div style={modal.box} className="animate-up">
        <div style={modal.icon}>📚</div>
        <h2 style={modal.title}>Before you upload</h2>
        <p style={modal.body}>
          Your personal books are completely private — only you can see and read them. They are never shared with other users or added to the main library.
        </p>
        <p style={{ ...modal.body, marginTop: 12 }}>
          By uploading, you confirm that the book is for your personal reading use. We trust you to upload responsibly. 😊
        </p>
        <label style={modal.checkRow}>
          <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} style={{ accentColor: 'var(--accent)', width: 16, height: 16 }}/>
          <span style={modal.checkLabel}>I understand and agree</span>
        </label>
        <div style={modal.actions}>
          <button style={modal.cancelBtn} onClick={onCancel}>Cancel</button>
          <button style={{ ...modal.acceptBtn, ...(!checked ? modal.acceptBtnDisabled : {}) }} onClick={() => checked && onAccept()} disabled={!checked}>
            Continue to Upload
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Upload Book Modal ─────────────────────────────────────────────────────────
function UploadBookModal({ customer, onClose, onSuccess }) {
  const [file,     setFile]     = useState(null)
  const [cover,    setCover]    = useState(null)
  const [title,    setTitle]    = useState('')
  const [author,   setAuthor]   = useState('')
  const [status,   setStatus]   = useState('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const fileRef  = useRef(null)
  const coverRef = useRef(null)

  function handleFileChange(e) {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    if (!title) setTitle(f.name.replace(/\.pdf$/i,'').replace(/[-_]/g,' ').replace(/\b\w/g,c=>c.toUpperCase()))
  }

  async function handleUpload() {
    if (!file || !title.trim()) return
    setStatus('uploading'); setErrorMsg('')
    const result = await uploadPersonalBook(customer.id, file, cover, title, author)
    if (result.success) { setStatus('success'); setTimeout(() => onSuccess(result.book), 800) }
    else { setErrorMsg(result.error || 'Upload failed. Please try again.'); setStatus('error') }
  }

  return (
    <div style={modal.backdrop} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ ...modal.box, maxWidth: 400 }} className="animate-up">
        <h2 style={modal.title}>Upload Your Book</h2>
        <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:20, lineHeight:1.6 }}>
          Add a PDF to your private library. Only you can see your personal books.
        </p>

        {/* File picker */}
        <div style={upS.field}>
          <label style={upS.label}>PDF File *</label>
          {file ? (
            <div style={upS.fileChosen}>
              <span style={upS.pdfTag}>PDF</span>
              <span style={upS.fileName}>{file.name}</span>
              <button style={upS.changeBtn} onClick={() => fileRef.current?.click()}>Change</button>
            </div>
          ) : (
            <button style={upS.pickBtn} onClick={() => fileRef.current?.click()}>
              <span style={{ fontSize:24 }}>📄</span>
              <span>Tap to select PDF</span>
            </button>
          )}
          <input ref={fileRef} type="file" accept=".pdf" style={{ display:'none' }} onChange={handleFileChange}/>
        </div>

        {/* Cover picker */}
        <div style={upS.field}>
          <label style={upS.label}>Cover Image <span style={{ color:'var(--text-muted)', fontSize:11 }}>(optional)</span></label>
          {cover ? (
            <div style={upS.fileChosen}>
              <span style={{ fontSize:14 }}>🖼️</span>
              <span style={upS.fileName}>{cover.name}</span>
              <button style={upS.changeBtn} onClick={() => { setCover(null); coverRef.current.value = '' }}>Remove</button>
            </div>
          ) : (
            <button style={{ ...upS.pickBtn, minHeight:56 }} onClick={() => coverRef.current?.click()}>
              <span style={{ fontSize:18 }}>🖼️</span>
              <span>Tap to add cover</span>
            </button>
          )}
          <input ref={coverRef} type="file" accept="image/*" style={{ display:'none' }} onChange={e => setCover(e.target.files[0] || null)}/>
        </div>

        <div style={upS.field}>
          <label style={upS.label}>Book Title *</label>
          <input style={upS.input} placeholder="e.g. Atomic Habits" value={title} onChange={e => setTitle(e.target.value)} autoFocus/>
        </div>

        <div style={upS.field}>
          <label style={upS.label}>Author</label>
          <input style={upS.input} placeholder="e.g. James Clear" value={author} onChange={e => setAuthor(e.target.value)}/>
        </div>

        {status === 'uploading' && (
          <div style={upS.uploading}>
            <span style={upS.spinner}/>
            <span style={{ fontSize:13, color:'var(--text-muted)' }}>Uploading your book…</span>
          </div>
        )}

        {errorMsg && <p style={upS.error}>{errorMsg}</p>}

        <div style={modal.actions}>
          <button style={modal.cancelBtn} onClick={onClose} disabled={status === 'uploading'}>Cancel</button>
          <button
            style={{ ...modal.acceptBtn, ...(!file || !title.trim() || status === 'uploading' ? modal.acceptBtnDisabled : {}), ...(status === 'success' ? { background:'#3a9a6a' } : {}) }}
            onClick={handleUpload}
            disabled={!file || !title.trim() || status === 'uploading' || status === 'success'}
          >
            {status === 'uploading' ? 'Uploading…' : status === 'success' ? 'Added ✓' : 'Add to My Library'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Settings Modal ────────────────────────────────────────────────────────────
function SettingsModal({ prefs, onSave, onClose }) {
  const [theme,    setTheme]    = useState(prefs.theme    || 'dark')
  const [fontSize, setFontSize] = useState(prefs.fontSize || 18)
  const [ttsSpeed, setTtsSpeed] = useState(prefs.ttsSpeed || 1.0)
  const [ttsVoice, setTtsVoice] = useState(prefs.ttsVoice || '')
  const [voices,   setVoices]   = useState([])

  useEffect(() => {
    function loadVoices() {
      const v = window.speechSynthesis?.getVoices() || []
      const english = v.filter(voice =>
        voice.lang.startsWith('en') ||
        voice.name.toLowerCase().includes('english') ||
        voice.name.toLowerCase().includes('google') ||
        voice.name.toLowerCase().includes('microsoft')
      )
      setVoices(english.length > 0 ? english : v.slice(0, 10))
    }
    loadVoices()
    window.speechSynthesis?.addEventListener('voiceschanged', loadVoices)
    return () => window.speechSynthesis?.removeEventListener('voiceschanged', loadVoices)
  }, [])

  function testVoice() {
    window.speechSynthesis?.cancel()
    const utt  = new SpeechSynthesisUtterance('Hello! This is how I sound when reading your books.')
    utt.rate   = ttsSpeed
    if (ttsVoice) {
      const found = voices.find(v => v.name === ttsVoice)
      if (found) utt.voice = found
    }
    window.speechSynthesis?.speak(utt)
  }

  return (
    <div style={modal.backdrop} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ ...modal.box, maxWidth: 420 }} className="animate-up">
        <h2 style={modal.title}>Settings</h2>

        <div style={settS.field}>
          <label style={settS.label}>Reading Theme</label>
          <div style={settS.row}>
            {['dark','sepia','light'].map(t => (
              <button key={t} style={{ ...settS.themeBtn, ...(theme === t ? settS.themeBtnActive : {}) }} onClick={() => setTheme(t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div style={settS.field}>
          <label style={settS.label}>Font Size — {fontSize}px</label>
          <input type="range" min={14} max={28} value={fontSize} onChange={e => setFontSize(+e.target.value)} style={{ width:'100%', accentColor:'var(--accent)', height:4 }}/>
          <p style={settS.preview}>Preview: <span style={{ fontFamily:'Georgia,serif', fontSize: fontSize * 0.75 }}>The quick brown fox jumps over the lazy dog</span></p>
        </div>

        <div style={settS.field}>
          <label style={settS.label}>Reading Speed (TTS)</label>
          <input type="range" min={0.5} max={2} step={0.1} value={ttsSpeed} onChange={e => setTtsSpeed(+e.target.value)} style={{ width:'100%', accentColor:'var(--accent)', height:4 }}/>
          <p style={settS.hint}>{ttsSpeed}x speed</p>
        </div>

        {voices.length > 0 && (
          <div style={settS.field}>
            <label style={settS.label}>TTS Voice</label>
            <select style={settS.select} value={ttsVoice} onChange={e => setTtsVoice(e.target.value)}>
              <option value="">Default voice</option>
              {voices.map(v => <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>)}
            </select>
            <button style={settS.testBtn} onClick={testVoice}>▶ Test voice</button>
          </div>
        )}

        <div style={modal.actions}>
          <button style={modal.cancelBtn} onClick={onClose}>Cancel</button>
          <button style={modal.acceptBtn} onClick={() => onSave({ theme, fontSize, ttsSpeed, ttsVoice })}>Save Settings</button>
        </div>
      </div>
    </div>
  )
}

// ── Delete confirm ────────────────────────────────────────────────────────────
function DeleteConfirmModal({ book, onConfirm, onCancel }) {
  const [loading, setLoading] = useState(false)
  return (
    <div style={modal.backdrop} onClick={e => e.target === e.currentTarget && onCancel()}>
      <div style={{ ...modal.box, maxWidth:340 }} className="animate-up">
        <div style={modal.icon}>🗑️</div>
        <h2 style={modal.title}>Remove this book?</h2>
        <p style={{ ...modal.body, marginBottom:20 }}>
          <strong style={{ color:'var(--text-primary)' }}>{book?.title}</strong> will be removed from your personal library. This cannot be undone.
        </p>
        <div style={modal.actions}>
          <button style={modal.cancelBtn} onClick={onCancel}>Keep it</button>
          <button style={{ ...modal.acceptBtn, background:'#e05c5c' }} onClick={async () => { setLoading(true); await onConfirm() }} disabled={loading}>
            {loading ? 'Removing…' : 'Remove'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Newly Added Card ──────────────────────────────────────────────────────────
function NewlyAddedCard({ book, timeAgo, onClick, animDelay = 0 }) {
  const [coverUrl, setCoverUrl] = useState(null)
  const isTextMode = book.preferred_mode === 'text' || (!book.preferred_mode && book.text_path)
  const colors = [
    ['#1a1f3a','#c9a96e'],['#1e2d1e','#7ab87a'],['#2d1e1e','#b87a7a'],
    ['#1e1e2d','#8a7ab8'],['#2d2a1a','#c4b06a'],['#1a2d2d','#6ab8b8'],
  ]
  const code = typeof book.id === 'string' ? (book.id.charCodeAt(0)||0) : parseInt(book.id)||0
  const [bg, accent] = colors[code % colors.length]

  useEffect(() => {
    if (book.cover_path) { const url = getCoverUrl(book.cover_path); if (url) setCoverUrl(url) }
  }, [book.cover_path])

  return (
    <button style={{ ...na.card, animationDelay:`${animDelay}ms` }} className="animate-in" onClick={onClick}>
      <div style={{ ...na.cover, background: coverUrl ? 'transparent' : bg }}>
        {coverUrl
          ? <img src={coverUrl} alt={book.title} style={na.coverImg} onError={() => setCoverUrl(null)}/>
          : <div style={na.placeholder}><span style={{ ...na.placeholderTitle, color: accent }}>{book.title?.slice(0,16)}</span></div>
        }
        <div style={isTextMode ? na.textBadge : na.pdfBadge}>{isTextMode ? 'TEXT' : 'PDF'}</div>
      </div>
      <div style={na.info}>
        <div style={na.newBadge}>NEW</div>
        <h3 style={na.title}>{book.title}</h3>
        <p style={na.author}>{book.author}</p>
        <p style={na.time}>Added {timeAgo}</p>
      </div>
    </button>
  )
}

// ── Main Library Screen ───────────────────────────────────────────────────────
export default function LibraryScreen({ customer, books, progress, prefs, onOpenBook, onSignOut, onRefresh, onPrefsChange, onFindBooks, onBooksUpdated }) {
  const isMobile = useIsMobile()

  const [activeTab,      setActiveTab]      = useState('library') // 'library' | 'mybooks' | 'search'
  const [activeCategory, setActiveCategory] = useState('All')
  const [search,         setSearch]         = useState('')
  const [sidebarOpen,    setSidebarOpen]    = useState(false)
  const [showSettings,   setShowSettings]   = useState(false)
  const [showDisclaimer, setShowDisclaimer] = useState(false)
  const [showUpload,     setShowUpload]     = useState(false)
  const [personalBooks,  setPersonalBooks]  = useState([])
  const [deleteTarget,   setDeleteTarget]   = useState(null)
  const [loadingPersonal,setLoadingPersonal]= useState(false)

  const categories = useMemo(() => {
    const cats = [...new Set(books.map(b => b.category).filter(Boolean))].sort()
    return ['All', ...cats]
  }, [books])

  const filtered = useMemo(() => {
    return books.filter(book => {
      const matchCat = activeCategory === 'All' || book.category === activeCategory
      const q        = search.toLowerCase()
      const matchQ   = !q || book.title?.toLowerCase().includes(q) || book.author?.toLowerCase().includes(q) || (book.tags||[]).some(t=>t.toLowerCase().includes(q))
      return matchCat && matchQ
    })
  }, [books, activeCategory, search])

  const recentBooks = useMemo(() => {
    return books
      .filter(b => { const p = progress[b.id]; return p && p.percent > 0 && p.percent < 100 })
      .sort((a,b) => (progress[b.id]?.updated_at||'').localeCompare(progress[a.id]?.updated_at||''))
      .slice(0, 2)
  }, [books, progress])

  const newlyAdded = useMemo(() => {
    return [...books]
      .filter(b => b.created_at)
      .sort((a,b) => (b.created_at||'').localeCompare(a.created_at||''))
      .slice(0, 3)
  }, [books])

  function timeAgo(dateStr) {
    if (!dateStr) return ''
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins  = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days  = Math.floor(diff / 86400000)
    if (mins < 60)  return `${mins}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7)   return `${days}d ago`
    return new Date(dateStr).toLocaleDateString('en-US', { month:'short', day:'numeric' })
  }

  useEffect(() => {
    if (activeTab === 'mybooks' && customer) loadPersonalBooks()
  }, [activeTab, customer])

  async function loadPersonalBooks() {
    setLoadingPersonal(true)
    const pb = await getPersonalBooks(customer.id)
    setPersonalBooks(pb); setLoadingPersonal(false)
  }

  function handleAddMyBook() {
    const accepted = localStorage.getItem('rbs_upload_disclaimer')
    if (accepted) setShowUpload(true)
    else setShowDisclaimer(true)
  }

  function handleDisclaimerAccept() {
    localStorage.setItem('rbs_upload_disclaimer', 'true')
    setShowDisclaimer(false); setShowUpload(true)
  }

  async function handleUploadSuccess(book) {
    setShowUpload(false)
    await loadPersonalBooks()
  }

  async function handleDeletePersonal(book) {
    const ok = await deletePersonalBook(book.id, customer.id)
    if (ok) { setDeleteTarget(null); await loadPersonalBooks() }
  }

  function handleOpenPersonalBook(book) {
    // Personal books use the same reader but with personal storage URL
    const bookForReader = {
      ...book,
      file_path: null,
      _personal_file: book.file_path,
      preferred_mode: 'pdf',
    }
    onOpenBook(bookForReader)
  }

  function getGreeting() {
    const h = new Date().getHours()
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
  }

  // ── Sidebar content (shared between mobile overlay and desktop) ─────────────
  function SidebarContent() {
    return (
      <>
        <div style={s.brand}>
          <svg width="26" height="26" viewBox="0 0 36 36" fill="none">
            <rect width="36" height="36" rx="10" fill="var(--accent)" fillOpacity="0.15"/>
            <path d="M10 27V10h10a7 7 0 0 1 0 14H10" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M10 24h14" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          <div>
            <div style={s.brandName}>Readwise</div>
            <div style={s.brandBy}>by Skai</div>
          </div>
        </div>

        <div style={s.stat}>
          <span style={s.statNum}>{books.length}</span>
          <span style={s.statLabel}>books in your library</span>
        </div>

        <nav style={s.nav}>
          <p style={s.navLabel}>Categories</p>
          {categories.map(cat => (
            <button key={cat} style={{ ...s.navItem, ...(activeCategory === cat && activeTab === 'library' ? s.navItemActive : {}) }}
              onClick={() => { setActiveCategory(cat); setActiveTab('library'); setSidebarOpen(false) }}>
              {cat}
            </button>
          ))}
        </nav>

        <div style={s.sidebarBottom}>
          <button style={s.sidebarBtn} onClick={() => { setActiveTab('mybooks'); setSidebarOpen(false) }}>
            <span>📚</span> My Books
          </button>
          <button style={s.sidebarBtn} onClick={() => { onFindBooks(); setSidebarOpen(false) }}>
            <span>🔍</span> Find Books
          </button>
          <button style={s.sidebarBtn} onClick={() => { setShowSettings(true); setSidebarOpen(false) }}>
            <span>⚙️</span> Settings
          </button>
          <button style={{ ...s.sidebarBtn, color:'#e05c5c' }} onClick={onSignOut}>
            <span>↩️</span> Sign out
          </button>
        </div>
      </>
    )
  }

  return (
    <div style={{ ...s.root, paddingBottom: isMobile ? 64 : 0 }}>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && <div style={s.overlay} onClick={() => setSidebarOpen(false)}/>}
      {sidebarOpen && (
        <div style={s.mobileSidebar} className="animate-in">
          <SidebarContent/>
        </div>
      )}

      {/* Desktop sidebar */}
      {!isMobile && (
        <aside style={s.desktopSidebar}>
          <SidebarContent/>
        </aside>
      )}

      {/* Main content */}
      <main style={s.main}>

        {/* Header */}
        <header style={s.header}>
          <div style={s.headerLeft}>
            <button style={s.menuBtn} onClick={() => setSidebarOpen(v => !v)}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M2 5h16M2 10h16M2 15h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
            </button>
            <div>
              <p style={s.greeting}>{getGreeting()},</p>
              <h1 style={s.name}>{customer?.name?.split(' ')[0] || 'Reader'}</h1>
            </div>
          </div>
          <button style={s.searchBtn} onClick={() => setActiveTab('search')}>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5"/><path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </header>

        {/* Search bar — shows when search tab active */}
        {activeTab === 'search' && (
          <div style={s.searchBar}>
            <input style={s.searchInput} placeholder="Search books, authors…" value={search} onChange={e => setSearch(e.target.value)} autoFocus/>
            <button style={s.searchCancelBtn} onClick={() => { setSearch(''); setActiveTab('library') }}>Cancel</button>
          </div>
        )}

        {/* Content */}
        <div style={s.content}>

          {/* ── LIBRARY TAB ── */}
          {(activeTab === 'library' || activeTab === 'search') && (
            <>
              {/* Continue reading */}
              {recentBooks.length > 0 && !search && activeTab === 'library' && (
                <section style={s.section}>
                  <h2 style={s.sectionTitle}>Continue reading</h2>
                  <div style={s.recentRow}>
                    {recentBooks.map((book, i) => (
                      <WideCard key={book.id} book={book} progress={progress[book.id]} onClick={() => onOpenBook(book)} animDelay={i * 60}/>
                    ))}
                  </div>
                </section>
              )}

              {/* Recently Added */}
              {newlyAdded.length > 0 && !search && activeTab === 'library' && (
                <section style={s.section}>
                  <div style={s.sectionHeader}>
                    <h2 style={s.sectionTitle}>Recently added</h2>
                    <span style={{ fontSize:11, color:'var(--accent)', background:'var(--accent-dim)', padding:'2px 8px', borderRadius:99, border:'1px solid rgba(201,169,110,0.2)' }}>✨ New</span>
                  </div>
                  <div style={s.newlyAddedRow}>
                    {newlyAdded.map((book, i) => (
                      <NewlyAddedCard key={book.id} book={book} timeAgo={timeAgo(book.created_at)} onClick={() => onOpenBook(book)} animDelay={i * 50}/>
                    ))}
                  </div>
                </section>
              )}

              {/* Library grid */}
              <section style={s.section}>
                <div style={s.sectionHeader}>
                  <h2 style={s.sectionTitle}>
                    {search ? `"${search}"` : activeCategory === 'All' ? 'Your library' : activeCategory}
                  </h2>
                  <span style={s.count}>{filtered.length} books</span>
                </div>
                {filtered.length === 0 ? (
                  <p style={s.emptyText}>{books.length === 0 ? 'Library is loading…' : 'No books found.'}</p>
                ) : (
                  <div style={isMobile ? s.grid2 : s.grid4}>
                    {filtered.map((book, i) => (
                      <BookCard key={book.id} book={book} progress={progress[book.id]} onClick={() => onOpenBook(book)} animDelay={i * 30}/>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

          {/* ── MY BOOKS TAB ── */}
          {activeTab === 'mybooks' && (
            <section style={s.section}>
              <div style={s.sectionHeader}>
                <h2 style={s.sectionTitle}>My Books</h2>
                <button style={s.addBtn} onClick={handleAddMyBook}>+ Add PDF</button>
              </div>
              <p style={s.myBooksHint}>
                Upload your own PDF books here. Only you can see them — completely private to your account. 🔒
              </p>
              {loadingPersonal ? (
                <div style={s.loading}><div style={s.loadingDot}/></div>
              ) : personalBooks.length === 0 ? (
                <div style={s.emptyPersonal}>
                  <div style={s.emptyIcon}>📖</div>
                  <p style={s.emptyTitle}>No personal books yet</p>
                  <p style={s.emptySubtitle}>Upload your own PDFs and read them here with all the same features — TTS, bookmarks, text mode.</p>
                  <button style={s.emptyAddBtn} onClick={handleAddMyBook}>Upload my first book</button>
                  <button style={s.findBooksBtn} onClick={onFindBooks}>Where to find books →</button>
                </div>
              ) : (
                <>
                  <div style={isMobile ? s.grid2 : s.grid4}>
                    {personalBooks.map((book, i) => (
                      <BookCard key={book.id} book={book} progress={progress[book.id]} onClick={() => handleOpenPersonalBook(book)} isPersonal={true} onDelete={setDeleteTarget} animDelay={i * 30}/>
                    ))}
                  </div>
                  <button style={s.addMoreBtn} onClick={handleAddMyBook}>+ Upload another book</button>
                </>
              )}
            </section>
          )}
        </div>
      </main>

      {/* Mobile bottom navigation */}
      {isMobile && (
        <nav style={s.bottomNav}>
          <button style={{ ...s.bottomNavBtn, ...(activeTab === 'library' ? s.bottomNavBtnActive : {}) }} onClick={() => setActiveTab('library')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 12L12 3l9 9M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span style={s.bottomNavLabel}>Library</span>
          </button>
          <button style={{ ...s.bottomNavBtn, ...(activeTab === 'mybooks' ? s.bottomNavBtnActive : {}) }} onClick={() => setActiveTab('mybooks')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span style={s.bottomNavLabel}>My Books</span>
          </button>
          <button style={{ ...s.bottomNavBtn }} onClick={onFindBooks}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.6"/><path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
            <span style={s.bottomNavLabel}>Find Books</span>
          </button>
          <button style={{ ...s.bottomNavBtn, ...(activeTab === 'search' ? s.bottomNavBtnActive : {}) }} onClick={() => setActiveTab('search')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
            <span style={s.bottomNavLabel}>Browse</span>
          </button>
        </nav>
      )}

      {/* Modals */}
      {showDisclaimer && <DisclaimerModal onAccept={handleDisclaimerAccept} onCancel={() => setShowDisclaimer(false)}/>}
      {showUpload     && <UploadBookModal customer={customer} onClose={() => setShowUpload(false)} onSuccess={handleUploadSuccess}/>}
      {showSettings   && <SettingsModal prefs={prefs} onSave={p => { onPrefsChange(p); setShowSettings(false) }} onClose={() => setShowSettings(false)}/>}
      {deleteTarget   && <DeleteConfirmModal book={deleteTarget} onConfirm={() => handleDeletePersonal(deleteTarget)} onCancel={() => setDeleteTarget(null)}/>}
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = {
  root         : { display:'flex', height:'100vh', background:'var(--bg-base)', overflow:'hidden', position:'relative' },
  overlay      : { position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:40 },
  mobileSidebar: { position:'fixed', top:0, left:0, height:'100%', width:260, background:'var(--bg-surface)', borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', padding:'24px 14px', zIndex:50, overflowY:'auto' },
  desktopSidebar: { width:220, flexShrink:0, background:'var(--bg-surface)', borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', padding:'24px 14px', overflowY:'auto' },
  brand        : { display:'flex', alignItems:'center', gap:9, marginBottom:20, padding:'0 4px' },
  brandName    : { fontFamily:'var(--font-display)', fontSize:16, color:'var(--text-primary)', letterSpacing:'-0.02em', lineHeight:1.15 },
  brandBy      : { fontSize:9, color:'var(--accent)', letterSpacing:'0.06em', textTransform:'uppercase' },
  stat         : { padding:'10px 12px', background:'var(--accent-dim)', borderRadius:'var(--radius-md)', marginBottom:14 },
  statNum      : { fontFamily:'var(--font-display)', fontSize:22, color:'var(--accent)', display:'block', lineHeight:1, marginBottom:2 },
  statLabel    : { fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' },
  nav          : { flex:1, display:'flex', flexDirection:'column', gap:2, overflowY:'auto' },
  navLabel     : { fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em', padding:'0 8px', marginBottom:4 },
  navItem      : { display:'flex', alignItems:'center', padding:'8px 10px', borderRadius:'var(--radius-md)', border:'none', background:'transparent', color:'var(--text-secondary)', fontSize:13, cursor:'pointer', textAlign:'left', width:'100%', transition:'all var(--transition)' },
  navItemActive: { background:'var(--accent-dim)', color:'var(--accent)' },
  sidebarBottom: { paddingTop:10, borderTop:'1px solid var(--border)', display:'flex', flexDirection:'column', gap:2 },
  sidebarBtn   : { display:'flex', alignItems:'center', gap:8, padding:'8px 10px', borderRadius:'var(--radius-md)', border:'none', background:'transparent', color:'var(--text-muted)', fontSize:13, cursor:'pointer', width:'100%', transition:'all var(--transition)' },
  main         : { flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 },
  header       : { padding:'16px 16px 12px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid var(--border)', flexShrink:0 },
  headerLeft   : { display:'flex', alignItems:'center', gap:10 },
  menuBtn      : { width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center', background:'transparent', border:'none', color:'var(--text-secondary)', cursor:'pointer', borderRadius:'var(--radius-md)', flexShrink:0 },
  greeting     : { fontSize:11, color:'var(--text-muted)', marginBottom:1 },
  name         : { fontFamily:'var(--font-display)', fontSize:20, fontWeight:400, color:'var(--text-primary)', letterSpacing:'-0.02em' },
  searchBtn    : { width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', color:'var(--text-secondary)', cursor:'pointer' },
  searchBar    : { display:'flex', alignItems:'center', gap:8, padding:'10px 14px', borderBottom:'1px solid var(--border)', flexShrink:0 },
  searchInput  : { flex:1, padding:'8px 12px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:99, color:'var(--text-primary)', fontSize:14, outline:'none' },
  searchCancelBtn: { background:'transparent', border:'none', color:'var(--accent)', fontSize:13, cursor:'pointer', flexShrink:0, padding:'4px 0' },
  content      : { flex:1, overflowY:'auto', padding:'16px 14px 24px' },
  section      : { marginBottom:32 },
  sectionHeader: { display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 },
  sectionTitle : { fontFamily:'var(--font-display)', fontSize:17, fontWeight:400, color:'var(--text-primary)', letterSpacing:'-0.01em' },
  count        : { fontSize:12, color:'var(--text-muted)' },
  addBtn       : { padding:'6px 14px', background:'var(--accent)', color:'#0d0d0d', border:'none', borderRadius:99, fontSize:12, fontWeight:600, cursor:'pointer' },
  newlyAddedRow: { display:'flex', flexDirection:'column', gap:10 },
  grid2        : { display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 },
  grid4        : { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(150px,1fr))', gap:16 },
  emptyText    : { fontSize:14, color:'var(--text-muted)', textAlign:'center', padding:'32px 0' },
  myBooksHint  : { fontSize:12, color:'var(--text-muted)', lineHeight:1.6, marginBottom:16, padding:'10px 12px', background:'var(--bg-elevated)', borderRadius:'var(--radius-md)', border:'1px solid var(--border)' },
  loading      : { display:'flex', justifyContent:'center', padding:40 },
  loadingDot   : { width:10, height:10, borderRadius:'50%', background:'var(--accent)', animation:'pulse 1.2s ease infinite' },
  emptyPersonal: { display:'flex', flexDirection:'column', alignItems:'center', padding:'32px 20px', textAlign:'center', gap:10 },
  emptyIcon    : { fontSize:48, marginBottom:8 },
  emptyTitle   : { fontFamily:'var(--font-display)', fontSize:18, color:'var(--text-primary)' },
  emptySubtitle: { fontSize:13, color:'var(--text-muted)', lineHeight:1.7, maxWidth:280 },
  emptyAddBtn  : { padding:'12px 24px', background:'var(--accent)', color:'#0d0d0d', border:'none', borderRadius:'var(--radius-md)', fontSize:14, fontWeight:500, cursor:'pointer', marginTop:8 },
  findBooksBtn : { background:'transparent', border:'none', color:'var(--accent)', fontSize:13, cursor:'pointer', textDecoration:'underline' },
  addMoreBtn   : { marginTop:16, padding:'10px 20px', background:'transparent', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', color:'var(--text-secondary)', fontSize:13, cursor:'pointer', width:'100%' },
  // Bottom nav
  bottomNav    : { position:'fixed', bottom:0, left:0, right:0, height:60, background:'var(--bg-surface)', borderTop:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-around', zIndex:30, paddingBottom:'env(safe-area-inset-bottom)' },
  bottomNavBtn : { display:'flex', flexDirection:'column', alignItems:'center', gap:3, background:'transparent', border:'none', color:'var(--text-muted)', cursor:'pointer', padding:'6px 12px', borderRadius:'var(--radius-md)', flex:1, transition:'all var(--transition)' },
  bottomNavBtnActive: { color:'var(--accent)' },
  bottomNavLabel: { fontSize:10, fontWeight:500, letterSpacing:'0.03em' },
}

// ── Card styles ───────────────────────────────────────────────────────────────
const cc = {
  card        : { display:'flex', flexDirection:'column', background:'transparent', border:'none', cursor:'pointer', textAlign:'left', padding:0, width:'100%' },
  cover       : { width:'100%', aspectRatio:'2/3', borderRadius:'var(--radius-lg)', overflow:'hidden', position:'relative', flexShrink:0 },
  coverImg    : { width:'100%', height:'100%', objectFit:'cover', display:'block' },
  placeholder : { width:'100%', height:'100%', display:'flex', flexDirection:'column', justifyContent:'flex-end', padding:10, gap:4 },
  placeholderTitle: { fontFamily:'var(--font-display)', fontSize:11, lineHeight:1.3, fontWeight:400 },
  placeholderAuthor: { fontSize:9, color:'rgba(255,255,255,0.4)' },
  progressBar : { position:'absolute', bottom:0, left:0, right:0, height:3, background:'rgba(0,0,0,0.3)' },
  progressFill: { height:'100%', background:'var(--accent)' },
  completedBadge: { position:'absolute', top:6, right:6, width:18, height:18, borderRadius:'50%', background:'#3a9a6a', color:'#fff', fontSize:9, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:600 },
  textBadge   : { position:'absolute', top:6, left:6, fontSize:8, fontWeight:700, color:'#7ab87a', background:'rgba(13,13,13,0.85)', padding:'2px 4px', borderRadius:3 },
  pdfBadge    : { position:'absolute', top:6, left:6, fontSize:8, fontWeight:700, color:'var(--accent)', background:'rgba(13,13,13,0.85)', padding:'2px 4px', borderRadius:3 },
  personalBadge: { position:'absolute', bottom:16, left:6, fontSize:7, fontWeight:700, color:'#8a7ab8', background:'rgba(13,13,13,0.85)', padding:'2px 4px', borderRadius:3 },
  meta        : { padding:'7px 2px 0' },
  title       : { fontSize:12, fontWeight:500, color:'var(--text-primary)', lineHeight:1.35, marginBottom:2, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' },
  author      : { fontSize:11, color:'var(--text-muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  pct         : { fontSize:10, color:'var(--accent)', marginTop:3 },
  deleteBtn   : { position:'absolute', top:6, right:6, width:22, height:22, borderRadius:'50%', background:'rgba(224,92,92,0.85)', color:'#fff', border:'none', fontSize:10, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', zIndex:5 },
}

// ── Wide card styles ──────────────────────────────────────────────────────────
const wc = {
  card        : { display:'flex', alignItems:'center', gap:12, padding:12, background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', cursor:'pointer', textAlign:'left', width:'100%' },
  cover       : { width:56, height:76, borderRadius:'var(--radius-md)', overflow:'hidden', flexShrink:0 },
  coverImg    : { width:'100%', height:'100%', objectFit:'cover' },
  placeholder : { width:'100%', height:'100%', display:'flex', flexDirection:'column', justifyContent:'flex-end', padding:6 },
  placeholderTitle: { fontFamily:'var(--font-display)', fontSize:9, lineHeight:1.3 },
  info        : { flex:1, minWidth:0 },
  meta        : { display:'flex', alignItems:'center', gap:5, marginBottom:3 },
  category    : { fontSize:9, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' },
  textBadge   : { fontSize:8, fontWeight:700, color:'#7ab87a', background:'rgba(122,184,122,0.12)', border:'1px solid rgba(122,184,122,0.25)', padding:'1px 4px', borderRadius:3 },
  pdfBadge    : { fontSize:8, fontWeight:700, color:'var(--accent)', background:'var(--accent-dim)', border:'1px solid rgba(201,169,110,0.25)', padding:'1px 4px', borderRadius:3 },
  title       : { fontFamily:'var(--font-display)', fontSize:14, fontWeight:400, color:'var(--text-primary)', lineHeight:1.3, marginBottom:2, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' },
  author      : { fontSize:11, color:'var(--text-muted)', marginBottom:4 },
  pageLabel   : { fontSize:10, color:'var(--accent)', fontWeight:500, marginBottom:5 },
  progressWrap: { display:'flex', alignItems:'center', gap:6 },
  progressTrack: { flex:1, height:3, background:'var(--border)', borderRadius:99, overflow:'hidden' },
  progressFill: { height:'100%', background:'var(--accent)' },
  progressLabel: { fontSize:10, color:'var(--accent)', flexShrink:0 },
}

// ── Modal styles ──────────────────────────────────────────────────────────────
const modal = {
  backdrop      : { position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:1000, padding:'0 0 0 0', backdropFilter:'blur(4px)' },
  box           : { width:'100%', maxWidth:480, background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:'20px 20px 0 0', padding:'28px 24px 40px', display:'flex', flexDirection:'column', gap:0 },
  icon          : { fontSize:36, marginBottom:12, textAlign:'center' },
  title         : { fontFamily:'var(--font-display)', fontSize:22, fontWeight:400, color:'var(--text-primary)', marginBottom:8, letterSpacing:'-0.02em' },
  body          : { fontSize:14, color:'var(--text-secondary)', lineHeight:1.7 },
  checkRow      : { display:'flex', alignItems:'flex-start', gap:10, cursor:'pointer', margin:'20px 0 8px', padding:'12px', background:'var(--bg-elevated)', borderRadius:'var(--radius-md)', border:'1px solid var(--border)' },
  checkLabel    : { fontSize:13, color:'var(--text-secondary)', lineHeight:1.5 },
  actions       : { display:'flex', gap:10, marginTop:20 },
  cancelBtn     : { flex:1, padding:'13px', background:'transparent', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', color:'var(--text-secondary)', fontSize:14, cursor:'pointer' },
  acceptBtn     : { flex:2, padding:'13px', background:'var(--accent)', border:'none', borderRadius:'var(--radius-md)', color:'#0d0d0d', fontSize:14, fontWeight:600, cursor:'pointer' },
  acceptBtnDisabled: { opacity:0.4, cursor:'not-allowed' },
}

// ── Upload styles ─────────────────────────────────────────────────────────────
const upS = {
  field    : { display:'flex', flexDirection:'column', gap:7, marginBottom:14 },
  label    : { fontSize:11, fontWeight:500, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'0.07em' },
  input    : { padding:'11px 12px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', color:'var(--text-primary)', fontSize:14, outline:'none', width:'100%' },
  pickBtn  : { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:6, width:'100%', padding:'18px 12px', background:'var(--bg-elevated)', border:'2px dashed var(--border)', borderRadius:'var(--radius-md)', color:'var(--text-muted)', fontSize:13, cursor:'pointer', minHeight:80 },
  fileChosen: { display:'flex', alignItems:'center', gap:8, padding:'10px 12px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)' },
  fileName : { flex:1, fontSize:12, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  pdfTag   : { fontSize:9, fontWeight:700, color:'var(--accent)', background:'var(--accent-dim)', padding:'2px 5px', borderRadius:3, flexShrink:0 },
  changeBtn: { padding:'3px 8px', background:'transparent', border:'1px solid var(--border)', borderRadius:4, color:'var(--text-secondary)', fontSize:11, cursor:'pointer', flexShrink:0 },
  uploading: { display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:'var(--bg-elevated)', borderRadius:'var(--radius-md)', marginBottom:8 },
  spinner  : { width:14, height:14, border:'2px solid var(--border)', borderTop:'2px solid var(--accent)', borderRadius:'50%', animation:'spin 0.7s linear infinite', display:'inline-block', flexShrink:0 },
  error    : { fontSize:13, color:'#e05c5c', padding:'10px 12px', background:'rgba(224,92,92,0.08)', borderRadius:'var(--radius-sm)', marginBottom:8 },
}

// ── Settings styles ───────────────────────────────────────────────────────────
const settS = {
  field  : { display:'flex', flexDirection:'column', gap:10, marginBottom:18 },
  label  : { fontSize:11, fontWeight:500, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'0.07em' },
  row    : { display:'flex', gap:8 },
  themeBtn: { flex:1, padding:'10px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', color:'var(--text-secondary)', fontSize:13, cursor:'pointer', transition:'all var(--transition)' },
  themeBtnActive: { background:'var(--accent)', color:'#0d0d0d', borderColor:'var(--accent)' },
  preview: { fontSize:11, color:'var(--text-muted)', marginTop:6, lineHeight:1.8 },
  hint   : { fontSize:11, color:'var(--text-muted)', marginTop:4 },
  select : { padding:'10px 12px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', color:'var(--text-primary)', fontSize:13, outline:'none', width:'100%', cursor:'pointer' },
  testBtn: { padding:'8px 14px', background:'transparent', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', color:'var(--accent)', fontSize:13, cursor:'pointer', marginTop:6, alignSelf:'flex-start' },
}

// ── Newly Added Card styles ───────────────────────────────────────────────────
const na = {
  card        : { display:'flex', alignItems:'center', gap:12, padding:12, background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', cursor:'pointer', textAlign:'left', width:'100%', position:'relative', overflow:'hidden' },
  cover       : { width:52, height:70, borderRadius:'var(--radius-md)', overflow:'hidden', flexShrink:0, position:'relative' },
  coverImg    : { width:'100%', height:'100%', objectFit:'cover' },
  placeholder : { width:'100%', height:'100%', display:'flex', flexDirection:'column', justifyContent:'flex-end', padding:6 },
  placeholderTitle: { fontFamily:'var(--font-display)', fontSize:8, lineHeight:1.3 },
  textBadge   : { position:'absolute', top:3, left:3, fontSize:7, fontWeight:700, color:'#7ab87a', background:'rgba(13,13,13,0.85)', padding:'1px 3px', borderRadius:3 },
  pdfBadge    : { position:'absolute', top:3, left:3, fontSize:7, fontWeight:700, color:'#c9a96e', background:'rgba(13,13,13,0.85)', padding:'1px 3px', borderRadius:3 },
  info        : { flex:1, minWidth:0 },
  newBadge    : { fontSize:8, fontWeight:700, color:'#c9a96e', background:'rgba(201,169,110,0.12)', border:'1px solid rgba(201,169,110,0.25)', padding:'1px 6px', borderRadius:99, display:'inline-block', marginBottom:4 },
  title       : { fontFamily:'var(--font-display)', fontSize:14, fontWeight:400, color:'var(--text-primary)', lineHeight:1.3, marginBottom:2, display:'-webkit-box', WebkitLineClamp:1, WebkitBoxOrient:'vertical', overflow:'hidden' },
  author      : { fontSize:11, color:'var(--text-muted)', marginBottom:3 },
  time        : { fontSize:10, color:'var(--text-muted)', opacity:0.7 },
}
