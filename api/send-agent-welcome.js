// api/send-agent-welcome.js
// Called when a new agent is enrolled
// Sends: referral code, agent guide, student guide link

const { Resend } = require('resend')
const resend = new Resend(process.env.RESEND_API_KEY)

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end()

  const { name, email, referral_code, gcash_number } = req.body
  if (!name || !email || !referral_code) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const firstName = name.split(' ')[0]
  const commission = 50
  const discount   = 20

  try {
    await resend.emails.send({
      from   : 'Readwise by Skai <skai@readwisebyskai.com>',
      to     : email,
      subject: `Welcome to Readwise Agent Program — Your Code: ${referral_code}`,
      html   : agentWelcomeHTML({ firstName, name, email, referral_code, gcash_number, commission, discount }),
    })

    res.status(200).json({ success: true })
  } catch (err) {
    console.error('send-agent-welcome error:', err)
    res.status(500).json({ error: err.message })
  }
}

function agentWelcomeHTML({ firstName, name, email, referral_code, gcash_number, commission, discount }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Welcome Agent</title>
  <style>
    body { margin:0; padding:0; background:#0d0d0d; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .wrap { max-width:560px; margin:0 auto; padding:32px 16px; }
    .card { background:#1a1a1a; border:1px solid #2a2a2a; border-radius:16px; overflow:hidden; }
    .header { background:#1a1a1a; padding:28px 28px 0; }
    .brand { display:flex; align-items:center; gap:10px; margin-bottom:24px; }
    .brand-icon { width:36px; height:36px; background:rgba(201,169,110,0.15); border:1px solid rgba(201,169,110,0.3); border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:800; color:#c9a96e; }
    .brand-name { font-size:17px; font-weight:700; color:#fff; }
    .brand-sub { font-size:10px; color:#c9a96e; letter-spacing:0.06em; text-transform:uppercase; }
    .body { padding:28px; }
    h1 { font-size:24px; font-weight:700; color:#fff; margin:0 0 8px; line-height:1.3; }
    p { font-size:14px; color:#aaa; line-height:1.7; margin:0 0 16px; }
    .code-box { background:#0d0d0d; border:2px solid #c9a96e; border-radius:12px; padding:20px; text-align:center; margin:20px 0; }
    .code-label { font-size:11px; color:#c9a96e; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:8px; }
    .code { font-family:monospace; font-size:32px; font-weight:800; color:#c9a96e; letter-spacing:0.15em; }
    .stats-row { display:flex; gap:12px; margin:20px 0; }
    .stat { flex:1; background:#0d0d0d; border:1px solid #2a2a2a; border-radius:10px; padding:14px; text-align:center; }
    .stat-val { font-size:22px; font-weight:700; color:#c9a96e; line-height:1; }
    .stat-label { font-size:10px; color:#666; margin-top:4px; text-transform:uppercase; letter-spacing:0.05em; }
    .steps { margin:20px 0; }
    .step { display:flex; gap:12px; margin-bottom:14px; }
    .step-num { width:24px; height:24px; border-radius:50%; background:rgba(201,169,110,0.15); border:1px solid rgba(201,169,110,0.3); color:#c9a96e; font-size:12px; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:2px; }
    .step-text { font-size:13px; color:#aaa; line-height:1.6; }
    .step-text strong { color:#fff; }
    .divider { height:1px; background:#2a2a2a; margin:20px 0; }
    .cta-btn { display:block; background:#c9a96e; color:#0d0d0d; text-decoration:none; padding:14px; border-radius:10px; font-size:15px; font-weight:700; text-align:center; margin:20px 0; }
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
          <div class="brand-sub">Agent Program</div>
        </div>
      </div>
    </div>
    <div class="body">
      <h1>Welcome to the team, ${firstName}! 🎉</h1>
      <p>You're now an official Readwise Agent. Here's everything you need to start earning.</p>

      <div class="code-box">
        <div class="code-label">Your Referral Code</div>
        <div class="code">${referral_code}</div>
      </div>

      <div class="stats-row">
        <div class="stat">
          <div class="stat-val">₱${commission}</div>
          <div class="stat-label">Your Commission</div>
        </div>
        <div class="stat">
          <div class="stat-val">₱${discount}</div>
          <div class="stat-label">Student Discount</div>
        </div>
        <div class="stat">
          <div class="stat-val">Every<br/>Friday</div>
          <div class="stat-label">Payout Day</div>
        </div>
      </div>

      <div class="divider"></div>

      <p style="color:#fff; font-weight:600; margin-bottom:12px;">How it works:</p>
      <div class="steps">
        <div class="step">
          <div class="step-num">1</div>
          <div class="step-text">Share your code <strong>${referral_code}</strong> with students preparing for board exams.</div>
        </div>
        <div class="step">
          <div class="step-num">2</div>
          <div class="step-text">Students enter your code at checkout — they get <strong>₱${discount} off</strong>, you earn <strong>₱${commission} commission</strong>.</div>
        </div>
        <div class="step">
          <div class="step-num">3</div>
          <div class="step-text">Commissions are paid every <strong>Friday via GCash</strong> to <strong>${gcash_number}</strong>.</div>
        </div>
        <div class="step">
          <div class="step-num">4</div>
          <div class="step-text">You'll receive an email confirmation with proof of payment every payout.</div>
        </div>
      </div>

      <div class="divider"></div>

      <a href="https://readwisebyskai.com/agent-guide" class="cta-btn">View Your Agent Guide →</a>
      <p style="font-size:12px; text-align:center; color:#555;">Share this link with students: <strong style="color:#c9a96e;">readwisebyskai.com/buy?ref=${referral_code}</strong></p>

    </div>
    <div class="footer">
      <p>Readwise by Skai · Agent Program<br/>
      Questions? Reply to this email.<br/>
      GCash payouts sent to: ${gcash_number}</p>
    </div>
  </div>
</div>
</body>
</html>
  `
}
