export default function TermsScreen() {
  return (
    <div style={s.root}>
      <div style={s.container}>
        <div style={s.brand}>Readwise by Skai</div>
        <h1 style={s.title}>Terms & Conditions</h1>
        <p style={s.updated}>Last updated: June 24, 2026</p>

        <p style={s.intro}>
          By purchasing or activating access to Readwise by Skai ("the Platform"), you agree to the following terms.
          Please read them carefully before proceeding.
        </p>

        <Section title="1. Access & License">
          <p>Your purchase grants you a personal, non-transferable, non-exclusive license to use the Platform for your own board exam preparation.</p>
          <ul>
            <li>One access key per person — keys cannot be shared, resold, or transferred</li>
            <li>You may access your account from up to one active device at a time</li>
            <li>Accounts found sharing access will be suspended without refund</li>
            <li>Access is for personal, non-commercial use only</li>
          </ul>
        </Section>

        <Section title="2. Payment & Refund Policy">
          <ul>
            <li>All payments are final upon successful activation of your access key</li>
            <li>No refunds will be issued after an access key has been activated</li>
            <li>If your key fails to activate due to a technical error on our end, contact us within 48 hours for resolution</li>
            <li>Prices are subject to change — existing subscribers keep their rate for life</li>
          </ul>
        </Section>

        <Section title="3. Acceptable Use">
          <p>You agree not to:</p>
          <ul>
            <li>Share, distribute, or sell your access key or account credentials</li>
            <li>Screenshot, record, or redistribute any content from the Platform</li>
            <li>Use the Platform for commercial purposes (e.g., review centers) without written permission</li>
            <li>Attempt to reverse-engineer, scrape, or extract content from the Platform</li>
            <li>Use automated tools or bots to access the Platform</li>
          </ul>
        </Section>

        <Section title="4. Content Disclaimer">
          <ul>
            <li>All content is for review and preparation purposes only and does not guarantee passing any licensure examination</li>
            <li>Readwise by Skai is not affiliated with, endorsed by, or connected to the Professional Regulation Commission (PRC), TESDA, or any government body</li>
            <li>Questions and study materials are based on publicly available exam patterns and educational references</li>
            <li>Content is updated regularly but may not reflect the most recent exam changes</li>
          </ul>
        </Section>

        <Section title="5. Account Suspension">
          <ul>
            <li>We reserve the right to suspend or terminate accounts found violating these Terms</li>
            <li>Suspended accounts will not receive a refund</li>
            <li>We will attempt to notify you via email before suspension unless the violation is severe</li>
          </ul>
        </Section>

        <Section title="6. Intellectual Property">
          <ul>
            <li>All flashcards, HTML reviewers, lesson content, and materials are owned by Readwise by Skai</li>
            <li>Unauthorized reproduction, distribution, or modification of any content is strictly prohibited</li>
            <li>The Readwise by Skai name, logo, and branding are protected intellectual property</li>
          </ul>
        </Section>

        <Section title="7. Limitation of Liability">
          <p>
            Readwise by Skai is provided "as is" without warranties of any kind. We are not liable for:
          </p>
          <ul>
            <li>Failure to pass any examination after using the Platform</li>
            <li>Interruptions in service due to maintenance or technical issues</li>
            <li>Loss of study data due to unforeseen technical failures</li>
          </ul>
        </Section>

        <Section title="8. Changes to Terms">
          <p>
            We may update these Terms at any time. Continued use of the Platform after changes constitutes acceptance of the new Terms.
            We will notify active users via email of significant changes.
          </p>
        </Section>

        <Section title="9. Contact">
          <p>
            For questions about these Terms, contact us at:{' '}
            <a href="mailto:hello@readwisebyskai.com" style={s.link}>hello@readwisebyskai.com</a>
          </p>
        </Section>

        <div style={s.footer}>
          <a href="/" style={s.backLink}>← Back to Readwise by Skai</a>
          <a href="/privacy" style={s.link}>Privacy Policy</a>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={sec.wrap}>
      <h2 style={sec.title}>{title}</h2>
      <div style={sec.body}>{children}</div>
    </div>
  )
}

const s = {
  root      : { minHeight:'100vh', background:'#0d0d0d', padding:'40px 20px', fontFamily:"'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" },
  container : { maxWidth:720, margin:'0 auto' },
  brand     : { fontSize:13, fontWeight:600, color:'#c9a96e', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:24 },
  title     : { fontSize:32, fontWeight:700, color:'#f0ede8', marginBottom:8, lineHeight:1.2 },
  updated   : { fontSize:13, color:'#6b6560', marginBottom:24 },
  intro     : { fontSize:15, color:'#b8b0a6', lineHeight:1.8, marginBottom:32, padding:'16px 20px', background:'rgba(201,169,110,0.06)', border:'1px solid rgba(201,169,110,0.15)', borderRadius:10 },
  link      : { color:'#c9a96e', textDecoration:'underline' },
  footer    : { marginTop:48, paddingTop:24, borderTop:'1px solid rgba(255,255,255,0.08)', display:'flex', gap:24, alignItems:'center' },
  backLink  : { color:'#c9a96e', textDecoration:'none', fontSize:14, fontWeight:600 },
}

const sec = {
  wrap  : { marginBottom:32 },
  title : { fontSize:16, fontWeight:700, color:'#f0ede8', marginBottom:12, paddingBottom:8, borderBottom:'1px solid rgba(255,255,255,0.06)' },
  body  : { fontSize:14, color:'#b8b0a6', lineHeight:1.8, display:'flex', flexDirection:'column', gap:8 },
}
