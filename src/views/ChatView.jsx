// ChatView — `/chat/:id` route shell (PR-10a wiring).
//
// PR-10a wires this route through <RoomShell>: load the conversation,
// read `conversation.room`, load the matching mode file, render
// RoomShell against it. The V1 mode-context adapter selection is gone.
//
// ─── Albatross fallback ────────────────────────────────────────────────
//
// The PR-10a migration assigns a room to every conversation whose
// `createdInMode` value is recognized. For records the migration left
// untouched (unrecognized values, or pre-PR-10a installs that haven't
// upgraded yet), `conversation.room` stays null and we render the V1
// Albatross adapter. This is the recoverable state per
// refactor/data-migration.md §"Rollback plan" — PR-10b is the point
// of no return; PR-10a deliberately keeps Albatross intact.
//
// We also fall back to Albatross when a room id IS set but the mode
// file fails to load (deleted out from under the conversation, db
// corruption, etc.). The failure mode is "user sees their chat in the
// V1 shell" rather than "user sees a diagnostic stub" — a strictly
// better outcome until the V2 chat shell wiring matures.
//
// ─── Known limitation: V2 catalog components are scaffold-shaped ───────
//
// The catalog entries this route renders via <RoomShell> (messages@1.0,
// input@1.0, branches@1.0, highlights@1.0, notes@1.0, context@1.0)
// currently use preview-shaped render functions. They display sample or
// empty state rather than the live conversation. Full ChatContext
// wiring is follow-up work between PR-10a's migration-validation
// checkpoint and PR-10b's adapter deletion. See
// refactor/phase-1-testing.md PR-10a section, "Known limitations".

import { lazy, Suspense, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import RoomShell from '../components/RoomShell'
import { getConversation } from '../lib/db'
import { loadMode } from '../lib/modes'

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
  const useRoomShell = resolution.conversation && resolution.mode
  if (useRoomShell) {
    return <RoomShell mode={resolution.mode} />
  }
  return (
    <Suspense fallback={null}>
      <AlbatrossChatLayout />
    </Suspense>
  )
}
