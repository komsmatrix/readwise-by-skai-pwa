import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
)
const resend  = new Resend(process.env.RESEND_API_KEY)
const APP_URL = process.env.VITE_APP_URL || 'https://readwisebyskai.com'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { customerId, name, email, mood, message } = req.body
  if (!message?.trim()) return res.status(400).json({ error: 'Message is required' })

  const moodLabels = { '😍': 'Loving it', '😊': 'Pretty good', '😐': 'It\'s okay', '😕': 'Not great', '😤': 'Frustrated' }
  const moodLabel  = moodLabels[mood] || mood || 'No rating'

  try {
    // Save to Supabase
    await supabase.from('feedback').insert({
      customer_id : customerId || null,
      name        : name?.trim()    || 'Anonymous',
      email       : email?.trim()   || null,
      mood,
      mood_label  : moodLabel,
      message     : message.trim(),
      created_at  : new Date().toISOString(),
    })

    // Email notification to Kyle
    await resend.emails.send({
      from   : 'Readwise by Skai <hello@readwisebyskai.com>',
      to     : 'readwisebyskai@gmail.com',
      subject: `💬 New Feedback from ${name || 'Anonymous'} — ${mood} ${moodLabel}`,
      html   : `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#111;color:#f0ede8;padding:32px;border-radius:12px;">
          <h2 style="color:#c9a96e;margin-top:0;">New App Feedback</h2>
          <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
            <tr><td style="padding:8px 0;color:#888;width:80px;">From</td><td style="padding:8px 0;">${name || 'Anonymous'}${email ? ` &lt;${email}&gt;` : ''}</td></tr>
            <tr><td style="padding:8px 0;color:#888;">Mood</td><td style="padding:8px 0;font-size:20px;">${mood || '—'} ${moodLabel}</td></tr>
          </table>
          <div style="background:#1e1e1e;border:1px solid #333;border-radius:8px;padding:20px;font-size:16px;line-height:1.7;white-space:pre-wrap;">${message.trim()}</div>
          <p style="color:#555;font-size:12px;margin-top:24px;">Sent from ${APP_URL}</p>
        </div>
      `
    })

    return res.status(200).json({ success: true })
  } catch (err) {
    console.error('Feedback error:', err)
    return res.status(500).json({ error: err.message })
  }
}
