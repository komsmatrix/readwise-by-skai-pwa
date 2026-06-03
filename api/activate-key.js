// api/activate-key.js — Vercel serverless function
// Validates key, creates customer account, sends welcome email via Resend

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
)

const RESEND_API_KEY = process.env.RESEND_API_KEY
const APP_URL        = process.env.VITE_APP_URL || 'https://readwisebyskai.com'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { key, name, email } = req.body
  if (!key || !name || !email) return res.status(400).json({ error: 'Key, name and email required' })

  const keyPattern = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/
  if (!keyPattern.test(key)) return res.status(200).json({ success: false, reason: 'invalid_format' })

  try {
    // 1. Get the key entry
    const { data: keyEntry, error: keyError } = await supabase
      .from('access_keys')
      .select('*')
      .eq('key', key)
      .single()

    if (keyError || !keyEntry) return res.status(200).json({ success: false, reason: 'invalid_key' })
    if (keyEntry.used_at && !keyEntry.is_owner) return res.status(200).json({ success: false, reason: 'already_activated' })
    if (keyEntry.expires_at && !keyEntry.is_owner && new Date() > new Date(keyEntry.expires_at)) {
      return res.status(200).json({ success: false, reason: 'key_expired' })
    }

    // 2. Check if customer already exists (e.g. re-activating)
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single()

    let customer = existingCustomer

    // 3. Create customer if new
    if (!customer) {
      const { data: newCustomer, error: custError } = await supabase
        .from('customers')
        .insert({
          name        : name.trim(),
          email       : email.toLowerCase().trim(),
          key_used    : key,
          activated_at: new Date().toISOString(),
          is_active   : true,
        })
        .select()
        .single()

      if (custError) return res.status(200).json({ success: false, reason: 'error', error: custError.message })
      customer = newCustomer
    }

    // 4. Mark key as used (skip for owner keys)
    if (!keyEntry.is_owner) {
      await supabase
        .from('access_keys')
        .update({ used_at: new Date().toISOString(), activated_by: name.trim() })
        .eq('key', key)
    }

    // 5. Send welcome email via Resend
    try {
      await fetch('https://api.resend.com/emails', {
        method : 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type' : 'application/json',
        },
        body: JSON.stringify({
          from   : 'Readwise by Skai <hello@readwisebyskai.com>',
          reply_to: 'readwisebyskai@gmail.com',
          to     : [email.toLowerCase().trim()],
          subject: 'Welcome to Readwise by Skai! 📚',
          html   : `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; background: #f9f9f9; color: #1a1a1a;">
  <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 12px rgba(0,0,0,0.08);">
    <h1 style="font-size: 28px; color: #8B6914; margin: 0 0 8px;">Readwise by Skai</h1>
    <p style="color: #888; margin: 0 0 32px; font-size: 14px;">Your personal library app</p>

    <p style="font-size: 16px; margin: 0 0 16px;">Hi ${name.split(' ')[0]},</p>
    <p style="font-size: 15px; color: #555; line-height: 1.7; margin: 0 0 24px;">
      Thank you for your purchase! Your account has been activated. You can now access your personal library from any device.
    </p>

    <div style="background: #f5f3ef; border-radius: 8px; padding: 20px; margin: 0 0 24px;">
      <p style="margin: 0 0 8px; font-size: 13px; color: #888; text-transform: uppercase; letter-spacing: 0.06em;">Your library</p>
      <a href="${APP_URL}" style="display: inline-block; background: #8B6914; color: white; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 15px; font-weight: 500; margin-top: 8px;">
        Open Readwise by Skai →
      </a>
    </div>

    <p style="font-size: 14px; color: #555; line-height: 1.7; margin: 0 0 8px;">
      <strong>Your login email:</strong> ${email}
    </p>
    <p style="font-size: 13px; color: #888; line-height: 1.7; margin: 0 0 24px;">
      Use this email whenever you open the app. Your library, bookmarks, and reading progress are saved to your account.
    </p>

    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
    <p style="font-size: 13px; color: #aaa; line-height: 1.7; margin: 0;">
      Questions? Reply to this email and we'll help you out.<br>
      Happy reading! 📖
    </p>
  </div>
</body>
</html>
          `,
        }),
      })
    } catch (emailErr) {
      console.warn('Email send failed:', emailErr.message)
      // Non-fatal — customer still activated
    }

    return res.status(200).json({
      success   : true,
      customerId: customer.id,
      name      : customer.name,
      email     : customer.email,
      isOwner   : keyEntry.is_owner,
    })

  } catch (err) {
    console.error('Activation error:', err)
    return res.status(500).json({ success: false, reason: 'error', error: err.message })
  }
}
