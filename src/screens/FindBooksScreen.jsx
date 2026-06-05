export default function FindBooksScreen({ onBack }) {
  const sources = [
    {
      category: '100% Free & Legal',
      emoji   : '✅',
      sites   : [
        {
          name : 'Project Gutenberg',
          url  : 'https://www.gutenberg.org',
          desc : 'Over 70,000 free eBooks. All public domain classics — completely legal to download and read.',
          tags : ['Classics', 'Free', 'Public Domain'],
        },
        {
          name : 'Standard Ebooks',
          url  : 'https://standardebooks.org',
          desc : 'Beautiful, carefully formatted public domain books. Higher quality than most free sources.',
          tags : ['Classics', 'Free', 'High Quality'],
        },
        {
          name : 'Open Library',
          url  : 'https://openlibrary.org',
          desc : 'Borrow digital books for free — like a real library. Some titles available for immediate download.',
          tags : ['Borrow Free', 'Wide Selection'],
        },
        {
          name : 'ManyBooks',
          url  : 'https://manybooks.net',
          desc : 'Free classic books in multiple formats including PDF. Great selection of self-help and finance classics.',
          tags : ['Free', 'Self-Help', 'Finance'],
        },
      ]
    },
    {
      category: 'Purchase & Download',
      emoji   : '💳',
      sites   : [
        {
          name : 'Google Play Books',
          url  : 'https://play.google.com/books',
          desc : 'Buy and download books legally. Many affordable titles available for all readers.',
          tags : ['Buy', 'Legal', 'Wide Selection'],
        },
        {
          name : 'Amazon Kindle',
          url  : 'https://www.amazon.com/kindle-ebooks',
          desc : 'Largest selection of eBooks. Use Kindle app or download DRM-free books to upload here.',
          tags : ['Buy', 'Legal', 'Huge Selection'],
        },
        {
          name : 'Smashwords',
          url  : 'https://www.smashwords.com',
          desc : 'Independent authors selling books directly. Many affordable and free titles in PDF format.',
          tags : ['Buy', 'Indie Authors', 'PDF'],
        },
      ]
    },
    {
      category: 'Local & Regional Content',
      emoji   : '🌏',
      sites   : [
        {
          name : 'National Book Store Digital',
          url  : 'https://www.nationalbookstore.com',
          desc : 'Philippine books and local titles. Support local authors and publishers.',
          tags : ['Local', 'Regional', 'Support Authors'],
        },
        {
          name : 'Flipreads',
          url  : 'https://www.flipreads.com',
          desc : 'Digital bookstore with local and international titles.',
          tags : ['Digital', 'Local', 'International'],
        },
      ]
    },
    {
      category: 'Public Domain Recommendations',
      emoji   : '📖',
      isStatic: true,
      books   : [
        { title:'Think and Grow Rich',        author:'Napoleon Hill',     year:'1937' },
        { title:'The Richest Man in Babylon', author:'George S. Clason',  year:'1926' },
        { title:'As a Man Thinketh',          author:'James Allen',       year:'1903' },
        { title:'The Science of Getting Rich',author:'Wallace Wattles',   year:'1910' },
        { title:'The Art of War',             author:'Sun Tzu',           year:'Ancient' },
        { title:'Meditations',                author:'Marcus Aurelius',   year:'Ancient' },
        { title:'The Master Key System',      author:'Charles Haanel',    year:'1912' },
        { title:'The Game of Life',           author:'Florence Scovel Shinn', year:'1925' },
        { title:'How to Live on 24 Hours a Day', author:'Arnold Bennett', year:'1910' },
        { title:'Acres of Diamonds',          author:'Russell Conwell',   year:'1890' },
      ]
    },
  ]

  return (
    <div style={s.root}>
      <header style={s.header}>
        <button style={s.backBtn} onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M13 4L7 10l6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <div>
          <h1 style={s.title}>Find Books</h1>
          <p style={s.subtitle}>Legal sources to download PDF books</p>
        </div>
      </header>

      <div style={s.content}>
        <div style={s.notice}>
          <span style={s.noticeIcon}>💡</span>
          <p style={s.noticeText}>
            Download a PDF from any of these sources, then upload it to your <strong>My Books</strong> section. Your uploads are completely private.
          </p>
        </div>

        {sources.map((section, si) => (
          <section key={si} style={s.section}>
            <h2 style={s.sectionTitle}>{section.emoji} {section.category}</h2>

            {section.isStatic ? (
              // Public domain book list
              <div style={s.bookList}>
                {section.books.map((book, bi) => (
                  <div key={bi} style={s.bookRow}>
                    <div style={s.bookInfo}>
                      <p style={s.bookTitle}>{book.title}</p>
                      <p style={s.bookAuthor}>{book.author} · {book.year}</p>
                    </div>
                    <span style={s.freeBadge}>FREE</span>
                  </div>
                ))}
                <p style={s.bookListNote}>
                  Search these titles on Project Gutenberg or Standard Ebooks to download for free.
                </p>
              </div>
            ) : (
              // Site cards
              <div style={s.siteList}>
                {section.sites.map((site, si2) => (
                  <a key={si2} href={site.url} target="_blank" rel="noopener noreferrer" style={s.siteCard}>
                    <div style={s.siteTop}>
                      <span style={s.siteName}>{site.name}</span>
                      <span style={s.siteArrow}>→</span>
                    </div>
                    <p style={s.siteDesc}>{site.desc}</p>
                    <div style={s.siteTags}>
                      {site.tags.map((tag, ti) => <span key={ti} style={s.siteTag}>{tag}</span>)}
                    </div>
                  </a>
                ))}
              </div>
            )}
          </section>
        ))}

        <div style={s.disclaimer}>
          <p style={s.disclaimerText}>
            📌 Readwise by Skai is a reading tool. We do not host or distribute copyrighted books. Always download from legal sources and respect authors' work.
          </p>
        </div>
      </div>
    </div>
  )
}

const s = {
  root       : { height:'100vh', display:'flex', flexDirection:'column', background:'var(--bg-base)', overflow:'hidden' },
  header     : { display:'flex', alignItems:'center', gap:12, padding:'14px 16px', borderBottom:'1px solid var(--border)', flexShrink:0, background:'var(--bg-surface)' },
  backBtn    : { width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', color:'var(--text-secondary)', cursor:'pointer', flexShrink:0 },
  title      : { fontFamily:'var(--font-display)', fontSize:19, fontWeight:400, color:'var(--text-primary)', letterSpacing:'-0.02em' },
  subtitle   : { fontSize:12, color:'var(--text-muted)', marginTop:2 },
  content    : { flex:1, overflowY:'auto', padding:'16px 14px 40px' },
  notice     : { display:'flex', gap:10, padding:'12px 14px', background:'rgba(201,169,110,0.08)', border:'1px solid rgba(201,169,110,0.2)', borderRadius:'var(--radius-md)', marginBottom:24 },
  noticeIcon : { fontSize:18, flexShrink:0 },
  noticeText : { fontSize:13, color:'var(--text-secondary)', lineHeight:1.6 },
  section    : { marginBottom:28 },
  sectionTitle: { fontFamily:'var(--font-display)', fontSize:16, fontWeight:400, color:'var(--text-primary)', marginBottom:12, letterSpacing:'-0.01em' },
  siteList   : { display:'flex', flexDirection:'column', gap:10 },
  siteCard   : { display:'block', padding:'14px 16px', background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', textDecoration:'none', transition:'all var(--transition)' },
  siteTop    : { display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 },
  siteName   : { fontSize:14, fontWeight:600, color:'var(--accent)' },
  siteArrow  : { fontSize:14, color:'var(--text-muted)' },
  siteDesc   : { fontSize:12, color:'var(--text-secondary)', lineHeight:1.6, marginBottom:8 },
  siteTags   : { display:'flex', gap:6, flexWrap:'wrap' },
  siteTag    : { fontSize:10, color:'var(--text-muted)', background:'var(--bg-elevated)', padding:'2px 7px', borderRadius:99, border:'1px solid var(--border)' },
  bookList   : { background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', overflow:'hidden' },
  bookRow    : { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', borderBottom:'1px solid var(--border)' },
  bookInfo   : { flex:1, minWidth:0 },
  bookTitle  : { fontSize:13, color:'var(--text-primary)', fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  bookAuthor : { fontSize:11, color:'var(--text-muted)', marginTop:2 },
  freeBadge  : { fontSize:9, fontWeight:700, color:'#3a9a6a', background:'rgba(58,154,106,0.12)', border:'1px solid rgba(58,154,106,0.25)', padding:'2px 6px', borderRadius:3, flexShrink:0, marginLeft:8 },
  bookListNote: { padding:'10px 14px', fontSize:12, color:'var(--text-muted)', lineHeight:1.6 },
  disclaimer : { padding:'14px 16px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', marginTop:8 },
  disclaimerText: { fontSize:12, color:'var(--text-muted)', lineHeight:1.7 },
}
