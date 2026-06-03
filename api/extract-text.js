// api/extract-text.js — Extracts text from a PDF stored in Supabase and saves as HTML
import { createClient } from '@supabase/supabase-js'
import fetch from 'node-fetch'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { bookId, pdfPath, textPath } = req.body
  if (!bookId || !pdfPath || !textPath) {
    return res.status(400).json({ error: 'bookId, pdfPath, and textPath required' })
  }

  try {
    // 1. Download the PDF from Supabase storage
    const { data: fileData, error: downloadErr } = await supabase.storage
      .from('books')
      .download(pdfPath)

    if (downloadErr || !fileData) {
      return res.status(400).json({ error: 'Could not download PDF: ' + downloadErr?.message })
    }

    // 2. Convert to buffer
    const arrayBuffer = await fileData.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 3. Extract text using pdf-parse
    let pdfParse
    try {
      pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default
    } catch(e) {
      pdfParse = (await import('pdf-parse')).default
    }

    const pdfData = await pdfParse(buffer)
    const rawText = pdfData.text || ''

    if (!rawText.trim()) {
      return res.status(400).json({ error: 'Could not extract text from PDF. It may be a scanned image PDF.' })
    }

    // 4. Convert plain text to clean readable HTML
    const lines = rawText.split('\n')
    let html = '<div class="book-content">\n'
    let inParagraph = false
    let paragraphBuffer = []

    for (const line of lines) {
      const trimmed = line.trim()

      if (!trimmed) {
        // Empty line = paragraph break
        if (paragraphBuffer.length > 0) {
          const para = paragraphBuffer.join(' ').trim()
          if (para.length > 0) {
            // Detect chapter headings (short lines, all caps or starts with Chapter)
            if (para.length < 60 && (para === para.toUpperCase() || /^chapter\s/i.test(para) || /^part\s/i.test(para))) {
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

    // Flush remaining
    if (paragraphBuffer.length > 0) {
      const para = paragraphBuffer.join(' ').trim()
      if (para.length > 0) {
        html += `<p>${escapeHtml(para)}</p>\n`
      }
    }

    html += '</div>'

    // Wrap in full HTML document
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body { font-family: Georgia, serif; line-height: 1.8; max-width: 680px; margin: 0 auto; padding: 20px; }
  h2 { margin: 2em 0 0.5em; font-size: 1.2em; text-transform: uppercase; letter-spacing: 0.1em; }
  p { margin: 0 0 1.2em; text-indent: 1.5em; }
  p:first-of-type { text-indent: 0; }
</style>
</head>
<body>
${html}
</body>
</html>`

    // 5. Upload HTML to Supabase storage
    const htmlBuffer = Buffer.from(fullHtml, 'utf-8')
    const { error: uploadErr } = await supabase.storage
      .from('books')
      .upload(textPath, htmlBuffer, {
        upsert: true,
        contentType: 'text/html',
      })

    if (uploadErr) {
      return res.status(400).json({ error: 'Could not save text file: ' + uploadErr.message })
    }

    // 6. Update books table with text_path and preferred_mode
    const { error: dbErr } = await supabase
      .from('books')
      .update({ text_path: textPath, preferred_mode: 'text' })
      .eq('id', bookId)

    if (dbErr) {
      return res.status(400).json({ error: 'Could not update book record: ' + dbErr.message })
    }

    return res.status(200).json({
      success: true,
      textPath,
      charCount: rawText.length,
      message: 'Text extracted and saved successfully'
    })

  } catch (err) {
    console.error('Extract text error:', err)
    return res.status(500).json({ error: err.message })
  }
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
