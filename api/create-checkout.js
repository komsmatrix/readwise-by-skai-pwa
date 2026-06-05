// api/create-checkout.js — Creates a PayMongo checkout session
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
)

const PAYMONGO_SECRET  = process.env.PAYMONGO_SECRET_KEY
const APP_URL          = process.env.VITE_APP_URL || 'https://readwisebyskai.com'
const REGULAR_PRICE       = 39900  // ₱399 in centavos
const INTRO_PRICE         = 24900  // ₱249 in centavos
const AGENT_DISCOUNT      = 2000   // ₱20 in centavos
const CUSTOMER_DISCOUNT   = 1000   // ₱10 in centavos
const AGENT_COMMISSION    = 5000   // ₱50 in centavos

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { name, email, referralCode } = req.body
  if (!name || !email) return res.status(400).json({ error: 'Name and email required' })

  try {
    // Validate referral code if provided
    let agentId     = null
    let finalPrice  = INTRO_PRICE
    let discountAmt = 0

    if (referralCode) {
      const code = referralCode.trim().toUpperCase()

      // Check agent code first (₱20 discount)
      const { data: agent } = await supabase
        .from('agents').select('id, name, is_active').eq('code', code).single()

      if (agent && agent.is_active) {
        agentId    = agent.id
        finalPrice = INTRO_PRICE - AGENT_DISCOUNT
        discountAmt = AGENT_DISCOUNT
      } else {
        // Check customer referral code (₱10 discount)
        const { data: referrer } = await supabase
          .from('customers').select('id').eq('referral_code', code).single()
        if (referrer) {
          finalPrice  = INTRO_PRICE - CUSTOMER_DISCOUNT
          discountAmt = CUSTOMER_DISCOUNT
        }
      }
    }

    // Build description
    const description = referralCode
      ? `Readwise by Skai — Lifetime Access (Code: ${referralCode.toUpperCase()})`
      : 'Upload your own books + growing library of classics. Dark mode, TTS, any device. Lifetime access.'

    // Create PayMongo checkout session
    const response = await fetch('https://api.paymongo.com/v1/checkout_sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(PAYMONGO_SECRET + ':').toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          attributes: {
            billing: {
              name : name.trim(),
              email: email.toLowerCase().trim(),
            },
            send_email_receipt: false,
            show_description  : true,
            show_line_items   : true,
            cancel_url        : `${APP_URL}/buy?cancelled=true`,
            success_url       : `${APP_URL}/buy?success=true`,
            description,
            line_items: [{
              currency   : 'PHP',
              amount     : finalPrice,
              name       : 'Readwise by Skai — Lifetime Access',
              description: 'Upload your own books + growing library of classics. Dark mode, TTS, any device. Lifetime access.',
              quantity   : 1,
            }],
            payment_method_types: ['qrph'],
            metadata: {
              customer_name : name.trim(),
              customer_email: email.toLowerCase().trim(),
              agent_id      : agentId || '',
              referral_code : referralCode ? referralCode.toUpperCase() : '',
              final_price   : finalPrice,
            },
          },
        },
      }),
    })

    const data = await response.json()

    if (data.errors) {
      console.error('PayMongo error:', data.errors)
      return res.status(400).json({ error: data.errors[0]?.detail || 'Payment setup failed' })
    }

    const checkoutUrl = data.data?.attributes?.checkout_url
    const sessionId   = data.data?.id

    return res.status(200).json({ success: true, checkoutUrl, sessionId })

  } catch (err) {
    console.error('Create checkout error:', err)
    return res.status(500).json({ error: err.message })
  }
}
