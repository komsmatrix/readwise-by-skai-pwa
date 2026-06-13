// api/send-payout-confirmation.js
// Called when owner marks a payout as paid
// Sends GCash confirmation + screenshot to agent

const { Resend } = require('resend')
const resend = new Resend(process.env.RESEND_API_KEY)

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end()

  const {
    agent_name,
    agent_email,
    amount,
    referral_count,
    gcash_ref,
    screenshot_url,
    period_start,
    period_end,
  } = req.body

  if (!agent_email || !amount) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const firstName = agent_name?.split(' ')[0] || 'Agent'

  try {
    const emailPayload = {
      from   : 'Readwise by Skai <skai@readwisebyskai.com>',
      to     : agent_email,
      subject: `✅ Commission Paid — ₱${amount} · Readwise`,
      html   : payoutHTML({
        firstName, agent_name, amount, referral_count,
        gcash_ref, screenshot_url, period_start, period_end,
      }),
    }

    // Attach screenshot if available
    if (screenshot_url) {
      emailPayload.html = emailPayload.html.replace(
        '<!-- SCREENSHOT_PLACEHOLDER -->',
        `<img src="${screenshot_url}" alt="GCash Payment Screenshot" style="width:100%;max-width:400px;border-radius:10px;margin:16px 0;border:1px solid #2a2a2a;"/>`
      )
    }

    await resend.emails.send(emailPayload)
    res.status(200).json({ success: true })
  } catch (err) {
    console.error('send-payout-confirmation error:', err)
    res.status(500).json({ error: err.message })
  }
}

function payoutHTML({ firstName, agent_name, amount, referral_count, gcash_ref, screenshot_url, period_start, period_end }) {
  const periodStr = period_start && period_end
    ? `${new Date(period_start).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} – ${new Date(period_end).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : 'This week'

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <style>
    body { margin:0; padding:0; background:#0d0d0d; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; }
    .wrap { max-width:560px; margin:0 auto; padding:32px 16px; }
    .card { background:#1a1a1a; border:1px solid #2a2a2a; border-radius:16px; overflow:hidden; }
    .header { padding:28px 28px 0; }
    .brand { display:flex; align-items:center; gap:10px; margin-bottom:24px; }
    .brand-icon { width:36px; height:36px; background:rgba(201,169,110,0.15); border:1px solid rgba(201,169,110,0.3); border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:800; color:#c9a96e; }
    .brand-name { font-size:17px; font-weight:700; color:#fff; }
    .brand-sub { font-size:10px; color:#c9a96e; letter-spacing:0.06em; text-transform:uppercase; }
    .body { padding:28px; }
    .paid-badge { display:inline-block; background:rgba(16,185,129,0.1); border:1px solid #10B981; border-radius:20px; padding:5px 14px; font-size:12px; font-weight:700; color:#10B981; margin-bottom:16px; }
    h1 { font-size:22px; font-weight:700; color:#fff; margin:0 0 8px; }
    p { font-size:14px; color:#aaa; line-height:1.7; margin:0 0 16px; }
    .amount-box { background:#0d0d0d; border:2px solid #10B981; border-radius:12px; padding:20px; text-align:center; margin:20px 0; }
    .amount-label { font-size:11px; color:#10B981; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:6px; }
    .amount { font-size:40px; font-weight:800; color:#10B981; line-height:1; }
    .amount-sub { font-size:12px; color:#666; margin-top:6px; }
    .details { background:#0d0d0d; border:1px solid #2a2a2a; border-radius:10px; padding:16px; margin:16px 0; }
    .detail-row { display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #1a1a1a; }
    .detail-row:last-child { border-bottom:none; }
    .detail-label { font-size:12px; color:#666; }
    .detail-val { font-size:12px; color:#fff; font-weight:600; }
    .footer { padding:20px 28px; border-top:1px solid #2a2a2a; }
    .footer p { font-size:11px; color:#444; margin:0; line-height:1.6; }
  </style>
</head>
<body>
<div class="wrap">
  <div class="card">
    <div class="header">
      <div class="brand">
        <div class="brand-icon">R</div>
        <div>
          <div class="brand-name">Readwise by Skai</div>
          <div class="brand-sub">Commission Payout</div>
        </div>
      </div>
    </div>
    <div class="body">
      <div class="paid-badge">✓ PAID</div>
      <h1>${firstName}, your commission is on its way! 💸</h1>
      <p>Your GCash payment has been sent. Thank you for referring students to Readwise!</p>

      <div class="amount-box">
        <div class="amount-label">Amount Sent</div>
        <div class="amount">₱${amount}</div>
        <div class="amount-sub">${referral_count} referral${referral_count !== 1 ? 's' : ''} × ₱50 commission</div>
      </div>

      <div class="details">
        <div class="detail-row">
          <span class="detail-label">Period</span>
          <span class="detail-val">${periodStr}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Referrals</span>
          <span class="detail-val">${referral_count} students</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Amount</span>
          <span class="detail-val">₱${amount}</span>
        </div>
        ${gcash_ref ? `
        <div class="detail-row">
          <span class="detail-label">GCash Reference</span>
          <span class="detail-val">${gcash_ref}</span>
        </div>` : ''}
      </div>

      <!-- SCREENSHOT_PLACEHOLDER -->

      <p style="font-size:12px; color:#555; text-align:center; margin-top:16px;">
        Keep sharing your referral code to earn more next Friday!
      </p>
    </div>
    <div class="footer">
      <p>Readwise by Skai · Agent Program<br/>
      Questions about your payout? Reply to this email.<br/>
      Next payout: Every Friday</p>
    </div>
  </div>
</div>
</body>
</html>
  `
}
