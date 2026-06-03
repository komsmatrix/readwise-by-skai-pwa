// api/extract-text.js — Extracts text from a PDF stored in Supabase and saves as HTML
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

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { bookId, pdfPath, textPath } = req.body
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
    const buffer = Buffer.from(arrayBuffer)

    // 2. Extract text
    let rawText
    try {
      rawText = await pdfBufferToText(buffer)
    } catch(e) {
      return res.status(400).json({ error: 'Could not extract text from PDF. It may be a scanned image PDF.' })
    }

    if (!rawText || !rawText.trim()) {
      return res.status(400).json({ error: 'No text found in PDF.' })
    }

    // 3. Convert to clean HTML
    const lines = rawText.split('\n')
    let html = '<div class="book-content">\n'
    let paragraphBuffer = []

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed === '--------------------------------------------------------------------------------') {
        if (paragraphBuffer.length > 0) {
          const para = paragraphBuffer.join(' ').trim()
          if (para.length > 0) {
            if (para.length < 80 && (para === para.toUpperCase() || /^(chapter|part|book)\s/i.test(para))) {
              html += `<h2>${escapeHtml(para)}</h2>\n`
            } else {
              html += `<p>${escapeHtml(para)}</p>\n`
            }
          }
          paragraphBuffer = []
        }
      } else {
        paragraphBuffer.push(trimmed)
      }
    }

    if (paragraphBuffer.length > 0) {
      const para = paragraphBuffer.join(' ').trim()
      if (para.length > 0) html += `<p>${escapeHtml(para)}</p>\n`
    }

    html += '</div>'

    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body { font-family: Georgia, serif; line-height: 1.8; max-width: 680px; margin: 0 auto; padding: 20px; }
  h2 { margin: 2em 0 0.5em; font-size: 1.2em; text-transform: uppercase; letter-spacing: 0.1em; }
  p { margin: 0 0 1.2em; text-indent: 1.5em; }
</style>
</head>
<body>
${html}
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
