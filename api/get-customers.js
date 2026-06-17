// api/get-customers.js
// Also handles R2 presigned URL generation for owner dashboard uploads
import { createClient } from '@supabase/supabase-js'
import { AwsClient } from 'aws4fetch'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const OWNER_PASSWORD = process.env.OWNER_PASSWORD
const R2_ACCOUNT_ID  = process.env.R2_ACCOUNT_ID
const R2_ACCESS_KEY  = process.env.R2_ACCESS_KEY_ID
const R2_SECRET_KEY  = process.env.R2_SECRET_ACCESS_KEY
const R2_BUCKET      = process.env.R2_BUCKET_NAME || 'readwise-media'
const R2_PUBLIC_URL  = 'https://media.readwisebyskai.com'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { password, type, fileName, fileType } = req.body
  if (password !== OWNER_PASSWORD) return res.status(401).json({ error: 'Unauthorized' })

  // ── R2 presigned URL generation ──────────────────────────────────────────
  if (type === 'r2-sign') {
    try {
      const key = fileName // e.g. "audio/child-development.mp3"
      const endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`

      const aws = new AwsClient({
        accessKeyId:     R2_ACCESS_KEY,
        secretAccessKey: R2_SECRET_KEY,
        region:          'auto',
        service:         's3',
      })

      const url = new URL(`${endpoint}/${R2_BUCKET}/${key}`)
      url.searchParams.set('X-Amz-Expires', '3600')

      const signed = await aws.sign(
        new Request(url.toString(), { method: 'PUT', headers: { 'Content-Type': fileType || 'application/octet-stream' } }),
        { aws: { signQuery: true } }
      )

      return res.status(200).json({
        uploadUrl:  signed.url,
        publicUrl:  `${R2_PUBLIC_URL}/${key}`,
      })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  // ── Default: get customers ───────────────────────────────────────────────
  const { data, error } = await supabase
    .from('customers')
    .select('id, name, email, activated_at, is_active')
    .order('activated_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json({ customers: data || [] })
}
