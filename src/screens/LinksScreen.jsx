export default function LinksScreen() {
  const links = [
    {
      label: 'Buy Now — Get Access',
      sub: '₱99 TESDA · ₱249 LET/Board Exams',
      href: '/buy',
      primary: true,
      internal: true,
    },
    {
      label: 'TESDA NC II Reviewers',
      sub: '30 qualifications, HTML reviewers, EN & FIL',
      href: '/buy?course=TESDA',
      internal: true,
    },
    {
      label: 'Facebook Page',
      sub: 'facebook.com/readwisebyskai',
      href: 'https://facebook.com/readwisebyskai',
    },
    {
      label: 'Facebook Group',
      sub: 'TESDA NC II Reviewer community',
      href: 'https://facebook.com/groups/2224041571469837',
    },
    {
      label: 'YouTube',
      sub: 'youtube.com/@readwisebyskai',
      href: 'https://youtube.com/@readwisebyskai',
    },
    {
      label: 'TikTok',
      sub: '@readwisebyskai',
      href: 'https://tiktok.com/@readwisebyskai',
    },
  ]

  return (
    <div style={s.root}>
      <div style={s.bg} />
      <div style={s.card}>
        <div style={s.brand}>
          <div style={s.brandIcon}>R</div>
        </div>
        <div style={s.heading}>Readwise by Skai</div>
        <div style={s.sub}>Board Exam Operating System — TESDA NC II & LET</div>

        <div style={s.linkList}>
          {links.map((link, i) => (
            <a
              key={i}
              href={link.href}
              target={link.internal ? undefined : '_blank'}
              rel={link.internal ? undefined : 'noopener noreferrer'}
              style={link.primary ? s.linkCardPrimary : s.linkCard}
            >
              <div style={link.primary ? s.linkLabelPrimary : s.linkLabel}>{link.label}</div>
              <div style={link.primary ? s.linkSubPrimary : s.linkSub}>{link.sub}</div>
            </a>
          ))}
        </div>

        <div style={s.footer}>readwisebyskai.com</div>
      </div>
    </div>
  )
}

const s = {
  root      : { minHeight: '100vh', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', background: 'var(--bg-base)', padding: '48px 16px', position: 'relative', overflowY: 'auto' },
  bg        : { position: 'fixed', top: '-20%', left: '50%', transform: 'translateX(-50%)', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, var(--accent-dim) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 },
  card      : { width: '100%', maxWidth: 420, position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' },
  brand     : { marginBottom: 16 },
  brandIcon : { width: 56, height: 56, background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 26, color: 'var(--accent)' },
  heading   : { fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center', letterSpacing: '-0.02em' },
  sub       : { fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center', marginTop: 6, marginBottom: 28, lineHeight: 1.5 },
  linkList  : { width: '100%', display: 'flex', flexDirection: 'column', gap: 12 },
  linkCard  : { display: 'block', width: '100%', boxSizing: 'border-box', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '14px 18px', textDecoration: 'none', transition: 'transform 0.1s, border-color 0.15s' },
  linkCardPrimary: { display: 'block', width: '100%', boxSizing: 'border-box', background: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-md)', padding: '16px 18px', textDecoration: 'none', transition: 'transform 0.1s' },
  linkLabel : { fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' },
  linkSub   : { fontSize: 12, color: 'var(--text-muted)', marginTop: 3 },
  linkLabelPrimary: { fontSize: 16, fontWeight: 800, color: '#0d0d0d' },
  linkSubPrimary  : { fontSize: 12, color: 'rgba(13,13,13,0.7)', marginTop: 3, fontWeight: 600 },
  footer    : { marginTop: 32, fontSize: 12, color: 'var(--text-muted)' },
}
