// api/validate.js
// Merged: validate-key + validate-referral
// Usage: POST { type: 'key' | 'referral', ...payload }

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { type, ...payload } = req.body

  if (!type) return res.status(400).json({ error: 'type is required: key | referral' })

  try {
    if (type === 'key')      return await validateKey(payload, res)
    if (type === 'referral') return await validateReferral(payload, res)
    return res.status(400).json({ error: `Unknown type: ${type}` })
  } catch (err) {
    console.error(`validate [${type}] error:`, err)
    return res.status(500).json({ error: 'Server error' })
  }
}

// ── VALIDATE KEY ──────────────────────────────────────────────────────────────
async function validateKey({ key }, res) {
  if (!key) return res.status(400).json({ error: 'key is required' })

  const keyPattern = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/
  if (!keyPattern.test(key)) return res.status(200).json({ valid: false, reason: 'invalid_format' })

  const { data, error } = await supabase
    .from('access_keys').select('*').eq('key', key).single()

  if (error || !data) return res.status(200).json({ valid: false, reason: 'invalid_key' })

  if (data.used_at && !data.is_owner)
    return res.status(200).json({ valid: false, reason: 'already_activated' })

  if (data.expires_at && !data.is_owner && new Date() > new Date(data.expires_at))
    return res.status(200).json({ valid: false, reason: 'key_expired' })

  return res.status(200).json({ valid: true, isOwner: data.is_owner })
}

// ── VALIDATE REFERRAL ─────────────────────────────────────────────────────────
async function validateReferral({ code, email, course }, res) {
  if (!code) return res.status(200).json({ valid: false })

  const { data, error } = await supabase
    .from('agents')
    .select('id, name, referral_code, is_active')
    .eq('referral_code', code.trim().toUpperCase())
    .single()

  console.log('Referral lookup:', { code, course, data, error })

  if (error || !data || !data.is_active) return res.status(200).json({ valid: false })

  // Fraud protection: agent cannot use their own code
  if (email && data.email && data.email.toLowerCase().trim() === email.toLowerCase().trim()) {
    return res.status(200).json({ valid: false, reason: 'own_code' })
  }

  // Discount: ₱10 for TESDA, ₱20 for all board exam courses
  const discount = course === 'TESDA' ? 10 : 20

  return res.status(200).json({
    valid     : true,
    agentName : data.name,
    discount,
    agent     : data,
  })
}
