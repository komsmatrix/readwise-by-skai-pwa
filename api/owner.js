// api/owner.js
// Merged: generate-key + get-customers + generate-questions
// Usage: POST { type: 'generate-key' | 'get-customers' | 'generate-questions', password, ...payload }

import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase           = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const RESEND_API_KEY     = process.env.RESEND_API_KEY
const OWNER_PASSWORD     = process.env.OWNER_PASSWORD
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const APP_URL            = process.env.VITE_APP_URL || 'https://readwisebyskai.com'
const EXPIRY_DAYS        = 7

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { type, password, ...payload } = req.body

  if (!type) return res.status(400).json({ error: 'type is required: generate-key | get-customers | generate-questions' })
  if (password !== OWNER_PASSWORD) return res.status(401).json({ error: 'Unauthorized' })

  try {
    if (type === 'generate-key')       return await handleGenerateKey(payload, res)
    if (type === 'get-customers')      return await handleGetCustomers(res)
    if (type === 'generate-questions') return await handleGenerateQuestions(payload, res)
    return res.status(400).json({ error: `Unknown type: ${type}` })
  } catch (err) {
    console.error(`owner [${type}] error:`, err)
    return res.status(500).json({ error: err.message })
  }
}

// ── GENERATE KEY ──────────────────────────────────────────────────────────────
function makeKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const seg   = (len) => Array.from({ length: len }, () => chars[crypto.randomInt(chars.length)]).join('')
  return `${seg(4)}-${seg(4)}-${seg(4)}`
}

function addDays(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

async function handleGenerateKey({ name, email, isOwnerKey, course }, res) {
  if (!name || !email) return res.status(400).json({ error: 'name and email are required' })

  let key, exists
  do {
    key = makeKey()
    const { data } = await supabase.from('access_keys').select('key').eq('key', key).single()
    exists = !!data
  } while (exists)

  const expiresAt = isOwnerKey ? null : addDays(EXPIRY_DAYS)

  const { error: keyError } = await supabase.from('access_keys').insert({
    key,
    name      : name.trim(),
    email     : email.toLowerCase().trim(),
    course    : course || 'LET',
    expires_at: expiresAt,
    is_owner  : isOwnerKey || false,
    created_at: new Date().toISOString(),
  })

  if (keyError) return res.status(500).json({ error: keyError.message })

  const firstName = name.trim().split(' ')[0]

  try {
    await fetch('https://api.resend.com/emails', {
      method : 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body   : JSON.stringify({
        from    : 'Readwise by Skai <hello@readwisebyskai.com>',
        reply_to: 'readwisebyskai@gmail.com',
        to      : [email.toLowerCase().trim()],
        subject : '📖 Your Readwise by Skai Access is Ready',
        html    : generateKeyEmailHTML({ firstName, name: name.trim(), email: email.toLowerCase().trim(), key, expiresAt, appUrl: APP_URL }),
      }),
    })
  } catch (emailErr) {
    console.warn('Email failed:', emailErr.message)
  }

  return res.status(200).json({ success: true, key, expiresAt, emailSent: true })
}

// ── GET CUSTOMERS ─────────────────────────────────────────────────────────────
async function handleGetCustomers(res) {
  const { data, error } = await supabase
    .from('customers')
    .select('id, name, email, activated_at, is_active')
    .order('activated_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json({ customers: data || [] })
}

// ── GENERATE QUESTIONS ────────────────────────────────────────────────────────
async function handleGenerateQuestions({ topicName, topicId, count, situationalPct, difficulty }, res) {
  if (!topicName || !topicId) return res.status(400).json({ error: 'topicName and topicId are required' })

  const situational = parseInt(situationalPct) || 60
  const factual     = 100 - situational
  const numQ        = Math.min(parseInt(count) || 20, 50)

  const prompt = `You are an expert LET (Licensure Examination for Teachers) board exam question writer for the Philippines.

Generate exactly ${numQ} multiple choice questions about "${topicName}" for the LET board exam.

Mix: ${situational}% situational (classroom scenarios, real teaching situations) and ${factual}% factual (theories, definitions, concepts).
Difficulty: ${difficulty === 'mixed' ? 'mix of Easy, Medium, and Hard' : difficulty}.

Rules:
- 4 options each (A, B, C, D)
- One correct answer only
- No trick questions — test real knowledge
- Situational questions must describe a realistic Filipino classroom scenario
- Include a brief explanation for the correct answer

Respond ONLY with a JSON array. No markdown, no preamble, no backticks. Example format:
[
  {
    "question": "Question text here",
    "options": {"A": "option1", "B": "option2", "C": "option3", "D": "option4"},
    "answer": "A",
    "explanation": "Brief explanation",
    "type": "situational",
    "difficulty": "Medium"
  }
]`

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method : 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type' : 'application/json',
      'HTTP-Referer' : 'https://readwisebyskai.com',
    },
    body: JSON.stringify({
      model     : 'meta-llama/llama-3.3-70b-instruct',
      max_tokens: 4000,
      messages  : [{ role: 'user', content: prompt }],
    }),
  })

  const data      = await response.json()
  const raw       = data.choices?.[0]?.message?.content || ''
  const cleaned   = raw.replace(/```json|```/g, '').trim()
  const questions = JSON.parse(cleaned)

  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error('No questions returned from AI')
  }

  const formatted = questions.map((q, i) => ({
    ...q,
    id      : `gen_${Date.now()}_${i}`,
    topic_id: topicId,
  }))

  return res.status(200).json({ success: true, questions: formatted })
}

// ── EMAIL TEMPLATE ────────────────────────────────────────────────────────────
function generateKeyEmailHTML({ firstName, name, email, key, expiresAt, appUrl }) {
  const expiryDate = expiresAt
    ? new Date(expiresAt).toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })
    : null

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0d0d0d;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;padding:40px 20px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
  <tr><td style="padding:0 0 32px 0;">
    <div style="font-size:18px;font-weight:600;color:#f0ede8;">Readwise by Skai</div>
    <div style="font-size:11px;color:#c9a96e;letter-spacing:0.08em;text-transform:uppercase;margin-top:2px;">Board Exam Operating System</div>
  </td></tr>
  <tr><td style="background:#161616;border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:40px;">
    <p style="margin:0 0 8px;font-size:22px;font-weight:600;color:#f0ede8;">Welcome, ${firstName}! 👋</p>
    <p style="margin:0 0 32px;font-size:15px;color:#9a9690;line-height:1.7;">Your lifetime access to Readwise by Skai is ready.</p>
    <div style="height:1px;background:rgba(255,255,255,0.07);margin:0 0 28px;"></div>
    <p style="margin:0 0 10px;font-size:11px;font-weight:600;color:#c9a96e;text-transform:uppercase;letter-spacing:0.08em;">Open the App</p>
    <a href="${appUrl}" style="display:inline-block;background:#c9a96e;color:#0d0d0d;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;margin-bottom:28px;">Open Readwise by Skai →</a>
    <p style="margin:0 0 10px;font-size:11px;font-weight:600;color:#c9a96e;text-transform:uppercase;letter-spacing:0.08em;">Your Access Key</p>
    <div style="background:#0d0d0d;border:1px solid rgba(201,169,110,0.3);border-radius:10px;padding:16px 20px;margin-bottom:28px;">
      <p style="margin:0 0 6px;font-family:'Courier New',monospace;font-size:26px;font-weight:700;color:#c9a96e;letter-spacing:0.12em;">${key}</p>
      ${expiryDate ? `<p style="margin:0;font-size:12px;color:#e05c5c;">⚠ Activate before ${expiryDate}</p>` : ''}
    </div>
    <p style="margin:0 0 10px;font-size:11px;font-weight:600;color:#c9a96e;text-transform:uppercase;letter-spacing:0.08em;">To Activate</p>
    <div style="background:#0d0d0d;border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:16px 20px;margin-bottom:28px;">
      <p style="margin:4px 0;font-size:13px;color:#9a9690;">① Enter your name: <span style="color:#f0ede8;">${name}</span></p>
      <p style="margin:4px 0;font-size:13px;color:#9a9690;">② Enter your email: <span style="color:#f0ede8;">${email}</span></p>
      <p style="margin:4px 0;font-size:13px;color:#9a9690;">③ Enter the access key above</p>
      <p style="margin:4px 0;font-size:13px;color:#9a9690;">④ Tap <span style="color:#c9a96e;">"Activate my access key"</span></p>
    </div>
    <div style="background:rgba(201,169,110,0.06);border:1px solid rgba(201,169,110,0.15);border-radius:8px;padding:14px 16px;">
      <p style="margin:0;font-size:13px;color:#9a9690;line-height:1.7;">You joined at the <span style="color:#c9a96e;font-weight:600;">introductory price of ₱249</span> — lifetime access, all future updates included. Pasado ka nito. 💪</p>
    </div>
  </td></tr>
  <tr><td style="padding:24px 0 0;text-align:center;">
    <p style="margin:0;font-size:12px;color:#5a5753;">Questions? Reply to this email — we're happy to help.</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}
