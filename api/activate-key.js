// api/activate-key.js
import { createClient } from '@supabase/supabase-js'

const supabase      = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
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
          to      : [emailClean],
          subject : "You're in — your Readwise by Skai access is ready",
          html    : `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0d0d0d;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;padding:40px 20px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
<tr><td style="background:#161616;border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:40px;">
  <p style="margin:0 0 6px;font-size:24px;font-weight:700;color:#f0ede8;">You're in, \${name.split(' ')[0]}. 🎓</p>
  <p style="margin:0 0 28px;font-size:15px;color:#9a9690;line-height:1.7;">Your account is active. Your board exam prep starts now.</p>
  <div style="height:1px;background:rgba(255,255,255,0.07);margin:0 0 28px;"></div>
  <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#c9a96e;text-transform:uppercase;letter-spacing:0.08em;">Log in with your email</p>
  <div style="background:#0d0d0d;border:1px solid rgba(201,169,110,0.25);border-radius:10px;padding:14px 18px;margin-bottom:20px;">
    <p style="margin:0;font-size:14px;color:#c9a96e;font-family:monospace;">\${emailClean}</p>
  </div>
  <a href="\${APP_URL}" style="display:block;background:#c9a96e;color:#0d0d0d;text-decoration:none;padding:14px;border-radius:8px;font-size:15px;font-weight:700;text-align:center;margin-bottom:28px;">Open Readwise by Skai →</a>
  <div style="height:1px;background:rgba(255,255,255,0.07);margin:0 0 20px;"></div>
  <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#c9a96e;text-transform:uppercase;letter-spacing:0.08em;">🎁 Your Referral Code</p>
  <div style="background:#0d0d0d;border:1px solid rgba(201,169,110,0.2);border-radius:10px;padding:14px 18px;margin-bottom:20px;">
    <p style="margin:0 0 4px;font-size:26px;color:#c9a96e;font-family:monospace;font-weight:700;letter-spacing:0.1em;">\${customerCode}</p>
    <p style="margin:0;font-size:12px;color:#6b6560;">Share this — friends get ₱10 off, and you help them pass.</p>
  </div>
  <div style="background:rgba(201,169,110,0.06);border:1px solid rgba(201,169,110,0.15);border-radius:10px;padding:14px 16px;">
    <p style="margin:0;font-size:13px;color:#9a9690;line-height:1.7;">You joined at the <strong style="color:#c9a96e;">introductory price of ₱\${INTRO_PRICE}</strong> — lifetime access, all future updates included. Study consistently and your Readiness Score will reflect it. Pasado ka nito. 💪</p>
  </div>
</td></tr>
<tr><td style="padding:20px 0 0;text-align:center;">
  <p style="margin:0;font-size:12px;color:#5a5753;">Questions? Reply to this email — we read every one.</p>
</td></tr>
</table>
</td></tr>
</table>
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
