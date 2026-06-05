import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { code, email } = req.body
  if (!code?.trim()) return res.status(400).json({ valid: false })

  const codeUpper  = code.trim().toUpperCase()
  const emailClean = email?.toLowerCase().trim() || ''

  try {
    // 1. Check agents table first (₱20 discount)
    const { data: agent } = await supabase
      .from('agents')
      .select('id, name, email, code')
      .eq('code', codeUpper)
      .single()

    if (agent) {
      // Self-referral check
      if (emailClean && agent.email?.toLowerCase().trim() === emailClean) {
        return res.status(200).json({ valid: false, reason: 'self_referral' })
      }
      return res.status(200).json({
        valid    : true,
        type     : 'agent',
        agentId  : agent.id,
        agentName: agent.name,
        discount : 20,
      })
    }

    // 2. Check customers table (₱10 friend referral discount)
    const { data: customer } = await supabase
      .from('customers')
      .select('id, name, email, referral_code')
      .eq('referral_code', codeUpper)
      .single()

    if (customer) {
      // Self-referral check
      if (emailClean && customer.email?.toLowerCase().trim() === emailClean) {
        return res.status(200).json({ valid: false, reason: 'self_referral' })
      }
      return res.status(200).json({
        valid       : true,
        type        : 'customer',
        referrerName: customer.name,
        discount    : 10,
      })
    }

    return res.status(200).json({ valid: false })
  } catch (err) {
    console.error('validate-referral error:', err)
    return res.status(500).json({ valid: false })
  }
}
