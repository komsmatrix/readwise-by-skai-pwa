import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const RESEND_API_KEY   = process.env.RESEND_API_KEY
const APP_URL          = process.env.VITE_APP_URL || 'https://readwisebyskai.com'
const AGENT_COMMISSION = 20  // ₱20 flat commission — agent and agency codes, any course

function generateKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const seg   = (len) => Array.from({ length: len }, () => chars[crypto.randomInt(chars.length)]).join('')
  return `${seg(4)}-${seg(4)}-${seg(4)}`
}

function addDays(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

function tesdaWelcomeEmail({ firstName, email, key, appUrl }) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0d0d0d;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;padding:40px 20px;">
  <tr><td align="center">
  <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
    <tr><td style="padding:0 0 24px 0;">
      <span style="font-size:22px;font-weight:700;color:#f0ede8;">Readwise <span style="color:#3b82f6;">by Skai</span></span>
      <div style="font-size:11px;color:#3b82f6;letter-spacing:0.08em;text-transform:uppercase;margin-top:4px;">TESDA NC Qualifications</div>
    </td></tr>
    <tr><td style="background:#161616;border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:40px;">
      <p style="margin:0 0 6px;font-size:24px;font-weight:700;color:#f0ede8;">You're in, ${firstName}. 🏅</p>
      <p style="margin:0 0 28px;font-size:15px;color:#9a9690;line-height:1.7;">Your TESDA NC reviewer bundle is ready. All qualifications, full access — for life.</p>
      <div style="height:1px;background:rgba(255,255,255,0.07);margin:0 0 28px;"></div>
      <div style="background:#0d0d0d;border:1px solid rgba(59,130,246,0.25);border-radius:12px;padding:20px 24px;margin-bottom:24px;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#3b82f6;text-transform:uppercase;letter-spacing:0.08em;">Access your reviewers</p>
        <p style="margin:0 0 16px;font-size:14px;color:#9a9690;line-height:1.6;">Sign in with <strong style="color:#f0ede8;">${email}</strong> and select TESDA from your course hub.</p>
        <a href="${appUrl}" style="display:inline-block;background:#3b82f6;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:700;">Open Readwise by Skai →</a>
      </div>
      <p style="margin:0 0 12px;font-size:11px;font-weight:700;color:#3b82f6;text-transform:uppercase;letter-spacing:0.08em;">What's included in your bundle</p>
      <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:24px;">
        ${['Cookery NC II','Caregiving NC II','Housekeeping NC II','Domestic Work NC II','Beauty Care NC II','Electrical Installation NC II','Bread & Pastry Production NC II','Driving NC II'].map(q =>
          `<tr><td style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:13px;color:#9a9690;">✓ <strong style="color:#f0ede8;">${q}</strong></td></tr>`
        ).join('')}
      </table>
      <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#3b82f6;text-transform:uppercase;letter-spacing:0.08em;">Each qualification includes</p>
      <div style="background:#0d0d0d;border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0;font-size:13px;color:#9a9690;line-height:1.8;">📖 Full HTML reviewer per core competency<br>🇵🇭 Filipino &amp; English versions<br>📹 Video lessons<br>🖼 Infographics and visual guides</p>
      </div>
      <div style="background:rgba(59,130,246,0.06);border:1px solid rgba(59,130,246,0.15);border-radius:10px;padding:16px 20px;">
        <p style="margin:0;font-size:13px;color:#9a9690;line-height:1.7;">You joined at the <strong style="color:#3b82f6;">introductory price of ₱99</strong> — lifetime access, all future qualifications included. Congratulations on investing in your TESDA journey. 💪</p>
      </div>
    </td></tr>
    <tr><td style="padding:24px 0 0;text-align:center;">
      <p style="margin:0;font-size:12px;color:#5a5753;">Questions? Reply to this email — we read every one.</p>
    </td></tr>
  </table>
  </td></tr>
</table>
</body>
</html>`
}

function welcomeEmail({ firstName, name, email, key, appUrl, course }) {
  const isTesda = course === 'TESDA'
  const heroLine = isTesda
    ? `Your TESDA NC reviewers are ready — all qualifications, full access.`
    : `Your payment was received. Your board exam prep starts now.`
  const step2Label = isTesda
    ? 'Go to the app → tap <strong style="color:#f0ede8;">TESDA</strong> → browse all NC qualifications.'
    : `Go to the app → click <strong style="color:#f0ede8;">New Customer</strong> → enter your name <strong style="color:#f0ede8;">${name}</strong>, email <strong style="color:#f0ede8;">${email}</strong>, and the key above → tap Activate.`
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0d0d0d;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;padding:40px 20px;">
  <tr><td align="center">
  <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

    <!-- Header -->
    <tr><td style="padding:0 0 24px 0;">
      <div style="display:flex;align-items:center;gap:10px;">
        <span style="font-size:22px;font-weight:700;color:#f0ede8;letter-spacing:-0.02em;">Readwise <span style="color:#c9a96e;">by Skai</span></span>
      </div>
      <div style="font-size:11px;color:#c9a96e;letter-spacing:0.08em;text-transform:uppercase;margin-top:4px;">Board Exam Operating System</div>
    </td></tr>

    <!-- Main card -->
    <tr><td style="background:#161616;border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:40px;">

      <p style="margin:0 0 6px;font-size:24px;font-weight:700;color:#f0ede8;letter-spacing:-0.02em;">You're in, ${firstName}.</p>
      <p style="margin:0 0 28px;font-size:15px;color:#9a9690;line-height:1.7;">${heroLine}</p>

      <div style="height:1px;background:rgba(255,255,255,0.07);margin:0 0 28px;"></div>

      <!-- Option 1: Direct login -->
      <div style="background:#0d0d0d;border:1px solid rgba(201,169,110,0.25);border-radius:12px;padding:20px 24px;margin-bottom:16px;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#c9a96e;text-transform:uppercase;letter-spacing:0.08em;">Option 1 — Easiest</p>
        <p style="margin:0 0 12px;font-size:15px;font-weight:600;color:#f0ede8;">Log in directly with your email</p>
        <p style="margin:0 0 16px;font-size:13px;color:#9a9690;line-height:1.6;">Since you paid online, your account is already active. Just go to the app and sign in as a returning customer using <strong style="color:#f0ede8;">${email}</strong> — no key needed.</p>
        <a href="${appUrl}" style="display:inline-block;background:#c9a96e;color:#0d0d0d;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:700;">Open Readwise by Skai →</a>
      </div>

      <!-- Option 2: Manual key -->
      <div style="background:#0d0d0d;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:20px 24px;margin-bottom:28px;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#9a9690;text-transform:uppercase;letter-spacing:0.08em;">Option 2 — If Option 1 doesn't work</p>
        <p style="margin:0 0 12px;font-size:15px;font-weight:600;color:#f0ede8;">Activate manually with your key</p>
        <div style="background:#111;border:1px solid rgba(201,169,110,0.2);border-radius:8px;padding:14px 18px;margin-bottom:12px;">
          <p style="margin:0;font-family:'Courier New',monospace;font-size:22px;font-weight:700;color:#c9a96e;letter-spacing:0.12em;">${key}</p>
        </div>
        <p style="margin:0;font-size:13px;color:#9a9690;line-height:1.6;">${step2Label}</p>
      </div>

      <div style="height:1px;background:rgba(255,255,255,0.07);margin:0 0 28px;"></div>

      <!-- Product guide -->
      <p style="margin:0 0 16px;font-size:11px;font-weight:700;color:#c9a96e;text-transform:uppercase;letter-spacing:0.08em;">What Readwise does for you</p>

      <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:12px;">
        <tr>
          <td style="width:50%;padding:0 6px 8px 0;vertical-align:top;">
            <div style="background:#111;border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:16px;">
              <p style="margin:0 0 6px;font-size:18px;">🎯</p>
              <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#f0ede8;">Tells you what to study</p>
              <p style="margin:0;font-size:12px;color:#5a5753;line-height:1.5;">Your Next Best Action updates every session based on your gaps and exam date.</p>
            </div>
          </td>
          <td style="width:50%;padding:0 0 8px 6px;vertical-align:top;">
            <div style="background:#111;border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:16px;">
              <p style="margin:0 0 6px;font-size:18px;">🧠</p>
              <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#f0ede8;">Remembers what you forget</p>
              <p style="margin:0;font-size:12px;color:#5a5753;line-height:1.5;">Spaced repetition surfaces cards right before you'd forget them — not when it's too late.</p>
            </div>
          </td>
        </tr>
        <tr>
          <td style="width:50%;padding:0 6px 0 0;vertical-align:top;">
            <div style="background:#111;border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:16px;">
              <p style="margin:0 0 6px;font-size:18px;">📊</p>
              <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#f0ede8;">Predicts if you'll pass</p>
              <p style="margin:0;font-size:12px;color:#5a5753;line-height:1.5;">Your Readiness Score updates after every session — weighted by actual board exam topics.</p>
            </div>
          </td>
          <td style="width:50%;padding:0 0 0 6px;vertical-align:top;">
            <div style="background:#111;border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:16px;">
              <p style="margin:0 0 6px;font-size:18px;">💬</p>
              <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#f0ede8;">Coaches you daily</p>
              <p style="margin:0;font-size:12px;color:#5a5753;line-height:1.5;">Coach Insights tell you exactly what's pulling your score down and what to do next.</p>
            </div>
          </td>
        </tr>
      </table>

      <div style="height:1px;background:rgba(255,255,255,0.07);margin:24px 0;"></div>

      <!-- Quick start -->
      <p style="margin:0 0 12px;font-size:11px;font-weight:700;color:#c9a96e;text-transform:uppercase;letter-spacing:0.08em;">Quick start — 3 steps</p>
      <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:24px;">
        <tr><td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
          <span style="font-size:13px;color:#c9a96e;font-weight:700;margin-right:12px;">01</span>
          <span style="font-size:13px;color:#9a9690;">Open the app and complete the <strong style="color:#f0ede8;">3-step onboarding</strong> — set your exam date and study mode.</span>
        </td></tr>
        <tr><td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
          <span style="font-size:13px;color:#c9a96e;font-weight:700;margin-right:12px;">02</span>
          <span style="font-size:13px;color:#9a9690;">Take the <strong style="color:#f0ede8;">diagnostic quiz</strong> so Readwise knows your starting point.</span>
        </td></tr>
        <tr><td style="padding:8px 0;">
          <span style="font-size:13px;color:#c9a96e;font-weight:700;margin-right:12px;">03</span>
          <span style="font-size:13px;color:#9a9690;">Hit <strong style="color:#f0ede8;">Start Now</strong> on your first Next Best Action and build the habit.</span>
        </td></tr>
      </table>

      <div style="background:rgba(201,169,110,0.06);border:1px solid rgba(201,169,110,0.15);border-radius:10px;padding:16px 20px;">
        <p style="margin:0;font-size:13px;color:#9a9690;line-height:1.7;">You joined at the <strong style="color:#c9a96e;">introductory price</strong> — lifetime access, all future updates included. Study consistently and your Readiness Score will reflect it. Pasado ka nito. 💪</p>
      </div>

    </td></tr>

    <!-- Footer -->
    <tr><td style="padding:24px 0 0;text-align:center;">
      <p style="margin:0 0 4px;font-size:12px;color:#5a5753;">Questions? Reply to this email — we read every one.</p>
      <p style="margin:0;font-size:12px;color:#3a3835;">— Readwise by Skai Team</p>
    </td></tr>

  </table>
  </td></tr>
</table>
</body>
</html>`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    console.log('Webhook received:', JSON.stringify(req.body).slice(0, 200))

    const event = req.body?.data?.attributes
    const type  = event?.type

    if (type !== 'checkout_session.payment.paid') {
      return res.status(200).json({ received: true })
    }

    const session      = event?.data?.attributes
    const metadata     = session?.metadata || {}
    const billing      = session?.billing  || {}

    const name         = metadata.customer_name  || billing.name  || 'Student'
    const email        = metadata.customer_email || billing.email || ''
    const agentId      = metadata.agent_id       || null
    const referralCode = metadata.referral_code  || null
    const amountPaid   = metadata.final_price    || 24900
    const course       = metadata.course         || 'LET'

    console.log('Payment data:', { name, email, agentId, referralCode, amountPaid, course })

    if (!email) return res.status(400).json({ error: 'No email in payment data' })

    // Fetch existing customer FIRST before any logic that references it
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id, courses, amount_paid, is_active')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle()

    const key       = generateKey()
    // Lifetime access — 100 years
    const expiresAt = addDays(36500)

    // Only insert access key for non-online purchases (agents, manual grants)
    // Online buyers use email-only login — key is backup only
    await supabase.from('access_keys').insert({
      key,
      name      : name.trim(),
      email     : email.toLowerCase().trim(),
      course    : course,
      expires_at: expiresAt,
      is_owner  : false,
      created_at: new Date().toISOString(),
    })

    // Build courses array — accumulate, never overwrite
    const existingCourses = existingCustomer?.courses || []
    const courses = [...new Set([...existingCourses, course])]

    // Check if customer already paid for this exact course
    const alreadyHasCourse = existingCourses.includes(course)
    if (alreadyHasCourse) {
      console.log(`Customer ${email} already has ${course} — skipping duplicate purchase processing`)
      // Still send a "you already have access" email but don't create duplicate key
      await fetch('https://api.resend.com/emails', {
        method : 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body   : JSON.stringify({
          from   : 'Readwise by Skai <hello@readwisebyskai.com>',
          to     : [email.toLowerCase().trim()],
          subject: `You already have access to ${course}`,
          html   : `<div style="font-family:sans-serif;background:#0d0d0d;color:#f0ede8;padding:40px;border-radius:12px;max-width:560px;margin:0 auto;">
            <h2>Hi ${name.trim().split(' ')[0]},</h2>
            <p>It looks like you already have access to <strong>${course}</strong> on Readwise by Skai.</p>
            <p>No duplicate charge was processed. If you believe this is an error, please reply to this email and we'll sort it out right away.</p>
            <a href="${APP_URL}" style="display:inline-block;background:#c9a96e;color:#0d0d0d;padding:12px 24px;border-radius:8px;font-weight:700;text-decoration:none;margin-top:16px;">Open Readwise →</a>
          </div>`,
        }),
      })
      return res.status(200).json({ success: true, note: 'already_has_course' })
    }

    if (existingCustomer) {
      // Existing customer — only add the new course, preserve everything else
      await supabase.from('customers').update({
        courses   : courses,
        is_active : true,
        // Add to total amount paid — don't overwrite it
        amount_paid: (existingCustomer.amount_paid || 0) + Math.round(amountPaid / 100),
      }).eq('email', email.toLowerCase().trim())
    } else {
      // New customer — insert fresh record
      await supabase.from('customers').insert({
        name         : name.trim(),
        email        : email.toLowerCase().trim(),
        key_used     : key,
        is_active    : true,
        activated_at : new Date().toISOString(),
        amount_paid  : Math.round(amountPaid / 100),
        referral_code: referralCode || null,
        courses      : courses,
      })
    }

    if (agentId) {
      const { data: agent } = await supabase
        .from('agents').select('total_referrals, total_commission').eq('id', agentId).single()
      if (agent) {
        // Commission: flat ₱20 for every referral, agent or agency code, any course
        await supabase.from('agents').update({
          total_referrals : (agent.total_referrals  || 0) + 1,
          total_commission: (agent.total_commission || 0) + AGENT_COMMISSION,
        }).eq('id', agentId)
      }
    }

    const firstName = name.trim().split(' ')[0]
    const isTesda   = course === 'TESDA'
    const emailRes  = await fetch('https://api.resend.com/emails', {
      method : 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type' : 'application/json',
      },
      body: JSON.stringify({
        from   : 'Readwise by Skai <hello@readwisebyskai.com>',
        to     : [email.toLowerCase().trim()],
        subject: isTesda
          ? "You're in — your TESDA NC Reviewers are ready 🏅"
          : "You're in — your Readwise by Skai access is ready",
        html   : isTesda
          ? tesdaWelcomeEmail({ firstName, email: email.toLowerCase().trim(), key, appUrl: APP_URL })
          : welcomeEmail({ firstName, name: name.trim(), email: email.toLowerCase().trim(), key, appUrl: APP_URL, course }),
      }),
    })

    console.log('Email sent:', emailRes.status)
    return res.status(200).json({ success: true })

  } catch (err) {
    console.error('Webhook error:', err)
    return res.status(500).json({ error: err.message })
  }
}
