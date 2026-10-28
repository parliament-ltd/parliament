// Parliament's Trusted Types policy, before anything else can reach a sink (C270 (d)).
import './lib/trustedTypes'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import UpgradeGate from './components/UpgradeGate'
import UnlockGate from './components/UnlockGate'
import { installFetchLogger } from './lib/networkLog'
import { I18nProvider } from '@lingui/react'
import { i18n, startLanguage } from './i18n'

installFetchLogger()

// The interface's language: English at once, then the person's (C87).
startLanguage()

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
    <I18nProvider i18n={i18n}>
      {/* With the lock on, nothing is drawn or read until this tab is unlocked. */}
      <UnlockGate>
        <UpgradeGate>
          <App />
        </UpgradeGate>
      </UnlockGate>
    </I18nProvider>
  </StrictMode>
)
