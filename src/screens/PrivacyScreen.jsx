export default function PrivacyScreen() {
  return (
    <div style={s.root}>
      <div style={s.container}>
        <div style={s.brand}>Readwise by Skai</div>
        <h1 style={s.title}>Privacy Policy</h1>
        <p style={s.updated}>Last updated: June 24, 2026</p>

        <p style={s.intro}>
          Your privacy matters to us. This policy explains what data we collect, how we use it, and how we protect it.
        </p>

        <Section title="1. Data We Collect">
          <p>When you use Readwise by Skai, we collect:</p>
          <ul>
            <li><strong>Account data:</strong> your name and email address provided during activation</li>
            <li><strong>Study data:</strong> flashcard answers, topic performance, readiness scores, and study sessions</li>
            <li><strong>Device data:</strong> device type (iOS, Android, Windows, Mac) and last active timestamp</li>
            <li><strong>Payment data:</strong> processed by PayMongo — we do not store your card details</li>
            <li><strong>Referral data:</strong> your referral code and the number of students you referred</li>
          </ul>
        </Section>

        <Section title="2. How We Use Your Data">
          <ul>
            <li>To provide access to the Platform and personalize your study experience</li>
            <li>To calculate your Readiness Score and track your progress</li>
            <li>To send you your access key, payout confirmations, and important account updates via email</li>
            <li>To detect and prevent unauthorized sharing of accounts</li>
            <li>To improve the Platform based on usage patterns</li>
          </ul>
        </Section>

        <Section title="3. Data We Do NOT Collect">
          <ul>
            <li>We do not collect your government ID, SSN, or sensitive personal information</li>
            <li>We do not store credit card or GCash account numbers</li>
            <li>We do not track your location or collect GPS data</li>
            <li>We do not sell your personal data to third parties</li>
          </ul>
        </Section>

        <Section title="4. Data Storage & Security">
          <ul>
            <li>Your data is stored securely in Supabase (PostgreSQL), hosted on AWS infrastructure</li>
            <li>All data is transmitted over HTTPS — encrypted in transit</li>
            <li>Access to your data is restricted to authorized personnel only</li>
            <li>Study content is stored in our database, not in publicly accessible storage</li>
          </ul>
        </Section>

        <Section title="5. Third-Party Services">
          <p>We use the following trusted third-party services:</p>
          <ul>
            <li><strong>Supabase</strong> — database and authentication infrastructure</li>
            <li><strong>Vercel</strong> — hosting and deployment</li>
            <li><strong>Resend</strong> — transactional email delivery</li>
            <li><strong>PayMongo</strong> — payment processing (they handle card data, not us)</li>
            <li><strong>Cloudflare</strong> — DNS, email routing, and CDN</li>
          </ul>
        </Section>

        <Section title="6. Email Communications">
          <ul>
            <li>We send transactional emails: access key delivery, payout confirmations, and account notices</li>
            <li>We may send occasional product updates — you can opt out by replying to any email</li>
            <li>We do not send spam or sell your email to marketers</li>
          </ul>
        </Section>

        <Section title="7. Data Retention">
          <ul>
            <li>Your account and study data are retained for as long as your account is active</li>
            <li>If you request account deletion, we will remove your personal data within 30 days</li>
            <li>Anonymized usage data may be retained for analytics purposes</li>
          </ul>
        </Section>

        <Section title="8. Your Rights">
          <p>You have the right to:</p>
          <ul>
            <li>Request a copy of your personal data</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your account and associated data</li>
            <li>Withdraw consent at any time (note: this may affect your access to the Platform)</li>
          </ul>
          <p>To exercise these rights, email us at <a href="mailto:hello@readwisebyskai.com" style={s.link}>hello@readwisebyskai.com</a></p>
        </Section>

        <Section title="9. Children's Privacy">
          <p>
            Readwise by Skai is intended for students 18 years and older preparing for professional licensure examinations.
            We do not knowingly collect data from minors under 18.
          </p>
        </Section>

        <Section title="10. Changes to This Policy">
          <p>
            We may update this Privacy Policy periodically. We will notify active users via email of significant changes.
            Continued use of the Platform after changes constitutes acceptance of the updated policy.
          </p>
        </Section>

        <Section title="11. Contact">
          <p>
            For privacy-related questions or requests:{' '}
            <a href="mailto:hello@readwisebyskai.com" style={s.link}>hello@readwisebyskai.com</a>
          </p>
        </Section>

        <div style={s.footer}>
          <a href="/" style={s.backLink}>← Back to Readwise by Skai</a>
          <a href="/terms" style={s.link}>Terms & Conditions</a>
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
