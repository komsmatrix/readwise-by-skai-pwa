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

// Disable Vercel body parser so we can handle raw file bytes
export const config = { api: { bodyParser: false } }

function hmac(key, data) {
  return crypto.createHmac('sha256', key).update(data).digest()
}

async function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', c => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

async function r2Put(key, fileBuffer, contentType) {
  const region   = 'auto'
  const service  = 's3'
  const host     = `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
  const now      = new Date()
  const datestamp = now.toISOString().slice(0,10).replace(/-/g,'')
  const amzdate   = datestamp + 'T' + now.toISOString().slice(11,19).replace(/:/g,'') + 'Z'
  const bodyHash  = crypto.createHash('sha256').update(fileBuffer).digest('hex')
  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date'
  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\nx-amz-content-sha256:${bodyHash}\nx-amz-date:${amzdate}\n`
  const canonicalRequest = ['PUT', `/${R2_BUCKET}/${key}`, '', canonicalHeaders, signedHeaders, bodyHash].join('\n')
  const credScope  = `${datestamp}/${region}/${service}/aws4_request`
  const strToSign  = ['AWS4-HMAC-SHA256', amzdate, credScope,
    crypto.createHash('sha256').update(canonicalRequest).digest('hex')].join('\n')
  const sigKey = hmac(hmac(hmac(hmac('AWS4' + R2_SECRET_KEY, datestamp), region), service), 'aws4_request')
  const sig    = crypto.createHmac('sha256', sigKey).update(strToSign).digest('hex')

  const r = await fetch(`https://${host}/${R2_BUCKET}/${key}`, {
    method: 'PUT',
    headers: {
      'Content-Type':          contentType,
      'Host':                  host,
      'X-Amz-Content-Sha256': bodyHash,
      'X-Amz-Date':           amzdate,
      'Authorization': `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY}/${credScope},SignedHeaders=${signedHeaders},Signature=${sig}`,
    },
    body: fileBuffer,
  })
  if (!r.ok) throw new Error('R2 ' + r.status + ': ' + (await r.text()).slice(0,300))
  return `${R2_PUBLIC_URL}/${key}`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const rawBody = await readBody(req)

  // ── File upload (binary body + query params) ─────────────────────────────
  if (req.query.folder) {
    const password = req.query.password
    if (password !== OWNER_PASSWORD) return res.status(401).json({ error: 'Unauthorized' })
    const folder      = req.query.folder
    const fileName    = req.query.fileName || (Date.now() + '.bin')
    const contentType = req.headers['x-file-type'] || req.headers['content-type'] || 'application/octet-stream'
    const key = `${folder}/${fileName}`
    try {
      const publicUrl = await r2Put(key, rawBody, contentType)
      return res.status(200).json({ publicUrl })
    } catch(err) {
      return res.status(500).json({ error: err.message })
    }
  }

  // ── JSON requests ─────────────────────────────────────────────────────────
  let body
  try { body = JSON.parse(rawBody.toString()) } catch { body = {} }
  const { password } = body
  if (password !== OWNER_PASSWORD) return res.status(401).json({ error: 'Unauthorized' })

  const { data, error } = await supabase
    .from('customers')
    .select('id, name, email, activated_at, is_active')
    .order('activated_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json({ customers: data || [] })
}
