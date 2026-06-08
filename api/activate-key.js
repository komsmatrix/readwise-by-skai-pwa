// api/activate-key.js
import { createClient } from '@supabase/supabase-js'

const supabase      = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE)
const RESEND_API_KEY = process.env.RESEND_API_KEY
const APP_URL        = process.env.VITE_APP_URL || 'https://readwisebyskai.com'
const INTRO_PRICE    = 249
const REGULAR_PRICE  = 399

// Generate a customer referral code from their name
function generateCustomerCode(name) {
  const base = name.trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5) || 'SHARE'
  const num  = Math.floor(10 + Math.random() * 90)
  return `${base}${num}`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { name, email, key } = req.body
  if (!name || !email || !key) return res.status(400).json({ success: false, reason: 'missing_fields' })

  const keyPattern = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/
  if (!keyPattern.test(key)) return res.status(200).json({ success: false, reason: 'invalid_format' })

  try {
    // 1. Get key
    const { data: keyEntry, error: keyError } = await supabase
      .from('access_keys').select('*').eq('key', key).single()
    if (keyError || !keyEntry) return res.status(200).json({ success: false, reason: 'invalid_key' })

    // 2. Check expiry
    if (!keyEntry.is_owner && keyEntry.expires_at) {
      if (new Date(keyEntry.expires_at) < new Date()) {
        return res.status(200).json({ success: false, reason: 'expired' })
      }
    }

    // 3. Check if already used by someone else
    const emailClean = email.toLowerCase().trim()
    const { data: existingByKey } = await supabase
      .from('customers').select('email').eq('key_used', key).single()
    if (existingByKey && existingByKey.email !== emailClean) {
      return res.status(200).json({ success: false, reason: 'key_already_used' })
    }

    // 4. Upsert customer
    const { data: existing } = await supabase
      .from('customers').select('*').eq('email', emailClean).single()

    let customerCode = existing?.referral_code
    if (!customerCode) {
      // Generate unique customer referral code
      let tries = 0
      do {
        customerCode = generateCustomerCode(name)
        const { data: taken } = await supabase
          .from('customers').select('id').eq('referral_code', customerCode).single()
        if (!taken) break
        tries++
      } while (tries < 10)
    }

    const customerData = {
      name        : name.trim(),
      email       : emailClean,
      key_used    : key,
      is_active   : true,
      activated_at: new Date().toISOString(),
      referral_code: customerCode,
    }

    if (existing) {
      await supabase.from('customers').update(customerData).eq('email', emailClean)
    } else {
      await supabase.from('customers').insert(customerData)
    }

    // Get the customer ID (re-fetch to ensure we have it)
    const { data: savedCustomer } = await supabase
      .from('customers').select('id').eq('email', emailClean).single()
    const customerId = savedCustomer?.id || existing?.id || null

    // 5. Mark key as used
    if (!keyEntry.is_owner) {
      await supabase.from('access_keys')
        .update({ used_at: new Date().toISOString(), activated_by: name.trim() })
        .eq('key', key)
    }

    // 6. Send welcome email
    try {
      await fetch('https://api.resend.com/emails', {
        method : 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body   : JSON.stringify({
          from    : 'Readwise by Skai <hello@readwisebyskai.com>',
          reply_to: 'readwisebyskai@gmail.com',
          to      : [emailClean],
          subject : '📚 Welcome to Readwise by Skai — You\'re In!',
          html    : `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 20px;background:#f5f3ef;color:#1a1a1a;">
<div style="background:#0d0d0d;border-radius:16px;padding:40px 36px;border:1px solid #2a2a2a;">

  <h1 style="font-size:26px;color:#c9a96e;margin:0 0 4px;font-family:Georgia,serif;">Readwise by Skai</h1>
  <p style="color:#666;margin:0 0 32px;font-size:13px;letter-spacing:0.05em;text-transform:uppercase;">Your Personal Reading Space</p>

  <p style="font-size:16px;color:#f0ede8;margin:0 0 12px;">Hi ${name.split(' ')[0]}! 👋</p>
  <p style="font-size:15px;color:#b0a898;line-height:1.7;margin:0 0 24px;">
    Welcome! Your account is activated and your reading space is ready. Upload your own books, explore the growing library of classics, and start reading beautifully.
  </p>

  <div style="text-align:center;margin:0 0 28px;">
    <a href="${APP_URL}" style="display:inline-block;background:#c9a96e;color:#0d0d0d;text-decoration:none;padding:14px 36px;border-radius:99px;font-size:15px;font-weight:700;letter-spacing:0.01em;">
      Open My Reading Space →
    </a>
  </div>

  <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;padding:18px 20px;margin:0 0 24px;">
    <p style="margin:0 0 6px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.08em;">Your login email</p>
    <p style="margin:0;font-size:14px;color:#c9a96e;font-family:monospace;">${emailClean}</p>
    <p style="margin:8px 0 0;font-size:12px;color:#666;">Use this email every time you open the app.</p>
  </div>

  <div style="background:#1a1a1a;border:1px solid rgba(201,169,110,0.2);border-radius:10px;padding:18px 20px;margin:0 0 24px;">
    <p style="margin:0 0 6px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.08em;">🎁 Your Friend Referral Code</p>
    <p style="margin:0 0 6px;font-size:28px;color:#c9a96e;font-family:monospace;font-weight:700;letter-spacing:0.1em;">${customerCode}</p>
    <p style="margin:0;font-size:13px;color:#b0a898;line-height:1.6;">
      Share this code with friends — they get <strong style="color:#f0ede8;">₱10 off</strong> when they sign up at <a href="${APP_URL}/buy" style="color:#c9a96e;text-decoration:none;">readwisebyskai.com/buy</a>. It's your way of sharing something you love. ❤️
    </p>
  </div>

  <div style="background:rgba(201,169,110,0.06);border:1px solid rgba(201,169,110,0.15);border-radius:10px;padding:16px 20px;margin:0 0 24px;">
    <p style="margin:0 0 6px;font-size:13px;color:#c9a96e;font-weight:600;">🔥 You joined at the introductory price of ₱${INTRO_PRICE}</p>
    <p style="margin:0;font-size:13px;color:#888;line-height:1.6;">The regular price is ₱${REGULAR_PRICE}. You locked in lifetime access at the best price — great call.</p>
  </div>

  <div style="background:rgba(160,112,208,0.06);border:1px solid rgba(160,112,208,0.2);border-radius:10px;padding:16px 20px;margin:0 0 28px;">
    <p style="margin:0 0 4px;font-size:13px;color:#a070d0;font-weight:600;">📣 Community is coming</p>
    <p style="margin:0;font-size:13px;color:#888;line-height:1.6;">We're building a reading community — book discussions, reading lists, and connecting with fellow readers. As a founding member, you'll get early access. 🚀</p>
  </div>

  <hr style="border:none;border-top:1px solid #2a2a2a;margin:0 0 20px;">
  <p style="font-size:13px;color:#555;margin:0;">Questions? Just reply to this email — Kyle reads every message personally.<br>Happy reading! 📖</p>
</div>
</body>
</html>`
        }),
      })
    } catch (emailErr) {
      console.warn('Email send failed:', emailErr.message)
    }

    return res.status(200).json({
      success      : true,
      customerId,
      name         : name.trim(),
      email        : emailClean,
      referral_code: customerCode,
      is_owner     : keyEntry.is_owner || false,
    })
  } catch (err) {
    console.error('Activate key error:', err)
    return res.status(500).json({ success: false, reason: 'server_error' })
  }
}
