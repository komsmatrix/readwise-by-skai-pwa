// api/agents.js — Agent management: create, list, sales, mark paid
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
)

const OWNER_PASSWORD  = process.env.OWNER_PASSWORD
const RESEND_API_KEY  = process.env.RESEND_API_KEY
const APP_URL         = process.env.VITE_APP_URL || 'https://readwisebyskai.com'

function generateCode(name) {
  const base    = name.trim().split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6)
  const suffix  = Math.floor(Math.random() * 90 + 10)
  return `${base}${suffix}`
}

function payoutEmail({ agentName, amount, salesCount, periodStart, periodEnd }) {
  const start = new Date(periodStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const end   = new Date(periodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0d0d0d;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr><td style="padding:0 0 24px;">
          <div style="font-size:18px;font-weight:600;color:#f0ede8;">Readwise by Skai</div>
          <div style="font-size:11px;color:#c9a96e;text-transform:uppercase;letter-spacing:0.08em;margin-top:2px;">Agent Payout</div>
        </td></tr>
        <tr><td style="background:#161616;border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:40px;">
          <p style="margin:0 0 8px;font-size:22px;font-weight:600;color:#f0ede8;">Payout Sent! 🎉</p>
          <p style="margin:0 0 28px;font-size:15px;color:#9a9690;line-height:1.7;">Hi ${agentName}, your commission payout has been sent. Thank you for your hard work!</p>
          <div style="background:#0d0d0d;border:1px solid rgba(201,169,110,0.25);border-radius:10px;padding:24px;margin:0 0 24px;">
            <table cellpadding="0" cellspacing="0" style="width:100%;">
              <tr>
                <td style="font-size:13px;color:#9a9690;padding-bottom:12px;">Period</td>
                <td style="font-size:13px;color:#f0ede8;font-weight:500;text-align:right;padding-bottom:12px;">${start} – ${end}</td>
              </tr>
              <tr>
                <td style="font-size:13px;color:#9a9690;padding-bottom:12px;">Total Sales</td>
                <td style="font-size:13px;color:#f0ede8;font-weight:500;text-align:right;padding-bottom:12px;">${salesCount} sale${salesCount !== 1 ? 's' : ''}</td>
              </tr>
              <tr>
                <td style="border-top:1px solid rgba(255,255,255,0.07);padding-top:12px;font-size:15px;color:#c9a96e;font-weight:600;">Payout Amount</td>
                <td style="border-top:1px solid rgba(255,255,255,0.07);padding-top:12px;font-size:20px;color:#c9a96e;font-weight:700;text-align:right;">₱${amount.toFixed(2)}</td>
              </tr>
            </table>
          </div>
          <p style="margin:0;font-size:13px;color:#5a5753;line-height:1.7;text-align:center;">Keep sharing and earn more next week! 💪</p>
        </td></tr>
        <tr><td style="padding:24px 0 0;text-align:center;">
          <p style="margin:0;font-size:12px;color:#5a5753;">Questions? Reply to this email — Readwise by Skai</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { action, password, ...payload } = req.body
  if (password !== OWNER_PASSWORD) return res.status(401).json({ error: 'Unauthorized' })

  try {

    // ── Create agent ────────────────────────────────────────────────────────
    if (action === 'create') {
      const { name, email, gcash } = payload
      if (!name || !email) return res.status(400).json({ error: 'Name and email required' })

      // Generate unique code
      let code, codeExists
      do {
        code = generateCode(name)
        const { data } = await supabase.from('agents').select('id').eq('code', code).single()
        codeExists = !!data
      } while (codeExists)

      const { data: agent, error } = await supabase.from('agents').insert({
        name     : name.trim(),
        email    : email.toLowerCase().trim(),
        gcash    : gcash?.trim() || null,
        code,
        is_active: true,
        created_at: new Date().toISOString(),
      }).select().single()

      if (error) return res.status(500).json({ error: error.message })

      // Send welcome email to agent automatically
      const firstName  = name.trim().split(' ')[0]
      const buyLink    = `${APP_URL}/buy?ref=${code}`
      try {
        await fetch('https://api.resend.com/emails', {
          method : 'POST',
          headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body   : JSON.stringify({
            from    : 'Readwise by Skai <hello@readwisebyskai.com>',
            reply_to: 'readwisebyskai@gmail.com',
            to      : [email.toLowerCase().trim()],
            subject : `🤝 Welcome to the Readwise by Skai Agent Team, ${firstName}!`,
            html    : `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 20px;background:#f5f3ef;color:#1a1a1a;">
<div style="background:#0d0d0d;border-radius:16px;padding:40px 36px;border:1px solid #2a2a2a;">

  <h1 style="font-size:26px;color:#c9a96e;margin:0 0 4px;font-family:Georgia,serif;">Readwise by Skai</h1>
  <p style="color:#666;margin:0 0 32px;font-size:13px;letter-spacing:0.05em;text-transform:uppercase;">Agent Partner Program</p>

  <p style="font-size:16px;color:#f0ede8;margin:0 0 12px;">Hi ${firstName}! 👋</p>
  <p style="font-size:15px;color:#b0a898;line-height:1.7;margin:0 0 24px;">
    Welcome to the Readwise by Skai agent team! You're all set up and ready to earn. Here's everything you need to get started.
  </p>

  <div style="background:#1a1a1a;border:1px solid rgba(201,169,110,0.3);border-radius:10px;padding:20px 22px;margin:0 0 20px;text-align:center;">
    <p style="margin:0 0 6px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.08em;">Your Referral Code</p>
    <p style="margin:0 0 10px;font-size:36px;color:#c9a96e;font-family:monospace;font-weight:700;letter-spacing:0.15em;">${code}</p>
    <p style="margin:0;font-size:13px;color:#666;">Customers enter this at checkout for ₱20 off</p>
  </div>

  <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;padding:18px 20px;margin:0 0 20px;">
    <p style="margin:0 0 8px;font-size:13px;color:#f0ede8;font-weight:600;">💰 How You Earn</p>
    <table style="width:100%;border-collapse:collapse;">
      <tr><td style="padding:6px 0;font-size:13px;color:#888;">Customer pays</td><td style="padding:6px 0;font-size:13px;color:#c9a96e;font-weight:600;text-align:right;">₱249</td></tr>
      <tr><td style="padding:6px 0;font-size:13px;color:#888;">Discount for customer</td><td style="padding:6px 0;font-size:13px;color:#c9a96e;font-weight:600;text-align:right;">₱20 off</td></tr>
      <tr><td style="padding:6px 0;font-size:13px;color:#888;">Your commission</td><td style="padding:6px 0;font-size:14px;color:#3a9a6a;font-weight:700;text-align:right;">₱50 per sale</td></tr>
      <tr><td style="padding:6px 0;font-size:13px;color:#888;">Payout schedule</td><td style="padding:6px 0;font-size:13px;color:#c9a96e;font-weight:600;text-align:right;">Every Friday via GCash</td></tr>
    </table>
  </div>

  <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;padding:18px 20px;margin:0 0 20px;">
    <p style="margin:0 0 8px;font-size:13px;color:#f0ede8;font-weight:600;">🔗 Your Personal Buy Link</p>
    <a href="${buyLink}" style="display:block;background:#1e1e1e;border:1px solid rgba(201,169,110,0.2);border-radius:8px;padding:10px 14px;font-family:monospace;font-size:13px;color:#c9a96e;text-decoration:none;word-break:break-all;">${buyLink}</a>
    <p style="margin:8px 0 0;font-size:12px;color:#666;">Share this link — the referral code is pre-filled automatically.</p>
  </div>

  <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;padding:18px 20px;margin:0 0 28px;">
    <p style="margin:0 0 10px;font-size:13px;color:#f0ede8;font-weight:600;">💬 Ready-to-Send Message</p>
    <p style="margin:0;font-size:13px;color:#888;line-height:1.75;font-style:italic;background:#111;padding:14px;border-radius:8px;border-left:3px solid #c9a96e;">
"Hey! I found this app I think you'd love — it's your own personal reading space. Upload any book you own and read it beautifully, plus there's a growing library of classics included. Dark mode, Text-to-Speech, works on any device. ₱229 only with my code <strong style="color:#c9a96e;">${code}</strong>: ${buyLink}"
    </p>
  </div>

  <hr style="border:none;border-top:1px solid #2a2a2a;margin:0 0 20px;">
  <p style="font-size:13px;color:#555;line-height:1.7;margin:0;">
    Questions? Just reply to this email — Kyle reads every message personally.<br>
    Let's grow this together! 🚀
  </p>
</div>
</body>
</html>`,
          }),
        })
      } catch (emailErr) {
        console.warn('Agent welcome email failed:', emailErr.message)
      }

      return res.status(200).json({ success: true, agent, emailSent: true })
    }

    // ── List agents with sales summary ──────────────────────────────────────
    if (action === 'list') {
      const { data: agents, error } = await supabase
        .from('agents')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) return res.status(500).json({ error: error.message })

      // Get sales counts separately
      const { data: allSales } = await supabase.from('agent_sales').select('*')
      
      const enriched = (agents || []).map(agent => {
        const sales        = (allSales || []).filter(s => s.agent_id === agent.id)
        const totalSales   = sales.length
        const unpaidSales  = sales.filter(s => !s.is_paid)
        const unpaidAmount = unpaidSales.reduce((sum, s) => sum + (s.commission || 0), 0)
        const totalEarned  = sales.reduce((sum, s) => sum + (s.commission || 0), 0)
        return { ...agent, totalSales, unpaidAmount, totalEarned, unpaidCount: unpaidSales.length }
      })

      return res.status(200).json({ success: true, agents: enriched })
    }

    // ── Get agent sales detail ───────────────────────────────────────────────
    if (action === 'sales') {
      const { agentId } = payload
      const { data: sales, error } = await supabase
        .from('agent_sales')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })

      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json({ success: true, sales })
    }

    // ── Mark agent as paid ───────────────────────────────────────────────────
    if (action === 'markpaid') {
      const { agentId } = payload

      // Get unpaid sales for this agent
      const { data: unpaidSales, error: fetchErr } = await supabase
        .from('agent_sales')
        .select('*')
        .eq('agent_id', agentId)
        .eq('is_paid', false)

      if (fetchErr) return res.status(500).json({ error: fetchErr.message })
      if (!unpaidSales?.length) return res.status(400).json({ error: 'No unpaid sales' })

      const totalAmount  = unpaidSales.reduce((sum, s) => sum + (s.commission || 0), 0)
      const periodStart  = unpaidSales[unpaidSales.length - 1].created_at
      const periodEnd    = unpaidSales[0].created_at
      const now          = new Date().toISOString()

      // Mark all unpaid sales as paid
      const saleIds = unpaidSales.map(s => s.id)
      await supabase.from('agent_sales').update({ is_paid: true, paid_at: now }).in('id', saleIds)

      // Record payout
      await supabase.from('agent_payouts').insert({
        agent_id    : agentId,
        amount      : totalAmount,
        sales_count : unpaidSales.length,
        period_start: periodStart,
        period_end  : periodEnd,
        paid_at     : now,
      })

      // Get agent info
      const { data: agent } = await supabase.from('agents').select('name, email').eq('id', agentId).single()

      // Send payout notification email
      if (agent?.email) {
        await fetch('https://api.resend.com/emails', {
          method : 'POST',
          headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from    : 'Readwise by Skai <hello@readwisebyskai.com>',
            reply_to: 'readwisebyskai@gmail.com',
            to      : [agent.email],
            subject : `✅ Your Readwise by Skai Payout of ₱${totalAmount.toFixed(2)} has been sent!`,
            html    : payoutEmail({ agentName: agent.name.split(' ')[0], amount: totalAmount, salesCount: unpaidSales.length, periodStart, periodEnd }),
          }),
        })
      }

      return res.status(200).json({ success: true, amount: totalAmount, salesCount: unpaidSales.length })
    }

    // ── Toggle agent active status ───────────────────────────────────────────
    if (action === 'toggle') {
      const { agentId, isActive } = payload
      await supabase.from('agents').update({ is_active: isActive }).eq('id', agentId)
      return res.status(200).json({ success: true })
    }

    return res.status(400).json({ error: 'Unknown action' })

  } catch (err) {
    console.error('Agents error:', err)
    return res.status(500).json({ error: err.message })
  }
}
