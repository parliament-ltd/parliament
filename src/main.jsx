import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import './index.css'
import App from './App'
import { installFetchLogger } from './lib/networkLog'

installFetchLogger()

// PR-10b: wipe the legacy `parliament-adapters-v1` runtime cache that V1
// builds used for per-adapter code-split chunks. After PR-10b those URLs
// no longer exist, so the cached entries are dead weight. Done from the
// page context (rather than the SW activate event) because vite-plugin-pwa
// generates the SW for us — adding a custom listener would mean switching
// to injectManifest. caches.delete is idempotent (returns false if the
// cache was already gone) so re-running is harmless. Failure is silent
// in production and logged in dev — a stuck old cache is annoying but
// not user-blocking. PR-12 can remove this snippet once all live users
// have rotated past V2 boot.
if (typeof caches !== 'undefined') {
  caches.delete('parliament-adapters-v1').catch((err) => {
    if (import.meta.env.DEV) {
      console.warn('[main] failed to delete legacy adapter cache:', err)
    }
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)