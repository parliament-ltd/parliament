import { useEffect, useMemo, useState } from 'react'
import { useLingui } from '@lingui/react'
import { COPY } from '../copy'
import RoomShell from '../components/RoomShell'
import { getConversation } from '../lib/db'
import { loadMode } from '../lib/modes'
import { assignDefaultRoom } from '../lib/migration'
import { schemeName } from '../lib/schemes'
import { roomName } from '../lib/roomNames'
import { roomLabel } from './say'
import { useChat } from '../stores/ChatContext'
import { useConversations } from '../stores/ConversationContext'
import { ConversationScope } from '../stores/ConversationScope'
import { AnnotationsProvider } from '../stores/AnnotationsContext'
import { RoomHost } from '../lib/useViewportWidth'
import { ROOM_EDGES, bandWidth, roomForm } from '../lib/roomForm'
import { useBand } from './useNarrower'

// A room as a board on the shell (refactor-plan.md, stage 4). The room is
// drawn as today's chat page draws it: its chat is found, given the
// default room if it has none, and its mode file is drawn by RoomShell,
// told which chat it shows (ConversationScope). Two things differ:
// - The room's theme is set on the room itself, not on the page, so the
//   chrome around it keeps its own colours (C64).
// - The room's input block is left out: the bar is the only place a prompt
//   is typed (C37). Its input features stay in the room, for the bar to
//   hold later.
// Opening the board loads its chat's messages; closing it, or showing
// another chat in it, leaves the chat, which stops a reply being written
// unless the person chose to let replies finish (C109).
//
// With no chat yet it is an empty room: the first prompt starts its chat.
//
// Its side columns follow its form (roomForm.js; C279 (b)), from its own
// width, not the window's, and whether it has the screen to itself:
// - alone on screen (the only board, or popped into its own window) and
//   wide enough, the columns stand open, as before;
// - sharing the screen, or a focused room, they start closed, each a thin
//   strip with a button, and the chat takes the room's width;
// - too narrow for a chat at all (about 600px), or on a phone, its layout's
//   narrow form: the conversation, with the columns behind the buttons at
//   its top (C126).
// Open or closed is not remembered: each room starts as its form says.
//
// For now the columns are not drawn in any of these forms (C280 (a);
// release.js, COLUMNS): the room is its chat. The form still decides the
// narrow layout.

const COMPOSER = 'input'
const blockName = (ref) => String(ref ?? '').split('@')[0]
const withoutComposer = (mode) => ({ ...mode, components: (mode.components ?? []).filter((c) => blockName(c?.ref) !== COMPOSER) })

function Card({ board, addressed, onAddress, title, aside, room, ripple, markup = null, children }) {
  const { i18n } = useLingui()
  return (
    <article
      className={`ch-card room${addressed ? ' addressed' : ''}`}
      aria-current={addressed ? 'true' : undefined}
      data-board={board}
      onMouseDown={() => onAddress(board)}
    >
      <header className="ch-chead">
        <h2 dir="auto">{title}</h2>
        {aside && <span className="ch-marg ch-aside" dir="auto">{aside}</span>}
        {aside && room && <span className="ch-marg ch-aside ch-sep" aria-hidden="true">·</span>}
        {room && <span className="ch-marg ch-aside" dir="auto">{room}</span>}
        {/* markup · clean (inline editing v5; 29 October): a click runs markup:on or markup:off, which undo: takes back. */}
        {markup && (
          <span className="ch-marg ch-col-markup">
            <button type="button" className={markup.clean ? undefined : 'on'} aria-pressed={!markup.clean} title={i18n._(COPY.room.markupRuns, { command: 'markup:on' })} onMouseDown={(e) => e.stopPropagation()} onClick={() => markup.onRun('markup:on')}>{i18n._(COPY.room.markupWord)}</button>
            <span aria-hidden="true">{'·'}</span>
            <button type="button" className={markup.clean ? 'on' : undefined} aria-pressed={markup.clean} title={i18n._(COPY.room.markupRuns, { command: 'markup:off' })} onMouseDown={(e) => e.stopPropagation()} onClick={() => markup.onRun('markup:off')}>{i18n._(COPY.room.cleanWord)}</button>
          </span>
        )}
        {/* Ripple for the plan's branches (stage 12, piece 2; C231 (e)): a click writes the command, which costs, and waits for Enter. */}
        {ripple && (
          <button type="button" className={`ch-marg ch-ripple${ripple.on ? ' on' : ''}`} title={i18n._(COPY.room.rippleHelp, { command: ripple.on ? 'ripple:off' : 'ripple:on' })} onMouseDown={(e) => e.stopPropagation()} onClick={() => ripple.onWrite(ripple.on ? '>ripple:off' : '>ripple:on')}>
            {i18n._(ripple.on ? COPY.room.rippleOn : COPY.room.rippleOff)}
          </button>
        )}
      </header>
      {children}
    </article>
  )
}

/**
 * @param {{ chatId: string|null, addressed: boolean, onAddress: (board: string) => void,
 *   onReady?: (chatId: string) => void, onLeave?: (chatId: string) => void,
 *   onName?: (chatId: string, name: object|null) => void, rev?: number, board?: string,
 *   ripple?: { on: boolean, onWrite: (text: string) => void }|null }} props
 *   ripple: the switch in its head, when its chat is in a plan with other branches (C231 (e));
 *   board: which room board this is ('room', 'room-2' …), with several open (C175 (a));
 *   onReady: told once the chat's messages are loaded, so a prompt can go;
 *   onLeave: told when the board stops showing the chat; onName: told what
 *   the room is called (roomNames.js); rev: changes when the room was
 *   named, so it is read again; alone: no other board shares the screen
 *   with it (C279 (b))
 */
export default function RoomBoard({ chatId, addressed, onAddress, onReady, onLeave, onName, rev = 0, board = 'room', ripple = null, markup = null, systemFor = null, small = false, alone = false }) {
  const { i18n } = useLingui()
  const { holdChat, watchConversation } = useChat()
  const { conversations } = useConversations()
  const [found, setFound] = useState({ forId: null, chat: null, mode: null, error: null })
  const [loadedFor, setLoadedFor] = useState(null)
  // Its width in steps, so it draws again only when it crosses one.
  const [roomRef, band] = useBand(ROOM_EDGES)

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
  }, [chatId, rev])

  // The chat's messages while the board is open, held by this room: with
  // several rooms open, each holds its own (C175 (a)).
  useEffect(() => {
    if (!chatId) return undefined
    let cancelled = false
    // Shown here: left only when nothing else on screen shows it (C173).
    const unwatch = watchConversation(chatId)
    const hold = holdChat(chatId)
    hold.ready.finally(() => { if (!cancelled) setLoadedFor(chatId) })
    return () => {
      cancelled = true
      onLeave?.(chatId)
      unwatch()
      hold.release()
    }
  }, [chatId, holdChat, watchConversation, onLeave])

  const ready = Boolean(chatId) && loadedFor === chatId
  useEffect(() => { if (ready) onReady?.(chatId) }, [ready, chatId, onReady])

  // The title as it stands, renamed or not.
  const live = useMemo(() => conversations.find((c) => c.id === chatId) ?? null, [conversations, chatId])
  const chat = live ?? (found.forId === chatId ? found.chat : null)
  const scheme = found.mode?.scheme?.ref ? schemeName(found.mode.scheme.ref) : 'parliament'
  // A room built for a phone draws its narrow form at any width, in a
  // phone's width (stage 13, piece 5; C246 (a)); one built for a computer,
  // narrow only when its board is.
  const phone = found.forId === chatId && found.mode?.deviceClass === 'visual-touch-phone'
  // systemFor: the chat's frameworks and reply language, for Continue (C251 (d)).
  // On a phone, every room draws its narrow form, a tablet's width included (C261 (f)).
  const form = roomForm({ width: bandWidth(band), alone, phone: phone || small })
  const host = useMemo(() => ({ narrow: form === 'narrow', form, alone, systemFor }), [form, alone, systemFor])
  // What the room is called, for its header and the Enter line (C40, C90).
  const named = found.forId === chatId && found.mode ? roomName(found.mode) : null
  const namedKey = JSON.stringify(named)
  useEffect(() => { if (chatId && found.forId === chatId) onName?.(chatId, JSON.parse(namedKey)) }, [chatId, found.forId, namedKey, onName])

  if (!chatId) {
    return (
      <Card board={board} addressed={addressed} onAddress={onAddress} title={i18n._(COPY.room.newTitle)}>
        <div className="ch-cbody"><p className="ch-marg">{i18n._(COPY.room.empty)}</p></div>
      </Card>
    )
  }

  const title = chat?.num != null ? String(chat.num) : i18n._(COPY.boards.room)
  const room = found.forId === chatId && found.mode ? roomLabel(i18n, named) : null
  const card = (body) => <Card board={board} addressed={addressed} onAddress={onAddress} title={title} aside={chat?.title || null} room={room} ripple={ripple} markup={markup}>{body}</Card>

  if (found.forId !== chatId) return card(null)
  if (found.error) {
    const words = found.error === 'not-found' ? COPY.room.notFound : COPY.room.unavailable
    return card(<div className="ch-cbody"><p className="ch-marg">{i18n._(words)}</p></div>)
  }
  return card(
    <div className={`ch-room${phone ? ' phone' : ''}`} data-scheme={scheme} ref={roomRef}>
      {ready && (
        <RoomHost.Provider value={host}>
          <ConversationScope.Provider value={chatId}>
            {/* Its notes, keywords and favourites: this room's chat's (C175 (a)). */}
            <AnnotationsProvider conversationId={chatId}>
              <RoomShell mode={found.mode} />
            </AnnotationsProvider>
          </ConversationScope.Provider>
        </RoomHost.Provider>
      )}
    </div>,
  )
}
