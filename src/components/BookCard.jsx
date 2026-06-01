import { useState, useEffect } from 'react'
import { getCoverUrl } from '../lib/supabase.js'

function getCoverColor(id = '') {
  const colors = [
    ['#1a1f3a', '#c9a96e'], ['#1e2d1e', '#7ab87a'], ['#2d1e1e', '#b87a7a'],
    ['#1e1e2d', '#8a7ab8'], ['#2d2a1a', '#c4b06a'], ['#1a2d2d', '#6ab8b8'],
  ]
  const code = typeof id === 'string' ? (id.charCodeAt(0) || 0) : 0
  return colors[code % colors.length]
}

export default function BookCard({ book, progress, readingTimeLabel, onClick, variant = 'normal', animDelay = 0 }) {
  const [coverUrl, setCoverUrl] = useState(null)
  const percent                 = progress?.percent || 0
  const [bg, accent]            = getCoverColor(book.id)
  const isTextMode              = book.preferred_mode === 'text' || (!book.preferred_mode && book.text_path)

  useEffect(() => {
    if (book.cover_path) {
      getCoverUrl(book.cover_path).then(url => { if (url) setCoverUrl(url) })
    }
  }, [book.cover_path])

  if (variant === 'wide') {
    return (
      <button style={{ ...ws.card, animationDelay: `${animDelay}ms` }} className="animate-in" onClick={onClick}>
        <div style={{ ...ws.cover, background: coverUrl ? 'transparent' : bg }}>
          {coverUrl ? <img src={coverUrl} alt={book.title} style={ws.coverImg}/> : (
            <div style={ws.placeholder}>
              <span style={{ ...ws.placeholderTitle, color: accent }}>{book.title?.slice(0, 20)}</span>
            </div>
          )}
        </div>
        <div style={ws.info}>
          <div style={ws.meta}>
            <span style={ws.category}>{book.category}</span>
            <span style={isTextMode ? ws.textBadge : ws.pdfBadge}>{isTextMode ? 'TEXT' : 'PDF'}</span>
          </div>
          <h3 style={ws.title}>{book.title}</h3>
          <p style={ws.author}>{book.author}</p>
          <div style={ws.progressWrap}>
            <div style={ws.progressTrack}><div style={{ ...ws.progressFill, width: `${percent}%` }}/></div>
            <span style={ws.progressLabel}>{percent}%</span>
          </div>
          {readingTimeLabel && <p style={ws.timeLabel}>{readingTimeLabel}</p>}
        </div>
      </button>
    )
  }

  return (
    <button style={{ ...cs.card, animationDelay: `${animDelay}ms` }} className="animate-in" onClick={onClick}>
      <div style={{ ...cs.cover, background: coverUrl ? 'transparent' : bg }}>
        {coverUrl ? <img src={coverUrl} alt={book.title} style={cs.coverImg}/> : (
          <div style={cs.placeholder}>
            <span style={{ ...cs.placeholderTitle, color: accent }}>{book.title?.slice(0, 24)}</span>
            <span style={cs.placeholderAuthor}>{book.author}</span>
          </div>
        )}
        {percent > 0 && <div style={cs.progressBar}><div style={{ ...cs.progressBarFill, width: `${percent}%` }}/></div>}
        {percent === 100 && <div style={cs.completedBadge}>✓</div>}
        <div style={isTextMode ? cs.textBadge : cs.pdfBadge}>{isTextMode ? 'TEXT' : 'PDF'}</div>
      </div>
      <div style={cs.meta}>
        <h3 style={cs.title}>{book.title}</h3>
        <p style={cs.author}>{book.author}</p>
        {percent > 0 && percent < 100 && <p style={cs.pct}>{percent}% read</p>}
        {percent === 100 && <p style={{ ...cs.pct, color: '#3a9a6a' }}>Finished ✓</p>}
      </div>
    </button>
  )
}

const ws = {
  card        : { display: 'flex', alignItems: 'center', gap: 14, padding: 12, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all var(--transition)' },
  cover       : { width: 64, height: 88, borderRadius: 'var(--radius-md)', overflow: 'hidden', flexShrink: 0 },
  coverImg    : { width: '100%', height: '100%', objectFit: 'cover' },
  placeholder : { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 8 },
  placeholderTitle: { fontFamily: 'var(--font-display)', fontSize: 11, lineHeight: 1.3 },
  info        : { flex: 1, minWidth: 0 },
  meta        : { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 },
  category    : { fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' },
  textBadge   : { fontSize: 9, fontWeight: 700, color: '#7ab87a', background: 'rgba(122,184,122,0.12)', border: '1px solid rgba(122,184,122,0.25)', padding: '1px 5px', borderRadius: 3 },
  pdfBadge    : { fontSize: 9, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-dim)', border: '1px solid rgba(201,169,110,0.25)', padding: '1px 5px', borderRadius: 3 },
  title       : { fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 400, color: 'var(--text-primary)', lineHeight: 1.3, marginBottom: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  author      : { fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 },
  progressWrap: { display: 'flex', alignItems: 'center', gap: 6 },
  progressTrack: { flex: 1, height: 3, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' },
  progressFill: { height: '100%', background: 'var(--accent)', borderRadius: 99 },
  progressLabel: { fontSize: 11, color: 'var(--accent)', flexShrink: 0 },
  timeLabel   : { fontSize: 11, color: 'var(--text-muted)', marginTop: 4 },
}

const cs = {
  card        : { display: 'flex', flexDirection: 'column', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, width: '100%', transition: 'transform var(--transition)' },
  cover       : { width: '100%', aspectRatio: '2/3', borderRadius: 'var(--radius-lg)', overflow: 'hidden', position: 'relative', flexShrink: 0 },
  coverImg    : { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  placeholder : { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 12, gap: 5 },
  placeholderTitle: { fontFamily: 'var(--font-display)', fontSize: 12, lineHeight: 1.3, fontWeight: 400 },
  placeholderAuthor: { fontSize: 10, color: 'rgba(255,255,255,0.4)' },
  progressBar : { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'rgba(0,0,0,0.3)' },
  progressBarFill: { height: '100%', background: 'var(--accent)' },
  completedBadge: { position: 'absolute', top: 6, right: 6, width: 20, height: 20, borderRadius: '50%', background: '#3a9a6a', color: '#fff', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 },
  textBadge   : { position: 'absolute', top: 6, left: 6, fontSize: 9, fontWeight: 700, color: '#7ab87a', background: 'rgba(13,13,13,0.8)', padding: '2px 5px', borderRadius: 3 },
  pdfBadge    : { position: 'absolute', top: 6, left: 6, fontSize: 9, fontWeight: 700, color: 'var(--accent)', background: 'rgba(13,13,13,0.8)', padding: '2px 5px', borderRadius: 3 },
  meta        : { padding: '8px 2px 0' },
  title       : { fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.35, marginBottom: 3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  author      : { fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  pct         : { fontSize: 11, color: 'var(--accent)', marginTop: 4 },
}
