// api/get-customers.js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
)

const OWNER_PASSWORD = process.env.OWNER_PASSWORD

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { password } = req.body
  if (password !== OWNER_PASSWORD) return res.status(401).json({ error: 'Unauthorized' })

  const { data, error } = await supabase
    .from('customers')
    .select('id, name, email, activated_at, is_active')
    .order('activated_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json({ customers: data || [] })
}
