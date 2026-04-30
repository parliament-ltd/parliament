// ChatView — `/chat/:id` route shell.
//
// PR-10a wired this route through <RoomShell>: load the conversation,
// read `conversation.room`, load the matching mode file, render
// RoomShell against it. PR-10a.5 added the conversation-activation
// step so chat-essential catalog components (messages@1.0, input@1.0)
// self-bind to ChatContext and see live data.
//
// ─── Albatross fallback ────────────────────────────────────────────────
//
// The PR-10a migration assigns a room to every conversation whose
// `createdInMode` value is recognized. For records the migration left
// untouched (unrecognized values, or pre-PR-10a installs that haven't
// upgraded yet), `conversation.room` stays null and we render the V1
// Albatross adapter. This is the recoverable state per
// refactor/data-migration.md §"Rollback plan" — PR-10b is the point
// of no return.
//
// We also fall back to Albatross when a room id IS set but the mode
// file fails to load (deleted out from under the conversation, db
// corruption, etc.). The failure mode is "user sees their chat in the
// V1 shell" rather than "user sees a diagnostic stub" — a strictly
// better outcome until the V2 chat shell wiring fully matures.
//
// ─── Conversation activation (PR-10a.5) ────────────────────────────────
//
// When this route renders <RoomShell>, the catalog components inside
// (messages@1.0, input@1.0) read live state from useChat() / the other
// existing React contexts. For that to be the active conversation's
// state, somebody has to call useChat().loadMessages(id) on entry and
// useChat().clearMessages() on exit. That somebody is this view —
// catalog components shouldn't know which conversation is open, just
// that one IS open.
//
// The activation lives in <RoomShellChatHost> below so it only fires
// on the RoomShell branch. The Albatross fallback runs its own
// loadMessages call inside its mount effect (unchanged from V1) — no
// double-load because the two branches never render simultaneously.

import { lazy, Suspense, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import RoomShell from '../components/RoomShell'
import { getConversation } from '../lib/db'
import { loadMode } from '../lib/modes'
import { useChat } from '../stores/ChatContext'

const AlbatrossChatLayout = lazy(() => import('../adapters/albatross/ChatLayout'))

export default function ChatView() {
  const { id } = useParams()
  const [resolution, setResolution] = useState({
    forId: null,
    conversation: null,
    mode: null,
    error: null,
  })

  // Load conversation + (optionally) its room mode whenever the route
  // id changes. Cancellation flag prevents a stale resolution from
  // racing past a newer one. Failures collapse to a null mode so the
  // render branch falls back to Albatross — surfacing a diagnostic
  // here would block the user from their data, which is worse.
  useEffect(() => {
    if (!id) return
    let cancelled = false
    async function resolve() {
      try {
        const conv = await getConversation(id)
        if (cancelled) return
        if (!conv) {
          setResolution({ forId: id, conversation: null, mode: null, error: null })
          return
        }
        let mode = null
        if (conv.room) {
          try {
            mode = await loadMode(conv.room)
          } catch (err) {
            if (import.meta.env.DEV) {
              console.warn(`[ChatView] failed to load mode ${conv.room}:`, err)
            }
            mode = null
          }
        }
        if (cancelled) return
        setResolution({ forId: id, conversation: conv, mode, error: null })
      } catch (err) {
        if (cancelled) return
        setResolution({ forId: id, conversation: null, mode: null, error: err })
      }
    }
    resolve()
    return () => { cancelled = true }
  }, [id])

  // Resolution hasn't caught up to the current id yet — render nothing
  // (matches the V1 adapter's Suspense fallback) rather than a flash of
  // intermediate UI.
  if (resolution.forId !== id) return null

  // If the conversation exists AND has a room AND the mode loaded, use
  // the V2 RoomShell path. Otherwise fall back to Albatross — that
  // covers: missing conversation (Albatross handles its own redirect),
  // null room (migration didn't map this record), and mode-load failure.
  const useRoomShellPath = resolution.conversation && resolution.mode
  if (useRoomShellPath) {
    return <RoomShellChatHost conversationId={id} mode={resolution.mode} />
  }
  return (
    <Suspense fallback={null}>
      <AlbatrossChatLayout />
    </Suspense>
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
  // Track which id our completed loadMessages() call corresponds to.
  // Comparing against the requested conversationId at render time gives
  // us a "still loading" signal without setState-in-effect (which the
  // react-hooks/set-state-in-effect lint rule flags). Same pattern as
  // src/hooks/useMode.js.
  const [loadedFor, setLoadedFor] = useState(null)

  useEffect(() => {
    let cancelled = false
    loadMessages(conversationId).finally(() => {
      if (!cancelled) setLoadedFor(conversationId)
    })
    return () => {
      cancelled = true
      // Clear on id change / unmount so the next mount starts clean.
      // This also fires when the user navigates away from /chat/:id
      // entirely, e.g. back to the homepage.
      clearMessages()
    }
  }, [conversationId, loadMessages, clearMessages])

  // Gate the render until loadMessages has resolved AND ChatContext's
  // activeConversationId matches the route id. Either one being out of
  // sync indicates a mid-transition state where messages@1.0 would
  // render the previous conversation's data for one frame.
  if (loadedFor !== conversationId || activeConversationId !== conversationId) {
    return null
  }

  return <RoomShell mode={mode} />
}
