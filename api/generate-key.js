// api/generate-key.js — Owner dashboard: generate a new key and send email
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
)

const RESEND_API_KEY  = process.env.RESEND_API_KEY
const OWNER_PASSWORD  = process.env.OWNER_PASSWORD  // set this in Vercel env vars
const GDRIVE_LINK     = process.env.VITE_GDRIVE_LINK || ''
const APP_URL         = process.env.VITE_APP_URL || 'https://readwise-by-skai.vercel.app'
const EXPIRY_DAYS     = 7

function generateKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const seg   = (len) => Array.from({ length: len }, () => chars[crypto.randomInt(chars.length)]).join('')
  return `${seg(4)}-${seg(4)}-${seg(4)}`
}

function addDays(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { name, email, password, isOwnerKey } = req.body

  // Verify owner password
  if (password !== OWNER_PASSWORD) return res.status(401).json({ error: 'Unauthorized' })
  if (!name || !email) return res.status(400).json({ error: 'Name and email required' })

  try {
    // Generate unique key
    let key, exists
    do {
      key = generateKey()
      const { data } = await supabase.from('access_keys').select('key').eq('key', key).single()
      exists = !!data
    } while (exists)

    const expiresAt = isOwnerKey ? null : addDays(EXPIRY_DAYS)

    // Save key to database
    const { error: keyError } = await supabase.from('access_keys').insert({
      key,
      name        : name.trim(),
      email       : email.toLowerCase().trim(),
      expires_at  : expiresAt,
      is_owner    : isOwnerKey || false,
      created_at  : new Date().toISOString(),
    })

    if (keyError) return res.status(500).json({ error: keyError.message })

    // Send email to customer
    const firstName   = name.trim().split(' ')[0]
    const expiryDate  = expiresAt
      ? new Date(expiresAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      : null

    try {
      await fetch('https://api.resend.com/emails', {
        method : 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type' : 'application/json',
        },
        body: JSON.stringify({
          from    : 'Readwise by Skai <onboarding@resend.dev>',
          reply_to: 'readwisebyskai@gmail.com',
          to      : [email.toLowerCase().trim()],
          subject : 'Your Readwise by Skai Access Key 📚',
          html    : `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; background: #f9f9f9; color: #1a1a1a;">
  <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 12px rgba(0,0,0,0.08);">
    <h1 style="font-size: 28px; color: #8B6914; margin: 0 0 8px;">Readwise by Skai</h1>
    <p style="color: #888; margin: 0 0 32px; font-size: 14px;">Your personal library app</p>

    <p style="font-size: 16px; margin: 0 0 16px;">Hi ${firstName},</p>
    <p style="font-size: 15px; color: #555; line-height: 1.7; margin: 0 0 24px;">
      Thank you for your purchase! Here is everything you need to get started.
    </p>

    <div style="background: #f5f3ef; border-radius: 8px; padding: 20px; margin: 0 0 20px;">
      <p style="margin: 0 0 8px; font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 0.06em;">Step 1 — Open the app</p>
      <a href="${APP_URL}" style="display: inline-block; background: #8B6914; color: white; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 15px; font-weight: 500;">
        Open Readwise by Skai →
      </a>
    </div>

    <div style="background: #f5f3ef; border-radius: 8px; padding: 20px; margin: 0 0 20px;">
      <p style="margin: 0 0 8px; font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 0.06em;">Step 2 — Your access key</p>
      <p style="font-size: 24px; font-weight: 700; color: #8B6914; letter-spacing: 0.1em; margin: 0; font-family: monospace;">${key}</p>
      ${expiryDate ? `<p style="font-size: 12px; color: #e05c5c; margin: 8px 0 0;">⚠ Activate before ${expiryDate}</p>` : ''}
    </div>

    <div style="background: #f5f3ef; border-radius: 8px; padding: 20px; margin: 0 0 24px;">
      <p style="margin: 0 0 8px; font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 0.06em;">Step 3 — Activate</p>
      <p style="font-size: 14px; color: #555; margin: 0; line-height: 1.7;">
        1. Enter your full name: <strong>${name.trim()}</strong><br>
        2. Enter your email: <strong>${email.toLowerCase().trim()}</strong><br>
        3. Enter your access key above<br>
        4. Click "Unlock my library"
      </p>
    </div>

    <p style="font-size: 13px; color: #888; line-height: 1.7; margin: 0 0 16px;">
      Your access is <strong>lifetime</strong> once activated. Works on any device — phone, tablet, laptop.
    </p>

    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
    <p style="font-size: 13px; color: #aaa; margin: 0;">
      Questions? Reply to this email.<br>Happy reading! 📖
    </p>
  </div>
</body>
</html>
          `,
        }),
      })
    } catch (emailErr) {
      console.warn('Email failed:', emailErr.message)
    }

    return res.status(200).json({
      success  : true,
      key,
      expiresAt,
      emailSent: true,
    })

  } catch (err) {
    console.error('Generate key error:', err)
    return res.status(500).json({ error: err.message })
  }
}
