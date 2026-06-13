// api/send-agent-blast.js
// Owner sends an update email to all active agents
// Called from the Owner Dashboard → Agents tab → Email All Agents

const { Resend } = require('resend')
const { createClient } = require('@supabase/supabase-js')

const resend  = new Resend(process.env.RESEND_API_KEY)
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
)

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end()

  const { subject, message, resource_url, resource_label } = req.body

  if (!subject || !message) {
    return res.status(400).json({ error: 'Subject and message are required.' })
  }

  // Fetch all active agents
  const { data: agents, error } = await supabase
    .from('agents')
    .select('name, email, referral_code, total_referrals')
    .eq('is_active', true)

  if (error || !agents?.length) {
    return res.status(400).json({ error: 'No active agents found.' })
  }

  let sent = 0
  let failed = 0

  // Send individually so each email is personalized
  for (const agent of agents) {
    const firstName = agent.name?.split(' ')[0] || 'Agent'
    try {
      await resend.emails.send({
        from   : 'Readwise by Skai <skai@readwisebyskai.com>',
        to     : agent.email,
        subject: subject,
        html   : blastHTML({ firstName, agent, subject, message, resource_url, resource_label }),
      })
      sent++
    } catch (e) {
      console.error(`Failed to send to ${agent.email}:`, e)
      failed++
    }
  }

  res.status(200).json({ success: true, sent, failed, total: agents.length })
}

function blastHTML({ firstName, agent, subject, message, resource_url, resource_label }) {
  const resourceBlock = resource_url
    ? `<div style="margin:20px 0;text-align:center;">
        <a href="${resource_url}" style="display:inline-block;background:#c9a96e;color:#0d0d0d;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:700;">
          ${resource_label || 'View Resource →'}
        </a>
       </div>`
    : ''

  // Convert newlines to <br> for HTML display
  const formattedMessage = message.replace(/\n/g, '<br/>')

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
    <h1 style="font-size:22px;font-weight:800;color:#fff;margin:0 0 16px;line-height:1.3;">Hi ${firstName}! 👋</h1>

    <div style="font-size:14px;color:#ccc;line-height:1.8;margin-bottom:20px;">${formattedMessage}</div>

    ${resourceBlock}

    <div style="height:1px;background:#2a2a2a;margin:20px 0;"></div>

    <!-- Agent stats reminder -->
    <div style="background:#0d0d0d;border:1px solid #2a2a2a;border-radius:10px;padding:14px;margin-bottom:16px;">
      <div style="font-size:10px;color:#c9a96e;text-transform:uppercase;letter-spacing:0.07em;font-weight:700;margin-bottom:8px;">Your Stats</div>
      <div style="display:flex;gap:16px;">
        <div>
          <div style="font-size:20px;font-weight:800;color:#c9a96e;">${agent.total_referrals}</div>
          <div style="font-size:10px;color:#666;">Total Referrals</div>
        </div>
        <div>
          <div style="font-size:20px;font-weight:800;color:#10B981;">₱${agent.total_referrals * 50}</div>
          <div style="font-size:10px;color:#666;">Total Earned</div>
        </div>
        <div>
          <div style="font-size:14px;font-weight:700;color:#fff;font-family:monospace;">${agent.referral_code}</div>
          <div style="font-size:10px;color:#666;">Your Code</div>
        </div>
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
