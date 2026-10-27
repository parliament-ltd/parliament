// Retired with R30, approved by Stefan on 27 October 2026: The V2 mode loader hook, used by nothing.
// Was src/hooks/useMode.js. Nothing imports it and it is not built. To restore:
// Move it back; nothing needs changing.

// useMode(roomId) — V2 mode loader hook (PR-3).
//
// Replaces ModeContext for V2 routes. ModeContext stays mounted in App.jsx
// for V1-fallback routes (the ChatView/SelectorView/SettingsView adapter
// shells) until PR-10b deletes them. Components rendered via <RoomShell>
// get their mode through this hook (or as a prop), not via React context.
//
// The hook calls loadMode(roomId) once per id change and exposes
// { mode, loading, error }. On unmount or id change in flight, the
// in-flight resolution is discarded so we never set state on an
// unmounted component.

import { useEffect, useState } from 'react'
import { loadMode } from '../lib/modes'

/**
 * Load a mode by id from IndexedDB.
 *
 * @param {string | null | undefined} roomId
 * @returns {{ mode: object | null, loading: boolean, error: Error | null }}
 */
export function useMode(roomId) {
  // We track which roomId the *resolved* state corresponds to, then derive
  // `loading` by comparing against the requested roomId. This avoids
  // setState-in-effect (the lint rule "react-hooks/set-state-in-effect"):
  // the effect only writes on async resolution; the synchronous "loading"
  // signal is computed at render time from the mismatch.
  const [resolved, setResolved] = useState({
    forId: null,
    mode: null,
    error: null,
  })

  useEffect(() => {
    if (!roomId) return
    let cancelled = false
    loadMode(roomId)
      .then(mode => {
        if (cancelled) return
        setResolved({ forId: roomId, mode, error: null })
      })
      .catch(err => {
        if (cancelled) return
        setResolved({ forId: roomId, mode: null, error: err })
      })
    return () => { cancelled = true }
  }, [roomId])

  if (!roomId) {
    return { mode: null, loading: false, error: null }
  }
  if (resolved.forId !== roomId) {
    return { mode: null, loading: true, error: null }
  }
  return { mode: resolved.mode, loading: false, error: resolved.error }
}
