import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import AgentsTab from './AgentsTab.jsx'

const SUPABASE_URL = 'https://tizegwvlksgqtvlkiwvb.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpemVnd3Zsa3NncXR2bGtpd3ZiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDI0NTg3MCwiZXhwIjoyMDk1ODIxODcwfQ.Qn4rIczVEwa6Y_8ABlac6oByv3PioE1Q24Fc2ZTvnUA'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

export default function OwnerDashboard({ isLoggedIn, onLogin }) {
  const [password,    setPassword]    = useState('')
  const [authError,   setAuthError]   = useState('')
  const [tab,         setTab]         = useState('generate')
  const [customers,   setCustomers]   = useState([])
  const [loading,     setLoading]     = useState(false)

  // Generate key state
  const [genName,     setGenName]     = useState('')
  const [genEmail,    setGenEmail]    = useState('')
  const [genResult,   setGenResult]   = useState(null)
  const [genStatus,   setGenStatus]   = useState('idle')

  // Send update state
  const [updSubject,  setUpdSubject]  = useState('')
  const [updBooks,    setUpdBooks]    = useState('')
  const [updMessage,  setUpdMessage]  = useState('')
  const [updStatus,   setUpdStatus]   = useState('idle')
  const [updResult,   setUpdResult]   = useState(null)
  const [updPreview,  setUpdPreview]  = useState(false)
  const [lastSent,    setLastSent]    = useState(() => localStorage.getItem('rws_last_update_sent') || null)

  // Add book state
  const [bookTitle,   setBookTitle]   = useState('')
  const [bookAuthor,  setBookAuthor]  = useState('')
  const [bookCategory,setBookCategory]= useState('Self-Help')
  const [bookTags,    setBookTags]    = useState('')
  const [bookMode,    setBookMode]    = useState('text')
  const [bookPages,   setBookPages]   = useState('')
  const [bookDesc,    setBookDesc]    = useState('')
  const [pdfFile,     setPdfFile]     = useState(null)
  const [textFile,    setTextFile]    = useState(null)
  const [coverFile,   setCoverFile]   = useState(null)
  const [addStatus,   setAddStatus]   = useState('idle')
  const [addError,    setAddError]    = useState('')
  const [addProgress, setAddProgress] = useState('')
  const pdfRef   = useRef(null)
  const textRef  = useRef(null)
  const coverRef = useRef(null)

  // Sales state
  const [sales,       setSales]       = useState([])
  const [salesLoading,setSalesLoading]= useState(false)

  const savedPass = () => sessionStorage.getItem('owner_auth')

  useEffect(() => {
    if (isLoggedIn) { loadCustomers(); loadSales() }
  }, [isLoggedIn])

  async function handleLogin() {
    if (!password) return setAuthError('Enter password')
    const res  = await fetch('/api/generate-key', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({ name: 'test', email: 'test@test.com', password, isOwnerKey: false }),
    })
    const data = await res.json()
    if (data.error === 'Unauthorized') { setAuthError('Wrong password'); return }
    sessionStorage.setItem('owner_auth', password)
    onLogin()
  }

  async function loadCustomers() {
    setLoading(true)
    const res  = await fetch('/api/get-customers', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({ password: savedPass() }),
    })
    const data = await res.json()
    if (data.customers) setCustomers(data.customers)
    setLoading(false)
  }

  async function loadSales() {
    setSalesLoading(true)
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('name, email, activated_at, amount_paid, referral_code')
        .order('activated_at', { ascending: false })
      if (!error && data) setSales(data)
    } catch(e) {}
    setSalesLoading(false)
  }

  async function handleGenerate() {
    if (!genName.trim() || !genEmail.trim()) return
    setGenStatus('loading'); setGenResult(null)
    const res  = await fetch('/api/generate-key', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({ name: genName.trim(), email: genEmail.trim(), password: savedPass() }),
    })
    const data = await res.json()
    if (data.success) {
      setGenResult(data); setGenStatus('success')
      setGenName(''); setGenEmail('')
      loadCustomers(); loadSales()
    } else {
      setGenStatus('error'); setGenResult({ error: data.error || 'Failed' })
    }
  }

  async function handleSendUpdate() {
    const bookList = updBooks.split('\n').map(b => b.trim()).filter(Boolean)
    if (!updSubject.trim()) return
    setUpdStatus('loading'); setUpdResult(null); setUpdPreview(false)
    const res  = await fetch('/api/send-update', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({ password: savedPass(), subject: updSubject, newBooks: bookList, message: updMessage }),
    })
    const data = await res.json()
    setUpdResult(data)
    if (data.success) {
      const now = new Date().toISOString()
      localStorage.setItem('rws_last_update_sent', now)
      setLastSent(now)
      setUpdSubject(''); setUpdBooks(''); setUpdMessage('')
    }
    setUpdStatus(data.success ? 'success' : 'error')
  }

  // ── Add Book ──────────────────────────────────────────────────────────────
  async function handleAddBook() {
    if (!bookTitle.trim() || !pdfFile) return
    setAddStatus('uploading'); setAddError(''); setAddProgress('')

    try {
      const slug = bookTitle.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      const cat  = bookCategory.toLowerCase().replace(/\s+/g, '-')

      setAddProgress('Uploading PDF…')
      const pdfPath = `${cat}/${slug}.pdf`
      const { error: pdfErr } = await supabase.storage.from('books').upload(pdfPath, pdfFile, { upsert: true, contentType: 'application/pdf' })
      if (pdfErr) throw new Error('PDF upload failed: ' + pdfErr.message)

      let textPath = null
      if (textFile) {
        setAddProgress('Uploading text file…')
        textPath = `${cat}/${slug}.html`
        const { error: txtErr } = await supabase.storage.from('books').upload(textPath, textFile, { upsert: true, contentType: 'text/html' })
        if (txtErr) throw new Error('Text file upload failed: ' + txtErr.message)
      }

      let coverPath = null
      if (coverFile) {
        setAddProgress('Uploading cover…')
        const ext = coverFile.name.split('.').pop()
        coverPath = `${cat}/${slug}.${ext}`
        const { error: covErr } = await supabase.storage.from('covers').upload(coverPath, coverFile, { upsert: true, contentType: coverFile.type })
        if (covErr) throw new Error('Cover upload failed: ' + covErr.message)
      }

      setAddProgress('Saving to library…')
      const tags = bookTags.split(',').map(t => t.trim()).filter(Boolean)
      const preferred_mode = textPath ? 'text' : 'pdf'

      const { data: insertedBook, error: dbErr } = await supabase.from('books').insert({
        title          : bookTitle.trim(),
        author         : bookAuthor.trim() || null,
        category       : bookCategory,
        tags,
        file_path      : pdfPath,
        text_path      : textPath,
        cover_path     : coverPath,
        preferred_mode,
        pages          : bookPages ? parseInt(bookPages) : null,
        description    : bookDesc.trim() || null,
      }).select('id').single()
      if (dbErr) throw new Error('Database insert failed: ' + dbErr.message)

      const newBookId = insertedBook?.id

      // 5. Auto-extract text from PDF if no text file was uploaded
      if (!textFile && newBookId) {
        setAddProgress('Extracting text from PDF…')
        try {
          const extractRes = await fetch('/api/extract-text', {
            method : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body   : JSON.stringify({
              bookId  : newBookId,
              pdfPath,
              textPath: `${cat}/${slug}.html`,
            }),
          })
          const extractData = await extractRes.json()
          if (!extractData.success) {
            console.warn('Text extraction failed (book still added):', extractData.error)
          }
        } catch(e) {
          console.warn('Text extraction error (book still added):', e)
        }
      }

      setAddStatus('success')
      setAddProgress('')
      setBookTitle(''); setBookAuthor(''); setBookTags(''); setBookPages(''); setBookDesc('')
      setBookCategory('Self-Help'); setBookMode('text')
      setPdfFile(null); setTextFile(null); setCoverFile(null)
      if (pdfRef.current)   pdfRef.current.value   = ''
      if (textRef.current)  textRef.current.value  = ''
      if (coverRef.current) coverRef.current.value = ''

    } catch (err) {
      setAddStatus('error')
      setAddError(err.message)
      setAddProgress('')
    }
  }

  function copyEmails() {
    const emails = customers.map(c => c.email).filter(Boolean).join(', ')
    navigator.clipboard.writeText(emails)
  }

  // ── Sales calculations ────────────────────────────────────────────────────
  const totalRevenue    = sales.reduce((sum, s) => sum + (s.amount_paid || 249), 0)
  const salesWithRef    = sales.filter(s => s.referral_code)
  const salesWithoutRef = sales.filter(s => !s.referral_code)
  const today           = new Date().toDateString()
  const salesToday      = sales.filter(s => new Date(s.activated_at).toDateString() === today).length

  const categories = ['Self-Help','Finance','Business','Health','Fiction','Biography','Other']
  const canAdd = bookTitle.trim() && pdfFile && addStatus !== 'uploading'

  // ── Login screen ──────────────────────────────────────────────────────────
  if (!isLoggedIn) {
    return (
      <div style={s.root}>
        <div style={s.loginCard} className="animate-up">
          <div style={s.brand}>
            <svg width="32" height="32" viewBox="0 0 36 36" fill="none">
              <rect width="36" height="36" rx="10" fill="var(--accent)" fillOpacity="0.15"/>
              <path d="M10 27V10h10a7 7 0 0 1 0 14H10" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M10 24h14" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            <div>
              <div style={s.brandName}>Readwise by Skai</div>
              <div style={s.brandBy}>Owner Dashboard</div>
            </div>
          </div>
          <div style={s.field}>
            <label style={s.label}>Owner password</label>
            <input style={s.input} type="password" placeholder="Enter password" value={password}
              onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} autoFocus/>
          </div>
          {authError && <p style={s.error}>{authError}</p>}
          <button style={s.btn} onClick={handleLogin}>Enter Dashboard</button>
        </div>
      </div>
    )
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────
  return (
    <div style={s.dashboard}>
      {/* Header */}
      <div style={s.dashHeader}>
        <div>
          <div style={s.brandName}>Readwise by Skai</div>
          <div style={s.brandBy}>Owner Dashboard</div>
        </div>
        <div style={s.statPill}>{customers.length} customers · ₱{totalRevenue.toLocaleString()}</div>
      </div>

      {/* Tabs */}
      <div style={s.tabs}>
        {[
          ['generate', '🔑 Generate Key'],
          ['addbook',  '📚 Add Book'],
          ['sales',    '💰 Sales'],
          ['agents',   '🤝 Agents'],
          ['customers','👥 Customers'],
          ['update',   '📢 Send Update'],
        ].map(([id, label]) => (
          <button key={id} style={{ ...s.tab, ...(tab === id ? s.tabActive : {}) }}
            onClick={() => { setTab(id); setAddStatus('idle'); setAddError('') }}>
            {label}
          </button>
        ))}
      </div>

      <div style={s.tabContent}>

        {/* ── Generate Key ── */}
        {tab === 'generate' && (
          <div style={s.section}>
            <p style={s.sectionDesc}>Generate a new access key and send it to the customer automatically.</p>
            <div style={s.field}><label style={s.label}>Customer full name</label>
              <input style={s.input} placeholder="Juan Dela Cruz" value={genName} onChange={e => setGenName(e.target.value)}/>
            </div>
            <div style={s.field}><label style={s.label}>Customer email</label>
              <input style={s.input} type="email" placeholder="juan@gmail.com" value={genEmail} onChange={e => setGenEmail(e.target.value)}/>
            </div>
            <button
              style={{ ...s.btn, ...(!genName.trim() || !genEmail.trim() || genStatus === 'loading' ? s.btnDisabled : {}) }}
              onClick={handleGenerate}
              disabled={!genName.trim() || !genEmail.trim() || genStatus === 'loading'}
            >
              {genStatus === 'loading' ? <><span style={s.spinner}/> Generating…</> : genStatus === 'success' ? '✓ Key Generated & Sent!' : 'Generate Key & Send Email'}
            </button>
            {genResult?.success && (
              <div style={s.resultBox} className="animate-in">
                <p style={s.resultLabel}>Key generated</p>
                <p style={s.keyDisplay}>{genResult.key}</p>
                <p style={s.resultNote}>Email sent to {genEmail} ✓</p>
                <p style={s.resultNote}>Expires: {genResult.expiresAt ? new Date(genResult.expiresAt).toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' }) : 'Never'}</p>
              </div>
            )}
            {genResult?.error && <p style={s.error}>{genResult.error}</p>}
          </div>
        )}

        {/* ── Add Book ── */}
        {tab === 'addbook' && (
          <div style={s.section}>
            <p style={s.sectionDesc}>Upload a new book to the shared library. It appears instantly for all customers.</p>
            <div style={s.field}>
              <label style={s.label}>PDF File <span style={{ color:'#e05c5c' }}>*</span></label>
              {pdfFile ? (
                <div style={ab.fileChosen}>
                  <span style={ab.tag}>PDF</span>
                  <span style={ab.fileName}>{pdfFile.name}</span>
                  <button style={ab.changeBtn} onClick={() => { setPdfFile(null); pdfRef.current.value = '' }}>✕</button>
                </div>
              ) : (
                <button style={ab.pickBtn} onClick={() => pdfRef.current?.click()}>
                  <span style={{ fontSize:22 }}>📄</span><span>Tap to select PDF</span>
                </button>
              )}
              <input ref={pdfRef} type="file" accept=".pdf" style={{ display:'none' }} onChange={e => setPdfFile(e.target.files[0] || null)}/>
            </div>
            <div style={s.field}>
              <label style={s.label}>Text File <span style={{ color:'var(--text-muted)', fontSize:11 }}>(optional — enables Text Mode)</span></label>
              {textFile ? (
                <div style={ab.fileChosen}>
                  <span style={{ ...ab.tag, color:'#7ab87a' }}>HTML</span>
                  <span style={ab.fileName}>{textFile.name}</span>
                  <button style={ab.changeBtn} onClick={() => { setTextFile(null); textRef.current.value = '' }}>✕</button>
                </div>
              ) : (
                <button style={{ ...ab.pickBtn, minHeight:52 }} onClick={() => textRef.current?.click()}>
                  <span style={{ fontSize:18 }}>📝</span><span>Tap to select .html text file</span>
                </button>
              )}
              <input ref={textRef} type="file" accept=".html,.htm,.txt" style={{ display:'none' }} onChange={e => setTextFile(e.target.files[0] || null)}/>
            </div>
            <div style={s.field}>
              <label style={s.label}>Cover Image <span style={{ color:'var(--text-muted)', fontSize:11 }}>(optional)</span></label>
              {coverFile ? (
                <div style={ab.fileChosen}>
                  <span style={{ fontSize:14 }}>🖼️</span>
                  <span style={ab.fileName}>{coverFile.name}</span>
                  <button style={ab.changeBtn} onClick={() => { setCoverFile(null); coverRef.current.value = '' }}>✕</button>
                </div>
              ) : (
                <button style={{ ...ab.pickBtn, minHeight:52 }} onClick={() => coverRef.current?.click()}>
                  <span style={{ fontSize:18 }}>🖼️</span><span>Tap to add cover image</span>
                </button>
              )}
              <input ref={coverRef} type="file" accept="image/*" style={{ display:'none' }} onChange={e => setCoverFile(e.target.files[0] || null)}/>
            </div>
            <div style={s.field}><label style={s.label}>Book Title <span style={{ color:'#e05c5c' }}>*</span></label>
              <input style={s.input} placeholder="e.g. Atomic Habits" value={bookTitle} onChange={e => setBookTitle(e.target.value)}/>
            </div>
            <div style={s.field}><label style={s.label}>Author</label>
              <input style={s.input} placeholder="e.g. James Clear" value={bookAuthor} onChange={e => setBookAuthor(e.target.value)}/>
            </div>
            <div style={s.field}><label style={s.label}>Category</label>
              <select style={{ ...s.input, cursor:'pointer' }} value={bookCategory} onChange={e => setBookCategory(e.target.value)}>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={s.field}><label style={s.label}>Tags <span style={{ color:'var(--text-muted)', fontSize:11 }}>(comma separated)</span></label>
              <input style={s.input} placeholder="e.g. habits, productivity, mindset" value={bookTags} onChange={e => setBookTags(e.target.value)}/>
            </div>
            <div style={s.field}><label style={s.label}>Page count <span style={{ color:'var(--text-muted)', fontSize:11 }}>(optional)</span></label>
              <input style={s.input} type="number" placeholder="e.g. 256" value={bookPages} onChange={e => setBookPages(e.target.value)}/>
            </div>
            <div style={s.field}><label style={s.label}>Description <span style={{ color:'var(--text-muted)', fontSize:11 }}>(optional)</span></label>
              <textarea style={{ ...s.input, resize:'vertical', minHeight:80, lineHeight:1.6 }}
                placeholder="Short description shown on the book card…" value={bookDesc} onChange={e => setBookDesc(e.target.value)}/>
            </div>
            {addStatus === 'uploading' && addProgress && (
              <div style={ab.progressRow}><span style={s.spinner}/><span style={{ fontSize:13, color:'var(--text-muted)' }}>{addProgress}</span></div>
            )}
            {addStatus === 'success' && (
              <div style={ab.successBox} className="animate-in">
                <span style={{ fontSize:22 }}>✅</span>
                <div>
                  <p style={{ fontSize:14, color:'#3a9a6a', fontWeight:500 }}>Book added successfully!</p>
                  <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:3 }}>It's now live in the library for all customers.</p>
                </div>
              </div>
            )}
            {addError && <p style={s.error}>{addError}</p>}
            <button
              style={{ ...s.btn, ...(!canAdd ? s.btnDisabled : {}), ...(addStatus === 'success' ? { background:'#3a9a6a' } : {}) }}
              onClick={handleAddBook} disabled={!canAdd}>
              {addStatus === 'uploading' ? <><span style={{ ...s.spinner, borderTopColor:'#0d0d0d' }}/> Uploading…</>
                : addStatus === 'success' ? '✓ Added to Library!' : '📚 Add Book to Library'}
            </button>
            {addStatus === 'success' && (
              <button style={{ ...s.btn, background:'transparent', border:'1px solid var(--border)', color:'var(--text-secondary)' }}
                onClick={() => setAddStatus('idle')}>Add Another Book</button>
            )}
          </div>
        )}

        {/* ── Sales ── */}
        {tab === 'sales' && (
          <div style={{ ...s.section, maxWidth:640 }}>

            {/* KPI cards */}
            <div style={st.kpiRow}>
              <div style={st.kpiCard}>
                <p style={st.kpiLabel}>Total Revenue</p>
                <p style={st.kpiValue}>₱{totalRevenue.toLocaleString()}</p>
              </div>
              <div style={st.kpiCard}>
                <p style={st.kpiLabel}>Total Sales</p>
                <p style={st.kpiValue}>{sales.length}</p>
              </div>
              <div style={st.kpiCard}>
                <p style={st.kpiLabel}>Sales Today</p>
                <p style={st.kpiValue}>{salesToday}</p>
              </div>
              <div style={st.kpiCard}>
                <p style={st.kpiLabel}>With Referral</p>
                <p style={st.kpiValue}>{salesWithRef.length}</p>
              </div>
            </div>

            <div style={s.sectionRow}>
              <p style={s.sectionDesc}>{sales.length} total sales — all channels</p>
              <button style={s.smallBtn} onClick={loadSales}>↻ Refresh</button>
            </div>

            {salesLoading ? (
              <div style={s.loading}><div style={s.spinner}/></div>
            ) : sales.length === 0 ? (
              <p style={{ color:'var(--text-muted)', fontSize:13, textAlign:'center', padding:'32px 0' }}>No sales yet. First sale incoming! 🚀</p>
            ) : (
              <div style={s.customerList}>
                {sales.map((sale, i) => (
                  <div key={i} style={st.saleRow}>
                    <div style={s.customerAvatar}>{sale.name?.[0]?.toUpperCase() || '?'}</div>
                    <div style={s.customerInfo}>
                      <p style={s.customerName}>{sale.name}</p>
                      <p style={s.customerEmail}>{sale.email}</p>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4, flexShrink:0 }}>
                      <span style={st.amount}>₱{sale.amount_paid || 249}</span>
                      {sale.referral_code
                        ? <span style={st.refBadge}>🤝 {sale.referral_code}</span>
                        : <span style={st.directBadge}>Direct</span>
                      }
                      <span style={s.customerDate}>
                        {new Date(sale.activated_at).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Agents ── */}
        {tab === 'agents' && <AgentsTab savedPass={savedPass}/>}

        {/* ── Customers ── */}
        {tab === 'customers' && (
          <div style={s.section}>
            <div style={s.sectionRow}>
              <p style={s.sectionDesc}>{customers.length} total customers</p>
              <button style={s.smallBtn} onClick={copyEmails}>Copy all emails</button>
            </div>
            {loading ? (
              <div style={s.loading}><div style={s.spinner}/></div>
            ) : customers.length === 0 ? (
              <p style={{ color:'var(--text-muted)', fontSize:13, textAlign:'center', padding:'32px 0' }}>No customers yet.</p>
            ) : (
              <div style={s.customerList}>
                {customers.map((c, i) => (
                  <div key={i} style={s.customerRow}>
                    <div style={s.customerAvatar}>{c.name?.[0]?.toUpperCase() || '?'}</div>
                    <div style={s.customerInfo}>
                      <p style={s.customerName}>{c.name}</p>
                      <p style={s.customerEmail}>{c.email}</p>
                    </div>
                    <div style={s.customerDate}>{new Date(c.activated_at).toLocaleDateString('en-US', { month:'short', day:'numeric' })}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Send Update ── */}
        {tab === 'update' && (
          <div style={s.section}>

            {/* Last sent indicator */}
            {lastSent && (
              <div style={su.lastSentBar}>
                <span style={su.lastSentDot}/>
                <span style={su.lastSentText}>
                  Last update sent: {(() => {
                    const d = new Date(lastSent)
                    const now = new Date()
                    const diffMs = now - d
                    const diffDays = Math.floor(diffMs / 86400000)
                    if (diffDays === 0) return 'Today at ' + d.toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' })
                    if (diffDays === 1) return 'Yesterday'
                    return `${diffDays} days ago`
                  })()}
                </span>
              </div>
            )}

            <p style={s.sectionDesc}>
              Announce new books to all <strong style={{ color:'var(--text-primary)' }}>{customers.length} customers</strong>. Each email is personalized with their first name.
            </p>

            {/* Subject */}
            <div style={s.field}>
              <label style={s.label}>Email Subject</label>
              <input
                style={s.input}
                placeholder="📚 New books just dropped in your library!"
                value={updSubject}
                onChange={e => { setUpdSubject(e.target.value); setUpdStatus('idle') }}
              />
            </div>

            {/* Books */}
            <div style={s.field}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <label style={s.label}>New book titles <span style={{ color:'var(--text-muted)', fontSize:10, textTransform:'none', letterSpacing:0 }}>(one per line)</span></label>
                {updBooks.trim() && (
                  <span style={su.bookCount}>
                    {updBooks.split('\n').filter(b => b.trim()).length} book{updBooks.split('\n').filter(b => b.trim()).length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <textarea
                style={{ ...s.input, resize:'vertical', minHeight:110, lineHeight:1.8 }}
                placeholder={"Think and Grow Rich\nThe Richest Man in Babylon\nMeditations"}
                value={updBooks}
                onChange={e => { setUpdBooks(e.target.value); setUpdStatus('idle') }}
              />
            </div>

            {/* Personal message */}
            <div style={s.field}>
              <label style={s.label}>Personal message <span style={{ color:'var(--text-muted)', fontSize:10, textTransform:'none', letterSpacing:0 }}>(optional — shown as a quote)</span></label>
              <input
                style={s.input}
                placeholder="e.g. Meditations is my personal favorite. Try it!"
                value={updMessage}
                onChange={e => { setUpdMessage(e.target.value); setUpdStatus('idle') }}
              />
            </div>

            {/* Preview toggle */}
            {(updSubject.trim() || updBooks.trim()) && updStatus !== 'success' && (
              <button
                style={su.previewBtn}
                onClick={() => setUpdPreview(p => !p)}>
                {updPreview ? '▲ Hide Preview' : '👁 Preview Email'}
              </button>
            )}

            {/* Preview panel */}
            {updPreview && (
              <div style={su.previewPanel} className="animate-in">
                <div style={su.previewLabel}>EMAIL PREVIEW</div>
                <div style={su.previewSubject}>Subject: {updSubject || '(no subject yet)'}</div>
                <div style={su.previewDivider}/>
                <p style={su.previewGreeting}>Hi [Customer Name], your library just got bigger. We've added new books — open the app and they're already waiting for you.</p>
                {updBooks.trim() && (
                  <div style={su.previewBooks}>
                    <div style={su.previewBooksLabel}>ADDED TO YOUR LIBRARY</div>
                    {updBooks.split('\n').filter(b => b.trim()).map((book, i) => (
                      <div key={i} style={su.previewBookRow}>
                        <span style={su.previewDot}/>
                        <span>{book.trim()}</span>
                      </div>
                    ))}
                  </div>
                )}
                {updMessage.trim() && (
                  <p style={su.previewMessage}>"{updMessage}"</p>
                )}
                <div style={su.previewCta}>Open Your Library →</div>
                <p style={su.previewFooter}>Books are added regularly. Your library grows — your price stays the same. 🙌</p>
              </div>
            )}

            {/* Success state */}
            {updStatus === 'success' && updResult?.success && (
              <div style={su.successBox} className="animate-in">
                <span style={{ fontSize:28 }}>🎉</span>
                <div>
                  <p style={su.successTitle}>Update sent to {updResult.sent} customer{updResult.sent !== 1 ? 's' : ''}!</p>
                  <p style={su.successSub}>Everyone has been notified about the new books.</p>
                </div>
              </div>
            )}

            {/* Error */}
            {updStatus === 'error' && updResult?.error && (
              <p style={s.error}>{updResult.error}</p>
            )}

            {/* Buttons */}
            {updStatus === 'success' ? (
              <button
                style={{ ...s.btn, background:'transparent', border:'1px solid var(--border)', color:'var(--text-secondary)' }}
                onClick={() => { setUpdStatus('idle'); setUpdResult(null) }}>
                Send Another Update
              </button>
            ) : (
              <button
                style={{
                  ...s.btn,
                  ...(!updSubject.trim() || updStatus === 'loading' ? s.btnDisabled : {}),
                  ...(updStatus === 'loading' ? {} : { background: customers.length > 0 ? 'var(--accent)' : 'var(--bg-elevated)' })
                }}
                onClick={handleSendUpdate}
                disabled={!updSubject.trim() || updStatus === 'loading' || customers.length === 0}>
                {updStatus === 'loading'
                  ? <><span style={s.spinner}/> Sending to {customers.length} customers…</>
                  : customers.length === 0
                    ? 'No customers yet'
                    : `📢 Send to ${customers.length} customer${customers.length !== 1 ? 's' : ''}`}
              </button>
            )}

            {customers.length === 0 && (
              <p style={{ fontSize:12, color:'var(--text-muted)', textAlign:'center' }}>
                You'll be able to send updates once you have customers.
              </p>
            )}

          </div>
        )}

      </div>
    </div>
  )
}

// ── Sales tab styles ──────────────────────────────────────────────────────────
const st = {
  kpiRow    : { display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:10, marginBottom:4 },
  kpiCard   : { background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', padding:'14px 16px' },
  kpiLabel  : { margin:'0 0 6px', fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.07em' },
  kpiValue  : { margin:0, fontSize:22, fontWeight:700, color:'var(--accent)' },
  saleRow   : { display:'flex', alignItems:'center', gap:12, padding:'12px', background:'var(--bg-elevated)', borderRadius:'var(--radius-md)', border:'1px solid var(--border)' },
  amount    : { fontSize:14, fontWeight:700, color:'#3a9a6a' },
  refBadge  : { fontSize:10, color:'#c9a96e', background:'rgba(201,169,110,0.1)', border:'1px solid rgba(201,169,110,0.2)', padding:'2px 6px', borderRadius:99 },
  directBadge:{ fontSize:10, color:'var(--text-muted)', background:'var(--bg-overlay)', padding:'2px 6px', borderRadius:99 },
}

// ── Add Book styles ───────────────────────────────────────────────────────────
const ab = {
  pickBtn    : { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:6, width:'100%', padding:'18px 12px', background:'var(--bg-elevated)', border:'2px dashed var(--border)', borderRadius:'var(--radius-md)', color:'var(--text-muted)', fontSize:13, cursor:'pointer', minHeight:72 },
  fileChosen : { display:'flex', alignItems:'center', gap:8, padding:'10px 12px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)' },
  fileName   : { flex:1, fontSize:12, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  tag        : { fontSize:9, fontWeight:700, color:'var(--accent)', background:'var(--accent-dim)', padding:'2px 5px', borderRadius:3, flexShrink:0 },
  changeBtn  : { padding:'3px 8px', background:'transparent', border:'1px solid var(--border)', borderRadius:4, color:'var(--text-secondary)', fontSize:11, cursor:'pointer', flexShrink:0 },
  progressRow: { display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:'var(--bg-elevated)', borderRadius:'var(--radius-md)' },
  successBox : { display:'flex', alignItems:'center', gap:12, padding:'14px', background:'rgba(58,154,106,0.08)', border:'1px solid rgba(58,154,106,0.25)', borderRadius:'var(--radius-md)' },
}

// ── Send Update styles ────────────────────────────────────────────────────────
const su = {
  lastSentBar    : { display:'flex', alignItems:'center', gap:8, padding:'10px 14px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)' },
  lastSentDot    : { width:7, height:7, borderRadius:'50%', background:'#3a9a6a', flexShrink:0 },
  lastSentText   : { fontSize:12, color:'var(--text-muted)' },
  bookCount      : { fontSize:11, color:'var(--accent)', background:'var(--accent-dim)', padding:'2px 8px', borderRadius:99, fontWeight:600 },
  previewBtn     : { display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'10px 14px', background:'transparent', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', color:'var(--text-secondary)', fontSize:13, cursor:'pointer', transition:'all var(--transition)' },
  previewPanel   : { background:'#111', border:'1px solid rgba(201,169,110,0.2)', borderRadius:'var(--radius-md)', padding:'20px', display:'flex', flexDirection:'column', gap:12 },
  previewLabel   : { fontSize:10, fontWeight:700, letterSpacing:'0.1em', color:'var(--accent)', textTransform:'uppercase' },
  previewSubject : { fontSize:14, fontWeight:600, color:'var(--text-primary)' },
  previewDivider : { height:1, background:'rgba(255,255,255,0.06)' },
  previewGreeting: { fontSize:13, color:'var(--text-muted)', lineHeight:1.6, margin:0 },
  previewBooks   : { background:'rgba(201,169,110,0.05)', border:'1px solid rgba(201,169,110,0.15)', borderRadius:8, padding:'14px 16px', display:'flex', flexDirection:'column', gap:8 },
  previewBooksLabel: { fontSize:10, fontWeight:700, letterSpacing:'0.08em', color:'var(--accent)', textTransform:'uppercase', marginBottom:4 },
  previewBookRow : { display:'flex', alignItems:'center', gap:10, fontSize:13, color:'var(--text-primary)' },
  previewDot     : { width:6, height:6, borderRadius:'50%', background:'var(--accent)', flexShrink:0 },
  previewMessage : { fontSize:13, color:'var(--text-muted)', fontStyle:'italic', margin:0 },
  previewCta     : { background:'var(--accent)', color:'#0d0d0d', padding:'11px 16px', borderRadius:8, fontSize:13, fontWeight:600, textAlign:'center' },
  previewFooter  : { fontSize:11, color:'#3a3835', textAlign:'center', margin:0 },
  successBox     : { display:'flex', alignItems:'center', gap:14, padding:'18px', background:'rgba(58,154,106,0.08)', border:'1px solid rgba(58,154,106,0.25)', borderRadius:'var(--radius-md)' },
  successTitle   : { fontSize:15, fontWeight:600, color:'#3a9a6a', margin:'0 0 3px' },
  successSub     : { fontSize:12, color:'var(--text-muted)', margin:0 },
}
const s = {
  root         : { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg-base)', padding:20 },
  loginCard    : { width:'100%', maxWidth:380, background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-xl)', padding:'36px 28px', display:'flex', flexDirection:'column', gap:20 },
  dashboard    : { minHeight:'100vh', background:'var(--bg-base)', display:'flex', flexDirection:'column' },
  dashHeader   : { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'20px 20px 0', flexShrink:0 },
  brand        : { display:'flex', alignItems:'center', gap:10 },
  brandName    : { fontFamily:'var(--font-display)', fontSize:17, color:'var(--text-primary)', letterSpacing:'-0.02em' },
  brandBy      : { fontSize:10, color:'var(--accent)', letterSpacing:'0.06em', textTransform:'uppercase' },
  statPill     : { fontSize:12, color:'var(--accent)', background:'var(--accent-dim)', padding:'4px 12px', borderRadius:99, border:'1px solid rgba(201,169,110,0.2)' },
  tabs         : { display:'flex', gap:0, padding:'16px 20px 0', borderBottom:'1px solid var(--border)', flexShrink:0, overflowX:'auto' },
  tab          : { padding:'8px 14px', background:'transparent', border:'none', borderBottom:'2px solid transparent', color:'var(--text-muted)', fontSize:12, fontWeight:500, cursor:'pointer', transition:'all var(--transition)', marginBottom:-1, whiteSpace:'nowrap' },
  tabActive    : { color:'var(--accent)', borderBottomColor:'var(--accent)' },
  tabContent   : { flex:1, overflowY:'auto' },
  section      : { padding:'20px', display:'flex', flexDirection:'column', gap:16, maxWidth:500 },
  sectionDesc  : { fontSize:13, color:'var(--text-muted)', lineHeight:1.6 },
  sectionRow   : { display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 },
  field        : { display:'flex', flexDirection:'column', gap:7 },
  label        : { fontSize:11, fontWeight:500, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'0.07em' },
  input        : { padding:'10px 12px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', color:'var(--text-primary)', fontSize:14, outline:'none', width:'100%' },
  btn          : { display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'12px', background:'var(--accent)', color:'#0d0d0d', border:'none', borderRadius:'var(--radius-md)', fontSize:14, fontWeight:500, cursor:'pointer', transition:'all var(--transition)' },
  btnDisabled  : { opacity:0.45, cursor:'not-allowed' },
  smallBtn     : { padding:'6px 12px', background:'transparent', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', color:'var(--text-secondary)', fontSize:12, cursor:'pointer', flexShrink:0 },
  error        : { fontSize:13, color:'#e05c5c', padding:'10px 12px', background:'rgba(224,92,92,0.08)', borderRadius:'var(--radius-sm)' },
  spinner      : { width:14, height:14, border:'2px solid rgba(0,0,0,0.2)', borderTop:'2px solid #0d0d0d', borderRadius:'50%', animation:'spin 0.7s linear infinite', display:'inline-block' },
  resultBox    : { padding:'16px', background:'rgba(58,154,106,0.08)', border:'1px solid rgba(58,154,106,0.25)', borderRadius:'var(--radius-md)', display:'flex', flexDirection:'column', gap:8 },
  resultLabel  : { fontSize:11, color:'#3a9a6a', textTransform:'uppercase', letterSpacing:'0.07em', fontWeight:500 },
  keyDisplay   : { fontFamily:'monospace', fontSize:22, color:'var(--accent)', fontWeight:700, letterSpacing:'0.1em' },
  resultNote   : { fontSize:12, color:'var(--text-muted)' },
  loading      : { display:'flex', justifyContent:'center', padding:40 },
  customerList : { display:'flex', flexDirection:'column', gap:2 },
  customerRow  : { display:'flex', alignItems:'center', gap:12, padding:'10px 12px', background:'var(--bg-elevated)', borderRadius:'var(--radius-md)', border:'1px solid var(--border)' },
  customerAvatar: { width:36, height:36, borderRadius:'50%', background:'var(--accent-dim)', color:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:600, flexShrink:0 },
  customerInfo : { flex:1, minWidth:0 },
  customerName : { fontSize:13, color:'var(--text-primary)', fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  customerEmail: { fontSize:12, color:'var(--text-muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  customerDate : { fontSize:11, color:'var(--text-muted)', flexShrink:0 },
}
