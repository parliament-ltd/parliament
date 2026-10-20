// BranchShortcutHandler — app-wide Cmd/Ctrl+Shift+B keyboard shortcut for
// opening the BranchCreationPanel (PR-10a.7).
//
// Why this lives at App.jsx, not inside branches@1.0's render:
//   - The shortcut should work even on rooms whose mode file doesn't
//     include `branches@1.0` (Quiet Room, custom user rooms). Putting
//     the listener inside branches-render gates it to "only when the
//     side rail is mounted" — surprising for users who expect their
//     keyboard shortcut to behave the same everywhere.
//   - The handler only needs ChatContext (latest message) and
//     BranchPanelContext (openBranchPanel). Both are mounted at the
//     app level. No new wiring required.
//
// What about rooms that lack branches@1.0? The panel still renders
// because branches-render's modal mount is the only thing that closes
// the loop — but if branches@1.0 isn't in the mode, the panel never
// mounts and the shortcut becomes a no-op-with-no-feedback. Acceptable
// for Phase 1: the user can always pick a room template that includes
// branches. Phase 2 may auto-mount the panel host if the shortcut is
// pressed in a branch-less room; not in scope here.
//
// Lives outside the Routes so the global listener runs on every
// /chat/:id render. The shortcut itself bails out unless the route is
// /chat/:id — branching off a homepage or settings page makes no sense.

import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useChat } from '../stores/ChatContext'
import { useBranchPanel } from '../stores/BranchPanelContext'

export default function BranchShortcutHandler() {
  const { messages } = useChat()
  const { openBranchPanel } = useBranchPanel()
  const location = useLocation()

  useEffect(() => {
    // Only active on the chat route. The shortcut is meaningless on
    // homepage / settings / editor routes.
    if (!location.pathname.startsWith('/chat/')) return

    function onKeyDown(e) {
      // Cmd+Shift+B (Mac) / Ctrl+Shift+B (others). The V1 Albatross
      // adapter mapped this same combo to handleCompressContext —
      // matching it here keeps muscle memory intact across the V1
      // fallback path (which still listens via Albatross's own handler).
      const isMod = e.metaKey || e.ctrlKey
      if (!isMod || !e.shiftKey) return
      if (e.key !== 'B' && e.key !== 'b') return

      // Even with focus inside an input/textarea — V1 explicitly
      // intercepted this combo while typing. Same here.
      if (!messages.length) return

      e.preventDefault()
      const last = messages[messages.length - 1]
      openBranchPanel(last.id)
    }

    // Listen in the capture phase, ahead of the backup shortcut on the same
    // keys (BackupContext), which skips a key already taken here. Without
    // this both opened at once (conflicts Part 4).
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [location.pathname, messages, openBranchPanel])

  return null
}
