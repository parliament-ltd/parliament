/**
 * PWAContext — offline detection, SW update lifecycle, install prompt.
 *
 * Security notes:
 * - This context only manages UI state (online/offline flag, banner visibility).
 * - It never reads or writes IndexedDB directly except for the install-prompt
 *   dismissal flag (getSetting / setSetting via lib/db — same-origin only).
 * - The beforeinstallprompt event is captured and deferred; the native browser
 *   prompt fires only when the user explicitly clicks "Install" in the banner.
 */
import { installOffer, onInstallOffer, takeInstallOffer, installedHere } from '../lib/installOffer'
import { reloadIntoWaiting } from '../lib/swUpdate'
import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { getSetting, setSetting } from '../lib/db'

const PWAContext = createContext(null)

export function PWAProvider({ children }) {
  // ── Online / offline ──────────────────────────────────────────────────────
  const [isOnline, setIsOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    const handleOnline  = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online',  handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online',  handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // ── SW update lifecycle ───────────────────────────────────────────────────
  // useRegisterSW (from virtual:pwa-register/react) both registers the SW and
  // exposes reactive state for the update flow.
  // needRefresh[0] becomes true when a new SW is waiting to activate.
  const {
    needRefresh: [needRefresh],
  } = useRegisterSW({
    onRegistered(r) {
      console.log('[PWA] Service worker registered:', r?.scope ?? 'unknown scope')
      // A tab that stays open never navigates, so the browser would not look
      // for a new version on its own. Ask once an hour; the request goes to
      // this site only.
      if (r) {
        setInterval(() => {
          if (navigator.onLine) r.update().catch(() => {})
        }, 60 * 60 * 1000)
      }
    },
    onRegisterError(err) {
      console.warn('[PWA] Service worker registration failed:', err)
    },
  })

  // Allow the update banner to be dismissed without immediately activating.
  const [updateDismissed, setUpdateDismissed] = useState(false)

  const dismissUpdate = useCallback(() => {
    setUpdateDismissed(true)
  }, [])

  const applyUpdate = useCallback(() => {
    // Starts the waiting version and reloads into it, in any window (C294 (c)).
    reloadIntoWaiting()
  }, [])

  // ── Install prompt ────────────────────────────────────────────────────────
  const installPromptRef  = useRef(null)
  const messageCountRef   = useRef(0)
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  // install: in the bar (C287): whether the browser has offered to install
  // Parliament here, and whether this is the installed app already.
  const [canInstall, setCanInstall] = useState(() => Boolean(installOffer()))
  const [installed, setInstalled] = useState(() => Boolean(window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone))
  // Installed as an app on this computer, seen from a page in the browser (C294).
  const [installedApp, setInstalledApp] = useState(false)

  useEffect(() => {
    // The offer, caught as the page started (installOffer.js); and any that comes later.
    installPromptRef.current = installOffer()
    setCanInstall(Boolean(installPromptRef.current))
    const stop = onInstallOffer((offer) => {
      installPromptRef.current = offer
      setCanInstall(Boolean(offer))
    })
    let live = true
    installedHere().then((yes) => { if (live && yes) setInstalledApp(true) })

    const handleAppInstalled = () => {
      setShowInstallBanner(false)
      installPromptRef.current = null
      setCanInstall(false)
      setInstalled(true)
      setInstalledApp(true)
    }

    window.addEventListener('appinstalled', handleAppInstalled)
    return () => {
      live = false
      stop()
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  /**
   * Call this after every successful message send.
   * The install banner appears once the user has sent at least 3 messages and
   * the browser has provided a deferred install prompt.
   */
  const trackMessageSent = useCallback(async () => {
    messageCountRef.current += 1
    if (messageCountRef.current < 3) return
    if (!installPromptRef.current) return
    const dismissed = await getSetting('installPromptDismissed')
    if (!dismissed) setShowInstallBanner(true)
  }, [])

  const dismissInstallBanner = useCallback(async () => {
    setShowInstallBanner(false)
    installPromptRef.current = null
    await setSetting('installPromptDismissed', true)
  }, [])

  const triggerInstallPrompt = useCallback(async () => {
    const prompt = installPromptRef.current ?? installOffer()
    if (!prompt) return null
    takeInstallOffer()
    prompt.prompt()
    const { outcome } = await prompt.userChoice
    // The browser offers once: after an answer, it may offer again later.
    installPromptRef.current = null
    setCanInstall(false)
    setShowInstallBanner(false)
    return outcome
  }, [])

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <PWAContext.Provider value={{
      // Offline detection
      isOnline,

      // SW update
      needsUpdate: needRefresh && !updateDismissed,
      applyUpdate,
      dismissUpdate,

      // Install prompt
      canInstall,
      installed,
      installedApp,
      showInstallBanner,
      trackMessageSent,
      dismissInstallBanner,
      triggerInstallPrompt,
    }}>
      {children}
    </PWAContext.Provider>
  )
}

export function usePWA() {
  const ctx = useContext(PWAContext)
  if (!ctx) throw new Error('usePWA must be used within <PWAProvider>')
  return ctx
}
