import { useState, useMemo } from 'react'
import { getCoverUrl } from '../lib/supabase.js'
import BookCard from '../components/BookCard.jsx'

export default function LibraryScreen({ customer, books, progress, prefs, onOpenBook, onSignOut, onRefresh, onPrefsChange }) {
  const [search,         setSearch]         = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [showSettings,   setShowSettings]   = useState(false)
  const [sidebarOpen,    setSidebarOpen]    = useState(false)

  const categories = useMemo(() => {
    const cats = [...new Set(books.map(b => b.category).filter(Boolean))]
    return ['All', ...cats]
  }, [books])

  const filtered = useMemo(() => {
    return books.filter(book => {
      const matchCat    = activeCategory === 'All' || book.category === activeCategory
      const q           = search.toLowerCase()
      const matchSearch = !q
        || book.title?.toLowerCase().includes(q)
        || book.author?.toLowerCase().includes(q)
        || (book.tags || []).some(t => t.toLowerCase().includes(q))
      return matchCat && matchSearch
    })
  }, [books, activeCategory, search])

  const recentBooks = useMemo(() => {
    return books
      .filter(b => { const p = progress[b.id]; return p?.percent > 0 && p?.percent < 100 })
      .sort((a, b) => (progress[b.id]?.updated_at || '').localeCompare(progress[a.id]?.updated_at || ''))
      .slice(0, 4)
  }, [books, progress])

  function getGreeting() {
    const h = new Date().getHours()
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
  }

  function getReadingTime(book, bookProgress) {
    if (!bookProgress?.percent || bookProgress.percent >= 100 || !book.pages) return null
    const pct  = bookProgress.percent
    const mins = Math.round((book.pages * (1 - pct / 100) * 250) / 200)
    if (mins < 2)  return '< 1 min left'
    if (mins < 60) return `~${mins} min left`
    const h = Math.floor(mins / 60), m = mins % 60
    return m > 0 ? `~${h}h ${m}m left` : `~${h}h left`
  }

  return (
    <div style={s.root}>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && <div style={s.overlay} onClick={() => setSidebarOpen(false)}/>}

      {/* Sidebar */}
      <aside style={{ ...s.sidebar, ...(sidebarOpen ? s.sidebarOpen : {}) }}>
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
          <p style={s.navLabel}>Library</p>
          {categories.map(cat => (
            <button key={cat} style={{ ...s.navItem, ...(activeCategory === cat ? s.navItemActive : {}) }}
              onClick={() => { setActiveCategory(cat); setSidebarOpen(false) }}>
              {cat}
            </button>
          ))}
        </nav>

        <div style={s.sidebarBottom}>
          <button style={s.settingsBtn} onClick={() => { setShowSettings(true); setSidebarOpen(false) }}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            Settings
          </button>
          <button style={{ ...s.settingsBtn, color: '#e05c5c' }} onClick={onSignOut}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3M11 11l3-3-3-3M14 8H6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={s.main}>
        {/* Header */}
        <header style={s.header}>
          <div style={s.headerLeft}>
            <button style={s.menuBtn} onClick={() => setSidebarOpen(v => !v)}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M2 4h14M2 9h14M2 14h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
            <div>
              <p style={s.greeting}>{getGreeting()},</p>
              <h1 style={s.name}>{customer?.name?.split(' ')[0] || 'Reader'}</h1>
            </div>
          </div>
          <div style={s.searchWrap}>
            <svg style={s.searchIcon} viewBox="0 0 20 20" fill="none">
              <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input style={s.search} placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
        </header>

        {/* Content */}
        <div style={s.content}>
          {/* Continue reading */}
          {recentBooks.length > 0 && !search && activeCategory === 'All' && (
            <section style={s.section}>
              <h2 style={s.sectionTitle}>Continue reading</h2>
              <div style={s.recentRow}>
                {recentBooks.map((book, i) => (
                  <BookCard key={book.id} book={book} progress={progress[book.id]} readingTimeLabel={getReadingTime(book, progress[book.id])} onClick={() => onOpenBook(book)} variant="wide" animDelay={i * 60}/>
                ))}
              </div>
            </section>
          )}

          {/* Library grid */}
          <section style={s.section}>
            <div style={s.sectionHeader}>
              <h2 style={s.sectionTitle}>
                {search ? `Results for "${search}"` : activeCategory === 'All' ? 'Your library' : activeCategory}
              </h2>
              <span style={s.count}>{filtered.length} books</span>
            </div>

            {filtered.length === 0 ? (
              <div style={s.empty}>
                <p style={s.emptyText}>{books.length === 0 ? 'Your library is being set up.' : 'No books found.'}</p>
              </div>
            ) : (
              <div style={s.grid}>
                {filtered.map((book, i) => (
                  <BookCard key={book.id} book={book} progress={progress[book.id]} onClick={() => onOpenBook(book)} animDelay={i * 30}/>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Settings modal */}
      {showSettings && (
        <SettingsModal prefs={prefs} onSave={p => { onPrefsChange(p); setShowSettings(false) }} onClose={() => setShowSettings(false)}/>
      )}
    </div>
  )
}

function SettingsModal({ prefs, onSave, onClose }) {
  const [theme,    setTheme]    = useState(prefs.theme    || 'dark')
  const [fontSize, setFontSize] = useState(prefs.fontSize || 18)
  return (
    <div style={m.backdrop} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={m.modal} className="animate-up">
        <div style={m.header}>
          <h2 style={m.title}>Settings</h2>
          <button style={m.close} onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
          </button>
        </div>
        <div style={m.body}>
          <div style={m.field}>
            <label style={m.label}>Reading theme</label>
            <div style={m.themeRow}>
              {['dark', 'sepia', 'light'].map(t => (
                <button key={t} style={{ ...m.themeBtn, ...(theme === t ? m.themeBtnActive : {}) }} onClick={() => setTheme(t)}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div style={m.field}>
            <label style={m.label}>Font size — {fontSize}px</label>
            <input type="range" min={14} max={28} value={fontSize} onChange={e => setFontSize(+e.target.value)} style={{ width: '100%', accentColor: 'var(--accent)' }}/>
          </div>
        </div>
        <div style={m.footer}>
          <button style={m.cancelBtn} onClick={onClose}>Cancel</button>
          <button style={m.saveBtn} onClick={() => onSave({ theme, fontSize })}>Save</button>
        </div>
      </div>
    </div>
  )
}

const s = {
  root       : { display: 'flex', height: '100vh', background: 'var(--bg-base)', overflow: 'hidden', position: 'relative' },
  overlay    : { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40 },
  sidebar    : { width: 220, flexShrink: 0, background: 'var(--bg-surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', padding: '24px 14px', zIndex: 50, transition: 'transform var(--transition)', '@media(max-width:768px)': { position: 'fixed', top: 0, left: 0, height: '100%', transform: 'translateX(-100%)' } },
  sidebarOpen: { transform: 'translateX(0)' },
  brand      : { display: 'flex', alignItems: 'center', gap: 9, marginBottom: 24, padding: '0 6px' },
  brandName  : { fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.15 },
  brandBy    : { fontSize: 9, color: 'var(--accent)', letterSpacing: '0.06em', textTransform: 'uppercase' },
  stat       : { padding: '10px 12px', background: 'var(--accent-dim)', borderRadius: 'var(--radius-md)', marginBottom: 16 },
  statNum    : { fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--accent)', display: 'block', lineHeight: 1, marginBottom: 3 },
  statLabel  : { fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' },
  nav        : { flex: 1, display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' },
  navLabel   : { fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 8px', marginBottom: 4 },
  navItem    : { display: 'flex', alignItems: 'center', padding: '8px 10px', borderRadius: 'var(--radius-md)', border: 'none', background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', textAlign: 'left', transition: 'all var(--transition)', width: '100%' },
  navItemActive: { background: 'var(--accent-dim)', color: 'var(--accent)' },
  sidebarBottom: { paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 2 },
  settingsBtn: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 'var(--radius-md)', border: 'none', background: 'transparent', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', width: '100%', transition: 'all var(--transition)' },
  main       : { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 },
  header     : { padding: '20px 20px 16px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', flexShrink: 0, gap: 12 },
  headerLeft : { display: 'flex', alignItems: 'flex-end', gap: 10 },
  menuBtn    : { width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', borderRadius: 'var(--radius-md)', flexShrink: 0 },
  greeting   : { fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 },
  name       : { fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.02em' },
  searchWrap : { position: 'relative', flexShrink: 0 },
  searchIcon : { position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--text-muted)', pointerEvents: 'none' },
  search     : { width: 180, padding: '8px 12px 8px 30px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 99, color: 'var(--text-primary)', fontSize: 13, outline: 'none' },
  content    : { flex: 1, overflowY: 'auto', padding: '20px 20px 40px' },
  section    : { marginBottom: 36 },
  sectionHeader: { display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 16 },
  sectionTitle : { fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.01em' },
  count      : { fontSize: 12, color: 'var(--text-muted)' },
  recentRow  : { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 },
  grid       : { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 16 },
  empty      : { padding: '40px 0', textAlign: 'center' },
  emptyText  : { fontSize: 15, color: 'var(--text-secondary)' },
}

const m = {
  backdrop : { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20, backdropFilter: 'blur(4px)' },
  modal    : { width: '100%', maxWidth: 400, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' },
  header   : { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 14px', borderBottom: '1px solid var(--border)' },
  title    : { fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 400, color: 'var(--text-primary)' },
  close    : { width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-secondary)', cursor: 'pointer' },
  body     : { padding: '20px', display: 'flex', flexDirection: 'column', gap: 20 },
  field    : { display: 'flex', flexDirection: 'column', gap: 10 },
  label    : { fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em' },
  themeRow : { display: 'flex', gap: 8 },
  themeBtn : { flex: 1, padding: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', transition: 'all var(--transition)' },
  themeBtnActive: { background: 'var(--accent)', color: '#0d0d0d', borderColor: 'var(--accent)' },
  footer   : { display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '14px 20px', borderTop: '1px solid var(--border)' },
  cancelBtn: { padding: '8px 18px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' },
  saveBtn  : { padding: '8px 18px', background: 'var(--accent)', border: 'none', borderRadius: 'var(--radius-md)', color: '#0d0d0d', fontSize: 13, fontWeight: 500, cursor: 'pointer' },
}
