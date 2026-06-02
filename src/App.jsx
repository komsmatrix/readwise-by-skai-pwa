import { useState, useEffect } from 'react'
import { getCustomer, getBooks, getProgress } from './lib/supabase.js'
import ActivationScreen from './screens/ActivationScreen.jsx'
import LibraryScreen    from './screens/LibraryScreen.jsx'
import ReaderScreen     from './screens/ReaderScreen.jsx'
import OwnerDashboard   from './screens/OwnerDashboard.jsx'
import FindBooksScreen  from './screens/FindBooksScreen.jsx'
import LoadingScreen    from './screens/LoadingScreen.jsx'

export default function App() {
  const [screen,   setScreen]   = useState('loading')
  const [customer, setCustomer] = useState(null)
  const [books,    setBooks]    = useState([])
  const [progress, setProgress] = useState({})
  const [openBook, setOpenBook] = useState(null)
  const [prefs,    setPrefs]    = useState({ theme: 'dark', fontSize: 18, ttsVoice: '', ttsSpeed: 1.0 })

  useEffect(() => { init() }, [])

  async function init() {
    if (window.location.pathname === '/owner') {
      const ownerPass = sessionStorage.getItem('owner_auth')
      setScreen(ownerPass ? 'owner' : 'owner_login')
      return
    }

    const savedPrefs = localStorage.getItem('rbs_prefs')
    if (savedPrefs) { try { setPrefs(JSON.parse(savedPrefs)) } catch {} }

    const savedSession = localStorage.getItem('rbs_session')
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession)
        if (session.email && session.customerId) {
          const { customer: cust } = await getCustomer(session.email)
          if (cust && cust.is_active) {
            setCustomer(cust)
            await loadLibrary(cust.id)
            setScreen('library')
            return
          }
        }
      } catch {}
      localStorage.removeItem('rbs_session')
    }
    setScreen('activation')
  }

  async function loadLibrary(customerId) {
    const [{ books: bookList }, progressMap] = await Promise.all([
      getBooks(),
      getProgress(customerId),
    ])
    setBooks(bookList)
    setProgress(progressMap)
  }

  async function handleActivated(result) {
    const cust = { id: result.customerId, name: result.name, email: result.email, is_active: true }
    setCustomer(cust)
    localStorage.setItem('rbs_session', JSON.stringify({ customerId: result.customerId, email: result.email }))
    await loadLibrary(result.customerId)
    setScreen('library')
  }

  function handleOpenBook(book) { setOpenBook(book); setScreen('reader') }

  async function handleCloseBook() {
    setOpenBook(null); setScreen('library')
    if (customer) { const p = await getProgress(customer.id); setProgress(p) }
  }

  function handleProgressUpdate(bookId, data) {
    setProgress(prev => ({ ...prev, [bookId]: { ...(prev[bookId] || {}), ...data, book_id: bookId } }))
  }

  function handleSignOut() {
    localStorage.removeItem('rbs_session')
    setCustomer(null); setBooks([]); setProgress({})
    setScreen('activation')
  }

  function handlePrefsChange(newPrefs) {
    setPrefs(newPrefs)
    localStorage.setItem('rbs_prefs', JSON.stringify(newPrefs))
  }

  if (screen === 'owner' || screen === 'owner_login') {
    return <OwnerDashboard isLoggedIn={screen === 'owner'} onLogin={() => setScreen('owner')}/>
  }
  if (screen === 'loading')     return <LoadingScreen/>
  if (screen === 'activation')  return <ActivationScreen onActivated={handleActivated}/>
  if (screen === 'find-books')  return <FindBooksScreen onBack={() => setScreen('library')}/>
  if (screen === 'reader' && openBook) {
    return (
      <ReaderScreen
        bookData={openBook}
        customer={customer}
        prefs={prefs}
        progress={progress[openBook.id]}
        onClose={handleCloseBook}
        onProgressUpdate={(p) => handleProgressUpdate(openBook.id, p)}
      />
    )
  }

  return (
    <LibraryScreen
      customer={customer}
      books={books}
      progress={progress}
      prefs={prefs}
      onOpenBook={handleOpenBook}
      onSignOut={handleSignOut}
      onRefresh={() => loadLibrary(customer.id)}
      onPrefsChange={handlePrefsChange}
      onFindBooks={() => setScreen('find-books')}
      onBooksUpdated={() => loadLibrary(customer.id)}
    />
  )
}
