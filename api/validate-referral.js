export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { code } = req.body

  if (!code) {
    return res.status(200).json({ valid: false })
  }

  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )

  const { data, error } = await supabase
    .from('agents')
    .select('id, name, referral_code')
    .eq('referral_code', code.trim().toUpperCase())
    .single()

  console.log('Referral lookup:', { code, data, error })

  if (error || !data) {
    return res.status(200).json({ valid: false })
  }

  return res.status(200).json({ valid: true, agent: data })
}
