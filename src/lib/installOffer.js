// The browser's offer to install Parliament as an app (C294). A browser makes
// it once, soon after the page loads, and only while the app is not installed
// here. It was caught by the app's own code, which a slow start or the lock
// screen could leave listening too late, so install: said nothing was offered
// though it had been. It is caught here, as the page starts, and kept until
// install: uses it.

let offer = null
const listeners = new Set()
const tell = () => listeners.forEach((fn) => fn(offer))

/** Starts listening for the offer; called once, before anything is drawn. */
export function catchInstallOffer(win = globalThis.window) {
  if (!win?.addEventListener) return
  win.addEventListener('beforeinstallprompt', (e) => {
    // Kept for install:, asked for by the person; the browser's own banner waits.
    e.preventDefault()
    offer = e
    tell()
  })
  win.addEventListener('appinstalled', () => {
    offer = null
    tell()
  })
}

/** The offer the browser made, if it is still unused. */
export const installOffer = () => offer

/** fn(offer) whenever an offer comes or goes; returns how to stop. */
export function onInstallOffer(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** The offer, used once: a browser asks only once for each offer. */
export function takeInstallOffer() {
  const o = offer
  offer = null
  tell()
  return o
}

/**
 * Whether Parliament is installed as an app on this computer, as far as the
 * browser will say (it names only apps the manifest lists as its own, and
 * only browsers that install sites can say). False where it cannot tell.
 */
export async function installedHere(nav = globalThis.navigator) {
  try {
    const apps = await nav?.getInstalledRelatedApps?.()
    return Array.isArray(apps) && apps.length > 0
  } catch {
    return false
  }
}

/** For tests: forget the offer and the listeners. */
export function _reset() {
  offer = null
  listeners.clear()
}
