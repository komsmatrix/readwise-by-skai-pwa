// api/generate-questions.js
// Calls OpenRouter server-side so API key is never exposed to browser

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OWNER_PASSWORD     = process.env.OWNER_PASSWORD

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { password, topicName, topicId, count, situationalPct, difficulty } = req.body

  if (password !== OWNER_PASSWORD) return res.status(401).json({ error: 'Unauthorized' })
  if (!topicName || !topicId)      return res.status(400).json({ error: 'Topic required' })

  const situational = parseInt(situationalPct) || 60
  const factual     = 100 - situational
  const numQ        = Math.min(parseInt(count) || 20, 50)

  const prompt = `You are an expert LET (Licensure Examination for Teachers) board exam question writer for the Philippines.

Generate exactly ${numQ} multiple choice questions about "${topicName}" for the LET board exam.

Mix: ${situational}% situational (classroom scenarios, real teaching situations) and ${factual}% factual (theories, definitions, concepts).
Difficulty: ${difficulty === 'mixed' ? 'mix of Easy, Medium, and Hard' : difficulty}.

Rules:
- 4 options each (A, B, C, D)
- One correct answer only
- No trick questions — test real knowledge
- Situational questions must describe a realistic Filipino classroom scenario
- Include a brief explanation for the correct answer

Respond ONLY with a JSON array. No markdown, no preamble, no backticks. Example format:
[
  {
    "question": "Question text here",
    "options": {"A": "option1", "B": "option2", "C": "option3", "D": "option4"},
    "answer": "A",
    "explanation": "Brief explanation",
    "type": "situational",
    "difficulty": "Medium"
  }
]`

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type' : 'application/json',
        'HTTP-Referer' : 'https://readwisebyskai.com',
      },
      body: JSON.stringify({
        model     : 'meta-llama/llama-3.3-70b-instruct',
        max_tokens: 4000,
        messages  : [{ role: 'user', content: prompt }],
      }),
    })

    const data = await response.json()
    const raw  = data.choices?.[0]?.message?.content || ''

    const cleaned   = raw.replace(/```json|```/g, '').trim()
    const questions = JSON.parse(cleaned)

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('No questions returned from AI')
    }

    const formatted = questions.map((q, i) => ({
      ...q,
      id      : `gen_${Date.now()}_${i}`,
      topic_id: topicId,
    }))

    return res.status(200).json({ success: true, questions: formatted })

  } catch (err) {
    console.error('Generate questions error:', err)
    return res.status(500).json({ error: err.message })
  }
}
