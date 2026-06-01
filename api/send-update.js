// api/send-update.js — Send library update email to all customers
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
)

const RESEND_API_KEY = process.env.RESEND_API_KEY
const OWNER_PASSWORD = process.env.OWNER_PASSWORD
const APP_URL        = process.env.VITE_APP_URL || 'https://readwise-by-skai.vercel.app'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { password, subject, newBooks, message } = req.body
  if (password !== OWNER_PASSWORD) return res.status(401).json({ error: 'Unauthorized' })

  try {
    // Get all active customers
    const { data: customers, error } = await supabase
      .from('customers')
      .select('name, email')
      .eq('is_active', true)

    if (error) return res.status(500).json({ error: error.message })
    if (!customers?.length) return res.status(200).json({ success: true, sent: 0 })

    const bookListHtml = newBooks?.length
      ? `<ul style="padding-left: 20px; margin: 8px 0;">${newBooks.map(b => `<li style="margin: 4px 0; font-size: 14px; color: #555;">${b}</li>`).join('')}</ul>`
      : ''

    let sent = 0
    const errors = []

    // Send to each customer individually (personalized)
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
            html    : `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; background: #f9f9f9; color: #1a1a1a;">
  <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 12px rgba(0,0,0,0.08);">
    <h1 style="font-size: 28px; color: #8B6914; margin: 0 0 8px;">Readwise by Skai</h1>
    <p style="color: #888; margin: 0 0 32px; font-size: 14px;">New books added to your library</p>

    <p style="font-size: 16px; margin: 0 0 16px;">Hi ${firstName},</p>
    <p style="font-size: 15px; color: #555; line-height: 1.7; margin: 0 0 20px;">
      Great news! We just added new books to your Readwise by Skai library.
    </p>

    ${newBooks?.length ? `
    <div style="background: #f5f3ef; border-radius: 8px; padding: 20px; margin: 0 0 20px;">
      <p style="margin: 0 0 8px; font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 0.06em;">New books this update</p>
      ${bookListHtml}
    </div>
    ` : ''}

    ${message ? `<p style="font-size: 14px; color: #555; line-height: 1.7; margin: 0 0 20px;">${message}</p>` : ''}

    <a href="${APP_URL}" style="display: inline-block; background: #8B6914; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 500; margin: 0 0 24px;">
      Open Your Library →
    </a>

    <p style="font-size: 13px; color: #aaa; margin: 0; line-height: 1.7;">
      The new books are already in your library — just open the app and they'll be there.<br>
      Happy reading! 📖
    </p>
  </div>
</body>
</html>
            `,
          }),
        })
        sent++
        // Small delay to avoid rate limiting
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
