// api/get-customers.js
// Also handles R2 presigned URL generation for owner dashboard uploads
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

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

// AWS Signature V4 presigned URL — no external package needed
function hmac(key, data) {
  return crypto.createHmac('sha256', key).update(data).digest()
}

function getSigningKey(secret, date, region, service) {
  const kDate    = hmac('AWS4' + secret, date)
  const kRegion  = hmac(kDate, region)
  const kService = hmac(kRegion, service)
  return hmac(kService, 'aws4_request')
}

async function generatePresignedUrl(key, fileType) {
  const region  = 'auto'
  const service = 's3'
  const host    = `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
  const now     = new Date()
  const datestamp   = now.toISOString().slice(0, 10).replace(/-/g, '')
  const amzdate     = now.toISOString().replace(/[:\-]|\.\d{3}/g, '').slice(0, 15) + 'Z'
  const expires     = 3600
  const credential  = `${R2_ACCESS_KEY}/${datestamp}/${region}/${service}/aws4_request`

  const queryParams = [
    ['X-Amz-Algorithm',     'AWS4-HMAC-SHA256'],
    ['X-Amz-Credential',    credential],
    ['X-Amz-Date',          amzdate],
    ['X-Amz-Expires',       String(expires)],
    ['X-Amz-SignedHeaders', 'content-type;host'],
  ].map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')

  const canonicalRequest = [
    'PUT',
    `/${R2_BUCKET}/${key}`,
    queryParams,
    `content-type:${fileType}\nhost:${host}\n`,
    'content-type;host',
    'UNSIGNED-PAYLOAD',
  ].join('\n')

  const credentialScope = `${datestamp}/${region}/${service}/aws4_request`
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzdate,
    credentialScope,
    crypto.createHash('sha256').update(canonicalRequest).digest('hex'),
  ].join('\n')

  const signingKey = getSigningKey(R2_SECRET_KEY, datestamp, region, service)
  const signature  = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex')

  const uploadUrl = `https://${host}/${R2_BUCKET}/${key}?${queryParams}&X-Amz-Signature=${signature}`
  const publicUrl = `${R2_PUBLIC_URL}/${key}`

  return { uploadUrl, publicUrl }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { password, type, fileName, fileType } = req.body
  if (password !== OWNER_PASSWORD) return res.status(401).json({ error: 'Unauthorized' })

  // ── R2 presigned URL ─────────────────────────────────────────────────────
  if (type === 'r2-sign') {
    try {
      const result = await generatePresignedUrl(fileName, fileType || 'application/octet-stream')
      return res.status(200).json(result)
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
