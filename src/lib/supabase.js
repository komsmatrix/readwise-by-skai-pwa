import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnon)

// ── Auth helpers ───────────────────────────────────────────────────────────────
export async function getCustomer(email) {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .single()
  return { customer: data, error }
}

export async function getKeyEntry(key) {
  const res = await fetch('/api/validate-key', {
    method : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body   : JSON.stringify({ key }),
  })
  return res.json()
}

export async function activateKey(key, name, email) {
  const res = await fetch('/api/activate-key', {
    method : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body   : JSON.stringify({ key, name, email }),
  })
  return res.json()
}

// ── Books helpers ──────────────────────────────────────────────────────────────
export async function getBooks() {
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
  return { books: data || [], error }
}

export async function getBookFileUrl(filePath) {
  const { data } = supabase.storage.from('books').getPublicUrl(filePath)
  return data.publicUrl
}

export async function getCoverUrl(coverPath) {
  if (!coverPath) return null
  const { data } = supabase.storage.from('covers').getPublicUrl(coverPath)
  return data.publicUrl
}

export async function getTextContent(textPath) {
  if (!textPath) return null
  const { data } = supabase.storage.from('books').getPublicUrl(textPath)
  const res = await fetch(data.publicUrl)
  if (!res.ok) return null
  return res.text()
}

// ── Progress helpers ───────────────────────────────────────────────────────────
export async function getProgress(customerId) {
  const { data } = await supabase
    .from('reading_progress')
    .select('*')
    .eq('customer_id', customerId)
  const map = {}
  for (const item of data || []) map[item.book_id] = item
  return map
}

export async function saveProgress(customerId, bookId, progressData) {
  const { error } = await supabase
    .from('reading_progress')
    .upsert({
      customer_id    : customerId,
      book_id        : bookId,
      current_page   : progressData.currentPage   || 1,
      scroll_position: progressData.scrollPosition || 0,
      percent        : progressData.percent        || 0,
      bookmarks      : progressData.bookmarks      || [],
      updated_at     : new Date().toISOString(),
    }, { onConflict: 'customer_id,book_id' })
  return !error
}

// ── Personal books helpers ─────────────────────────────────────────────────────
export async function getPersonalBooks(customerId) {
  const { data } = await supabase
    .from('personal_books')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
  return data || []
}
