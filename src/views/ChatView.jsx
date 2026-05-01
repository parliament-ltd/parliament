// ChatView — `/chat/:id` route shell.
//
// PR-10a wired this route through <RoomShell>; PR-10a.5–PR-10a.10
// brought every chat-essential catalog component online via direct
// useChat() / useAnnotations() / useBranchPanel() / useCollabMode()
// self-binding. PR-10b deletes the V1 Albatross fallback — V2 RoomShell
// is the only chat path.
//
// ─── Null-room repair ─────────────────────────────────────────────────
//
// PR-10b's boot-time migration (`migrateRepairNullRooms`) sweeps every
// existing conversation that PR-10a left at room: null and assigns a
// fresh Writing Studio room. That covers conversations whose
// `createdInMode` was unrecognized AND that didn't have a localStorage
// hint. It also catches conversations created via the V1 Albatross
// "+ New Chat" handler between PR-10a's deploy and PR-10b's deploy
// (which set createdInMode but the migration's done-flag blocked
// re-running).
//
// As a defense-in-depth fallback, this view still calls
// `assignDefaultRoom` if it ever encounters a conversation with
// room: null at render time (e.g., a code path that creates a
// conversation but doesn't pre-assign a room). The repair runs
// idempotently and the resolution loop re-fires once it completes.
// If the repair itself fails — the writing-studio template is missing
// from libraryRooms, IndexedDB write fails, etc. — we render a small
// diagnostic stub with a Back-to-chats affordance instead of a blank
// screen. That state should be unreachable in practice but the user
// should not be wedged if it ever occurs.
//
// ─── Conversation activation (PR-10a.5) ────────────────────────────────
//
// When this route renders <RoomShell>, the catalog components inside
// (messages@1.0, input@1.0) read live state from useChat() / the other
// existing React contexts. For that to be the active conversation's
// state, the route shell calls useChat().loadMessages(id) on entry and
// useChat().clearMessages() on exit. Catalog components stay agnostic
// of which conversation is open.

import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import RoomShell from '../components/RoomShell'
import { getConversation } from '../lib/db'
import { loadMode } from '../lib/modes'
import { assignDefaultRoom } from '../lib/migration'
import { useChat } from '../stores/ChatContext'

export default function ChatView() {
  const { id } = useParams()
  // `repairNonce` bumps after a successful null-room repair to force
  // the resolution effect to re-run. Without it the effect's dependency
  // list (just `[id]`) wouldn't pick up the on-disk change to
  // conversation.room.
  const [repairNonce, setRepairNonce] = useState(0)
  const [resolution, setResolution] = useState({
    forId: null,
    conversation: null,
    mode: null,
    error: null,
  })

  useEffect(() => {
    if (!id) return
    let cancelled = false
    async function resolve() {
      try {
        const conv = await getConversation(id)
        if (cancelled) return
        if (!conv) {
          setResolution({ forId: id, conversation: null, mode: null, error: 'not-found' })
          return
        }

        // Defense in depth: if the boot-time migrations missed this
        // conversation (or it was created post-boot without a room),
        // assign one on the spot and re-resolve. assignDefaultRoom is
        // a no-op if a room is already set, so a race where the room
        // appeared between getConversation and now is handled too.
        if (!conv.room) {
          const repairedRoomId = await assignDefaultRoom(conv.id)
          if (cancelled) return
          if (repairedRoomId) {
            setRepairNonce((n) => n + 1)
            return
          }
          setResolution({ forId: id, conversation: conv, mode: null, error: 'repair-failed' })
          return
        }

        let mode = null
        try {
          mode = await loadMode(conv.room)
        } catch (err) {
          if (import.meta.env.DEV) {
            console.warn(`[ChatView] failed to load mode ${conv.room}:`, err)
          }
          mode = null
        }
        if (cancelled) return
        if (!mode) {
          setResolution({ forId: id, conversation: conv, mode: null, error: 'mode-load-failed' })
          return
        }
        setResolution({ forId: id, conversation: conv, mode, error: null })
      } catch (err) {
        if (cancelled) return
        setResolution({ forId: id, conversation: null, mode: null, error: err })
      }
    }
    resolve()
    return () => { cancelled = true }
  }, [id, repairNonce])

  if (resolution.forId !== id) return null

  if (resolution.conversation && resolution.mode) {
    return <RoomShellChatHost conversationId={id} mode={resolution.mode} />
  }

  // Diagnostic fallback. The migration repair pass should make this
  // unreachable in practice; if it triggers, surface it in dev and
  // show a recoverable stub rather than a blank screen.
  if (import.meta.env.DEV && resolution.error) {
    console.warn(`[ChatView] cannot render conversation ${id}: ${resolution.error}`)
  }
  return <ConversationUnavailable conversationId={id} reason={resolution.error} />
}

function ConversationUnavailable({ conversationId, reason }) {
  const heading =
    reason === 'not-found'
      ? 'Conversation not found.'
      : 'This conversation can\'t be opened right now.'
  const detail =
    reason === 'mode-load-failed'
      ? 'Its room template could not be loaded. Try restoring from a backup or open another conversation.'
      : reason === 'repair-failed'
        ? 'The default room template is missing. Restoring from a backup should bring it back.'
        : 'It may have been deleted or never finished saving.'

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-[var(--p-bg-base)]">
      <div className="max-w-md w-full rounded-xl border border-[var(--p-border)] bg-white p-6 shadow-sm">
        <h1 className="text-base font-semibold text-[var(--p-text-primary)]">
          {heading}
        </h1>
        <p className="mt-2 text-sm text-[var(--p-text-secondary)]">
          {detail}
        </p>
        {import.meta.env.DEV && (
          <p className="mt-3 text-[11px] font-mono text-[var(--p-text-muted)] break-all">
            id: {conversationId}
          </p>
        )}
        <div className="mt-5 flex gap-2">
          <Link
            to="/"
            className="px-3.5 py-2 rounded-lg text-sm font-medium border border-[var(--p-border)] bg-white text-[var(--p-text-primary)] hover:border-[#B8A070] transition-colors"
          >
            Back to homepage
          </Link>
          <Link
            to="/chats"
            className="px-3.5 py-2 rounded-lg text-sm font-medium border border-[var(--p-border)] bg-white text-[var(--p-text-primary)] hover:border-[#B8A070] transition-colors"
          >
            Open chat list
          </Link>
        </div>
      </div>
    </div>
  )
}

/**
 * RoomShellChatHost — owns the conversation-activation lifecycle for
 * the V2 RoomShell chat path.
 *
 * On mount / id change: load messages for the conversation into
 * ChatContext so messages@1.0, input@1.0, and any other component that
 * calls useChat() sees the right data without prop-drilling.
 *
 * On unmount: clear ChatContext so a stale message list doesn't
 * briefly appear when the user opens a different conversation.
 *
 * `loaded` gates the RoomShell render until the first loadMessages
 * resolves. This avoids the empty-state flash that messages@1.0 would
 * otherwise show between mount and the first ChatContext update.
 */
function RoomShellChatHost({ conversationId, mode }) {
  const { loadMessages, clearMessages, activeConversationId } = useChat()
  const [loadedFor, setLoadedFor] = useState(null)

  useEffect(() => {
    let cancelled = false
    loadMessages(conversationId).finally(() => {
      if (!cancelled) setLoadedFor(conversationId)
    })
    return () => {
      cancelled = true
      clearMessages()
    }
  }, [conversationId, loadMessages, clearMessages])

  if (loadedFor !== conversationId || activeConversationId !== conversationId) {
    return null
  }

  return <RoomShell mode={mode} />
}
