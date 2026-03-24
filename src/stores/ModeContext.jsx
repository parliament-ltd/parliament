import { createContext, useContext, useMemo, useState, useCallback } from 'react'

/* ── Animation spring configs ────────────────────────────── */

const SPRING_SNAPPY = { type: 'spring', stiffness: 500, damping: 30 }
const SPRING_SMOOTH = { type: 'spring', stiffness: 300, damping: 28 }
const SPRING_GENTLE = { type: 'spring', stiffness: 200, damping: 24 }

/* ── Capabilities registry ───────────────────────────────── */

const MODE_CAPABILITIES = {
  albatross: {
    layout: 'three-column',
    input: 'keyboard',
    gestures: false,
    sidebars: 'dual',
    contextHealth: 'meter',
    selection: 'checkbox',
    animations: SPRING_SMOOTH,
    touchTargets: false,
  },
  swift: {
    layout: 'single-column',
    input: 'touch',
    gestures: true,
    sidebars: 'unified-panel',
    contextHealth: 'ambient',
    selection: 'tap-to-select',
    animations: SPRING_SNAPPY,
    touchTargets: true,
  },
  kingfisher: {
    layout: 'reading-pane',
    input: 'keyboard',
    gestures: false,
    sidebars: 'right-heavy',
    contextHealth: 'meter',
    selection: 'highlight-range',
    animations: SPRING_SMOOTH,
    touchTargets: false,
  },
  secretarybird: {
    layout: 'canvas',
    input: 'stylus',
    gestures: true,
    sidebars: 'retractable',
    contextHealth: 'compact',
    selection: 'lasso',
    animations: SPRING_GENTLE,
    touchTargets: true,
  },
  starling: {
    layout: 'split-view',
    input: 'keyboard',
    gestures: false,
    sidebars: 'dual-plus-presence',
    contextHealth: 'meter',
    selection: 'checkbox',
    animations: SPRING_SMOOTH,
    touchTargets: false,
  },
  pelican: {
    layout: 'data-canvas',
    input: 'keyboard',
    gestures: false,
    sidebars: 'file-shelf-plus-inspector',
    contextHealth: 'meter',
    selection: 'checkbox',
    animations: SPRING_SMOOTH,
    touchTargets: false,
    fileHandling: true,
    toolUse: true,
  },
}

const LOCAL_STORAGE_KEY = 'parliament-mode'

function autoDetect() {
  if (typeof window !== 'undefined' && window.innerWidth < 768) return 'swift'
  return 'albatross'
}

function detectMode() {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (stored === 'auto' || !stored) return autoDetect()
    if (MODE_CAPABILITIES[stored]) return stored
  } catch {
    // localStorage unavailable — fall through to auto-detect
  }
  return autoDetect()
}

function readStoredMode() {
  try {
    return localStorage.getItem(LOCAL_STORAGE_KEY) || 'auto'
  } catch {
    return 'auto'
  }
}

/* ── Context ─────────────────────────────────────────────── */

const ModeContext = createContext(null)

export function ModeProvider({ children }) {
  const [mode, setModeState] = useState(() => detectMode())
  const [storedMode, setStoredMode] = useState(() => readStoredMode())

  const setMode = useCallback((newMode) => {
    if (newMode !== 'auto' && !MODE_CAPABILITIES[newMode]) return
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, newMode)
    } catch {
      // localStorage unavailable — mode won't persist across page loads
    }
    setStoredMode(newMode)
    setModeState(newMode === 'auto' ? autoDetect() : newMode)
  }, [])

  const value = useMemo(() => ({
    mode,
    storedMode,
    capabilities: MODE_CAPABILITIES[mode],
    is: (m) => mode === m,
    can: (capability) => MODE_CAPABILITIES[mode]?.[capability],
    setMode,
  }), [mode, storedMode, setMode])

  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>
}

export function useMode() {
  const ctx = useContext(ModeContext)
  if (!ctx) throw new Error('useMode must be used within ModeProvider')
  return ctx
}

export { MODE_CAPABILITIES }
