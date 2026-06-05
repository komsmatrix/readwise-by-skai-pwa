// api/paymongo-webhook.js — Handles PayMongo payment success webhook
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
)

const RESEND_API_KEY      = process.env.RESEND_API_KEY
const WEBHOOK_SECRET      = process.env.PAYMONGO_WEBHOOK_SECRET
const APP_URL             = process.env.VITE_APP_URL || 'https://readwisebyskai.com'
const EXPIRY_DAYS         = 7
const AGENT_COMMISSION    = 5000 // ₱50 in centavos

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

function welcomeEmail({ firstName, name, email, key, expiresAt, appUrl }) {
  const expiryDate = expiresAt
    ? new Date(expiresAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : null

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0d0d0d;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr><td style="padding:0 0 32px 0;">
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="padding-right:12px;vertical-align:middle;">
              <div style="width:40px;height:40px;background:rgba(201,169,110,0.15);border-radius:10px;text-align:center;line-height:40px;">
                <span style="color:#c9a96e;font-size:20px;">📖</span>
              </div>
            </td>
            <td style="vertical-align:middle;">
              <div style="font-size:18px;font-weight:600;color:#f0ede8;">Readwise by Skai</div>
              <div style="font-size:11px;color:#c9a96e;letter-spacing:0.08em;text-transform:uppercase;margin-top:2px;">Your Personal Reading Space</div>
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="background:#161616;border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:40px;">
          <p style="margin:0 0 8px;font-size:22px;font-weight:600;color:#f0ede8;">Welcome, ${firstName}! 👋</p>
          <p style="margin:0 0 28px;font-size:15px;color:#9a9690;line-height:1.7;">Thank you for your purchase! Your lifetime access to Readwise by Skai is ready.</p>
          <div style="height:1px;background:rgba(255,255,255,0.07);margin:0 0 28px;"></div>

          <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:20px;"><tr>
            <td style="vertical-align:top;padding-right:14px;width:28px;">
              <div style="width:26px;height:26px;background:rgba(201,169,110,0.12);border:1px solid rgba(201,169,110,0.25);border-radius:50%;text-align:center;line-height:26px;font-size:12px;font-weight:700;color:#c9a96e;">1</div>
            </td>
            <td>
              <p style="margin:0 0 10px;font-size:11px;font-weight:600;color:#c9a96e;text-transform:uppercase;letter-spacing:0.08em;">Open the App</p>
              <a href="${appUrl}" style="display:inline-block;background:#c9a96e;color:#0d0d0d;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">Open Readwise by Skai →</a>
            </td>
          </tr></table>

          <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:20px;"><tr>
            <td style="vertical-align:top;padding-right:14px;width:28px;">
              <div style="width:26px;height:26px;background:rgba(201,169,110,0.12);border:1px solid rgba(201,169,110,0.25);border-radius:50%;text-align:center;line-height:26px;font-size:12px;font-weight:700;color:#c9a96e;">2</div>
            </td>
            <td>
              <p style="margin:0 0 10px;font-size:11px;font-weight:600;color:#c9a96e;text-transform:uppercase;letter-spacing:0.08em;">Your Access Key</p>
              <div style="background:#0d0d0d;border:1px solid rgba(201,169,110,0.3);border-radius:10px;padding:16px 20px;">
                <p style="margin:0 0 6px;font-family:'Courier New',monospace;font-size:26px;font-weight:700;color:#c9a96e;letter-spacing:0.12em;">${key}</p>
                ${expiryDate ? `<p style="margin:0;font-size:12px;color:#e05c5c;">⚠ Activate before ${expiryDate}</p>` : ''}
              </div>
            </td>
          </tr></table>

          <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:28px;"><tr>
            <td style="vertical-align:top;padding-right:14px;width:28px;">
              <div style="width:26px;height:26px;background:rgba(201,169,110,0.12);border:1px solid rgba(201,169,110,0.25);border-radius:50%;text-align:center;line-height:26px;font-size:12px;font-weight:700;color:#c9a96e;">3</div>
            </td>
            <td>
              <p style="margin:0 0 10px;font-size:11px;font-weight:600;color:#c9a96e;text-transform:uppercase;letter-spacing:0.08em;">Activate</p>
              <div style="background:#0d0d0d;border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:16px 20px;">
                <table cellpadding="0" cellspacing="0">
                  <tr><td style="padding:3px 8px 3px 0;font-size:13px;color:#9a9690;">①</td><td style="padding:3px 0;font-size:13px;color:#9a9690;">Name: <span style="color:#f0ede8;font-weight:500;">${name}</span></td></tr>
                  <tr><td style="padding:3px 8px 3px 0;font-size:13px;color:#9a9690;">②</td><td style="padding:3px 0;font-size:13px;color:#9a9690;">Email: <span style="color:#f0ede8;font-weight:500;">${email}</span></td></tr>
                  <tr><td style="padding:3px 8px 3px 0;font-size:13px;color:#9a9690;">③</td><td style="padding:3px 0;font-size:13px;color:#9a9690;">Enter the key above</td></tr>
                  <tr><td style="padding:3px 8px 3px 0;font-size:13px;color:#9a9690;">④</td><td style="padding:3px 0;font-size:13px;color:#9a9690;">Tap <span style="color:#c9a96e;font-weight:500;">"Unlock my library"</span></td></tr>
                </table>
              </div>
            </td>
          </tr></table>

          <div style="height:1px;background:rgba(255,255,255,0.07);margin:0 0 24px;"></div>
          <p style="margin:0 0 14px;font-size:11px;font-weight:600;color:#c9a96e;text-transform:uppercase;letter-spacing:0.08em;">Quick Guide</p>
          <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:24px;">
            <tr>
              <td style="width:50%;padding:0 6px 8px 0;vertical-align:top;">
                <div style="background:#0d0d0d;border:1px solid rgba(255,255,255,0.07);border-radius:8px;padding:14px;">
                  <p style="margin:0 0 4px;font-size:16px;">📚</p>
                  <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#f0ede8;">Library</p>
                  <p style="margin:0;font-size:12px;color:#5a5753;line-height:1.5;">Browse and open any book</p>
                </div>
              </td>
              <td style="width:50%;padding:0 0 8px 6px;vertical-align:top;">
                <div style="background:#0d0d0d;border:1px solid rgba(255,255,255,0.07);border-radius:8px;padding:14px;">
                  <p style="margin:0 0 4px;font-size:16px;">🔊</p>
                  <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#f0ede8;">Text to Speech</p>
                  <p style="margin:0;font-size:12px;color:#5a5753;line-height:1.5;">Let the app read to you</p>
                </div>
              </td>
            </tr>
            <tr>
              <td style="width:50%;padding:0 6px 0 0;vertical-align:top;">
                <div style="background:#0d0d0d;border:1px solid rgba(255,255,255,0.07);border-radius:8px;padding:14px;">
                  <p style="margin:0 0 4px;font-size:16px;">🔖</p>
                  <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#f0ede8;">Bookmarks</p>
                  <p style="margin:0;font-size:12px;color:#5a5753;line-height:1.5;">Save your page anytime</p>
                </div>
              </td>
              <td style="width:50%;padding:0 0 0 6px;vertical-align:top;">
                <div style="background:#0d0d0d;border:1px solid rgba(255,255,255,0.07);border-radius:8px;padding:14px;">
                  <p style="margin:0 0 4px;font-size:16px;">📱</p>
                  <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#f0ede8;">Install as App</p>
                  <p style="margin:0;font-size:12px;color:#5a5753;line-height:1.5;">Add to home screen</p>
                </div>
              </td>
            </tr>
          </table>

          <div style="background:rgba(201,169,110,0.06);border:1px solid rgba(201,169,110,0.15);border-radius:8px;padding:14px 16px;margin-bottom:10px;">
            <p style="margin:0;font-size:13px;color:#9a9690;line-height:1.7;">🔥 You joined at the <span style="color:#c9a96e;font-weight:600;">introductory price of ₱249</span> — regular price is ₱399. You locked in lifetime access at the best price.</p>
          </div>
          <div style="background:rgba(160,112,208,0.06);border:1px solid rgba(160,112,208,0.2);border-radius:8px;padding:14px 16px;margin-bottom:10px;">
            <p style="margin:0;font-size:13px;color:#9a9690;line-height:1.7;">📣 <span style="color:#a070d0;font-weight:600;">Community is coming</span> — book discussions, reading lists, connecting with fellow readers. As a founding member, you get early access. 🚀</p>
          </div>
          <div style="background:rgba(201,169,110,0.06);border:1px solid rgba(201,169,110,0.15);border-radius:8px;padding:14px 16px;">
            <p style="margin:0;font-size:13px;color:#9a9690;line-height:1.7;">Your access is <span style="color:#c9a96e;font-weight:600;">lifetime</span> — works on any device. New books are added regularly and appear in your library automatically.</p>
          </div>
        </td></tr>
        <tr><td style="padding:24px 0 0;text-align:center;">
          <p style="margin:0 0 6px;font-size:12px;color:#5a5753;">Questions? Reply to this email.</p>
          <p style="margin:0;font-size:12px;color:#3a3835;">Happy reading! 📖 — Readwise by Skai</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    // Verify webhook signature
    const signature = req.headers['paymongo-signature']
    if (WEBHOOK_SECRET && signature) {
      const [tPart, tePart] = signature.split(',')
      const t  = tPart?.split('=')?.[1]
      const te = tePart?.split('=')?.[1]
      const rawBody = JSON.stringify(req.body)
      const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET).update(`${t}.${rawBody}`).digest('hex')
      if (hmac !== te) return res.status(401).json({ error: 'Invalid signature' })
    }

    const event = req.body?.data?.attributes
    const type  = event?.type

    if (type !== 'checkout_session.payment.paid') {
      return res.status(200).json({ received: true })
    }

    const session  = event?.data?.attributes
    const metadata = session?.metadata || {}
    const billing  = session?.billing  || {}

    const name         = metadata.customer_name  || billing.name  || 'Customer'
    const email        = metadata.customer_email || billing.email || ''
    const agentId      = metadata.agent_id       || null
    const referralCode = metadata.referral_code  || null
    const amountPaid   = metadata.final_price    || 24900  // centavos

    if (!email) return res.status(400).json({ error: 'No email in payment data' })

    // Generate unique key
    let key, exists
    do {
      key = generateKey()
      const { data } = await supabase.from('access_keys').select('key').eq('key', key).single()
      exists = !!data
    } while (exists)

    const expiresAt = addDays(EXPIRY_DAYS)

    // Save key
    await supabase.from('access_keys').insert({
      key,
      name      : name.trim(),
      email     : email.toLowerCase().trim(),
      expires_at: expiresAt,
      is_owner  : false,
      created_at: new Date().toISOString(),
    })

    // Save customer — now includes amount_paid and referral_code
    await supabase.from('customers').insert({
      name         : name.trim(),
      email        : email.toLowerCase().trim(),
      key_used     : key,
      is_active    : true,
      activated_at : new Date().toISOString(),
      amount_paid  : Math.round(amountPaid / 100),
      referral_code: referralCode || null,
    }).onConflict('email').merge()

    // Record agent sale if applicable
    if (agentId) {
      await supabase.from('agent_sales').insert({
        agent_id      : agentId,
        customer_name : name.trim(),
        customer_email: email.toLowerCase().trim(),
        amount_paid   : Math.round(amountPaid / 100),
        commission    : AGENT_COMMISSION / 100,
        referral_code : referralCode,
        created_at    : new Date().toISOString(),
        is_paid       : false,
      })
    }

    // Send welcome email
    const firstName = name.trim().split(' ')[0]
    await fetch('https://api.resend.com/emails', {
      method : 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type' : 'application/json',
      },
      body: JSON.stringify({
        from    : 'Readwise by Skai <hello@readwisebyskai.com>',
        reply_to: 'readwisebyskai@gmail.com',
        to      : [email.toLowerCase().trim()],
        subject : '📖 Your Readwise by Skai Access is Ready',
        html    : welcomeEmail({ firstName, name: name.trim(), email: email.toLowerCase().trim(), key, expiresAt, appUrl: APP_URL }),
      }),
    })

    return res.status(200).json({ success: true })

  } catch (err) {
    console.error('Webhook error:', err)
    return res.status(500).json({ error: err.message })
  }
}
