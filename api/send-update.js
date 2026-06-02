// api/send-update.js — Send library update email to all customers
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
)

const RESEND_API_KEY = process.env.RESEND_API_KEY
const OWNER_PASSWORD = process.env.OWNER_PASSWORD
const APP_URL        = process.env.VITE_APP_URL || 'https://readwise-by-skai-pwa.vercel.app'

function updateEmailTemplate({ firstName, newBooks, message, appUrl }) {
  const bookListHtml = newBooks?.length
    ? newBooks.map(b => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-right:10px;vertical-align:middle;">
                  <div style="width:6px;height:6px;background:#c9a96e;border-radius:50%;"></div>
                </td>
                <td style="font-size:14px;color:#f0ede8;font-weight:500;">${b}</td>
              </tr>
            </table>
          </td>
        </tr>`).join('')
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Books Added — Readwise by Skai</title>
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
                    <div style="font-size:11px;color:#c9a96e;letter-spacing:0.08em;text-transform:uppercase;margin-top:2px;">Your Personal Library</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main card -->
          <tr>
            <td style="background:#161616;border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:40px;">

              <!-- Greeting -->
              <p style="margin:0 0 8px;font-size:22px;font-weight:600;color:#f0ede8;letter-spacing:-0.02em;">New books just dropped 📚</p>
              <p style="margin:0 0 28px;font-size:15px;color:#9a9690;line-height:1.7;">
                Hi ${firstName}, your library just got bigger. We've added new books — open the app and they're already waiting for you.
              </p>

              ${newBooks?.length ? `
              <!-- New books list -->
              <div style="background:#0d0d0d;border:1px solid rgba(201,169,110,0.2);border-radius:10px;padding:20px;margin:0 0 24px;">
                <p style="margin:0 0 14px;font-size:11px;font-weight:600;color:#c9a96e;text-transform:uppercase;letter-spacing:0.08em;">Added to your library</p>
                <table cellpadding="0" cellspacing="0" style="width:100%;">
                  ${bookListHtml}
                </table>
              </div>
              ` : ''}

              ${message ? `
              <p style="margin:0 0 24px;font-size:14px;color:#9a9690;line-height:1.7;font-style:italic;">"${message}"</p>
              ` : ''}

              <!-- CTA -->
              <a href="${appUrl}" style="display:block;background:#c9a96e;color:#0d0d0d;text-decoration:none;padding:14px 24px;border-radius:8px;font-size:15px;font-weight:600;text-align:center;letter-spacing:0.01em;margin:0 0 28px;">
                Open Your Library →
              </a>

              <!-- Divider -->
              <div style="height:1px;background:rgba(255,255,255,0.07);margin:0 0 24px;"></div>

              <!-- Footer note -->
              <p style="margin:0;font-size:13px;color:#5a5753;line-height:1.7;text-align:center;">
                Books are added regularly. Your library grows — your price stays the same. 🙌
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 0 0;text-align:center;">
              <p style="margin:0 0 6px;font-size:12px;color:#5a5753;">Questions? Reply to this email.</p>
              <p style="margin:0;font-size:12px;color:#3a3835;">Happy reading! — Readwise by Skai</p>
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

  const { password, subject, newBooks, message } = req.body
  if (password !== OWNER_PASSWORD) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const { data: customers, error } = await supabase
      .from('customers')
      .select('name, email')
      .eq('is_active', true)

    if (error) return res.status(500).json({ error: error.message })
    if (!customers?.length) return res.status(200).json({ success: true, sent: 0 })

    let sent = 0
    const errors = []

    for (const customer of customers) {
      const firstName = customer.name?.split(' ')[0] || 'there'
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
            to      : [customer.email],
            subject : subject || 'New Books Added to Your Library 📚',
            html    : updateEmailTemplate({ firstName, newBooks, message, appUrl: APP_URL }),
          }),
        })
        sent++
        await new Promise(r => setTimeout(r, 100))
      } catch (err) {
        errors.push({ email: customer.email, error: err.message })
      }
    }

    return res.status(200).json({ success: true, sent, total: customers.length, errors })

  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
