import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLingui } from '@lingui/react'
import './chrome.css'
import { COPY } from '../copy'
import { initDB, getConversation, getSetting, setSetting } from '../lib/db'
import { renameMode } from '../lib/modes'
import { loadSpace, saveArrangement } from '../lib/arrangements'
import { keepCommand, readCommands } from '../lib/commandHistory'
import { assignDefaultRoom } from '../lib/migration'
import { titleFromPrompt } from '../lib/chatTitles'
import { shipped, address, planOpen, planPopBack, planPopBar, planRoom, roomOnScreen, SPACE } from '../shell/arrangement'
import { historyChars } from '../shell/estimate'
import { WELCOME_SETTING, freshWelcome, cleanWelcome, tick, nextStep, showSteps, stepsShown } from '../shell/welcome'
import { detectFeatures } from '../shell/features'
import { openPopout, closePopout, placePopout, onPopoutClosed } from '../shell/popout'
import { hasKey, models, metadataModel, destination, DEFAULT_MODEL_PROVIDER as PROVIDER } from '../net'
import { useChat } from '../stores/ChatContext'
import { useConversations } from '../stores/ConversationContext'
import { useSettings } from '../stores/SettingsContext'
import { useCollabMode } from '../stores/CollabModeContext'
import { useIsStreaming, useHiddenIds, usePendingDeletes, useStreamEnd } from '../stores/chatHooks'
import { sendableOf } from '../stores/chatStore'
import { fromSource } from '../stores/sendHistory'
import { preview } from './preview'
import Bar from './Bar'
import Strip from './Strip'
import Board from './Board'
import RoomBoard from './RoomBoard'
import WelcomeBoard, { WelcomeFoot } from './WelcomeBoard'

// The new shell (refactor-plan.md §4 and stages 3 and 4): the board strip,
// the boards as the arrangement places them, the bar, and windows of their
// own. In development (and in builds made with VITE_PROTOTYPES=1) it lives
// at /shell, beside today's screens, until each of them is replaced. Rooms
// are drawn (stage 4); the other boards are placeholders until their stages
// draw them.
//
// Screens: the shell shows one arrangement at a time, starting at the
// Almanac. alm: goes to the Almanac and sym: to the last room, or to an
// empty room when there is none (C95); each keeps its own arrangement.
//
// Prompts: Enter in prompt mode sends to the room the screen shows. With a
// key for the provider it goes there; without one it goes to Wikipedia,
// which needs no key (stage 4). The Enter line names which before Enter.
//
// Windows: a popped board, and the popped bar, are drawn into blank windows
// through portals (popout.js), each board's window with its own bar (C6).
// Closing a window brings its board back; leaving the page closes them all.
// A window cannot be reopened without a click, so on load what was popped
// comes back to the page.

// The source a prompt goes to when there is no key (stage 4).
const SOURCE = 'wikipedia'
// The boards that take the wide column where they stand.
const MAIN = new Set(['almanac', 'canvas', 'room', 'docket', 'settings', 'welcome'])
const BAR = 'command' // the popped bar's key among the windows
const FEATURES = detectFeatures()
const NONE = Object.freeze([])

// The interface language a source answers in. The test languages (en-XA,
// ar-XB) stand for English.
const sourceLocale = (locale) => (/-(XA|XB)$/i.test(String(locale ?? '')) ? 'en' : locale)

// What the Enter line says when a prompt did not go through: a key of
// COPY.enter, or one with its values. Never the error's own text.
function failure(err) {
  if (err?.name === 'AbortError') return null
  if (err?.name === 'Refused') return 'promptChanged'
  if (err?.kept) return 'replyCut'
  if (err?.name === 'SourceError') {
    return { message: err.reason === 'unreachable' ? 'sourceUnreachable' : 'sourceRefused', values: { source: destination(SOURCE)?.name } }
  }
  if (err?.status === 401 || err?.status === 403) return { message: 'keyRefused', values: { board: 'settings' } }
  if (err?.status === 429) return 'tooMany'
  return 'promptFailed'
}

// Windows to open, close and place to go from one arrangement to the next.
function windowChanges(from, to) {
  const was = new Set(from.popped.map((p) => p.board))
  const now = new Set(to.popped.map((p) => p.board))
  const open = [...now].filter((b) => !was.has(b))
  const close = [...was].filter((b) => !now.has(b))
  if (to.bar.popped && !from.bar.popped) open.push(BAR)
  if (!to.bar.popped && from.bar.popped) close.push(BAR)
  const place = to.popped.filter((p) => p.side && from.popped.find((q) => q.board === p.board)?.side !== p.side)
  return { open, close, place }
}

// What was popped comes back to the page: windows need a click to open.
function backOnPage(a) {
  let next = a
  if (next.popped.length) next = planPopBack(next).next ?? next
  if (next.bar.popped) next = planPopBar(next, false).next ?? next
  return next
}

export default function Shell() {
  const { i18n } = useLingui()
  const [arrangement, setArrangement] = useState(() => shipped(SPACE))
  const [windows, setWindows] = useState({}) // board or 'command' -> { win, container }
  const [lines, setLines] = useState([])
  const [started, setStarted] = useState(false)
  const current = useRef(arrangement)
  const handles = useRef({})
  const db = useRef(null)

  const commit = useCallback((next) => {
    if (!next || next === current.current) return
    current.current = next
    setArrangement(next)
    if (db.current) saveArrangement(db.current, next).catch(() => {})
  }, [])

  // The welcome page's progress, kept on this device only (C121).
  const [welcome, setWelcomeState] = useState(freshWelcome)
  const welcomeRef = useRef(welcome)
  const updateWelcome = useCallback((change) => {
    const next = change(welcomeRef.current)
    if (next === welcomeRef.current) return
    welcomeRef.current = next
    setWelcomeState(next)
    setSetting(WELCOME_SETTING, next).catch(() => {})
  }, [])

  // The space and the history this device kept, once the database is open.
  // With no space kept yet, someone who has made nothing starts on the
  // welcome page, anyone else on the Almanac (C118, C125).
  useEffect(() => {
    let live = true
    initDB().then(async (handle) => {
      db.current = handle
      const [chats, history, stored] = await Promise.all([
        handle.count('conversations'), readCommands(handle), getSetting(WELCOME_SETTING).catch(() => null),
      ])
      const kept = await loadSpace(handle, { fresh: !chats })
      if (!live) return
      welcomeRef.current = cleanWelcome(stored)
      setWelcomeState(welcomeRef.current)
      commit(backOnPage(kept))
      setLines(history)
      setStarted(true)
    }).catch(() => setStarted(true))
    return () => { live = false }
  }, [commit])

  // Steps the space shows as done: the bar at the foot, a board in its own
  // window, the Almanac, the Library, the key panel.
  useEffect(() => {
    for (const id of stepsShown(arrangement)) updateWelcome((w) => tick(w, id))
  }, [arrangement, updateWelcome])
  const onMode = useCallback((mode) => { if (mode === 'command') updateWelcome((w) => tick(w, 'command')) }, [updateWelcome])

  // A step's command, clicked, is written into the field.
  const [write, setWrite] = useState(null)
  const writes = useRef(0)
  const writeField = useCallback((value) => setWrite({ value, n: ++writes.current }), [])

  // Leaving the page closes every window it opened.
  useEffect(() => {
    const open = handles.current
    const closeAll = () => Object.values(open).forEach(closePopout)
    window.addEventListener('pagehide', closeAll)
    return () => { window.removeEventListener('pagehide', closeAll); closeAll() }
  }, [])

  const forget = useCallback((key) => {
    delete handles.current[key]
    setWindows({ ...handles.current })
  }, [])

  // A window closed by the person brings its board, or the bar, back.
  const watch = useCallback((key, handle) => onPopoutClosed(handle, () => {
    forget(key)
    const a = current.current
    commit(key === BAR ? planPopBar(a, false).next : planPopBack(a, key).next)
  }), [commit, forget])

  /** Runs a planned arrangement: opens, closes and places its windows, then keeps it. */
  const run = useCallback(async (next, body) => {
    if (waiting.current && roomOnScreen(next) !== waiting.current.chatId) { waiting.current.drop(); waiting.current = null }
    const changes = windowChanges(current.current, next)
    const opened = []
    for (const key of changes.open) {
      const title = key === BAR ? i18n._(COPY.shell.barWindow) : i18n._(COPY.shell.windowTitle, { board: i18n._(COPY.boards[key]) })
      const handle = await openPopout({ what: key === BAR ? 'bar' : 'board', name: `parliament-${key}`, title, onTop: key === BAR && FEATURES.onTop })
      if (!handle) { opened.forEach(([, h]) => closePopout(h)); return 'popBlocked' }
      opened.push([key, handle])
    }
    for (const key of changes.close) {
      const handle = handles.current[key]
      delete handles.current[key]
      handle?.unwatch?.()
      closePopout(handle)
    }
    for (const [key, handle] of opened) {
      handle.unwatch = watch(key, handle)
      if (key !== BAR) handle.win.addEventListener('focus', () => commit(address(current.current, key)))
      handles.current[key] = handle
    }
    for (const p of changes.place) if (handles.current[p.board]) placePopout(handles.current[p.board], p.side)
    setWindows({ ...handles.current })
    commit(next)
    if (db.current && body) {
      keepCommand(db.current, body).then((kept) => (kept ? readCommands(db.current).then(setLines) : null)).catch(() => {})
    }
    return null
  }, [commit, i18n, watch])

  // ── The room in the space (stage 4; C125) ─────────────
  // The chat it shows, and a prompt waiting for a new room to load.
  const readyRoom = useRef(null) // the chat whose room has loaded its messages
  const waiting = useRef(null) // a prompt waiting for its new room to load

  // name: (C40): the room's own name, kept on the room record. The room
  // board then reads its room again.
  const [roomRev, setRoomRev] = useState(0)
  const [roomNameOf, setRoomNameOf] = useState(null) // { chatId, value }: what the room on screen is called
  const onRoomName = useCallback((chatId, value) => setRoomNameOf({ chatId, value }), [])
  const remember = useCallback((body) => {
    if (db.current && body) keepCommand(db.current, body).then((kept) => (kept ? readCommands(db.current).then(setLines) : null)).catch(() => {})
  }, [])
  const act = useCallback(async (what, body, next = null) => {
    if (what.kind === 'tourOn' || what.kind === 'tourOff') {
      // tour: may bring the welcome card back into the space first.
      if (next) { const refused = await run(next, null); if (refused) return refused }
      updateWelcome((w) => showSteps(w, what.kind === 'tourOn'))
      remember(body)
      return null
    }
    if (what.kind !== 'nameRoom') return 'later'
    const chat = await getConversation(what.chatId).catch(() => null)
    const saved = chat?.room ? await renameMode(chat.room, what.name).catch(() => null) : null
    if (!saved) return 'nameFailed'
    setRoomRev((n) => n + 1)
    updateWelcome((w) => tick(w, 'name'))
    remember(body)
    return null
  }, [remember, run, updateWelcome])

  const onRun = useCallback((next, body, go, what) => (what ? act(what, body, next) : run(next, body)), [act, run])

  const onRoomReady = useCallback((chatId) => {
    readyRoom.current = chatId
    const w = waiting.current
    if (w && w.chatId === chatId) { waiting.current = null; w.go() }
  }, [])
  const onRoomLeave = useCallback((chatId) => { if (readyRoom.current === chatId) readyRoom.current = null }, [])

  // ── Prompts from the bar (stage 4) ────────────────────
  const { messages, activeConversationId, sendMessage, resendWhole, askSource } = useChat()
  const { conversations, createConversation, loadConversations } = useConversations()
  const { settings } = useSettings()
  const { buildSystemPrompt } = useCollabMode()
  const [keyed, setKeyed] = useState(null) // whether there is a key, without decrypting it; null until known
  const [stalledIn, setStalledIn] = useState(null) // the chat whose last reply stalled (C114)
  const creating = useRef(false)
  const latest = useRef({})
  useEffect(() => { latest.current = { settings, buildSystemPrompt, locale: i18n.locale } })

  // The chats as they stand on disk, for "the last room".
  useEffect(() => { loadConversations().catch(() => {}) }, [loadConversations])

  // Whether there is a key: on load, and on coming back to the page, since
  // Settings may have changed it meanwhile.
  useEffect(() => {
    let live = true
    const check = () => hasKey().then((k) => { if (live) setKeyed(Boolean(k)) }, () => { if (live) setKeyed(false) })
    check()
    window.addEventListener('focus', check)
    return () => { live = false; window.removeEventListener('focus', check) }
  }, [])

  const roomId = roomOnScreen(arrangement) // the chat in the space's room; null in an empty room; undefined with no room
  const streaming = useIsStreaming(roomId ?? '')
  // The ink pot in the prompt field: draining while a reply arrives, then
  // refilled, or spilt if the reply was stopped or broke off (C114).
  const ended = useStreamEnd(roomId ?? '')
  const ink = streaming ? 'writing' : ended?.how ?? null
  const lastRoom = useMemo(() => {
    let latestChat = null
    for (const c of conversations) if (!latestChat || Date.parse(c.updatedAt) > Date.parse(latestChat.updatedAt)) latestChat = c
    return latestChat ? { id: latestChat.id, num: latestChat.num ?? null } : null
  }, [conversations])
  const roomNameHere = roomId && roomNameOf?.chatId === roomId ? roomNameOf.value : null
  const screens = useMemo(() => ({ lastRoom, roomName: roomNameHere, stepsOff: welcome.off }), [lastRoom, roomNameHere, welcome.off])

  // Where a prompt would go, for the Enter line: worked out here, sending
  // nothing (C83).
  const model = useMemo(() => models(PROVIDER).find((m) => m.id === settings.defaultModel) ?? null, [settings.defaultModel])
  const roomRecord = roomId ? conversations.find((c) => c.id === roomId) ?? null : null
  // What would go along: the chat's messages, less what is hidden or being
  // deleted, which are not sent.
  const shown = roomId && activeConversationId === roomId ? messages : NONE
  const hiddenHere = useHiddenIds(roomId ?? '')
  const deletingHere = usePendingDeletes(roomId ?? '')
  const kept = useMemo(() => sendableOf(shown, hiddenHere, deletingHere), [shown, hiddenHere, deletingHere])
  const hiddenOut = shown.filter((m) => m.content).length - kept.length
  // Answers from sources stay out too, unless the person acts on them (C115).
  const along = useMemo(() => kept.filter((m) => !fromSource(m)), [kept])
  const sourcesOut = useMemo(() => {
    const answers = kept.filter(fromSource)
    return { count: answers.length, names: [...new Set(answers.map((m) => m.source.name || m.source.id))] }
  }, [kept])
  // A chat's first prompt is followed, with a key, by one request for its
  // title, summary and tags, unless turned off in Settings (C62).
  const describeModel = useMemo(() => models(PROVIDER).find((m) => m.id === metadataModel(PROVIDER)) ?? null, [])
  const firstPrompt = roomId === null || (Boolean(roomId) && activeConversationId === roomId && messages.length === 0)
  const describes = Boolean(keyed && firstPrompt && settings.describeNewChats !== false)
  const describe = useMemo(() => (describes ? { price: describeModel?.cost ?? null } : null), [describes, describeModel])
  // With no room in the space, a prompt starts a chat in a room beside
  // what is here, so it is offered as going to a new room (C125).
  const prompt = useMemo(() => ({
    room: roomId ?? null,
    chat: roomRecord?.num ?? null,
    streaming,
    keyed,
    provider: destination(PROVIDER)?.name,
    source: destination(SOURCE)?.name,
    model: model?.name ?? settings.defaultModel,
    historyChars: historyChars(along),
    systemChars: keyed ? buildSystemPrompt().length : 0,
    perMillion: model?.cost?.inputPerMillion ?? null,
    hiddenOut,
    sourcesOut,
    describe,
    resend: Boolean(roomId) && stalledIn === roomId,
    ink,
    roomName: roomNameHere,
  }), [roomId, roomRecord, roomNameHere, streaming, ink, keyed, model, settings.defaultModel, along, hiddenOut, sourcesOut, describe, stalledIn, buildSystemPrompt])

  /**
   * Sends a prompt to the room in the space: to the provider with a key,
   * else to the source. With an empty room, or no room at all, it first
   * makes the chat (titled with the prompt's first words, sending nothing)
   * and shows it in a room beside what is here (welcome spec §5; C125).
   * Answers at once whether the prompt went, and `done` once it is answered.
   */
  const onPrompt = useCallback(async (text, shown) => {
    const chatId = roomOnScreen(current.current) ?? null
    if (creating.current) return { refused: 'promptBusy' }
    // The line named a recipient; if that has changed since, say so first.
    const fresh = await hasKey().then(Boolean, () => false)
    if (fresh !== shown?.keyed) { setKeyed(fresh); return { refused: 'promptChanged' } }

    // Nothing typed, and the last reply here stalled: send it again without
    // streaming, as the Enter line offered (C114).
    if (!text) {
      if (!shown?.resend || !chatId || !fresh) return { refused: 'promptFailed' }
      setStalledIn(null)
      const { settings: s, buildSystemPrompt: system } = latest.current
      const done = resendWhole(chatId, s.defaultModel, system())
        .then(() => { loadConversations().catch(() => {}); return null })
        .catch(failure)
      return { done }
    }
    setStalledIn((was) => (was === chatId ? null : was))
    updateWelcome((w) => tick(w, 'ask'))

    let id = chatId
    if (!id) {
      creating.current = true
      try {
        const chat = await createConversation({ title: titleFromPrompt(text), model: latest.current.settings.defaultModel })
        await assignDefaultRoom(chat.id)
        id = chat.id
        const placed = planRoom(current.current, id)
        if (placed.next) await run(placed.next, null)
      } catch {
        return { refused: 'promptFailed' }
      } finally {
        creating.current = false
      }
    }

    const send = () => {
      const { settings: s, buildSystemPrompt: system, locale } = latest.current
      return fresh
        ? sendMessage(id, text, s.defaultModel, system())
        : askSource(id, text, { source: SOURCE, lang: sourceLocale(locale) })
    }
    // A new room sends once its messages are loaded, so nothing is lost
    // between the two.
    const sending = readyRoom.current === id
      ? send()
      : new Promise((resolve, reject) => { waiting.current = { chatId: id, go: () => send().then(resolve, reject), drop: () => resolve() } })
    const done = sending
      .then(() => { loadConversations().catch(() => {}); return null })
      .catch((err) => {
        if (err?.name === 'Refused') hasKey().then((k) => setKeyed(Boolean(k)), () => {})
        // A stall: the Enter line now offers to send it again (C114).
        if (err?.name === 'Stalled') { setStalledIn(id); return null }
        return failure(err)
      })
    return { done }
  }, [askSource, createConversation, loadConversations, resendWhole, run, sendMessage, updateWelcome])

  function pickBoard(board) {
    const a = current.current
    // Sym: on the strip brings a room as sym: does, when there is none here.
    if (board === 'room' && roomOnScreen(a) === undefined) {
      const { next } = preview('>sym:', { mode: 'command', arrangement: a, screens })
      if (next) run(next, null)
      return
    }
    if (handles.current[board]) { handles.current[board].win.focus(); commit(address(a, board)); return }
    commit(a.columns.flat().includes(board) ? address(a, board) : planOpen(a, board).next)
  }

  const focusBoard = (board) => { if (board !== current.current.addressed) commit(address(current.current, board)) }
  const bar = arrangement.bar
  const barWindow = windows[BAR]
  const onWelcome = arrangement.columns.some((c) => c.includes('welcome'))
  const stripArrangement = useMemo(
    () => ({ ...arrangement, context: { ...arrangement.context, room: roomRecord?.num ?? undefined } }),
    [arrangement, roomRecord],
  )
  const welcomeHint = useMemo(() => (onWelcome && !welcome.finished ? { next: nextStep(welcome) } : null), [onWelcome, welcome])
  const shared = { arrangement, lines, screens, prompt, onRun, onPrompt, onTop: FEATURES.onTop, welcome: welcomeHint }
  const drawBoard = (board) => {
    if (board === 'room' && roomId !== undefined) {
      return <RoomBoard key={`room:${roomId ?? 'new'}`} chatId={roomId} rev={roomRev} addressed={arrangement.addressed === 'room'} onAddress={focusBoard} onReady={onRoomReady} onLeave={onRoomLeave} onName={onRoomName} />
    }
    if (board === 'welcome') {
      return <WelcomeBoard key="welcome" welcome={welcome} addressed={arrangement.addressed === 'welcome'} onAddress={focusBoard} onWrite={writeField} barSlot={setCardSlot} />
    }
    return <Board key={board} board={board} addressed={arrangement.addressed === board} onAddress={focusBoard} />
  }

  // The bar is drawn once, into a holder moved between its dock and, on the
  // welcome page at rest, the welcome card (welcome spec §2). Moving the
  // holder keeps what is typed and where the caret was.
  const [barHost] = useState(() => Object.assign(document.createElement('div'), { className: 'ch-bar-host' }))
  const [cardSlot, setCardSlot] = useState(null)
  const dockSlot = useRef(null)
  const inCard = onWelcome && bar.at === 'card' && Boolean(cardSlot)
  useLayoutEffect(() => {
    const target = inCard ? cardSlot : dockSlot.current
    if (!target || barHost.parentNode === target) return
    const active = barHost.ownerDocument.activeElement
    const had = barHost.contains(active)
    target.appendChild(barHost)
    if (had) active.focus()
  }, [inCard, cardSlot, barHost, started])

  if (!started) return <div className="ch-shell" />

  return (
    <div className={`ch-shell bar-${bar.at}${onWelcome ? ` on-welcome${arrangement.columns.length > 1 ? ' many' : ''}` : ''}`}>
      {!onWelcome && <Strip arrangement={stripArrangement} onPick={pickBoard} />}
      {/* One bar in one place, moved by its class or its holder, so moving
          it never loses the field's focus or what is typed. */}
      <div ref={dockSlot} className="ch-bar-host" />
      {!barWindow && createPortal(
        <Bar {...shared} board={arrangement.addressed} doc={document} className={`ch-dock ${bar.at} ${bar.side}`} write={write} onMode={onMode} />,
        barHost,
      )}
      {barWindow && <p className="ch-away ch-marg">{i18n._(COPY.shell.barAway)}</p>}
      <main className="ch-stage">
        {arrangement.columns.map((column) => (
          <div key={column.join(' ')} className={`ch-col${column.some((b) => MAIN.has(b)) ? ' main' : ''}`}>
            {column.map(drawBoard)}
          </div>
        ))}
      </main>
      {barWindow && createPortal(
        <div className="ch-shell ch-in-window">
          <Bar {...shared} board={arrangement.addressed} doc={barWindow.win.document} className="ch-dock window" autoFocus write={write} onMode={onMode} />
        </div>,
        barWindow.container,
      )}
      {arrangement.popped.filter((p) => windows[p.board]).map((p) => createPortal(
        <div className="ch-shell ch-in-window">
          <Bar {...shared} board={p.board} doc={windows[p.board].win.document} className="ch-dock window" onFocusBoard={focusBoard} />
          <main className="ch-stage">
            <div className="ch-col main">
              {drawBoard(p.board)}
            </div>
          </main>
        </div>,
        windows[p.board].container,
        p.board,
      ))}
      {onWelcome && <WelcomeFoot />}
    </div>
  )
}
