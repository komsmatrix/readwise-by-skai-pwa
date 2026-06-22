import { useState } from 'react'

const COURSES = [
  {
    id         : 'LET',
    name       : 'LET',
    full       : 'Licensure Examination for Teachers',
    emoji      : '🎓',
    price      : 249,
    type       : 'board',
    description: 'Spaced repetition · Readiness Score · 1,554+ questions · 14 topics',
    color      : '#c9a84c',
  },
  {
    id         : 'TESDA',
    name       : 'TESDA',
    full       : 'NC Qualifications Bundle',
    emoji      : '🏅',
    price      : 99,
    type       : 'tesda',
    description: 'Full HTML reviewers · Videos · Infographics · 10+ NC qualifications',
    color      : '#3b82f6',
  },
  {
    id         : 'NLE',
    name       : 'NLE',
    full       : 'Nursing Licensure Examination',
    emoji      : '🏥',
    price      : 249,
    type       : 'board',
    description: 'Coming soon — Fundamentals, Med-Surg, Maternal, Psych, Community',
    color      : '#10b981',
    comingSoon : true,
  },
  {
    id         : 'NAPOLCOM',
    name       : 'NAPOLCOM',
    full       : 'Police Officer Examination',
    emoji      : '🚔',
    price      : 249,
    type       : 'board',
    description: 'Coming soon — Criminal Law, Police Organization, General Info',
    color      : '#8b5cf6',
    comingSoon : true,
  },
  {
    id         : 'Civil Service',
    name       : 'Civil Service',
    full       : 'Professional & Sub-Professional',
    emoji      : '🏛',
    price      : 249,
    type       : 'board',
    description: 'Coming soon — Verbal, Numerical, Analytical, General Info',
    color      : '#f59e0b',
    comingSoon : true,
  },
  {
    id         : 'Criminology',
    name       : 'Criminology',
    full       : 'Criminologist Licensure Examination',
    emoji      : '⚖️',
    price      : 249,
    type       : 'board',
    description: 'Coming soon — Criminal Law, Criminalistics, Law Enforcement',
    color      : '#ef4444',
    comingSoon : true,
  },
]

export default function CourseHubScreen({ customer, onSelectCourse }) {
  const [hoveredId, setHoveredId] = useState(null)

  // Courses the student has paid for
  const ownedCourses = new Set(customer?.courses || [])

  // If student only has one course and it's not coming soon, auto-select it
  const ownedActive = COURSES.filter(c => ownedCourses.has(c.id) && !c.comingSoon)
  // Don't auto-select — always show the hub so student knows what else exists

  function handleSelect(course) {
    if (course.comingSoon) return
    if (!ownedCourses.has(course.id)) {
      // Redirect to buy page for this course
      window.location.href = `/buy?course=${course.id}`
      return
    }
    onSelectCourse(course.id)
  }

  const firstName = customer?.name?.split(' ')[0] || 'there'

  return (
    <div style={s.root}>
      <div style={s.scroll}>

        {/* Header */}
        <div style={s.header}>
          <div style={s.greeting}>Welcome back, {firstName}.</div>
          <h1 style={s.title}>Choose Your Course</h1>
          <p style={s.sub}>
            Select a course to start studying. Courses you've purchased are highlighted.
          </p>
        </div>

        {/* Owned count */}
        {ownedActive.length > 0 && (
          <div style={s.ownedBanner}>
            <span style={s.ownedDot}>✓</span>
            You have access to {ownedActive.length} course{ownedActive.length > 1 ? 's' : ''}.
            {ownedActive.length > 1 && ' Tap any to switch.'}
          </div>
        )}

        {/* Course grid */}
        <div style={s.grid}>
          {COURSES.map(course => {
            const owned      = ownedCourses.has(course.id)
            const isHovered  = hoveredId === course.id
            const canOpen    = owned && !course.comingSoon

            return (
              <button
                key={course.id}
                onClick={() => handleSelect(course)}
                onMouseEnter={() => setHoveredId(course.id)}
                onMouseLeave={() => setHoveredId(null)}
                disabled={course.comingSoon}
                style={{
                  ...s.card,
                  ...(owned       ? s.cardOwned    : {}),
                  ...(course.comingSoon ? s.cardSoon : {}),
                  ...(isHovered && canOpen ? s.cardHover : {}),
                  borderColor: owned ? course.color : undefined,
                  cursor: course.comingSoon ? 'not-allowed' : owned ? 'pointer' : 'pointer',
                }}
              >
                {/* Owned badge */}
                {owned && !course.comingSoon && (
                  <div style={{ ...s.accessBadge, background: course.color + '22', color: course.color, border: `1px solid ${course.color}44` }}>
                    ✓ You have access
                  </div>
                )}
                {course.comingSoon && (
                  <div style={s.soonBadge}>Coming Soon</div>
                )}
                {!owned && !course.comingSoon && (
                  <div style={s.buyBadge}>₱{course.price} · Get Access</div>
                )}

                {/* Emoji */}
                <div style={{
                  ...s.emoji,
                  background: owned ? course.color + '18' : 'var(--bg-elevated)',
                  border: `1px solid ${owned ? course.color + '33' : 'var(--border)'}`,
                }}>
                  {course.emoji}
                </div>

                {/* Info */}
                <div style={s.cardBody}>
                  <div style={{
                    ...s.courseName,
                    color: owned ? course.color : course.comingSoon ? 'var(--text-muted)' : 'var(--text-primary)',
                  }}>
                    {course.name}
                  </div>
                  <div style={s.courseFull}>{course.full}</div>
                  <div style={s.courseDesc}>{course.description}</div>
                </div>

                {/* Arrow — only for owned */}
                {canOpen && (
                  <div style={{ ...s.arrow, color: course.color }}>›</div>
                )}
                {!owned && !course.comingSoon && (
                  <div style={s.arrow}>+</div>
                )}
              </button>
            )
          })}
        </div>

        {/* Footer note */}
        <div style={s.footer}>
          <div style={s.footerText}>
            Each course is a one-time purchase · Lifetime access · All future updates included
          </div>
          <button
            onClick={() => onSelectCourse('__signout__')}
            style={s.signOutBtn}>
            Sign Out
          </button>
        </div>

        <div style={{ height: 32 }} />
      </div>
    </div>
  )
}

const s = {
  root         : { minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column' },
  scroll       : { flex: 1, overflowY: 'auto' },
  header       : { padding: '40px 24px 16px', maxWidth: 600, margin: '0 auto', width: '100%' },
  greeting     : { fontSize: 13, color: 'var(--accent)', fontWeight: 600, marginBottom: 6, letterSpacing: '.04em' },
  title        : { fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--text-primary)', marginBottom: 8, lineHeight: 1.2 },
  sub          : { fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 },
  ownedBanner  : { margin: '0 24px 16px', maxWidth: 552, marginLeft: 'auto', marginRight: 'auto', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 8 },
  ownedDot     : { fontWeight: 700 },
  grid         : { display: 'flex', flexDirection: 'column', gap: 10, padding: '0 24px', maxWidth: 600, margin: '0 auto', width: '100%', boxSizing: 'border-box' },
  card         : { display: 'flex', alignItems: 'flex-start', gap: 14, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '16px', textAlign: 'left', fontFamily: 'inherit', width: '100%', transition: 'all .15s', position: 'relative', flexWrap: 'wrap' },
  cardOwned    : { background: 'var(--bg-surface)', boxShadow: '0 2px 16px rgba(0,0,0,0.2)' },
  cardSoon     : { opacity: 0.45 },
  cardHover    : { transform: 'translateY(-1px)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' },
  accessBadge  : { position: 'absolute', top: 12, right: 12, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20 },
  soonBadge    : { position: 'absolute', top: 12, right: 12, fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 20, background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)' },
  buyBadge     : { position: 'absolute', top: 12, right: 12, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: 'rgba(201,168,76,0.1)', color: 'var(--accent)', border: '1px solid rgba(201,168,76,0.25)' },
  emoji        : { width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 },
  cardBody     : { flex: 1, minWidth: 0, paddingRight: 48 },
  courseName   : { fontSize: 17, fontWeight: 800, marginBottom: 2, lineHeight: 1.2 },
  courseFull   : { fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 },
  courseDesc   : { fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 },
  arrow        : { fontSize: 22, color: 'var(--text-muted)', flexShrink: 0, alignSelf: 'center' },
  footer       : { padding: '20px 24px 0', maxWidth: 600, margin: '0 auto', width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  footerText   : { fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.6 },
  signOutBtn   : { background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', padding: '4px 0' },
}
