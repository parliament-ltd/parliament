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
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Wrench } from 'lucide-react'
import RoomShell from '../components/RoomShell'
import { ChatFrameProvider } from '../components/ChatFrameContext'
import ParliamentMark from '../components/ParliamentMark'
import { getConversation } from '../lib/db'
import { loadMode } from '../lib/modes'
import { assignDefaultRoom } from '../lib/migration'
import { useIsNarrow } from '../lib/useViewportWidth'
import { useChat } from '../stores/ChatContext'
import { schemeName } from '../lib/schemes'

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
    return (
      <RoomShellChatHost
        conversationId={id}
        mode={resolution.mode}
        roomId={resolution.conversation.room}
      />
    )
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
            Back to The Study
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
function RoomShellChatHost({ conversationId, mode, roomId }) {
  const { loadMessages, clearMessages, activeConversationId } = useChat()
  const [loadedFor, setLoadedFor] = useState(null)
  const isNarrow = useIsNarrow(768)

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

  // PR-23: apply the room's scheme to the document so the chat surface
  // tints to match the active room (background, surface, accent, etc.
  // all flow from the scheme's CSS-variable block). Cleared on unmount
  // so navigating back to the homepage restores Parliament default.
  useEffect(() => {
    const ref = mode?.scheme?.ref
    if (!ref) return undefined
    const name = schemeName(ref)
    const html = document.documentElement
    if (name === 'parliament') {
      html.removeAttribute('data-scheme')
    } else {
      html.setAttribute('data-scheme', name)
    }
    return () => {
      html.removeAttribute('data-scheme')
    }
  }, [mode])

  if (loadedFor !== conversationId || activeConversationId !== conversationId) {
    return null
  }

  // PR-19d: wrench in every chat opens that room in the editor with
  // the Components tab focused. The provider also surfaces the same
  // target to NarrowChrome via useChatFrame() for the mobile cluster.
  const wrenchTarget = roomId ? `/edit/${roomId}?tab=components` : '/edit'

  // On mobile, the layout's narrow branch already sets h-[100dvh] and
  // owns its own NarrowChrome — we render the RoomShell bare so we
  // don't double-stack viewport-height containers. On desktop, we
  // wrap with a flex column so the new chat chrome sits above the
  // layout's slot grid (which uses h-full to fill the remainder).
  if (isNarrow) {
    return (
      <ChatFrameProvider value={{ wrenchTarget }}>
        <RoomShell mode={mode} />
      </ChatFrameProvider>
    )
  }

  return (
    <ChatFrameProvider value={{ wrenchTarget }}>
      <div className="flex flex-col h-[100dvh] min-h-0 bg-[var(--p-bg-base)]">
        <ChatDesktopChrome wrenchTarget={wrenchTarget} />
        {/* PR-28: page-inset gutter + dot texture around the room.
            The room frame mounts on a textured "lab tray" surface
            (chat-page-bg) so the rails+chat float as a specimen —
            same visual logic the editor canvas already uses. */}
        <div className="flex-1 min-h-0 chat-page-bg p-6">
          <div className="chat-room-frame">
            <RoomShell mode={mode} />
          </div>
        </div>
      </div>
    </ChatFrameProvider>
  )
}

// ChatDesktopChrome — minimal top bar for desktop /chat/:id (PR-19d).
// Parliament left → home. Wrench right → editor for this room.
// No border-b: the chat fades into the chrome via the existing
// .messages-fade-mask on the chat scroller.
function ChatDesktopChrome({ wrenchTarget }) {
  const navigate = useNavigate()
  return (
    <div className="flex items-center px-4 sm:px-6 py-2.5 bg-white shrink-0">
      <button
        type="button"
        onClick={() => navigate('/')}
        title="Home"
        aria-label="Home"
        className="inline-flex items-center gap-2 text-[var(--p-text-primary)] font-medium hover:text-[var(--p-gold-light)] transition-colors"
      >
        <ParliamentMark />
        <span className="text-sm">Parliament</span>
      </button>
      <div className="flex-1" />
      <button
        type="button"
        onClick={() => navigate(wrenchTarget, { state: { fromChat: true } })}
        title="Open Editor"
        aria-label="Open Editor"
        className="inline-flex items-center justify-center w-8 h-8 rounded-md text-[var(--p-text-secondary)] hover:text-[var(--p-gold-light)] transition-colors"
      >
        <Wrench className="w-4 h-4" />
      </button>
    </div>
  )
}
