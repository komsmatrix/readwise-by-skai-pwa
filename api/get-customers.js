// api/get-customers.js
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

function hmac(key, data) {
  return crypto.createHmac('sha256', key).update(data).digest()
}

function generatePresignedUrl(key) {
  const region  = 'auto'
  const service = 's3'
  const host    = `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
  const now     = new Date()
  const datestamp = now.toISOString().slice(0,10).replace(/-/g,'')
  const amzdate   = datestamp + 'T' + now.toISOString().slice(11,19).replace(/:/g,'') + 'Z'
  const expires   = '3600'
  const credential = `${R2_ACCESS_KEY}/${datestamp}/${region}/${service}/aws4_request`

  // No signed headers except host — simplest possible presigned URL
  const params = new URLSearchParams({
    'X-Amz-Algorithm':     'AWS4-HMAC-SHA256',
    'X-Amz-Credential':    credential,
    'X-Amz-Date':          amzdate,
    'X-Amz-Expires':       expires,
    'X-Amz-SignedHeaders': 'host',
  })
  const queryString = params.toString()

  const canonicalRequest = [
    'PUT',
    `/${R2_BUCKET}/${key}`,
    queryString,
    `host:${host}\n`,
    'host',
    'UNSIGNED-PAYLOAD',
  ].join('\n')

  const credScope   = `${datestamp}/${region}/${service}/aws4_request`
  const strToSign   = ['AWS4-HMAC-SHA256', amzdate, credScope,
    crypto.createHash('sha256').update(canonicalRequest).digest('hex')
  ].join('\n')

  const sigKey = hmac(hmac(hmac(hmac('AWS4' + R2_SECRET_KEY, datestamp), region), service), 'aws4_request')
  const sig    = crypto.createHmac('sha256', sigKey).update(strToSign).digest('hex')

  const uploadUrl = `https://${host}/${R2_BUCKET}/${key}?${queryString}&X-Amz-Signature=${sig}`
  const publicUrl = `${R2_PUBLIC_URL}/${key}`
  return { uploadUrl, publicUrl }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { password, type, fileName } = req.body
  if (password !== OWNER_PASSWORD) return res.status(401).json({ error: 'Unauthorized' })

  if (type === 'r2-sign') {
    try {
      const result = generatePresignedUrl(fileName)
      return res.status(200).json(result)
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  const { data, error } = await supabase
    .from('customers')
    .select('id, name, email, activated_at, is_active')
    .order('activated_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json({ customers: data || [] })
}
