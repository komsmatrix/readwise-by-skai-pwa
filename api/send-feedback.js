// api/send-feedback.js
// Handles student feedback, bug reports, and content error reports
// Sends to owner email + stores for dashboard

const { Resend } = require('resend')
const { createClient } = require('@supabase/supabase-js')
const resend  = new Resend(process.env.RESEND_API_KEY)
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
)

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end()

  const { name, email, message, type } = req.body

  if (!message?.trim()) {
    return res.status(400).json({ error: 'Message is required.' })
  }

  const typeLabels = {
    feedback: '💬 Student Feedback',
    bug:      '🐛 Bug Report',
    content:  '📝 Content Error',
  }

  const typeLabel = typeLabels[type] || '💬 Feedback'
  const subject   = `[${typeLabel}] from ${name || 'Anonymous'}`

  // Store in Supabase for dashboard
  try {
    await supabase.from('feedback').insert([{
      name: name || null,
      email: email || null,
      type: type || 'feedback',
      message: message.trim(),
    }])
  } catch (e) { console.error('Supabase feedback store error:', e) }

  try {
    await resend.emails.send({
      from   : 'Readwise by Skai <hello@readwisebyskai.com>',
      to     : 'skai@readwisebyskai.com',
      replyTo: email || 'noreply@readwisebyskai.com',
      subject,
      html   : feedbackHTML({ name, email, message, type, typeLabel }),
    })

    res.status(200).json({ success: true })
  } catch (err) {
    console.error('send-feedback error:', err)
    res.status(500).json({ error: err.message })
  }
}

function feedbackHTML({ name, email, message, type, typeLabel }) {
  const bgColor = type === 'bug' ? '#FEF2F2' : type === 'content' ? '#FFF7ED' : '#F0FDF4'
  const borderColor = type === 'bug' ? '#FCA5A5' : type === 'content' ? '#FCD34D' : '#86EFAC'

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:520px;margin:32px auto;padding:0 16px;">
  <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">

    <div style="background:#0d0d0d;padding:20px 24px;display:flex;align-items:center;gap:10px;">
      <div style="width:32px;height:32px;background:rgba(201,169,110,0.2);border:1px solid #c9a96e;border-radius:8px;font-size:16px;font-weight:800;color:#c9a96e;text-align:center;line-height:32px;">R</div>
      <div>
        <div style="font-size:15px;font-weight:700;color:#fff;">Readwise by Skai</div>
        <div style="font-size:10px;color:#c9a96e;text-transform:uppercase;letter-spacing:0.06em;">Student ${typeLabel}</div>
      </div>
    </div>

    <div style="padding:24px;">
      <div style="background:${bgColor};border:1px solid ${borderColor};border-radius:8px;padding:12px 16px;margin-bottom:20px;">
        <div style="font-size:16px;font-weight:700;color:#111827;">${typeLabel}</div>
      </div>

      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
        <tr>
          <td style="padding:8px 0;font-size:12px;color:#6b7280;width:80px;">From</td>
          <td style="padding:8px 0;font-size:13px;color:#111827;font-weight:500;">${name || 'Anonymous'}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-size:12px;color:#6b7280;">Email</td>
          <td style="padding:8px 0;font-size:13px;color:#2563eb;">${email || 'Not provided'}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-size:12px;color:#6b7280;">Type</td>
          <td style="padding:8px 0;font-size:13px;color:#111827;">${typeLabel}</td>
        </tr>
      </table>

      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;">
        <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">Message</div>
        <div style="font-size:14px;color:#111827;line-height:1.7;white-space:pre-wrap;">${message}</div>
      </div>

      ${email ? `<div style="margin-top:16px;text-align:center;">
        <a href="mailto:${email}" style="display:inline-block;background:#c9a96e;color:#0d0d0d;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600;">Reply to ${name || 'Student'} →</a>
      </div>` : ''}
    </div>

    <div style="padding:16px 24px;border-top:1px solid #e5e7eb;background:#f9fafb;">
      <p style="font-size:11px;color:#9ca3af;margin:0;">Readwise by Skai · Student Feedback System<br/>Sent from the Profile screen in-app.</p>
    </div>
  </div>
</div>
</body>
</html>`
}
