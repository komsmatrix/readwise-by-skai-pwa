// api/fetch-book-text.js
// Automatically fetches clean text from Standard Ebooks or Project Gutenberg
// Called after a book is added — runs silently in background

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
)

// ── Text normalization helpers ────────────────────────────────────────────────

function normalizeTitle(title) {
  if (!title) return ''
  // Strip subtitle after semicolon, colon, or em-dash
  let t = title.split(/[;:,—–]/, 1)[0]
  // Remove punctuation, lowercase, trim
  return t.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()
}

function normalizeAuthor(author) {
  if (!author) return ''
  // Handle "Last, First" → "first last"
  const parts = author.split(',')
  let a = parts.length > 1 ? `${parts[1].trim()} ${parts[0].trim()}` : author
  // Remove initials dots, lowercase
  return a.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()
}

function titlesMatch(a, b) {
  return normalizeTitle(a) === normalizeTitle(b)
}

function authorsMatch(a, b) {
  const na = normalizeAuthor(a)
  const nb = normalizeAuthor(b)
  if (na === nb) return true
  // Check if one contains the other (handles middle name variations)
  const partsA = na.split(' ').filter(p => p.length > 1)
  const partsB = nb.split(' ').filter(p => p.length > 1)
  const lastName_A = partsA[partsA.length - 1]
  const lastName_B = partsB[partsB.length - 1]
  return lastName_A && lastName_B && lastName_A === lastName_B
}

// ── HTML builder (same style as extract-text.js) ─────────────────────────────

function escapeHtml(t) {
  return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}

function buildHtmlFromText(rawText, title, author) {
  const lines = rawText.split('\n')
  const blocks = []
  let buffer  = []

  function flush() {
    if (buffer.length === 0) return
    const joined = buffer.join(' ').trim()
    if (joined.length > 10) blocks.push({ type:'para', text:joined })
    buffer = []
  }

  function isHeading(t) {
    if (!t || t.length > 100) return false
    if (t === t.toUpperCase() && t.length > 2 && t.length < 60 && /[A-Z]/.test(t)) return true
    if (/^(chapter|part|book|section|prologue|epilogue|introduction|conclusion)\b/i.test(t)) return true
    if (/^[IVXLCivxlc]+\.?\s*$/.test(t) && t.length < 12) return true
    return false
  }

  function isJunk(t) {
    if (!t) return true
    if (/^\d+$/.test(t) && t.length < 6) return true
    if (t.length < 3) return true
    return false
  }

  for (const line of lines) {
    const t = line.trim()
    if (isJunk(t)) { flush(); continue }
    if (isHeading(t)) { flush(); blocks.push({ type:'heading', text:t }); continue }
    if (!t) { flush(); continue }
    buffer.push(t)
  }
  flush()

  let html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<style>
body{margin:0;padding:0;font-family:Georgia,serif;background:#111;color:#e8e4dd}
.book-header{text-align:center;padding:48px 24px 32px;border-bottom:1px solid #2a2a2a;margin-bottom:40px}
.book-title{font-size:26px;font-weight:400;color:#c9a96e;margin:0 0 8px}
.book-author{font-size:14px;color:#e8e4dd;opacity:.55;margin:0}
.book-content{max-width:660px;margin:0 auto;padding:0 20px 120px}
p{font-size:18px;line-height:1.85;color:#e8e4dd;margin:0 0 1.15em;text-align:justify;text-indent:1.6em}
p.fp{text-indent:0}
p.fp::first-letter{font-size:3.2em;font-family:Georgia,serif;color:#c9a96e;float:left;line-height:.78;margin:.06em .08em 0 0}
h2.ch{font-size:1.2em;font-weight:600;color:#c9a96e;margin:3em 0 1.2em;padding-top:1.2em;border-top:1px solid #2a2a2a;text-align:center;letter-spacing:.04em}
</style></head><body>
<div class="book-header">
<div class="book-title">${escapeHtml(title||'')}</div>
<div class="book-author">${escapeHtml(author||'')}</div>
</div>
<div class="book-content">\n`

  let firstPara = true
  for (const block of blocks) {
    if (block.type === 'heading') {
      html += `<h2 class="ch">${escapeHtml(block.text)}</h2>\n`
      firstPara = true
    } else {
      const cls = firstPara ? ' class="fp"' : ''
      html += `<p${cls}>${escapeHtml(block.text)}</p>\n`
      firstPara = false
    }
  }
  html += '</div>\n</body>\n</html>'
  return html
}

// ── Standard Ebooks search ────────────────────────────────────────────────────

async function searchStandardEbooks(title, author) {
  try {
    const query   = encodeURIComponent(`${normalizeTitle(title)} ${normalizeAuthor(author)}`.trim())
    const res     = await fetch(`https://standardebooks.org/opds/all`, {
      headers: { 'Accept': 'application/atom+xml,application/xml,text/xml' }
    })
    if (!res.ok) return null

    const xml     = await res.text()
    // Parse entries from OPDS feed
    const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)]

    for (const [, entry] of entries) {
      const entryTitle  = (entry.match(/<title[^>]*>(.*?)<\/title>/) || [])[1] || ''
      const entryAuthor = (entry.match(/<name>(.*?)<\/name>/) || [])[1] || ''
      const epubLink    = (entry.match(/<link[^>]*type="application\/epub\+zip"[^>]*href="([^"]+)"/) || [])[1]
      const htmlLink    = (entry.match(/<link[^>]*type="application\/xhtml\+xml"[^>]*href="([^"]+)"/) || [])[1]

      if (titlesMatch(entryTitle, title) && authorsMatch(entryAuthor, author)) {
        const url = htmlLink || epubLink
        if (url) {
          const fullUrl = url.startsWith('http') ? url : `https://standardebooks.org${url}`
          return { source: 'standardebooks', url: fullUrl, format: htmlLink ? 'html' : 'epub' }
        }
      }
    }
    return null
  } catch(e) {
    console.warn('Standard Ebooks search error:', e.message)
    return null
  }
}

// ── Project Gutenberg search ──────────────────────────────────────────────────

async function searchGutenberg(title, author) {
  try {
    const query   = encodeURIComponent(`${normalizeTitle(title)}`)
    const res     = await fetch(`https://gutendex.com/books/?search=${query}`)
    if (!res.ok) return null

    const data    = await res.json()
    const books   = data.results || []

    for (const book of books) {
      const bookTitle  = book.title || ''
      const bookAuthor = (book.authors || []).map(a => a.name).join(', ')

      if (titlesMatch(bookTitle, title) && authorsMatch(bookAuthor, author)) {
        // Find plain text URL
        const formats = book.formats || {}
        const txtUrl  = formats['text/plain; charset=utf-8']
          || formats['text/plain; charset=us-ascii']
          || formats['text/plain']

        if (txtUrl) {
          return { source: 'gutenberg', url: txtUrl, format: 'txt' }
        }
      }
    }
    return null
  } catch(e) {
    console.warn('Gutenberg search error:', e.message)
    return null
  }
}

// ── Download and process text ─────────────────────────────────────────────────

async function downloadAndProcess(match, title, author) {
  try {
    const res = await fetch(match.url)
    if (!res.ok) throw new Error(`Download failed: ${res.status}`)

    if (match.format === 'txt') {
      let text = await res.text()
      // Strip Gutenberg header/footer
      const startMatch = text.match(/\*{3}\s*START OF [^\n]+\n/i)
      const endMatch   = text.match(/\*{3}\s*END OF [^\n]+/i)
      if (startMatch) text = text.slice(startMatch.index + startMatch[0].length)
      if (endMatch)   text = text.slice(0, text.search(/\*{3}\s*END OF/i))
      return buildHtmlFromText(text.trim(), title, author)
    }

    if (match.format === 'html') {
      let html = await res.text()
      // Extract body content
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
      const body      = bodyMatch ? bodyMatch[1] : html
      // Wrap in our reading theme
      return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<style>
body{margin:0;padding:0;font-family:Georgia,serif;background:#111;color:#e8e4dd}
.book-header{text-align:center;padding:48px 24px 32px;border-bottom:1px solid #2a2a2a;margin-bottom:40px}
.book-title{font-size:26px;color:#c9a96e;margin:0 0 8px}
.book-author{font-size:14px;color:#e8e4dd;opacity:.55;margin:0}
.book-content{max-width:660px;margin:0 auto;padding:0 20px 120px}
p{font-size:18px;line-height:1.85;color:#e8e4dd;margin:0 0 1.15em;text-align:justify;text-indent:1.6em}
h2,h3{color:#c9a96e;margin:2.5em 0 1em;text-align:center}
</style></head><body>
<div class="book-header">
<div class="book-title">${escapeHtml(title||'')}</div>
<div class="book-author">${escapeHtml(author||'')}</div>
</div>
<div class="book-content">${body}</div>
</body></html>`
    }

    return null
  } catch(e) {
    console.warn('Download error:', e.message)
    return null
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { bookId, title, author, textPathBase } = req.body
  if (!bookId || !title) return res.status(400).json({ error: 'bookId and title required' })

  const slug     = textPathBase || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g,'')
  const textPath = `${slug}.html`

  try {
    let match = null
    let source = null

    // 1. Try Standard Ebooks first
    console.log(`Searching Standard Ebooks for: ${title} by ${author}`)
    match = await searchStandardEbooks(title, author)
    if (match) {
      console.log(`Found on Standard Ebooks: ${match.url}`)
      source = 'standardebooks'
    }

    // 2. Fall back to Gutenberg
    if (!match) {
      console.log(`Searching Gutenberg for: ${title} by ${author}`)
      match = await searchGutenberg(title, author)
      if (match) {
        console.log(`Found on Gutenberg: ${match.url}`)
        source = 'gutenberg'
      }
    }

    if (!match) {
      console.log(`No text found for: ${title} — needs manual text`)
      // Update book record to flag as needing manual text
      await supabase.from('books').update({ text_path: null }).eq('id', bookId)
      return res.status(200).json({ success: false, reason: 'not_found', title })
    }

    // 3. Download and process
    const htmlContent = await downloadAndProcess(match, title, author)
    if (!htmlContent) {
      return res.status(200).json({ success: false, reason: 'download_failed', title })
    }

    // 4. Upload to Supabase storage
    const htmlBuffer = Buffer.from(htmlContent, 'utf-8')
    const { error: uploadErr } = await supabase.storage
      .from('books')
      .upload(textPath, htmlBuffer, { upsert: true, contentType: 'text/html' })

    if (uploadErr) {
      return res.status(200).json({ success: false, reason: 'upload_failed', error: uploadErr.message })
    }

    // 5. Update book record
    await supabase.from('books')
      .update({ text_path: textPath, preferred_mode: 'text' })
      .eq('id', bookId)

    return res.status(200).json({ success: true, source, textPath, title })

  } catch(err) {
    console.error('fetch-book-text error:', err)
    return res.status(500).json({ error: err.message })
  }
}
