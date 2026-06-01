import { useState, useEffect } from 'react'
import LicenseScreen from './screens/LicenseScreen'
import LibraryScreen from './screens/LibraryScreen'
import ReaderScreen from './screens/ReaderScreen'
import SettingsScreen from './screens/SettingsScreen'
import { usePrefs } from './hooks/usePrefs'

export default function App() {
  const [screen, setScreen] = useState('loading') // loading | license | library | reader | settings
  const [user, setUser] = useState(null)
  const [activeBook, setActiveBook] = useState(null)
  const { prefs, savePrefs } = usePrefs()

  useEffect(() => {
    checkLicense()
  }, [])

  // Apply theme to root element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', prefs.theme || 'dark')
  }, [prefs.theme])

  async function checkLicense() {
    const result = await window.api.license.check()
    if (result.valid) {
      setUser({ name: result.name })
      setScreen('library')
    } else {
      setScreen('license')
    }
  }

  async function onActivate(name) {
    setUser({ name })
    setScreen('library')
  }

  function openBook(book) {
    setActiveBook(book)
    setScreen('reader')
  }

  function closeReader() {
    setActiveBook(null)
    setScreen('library')
  }

  if (screen === 'loading') {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: 'var(--bg-base)'
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: 'var(--accent)', animation: 'pulse 1.2s ease infinite'
        }} />
      </div>
    )
  }

  if (screen === 'license') {
    return <LicenseScreen onActivate={onActivate} />
  }

  if (screen === 'reader' && activeBook) {
    return (
      <ReaderScreen
        book={activeBook}
        prefs={prefs}
        onClose={closeReader}
        onOpenSettings={() => setScreen('settings')}
      />
    )
  }

  if (screen === 'settings') {
    return (
      <SettingsScreen
        prefs={prefs}
        onSave={(p) => { savePrefs(p); setScreen('library') }}
        onBack={() => setScreen('library')}
      />
    )
  }

  return (
    <LibraryScreen
      user={user}
      prefs={prefs}
      onOpenBook={openBook}
      onOpenSettings={() => setScreen('settings')}
    />
  )
}
