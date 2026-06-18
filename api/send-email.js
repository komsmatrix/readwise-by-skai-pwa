// api/send-email.js
// Merged: send-agent-welcome + send-agent-blast + send-payout-confirmation + send-feedback
// Usage: POST { type: 'welcome' | 'blast' | 'payout' | 'feedback', ...payload }

import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

const resend   = new Resend(process.env.RESEND_API_KEY)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { type, ...payload } = req.body

  if (!type) return res.status(400).json({ error: 'type is required: welcome | blast | payout | feedback | weekly-report' })

  try {
    if (type === 'welcome')       return await handleWelcome(payload, res)
    if (type === 'blast')         return await handleBlast(payload, res)
    if (type === 'payout')        return await handlePayout(payload, res)
    if (type === 'feedback')      return await handleFeedback(payload, res)
    if (type === 'weekly-report') return await handleWeeklyReport(payload, res)
    return res.status(400).json({ error: `Unknown type: ${type}` })
  } catch (err) {
    console.error(`send-email [${type}] error:`, err)
    return res.status(500).json({ error: err.message })
  }
}

// ── WELCOME ───────────────────────────────────────────────────────────────────
async function handleWelcome({ name, email, referral_code, gcash_number }, res) {
  if (!name || !email || !referral_code) {
    return res.status(400).json({ error: 'Missing required fields: name, email, referral_code' })
  }
  const firstName  = name.split(' ')[0]
  const commission = 50
  const discount   = 20

  await resend.emails.send({
    from   : 'Readwise by Skai <skai@readwisebyskai.com>',
    to     : email,
    subject: `Welcome to Readwise Agent Program — Your Code: ${referral_code}`,
    html   : agentWelcomeHTML({ firstName, name, email, referral_code, gcash_number, commission, discount }),
  })
  return res.status(200).json({ success: true })
}

// ── BLAST ─────────────────────────────────────────────────────────────────────
async function handleBlast({ subject, message, resource_url, resource_label }, res) {
  if (!subject || !message) {
    return res.status(400).json({ error: 'subject and message are required' })
  }

  const { data: agents, error } = await supabase
    .from('agents')
    .select('name, email, referral_code, total_referrals')
    .eq('is_active', true)

  if (error || !agents?.length) {
    return res.status(400).json({ error: 'No active agents found.' })
  }

  let sent = 0, failed = 0
  for (const agent of agents) {
    const firstName = agent.name?.split(' ')[0] || 'Agent'
    try {
      await resend.emails.send({
        from   : 'Readwise by Skai <skai@readwisebyskai.com>',
        to     : agent.email,
        subject,
        html   : blastHTML({ firstName, agent, message, resource_url, resource_label }),
      })
      sent++
    } catch (e) {
      console.error(`Blast failed for ${agent.email}:`, e)
      failed++
    }
  }
  return res.status(200).json({ success: true, sent, failed, total: agents.length })
}

// ── PAYOUT ────────────────────────────────────────────────────────────────────
async function handlePayout({
  agent_id, agent_name, agent_email, amount,
  referral_count, gcash_ref, screenshot_url,
  period_start, period_end,
}, res) {
  if (!agent_email || !amount) {
    return res.status(400).json({ error: 'agent_email and amount are required' })
  }

  const firstName = agent_name?.split(' ')[0] || 'Agent'
  let students = []

  if (agent_id && period_start && period_end) {
    try {
      const { data: agentData } = await supabase
        .from('agents').select('referral_code').eq('id', agent_id).single()
      if (agentData?.referral_code) {
        const { data: customerData } = await supabase
          .from('customers')
          .select('name, created_at')
          .eq('agent_code', agentData.referral_code)
          .gte('created_at', period_start)
          .lte('created_at', period_end + 'T23:59:59Z')
          .order('created_at', { ascending: true })
        students = customerData || []
      }
    } catch (e) { console.error('Error fetching students:', e) }
  }

  await resend.emails.send({
    from   : 'Readwise by Skai <skai@readwisebyskai.com>',
    to     : agent_email,
    subject: `💸 ₱${amount} Sent! Your Readwise Commission is Here`,
    html   : payoutHTML({ firstName, amount, referral_count, gcash_ref, screenshot_url, period_start, period_end, students }),
  })
  return res.status(200).json({ success: true })
}

// ── FEEDBACK ──────────────────────────────────────────────────────────────────
async function handleFeedback({ name, email, message, type: feedbackType }, res) {
  if (!message?.trim()) {
    return res.status(400).json({ error: 'message is required' })
  }

  const typeLabels = { feedback: '💬 Student Feedback', bug: '🐛 Bug Report', content: '📝 Content Error' }
  const typeLabel  = typeLabels[feedbackType] || '💬 Feedback'

  try {
    await supabase.from('feedback').insert([{
      name: name || null, email: email || null,
      type: feedbackType || 'feedback', message: message.trim(),
    }])
  } catch (e) { console.error('Supabase feedback store error:', e) }

  await resend.emails.send({
    from   : 'Readwise by Skai <hello@readwisebyskai.com>',
    to     : 'skai@readwisebyskai.com',
    replyTo: email || 'noreply@readwisebyskai.com',
    subject: `[${typeLabel}] from ${name || 'Anonymous'}`,
    html   : feedbackHTML({ name, email, message, type: feedbackType, typeLabel }),
  })
  return res.status(200).json({ success: true })
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMAIL TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

function agentWelcomeHTML({ firstName, name, email, referral_code, gcash_number, commission, discount }) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#0d0d0d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:32px 16px;">
<div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:16px;overflow:hidden;">
  <div style="padding:28px 28px 0;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px;">
      <div style="width:36px;height:36px;background:rgba(201,169,110,0.15);border:1px solid rgba(201,169,110,0.3);border-radius:8px;font-size:18px;font-weight:800;color:#c9a96e;text-align:center;line-height:36px;">R</div>
      <div>
        <div style="font-size:17px;font-weight:700;color:#fff;">Readwise by Skai</div>
        <div style="font-size:10px;color:#c9a96e;letter-spacing:0.06em;text-transform:uppercase;">Agent Program</div>
      </div>
    </div>
  </div>
  <div style="padding:28px;">
    <h1 style="font-size:24px;font-weight:700;color:#fff;margin:0 0 8px;">Welcome to the team, ${firstName}! 🎉</h1>
    <p style="font-size:14px;color:#aaa;line-height:1.7;margin:0 0 16px;">You're now an official Readwise Agent. Here's everything you need to start earning.</p>
    <div style="background:#0d0d0d;border:2px solid #c9a96e;border-radius:12px;padding:20px;text-align:center;margin:20px 0;">
      <div style="font-size:11px;color:#c9a96e;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Your Referral Code</div>
      <div style="font-family:monospace;font-size:32px;font-weight:800;color:#c9a96e;letter-spacing:0.15em;">${referral_code}</div>
    </div>
    <div style="display:flex;gap:12px;margin:20px 0;">
      <div style="flex:1;background:#0d0d0d;border:1px solid #2a2a2a;border-radius:10px;padding:14px;text-align:center;">
        <div style="font-size:22px;font-weight:700;color:#c9a96e;">₱${commission}</div>
        <div style="font-size:10px;color:#666;margin-top:4px;text-transform:uppercase;letter-spacing:0.05em;">Your Commission</div>
      </div>
      <div style="flex:1;background:#0d0d0d;border:1px solid #2a2a2a;border-radius:10px;padding:14px;text-align:center;">
        <div style="font-size:22px;font-weight:700;color:#c9a96e;">₱${discount}</div>
        <div style="font-size:10px;color:#666;margin-top:4px;text-transform:uppercase;letter-spacing:0.05em;">Student Discount</div>
      </div>
      <div style="flex:1;background:#0d0d0d;border:1px solid #2a2a2a;border-radius:10px;padding:14px;text-align:center;">
        <div style="font-size:14px;font-weight:700;color:#fff;line-height:1.2;">Every<br/>Friday</div>
        <div style="font-size:10px;color:#666;margin-top:4px;text-transform:uppercase;letter-spacing:0.05em;">Payout Day</div>
      </div>
    </div>
    <div style="height:1px;background:#2a2a2a;margin:20px 0;"></div>
    <p style="color:#fff;font-weight:600;margin-bottom:12px;">How it works:</p>
    <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:20px;">
      <div style="display:flex;gap:12px;">
        <div style="width:24px;height:24px;border-radius:50%;background:rgba(201,169,110,0.15);border:1px solid rgba(201,169,110,0.3);color:#c9a96e;font-size:12px;font-weight:700;text-align:center;line-height:24px;flex-shrink:0;">1</div>
        <div style="font-size:13px;color:#aaa;line-height:1.6;">Share your code <strong style="color:#fff;">${referral_code}</strong> with students preparing for board exams.</div>
      </div>
      <div style="display:flex;gap:12px;">
        <div style="width:24px;height:24px;border-radius:50%;background:rgba(201,169,110,0.15);border:1px solid rgba(201,169,110,0.3);color:#c9a96e;font-size:12px;font-weight:700;text-align:center;line-height:24px;flex-shrink:0;">2</div>
        <div style="font-size:13px;color:#aaa;line-height:1.6;">Students get <strong style="color:#fff;">₱${discount} off</strong>, you earn <strong style="color:#fff;">₱${commission} commission</strong>.</div>
      </div>
      <div style="display:flex;gap:12px;">
        <div style="width:24px;height:24px;border-radius:50%;background:rgba(201,169,110,0.15);border:1px solid rgba(201,169,110,0.3);color:#c9a96e;font-size:12px;font-weight:700;text-align:center;line-height:24px;flex-shrink:0;">3</div>
        <div style="font-size:13px;color:#aaa;line-height:1.6;">Commissions paid every <strong style="color:#fff;">Friday via GCash</strong> to <strong style="color:#fff;">${gcash_number}</strong>.</div>
      </div>
    </div>
    <a href="https://readwisebyskai.com/agent-guide" style="display:block;background:#c9a96e;color:#0d0d0d;text-decoration:none;padding:14px;border-radius:10px;font-size:15px;font-weight:700;text-align:center;margin:20px 0;">View Your Agent Guide →</a>
    <p style="font-size:12px;text-align:center;color:#555;">Share this link: <strong style="color:#c9a96e;">readwisebyskai.com/buy?ref=${referral_code}</strong></p>
  </div>
  <div style="padding:20px 28px;border-top:1px solid #2a2a2a;">
    <p style="font-size:11px;color:#444;margin:0;line-height:1.6;">Readwise by Skai · Agent Program<br/>Questions? Reply to this email.<br/>GCash payouts sent to: ${gcash_number}</p>
  </div>
</div>
</div>
</body>
</html>`
}

function blastHTML({ firstName, agent, message, resource_url, resource_label }) {
  const resourceBlock = resource_url
    ? `<div style="margin:20px 0;text-align:center;"><a href="${resource_url}" style="display:inline-block;background:#c9a96e;color:#0d0d0d;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:700;">${resource_label || 'View Resource →'}</a></div>`
    : ''
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#0d0d0d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:32px 16px;">
<div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:16px;overflow:hidden;">
  <div style="padding:28px 28px 0;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px;">
      <div style="width:36px;height:36px;background:rgba(201,169,110,0.15);border:1px solid rgba(201,169,110,0.3);border-radius:8px;font-size:18px;font-weight:800;color:#c9a96e;text-align:center;line-height:36px;">R</div>
      <div>
        <div style="font-size:17px;font-weight:700;color:#fff;">Readwise by Skai</div>
        <div style="font-size:10px;color:#c9a96e;letter-spacing:0.06em;text-transform:uppercase;">Agent Update</div>
      </div>
    </div>
  </div>
  <div style="padding:28px;">
    <h1 style="font-size:22px;font-weight:800;color:#fff;margin:0 0 16px;">Hi ${firstName}! 👋</h1>
    <div style="font-size:14px;color:#ccc;line-height:1.8;margin-bottom:20px;">${message.replace(/\n/g, '<br/>')}</div>
    ${resourceBlock}
    <div style="height:1px;background:#2a2a2a;margin:20px 0;"></div>
    <div style="background:#0d0d0d;border:1px solid #2a2a2a;border-radius:10px;padding:14px;margin-bottom:16px;">
      <div style="font-size:10px;color:#c9a96e;text-transform:uppercase;letter-spacing:0.07em;font-weight:700;margin-bottom:8px;">Your Stats</div>
      <div style="display:flex;gap:16px;">
        <div><div style="font-size:20px;font-weight:800;color:#c9a96e;">${agent.total_referrals}</div><div style="font-size:10px;color:#666;">Total Referrals</div></div>
        <div><div style="font-size:20px;font-weight:800;color:#10B981;">₱${agent.total_referrals * 50}</div><div style="font-size:10px;color:#666;">Total Earned</div></div>
        <div><div style="font-size:14px;font-weight:700;color:#fff;font-family:monospace;">${agent.referral_code}</div><div style="font-size:10px;color:#666;">Your Code</div></div>
      </div>
    </div>
    <div style="text-align:center;padding:14px;background:#0d0d0d;border:1px solid #2a2a2a;border-radius:10px;">
      <div style="font-size:11px;color:#666;margin-bottom:4px;">Share this link</div>
      <div style="font-size:14px;font-weight:700;color:#c9a96e;">readwisebyskai.com/buy</div>
    </div>
  </div>
  <div style="padding:20px 28px;border-top:1px solid #2a2a2a;">
    <p style="font-size:11px;color:#444;margin:0;line-height:1.6;">Readwise by Skai · Agent Program<br/>Payouts every Friday via GCash<br/>Reply to this email for questions.</p>
  </div>
</div>
</div>
</body>
</html>`
}

function payoutHTML({ firstName, amount, referral_count, gcash_ref, screenshot_url, period_start, period_end, students }) {
  const periodStr = period_start && period_end
    ? `${new Date(period_start).toLocaleDateString('en-PH', { month:'long', day:'numeric' })} – ${new Date(period_end).toLocaleDateString('en-PH', { month:'long', day:'numeric', year:'numeric' })}`
    : 'This week'
  const nextTarget   = referral_count + 5
  const nextEarnings = nextTarget * 50
  const studentRows  = students.length > 0
    ? students.map(s => `<tr><td style="padding:8px 12px;font-size:13px;color:#ccc;border-bottom:1px solid #2a2a2a;">${s.name}</td><td style="padding:8px 12px;font-size:12px;color:#666;border-bottom:1px solid #2a2a2a;text-align:right;">${new Date(s.created_at).toLocaleDateString('en-PH', { month:'short', day:'numeric', year:'numeric' })}</td></tr>`).join('')
    : `<tr><td colspan="2" style="padding:12px;font-size:12px;color:#666;text-align:center;">Student details not available.</td></tr>`
  const screenshotBlock = screenshot_url
    ? `<div style="margin:20px 0;"><div style="font-size:10px;color:#c9a96e;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;font-weight:700;">GCash Payment Screenshot</div><img src="${screenshot_url}" alt="GCash Payment" style="width:100%;max-width:400px;border-radius:10px;border:1px solid #2a2a2a;"/></div>`
    : ''
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#0d0d0d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:32px 16px;">
<div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:16px;overflow:hidden;">
  <div style="padding:28px 28px 0;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px;">
      <div style="width:36px;height:36px;background:rgba(201,169,110,0.15);border:1px solid rgba(201,169,110,0.3);border-radius:8px;font-size:18px;font-weight:800;color:#c9a96e;text-align:center;line-height:36px;">R</div>
      <div><div style="font-size:17px;font-weight:700;color:#fff;">Readwise by Skai</div><div style="font-size:10px;color:#c9a96e;letter-spacing:0.06em;text-transform:uppercase;">Commission Payout</div></div>
    </div>
  </div>
  <div style="padding:28px;">
    <div style="display:inline-block;background:rgba(16,185,129,0.1);border:1px solid #10B981;border-radius:20px;padding:5px 14px;font-size:12px;font-weight:700;color:#10B981;margin-bottom:16px;">✓ COMMISSION PAID</div>
    <h1 style="font-size:24px;font-weight:800;color:#fff;margin:0 0 8px;">${firstName}, your ₱${amount} is on its way! 🎉</h1>
    <p style="font-size:14px;color:#aaa;line-height:1.7;margin:0 0 20px;">You earned this by helping ${referral_count} student${referral_count !== 1 ? 's' : ''} prepare smarter for their board exam.</p>
    <div style="background:#0d0d0d;border:2px solid #10B981;border-radius:12px;padding:20px;text-align:center;margin-bottom:20px;">
      <div style="font-size:11px;color:#10B981;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">Amount Sent via GCash</div>
      <div style="font-size:48px;font-weight:800;color:#10B981;line-height:1;">₱${amount}</div>
      <div style="font-size:12px;color:#666;margin-top:6px;">${referral_count} referral${referral_count !== 1 ? 's' : ''} × ₱50 commission</div>
    </div>
    <table style="width:100%;border-collapse:collapse;background:#0d0d0d;border:1px solid #2a2a2a;border-radius:10px;overflow:hidden;margin-bottom:20px;">
      <tr><td style="padding:10px 14px;font-size:12px;color:#666;border-bottom:1px solid #1a1a1a;">Period</td><td style="padding:10px 14px;font-size:12px;color:#fff;font-weight:600;border-bottom:1px solid #1a1a1a;text-align:right;">${periodStr}</td></tr>
      <tr><td style="padding:10px 14px;font-size:12px;color:#666;border-bottom:1px solid #1a1a1a;">Students Referred</td><td style="padding:10px 14px;font-size:12px;color:#fff;font-weight:600;border-bottom:1px solid #1a1a1a;text-align:right;">${referral_count}</td></tr>
      <tr><td style="padding:10px 14px;font-size:12px;color:#666;${gcash_ref ? 'border-bottom:1px solid #1a1a1a;' : ''}">Commission Rate</td><td style="padding:10px 14px;font-size:12px;color:#fff;font-weight:600;${gcash_ref ? 'border-bottom:1px solid #1a1a1a;' : ''}text-align:right;">₱50 per referral</td></tr>
      ${gcash_ref ? `<tr><td style="padding:10px 14px;font-size:12px;color:#666;">GCash Reference</td><td style="padding:10px 14px;font-size:12px;color:#c9a96e;font-weight:700;text-align:right;font-family:monospace;">${gcash_ref}</td></tr>` : ''}
    </table>
    ${screenshotBlock}
    <div style="margin-bottom:24px;">
      <div style="font-size:11px;color:#c9a96e;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;margin-bottom:10px;">Students Who Used Your Code This Period</div>
      <table style="width:100%;border-collapse:collapse;background:#0d0d0d;border:1px solid #2a2a2a;border-radius:10px;overflow:hidden;">
        <tr style="background:#111;"><th style="padding:8px 12px;font-size:10px;color:#666;text-align:left;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Student Name</th><th style="padding:8px 12px;font-size:10px;color:#666;text-align:right;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Date Enrolled</th></tr>
        ${studentRows}
      </table>
    </div>
    <div style="background:rgba(201,169,110,0.06);border:1px solid rgba(201,169,110,0.2);border-radius:12px;padding:20px;margin-bottom:20px;">
      <div style="font-size:13px;font-weight:700;color:#c9a96e;margin-bottom:8px;">🚀 Keep the momentum going</div>
      <p style="font-size:13px;color:#aaa;line-height:1.7;margin:0 0 10px;">At your next target of <strong style="color:#fff;">${nextTarget} referrals</strong>, you'd earn <strong style="color:#c9a96e;">₱${nextEarnings}/week</strong>.</p>
    </div>
    <div style="text-align:center;padding:16px;background:#0d0d0d;border:1px solid #2a2a2a;border-radius:10px;">
      <div style="font-size:11px;color:#666;margin-bottom:4px;">Your referral link</div>
      <div style="font-size:15px;font-weight:700;color:#c9a96e;">readwisebyskai.com/buy</div>
    </div>
  </div>
  <div style="padding:20px 28px;border-top:1px solid #2a2a2a;">
    <p style="font-size:11px;color:#444;margin:0;line-height:1.6;">Readwise by Skai · Agent Program<br/>Payouts every Friday via GCash<br/>Questions? Reply to this email.</p>
  </div>
</div>
</div>
</body>
</html>`
}

function feedbackHTML({ name, email, message, type, typeLabel }) {
  const bgColor     = type === 'bug' ? '#FEF2F2' : type === 'content' ? '#FFF7ED' : '#F0FDF4'
  const borderColor = type === 'bug' ? '#FCA5A5' : type === 'content' ? '#FCD34D' : '#86EFAC'
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:520px;margin:32px auto;padding:0 16px;">
  <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
    <div style="background:#0d0d0d;padding:20px 24px;">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:32px;height:32px;background:rgba(201,169,110,0.2);border:1px solid #c9a96e;border-radius:8px;font-size:16px;font-weight:800;color:#c9a96e;text-align:center;line-height:32px;">R</div>
        <div>
          <div style="font-size:15px;font-weight:700;color:#fff;">Readwise by Skai</div>
          <div style="font-size:10px;color:#c9a96e;text-transform:uppercase;letter-spacing:0.06em;">Student ${typeLabel}</div>
        </div>
      </div>
    </div>
    <div style="padding:24px;">
      <div style="background:${bgColor};border:1px solid ${borderColor};border-radius:8px;padding:12px 16px;margin-bottom:20px;">
        <div style="font-size:16px;font-weight:700;color:#111827;">${typeLabel}</div>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
        <tr><td style="padding:8px 0;font-size:12px;color:#6b7280;width:80px;">From</td><td style="padding:8px 0;font-size:13px;color:#111827;font-weight:500;">${name || 'Anonymous'}</td></tr>
        <tr><td style="padding:8px 0;font-size:12px;color:#6b7280;">Email</td><td style="padding:8px 0;font-size:13px;color:#2563eb;">${email || 'Not provided'}</td></tr>
        <tr><td style="padding:8px 0;font-size:12px;color:#6b7280;">Type</td><td style="padding:8px 0;font-size:13px;color:#111827;">${typeLabel}</td></tr>
      </table>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;">
        <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">Message</div>
        <div style="font-size:14px;color:#111827;line-height:1.7;white-space:pre-wrap;">${message}</div>
      </div>
      ${email ? `<div style="margin-top:16px;text-align:center;"><a href="mailto:${email}" style="display:inline-block;background:#c9a96e;color:#0d0d0d;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600;">Reply to ${name || 'Student'} →</a></div>` : ''}
    </div>
    <div style="padding:16px 24px;border-top:1px solid #e5e7eb;background:#f9fafb;">
      <p style="font-size:11px;color:#9ca3af;margin:0;">Readwise by Skai · Student Feedback System</p>
    </div>
  </div>
</div>
</body>
</html>`
}

// ── WEEKLY REPORT ─────────────────────────────────────────────────────────────
// Called by Supabase pg_cron every Sunday at 8PM PH time
// Can also be triggered manually from owner dashboard
// POST { type: 'weekly-report', customer_id?, send_all?: true }

async function handleWeeklyReport({ customer_id, send_all }, res) {
  // Fetch customers to send to
  let customers = []

  if (send_all) {
    const { data } = await supabase
      .from('customers')
      .select('id, name, email')
      .eq('is_active', true)
    customers = data || []
  } else if (customer_id) {
    const { data } = await supabase
      .from('customers')
      .select('id, name, email')
      .eq('id', customer_id)
      .single()
    if (data) customers = [data]
  }

  if (!customers.length) return res.status(400).json({ error: 'No customers found' })

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  let sent = 0, failed = 0

  for (const customer of customers) {
    try {
      // Get student exam (readiness score + exam date)
      const { data: exam } = await supabase
        .from('student_exams')
        .select('readiness_score, exam_date, study_mode')
        .eq('customer_id', customer.id)
        .single()

      // Get sessions this week
      const { data: sessions } = await supabase
        .from('sessions')
        .select('id, cards_reviewed, correct, created_at')
        .eq('customer_id', customer.id)
        .gte('created_at', oneWeekAgo)

      // Get readiness score from last week (7-14 days ago)
      const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
      const { data: oldSessions } = await supabase
        .from('sessions')
        .select('readiness_score_after')
        .eq('customer_id', customer.id)
        .gte('created_at', twoWeeksAgo)
        .lt('created_at', oneWeekAgo)
        .order('created_at', { ascending: false })
        .limit(1)

      // Get weak topics from topic_health
      const { data: weakTopics } = await supabase
        .from('topic_health')
        .select('topic_name, health_state, mastery_pct')
        .eq('customer_id', customer.id)
        .in('health_state', ['Critical', 'Weak'])
        .order('mastery_pct', { ascending: true })
        .limit(2)

      // Get streak
      const { data: profile } = await supabase
        .from('customers')
        .select('streak')
        .eq('id', customer.id)
        .single()

      // Build report data
      const daysActive    = new Set((sessions || []).map(s => s.created_at?.slice(0, 10))).size
      const cardsReviewed = (sessions || []).reduce((sum, s) => sum + (s.cards_reviewed || 0), 0)
      const currentScore  = exam?.readiness_score ?? 0
      const lastScore     = oldSessions?.[0]?.readiness_score_after ?? null
      const scoreDiff     = lastScore !== null ? currentScore - lastScore : null
      const streak        = profile?.streak ?? 0
      const daysToExam    = exam?.exam_date
        ? Math.max(0, Math.ceil((new Date(exam.exam_date) - new Date()) / (1000 * 60 * 60 * 24)))
        : null

      // Determine version: on-track vs nudge
      const isOnTrack = daysActive >= 4 && (scoreDiff === null || scoreDiff >= 0)

      const firstName = customer.name?.split(' ')[0] || 'there'

      await resend.emails.send({
        from   : 'Readwise by Skai <hello@readwisebyskai.com>',
        to     : customer.email,
        subject: isOnTrack
          ? `📈 You're on track, ${firstName} — Weekly Study Report`
          : `📋 Your weekly study report, ${firstName} — here's what needs attention`,
        html: weeklyReportHTML({
          firstName, currentScore, lastScore, scoreDiff,
          daysActive, cardsReviewed, streak, weakTopics: weakTopics || [],
          daysToExam, isOnTrack, examDate: exam?.exam_date,
        }),
      })
      sent++
    } catch (e) {
      console.error(`Weekly report failed for ${customer.email}:`, e)
      failed++
    }
  }

  return res.status(200).json({ success: true, sent, failed, total: customers.length })
}

function weeklyReportHTML({
  firstName, currentScore, lastScore, scoreDiff,
  daysActive, cardsReviewed, streak, weakTopics,
  daysToExam, isOnTrack, examDate,
}) {
  const scoreColor  = scoreDiff > 0 ? '#10B981' : scoreDiff < 0 ? '#e05c5c' : '#c9a96e'
  const scoreTrend  = scoreDiff > 0 ? `▲ ${scoreDiff}% from last week` : scoreDiff < 0 ? `▼ ${Math.abs(scoreDiff)}% from last week` : 'No change from last week'
  const examDateStr = examDate ? new Date(examDate).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' }) : null

  const weakTopicRows = weakTopics.length > 0
    ? weakTopics.map(t => `
      <tr>
        <td style="padding:10px 14px;font-size:13px;color:#f0ede8;border-bottom:1px solid rgba(255,255,255,0.06);">${t.topic_name}</td>
        <td style="padding:10px 14px;font-size:12px;font-weight:700;color:${t.health_state === 'Critical' ? '#e05c5c' : '#F59E0B'};border-bottom:1px solid rgba(255,255,255,0.06);text-align:right;">${t.health_state}</td>
        <td style="padding:10px 14px;font-size:12px;color:#6b6560;border-bottom:1px solid rgba(255,255,255,0.06);text-align:right;">${t.mastery_pct ?? 0}% mastery</td>
      </tr>`).join('')
    : `<tr><td colspan="3" style="padding:12px 14px;font-size:13px;color:#10B981;text-align:center;">✓ No critical or weak topics this week</td></tr>`

  // Wellness tips — rotated randomly each week
  const wellnessTips = [
    { tip: 'After a tough session, go for a short walk. Even 10 minutes outside helps your brain consolidate what you just studied.', icon: '🚶' },
    { tip: 'Sleep is when memory forms. A good night's rest does more for your score than cramming at midnight.', icon: '😴' },
    { tip: 'Tried a mock exam this week? Don't review it immediately — step away first. A clear head catches more patterns.', icon: '🧘' },
    { tip: 'Short breaks between sessions improve retention. Study, rest, study again. The rest is part of the process.', icon: '☕' },
    { tip: 'Exercise, even light stretching, increases blood flow to the brain. A 15-minute walk before studying sharpens focus.', icon: '🏃' },
    { tip: 'You don't have to study every waking hour to pass. Rest is productive. Your brain is still working when you step away.', icon: '🌿' },
    { tip: 'After a mock exam, your instinct is to re-study everything. Instead, pick your top 2 weak topics only. Focus beats volume.', icon: '🎯' },
  ]
  const wellnessTip = wellnessTips[Math.floor(Math.random() * wellnessTips.length)]

  const nudgeCoachLine = weakTopics.length > 0
    ? `We're keeping an eye on <strong style="color:#f0ede8;">${weakTopics[0].topic_name}</strong> for you — it shows up often on the LET. Whenever you're ready, even one session on it this week makes a difference.`
    : cardsReviewed === 0
    ? `Life gets busy — we get it. Your study plan is still here whenever you're ready to pick it back up. Even 10 minutes counts.`
    : `You're making progress. Keep going at your own pace — consistency over time is what moves the score.`

  const onTrackCoachLine = weakTopics.length > 0
    ? `You've put in real work this week. Keep the momentum on <strong style="color:#f0ede8;">${weakTopics[0].topic_name}</strong> — one more focused session and you'll see it move.`
    : `You've covered the ground this week. Now let your brain catch up — rest is part of studying too.`

  const coachLine = isOnTrack ? onTrackCoachLine : nudgeCoachLine

  const nudgeBanner = !isOnTrack ? `
    <div style="background:rgba(201,169,110,0.06);border:1px solid rgba(201,169,110,0.15);border-radius:10px;padding:14px 18px;margin-bottom:20px;">
      <div style="font-size:12px;font-weight:600;color:#c9a96e;margin-bottom:4px;">We noticed you had a quieter week — and that's okay.</div>
      <div style="font-size:13px;color:#9a9690;line-height:1.6;">Life happens. Your study plan is still here, your progress is saved, and your score is waiting to grow. Whenever you're ready, we're ready.</div>
    </div>` : `
    <div style="background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.15);border-radius:10px;padding:14px 18px;margin-bottom:20px;">
      <div style="font-size:12px;font-weight:600;color:#10B981;margin-bottom:4px;">You showed up this week — and that's everything.</div>
      <div style="font-size:13px;color:#9a9690;line-height:1.6;">Passing the LET isn't about perfect weeks. It's about showing up consistently. You're doing that.</div>
    </div>`

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0d0d0d;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;padding:32px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

  <!-- Header -->
  <tr><td style="padding:0 0 24px;">
    <div style="font-size:18px;font-weight:700;color:#f0ede8;letter-spacing:-0.02em;">Readwise <span style="color:#c9a96e;">by Skai</span></div>
    <div style="font-size:10px;color:#c9a96e;letter-spacing:0.08em;text-transform:uppercase;margin-top:3px;">Weekly Study Report</div>
  </td></tr>

  <!-- Main card -->
  <tr><td style="background:#161616;border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:32px;">

    <p style="margin:0 0 6px;font-size:22px;font-weight:700;color:#f0ede8;letter-spacing:-0.02em;">
      ${isOnTrack ? `You're on track, ${firstName}. 💪` : `Here's your week, ${firstName}.`}
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#9a9690;line-height:1.7;">
      ${isOnTrack
        ? 'Great week — here\'s what your numbers look like.'
        : 'Your weekly Readwise report. Here\'s where you stand and what needs attention.'}
    </p>

    ${nudgeBanner}

    <!-- Readiness Score -->
    <div style="background:#0d0d0d;border:1px solid rgba(201,169,110,0.2);border-radius:12px;padding:20px 24px;margin-bottom:16px;text-align:center;">
      <div style="font-size:11px;color:#c9a96e;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;font-weight:700;">Readiness Score</div>
      <div style="font-size:52px;font-weight:800;color:#c9a96e;line-height:1;">${currentScore}%</div>
      ${scoreDiff !== null ? `<div style="font-size:12px;color:${scoreColor};margin-top:6px;font-weight:600;">${scoreTrend}</div>` : ''}
      ${examDateStr ? `<div style="font-size:11px;color:#6b6560;margin-top:4px;">Exam: ${examDateStr}${daysToExam ? ` · ${daysToExam} days away` : ''}</div>` : ''}
    </div>

    <!-- Stats row -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <td width="33%" style="padding:0 4px 0 0;">
          <div style="background:#0d0d0d;border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:14px;text-align:center;">
            <div style="font-size:24px;font-weight:800;color:#f0ede8;">${daysActive}</div>
            <div style="font-size:10px;color:#6b6560;margin-top:3px;text-transform:uppercase;letter-spacing:0.05em;">Days Active</div>
          </div>
        </td>
        <td width="33%" style="padding:0 2px;">
          <div style="background:#0d0d0d;border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:14px;text-align:center;">
            <div style="font-size:24px;font-weight:800;color:#f0ede8;">${cardsReviewed}</div>
            <div style="font-size:10px;color:#6b6560;margin-top:3px;text-transform:uppercase;letter-spacing:0.05em;">Cards Reviewed</div>
          </div>
        </td>
        <td width="33%" style="padding:0 0 0 4px;">
          <div style="background:#0d0d0d;border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:14px;text-align:center;">
            <div style="font-size:24px;font-weight:800;color:${streak > 0 ? '#F59E0B' : '#f0ede8'};">${streak}🔥</div>
            <div style="font-size:10px;color:#6b6560;margin-top:3px;text-transform:uppercase;letter-spacing:0.05em;">Day Streak</div>
          </div>
        </td>
      </tr>
    </table>

    <!-- Weak topics -->
    <div style="margin-bottom:20px;">
      <div style="font-size:11px;font-weight:700;color:#c9a96e;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;">Topics That Need Attention</div>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;border:1px solid rgba(255,255,255,0.07);border-radius:10px;overflow:hidden;">
        ${weakTopicRows}
      </table>
    </div>

    <!-- Coach insight -->
    <div style="background:rgba(201,169,110,0.06);border:1px solid rgba(201,169,110,0.15);border-radius:10px;padding:16px 18px;margin-bottom:24px;">
      <div style="font-size:10px;font-weight:700;color:#c9a96e;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">🧠 Coach Insight</div>
      <div style="font-size:13px;color:#9a9690;line-height:1.7;">${coachLine}</div>
    </div>

    <!-- Wellness tip -->
    <div style="background:#0d0d0d;border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:16px 18px;margin-bottom:20px;">
      <div style="font-size:10px;font-weight:700;color:#6b6560;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px;">${wellnessTip.icon} This week's reminder</div>
      <div style="font-size:13px;color:#9a9690;line-height:1.7;">${wellnessTip.tip}</div>
    </div>

    <!-- CTA -->
    <a href="https://readwisebyskai.com" style="display:block;background:#c9a96e;color:#0d0d0d;text-decoration:none;padding:15px;border-radius:10px;font-size:15px;font-weight:700;text-align:center;margin-bottom:20px;">
      ${isOnTrack ? 'Keep Going →' : 'Resume Studying →'}
    </a>

    <div style="height:1px;background:rgba(255,255,255,0.07);margin-bottom:20px;"></div>

    <!-- Privacy note -->
    <p style="margin:0;font-size:11px;color:#3a3835;line-height:1.7;text-align:center;">
      You receive this report because you registered at readwisebyskai.com.<br/>
      We collect your email to provide access to your account and to follow up on your study progress.<br/>
      Reply to this email to unsubscribe from weekly reports.
    </p>

  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:20px 0 0;text-align:center;">
    <p style="margin:0;font-size:12px;color:#3a3835;">Readwise by Skai · Board Exam Operating System</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`
}
