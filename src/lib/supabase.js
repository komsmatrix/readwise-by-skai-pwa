const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY

// ── Core fetch helper ─────────────────────────────────────────────────────────
async function sb(path, options = {}) {
  const res = await fetch(`${supabaseUrl}${path}`, {
    ...options,
    headers: {
      'apikey'        : supabaseAnon,
      'Authorization' : `Bearer ${supabaseAnon}`,
      'Content-Type'  : 'application/json',
      ...(options.headers || {}),
    },
  })
  return res
}

// ── Customer ──────────────────────────────────────────────────────────────────
export async function getCustomer(email) {
  const res  = await sb(`/rest/v1/customers?email=eq.${encodeURIComponent(email.toLowerCase().trim())}&limit=1`)
  const data = await res.json()
  return { customer: data?.[0] || null }
}

export async function activateKey(key, name, email) {
  const res = await fetch('/api/activate-key', {
    method : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body   : JSON.stringify({ key, name, email }),
  })
  return res.json()
}

// ── Books ─────────────────────────────────────────────────────────────────────
export async function getBooks() {
  const res  = await sb('/rest/v1/books?is_active=eq.true&order=created_at.desc')
  const data = await res.json()
  return { books: Array.isArray(data) ? data : [] }
}

export function getBookFileUrl(filePath) {
  return `${supabaseUrl}/storage/v1/object/public/books/${filePath}`
}

export function getCoverUrl(coverPath) {
  if (!coverPath) return null
  return `${supabaseUrl}/storage/v1/object/public/covers/${coverPath}`
}

export async function getTextContent(textPath) {
  if (!textPath) return null
  const res = await fetch(`${supabaseUrl}/storage/v1/object/public/books/${textPath}`)
  if (!res.ok) return null
  return res.text()
}

// ── Progress ──────────────────────────────────────────────────────────────────
export async function getProgress(customerId) {
  if (!customerId) return {}
  const res  = await sb(`/rest/v1/reading_progress?customer_id=eq.${customerId}`)
  const data = await res.json()
  const map  = {}
  for (const item of (Array.isArray(data) ? data : [])) {
    map[item.book_id] = {
      book_id        : item.book_id,
      customer_id    : item.customer_id,
      currentPage    : item.current_page    || 1,
      current_page   : item.current_page    || 1,
      scrollPosition : item.scroll_position || 0,
      scroll_position: item.scroll_position || 0,
      percent        : item.percent         || 0,
      bookmarks      : item.bookmarks       || [],
      updated_at     : item.updated_at,
    }
  }
  return map
}

export async function saveProgress(customerId, bookId, data) {
  if (!customerId || !bookId) return false
  const res = await sb('/rest/v1/reading_progress', {
    method : 'POST',
    headers: { 'Prefer': 'resolution=merge-duplicates' },
    body   : JSON.stringify({
      customer_id    : customerId,
      book_id        : bookId,
      current_page   : data.currentPage    || data.current_page    || 1,
      scroll_position: data.scrollPosition || data.scroll_position || 0,
      percent        : data.percent        || 0,
      bookmarks      : data.bookmarks      || [],
      updated_at     : new Date().toISOString(),
    }),
  })
  return res.ok
}

// ── Personal books ────────────────────────────────────────────────────────────
export async function getPersonalBooks(customerId) {
  if (!customerId) return []
  const res  = await sb(`/rest/v1/personal_books?customer_id=eq.${customerId}&order=created_at.desc`)
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

export async function uploadPersonalBook(customerId, file, coverFile, title, author) {
  const slug      = title.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 40)
  const timestamp = Date.now()
  const filePath  = `${customerId}/${timestamp}-${slug}.pdf`

  // Upload PDF to personal bucket
  const fileBuffer = await file.arrayBuffer()
  const uploadRes  = await fetch(`${supabaseUrl}/storage/v1/object/personal/${filePath}`, {
    method : 'POST',
    headers: {
      'apikey'       : supabaseAnon,
      'Authorization': `Bearer ${supabaseAnon}`,
      'Content-Type' : 'application/pdf',
      'x-upsert'     : 'true',
    },
    body: fileBuffer,
  })

  if (!uploadRes.ok) return { success: false, error: 'Upload failed' }

  // Upload cover if provided
  let coverPath = null
  if (coverFile) {
    const coverExt    = coverFile.name.split('.').pop()
    const coverFPath  = `${customerId}/${timestamp}-${slug}-cover.${coverExt}`
    const coverBuffer = await coverFile.arrayBuffer()
    const coverRes    = await fetch(`${supabaseUrl}/storage/v1/object/personal/${coverFPath}`, {
      method : 'POST',
      headers: {
        'apikey'       : supabaseAnon,
        'Authorization': `Bearer ${supabaseAnon}`,
        'Content-Type' : coverFile.type || 'image/jpeg',
        'x-upsert'     : 'true',
      },
      body: coverBuffer,
    })
    if (coverRes.ok) coverPath = coverFPath
  }

  // Save record to database
  const bookRes = await sb('/rest/v1/personal_books', {
    method : 'POST',
    headers: { 'Prefer': 'return=representation' },
    body   : JSON.stringify({
      customer_id   : customerId,
      title         : title.trim(),
      author        : author.trim() || 'Unknown',
      file_path     : filePath,
      cover_path    : coverPath,
      preferred_mode: 'pdf',
      created_at    : new Date().toISOString(),
    }),
  })

  if (!bookRes.ok) return { success: false, error: 'Database save failed' }
  const bookData = await bookRes.json()
  return { success: true, book: bookData?.[0] || bookData }
}

export async function deletePersonalBook(bookId, customerId) {
  const res = await sb(`/rest/v1/personal_books?id=eq.${bookId}&customer_id=eq.${customerId}`, {
    method: 'DELETE',
  })
  return res.ok
}

export function getPersonalBookUrl(filePath) {
  // Personal books need a signed URL since bucket is private
  return `${supabaseUrl}/storage/v1/object/personal/${filePath}`
}
