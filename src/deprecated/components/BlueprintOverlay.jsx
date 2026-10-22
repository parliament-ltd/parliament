// Retired with R2, approved by Stefan on 22 October 2026: The Blueprint overlay and its Cmd/Ctrl+. shortcut.
// Was src/components/BlueprintOverlay.jsx. Nothing imports it and it is not built. To restore:
// Move it back and draw it in src/App.jsx.

// BlueprintOverlay (PR-19e) — global Cmd/Ctrl+. modal that surfaces the
// blueprint from any route.
//
// Opens via the keyboard shortcut, dismisses on Esc, click-outside, or
// any in-app navigation (location.pathname change after the overlay
// opened). The blueprint inside is the canonical
// `blueprint-render.jsx` component — same rooms, same Study/Lab cards,
// same packing — so the overlay stays in sync with the homepage
// surface automatically.
//
// Single self-contained component so wiring is one import in App.jsx.
// No context provider needed.

import { useEffect, useState, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import { X } from 'lucide-react'
import BlueprintRender from '../catalog/entries/blueprint-render'

export default function BlueprintOverlay() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  // Remember the path at which the overlay opened so we can close on
  // any subsequent navigation but not the trivial "same path" render.
  const openedAtPath = useRef(null)

  // ── Global hotkey: Cmd/Ctrl+. ───────────────────────────
  // Bound to keydown at window so it fires regardless of focus.
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape' && open) {
        e.preventDefault()
        setOpen(false)
        return
      }
      const isMod = e.metaKey || e.ctrlKey
      if (!isMod) return
      if (e.key === '.') {
        e.preventDefault()
        setOpen((v) => {
          const next = !v
          openedAtPath.current = next ? location.pathname : null
          return next
        })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, location.pathname])

  // ── Auto-close on navigation ────────────────────────────
  // When a card click triggers navigate(...), location.pathname
  // changes — close the overlay so the user lands on the target page
  // cleanly. Skip the very first render after opening (when pathname
  // matches openedAtPath). The setState-in-effect is intentional here:
  // we're syncing local UI state to an external system (the router).
  useEffect(() => {
    if (!open) return
    if (openedAtPath.current && location.pathname !== openedAtPath.current) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false)
    }
  }, [location.pathname, open])

  return (
    <AnimatePresence>
      {open && (
        <Motion.div
          key="blueprint-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[180] flex items-center justify-center p-6"
          style={{ backgroundColor: 'rgba(20, 18, 16, 0.55)' }}
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Blueprint"
        >
          <Motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            className="bg-[var(--p-bg-base)] border border-[var(--p-border)] rounded-xl shadow-2xl shadow-black/40 overflow-hidden flex flex-col"
            style={{ width: 'min(960px, 94vw)', maxHeight: '90vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--p-border)] bg-white">
              <div className="flex items-center gap-2">
                <div className="text-[11px] font-medium uppercase tracking-wider text-[var(--p-text-muted)]">
                  Blueprint
                </div>
                <span className="text-[10px] text-[var(--p-text-light)]">
                  Cmd/Ctrl+. to toggle · Esc to close
                </span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close blueprint"
                className="w-7 h-7 inline-flex items-center justify-center rounded-md text-[var(--p-text-secondary)] hover:bg-[var(--p-bg-subtle)] hover:text-[var(--p-text-primary)] transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 bg-[var(--p-bg-base)]">
              <BlueprintRender />
            </div>
          </Motion.div>
        </Motion.div>
      )}
    </AnimatePresence>
  )
}
