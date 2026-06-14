import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const RESEND_API_KEY   = process.env.RESEND_API_KEY
const APP_URL          = process.env.VITE_APP_URL || 'https://readwisebyskai.com'
const AGENT_COMMISSION = 50

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

function welcomeEmail({ firstName, name, email, key, appUrl }) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0d0d0d;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr><td style="background:#161616;border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:40px;">
          <p style="margin:0 0 8px;font-size:22px;font-weight:600;color:#f0ede8;">Welcome, ${firstName}!</p>
          <p style="margin:0 0 28px;font-size:15px;color:#9a9690;line-height:1.7;">Your access to Readwise by Skai — Board Exam Operating System — is ready.</p>
          <div style="height:1px;background:rgba(255,255,255,0.07);margin:0 0 28px;"></div>

          <p style="margin:0 0 10px;font-size:11px;font-weight:600;color:#c9a96e;text-transform:uppercase;letter-spacing:0.08em;">Your Access Key</p>
          <div style="background:#0d0d0d;border:1px solid rgba(201,169,110,0.3);border-radius:10px;padding:16px 20px;margin-bottom:28px;">
            <p style="margin:0;font-family:'Courier New',monospace;font-size:26px;font-weight:700;color:#c9a96e;letter-spacing:0.12em;">${key}</p>
          </div>

          <p style="margin:0 0 10px;font-size:11px;font-weight:600;color:#c9a96e;text-transform:uppercase;letter-spacing:0.08em;">How to activate</p>
          <div style="background:#0d0d0d;border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:16px 20px;margin-bottom:28px;">
            <p style="margin:0 0 6px;font-size:13px;color:#9a9690;">① Go to <a href="${appUrl}" style="color:#c9a96e;">${appUrl}</a></p>
            <p style="margin:0 0 6px;font-size:13px;color:#9a9690;">② Click New Customer</p>
            <p style="margin:0 0 6px;font-size:13px;color:#9a9690;">③ Enter: <span style="color:#f0ede8;">${name}</span> · <span style="color:#f0ede8;">${email}</span></p>
            <p style="margin:0;font-size:13px;color:#9a9690;">④ Enter the key above and tap Activate</p>
          </div>

          <a href="${appUrl}" style="display:block;background:#c9a96e;color:#0d0d0d;text-decoration:none;padding:14px 24px;border-radius:8px;font-size:15px;font-weight:700;text-align:center;">Open Readwise by Skai →</a>

          <div style="height:1px;background:rgba(255,255,255,0.07);margin:28px 0;"></div>
          <p style="margin:0;font-size:12px;color:#5a5753;text-align:center;">Questions? Reply to this email. — Readwise by Skai</p>
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
    console.log('Webhook received:', JSON.stringify(req.body).slice(0, 200))

    const event = req.body?.data?.attributes
    const type  = event?.type

    if (type !== 'checkout_session.payment.paid') {
      return res.status(200).json({ received: true })
    }

    const session      = event?.data?.attributes
    const metadata     = session?.metadata || {}
    const billing      = session?.billing  || {}

    const name         = metadata.customer_name  || billing.name  || 'Student'
    const email        = metadata.customer_email || billing.email || ''
    const agentId      = metadata.agent_id       || null
    const referralCode = metadata.referral_code  || null
    const amountPaid   = metadata.final_price    || 24900

    console.log('Payment data:', { name, email, agentId, referralCode, amountPaid })

    if (!email) return res.status(400).json({ error: 'No email in payment data' })

    const key       = generateKey()
    const expiresAt = addDays(30)

    await supabase.from('access_keys').insert({
      key,
      name      : name.trim(),
      email     : email.toLowerCase().trim(),
      expires_at: expiresAt,
      is_owner  : false,
      created_at: new Date().toISOString(),
    })

    await supabase.from('customers').upsert({
      name         : name.trim(),
      email        : email.toLowerCase().trim(),
      key_used     : key,
      is_active    : true,
      activated_at : new Date().toISOString(),
      amount_paid  : Math.round(amountPaid / 100),
      referral_code: referralCode || null,
    }, { onConflict: 'email' })

    if (agentId) {
      await supabase.from('agents')
        .update({
          total_referrals  : supabase.rpc('increment', { x: 1 }),
          total_commission : supabase.rpc('increment', { x: AGENT_COMMISSION }),
        })
        .eq('id', agentId)
    }

    const firstName = name.trim().split(' ')[0]
    const emailRes  = await fetch('https://api.resend.com/emails', {
      method : 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type' : 'application/json',
      },
      body: JSON.stringify({
        from   : 'Readwise by Skai <hello@readwisebyskai.com>',
        to     : [email.toLowerCase().trim()],
        subject: 'Your Readwise by Skai access key',
        html   : welcomeEmail({ firstName, name: name.trim(), email: email.toLowerCase().trim(), key, appUrl: APP_URL }),
      }),
    })

    console.log('Email sent:', emailRes.status)
    return res.status(200).json({ success: true })

  } catch (err) {
    console.error('Webhook error:', err)
    return res.status(500).json({ error: err.message })
  }
}
