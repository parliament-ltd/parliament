// What this browser can do, found by looking for the feature itself and
// never by the browser's name (refactor-plan.md, stage 3; C94). Where a
// feature is missing, the Enter line says what happens instead, before
// Enter: a pop-out opens as an ordinary window that does not stay on top.
//
// Each check takes the global object, so tests can pass a stand-in.

const has = (g, path) => {
  let v = g
  for (const key of path.split('.')) {
    if (v == null || !(key in Object(v))) return false
    v = v[key]
  }
  return v != null
}

/**
 * The features Parliament uses or offers, each true or false.
 * @param {object} [g] the global object
 */
export function detectFeatures(g = globalThis) {
  return {
    // A window that stays on top of others, for pop:command and pop:<board>.
    onTop: has(g, 'documentPictureInPicture.requestWindow'),
    // Placing windows on another screen, for arrange: and pop:… display 2.
    screens: typeof g.getScreenDetails === 'function',
    // Asking the browser to keep Parliament's data (C88).
    persist: typeof g.navigator?.storage?.persist === 'function',
    // Tabs telling each other what changed, and one tab running a docket.
    channel: typeof g.BroadcastChannel === 'function',
    locks: has(g, 'navigator.locks.request'),
    // Backups are compressed.
    compression: typeof g.CompressionStream === 'function',
    // Keys are encrypted at rest; nothing works without it.
    crypto: has(g, 'crypto.subtle.encrypt'),
  }
}

/**
 * How a window will open for pop:, given the features: 'onTop' when it can
 * stay on top of other windows, else 'ordinary'. The Enter line names the
 * second before Enter.
 */
export const popKind = (features) => (features.onTop ? 'onTop' : 'ordinary')
