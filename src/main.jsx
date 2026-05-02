import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import './index.css'
import App from './App'
import { installFetchLogger } from './lib/networkLog'

installFetchLogger()

// PR-12: belt-and-braces removal of the legacy `parliament-mode` localStorage
// key that V1's ModeContext used to remember the active bird-mode adapter.
// PR-10a's migration drops it via dropLegacyModeKey() once its
// createdInMode → room pass completes; this catches installs whose migration
// short-circuited (e.g. a corrupted IndexedDB during an earlier boot) and
// never got the chance to clean up. removeItem is idempotent, so re-running
// on every boot is harmless. Wrapped in try/catch because a private-mode
// storage error here would be a bad reason to fail app boot.
try {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('parliament-mode')
  }
} catch {
  /* no-op */
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
