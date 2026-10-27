// Retired with R26, carried out on 27 October 2026 with today's chat page (C251 (e)).
// Was src/stores/BranchPanelContext.jsx. Nothing imports it and it is not built.
// To restore: move it back, with today's chat page and its route and providers in App.jsx.
// BranchPanelContext — shared open-state for the V2 BranchCreationPanel
// modal (PR-10a.7).
//
// `branches@1.0` owns the modal per audit decision NQ-5.8, but the
// triggers that open it live elsewhere on /chat/:id:
//   - per-message GitBranch icon — rendered by `messages@1.0` on every
//     MessageCard.
//   - Compress Context action — rendered inside `branches@1.0`'s side
//     rail.
//   - Cmd/Ctrl+Shift+B keyboard shortcut — listens app-wide on
//     /chat/:id (mounted alongside the provider).
//
// hostAPI's three-event Phase 1 cap (per audit NQ-4) rules out adding
// an open-branch-panel bus event. AnnotationsContext already
// established the precedent (audit §2.8a) that small per-conversation
// shared UI state gets a dedicated context. This provider follows the
// same shape — light surface, mounted between ChatProvider and
// BrowserRouter, consumed by the catalog render functions.
//
// State here is pure UI dispatch: which message anchor (if any) the
// modal is currently open against. Persistence and the actual
// branch-creation work live in `branches-render.jsx`. Closing the
// panel clears the anchor and any cached preview summary lives in the
// modal component's local state, so reopening the panel always starts
// fresh — matching the lazy-summary pattern from CLAUDE.md.

import { createContext, useCallback, useContext, useState } from 'react'

const BranchPanelContext = createContext(null)

export function BranchPanelProvider({ children }) {
  // null when closed; otherwise the message id the panel is anchored to.
  const [openForMessageId, setOpenForMessageId] = useState(null)

  const openBranchPanel = useCallback((messageId) => {
    if (!messageId) return
    setOpenForMessageId(messageId)
  }, [])

  const closeBranchPanel = useCallback(() => {
    setOpenForMessageId(null)
  }, [])

  const value = {
    openForMessageId,
    isOpen: openForMessageId !== null,
    openBranchPanel,
    closeBranchPanel,
  }

  return (
    <BranchPanelContext.Provider value={value}>
      {children}
    </BranchPanelContext.Provider>
  )
}

export function useBranchPanel() {
  const ctx = useContext(BranchPanelContext)
  if (!ctx) throw new Error('useBranchPanel must be used within BranchPanelProvider')
  return ctx
}
