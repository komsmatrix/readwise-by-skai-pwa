// api/generate-key.js — Owner dashboard: generate a new key and send email
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const RESEND_API_KEY  = process.env.RESEND_API_KEY
const OWNER_PASSWORD  = process.env.OWNER_PASSWORD
const APP_URL         = process.env.VITE_APP_URL || 'https://readwisebyskai.com'
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

function emailTemplate({ firstName, name, email, key, expiresAt, appUrl }) {
  const expiryDate = expiresAt
    ? new Date(expiresAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : null

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Readwise by Skai Access</title>
</head>
<body style="margin:0;padding:0;background:#0d0d0d;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="padding:0 0 32px 0;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-right:12px;vertical-align:middle;">
                    <div style="width:40px;height:40px;background:rgba(201,169,110,0.15);border-radius:10px;display:inline-block;text-align:center;line-height:40px;">
                      <span style="color:#c9a96e;font-size:20px;">📖</span>
                    </div>
                  </td>
                  <td style="vertical-align:middle;">
                    <div style="font-size:18px;font-weight:600;color:#f0ede8;letter-spacing:-0.02em;">Readwise by Skai</div>
                    <div style="font-size:11px;color:#c9a96e;letter-spacing:0.08em;text-transform:uppercase;margin-top:2px;">Board Exam Operating System</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main card -->
          <tr>
            <td style="background:#161616;border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:40px;">

              <!-- Greeting -->
              <p style="margin:0 0 8px;font-size:22px;font-weight:600;color:#f0ede8;letter-spacing:-0.02em;">Welcome, ${firstName}! 👋</p>
              <p style="margin:0 0 32px;font-size:15px;color:#9a9690;line-height:1.7;">
                Thank you for your purchase. Your lifetime access to Readwise by Skai is ready. Here's everything you need to get started.
              </p>

              <!-- Divider -->
              <div style="height:1px;background:rgba(255,255,255,0.07);margin:0 0 28px;"></div>

              <!-- Step 1 -->
              <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:20px;">
                <tr>
                  <td style="vertical-align:top;padding-right:14px;width:28px;">
                    <div style="width:26px;height:26px;background:rgba(201,169,110,0.12);border:1px solid rgba(201,169,110,0.25);border-radius:50%;text-align:center;line-height:26px;font-size:12px;font-weight:700;color:#c9a96e;">1</div>
                  </td>
                  <td>
                    <p style="margin:0 0 10px;font-size:11px;font-weight:600;color:#c9a96e;text-transform:uppercase;letter-spacing:0.08em;">Open the App</p>
                    <a href="${appUrl}" style="display:inline-block;background:#c9a96e;color:#0d0d0d;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;letter-spacing:0.01em;">
                      Open Readwise by Skai →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Step 2 -->
              <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:20px;">
                <tr>
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
                </tr>
              </table>

              <!-- Step 3 -->
              <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:28px;">
                <tr>
                  <td style="vertical-align:top;padding-right:14px;width:28px;">
                    <div style="width:26px;height:26px;background:rgba(201,169,110,0.12);border:1px solid rgba(201,169,110,0.25);border-radius:50%;text-align:center;line-height:26px;font-size:12px;font-weight:700;color:#c9a96e;">3</div>
                  </td>
                  <td>
                    <p style="margin:0 0 10px;font-size:11px;font-weight:600;color:#c9a96e;text-transform:uppercase;letter-spacing:0.08em;">Activate Your Account</p>
                    <div style="background:#0d0d0d;border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:16px 20px;">
                      <table cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding:4px 0;font-size:13px;color:#9a9690;padding-right:8px;">①</td>
                          <td style="padding:4px 0;font-size:13px;color:#9a9690;">Enter your name: <span style="color:#f0ede8;font-weight:500;">${name}</span></td>
                        </tr>
                        <tr>
                          <td style="padding:4px 0;font-size:13px;color:#9a9690;padding-right:8px;">②</td>
                          <td style="padding:4px 0;font-size:13px;color:#9a9690;">Enter your email: <span style="color:#f0ede8;font-weight:500;">${email}</span></td>
                        </tr>
                        <tr>
                          <td style="padding:4px 0;font-size:13px;color:#9a9690;padding-right:8px;">③</td>
                          <td style="padding:4px 0;font-size:13px;color:#9a9690;">Enter the access key above</td>
                        </tr>
                        <tr>
                          <td style="padding:4px 0;font-size:13px;color:#9a9690;padding-right:8px;">④</td>
                          <td style="padding:4px 0;font-size:13px;color:#9a9690;">Tap <span style="color:#c9a96e;font-weight:500;">"Open Readwise by Skai"</span></td>
                        </tr>
                      </table>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <div style="height:1px;background:rgba(255,255,255,0.07);margin:0 0 24px;"></div>

              <!-- Quick guide -->
              <p style="margin:0 0 14px;font-size:11px;font-weight:600;color:#c9a96e;text-transform:uppercase;letter-spacing:0.08em;">What Readwise does for you</p>
              <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:28px;">
                <tr>
                  <td style="width:50%;padding:0 8px 10px 0;vertical-align:top;">
                    <div style="background:#0d0d0d;border:1px solid rgba(255,255,255,0.07);border-radius:8px;padding:14px;">
                      <p style="margin:0 0 4px;font-size:16px;">🎯</p>
                      <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#f0ede8;">Tells you what to study</p>
                      <p style="margin:0;font-size:12px;color:#5a5753;line-height:1.5;">Next Best Action updates every session based on your gaps</p>
                    </div>
                  </td>
                  <td style="width:50%;padding:0 0 10px 8px;vertical-align:top;">
                    <div style="background:#0d0d0d;border:1px solid rgba(255,255,255,0.07);border-radius:8px;padding:14px;">
                      <p style="margin:0 0 4px;font-size:16px;">🧠</p>
                      <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#f0ede8;">Remembers what you forget</p>
                      <p style="margin:0;font-size:12px;color:#5a5753;line-height:1.5;">Spaced repetition surfaces cards before you forget them</p>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="width:50%;padding:0 8px 0 0;vertical-align:top;">
                    <div style="background:#0d0d0d;border:1px solid rgba(255,255,255,0.07);border-radius:8px;padding:14px;">
                      <p style="margin:0 0 4px;font-size:16px;">📊</p>
                      <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#f0ede8;">Predicts if you'll pass</p>
                      <p style="margin:0;font-size:12px;color:#5a5753;line-height:1.5;">Readiness Score updates after every session</p>
                    </div>
                  </td>
                  <td style="width:50%;padding:0 0 0 8px;vertical-align:top;">
                    <div style="background:#0d0d0d;border:1px solid rgba(255,255,255,0.07);border-radius:8px;padding:14px;">
                      <p style="margin:0 0 4px;font-size:16px;">💬</p>
                      <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#f0ede8;">Coaches you daily</p>
                      <p style="margin:0;font-size:12px;color:#5a5753;line-height:1.5;">Coach Insights find your weak spots and tell you what to do</p>
                    </div>
                  </td>
                </tr>
              </table>

              <div style="background:rgba(201,169,110,0.06);border:1px solid rgba(201,169,110,0.15);border-radius:8px;padding:14px 16px;margin-bottom:12px;">
                <p style="margin:0;font-size:13px;color:#9a9690;line-height:1.7;">
                  🔥 You joined at the <span style="color:#c9a96e;font-weight:600;">introductory price of ₱249</span> — lifetime access, all future updates included.
                </p>
              </div>
              <div style="background:rgba(201,169,110,0.06);border:1px solid rgba(201,169,110,0.15);border-radius:8px;padding:14px 16px;">
                <p style="margin:0;font-size:13px;color:#9a9690;line-height:1.7;">
                  Study consistently and your Readiness Score will reflect it. <span style="color:#c9a96e;font-weight:600;">Pasado ka nito. 💪</span>
                </p>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 0 0;text-align:center;">
              <p style="margin:0 0 6px;font-size:12px;color:#5a5753;">Questions? Reply to this email — we're happy to help.</p>
              <p style="margin:0;font-size:12px;color:#3a3835;">Happy reading! 📖 — Readwise by Skai</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { name, email, password, isOwnerKey } = req.body

  if (password !== OWNER_PASSWORD) return res.status(401).json({ error: 'Unauthorized' })
  if (!name || !email) return res.status(400).json({ error: 'Name and email required' })

  try {
    let key, exists
    do {
      key = generateKey()
      const { data } = await supabase.from('access_keys').select('key').eq('key', key).single()
      exists = !!data
    } while (exists)

    const expiresAt = isOwnerKey ? null : addDays(EXPIRY_DAYS)

    const { error: keyError } = await supabase.from('access_keys').insert({
      key,
      name        : name.trim(),
      email       : email.toLowerCase().trim(),
      expires_at  : expiresAt,
      is_owner    : isOwnerKey || false,
      created_at  : new Date().toISOString(),
    })

    if (keyError) return res.status(500).json({ error: keyError.message })

    const firstName = name.trim().split(' ')[0]

    try {
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
          html    : emailTemplate({ firstName, name: name.trim(), email: email.toLowerCase().trim(), key, expiresAt, appUrl: APP_URL }),
        }),
      })
    } catch (emailErr) {
      console.warn('Email failed:', emailErr.message)
    }

    return res.status(200).json({ success: true, key, expiresAt, emailSent: true })

  } catch (err) {
    console.error('Generate key error:', err)
    return res.status(500).json({ error: err.message })
  }
}
