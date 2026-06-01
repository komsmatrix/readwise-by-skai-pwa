import { useState, useEffect } from 'react'
import { supabase, getCustomer, getBooks, getProgress } from './lib/supabase.js'
import ActivationScreen from './screens/ActivationScreen.jsx'
import LibraryScreen    from './screens/LibraryScreen.jsx'
import ReaderScreen     from './screens/ReaderScreen.jsx'
import OwnerDashboard   from './screens/OwnerDashboard.jsx'
import LoadingScreen    from './screens/LoadingScreen.jsx'

export default function App() {
  const [screen,   setScreen]   = useState('loading')
  const [customer, setCustomer] = useState(null)
  const [books,    setBooks]    = useState([])
  const [progress, setProgress] = useState({})
  const [openBook, setOpenBook] = useState(null)
  const [prefs,    setPrefs]    = useState({ theme: 'dark', fontSize: 18 })

  useEffect(() => { init() }, [])

  async function init() {
    // Check if owner dashboard route
    if (window.location.pathname === '/owner') {
      const ownerPass = sessionStorage.getItem('owner_auth')
      setScreen(ownerPass ? 'owner' : 'owner_login')
      return
    }

    // Check local session
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

  async function handleActivated(activationResult) {
    const { customerId, name, email } = activationResult
    const cust = { id: customerId, name, email }
    setCustomer(cust)

    localStorage.setItem('rbs_session', JSON.stringify({ customerId, email }))

    await loadLibrary(customerId)
    setScreen('library')
  }

  function handleOpenBook(book) {
    setOpenBook(book)
    setScreen('reader')
  }

  function handleCloseBook() {
    setOpenBook(null)
    setScreen('library')
    // Refresh progress
    if (customer) loadLibrary(customer.id)
  }

  function handleProgressUpdate(bookId, progressData) {
    setProgress(prev => ({ ...prev, [bookId]: progressData }))
  }

  function handleSignOut() {
    localStorage.removeItem('rbs_session')
    setCustomer(null)
    setBooks([])
    setProgress({})
    setScreen('activation')
  }

  // Owner dashboard
  if (screen === 'owner' || screen === 'owner_login') {
    return (
      <OwnerDashboard
        isLoggedIn={screen === 'owner'}
        onLogin={() => setScreen('owner')}
      />
    )
  }

  if (screen === 'loading')     return <LoadingScreen/>
  if (screen === 'activation')  return <ActivationScreen onActivated={handleActivated}/>

  if (screen === 'reader' && openBook) {
    return (
      <ReaderScreen
        book={book => book}
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
      onPrefsChange={setPrefs}
    />
  )
}
