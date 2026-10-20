// BackupContext — modal state + global keyboard shortcut + undo log.
//
// The Backup & Restore modal can be summoned from many surfaces (homepage
// top-bar button, proactive banner, Settings page, Cmd+Shift+B). Routing
// it through a context keeps every entry point on the same modal instance
// and avoids prop-drilling open state.
//
// Replace-strategy undo lives here too: when the user replaces, we save
// the prior contents in memory and surface an Undo toast. After 60s the
// memory is cleared. Putting that state in context lets the toast outlive
// the modal close.

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import BackupRestoreModal from '../components/BackupRestoreModal'
import BackupUndoToast from '../components/BackupUndoToast'

const BackupContext = createContext(null)

const UNDO_WINDOW_MS = 60_000

export function BackupProvider({ children }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [initialTab, setInitialTab] = useState('backup')
  const [undoState, setUndoState] = useState(null) // { contents, deadline, summary }
  const undoTimer = useRef(null)

  const openBackup = useCallback((tab = 'backup') => {
    setInitialTab(tab)
    setModalOpen(true)
  }, [])

  const closeBackup = useCallback(() => setModalOpen(false), [])

  const armUndo = useCallback((contents, summary) => {
    if (undoTimer.current) clearTimeout(undoTimer.current)
    setUndoState({ contents, summary, deadline: Date.now() + UNDO_WINDOW_MS })
    undoTimer.current = setTimeout(() => {
      setUndoState(null)
      undoTimer.current = null
    }, UNDO_WINDOW_MS)
  }, [])

  const clearUndo = useCallback(() => {
    if (undoTimer.current) {
      clearTimeout(undoTimer.current)
      undoTimer.current = null
    }
    setUndoState(null)
  }, [])

  // Global Cmd+Shift+B / Ctrl+Shift+B opens the modal directly to the
  // backup tab. Active everywhere — homepage, /chat/:id, /settings, etc.
  // On a chat with messages the same keys open the branch panel instead:
  // BranchShortcutHandler listens first and marks the key as taken, so the
  // two never open at once (conflicts Part 4; refactor plan, stage 3).
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.defaultPrevented) return
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.shiftKey && (e.key === 'b' || e.key === 'B')) {
        // Don't intercept while the user is typing in a contenteditable
        // or input field — they may have a different binding in mind.
        // Modals usually open over those though, so we still allow it.
        e.preventDefault()
        openBackup('backup')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [openBackup])

  return (
    <BackupContext.Provider value={{
      openBackup,
      closeBackup,
      modalOpen,
      armUndo,
      clearUndo,
      undoState,
    }}>
      {children}
      {modalOpen && (
        <BackupRestoreModal
          initialTab={initialTab}
          onClose={closeBackup}
        />
      )}
      {undoState && <BackupUndoToast onClear={clearUndo} />}
    </BackupContext.Provider>
  )
}

export function useBackup() {
  const ctx = useContext(BackupContext)
  if (!ctx) throw new Error('useBackup must be used within BackupProvider')
  return ctx
}
