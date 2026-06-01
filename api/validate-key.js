// api/validate-key.js — Vercel serverless function
// Checks if a key exists and is valid without exposing all keys to the browser

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { key } = req.body
  if (!key) return res.status(400).json({ error: 'Key required' })

  const keyPattern = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/
  if (!keyPattern.test(key)) return res.status(200).json({ valid: false, reason: 'invalid_format' })

  try {
    const { data, error } = await supabase
      .from('access_keys')
      .select('*')
      .eq('key', key)
      .single()

    if (error || !data) return res.status(200).json({ valid: false, reason: 'invalid_key' })

    if (data.used_at && !data.is_owner) return res.status(200).json({ valid: false, reason: 'already_activated' })

    if (data.expires_at && !data.is_owner && new Date() > new Date(data.expires_at)) {
      return res.status(200).json({ valid: false, reason: 'key_expired' })
    }

    return res.status(200).json({ valid: true, isOwner: data.is_owner })
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
}
