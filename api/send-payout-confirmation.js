// api/send-payout-confirmation.js
// Sends payout confirmation to agent with:
// - Student list who used their code this period
// - GCash screenshot
// - Motivational message to keep sharing

const { Resend } = require('resend')
const { createClient } = require('@supabase/supabase-js')

const resend  = new Resend(process.env.RESEND_API_KEY)
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
)

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end()

  const {
    agent_id, agent_name, agent_email, amount,
    referral_count, gcash_ref, screenshot_url,
    period_start, period_end,
  } = req.body

  if (!agent_email || !amount) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const firstName = agent_name?.split(' ')[0] || 'Agent'

  // Fetch students who used this agent's code during the period
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

  try {
    await resend.emails.send({
      from   : 'Readwise by Skai <skai@readwisebyskai.com>',
      to     : agent_email,
      subject: `💸 ₱${amount} Sent! Your Readwise Commission is Here`,
      html   : payoutHTML({ firstName, amount, referral_count, gcash_ref, screenshot_url, period_start, period_end, students }),
    })
    res.status(200).json({ success: true })
  } catch (err) {
    console.error('send-payout-confirmation error:', err)
    res.status(500).json({ error: err.message })
  }
}

function payoutHTML({ firstName, amount, referral_count, gcash_ref, screenshot_url, period_start, period_end, students }) {
  const periodStr = period_start && period_end
    ? `${new Date(period_start).toLocaleDateString('en-PH', { month:'long', day:'numeric' })} – ${new Date(period_end).toLocaleDateString('en-PH', { month:'long', day:'numeric', year:'numeric' })}`
    : 'This week'

  const nextTarget   = referral_count + 5
  const nextEarnings = nextTarget * 50

  const studentRows = students.length > 0
    ? students.map(s => `
      <tr>
        <td style="padding:8px 12px;font-size:13px;color:#ccc;border-bottom:1px solid #2a2a2a;">${s.name}</td>
        <td style="padding:8px 12px;font-size:12px;color:#666;border-bottom:1px solid #2a2a2a;text-align:right;">
          ${new Date(s.created_at).toLocaleDateString('en-PH', { month:'short', day:'numeric', year:'numeric' })}
        </td>
      </tr>`).join('')
    : `<tr><td colspan="2" style="padding:12px;font-size:12px;color:#666;text-align:center;">Student details not available.</td></tr>`

  const screenshotBlock = screenshot_url
    ? `<div style="margin:20px 0;">
        <div style="font-size:10px;color:#c9a96e;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;font-weight:700;">GCash Payment Screenshot</div>
        <img src="${screenshot_url}" alt="GCash Payment" style="width:100%;max-width:400px;border-radius:10px;border:1px solid #2a2a2a;"/>
       </div>`
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
        <div style="font-size:10px;color:#c9a96e;letter-spacing:0.06em;text-transform:uppercase;">Commission Payout</div>
      </div>
    </div>
  </div>

  <div style="padding:28px;">
    <div style="display:inline-block;background:rgba(16,185,129,0.1);border:1px solid #10B981;border-radius:20px;padding:5px 14px;font-size:12px;font-weight:700;color:#10B981;margin-bottom:16px;">✓ COMMISSION PAID</div>

    <h1 style="font-size:24px;font-weight:800;color:#fff;margin:0 0 8px;line-height:1.3;">${firstName}, your ₱${amount} is on its way! 🎉</h1>
    <p style="font-size:14px;color:#aaa;line-height:1.7;margin:0 0 20px;">You earned this by helping ${referral_count} student${referral_count !== 1 ? 's' : ''} prepare smarter for their board exam. That's real impact — and real income.</p>

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
        <tr style="background:#111;">
          <th style="padding:8px 12px;font-size:10px;color:#666;text-align:left;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Student Name</th>
          <th style="padding:8px 12px;font-size:10px;color:#666;text-align:right;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Date Enrolled</th>
        </tr>
        ${studentRows}
      </table>
    </div>

    <div style="background:rgba(201,169,110,0.06);border:1px solid rgba(201,169,110,0.2);border-radius:12px;padding:20px;margin-bottom:20px;">
      <div style="font-size:13px;font-weight:700;color:#c9a96e;margin-bottom:8px;">🚀 Keep the momentum going</div>
      <p style="font-size:13px;color:#aaa;line-height:1.7;margin:0 0 10px;">You referred <strong style="color:#fff;">${referral_count} student${referral_count !== 1 ? 's' : ''}</strong> this week. At your next target of <strong style="color:#fff;">${nextTarget} referrals</strong>, you'd earn <strong style="color:#c9a96e;">₱${nextEarnings}/week</strong>.</p>
      <p style="font-size:13px;color:#aaa;line-height:1.7;margin:0;">Board exam season never stops — there's always a new batch of students who need this. Every share is a student helped and a commission earned.</p>
    </div>

    <div style="text-align:center;padding:16px;background:#0d0d0d;border:1px solid #2a2a2a;border-radius:10px;">
      <div style="font-size:11px;color:#666;margin-bottom:4px;">Your referral link</div>
      <div style="font-size:15px;font-weight:700;color:#c9a96e;">readwisebyskai.com/buy</div>
      <div style="font-size:11px;color:#555;margin-top:4px;">Share your code with every student you know</div>
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
