import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { code } = req.body

  if (!code || !code.trim()) {
    return res.status(400).json({ valid: false, error: 'No code provided' })
  }

  try {
    const { data, error } = await supabase
      .from('agents')
      .select('id, name, code')
      .eq('code', code.trim().toUpperCase())
      .single()

    if (error || !data) {
      console.log('Agent not found:', code, error)
      return res.status(200).json({ valid: false })
    }

    return res.status(200).json({
      valid: true,
      agentId: data.id,
      agentName: data.name,
    })
  } catch (err) {
    console.error('validate-referral error:', err)
    return res.status(500).json({ valid: false, error: 'Server error' })
  }
}
