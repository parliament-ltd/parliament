import { useEffect, useMemo, useState } from 'react'
import { useLingui } from '@lingui/react'
import { COPY } from '../copy'
import RoomShell from '../components/RoomShell'
import { getConversation } from '../lib/db'
import { loadMode } from '../lib/modes'
import { assignDefaultRoom } from '../lib/migration'
import { schemeName } from '../lib/schemes'
import { useChat } from '../stores/ChatContext'
import { useConversations } from '../stores/ConversationContext'
import { ConversationScope } from '../stores/ConversationScope'

// A room as a board on the shell (refactor-plan.md, stage 4). The room is
// drawn as today's chat page draws it: its chat is found, given the
// default room if it has none, and its mode file is drawn by RoomShell,
// told which chat it shows (ConversationScope). Two things differ:
// - The room's theme is set on the room itself, not on the page, so the
//   chrome around it keeps its own colours (C64).
// - The room's input block is left out: the bar is the only place a prompt
//   is typed (C37). Its input features stay in the room, for the bar to
//   hold later.
// Opening the board loads its chat's messages; closing it, or going to
// another screen, leaves the chat, which stops a reply being written unless
// the person chose to let replies finish (C109).
//
// With no chat yet (`room:new`) it is an empty room: the first prompt
// starts its chat.

const COMPOSER = 'input'
const blockName = (ref) => String(ref ?? '').split('@')[0]
const withoutComposer = (mode) => ({ ...mode, components: (mode.components ?? []).filter((c) => blockName(c?.ref) !== COMPOSER) })

function Card({ addressed, onAddress, title, aside, children }) {
  const { i18n } = useLingui()
  return (
    <article
      className={`ch-card room${addressed ? ' addressed' : ''}`}
      aria-current={addressed ? 'true' : undefined}
      onMouseDown={() => onAddress('room')}
    >
      <header className="ch-chead">
        <h2 dir="auto">{title}</h2>
        {aside && <span className="ch-marg ch-aside" dir="auto">{aside}</span>}
        {addressed && <span className="ch-marg">{i18n._(COPY.shell.addressed)}</span>}
      </header>
      {children}
    </article>
  )
}

/**
 * @param {{ chatId: string|null, addressed: boolean, onAddress: (board: string) => void,
 *   onReady?: (chatId: string) => void, onLeave?: (chatId: string) => void }} props
 *   onReady: told once the chat's messages are loaded, so a prompt can go;
 *   onLeave: told when the board stops showing the chat
 */
export default function RoomBoard({ chatId, addressed, onAddress, onReady, onLeave }) {
  const { i18n } = useLingui()
  const { loadMessages, clearMessages, leaveConversation, activeConversationId } = useChat()
  const { conversations } = useConversations()
  const [found, setFound] = useState({ forId: null, chat: null, mode: null, error: null })
  const [loadedFor, setLoadedFor] = useState(null)

  // The chat and its room, as ChatView finds them.
  useEffect(() => {
    if (!chatId) return undefined
    let cancelled = false
    async function find() {
      try {
        let chat = await getConversation(chatId)
        if (!chat) { if (!cancelled) setFound({ forId: chatId, chat: null, mode: null, error: 'not-found' }); return }
        if (!chat.room) {
          const room = await assignDefaultRoom(chat.id)
          if (!room) { if (!cancelled) setFound({ forId: chatId, chat, mode: null, error: 'no-room' }); return }
          chat = { ...chat, room }
        }
        const mode = await loadMode(chat.room).catch(() => null)
        if (cancelled) return
        setFound(mode ? { forId: chatId, chat, mode: withoutComposer(mode), error: null } : { forId: chatId, chat, mode: null, error: 'no-mode' })
      } catch {
        if (!cancelled) setFound({ forId: chatId, chat: null, mode: null, error: 'failed' })
      }
    }
    find()
    return () => { cancelled = true }
  }, [chatId])

  // The chat's messages while the board is open.
  useEffect(() => {
    if (!chatId) return undefined
    let cancelled = false
    loadMessages(chatId).finally(() => { if (!cancelled) setLoadedFor(chatId) })
    return () => {
      cancelled = true
      onLeave?.(chatId)
      leaveConversation(chatId)
      clearMessages()
    }
  }, [chatId, loadMessages, clearMessages, leaveConversation, onLeave])

  const ready = Boolean(chatId) && loadedFor === chatId && activeConversationId === chatId
  useEffect(() => { if (ready) onReady?.(chatId) }, [ready, chatId, onReady])

  // The title as it stands, renamed or not.
  const live = useMemo(() => conversations.find((c) => c.id === chatId) ?? null, [conversations, chatId])
  const chat = live ?? (found.forId === chatId ? found.chat : null)
  const scheme = found.mode?.scheme?.ref ? schemeName(found.mode.scheme.ref) : 'parliament'

  if (!chatId) {
    return (
      <Card addressed={addressed} onAddress={onAddress} title={i18n._(COPY.room.newTitle)}>
        <div className="ch-cbody"><p className="ch-marg">{i18n._(COPY.room.empty)}</p></div>
      </Card>
    )
  }

  const title = chat?.num != null ? String(chat.num) : i18n._(COPY.boards.room)
  const card = (body) => <Card addressed={addressed} onAddress={onAddress} title={title} aside={chat?.title || null}>{body}</Card>

  if (found.forId !== chatId) return card(null)
  if (found.error) {
    const words = found.error === 'not-found' ? COPY.room.notFound : COPY.room.unavailable
    return card(<div className="ch-cbody"><p className="ch-marg">{i18n._(words)}</p></div>)
  }
  return card(
    <div className="ch-room" data-scheme={scheme}>
      {ready && (
        <ConversationScope.Provider value={chatId}>
          <RoomShell mode={found.mode} />
        </ConversationScope.Provider>
      )}
    </div>,
  )
}
