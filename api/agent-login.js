// api/agent-login.js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { referral_code, pin } = req.body
  if (!referral_code || !pin) {
    return res.status(400).json({ success: false, reason: 'missing_fields' })
  }

  try {
    const code = referral_code.trim().toUpperCase()
    const { data: agent, error } = await supabase
      .from('agents')
      .select('id, name, referral_code, code_type, is_active, total_referrals, total_commission, pin, created_at')
      .eq('referral_code', code)
      .single()

    // Generic failure for both "code doesn't exist" and "wrong PIN" —
    // never reveal which one it was, so a stranger can't use trial and
    // error to discover valid referral codes.
    if (error || !agent || !agent.pin || String(agent.pin) !== String(pin).trim()) {
      return res.status(200).json({ success: false, reason: 'invalid_credentials' })
    }

    if (!agent.is_active) {
      return res.status(200).json({ success: false, reason: 'inactive' })
    }

    const { data: payoutData } = await supabase
      .from('agent_payouts')
      .select('amount, referral_count, period_start, period_end, paid, paid_at, gcash_ref')
      .eq('agent_id', agent.id)
      .order('paid_at', { ascending: false })

    const payouts = payoutData || []
    const totalPaid = payouts.filter(p => p.paid).reduce((sum, p) => sum + (p.amount || 0), 0)
    const unpaidReferrals = Math.max(0, (agent.total_referrals || 0) -
      payouts.filter(p => p.paid).reduce((sum, p) => sum + (p.referral_count || 0), 0))

    return res.status(200).json({
      success: true,
      agent: {
        name             : agent.name,
        referral_code    : agent.referral_code,
        code_type        : agent.code_type || 'agent',
        total_referrals  : agent.total_referrals || 0,
        total_commission : agent.total_commission || 0,
        total_paid       : totalPaid,
        owed_now         : unpaidReferrals * 20,
        unpaid_referrals : unpaidReferrals,
        member_since     : agent.created_at,
      },
      payouts: payouts.filter(p => p.paid),
    })
  } catch (err) {
    console.error('Agent login error:', err)
    return res.status(500).json({ success: false, reason: 'server_error' })
  }
}
