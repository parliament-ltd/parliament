// Pressing reload on the update notice (C294 (c)). The plugin reloads a page
// only when the service worker takes it over, and only if that page was
// already the service worker's when it opened. A window opened with a hard
// refresh, or on a first visit, is not, so reload there did nothing while
// another window kept the old version. Here the page reloads once the waiting
// version is running, whichever pages it serves; at once if none is waiting
// (another window has moved on already); and after a few seconds in any case.

/**
 * Starts the waiting version and reloads into it.
 * Returns 'waiting' when it asked a waiting version to start, 'now' when there
 * was none and it reloaded at once.
 */
export async function reloadIntoWaiting({
  nav = globalThis.navigator,
  reload = () => globalThis.location.reload(),
  after = 4000,
  later = globalThis.setTimeout,
} = {}) {
  let gone = false
  const go = () => {
    if (gone) return
    gone = true
    reload()
  }
  let waiting = null
  try {
    waiting = (await nav?.serviceWorker?.getRegistration?.())?.waiting ?? null
  } catch {
    waiting = null
  }
  if (!waiting) {
    go()
    return 'now'
  }
  waiting.addEventListener('statechange', () => {
    if (waiting.state === 'activated') go()
  })
  // The message the built service worker listens for (vite-plugin-pwa, 'prompt').
  waiting.postMessage({ type: 'SKIP_WAITING' })
  later(go, after)
  return 'waiting'
}
