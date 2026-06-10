const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY

// ── Core fetch helper ─────────────────────────────────────────────────────────
async function sb(path, options = {}) {
  const res = await fetch(`${supabaseUrl}${path}`, {
    ...options,
    headers: {
      'apikey'       : supabaseAnon,
      'Authorization': `Bearer ${supabaseAnon}`,
      'Content-Type' : 'application/json',
      ...(options.headers || {}),
    },
  })
  return res
}

// ── Customer ──────────────────────────────────────────────────────────────────
export async function getCustomer(email) {
  const res  = await sb(`/rest/v1/customers?email=eq.${encodeURIComponent(email.toLowerCase().trim())}&limit=1`)
  const data = await res.json()
  return { customer: data?.[0] || null }
}

export async function activateKey(key, name, email) {
  const res = await fetch('/api/activate-key', {
    method : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body   : JSON.stringify({ key, name, email }),
  })
  return res.json()
}

// ── Student Exam enrollment ───────────────────────────────────────────────────
export async function getStudentExam(customerId) {
  const res  = await sb(`/rest/v1/student_exams?customer_id=eq.${customerId}&limit=1`)
  const data = await res.json()
  return data?.[0] || null
}

export async function enrollStudentExam(customerId, examId, examDate, studyMode) {
  const res = await sb('/rest/v1/student_exams', {
    method : 'POST',
    headers: { 'Prefer': 'resolution=merge-duplicates,return=representation' },
    body   : JSON.stringify({
      customer_id: customerId,
      exam_id    : examId,
      exam_date  : examDate || null,
      study_mode : studyMode || 'Standard',
      enrolled_at: new Date().toISOString(),
    }),
  })
  const data = await res.json()
  return data?.[0] || data
}

export async function updateStudyMode(customerId, studyMode) {
  const res = await sb(`/rest/v1/student_exams?customer_id=eq.${customerId}`, {
    method : 'PATCH',
    headers: { 'Prefer': 'return=representation' },
    body   : JSON.stringify({ study_mode: studyMode }),
  })
  return res.ok
}

// ── Exams / Subjects / Topics ─────────────────────────────────────────────────
export async function getExams() {
  const res  = await sb('/rest/v1/exams?is_active=eq.true&order=id')
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

export async function getSubjectsForExam(examId) {
  const res  = await sb(`/rest/v1/subjects?exam_id=eq.${examId}&order=sort_order`)
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

export async function getTopicsForExam(examId) {
  // Join topics → subjects → exam
  const subjects = await getSubjectsForExam(examId)
  if (!subjects.length) return []
  const subjectIds = subjects.map(s => s.id).join(',')
  const res  = await sb(`/rest/v1/topics?subject_id=in.(${subjectIds})&order=sort_order`)
  const data = await res.json()
  return Array.isArray(data) ? data.map(t => ({
    ...t,
    subject: subjects.find(s => s.id === t.subject_id),
  })) : []
}

// ── Cards ─────────────────────────────────────────────────────────────────────
export async function getCardsForTopic(topicId) {
  const res  = await sb(`/rest/v1/cards?topic_id=eq.${topicId}&is_active=eq.true`)
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

export async function getCardsForExam(examId) {
  const topics = await getTopicsForExam(examId)
  if (!topics.length) return []
  const topicIds = topics.map(t => t.id).join(',')
  const res  = await sb(`/rest/v1/cards?topic_id=in.(${topicIds})&is_active=eq.true`)
  const data = await res.json()
  return Array.isArray(data) ? data.map(c => ({
    ...c,
    topic: topics.find(t => t.id === c.topic_id),
  })) : []
}

// ── Card Reviews (Spaced Repetition) ─────────────────────────────────────────
export async function getCardReviews(customerId) {
  const res  = await sb(`/rest/v1/card_reviews?customer_id=eq.${customerId}&order=reviewed_at.desc`)
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

export async function getDueCards(customerId) {
  const today = new Date().toISOString().split('T')[0]
  const res   = await sb(
    `/rest/v1/card_reviews?customer_id=eq.${customerId}&next_review_at=lte.${today}&order=next_review_at`
  )
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

export async function saveCardReview(customerId, cardId, correct, confidence) {
  // SM-2 simplified interval calculation
  const existing = await getLastReview(customerId, cardId)
  let interval = 1
  let attempts = 1

  if (existing) {
    attempts = (existing.attempt_number || 1) + 1
    if (correct) {
      const multiplier = confidence === 'Sure' ? 2.5 : confidence === 'Guessed' ? 1.2 : 1.0
      interval = Math.round((existing.interval_days || 1) * multiplier)
      interval = Math.max(1, Math.min(interval, 60))
    } else {
      interval = 1
    }
  }

  const nextReview = new Date()
  nextReview.setDate(nextReview.getDate() + interval)

  const res = await sb('/rest/v1/card_reviews', {
    method : 'POST',
    headers: { 'Prefer': 'return=representation' },
    body   : JSON.stringify({
      customer_id   : customerId,
      card_id       : cardId,
      correct,
      confidence    : confidence || null,
      interval_days : interval,
      next_review_at: nextReview.toISOString().split('T')[0],
      attempt_number: attempts,
      reviewed_at   : new Date().toISOString(),
    }),
  })
  return res.ok
}

async function getLastReview(customerId, cardId) {
  const res  = await sb(
    `/rest/v1/card_reviews?customer_id=eq.${customerId}&card_id=eq.${cardId}&order=reviewed_at.desc&limit=1`
  )
  const data = await res.json()
  return data?.[0] || null
}

// ── Topic Health ──────────────────────────────────────────────────────────────
export async function getTopicHealth(customerId) {
  const res  = await sb(`/rest/v1/topic_health?customer_id=eq.${customerId}`)
  const data = await res.json()
  const map  = {}
  for (const item of (Array.isArray(data) ? data : [])) {
    map[item.topic_id] = item
  }
  return map
}

export async function upsertTopicHealth(customerId, topicId, updates) {
  const res = await sb('/rest/v1/topic_health', {
    method : 'POST',
    headers: { 'Prefer': 'resolution=merge-duplicates' },
    body   : JSON.stringify({
      customer_id: customerId,
      topic_id   : topicId,
      ...updates,
      updated_at : new Date().toISOString(),
    }),
  })
  return res.ok
}

// Compute topic health state from stats
export function computeHealthState(attemptCount, correctCount, streak) {
  if (attemptCount < 5) return 'Stable'
  const mistakeRate = 1 - (correctCount / attemptCount)
  if (mistakeRate > 0.6)                           return 'Critical'
  if (mistakeRate > 0.4)                           return 'Weak'
  if (mistakeRate < 0.1 && streak >= 5)            return 'Mastered'
  if (mistakeRate < 0.2)                           return 'Strong'
  return 'Stable'
}

// ── Study Sessions ────────────────────────────────────────────────────────────
export async function startSession(customerId, examId, phase) {
  const res  = await sb('/rest/v1/study_sessions', {
    method : 'POST',
    headers: { 'Prefer': 'return=representation' },
    body   : JSON.stringify({
      customer_id   : customerId,
      exam_id       : examId,
      cards_reviewed: 0,
      correct_count : 0,
      phase         : phase || 'Foundation',
      started_at    : new Date().toISOString(),
    }),
  })
  const data = await res.json()
  return data?.[0] || null
}

export async function endSession(sessionId, cardsReviewed, correctCount) {
  const res = await sb(`/rest/v1/study_sessions?id=eq.${sessionId}`, {
    method: 'PATCH',
    body  : JSON.stringify({
      cards_reviewed: cardsReviewed,
      correct_count : correctCount,
      ended_at      : new Date().toISOString(),
    }),
  })
  return res.ok
}

export async function getRecentSessions(customerId, days = 30) {
  const since = new Date()
  since.setDate(since.getDate() - days)
  const res  = await sb(
    `/rest/v1/study_sessions?customer_id=eq.${customerId}&started_at=gte.${since.toISOString()}&order=started_at.desc`
  )
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

// ── Mock Exam Results ─────────────────────────────────────────────────────────
export async function getMockResults(customerId) {
  const res  = await sb(`/rest/v1/mock_results?customer_id=eq.${customerId}&order=taken_at.desc`)
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

export async function saveMockResult(customerId, examId, scorePct) {
  const res = await sb('/rest/v1/mock_results', {
    method: 'POST',
    body  : JSON.stringify({
      customer_id: customerId,
      exam_id    : examId,
      score_pct  : scorePct,
      completed  : true,
      taken_at   : new Date().toISOString(),
    }),
  })
  return res.ok
}

// ── Readiness Score Calculation ───────────────────────────────────────────────
export function computeReadinessScore({ coveragePct, masteryPct, consistencyPct, mockPct }) {
  const hasMock = mockPct !== null && mockPct !== undefined
  if (!hasMock) {
    // Redistribute weights across 3 components
    const score = (coveragePct * 0.40) + (masteryPct * 0.35) + (consistencyPct * 0.25)
    return { score: Math.round(score), estimated: true }
  }
  const score =
    (coveragePct    * 0.30) +
    (masteryPct     * 0.30) +
    (consistencyPct * 0.20) +
    (mockPct        * 0.20)
  return { score: Math.round(score), estimated: false }
}

export function getReadinessLevel(score) {
  if (score < 30) return { level: 1, label: 'Started',      color: '#6B7280' }
  if (score < 50) return { level: 2, label: 'Consistent',   color: '#F59E0B' }
  if (score < 70) return { level: 3, label: 'Preparing',    color: '#3B82F6' }
  if (score < 85) return { level: 4, label: 'Almost Ready', color: '#8B5CF6' }
  return           { level: 5, label: 'Board Ready',        color: '#10B981' }
}

export function getPreparationPhase(daysLeft) {
  if (daysLeft > 180) return 'Foundation'
  if (daysLeft > 90)  return 'Build'
  if (daysLeft > 30)  return 'Reinforce'
  if (daysLeft > 7)   return 'Peak Prep'
  return 'Final Push'
}

export function getDaysLeft(examDate) {
  if (!examDate) return null
  const diff = new Date(examDate) - new Date()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}
