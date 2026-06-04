// api/extract-text.js — Extracts text from PDF and saves as clean reading HTML
import { createClient } from '@supabase/supabase-js'
import PDFParser from 'pdf2json'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
)

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function pdfBufferToText(buffer) {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser(null, 1)
    pdfParser.on('pdfParser_dataError', err => reject(err))
    pdfParser.on('pdfParser_dataReady', () => {
      const text = pdfParser.getRawTextContent()
      resolve(text)
    })
    pdfParser.parseBuffer(buffer)
  })
}

// Detect if a line looks like a chapter heading
function isHeading(line) {
  const t = line.trim()
  if (!t || t.length > 120) return false

  // All caps short line
  if (t === t.toUpperCase() && t.length < 60 && /[A-Z]/.test(t)) return true

  // Chapter / Part / Book / Section patterns
  if (/^(chapter|part|book|section|unit|lesson|prologue|epilogue|introduction|conclusion|foreword|preface|appendix)\b/i.test(t)) return true

  // Roman numeral headings: I, II, III, IV, V, X etc.
  if (/^(M{0,4})(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/i.test(t) && t.length < 15) return true

  // Numbered chapter: "1.", "1 ", "1:", followed by short text
  if (/^\d{1,2}[\.\:\s]/.test(t) && t.length < 80) return true

  // Short title-case line followed by nothing
  if (t.length < 50 && /^[A-Z]/.test(t) && !/[.!?,;]$/.test(t)) return true

  return false
}

// Detect page separator / junk lines
function isJunk(line) {
  const t = line.trim()
  if (!t) return true
  if (/^-{10,}$/.test(t)) return true                    // dashes
  if (/^\d+$/.test(t) && t.length < 5) return true       // lone page numbers
  if (/^page\s+\d+/i.test(t)) return true                // "Page 1"
  if (t.length < 3) return true                           // tiny fragments
  return false
}

function buildHtml(rawText, title, author) {
  const lines = rawText.split('\n')

  let blocks = []       // { type: 'heading'|'para'|'break', text }
  let buffer  = []

  function flushBuffer() {
    if (buffer.length === 0) return
    const joined = buffer.join(' ').trim()
    if (joined.length > 0) blocks.push({ type: 'para', text: joined })
    buffer = []
  }

  for (let i = 0; i < lines.length; i++) {
    const line    = lines[i]
    const trimmed = line.trim()

    if (isJunk(trimmed)) {
      flushBuffer()
      continue
    }

    if (isHeading(trimmed)) {
      flushBuffer()
      blocks.push({ type: 'heading', text: trimmed })
      continue
    }

    // Empty line = paragraph break
    if (!trimmed) {
      flushBuffer()
      continue
    }

    // Line ending in sentence-ending punctuation = end of paragraph
    if (/[.!?:]["'»]?$/.test(trimmed) && trimmed.length > 60) {
      buffer.push(trimmed)
      flushBuffer()
      continue
    }

    buffer.push(trimmed)
  }

  flushBuffer()

  // Build HTML string
  let html = ''
  let firstPara = true

  // Book header
  html += `<div class="book-header">\n`
  html += `  <div class="book-title">${escapeHtml(title || '')}</div>\n`
  if (author) html += `  <div class="book-author">${escapeHtml(author)}</div>\n`
  html += `</div>\n`

  html += `<div class="book-content">\n`

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]

    if (block.type === 'heading') {
      html += `<h2 class="chapter-heading">${escapeHtml(block.text)}</h2>\n`
      firstPara = true  // Next para after heading gets drop cap
      continue
    }

    if (block.type === 'para') {
      const cls = firstPara ? ' class="first-para"' : ''
      html += `<p${cls}>${escapeHtml(block.text)}</p>\n`
      firstPara = false
      continue
    }
  }

  html += `</div>\n`
  return html
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { bookId, pdfPath, textPath, title, author } = req.body
  if (!bookId || !pdfPath || !textPath) {
    return res.status(400).json({ error: 'bookId, pdfPath, and textPath required' })
  }

  try {
    // 1. Download PDF from Supabase storage
    const { data: fileData, error: downloadErr } = await supabase.storage
      .from('books')
      .download(pdfPath)

    if (downloadErr || !fileData) {
      return res.status(400).json({ error: 'Could not download PDF: ' + downloadErr?.message })
    }

    const arrayBuffer = await fileData.arrayBuffer()
    const buffer      = Buffer.from(arrayBuffer)

    // 2. Extract raw text
    let rawText
    try {
      rawText = await pdfBufferToText(buffer)
    } catch(e) {
      return res.status(400).json({ error: 'Could not extract text from PDF. It may be a scanned image PDF.' })
    }

    if (!rawText || !rawText.trim()) {
      return res.status(400).json({ error: 'No text found in PDF.' })
    }

    // 3. Build clean HTML
    const bodyHtml = buildHtml(rawText, title || '', author || '')

    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body {
    margin: 0;
    padding: 0;
    font-family: Georgia, 'Times New Roman', serif;
    line-height: 1.85;
    background: #111;
    color: #e8e4dd;
  }
  .book-header {
    text-align: center;
    padding: 48px 24px 32px;
    border-bottom: 1px solid #2a2a2a;
    margin-bottom: 40px;
  }
  .book-title {
    font-family: Georgia, serif;
    font-size: 26px;
    font-weight: 400;
    color: #c9a96e;
    letter-spacing: -0.02em;
    margin: 0 0 8px;
  }
  .book-author {
    font-size: 14px;
    color: #e8e4dd;
    opacity: 0.55;
    margin: 0;
  }
  .book-content {
    max-width: 660px;
    margin: 0 auto;
    padding: 0 20px 120px;
  }
  p {
    font-size: 18px;
    line-height: 1.85;
    color: #e8e4dd;
    margin: 0 0 1.15em;
    text-align: justify;
    text-indent: 1.6em;
  }
  p.first-para {
    text-indent: 0;
  }
  p.first-para::first-letter {
    font-size: 3.2em;
    font-family: Georgia, serif;
    font-weight: 400;
    color: #c9a96e;
    float: left;
    line-height: 0.78;
    margin: 0.06em 0.08em 0 0;
    padding: 0;
  }
  h2.chapter-heading {
    font-family: Georgia, serif;
    font-size: 1.3em;
    font-weight: 600;
    color: #c9a96e;
    margin: 3em 0 1.2em;
    padding-top: 1.2em;
    border-top: 1px solid #2a2a2a;
    text-align: center;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`

    // 4. Upload HTML to Supabase
    const htmlBuffer = Buffer.from(fullHtml, 'utf-8')
    const { error: uploadErr } = await supabase.storage
      .from('books')
      .upload(textPath, htmlBuffer, { upsert: true, contentType: 'text/html' })

    if (uploadErr) {
      return res.status(400).json({ error: 'Could not save text file: ' + uploadErr.message })
    }

    // 5. Update books table
    const { error: dbErr } = await supabase
      .from('books')
      .update({ text_path: textPath, preferred_mode: 'text' })
      .eq('id', bookId)

    if (dbErr) {
      return res.status(400).json({ error: 'Could not update book record: ' + dbErr.message })
    }

    return res.status(200).json({ success: true, textPath, message: 'Text extracted successfully' })

  } catch (err) {
    console.error('Extract text error:', err)
    return res.status(500).json({ error: err.message })
  }
}
