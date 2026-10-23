import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLingui } from '@lingui/react'
import './chrome.css'
import { COPY } from '../copy'
import { initDB, getConversation, getSetting, setSetting, getMessages, getSbrdDocument, createBranch } from '../lib/db'
import { renameMode } from '../lib/modes'
import { loadSpace, saveArrangement } from '../lib/arrangements'
import { keepCommand, readCommands } from '../lib/commandHistory'
import { assignDefaultRoom } from '../lib/migration'
import { titleFromPrompt } from '../lib/chatTitles'
import { shipped, address, planOpen, planPopBack, planPopBar, planRoom, roomOnScreen, SPACE, columnShares, withShares, withUsualShares, recordsColumns } from '../shell/arrangement'
import { historyChars } from '../shell/estimate'
import { WELCOME_SETTING, freshWelcome, cleanWelcome, tick, nextStep, showSteps, stepsShown } from '../shell/welcome'
import { detectFeatures } from '../shell/features'
import { openPopout, closePopout, placePopout, onPopoutClosed } from '../shell/popout'
import { metadataModel, destination, keyStatus, noKeyNeeded, gateway, shipped as shippedEntries, DEFAULT_MODEL_PROVIDER as PROVIDER, pickerRows, answererOf, modelFacts, allModels, keyedProviders, setRegion, checkLocal, localAway, helperOf, translatorFor, translateText, browserTranslation } from '../net'
import { replyLanguageOf, withReplyLanguage, sourceAskLanguage, translateInto, nameOf, baseOf } from '../lib/languages'
import { piecesOfAnswer, translationOf, lastSourceAnswer, BY_BROWSER } from '../lib/translations'
import { findPrivate } from '../lib/privacyFilter'
import { searchWords } from '../lib/searchWords'
import { instructionLike } from '../lib/injection'
import AnswerPicker from './AnswerPicker'
import { ignite } from './ignition'
import { isStorageKept, askToKeepStorage } from '../lib/storageKeep'
import { useChat } from '../stores/ChatContext'
import { useConversations } from '../stores/ConversationContext'
import { useSettings } from '../stores/SettingsContext'
import { frameworkList, frameworksOf, instructionsOf, recordOf } from '../lib/frameworks'
import { readOwnFrameworks, keepOwnFramework, removeOwnFramework, restoreOwnFramework } from '../lib/frameworkStore'
import { useIsStreaming, useHiddenIds, usePendingDeletes, useStreamEnd } from '../stores/chatHooks'
import { sendableOf, hiddenIds, pendingDeletes, isStreaming as replyArriving } from '../stores/chatStore'
import { fromSource } from '../stores/sendHistory'
import { preview, viewFromSaved, lineOf } from './preview'
import Bar from './Bar'
import Strip from './Strip'
import Board from './Board'
import { boardName, roomLabel, andList } from './say'
import RoomBoard from './RoomBoard'
import WelcomeBoard, { WelcomeFoot } from './WelcomeBoard'
import AlmanacBoard from './AlmanacBoard'
import LibraryBoard from './LibraryBoard'
import { readCatalogue } from '../lib/catalogue'
import { listEntries } from '../catalog'
import { listLayoutEntries } from '../catalog/layouts'
import { readAlmanac } from '../lib/almanacRows'
import { backupReminderState, getBackupStatus, dismissBackupBanner } from '../lib/backup'
import { createFactsCache } from '../lib/chatFacts'
import { readSaved, keepSearch, forgetSearch, putSaved } from '../lib/savedSearches'
import { readCollections, writeCollection, newCollection, withRows } from '../lib/collections'
import { aboutText, WORDED } from '../lib/cardActs'
import { ROW_GUESS } from './rowWindow'
import { cardsOf, tabCounts, sequenceOf } from '../lib/collectionCards'
import { searchTerms } from '../lib/recordsFilter'
import CollectionBoard from './CollectionBoard'
import { changeRecords, eraseRecords, addOwnNote, removeOwnNote } from '../lib/records'
import { exportItems, gatherExport, itemsMarkdown, exportMarkdown, exportJsonl, exportType } from '../lib/recordsExport'
import { dayOf } from './when'
import { longDay } from './say'
import { EMPTY_VIEW, applyView, nextView, viewLine, isAtRest } from '../lib/recordsFilter'
import { onRecordsChanged } from '../lib/records'

// The new shell (refactor-plan.md §4 and stages 3 and 4): the board strip,
// the boards as the arrangement places them, the bar, and windows of their
// own. In development (and in builds made with VITE_PROTOTYPES=1) it lives
// at /shell, beside today's screens, until each of them is replaced. Rooms
// are drawn (stage 4); the other boards are placeholders until their stages
// draw them.
//
// The space: what is on screen is one space, kept on this device (C125).
// alm:, sym: and tour: bring their boards into it beside what is there.
// Each column takes a share of the width, which the person can stretch at
// the edge between two columns or set with width: (C126).
//
// Prompts: Enter in prompt mode sends to the room in the space. With a
// key for the provider it goes there; without one it goes to Wikipedia,
// which needs no key (stage 4). The Enter line names which before Enter.
//
// Windows: a popped board, and the popped bar, are drawn into blank windows
// through portals (popout.js), each board's window with its own bar (C6).
// Closing a window brings its board back; leaving the page closes them all.
// A window cannot be reopened without a click, so on load what was popped
// comes back to the page.

// How many command lines undo: can take back, in this tab (C134).
const UNDO_MAX = 50
// The key several are held under before a room has its chat (C172 (c)).
const NEW_ROOM = 'new'

// The source a prompt goes to when there is no key (stage 4).
const SOURCE = 'wikipedia'
// How far an arrow key moves an edge: a part of the space's width.
const EDGE_STEP = 0.02
const EDGE_STEP_BIG = 0.1

// The two shares beside an edge after moving it by dx pixels on screen,
// from what was measured beside it: neither column goes below its least
// width, and the two keep the share they had together.
function split(m, dx) {
  const total = m.wl + m.wr
  if (total - m.leastR < m.leastL) return [m.sl, m.pair - m.sl]
  const wl = Math.min(Math.max(m.wl + (m.rtl ? -dx : dx), m.leastL), total - m.leastR)
  const sl = (m.pair * wl) / total
  return [sl, m.pair - sl]
}
const BAR = 'command' // the popped bar's key among the windows
const FEATURES = detectFeatures()
const NONE = Object.freeze([])

// The interface language a source answers in. The test languages (en-XA,
// ar-XB) stand for English.
const sourceLocale = (locale) => (/-(XA|XB)$/i.test(String(locale ?? '')) ? 'en' : locale)

// What the Enter line says when a prompt did not go through: a key of
// COPY.enter, or one with its values. Never the error's own text.
// Ollama, from the list, for the key panel and api:ollama (C163).
const LOCAL_ENTRY = { id: 'ollama', name: destination('ollama')?.name ?? 'Ollama' }

// Whether the browser has been told not to let this site reach apps on the
// device: its permission for the computer's own address, where the browser
// has one (LPN §7.5). Unknown is not blocked.
async function localBlocked() {
  for (const name of ['loopback-network', 'local-network', 'local-network-access']) {
    try {
      const p = await navigator.permissions.query({ name })
      if (p?.state === 'denied') return true
      if (p) return false
    } catch {
      // This browser does not know that permission; try the next name.
    }
  }
  return false
}

// source: the name of the source asked, when one was.
function failure(err, source = destination(SOURCE)?.name) {
  if (err?.name === 'AbortError') return null
  if (err?.name === 'Refused') return 'promptChanged'
  // A reply with no words and no error (C171): said, with why it stopped where known.
  if (err?.name === 'EmptyReply') return { message: 'replyEmpty', values: { reason: err.stopReason === 'max_tokens' ? 'limit' : 'none' } }
  // privacy:names could not find names on this computer: nothing was sent (C169).
  if (err?.name === 'NamesUnchecked') return 'namesUnchecked'
  if (err?.kept) return 'replyCut'
  if (err?.name === 'SourceError') {
    // A source that turns away the network (some do for shared VPN
    // addresses), or whose allowance for it is used up (LPN §8; C156).
    const message = err.reason === 'unreachable' ? 'sourceUnreachable' : err.status === 403 ? 'sourceNetwork' : err.status === 429 ? 'sourceBusy' : 'sourceRefused'
    return { message, values: { source } }
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

// Finds what a selector names once it is drawn (a chat being opened, rows
// being placed), brings it into view and marks it for a moment (C145 (c)).
// Looks for the first selector for about two seconds, then takes any of
// the others: a passage's marks can draw a moment after its message.
function flashWhenDrawn(selectors, tries = 60) {
  const list = [].concat(selectors).filter(Boolean)
  let n = 0
  const look = () => {
    const el = (n < 40 ? list.slice(0, 1) : list).map((q) => document.querySelector(q)).find(Boolean)
    if (!el) { if (++n < tries) setTimeout(look, 50); return }
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ block: 'center', behavior: still ? 'auto' : 'smooth' })
    el.classList.add('ch-flash')
    setTimeout(() => el.classList.remove('ch-flash'), 1600)
  }
  look()
}

// The nearest box that scrolls, for bringing a row of Records into view.
function scrollerOf(el) {
  for (let x = el?.parentElement; x; x = x.parentElement) {
    const { overflowY } = getComputedStyle(x)
    if ((overflowY === 'auto' || overflowY === 'scroll') && x.scrollHeight > x.clientHeight) return x
  }
  return document.scrollingElement
}
const NO_NUMS = Object.freeze([])
const NO_SOURCES = Object.freeze({ count: 0, names: [] })

export default function Shell() {
  const { i18n } = useLingui()
  // The chats as stored, read early: erase: (in act) reads them again.
  const { conversations, createConversation, loadConversations } = useConversations()
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

  // ── The edges between columns (C126) ─────────────────
  // Dragging an edge shares the width of the two columns beside it between
  // them; the other columns keep theirs. While it moves, the two columns are
  // drawn straight from the pointer; the space keeps the shares once it is
  // let go. A double click puts both back; the arrow keys move it.
  const stageRef = useRef(null)
  const stretch = useRef(null)
  const [stretching, setStretching] = useState(false)

  // The two columns beside edge i, their widths and least widths, and their shares.
  const measure = useCallback((i) => {
    const cols = [...(stageRef.current?.children ?? [])].filter((el) => el.classList.contains('ch-col'))
    const left = cols[i - 1]
    const right = cols[i]
    if (!left || !right) return null
    const shares = columnShares(current.current)
    const least = (el) => parseFloat(getComputedStyle(el).minWidth) || 0
    const rtl = getComputedStyle(stageRef.current).direction === 'rtl'
    return {
      i, left, right, rtl,
      wl: left.getBoundingClientRect().width, wr: right.getBoundingClientRect().width,
      leastL: least(left), leastR: least(right),
      pair: shares[i - 1] + shares[i], sl: shares[i - 1],
    }
  }, [])

  const onEdgeDown = useCallback((i, e) => {
    if (e.button !== 0) return
    const m = measure(i)
    if (!m) return
    e.preventDefault()
    e.currentTarget.setPointerCapture?.(e.pointerId)
    stretch.current = { ...m, x: e.clientX, moved: null }
    setStretching(i)
  }, [measure])

  const onEdgeMove = useCallback((e) => {
    const s = stretch.current
    if (!s) return
    const [sl, sr] = split(s, e.clientX - s.x)
    s.left.style.setProperty('--share', String(sl))
    s.right.style.setProperty('--share', String(sr))
    s.moved = [sl, sr]
  }, [])

  const onEdgeUp = useCallback(() => {
    const s = stretch.current
    stretch.current = null
    setStretching(false)
    if (s?.moved) commit(withShares(current.current, { [s.i - 1]: s.moved[0], [s.i]: s.moved[1] }))
  }, [commit])

  const onEdgeReset = useCallback((i) => commit(withUsualShares(current.current, [i - 1, i])), [commit])

  const onEdgeKey = useCallback((i, e) => {
    const toward = { ArrowRight: 1, ArrowLeft: -1 }[e.key]
    if (!toward) return
    const m = measure(i)
    if (!m) return
    e.preventDefault()
    const width = stageRef.current.clientWidth * (e.shiftKey ? EDGE_STEP_BIG : EDGE_STEP)
    // The arrow moves the edge that way on screen, as a drag would.
    const [sl, sr] = split(m, toward * width)
    commit(withShares(current.current, { [i - 1]: sl, [i]: sr }))
  }, [commit, measure])

  // The welcome page's progress, kept on this device only (C121).
  const [welcome, setWelcomeState] = useState(freshWelcome)
  const welcomeRef = useRef(welcome)
  const welcomeRead = useRef(false) // nothing changes the progress until the kept one is read
  const updateWelcome = useCallback((change) => {
    if (!welcomeRead.current) return
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
      welcomeRead.current = true
      setWelcomeState(welcomeRef.current)
      commit(backOnPage(kept))
      setLines(history)
      setStarted(true)
    }).catch(() => setStarted(true))
    return () => { live = false }
  }, [commit])

  // Steps the space shows as done: the bar at the foot, a board in its own
  // window, the Almanac, the Library, the key panel. Only once the kept
  // progress is read, so the space before it never writes over it.
  useEffect(() => {
    if (!started) return
    for (const id of stepsShown(arrangement)) updateWelcome((w) => tick(w, id))
  }, [arrangement, started, updateWelcome])
  const onMode = useCallback((mode) => { if (mode === 'command') updateWelcome((w) => tick(w, 'command')) }, [updateWelcome])

  // A step's command, clicked, is written into the field.
  const [write, setWrite] = useState(null)
  const writes = useRef(0)
  const writeField = useCallback((value) => setWrite({ value, n: ++writes.current }), [])
  // Turns the bar to a prompt, writing nothing (C145 (h)).
  const toPrompt = useCallback(() => setWrite({ value: '', mode: 'prompt', n: ++writes.current }), [])

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
    setInspected(null)
    setKeyPanel(null)
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

  // ── The Almanac's rows (stage 5, piece 3) ─────────────
  // Everything numbered, read once the database is open and again whenever
  // something is stored, here or in another tab, or a room is named. They
  // also answer open: and inspect: by number, from any board. What is
  // inside each chat (its words, who answered, what it cost) is read once
  // and kept until the chat changes (chatFacts.js).
  const [almanacRows, setAlmanacRows] = useState(null)
  const [recordsNames, setRecordsNames] = useState({ collections: [], rooms: [] })
  const [saved, setSaved] = useState([]) // the saved searches (C140)
  const factsCache = useRef(null)
  if (!factsCache.current) factsCache.current = createFactsCache()
  const priceOf = useCallback((id) => modelFacts(id)?.cost ?? null, [])
  useEffect(() => {
    if (!started || !db.current) return undefined
    let live = true
    let reading = null
    const read = (change) => {
      if (change) factsCache.current.forget(change)
      const now = Promise.all([
        readAlmanac(db.current, { facts: factsCache.current, priceOf }).catch(() => ({ rows: [], collections: [], rooms: [] })),
        readSaved(db.current).catch(() => []),
        readCollections(db.current).catch(() => []),
      ])
      reading = now
      now.then(([{ rows, collections, rooms }, kept, kept2]) => {
        if (!live || reading !== now) return
        setAlmanacRows(rows)
        setRecordsNames({ collections, rooms })
        setSaved(kept)
        setCollections(kept2)
      })
    }
    read()
    const off = onRecordsChanged(read)
    return () => { live = false; off() }
  }, [started, roomRev, priceOf])
  const numbered = useMemo(() => new Map((almanacRows ?? []).map((r) => [r.num, r])), [almanacRows])
  const [inspected, setInspected] = useState(null) // the number inspect: shows under the bar
  const [compared, setCompared] = useState(null) // the two numbers compare: shows under the bar

  // ── What Records shows (stage 6, piece 1; C132) ───────
  // The search, typed in the bar while it points at Records, and the
  // filters, applied on Enter. Kept for the tab (C132 (d)).
  const [recordsView, setRecordsView] = useState(EMPTY_VIEW)
  const viewNow = useRef(EMPTY_VIEW)
  useEffect(() => { viewNow.current = recordsView }, [recordsView])
  // Search follows the board the bar points at (C144 (h)): Records and the
  // Collection each keep their own, and the field shows the one it points at.
  const [collectionSearch, setCollectionSearch] = useState('')
  const onSearch = useCallback((board, text) => {
    if (board === 'almanac') setRecordsView((v) => (v.search === text ? v : { ...v, search: text }))
    if (board === 'collection') setCollectionSearch(text)
  }, [])
  const showView = useCallback((view) => {
    viewNow.current = view
    setRecordsView(view)
  }, [])
  const onRecordsClear = useCallback((k) => showView(nextView(viewNow.current, [{ clear: k }])), [showView])
  // A click on a saved search shows it at once (C140 (a)); one that no
  // longer reads is written into the bar, where the Enter line says why.
  const recordsRef = useRef(null)
  const onOpenSaved = useCallback((s) => {
    const r = viewFromSaved(s, recordsRef.current ?? {})
    if (r.view) showView(r.view)
    else writeField(`>open:"${s.name}"`)
  }, [showView, writeField])
  // The names filters read, as people read them (C132 (f), (g)).
  const recordsCtx = useMemo(() => {
    const roomNames = new Map(recordsNames.rooms.map((r) => [r.id, roomLabel(i18n, r.name)]))
    const collectionName = (c) => c.name || (c.builtIn && COPY.collections[c.builtIn] ? i18n._(COPY.collections[c.builtIn]) : i18n._(COPY.collections.untitled))
    return {
      rooms: recordsNames.rooms.map((r) => ({ id: r.id, label: roomNames.get(r.id) })),
      collections: recordsNames.collections.map((c) => ({ id: c.id, label: collectionName(c) })),
      locale: i18n.locale,
      ctx: {
        roomLabel: (row) => (row.roomId ? roomNames.get(row.roomId) ?? '' : ''),
        models: allModels(),
        sources: shippedEntries().filter((d) => d.kind === 'source').map((d) => ({ id: d.id, name: d.name })),
      },
    }
  }, [recordsNames, i18n])
  const shownRows = useMemo(() => (almanacRows ? applyView(almanacRows, recordsView, recordsCtx.ctx) : null), [almanacRows, recordsView, recordsCtx])
  const shownRowsNow = useRef(null)
  useEffect(() => { shownRowsNow.current = shownRows }, [shownRows])
  const records = useMemo(() => {
    const now = Date.now()
    return { ...recordsCtx, rows: almanacRows ?? [], view: recordsView, saved, now, nowIso: new Date(now).toISOString() }
  }, [recordsCtx, almanacRows, recordsView, saved])
  // The saved search on screen: the one whose search and filters are the view's (C140 (a)).
  const currentSaved = useMemo(() => {
    const line = lineOf(recordsView)
    const search = recordsView.search.trim()
    return saved.find((x) => x.line === line && x.search === search)?.id ?? null
  }, [saved, recordsView])
  const recordsSearch = useMemo(() => ({ count: shownRows?.length ?? 0 }), [shownRows])
  useEffect(() => { recordsRef.current = records }, [records])
  const savedNow = useRef([])
  useEffect(() => { savedNow.current = saved }, [saved])

  // ── The Collection (stage 6, piece 6; C144) ───────────
  // Every collection, the one the space shows (else the one changed last),
  // the messages it holds, and its cards as the tab, the search and the order
  // have them. Tab, order and search are kept for the tab.
  const [collections, setCollections] = useState([])
  const [collectionView, setCollectionView] = useState({ tab: 'all', sort: 'yours', asc: false })
  const collectionLabel = useCallback((c) => c?.name || (c?.builtIn && COPY.collections[c.builtIn] ? i18n._(COPY.collections[c.builtIn]) : i18n._(COPY.collections.untitled)), [i18n])
  const shownCollection = useMemo(() => {
    const id = arrangement.context?.collection
    return collections.find((c) => c.id === id) ?? collections[0] ?? null
  }, [collections, arrangement.context])
  const [collectionMessages, setCollectionMessages] = useState(new Map())
  useEffect(() => {
    if (!db.current || !shownCollection) return undefined
    let live = true
    const ids = shownCollection.items.filter((i) => i.kind === 'message').map((i) => i.messageId)
    Promise.all(ids.map((id) => db.current.get('messages', id).catch(() => null)))
      .then((found) => { if (live) setCollectionMessages(new Map(found.filter(Boolean).map((m) => [m.id, m]))) })
    return () => { live = false }
  }, [shownCollection, almanacRows])
  const collectionAll = useMemo(() => cardsOf(shownCollection, almanacRows ?? [], collectionMessages), [shownCollection, almanacRows, collectionMessages])
  const collectionShown = useMemo(() => {
    const terms = searchTerms(collectionSearch)
    const tab = collectionView.tab
    const counts = tabCounts(collectionAll.cards)
    const inTab = tab === 'all' || !counts[tab] ? collectionAll.cards : collectionAll.cards.filter((c) => c.kind === tab)
    const cards = terms.length ? inTab.filter((c) => terms.every((t) => c.text.toLocaleLowerCase().includes(t))) : inTab
    const view = { ...collectionView, tab: tab !== 'all' && !counts[tab] ? 'all' : tab }
    const entries = shownCollection ? sequenceOf(cards, shownCollection, view.sort, { asc: view.asc, sources: collectionAll.sources }) : []
    // While a search narrows the cards, headings wait (collection board v3).
    return { cards, counts, view, entries: terms.length ? entries.filter((e) => !e.head) : entries }
  }, [collectionAll, collectionSearch, collectionView, shownCollection])
  // What the picker offers to hold: plans and chats, the ones it holds and the most recently active.
  const pickable = useMemo(() => {
    const held = new Set(collectionAll.sources.map((x) => `${x.kind === 'plan' ? 'docket' : 'chat'}:${x.num}`))
    const rows = (almanacRows ?? []).filter((r) => (r.kind === 'chat' || r.kind === 'docket') && !r.archived)
    return rows.filter((r, i) => i < 30 || held.has(`${r.kind}:${r.num}`))
  }, [almanacRows, collectionAll])
  const collectionScreens = useMemo(() => ({
    shown: shownCollection, all: collections, cards: collectionAll.cards, label: collectionLabel, view: collectionView,
  }), [shownCollection, collections, collectionAll, collectionLabel, collectionView])
  const onShowCollection = useCallback((c) => {
    const a = current.current
    commit({ ...a, context: { ...a.context, collection: c.id } })
  }, [commit])

  // ── Selecting cards, and finding (piece 7; C145) ──────
  // The selection lasts for the tab and is not stored. It belongs to the
  // collection shown and lets go when another is shown.
  const shownId = shownCollection?.id ?? null
  const [pickedIn, setPickedIn] = useState({ id: null, nums: NO_NUMS })
  const pickedHere = useMemo(() => (pickedIn.id === shownId ? pickedIn.nums.filter((n) => collectionAll.cards.some((c) => c.num === n)) : NO_NUMS), [pickedIn, shownId, collectionAll])
  const onPick = useCallback((num) => setPickedIn((was) => {
    const nums = was.id === shownId ? was.nums : []
    return { id: shownId, nums: nums.includes(num) ? nums.filter((n) => n !== num) : [...nums, num] }
  }), [shownId])
  const clearPicked = useCallback(() => setPickedIn({ id: null, nums: NO_NUMS }), [])
  const cardsNow = useRef([])
  useEffect(() => { cardsNow.current = collectionAll.cards }, [collectionAll])
  const numberedNow = useRef(new Map())
  useEffect(() => { numberedNow.current = numbered }, [numbered])
  const collectionsNow = useRef([])
  useEffect(() => { collectionsNow.current = collections }, [collections])

  /** Its card on the Collection, the board brought here if need be. */
  const findCard = useCallback((num) => {
    const a = current.current
    const here = a.columns.flat().includes('collection') || a.popped.some((x) => x.board === 'collection')
    const next = here ? address(a, 'collection') : planOpen(a, 'collection').next ?? a
    if (next !== a) commit(next)
    const card = cardsNow.current.find((c) => c.num === num)
    if (card) setCollectionView((v) => (v.tab === 'all' || v.tab === card.kind ? v : { ...v, tab: 'all' }))
    flashWhenDrawn(`.ch-collection [data-num="${num}"]`)
  }, [commit])

  // A click on a quoted passage in a chat finds its card; one the collection
  // shown does not hold is offered to it, as add: (C145 (b), (c)).
  useEffect(() => {
    const onFindCard = (e) => {
      const num = e.detail?.num
      if (!Number.isInteger(num)) return
      findCard(num)
      if (!cardsNow.current.some((c) => c.num === num)) writeField(`>add:${num}`)
    }
    window.addEventListener('parliament-find-card', onFindCard)
    return () => window.removeEventListener('parliament-find-card', onFindCard)
  }, [findCard, writeField])

  // Marginalia inside a room write their command into the bar, which waits
  // for Enter (every marginalia has a command; the slider's open:203b, C173).
  // Only a command line is written: text from a room never runs one.
  useEffect(() => {
    const onWrite = (e) => {
      const value = e.detail?.value
      if (typeof value !== 'string' || !value.startsWith('>') || value.length > 200) return
      writeField(value)
    }
    window.addEventListener('parliament-write', onWrite)
    return () => window.removeEventListener('parliament-write', onWrite)
  }, [writeField])

  // copy: and export: (C143 (f), C138): built from what is stored, in the
  // reader's language around the person's words. Hidden messages and
  // messages being deleted, known while their chat is open here, stay out.
  const hiddenOf = useCallback((chatId) => new Set([...hiddenIds(chatId), ...pendingDeletes(chatId).map((d) => d.messageId)]), [])
  const exportWords = useCallback(() => {
    const modelName = (id) => modelFacts(id)?.name ?? id ?? ''
    const today = new Date()
    const day = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    return {
      you: i18n._(COPY.copy.you),
      untitled: i18n._(COPY.almanac.untitled),
      // A source's answer is named for its source; a model's for its model.
      by: (m) => (m.source?.id ? m.source.name || destination(m.source.id)?.name || m.source.id : modelName(m.model)),
      heading: { note: i18n._(COPY.copy.notes), term: i18n._(COPY.copy.keywords), quote: i18n._(COPY.copy.quotes), document: i18n._(COPY.copy.document) },
      kind: (k) => i18n._(COPY.kinds[k]),
      from: (n) => i18n._(COPY.copy.from, { num: n }),
      fromErased: (n) => i18n._(COPY.copy.fromErased, { num: n }),
      revision: (r) => i18n._(COPY.copy.revision, { revision: r }),
      attached: (names) => i18n._(COPY.copy.attached, { names: andList(i18n, names) }),
      facts: (row) => (row.kind === 'docket'
        ? [`${i18n._(COPY.kinds.docket)} ${row.num}`, i18n._(COPY.counts.branches, { count: row.branches ?? 0 })]
        : [String(row.num), row.room ? roomLabel(i18n, row.room) : null, dayOf(i18n, row.createdAt)].filter(Boolean)),
      exported: i18n._(COPY.copy.exportedOn, { day: longDay(i18n, day) }),
      room: (row) => (row.room ? roomLabel(i18n, row.room) : ''),
    }
  }, [i18n])
  // A chat's messages, in order; a reply that did not record its model is
  // from its chat's last one (C132 (g)).
  const messagesOf = useCallback(async (chatId) => {
    const [all, conv] = await Promise.all([getMessages(chatId), getConversation(chatId).catch(() => null)])
    return all.map((m) => (m.role === 'assistant' && !m.model && !m.source ? { ...m, model: conv?.model ?? null } : m))
  }, [])
  const documentOf = useCallback((chatId) => getSbrdDocument(chatId).catch(() => null), [])
  const gather = useCallback(async (nums) => {
    const rows = recordsRef.current?.rows ?? []
    const picked = nums.map((n) => rows.find((r) => r.num === n)).filter(Boolean)
    return gatherExport(exportItems(picked, rows), rows, { messagesOf, documentOf, hiddenOf })
  }, [messagesOf, documentOf, hiddenOf])

  /** copy:207. One thing as Markdown. */
  const markdownOf = useCallback(async (num) => {
    const { data, hidden } = await gather([num])
    if (!data.length) return null
    return { text: itemsMarkdown(data, exportWords()), hidden }
  }, [gather, exportWords])

  /** export:md 204, 216. A file to read elsewhere, downloaded from this page (C138). */
  const exportFile = useCallback(async ({ format, picked, file }) => {
    const { data, hidden } = await gather(picked)
    if (!data.length) return null
    const words = exportWords()
    const text = format === 'jsonl' ? exportJsonl(data, words) : exportMarkdown(data, words)
    const url = URL.createObjectURL(new Blob([text], { type: exportType(format) }))
    const link = Object.assign(document.createElement('a'), { href: url, download: file, rel: 'noopener' })
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
    return { hidden }
  }, [gather, exportWords])

  // ── The Library's catalogue (stage 5, piece 4) ────────
  // Read while the Library is in the space, here or in a window, and again
  // when a room is named.
  const libraryHere = arrangement.columns.some((c) => c.includes('library')) || arrangement.popped.some((p) => p.board === 'library')
  const [catalogue, setCatalogue] = useState(null)
  useEffect(() => {
    if (!started || !db.current || !libraryHere) return undefined
    let live = true
    readCatalogue(db.current, { blocks: listEntries(), layouts: listLayoutEntries() })
      .then((items) => { if (live) setCatalogue(items) })
      .catch(() => { if (live) setCatalogue([]) })
    return () => { live = false }
  }, [started, roomRev, libraryHere])
  const inspectedRow = inspected != null ? numbered.get(inspected) ?? null : null
  const comparedRows = useMemo(() => {
    const [a, b] = (compared ?? []).map((n) => numbered.get(n))
    return a && b ? { a, b } : null
  }, [compared, numbered])

  // ── Keeping what is made (C88, C94) ───────────────────
  // Whether the browser has agreed to keep Parliament's data. The welcome
  // page says so plainly when it has not and there is something to lose.
  const [storageKept, setStorageKept] = useState(null)
  const [askingKeep, setAskingKeep] = useState(false)
  useEffect(() => {
    if (!started) return undefined
    let live = true
    isStorageKept().then((kept) => { if (live) setStorageKept(kept) })
    return () => { live = false }
  }, [started])
  const askKeep = useCallback(async () => {
    setAskingKeep(true)
    const answer = await askToKeepStorage({ getSetting, setSetting, again: true }).catch(() => 'not-kept')
    setAskingKeep(false)
    setStorageKept(answer === 'kept')
  }, [])
  const keepNotice = storageKept === false && (almanacRows?.length ?? 0) > 0 ? { asking: askingKeep, onAsk: askKeep } : null

  // ── The backup reminder (stage 6, piece 8; C146 (a), C94) ──
  // One line at the top of Records while backupReminder.js says it is due:
  // read on start and on coming back to the page, since a backup may have
  // been made meanwhile.
  const [backupDue, setBackupDue] = useState(null) // { atRisk, days } while due
  const readBackupDue = useCallback(() => Promise.all([backupReminderState(), getBackupStatus()])
    .then(([due, status]) => setBackupDue(due.show ? { atRisk: due.atRisk, days: status.daysSinceLast } : null), () => {}), [])
  useEffect(() => {
    if (!started) return undefined
    readBackupDue()
    window.addEventListener('focus', readBackupDue)
    return () => window.removeEventListener('focus', readBackupDue)
  }, [started, readBackupDue])
  const backupLater = useCallback(() => { dismissBackupBanner().then(() => setBackupDue(null), () => {}) }, [])

  // ── The key panel (stage 5, piece 5) ──────────────────
  // api: opens it under the bar. What the shell knows of keys is whether
  // each provider has one and its last four characters, read through the
  // key module; never a key.
  const [keyPanel, setKeyPanel] = useState(null) // { focus: provider id or null } while api: shows it

  // Settings' updater, for acts that change a setting (thinking:, C165).
  const updateSettingNow = useRef(async () => {})
  // Keeps a translation on its message (translate:, C166).
  const keepTranslationNow = useRef(async () => {})

  // ── Models on this computer (stage 7, piece 4; C33, C163) ──
  // Ollama is looked for only when someone asks (the key panel's check).
  // Once a check has found it, it is looked for again on each start, since
  // the browser has then been told it may; a refusal since then is quiet.
  const LOCAL = 'ollama'
  const [local, setLocal] = useState({ status: 'unchecked', models: [] })
  const [localRev, setLocalRev] = useState(0) // changes when the models found change
  const runLocalCheck = useCallback(async ({ quiet = false } = {}) => {
    setLocal((l) => ({ ...l, status: 'checking' }))
    try {
      const found = await checkLocal(LOCAL)
      setLocal({ status: 'ok', models: found.map((m) => m.name), away: localAway(LOCAL) })
      setSetting('localChecked', true).catch(() => {})
    } catch {
      setLocal({ status: quiet ? 'unchecked' : await localBlocked() ? 'denied' : 'unreached', models: [] })
    }
    setLocalRev((n) => n + 1)
  }, [])
  useEffect(() => {
    if (!started) return
    getSetting('localChecked').then((was) => { if (was) runLocalCheck({ quiet: true }) }, () => {})
  }, [started, runLocalCheck])

  // ── Who answers (stage 7, piece 1; C149, C150) ────────
  // by:, or a click in the picker under the bar, chooses who answers in the
  // chat the room shows. In a room with no chat yet, the choice is held for
  // the chat its next prompt starts.
  const [picking, setPicking] = useState(false) // the picker under the bar
  const [pendingAnswerer, setPendingAnswerer] = useState(null)
  // Several chosen at once (stage 8; C172 (c)): held for the next prompt in
  // this room only, in this tab, not stored. { room: chat id or NEW_ROOM, ids }.
  const [heldMany, setHeldMany] = useState(null)
  const heldManyNow = useRef(null)
  useEffect(() => { heldManyNow.current = heldMany }, [heldMany])

  // ── Frameworks (stage 7, piece 5; C164) ───────────────
  // On a chat, in order; held for a new chat as who answers is. The
  // person's own are read from the collabs list.
  const [ownFrameworks, setOwnFrameworks] = useState([])
  const readOwn = useCallback(() => readOwnFrameworks(db.current).then(setOwnFrameworks, () => {}), [])
  useEffect(() => { if (started) readOwn() }, [started, readOwn])
  const [pendingFrameworks, setPendingFrameworks] = useState(null)
  const pendingFwNow = useRef(null)
  useEffect(() => { pendingFwNow.current = pendingFrameworks }, [pendingFrameworks])
  const [fwPicking, setFwPicking] = useState(false)
  const fwList = useMemo(() => frameworkList(ownFrameworks), [ownFrameworks])
  const fwListNow = useRef(fwList)
  useEffect(() => { fwListNow.current = fwList }, [fwList])
  const nameOfFramework = useCallback((fw) => (fw.builtIn ? i18n._(COPY.frameworks[fw.id]) : fw.name || i18n._(COPY.frameworkPicker.unnamed)), [i18n])
  const pendingNow = useRef(null)
  useEffect(() => { pendingNow.current = pendingAnswerer }, [pendingAnswerer])
  const [keyInfo, setKeyInfo] = useState(() => ({ keys: [], noKey: noKeyNeeded() }))
  const [keysRev, setKeysRev] = useState(0) // changes when a key is kept, so prompts look again
  const readKeys = useCallback(() => keyStatus().then((keys) => setKeyInfo({ keys, noKey: noKeyNeeded() }), () => {}), [])
  useEffect(() => { if (started) readKeys() }, [started, readKeys])
  const onKeySaved = useCallback((id, fresh) => {
    readKeys()
    setKeysRev((n) => n + 1)
    setKeyPanel({ focus: null })
    // The one gold moment, once per new key (C50).
    if (fresh) ignite(document)
  }, [readKeys])
  const [roomNameOf, setRoomNameOf] = useState(null) // { chatId, value }: what the room on screen is called
  const onRoomName = useCallback((chatId, value) => setRoomNameOf({ chatId, value }), [])
  const remember = useCallback((body) => {
    if (db.current && body) keepCommand(db.current, body).then((kept) => (kept ? readCommands(db.current).then(setLines) : null)).catch(() => {})
  }, [])
  // A new note goes into the collection it was written in, at the end of
  // your order. Returns the change, for undo:, or null.
  const holdNote = useCallback(async (collectionId, note, now) => {
    const c = collectionsNow.current.find((x) => x.id === collectionId)
    if (!c) return null
    const after = withRows(c, [{ kind: 'note', store: 'notes', id: note.id, num: note.num }], now).next
    try {
      await writeCollection(db.current, { id: c.id, before: c, after })
    } catch {
      return null // the note stands on its own in Records
    }
    setCollections(await readCollections(db.current).catch(() => []))
    return { id: c.id, before: c, after }
  }, [])

  /** Its passage in its chat, the chat brought into the room if need be (C145 (c)). */
  const findPassage = useCallback(async (num) => {
    const row = numberedNow.current.get(num)
    if (!row?.chatId) return { message: 'jumpNoChat', values: { num } }
    const a = current.current
    if (roomOnScreen(a) !== row.chatId) {
      const placed = planRoom(a, row.chatId)
      if (placed.next) { const refused = await run(placed.next, null); if (refused) return refused }
    }
    flashWhenDrawn([`[data-quote-num="${num}"]`, row.messageId ? `[id="msg-${row.messageId}"]` : null])
    return null
  }, [run])

  /** Its row on Records, scrolled to where the rows are drawn (C142). */
  const findRow = useCallback((num) => {
    const rows = shownRowsNow.current ?? []
    const at = rows.findIndex((r) => r.num === num)
    if (at < 0) return { message: 'findHidden', values: { num } }
    const a = current.current
    if (a.addressed !== 'almanac') commit(address(a, 'almanac'))
    const q = `.ch-almanac tr[data-num="${num}"]`
    // Rows differ in height, so the first scroll is a guess: each step
    // measures the rows drawn and comes closer, until the row is drawn.
    const seek = (left) => {
      if (document.querySelector(q)) { flashWhenDrawn(q); return }
      const body = document.querySelector('.ch-almanac tbody')
      const box = body && scrollerOf(body)
      if (!box || !left) return
      const drawn = [...body.querySelectorAll('tr[data-num]')]
      let y = body.getBoundingClientRect().top + at * ROW_GUESS
      if (drawn.length) {
        const first = drawn[0]
        const last = drawn[drawn.length - 1]
        const fi = Number(first.getAttribute('aria-rowindex')) - 2
        const li = Number(last.getAttribute('aria-rowindex')) - 2
        const per = (last.getBoundingClientRect().bottom - first.getBoundingClientRect().top) / Math.max(1, li - fi + 1)
        y = first.getBoundingClientRect().top + (at - fi) * per
      }
      const top = box === document.scrollingElement ? 0 : box.getBoundingClientRect().top
      box.scrollTop += y - top - box.clientHeight / 2
      // Rows are placed on scroll; say so now, as a page not on screen waits to.
      box.dispatchEvent(new Event('scroll'))
      setTimeout(() => seek(left - 1), 60)
    }
    seek(15)
    return null
  }, [commit])

  const act = useCallback(async (what, body, next = null) => {
    if (what.kind === 'rows') {
      // pin:, archive:, name: and the tag verbs (C143), all or nothing.
      let done
      try {
        done = await changeRecords(db.current, what.changes)
      } catch (err) {
        return err?.name === 'Changed' ? { message: 'rowsChanged', values: { nums: err.nums } } : 'rowsFailed'
      }
      touched.current?.records.push(...done)
      remember(body)
      return null
    }
    if (what.kind === 'erase') {
      // erase: (C137): for good, all or nothing. Not while a reply arrives.
      const busy = what.chats.filter((c) => replyArriving(c.id)).map((c) => c.num)
      if (busy.length) return { message: 'eraseBusy', values: { nums: busy } }
      try {
        await eraseRecords(db.current, { chats: what.chats, marks: what.marks, keepMarks: what.keepMarks })
      } catch (err) {
        return err?.name === 'Changed' ? { message: 'rowsChanged', values: { nums: err.nums } } : 'eraseFailed'
      }
      if (touched.current) touched.current.erased = true
      // A room that showed an erased chat is left empty; inspect: lets go of what is gone.
      const gone = new Set(what.chats.map((c) => c.id))
      const a = current.current
      if (gone.has(roomOnScreen(a))) commit({ ...a, context: { ...a.context, room: null } })
      setInspected((n) => (what.nums.includes(n) ? null : n))
      loadConversations().catch(() => {})
      remember(body)
      return { done: true, says: { message: 'erased', values: { nums: what.nums } } }
    }
    if (what.kind === 'export') {
      // export: (C138): to read elsewhere; nothing stored changes.
      const made = await exportFile(what).catch(() => null)
      if (!made) return 'exportFailed'
      remember(body)
      const also = made.hidden ? [{ message: 'exportHidden', values: { count: made.hidden } }] : []
      return { done: true, says: { message: 'exported', values: { file: what.file }, also } }
    }
    if (what.kind === 'copy') {
      // copy: (C143 (f)): one thing as Markdown, on the clipboard.
      const made = await markdownOf(what.num).catch(() => null)
      if (!made) return 'copyFailed'
      try {
        await navigator.clipboard.writeText(made.text)
      } catch {
        return 'copyFailed'
      }
      remember(body)
      const also = made.hidden ? [{ message: 'copyHidden', values: { count: made.hidden } }] : []
      return { done: true, says: { message: 'copied', values: { num: what.num }, also } }
    }
    if (what.kind === 'tourOn' || what.kind === 'tourOff') {
      // tour: may bring the welcome card back into the space first.
      if (next) { const refused = await run(next, null); if (refused) return refused }
      updateWelcome((w) => showSteps(w, what.kind === 'tourOn'))
      remember(body)
      return null
    }
    if (what.kind === 'inspect') {
      setCompared(null)
      setInspected(what.num)
      remember(body)
      return null
    }
    if (what.kind === 'compare') {
      // compare: (C145 (i)): under the bar, word by word; nothing is sent.
      setInspected(null)
      setCompared(what.nums)
      remember(body)
      return null
    }
    if (what.kind === 'find') {
      // jump: (C145 (c)): its card, its passage or its row.
      const out = what.to === 'card' ? (findCard(what.num), null) : what.to === 'chat' ? await findPassage(what.num) : findRow(what.num)
      if (out) return out
      remember(body)
      return null
    }
    if (what.kind === 'note') {
      // note: (C145 (e)): a note of its own, quoting what it names.
      const now = new Date().toISOString()
      let note
      try {
        note = await addOwnNote(db.current, { id: crypto.randomUUID(), text: what.text, quotes: what.quotes, now })
      } catch {
        return 'noteFailed'
      }
      touched.current?.created.push({ store: 'notes', id: note.id, num: note.num, text: note.text })
      const change = await holdNote(what.collection, note, now)
      if (change) touched.current?.collections.push(change)
      clearPicked()
      if (what.collection) flashWhenDrawn(`.ch-collection [data-num="${note.num}"]`)
      remember(body)
      return { done: true, says: { message: 'noteDone', values: { num: note.num } } }
    }
    if (what.kind === 'summarize') {
      // summarize: (C145 (g)): one call, then a dated note. The bar is free
      // meanwhile, and says when it is written.
      const rows = what.nums.map((n) => numberedNow.current.get(n)).filter(Boolean)
      const items = rows.map((r) => ({ label: i18n._(COPY.collections.card, { kind: r.kind, num: r.num }), text: r.text ?? '' }))
      const later = (async () => {
        let text
        try {
          text = await gateway.call(PROVIDER, 'summarize', [items], { label: 'summary' })
        } catch {
          return 'summarizeFailed'
        }
        const now = new Date().toISOString()
        let note
        try {
          note = await addOwnNote(db.current, { id: crypto.randomUUID(), text, summary: { from: what.nums, at: now, model: metadataModel(PROVIDER) }, now })
        } catch {
          return 'summarizeFailed'
        }
        const entry = { line: body, created: [{ store: 'notes', id: note.id, num: note.num, text: note.text }] }
        const change = await holdNote(what.collection, note, now)
        if (change) entry.collections = [change]
        undoStack.current = [...undoStack.current, entry].slice(-UNDO_MAX)
        setUndoTop(body)
        flashWhenDrawn(`.ch-collection [data-num="${note.num}"]`)
        return { message: 'summarizeDone', values: { num: note.num } }
      })()
      clearPicked()
      remember(body)
      return { done: true, says: 'summarizeWriting', later }
    }
    if (what.kind === 'collectionWrite' || what.kind === 'newCollection') {
      // new:collection, add:, rm:, clear:, heading:, move:, name:, forget: (C144).
      const change = what.kind === 'newCollection'
        ? { id: crypto.randomUUID(), before: null, after: null }
        : { id: what.id, before: what.before, after: what.after }
      if (what.kind === 'newCollection') change.after = newCollection({ id: change.id, now: new Date().toISOString() })
      try {
        await writeCollection(db.current, change)
      } catch (err) {
        return err?.name === 'Changed' ? 'collectionChanged' : 'savedFailed'
      }
      touched.current?.collections.push(change)
      setCollections(await readCollections(db.current).catch(() => []))
      // A new collection is shown, the Collection brought here if need be.
      if (what.kind === 'newCollection') {
        const a = current.current
        const here = a.columns.flat().includes('collection') || a.popped.some((p) => p.board === 'collection')
        const next = here ? address(a, 'collection') : planOpen(a, 'collection').next ?? a
        commit({ ...next, context: { ...next.context, collection: change.id } })
      }
      remember(body)
      return null
    }
    if (what.kind === 'collectionView') {
      setCollectionView(what.view)
      remember(body)
      return null
    }
    if (what.kind === 'saveSearch' || what.kind === 'forgetSearch') {
      // save: and forget: (C140). Kept on this device only.
      const was = what.kind === 'saveSearch'
        ? savedNow.current.find((x) => x.name.toLocaleLowerCase() === what.name.toLocaleLowerCase()) ?? null
        : savedNow.current.find((x) => x.id === what.id) ?? null
      try {
        const kept = what.kind === 'saveSearch' ? await keepSearch(db.current, what) : (await forgetSearch(db.current, what.id), null)
        touched.current?.saved.push({ before: was, after: kept })
      } catch {
        return 'savedFailed'
      }
      setSaved(await readSaved(db.current).catch(() => []))
      remember(body)
      return null
    }
    if (what.kind === 'records') {
      // Filters, sort: and clear: (C132), after any layout command they share the line with.
      if (next) { const refused = await run(next, null); if (refused) return refused }
      showView(what.view)
      remember(body)
      return null
    }
    if (what.kind === 'setting') {
      // reply:, helper: and translate:on / off (C166): settings of the person's.
      await updateSettingNow.current(what.key, what.value)
      if (touched.current) touched.current.setting = { key: what.key, before: what.before }
      remember(body)
      return null
    }
    if (what.kind === 'translate') {
      // translate: (C166 (f)): the last answer from a source, into the reply
      // language, by whom the Enter line named. The original stays as it came.
      const later = (async () => {
        const message = (await getMessages(what.chatId).catch(() => [])).find((m) => m.id === what.messageId)
        const parts = message ? piecesOfAnswer(message) : null
        if (!parts) return 'translateFailed'
        let out
        try {
          out = await translateText(parts.pieces, { who: what.who, from: what.from, to: what.to })
        } catch {
          return 'translateFailed'
        }
        const by = what.who.kind === 'browser' ? BY_BROWSER : what.who.helper.id
        try {
          await keepTranslationNow.current(what.chatId, what.messageId, translationOf(parts, out, { lang: what.to, by }))
        } catch {
          return 'translateFailed'
        }
        return { message: 'translated', values: { language: nameOf(what.to, i18n.locale) } }
      })()
      remember(body)
      return { done: true, says: 'translateWorking', later }
    }
    if (what.kind === 'check') {
      // check: (C169): a closer look by a model on this computer at the last
      // answer from a source, free; a warning, never a guarantee.
      const later = (async () => {
        const message = (await getMessages(what.chatId).catch(() => [])).find((m) => m.id === what.messageId)
        if (!message?.content) return 'checkFailed'
        let said
        try {
          said = await gateway.call('ollama', 'checkText', [message.content, { model: what.model }], { label: 'check text' })
        } catch {
          return 'checkFailed'
        }
        if (!said.instructions) return { message: 'checkClean', values: { name: what.name } }
        return said.quote ? { message: 'checkFound', values: { name: what.name, quote: said.quote } } : { message: 'checkFoundUnquoted', values: { name: what.name } }
      })()
      remember(body)
      return { done: true, says: 'checkWorking', later }
    }
    if (what.kind === 'thinking') {
      // thinking:on / thinking:off (C165): a setting of the person's.
      await updateSettingNow.current('thinking', what.on)
      if (touched.current) touched.current.setting = { key: 'thinking', before: what.before }
      remember(body)
      return null
    }
    if (what.kind === 'frameworkPicker') {
      setInspected(null)
      setCompared(null)
      setKeyPanel(null)
      setPicking(false)
      setFwPicking(true)
      remember(body)
      return null
    }
    if (what.kind === 'frameworks') {
      // framework: (C164): the chat's own, or held for the next chat.
      if (what.chatId) {
        let done
        try {
          done = await changeRecords(db.current, [{ store: 'conversations', id: what.chatId, set: { frameworks: what.ids }, expect: { frameworks: what.before } }])
        } catch (err) {
          return err?.name === 'Changed' ? { message: 'rowsChanged', values: { nums: err.nums } } : 'frameworkFailed'
        }
        touched.current?.records.push(...done)
        loadConversations().catch(() => {})
      } else {
        if (touched.current) touched.current.pendingFw = { before: pendingFwNow.current }
        setPendingFrameworks(what.ids)
      }
      remember(body)
      return null
    }
    if (what.kind === 'ownFramework' || what.kind === 'forgetFramework') {
      // new:framework and forget: for one of your own (C164).
      try {
        if (what.kind === 'ownFramework') {
          const kept = await keepOwnFramework(db.current, { name: what.name, instruction: what.instruction, before: what.before, newId: () => crypto.randomUUID(), now: new Date().toISOString() })
          touched.current?.own.push({ before: what.before, after: kept })
        } else {
          await removeOwnFramework(db.current, what.record.id)
          touched.current?.own.push({ before: what.record, after: null })
        }
      } catch {
        return 'frameworkFailed'
      }
      await readOwn()
      remember(body)
      return null
    }
    if (what.kind === 'picker') {
      setFwPicking(false)
      // Bare by: shows who can answer, under the bar.
      setInspected(null)
      setCompared(null)
      setKeyPanel(null)
      setPicking(true)
      remember(body)
      return null
    }
    if (what.kind === 'answerers') {
      // by: with several (C172 (c)): held for the next prompt here; the
      // picker stays open, so more can be ticked.
      if (touched.current) touched.current.many = { before: heldManyNow.current }
      setHeldMany({ room: what.room ?? NEW_ROOM, ids: what.ids })
      remember(body)
      return null
    }
    if (what.kind === 'answerer') {
      // One chosen again: a list held for several goes (C172 (c)).
      if (heldManyNow.current) {
        if (touched.current) touched.current.many = { before: heldManyNow.current }
        setHeldMany(null)
      }
      // by: (C150): the chat's own choice, or held for the next chat.
      if (what.chatId) {
        let done
        try {
          done = await changeRecords(db.current, [{ store: 'conversations', id: what.chatId, set: { answerer: what.id }, expect: { answerer: what.before } }])
        } catch (err) {
          return err?.name === 'Changed' ? { message: 'rowsChanged', values: { nums: err.nums } } : 'answererFailed'
        }
        touched.current?.records.push(...done)
        loadConversations().catch(() => {})
      } else {
        if (touched.current) touched.current.pending = { before: pendingNow.current }
        setPendingAnswerer(what.id)
      }
      setPicking(false)
      remember(body)
      return null
    }
    if (what.kind === 'keys') {
      setInspected(null)
      setPicking(false)
      setKeyPanel({ focus: what.focus ?? null })
      readKeys()
      // Step 8 crosses off on seeing the panel (C120).
      updateWelcome((w) => tick(w, 'key'))
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
  }, [readKeys, remember, run, showView, updateWelcome, markdownOf, exportFile, commit, loadConversations, findCard, findPassage, findRow, holdNote, clearPicked, i18n, readOwn])

  // ── undo: (C134, as built) ────────────────────────────
  // Each command line that changes something is kept with what it changed,
  // so undo: can take it back whole: rows, saved searches, the filters on
  // Records and the space. The last 50 lines, for this tab. If something it
  // changed has changed since, undo stops there rather than write over it.
  const undoStack = useRef([])
  const [undoTop, setUndoTop] = useState(null) // the line undo: would take back
  const touched = useRef(null) // what the command running now changed in rows and saved searches

  const undo = useCallback(async (body) => {
    const entry = undoStack.current.at(-1)
    if (!entry) return 'undoNothing'
    const stop = (says) => { undoStack.current = []; setUndoTop(null); return says }
    if (entry.records) {
      try {
        await changeRecords(db.current, entry.records.map((r) => ({ store: r.store, id: r.id, num: r.num, set: r.before, expect: r.after })))
      } catch (err) {
        return stop(err?.name === 'Changed' ? { message: 'undoChanged', values: { nums: err.nums } } : 'undoFailed')
      }
      // A chat's own fields (who answers it) are read from the chat list.
      if (entry.records.some((r) => r.store === 'conversations')) loadConversations().catch(() => {})
    }
    if (entry.saved) {
      try {
        for (const s of [...entry.saved].reverse()) {
          if (s.before) await putSaved(db.current, s.before)
          else if (s.after) await forgetSearch(db.current, s.after.id)
        }
      } catch {
        return stop('undoFailed')
      }
      setSaved(await readSaved(db.current).catch(() => []))
    }
    if (entry.collections) {
      try {
        for (const c of [...entry.collections].reverse()) await writeCollection(db.current, { id: c.id, before: c.after, after: c.before })
      } catch (err) {
        return stop(err?.name === 'Changed' ? 'collectionChanged' : 'undoFailed')
      }
      setCollections(await readCollections(db.current).catch(() => []))
    }
    if (entry.created) {
      // A note written by note: or summarize: (C145): taken out, unless changed since.
      try {
        for (const c of [...entry.created].reverse()) await removeOwnNote(db.current, c)
      } catch (err) {
        return stop(err?.name === 'Changed' ? { message: 'undoChanged', values: { nums: err.nums } } : 'undoFailed')
      }
    }
    if (entry.view) showView(entry.view)
    if (entry.pending) setPendingAnswerer(entry.pending.before)
    if (entry.many) setHeldMany(entry.many.before)
    if (entry.pendingFw) setPendingFrameworks(entry.pendingFw.before)
    if (entry.setting) await updateSettingNow.current(entry.setting.key, entry.setting.before)
    if (entry.own) {
      try {
        for (const o of [...entry.own].reverse()) {
          if (o.before) await restoreOwnFramework(db.current, o.before)
          else if (o.after) await removeOwnFramework(db.current, o.after.id)
        }
      } catch {
        return stop('undoFailed')
      }
      readOwn()
    }
    if (entry.arrangement) {
      const refused = await run(entry.arrangement, null)
      if (refused) return stop(refused)
    }
    undoStack.current = undoStack.current.slice(0, -1)
    setUndoTop(undoStack.current.at(-1)?.line ?? null)
    remember(body)
    return { done: true, says: { message: 'undone', values: { line: entry.line } } }
  }, [remember, run, showView, loadConversations, readOwn])

  const onRun = useCallback(async (next, body, go, what) => {
    if (what?.kind === 'undo') return undo(body)
    const before = { arrangement: current.current, view: viewNow.current }
    touched.current = { records: [], saved: [], collections: [], created: [], pending: null, pendingFw: null, own: [], setting: null, many: null }
    const out = what ? await act(what, body, next) : await run(next, body)
    const t = touched.current
    touched.current = null
    if (out && !out.done) return out
    // erase: is never taken back, and what came before may point at what
    // it removed, so undo: stops here (C134, C137).
    if (t.erased) {
      undoStack.current = []
      setUndoTop(null)
      return out
    }
    const entry = { line: body }
    if (current.current !== before.arrangement) entry.arrangement = before.arrangement
    if (viewNow.current !== before.view) entry.view = before.view
    if (t.records.length) entry.records = t.records
    if (t.saved.length) entry.saved = t.saved
    if (t.collections.length) entry.collections = t.collections
    if (t.created.length) entry.created = t.created
    if (t.pending) entry.pending = t.pending
    if (t.pendingFw) entry.pendingFw = t.pendingFw
    if (t.own.length) entry.own = t.own
    if (t.setting) entry.setting = t.setting
    if (t.many) entry.many = t.many
    if (body && (entry.arrangement || entry.view || entry.records || entry.saved || entry.collections || entry.created || entry.pending || entry.pendingFw || entry.own || entry.setting || entry.many)) {
      undoStack.current = [...undoStack.current, entry].slice(-UNDO_MAX)
      setUndoTop(body)
    }
    return out
  }, [act, run, undo])

  const onRoomReady = useCallback((chatId) => {
    readyRoom.current = chatId
    const w = waiting.current
    if (w && w.chatId === chatId) { waiting.current = null; w.go() }
  }, [])
  const onRoomLeave = useCallback((chatId) => { if (readyRoom.current === chatId) readyRoom.current = null }, [])

  // ── Prompts from the bar (stage 4) ────────────────────
  const { messages, activeConversationId, sendMessage, resendWhole, askSource, keepTranslation } = useChat()
  useEffect(() => { keepTranslationNow.current = keepTranslation }, [keepTranslation])
  const { settings, updateSetting } = useSettings()
  useEffect(() => { updateSettingNow.current = updateSetting })
  // Which providers have a key here, without decrypting one; null until
  // known (stage 7: a key per provider). keyed: whether the default
  // provider has one, as stage 4 had it.
  const [keyedBy, setKeyedBy] = useState(null)
  const keyed = keyedBy == null ? null : Boolean(keyedBy[PROVIDER])
  const [stalledIn, setStalledIn] = useState(null) // the chat whose last reply stalled (C114)
  const creating = useRef(false)
  const latest = useRef({})
  const replyNow = useRef(null) // what replies are in, for the send (C166)
  useEffect(() => { latest.current = { settings, locale: i18n.locale } })

  // The chats as they stand on disk, for "the last room".
  useEffect(() => { loadConversations().catch(() => {}) }, [loadConversations])

  // Which providers have a key: on load, and on coming back to the page,
  // since Settings may have changed it meanwhile.
  useEffect(() => {
    let live = true
    const check = () => keyedProviders().then((k) => { if (live) setKeyedBy(k) }, () => { if (live) setKeyedBy({}) })
    check()
    window.addEventListener('focus', check)
    return () => { live = false; window.removeEventListener('focus', check) }
  }, [keysRev])

  // Mistral's processing region, kept in Settings (C159). Set before who
  // answers is worked out, so its prices are the region's.
  const region = settings.mistralRegion ?? 'global'
  useMemo(() => setRegion('mistral', region), [region])

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
  // The space as drawn, read when the Enter line needs it (width:, C126).
  const measureSpace = useCallback(() => {
    const stage = stageRef.current
    if (!stage) return null
    const cols = [...stage.children].filter((el) => el.classList.contains('ch-col'))
    if (cols.length !== current.current.columns.length) return null
    return {
      columns: current.current.columns,
      widths: cols.map((el) => el.getBoundingClientRect().width),
      least: cols.map((el) => parseFloat(getComputedStyle(el).minWidth) || 0),
      stacked: getComputedStyle(stage).flexDirection === 'column',
    }
  }, [])
  const roomRecord = roomId ? conversations.find((c) => c.id === roomId) ?? null : null
  const keys = useMemo(() => keyedBy ?? {}, [keyedBy])
  // The chat's own choice, or the one held for the chat the next prompt starts.
  const chosenHere = roomId ? roomRecord?.answerer ?? null : pendingAnswerer
  const answerer = useMemo(() => answererOf({ chosen: chosenHere, keyed: keys, defaultModel: settings.defaultModel }), [chosenHere, keys, settings.defaultModel, region, localRev]) // eslint-disable-line react-hooks/exhaustive-deps -- region changes the prices, a check the models
  const answerRows = useMemo(() => pickerRows(keys), [keys, region, localRev]) // eslint-disable-line react-hooks/exhaustive-deps -- region changes the prices, a check the models
  // The model cost marks compare with, named once in the picker (settings spec §8).
  const referenceName = useMemo(() => allModels().find((m) => m.reference)?.name ?? null, [])
  // Several held for the next prompt in this room (C172 (c)).
  const heldIds = heldMany && roomId !== undefined && heldMany.room === (roomId ?? NEW_ROOM) ? heldMany.ids : null
  const heldWho = useMemo(() => (heldIds ? heldIds.map((id) => answererOf({ chosen: id, keyed: keys, defaultModel: settings.defaultModel })) : null), [heldIds, keys, settings.defaultModel, region, localRev]) // eslint-disable-line react-hooks/exhaustive-deps -- region changes the prices, a check the models
  const answering = useMemo(() => ({ room: roomId, num: roomRecord?.num ?? null, now: answerer, rows: answerRows, stored: chosenHere, held: heldWho }), [roomId, roomRecord, answerer, answerRows, chosenHere, heldWho])
  const fwStored = roomId ? roomRecord?.frameworks ?? null : pendingFrameworks
  const fwHere = useMemo(() => frameworksOf(fwStored ?? [], fwList).map((fw) => fw.id), [fwStored, fwList])
  const frameworkScreens = useMemo(() => ({ room: roomId, num: roomRecord?.num ?? null, now: fwHere, stored: fwStored, list: fwList, nameOf: nameOfFramework }), [roomId, roomRecord, fwHere, fwStored, fwList, nameOfFramework])
  const helper = useMemo(() => ({ keyed, provider: destination(PROVIDER)?.name, price: modelFacts(metadataModel(PROVIDER))?.cost ?? null }), [keyed])

  // ── Reply language, the helper and translating (stage 7, piece 6; C166) ──
  // What replies are in: the person's choice, else the interface's language
  // where the browser lists it. Sent to every model as one line of the
  // system prompt, and named on the Enter line.
  const browserLanguages = useMemo(() => (typeof navigator === 'undefined' ? [] : [...(navigator.languages ?? [])]), [])
  const reply = useMemo(() => replyLanguageOf({ setting: settings.replyLanguage ?? null, locale: i18n.locale, browser: browserLanguages }), [settings.replyLanguage, i18n.locale, browserLanguages])
  useEffect(() => { replyNow.current = reply }, [reply])
  const languageName = useCallback((tag) => nameOf(tag, i18n.locale), [i18n.locale])
  // The model that reads text from sources, and translates it.
  const helperNow = useMemo(() => helperOf({ chosen: settings.helper ?? null, keyed: keys }), [settings.helper, keys, localRev]) // eslint-disable-line react-hooks/exhaustive-deps -- a check changes the models
  const translateTo = translateInto(reply, i18n.locale)
  // The chat on screen's messages, and its last answer from a source.
  const shown = roomId && activeConversationId === roomId ? messages : NONE
  const lastAnswer = useMemo(() => {
    const l = lastSourceAnswer(shown)
    const parts = l ? piecesOfAnswer(l.message) : null
    if (!parts) return null
    const q = String(l.question ?? '').trim()
    return {
      messageId: l.message.id, source: l.message.source.name ?? l.message.source.id,
      question: q.length > 60 ? `${q.slice(0, 59)}…` : q,
      chars: parts.chars, from: parts.from, translated: l.message.translation?.lang ?? null,
      // Its words, for check:, and those that read like instructions to a model (C169).
      text: l.message.content, phrases: instructionLike(l.message.content),
    }
  }, [shown])
  // The model on this computer that finds names and checks text (S3; C169):
  // the helper when it is one, else the first a check listed.
  const localChecker = useMemo(() => {
    const rows = answerRows.local.filter((r) => !r.unchecked && !r.later)
    return rows.find((r) => r.id === settings.helper) ?? rows[0] ?? null
  }, [answerRows, settings.helper])
  // Questions to sources that read only English are translated first, when
  // turned on and the person's language is another (C85). The person is
  // taken to write in the reply language; the browser checks on Enter.
  const queryFrom = reply.tag ?? baseOf(i18n.locale)
  const queriesOn = settings.translateQueries === true && baseOf(queryFrom) !== 'en'
  // What the browser's own translation can do for the pairs in question,
  // asked of the browser (nothing is sent), and kept for the page.
  const [browserCan, setBrowserCan] = useState({})
  const askedPairs = useRef(new Set())
  useEffect(() => {
    const bt = browserTranslation()
    if (!bt.has) return
    const pairs = []
    if (lastAnswer?.from) pairs.push([lastAnswer.from, translateTo])
    if (queriesOn) pairs.push([queryFrom, 'en'])
    for (const [from, to] of pairs) {
      const k = `${from}>${to}`
      if (askedPairs.current.has(k)) continue
      askedPairs.current.add(k)
      bt.can(from, to).then((a) => setBrowserCan((was) => ({ ...was, [k]: a })), () => {})
    }
  }, [lastAnswer, translateTo, queriesOn, queryFrom])
  const translator = useMemo(() => translatorFor({ browser: lastAnswer?.from ? browserCan[`${lastAnswer.from}>${translateTo}`] ?? null : null, helper: helperNow }), [lastAnswer, translateTo, browserCan, helperNow])
  const languageScreens = useMemo(() => ({
    reply: { setting: settings.replyLanguage ?? null, now: reply, locale: i18n.locale, nameOf: languageName },
    helping: { now: helperNow, rows: answerRows, stored: settings.helper ?? null },
    translating: { room: roomId, num: roomRecord?.num ?? null, last: lastAnswer, to: translateTo, who: translator, queries: settings.translateQueries === true, nameOf: languageName },
    privacy: { mode: settings.privacyFilter ?? 'off', local: localChecker?.name ?? null },
    checking: { room: roomId, num: roomRecord?.num ?? null, last: lastAnswer && { messageId: lastAnswer.messageId, source: lastAnswer.source, text: lastAnswer.text }, local: localChecker && { id: localChecker.id, name: localChecker.name } },
  }), [settings.privacyFilter, localChecker, settings.replyLanguage, settings.helper, settings.translateQueries, reply, i18n.locale, languageName, helperNow, answerRows, roomId, roomRecord, lastAnswer, translateTo, translator])
  const screens = useMemo(() => ({ lastRoom, roomName: roomNameHere, stepsOff: welcome.off, measure: measureSpace, numbered, keys: keyInfo.keys, noKey: keyInfo.noKey, records, undo: undoTop, hiddenOf, collection: collectionScreens, helper, answering, local: LOCAL_ENTRY, frameworks: frameworkScreens, thinking: { on: settings.thinking === true }, ...languageScreens }), [lastRoom, roomNameHere, welcome.off, measureSpace, numbered, keyInfo, records, undoTop, hiddenOf, collectionScreens, helper, answering, frameworkScreens, settings.thinking, languageScreens])

  // Where a prompt would go, for the Enter line: worked out here, sending
  // nothing (C83).
  // What would go along: the chat's messages, less what is hidden or being
  // deleted, which are not sent.
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
  // A chat's first prompt is followed, when a model answers, by one request
  // for its title, summary and tags to that model's provider, unless turned
  // off in Settings (C62).
  // A model answers, hosted or on this computer (not a source).
  const byModel = answerer.group !== 'source' && !answerer.needsKey && !answerer.gone && !answerer.later && !answerer.unchecked
  const describeModel = useMemo(() => modelFacts(metadataModel(answerer.provider ?? PROVIDER)), [answerer.provider, region]) // eslint-disable-line react-hooks/exhaustive-deps -- region changes the prices
  // With no room in the space, or an empty one, the prompt starts a chat.
  const firstPrompt = roomId == null || (Boolean(roomId) && activeConversationId === roomId && messages.length === 0)
  const describes = Boolean(byModel && firstPrompt && settings.describeNewChats !== false)
  const describe = useMemo(() => (describes ? { price: describeModel?.cost ?? null } : null), [describes, describeModel])
  // With cards selected on the Collection, a prompt starts a new chat about
  // them: their words first, quoted, then what is typed (C145 (h)).
  const about = useMemo(() => {
    if (arrangement.addressed !== 'collection' || !pickedHere.length) return null
    const rows = pickedHere.map((n) => numbered.get(n)).filter((r) => r && WORDED.has(r.kind))
    if (!rows.length) return null
    const text = aboutText(rows, (r) => i18n._(COPY.chat.aboutCard, { kind: r.kind, num: r.num }))
    return { nums: rows.map((r) => r.num), quotes: rows.filter((r) => r.kind === 'quote').map((r) => r.num), chars: text.length, text }
  }, [arrangement.addressed, pickedHere, numbered, i18n])
  // The fixed formats in what goes along with a prompt, found once for the
  // Enter line: the privacy filter swaps them, or could (C167).
  const alongPrivate = useMemo(() => {
    const seen = new Set()
    for (const t of [...along.map((m) => (typeof m.content === 'string' ? m.content : '')), instructionsOf(fwHere, fwList)]) for (const f of findPrivate(t)) seen.add(`${f.kind}:${f.value}`)
    return [...seen]
  }, [along, fwHere, fwList])
  const describeFresh = useMemo(() => (byModel && settings.describeNewChats !== false ? { price: describeModel?.cost ?? null } : null), [byModel, settings.describeNewChats, describeModel])
  // A source with an edition in each language is asked in the reply
  // language's, when the person chose one (C166 (e)).
  const edition = answerer.group === 'source' && destination(answerer.id)?.answersIn === 'yours' && reply.how === 'set' && baseOf(reply.tag) !== baseOf(i18n.locale) ? languageName(reply.tag) : null
  const reads = answerer.group === 'source' ? destination(answerer.id)?.answersIn : null
  const query = useMemo(() => (queriesOn && (reads === 'english' || reads === 'mostlyEnglish')
    ? { from: queryFrom, to: 'en', who: translatorFor({ browser: browserCan[`${queryFrom}>en`] ?? null, helper: helperNow }) }
    : null), [queriesOn, reads, queryFrom, browserCan, helperNow])
  // With no room in the space, a prompt starts a chat in a room beside
  // what is here, so it is offered as going to a new room (C125).
  const prompt = useMemo(() => ({
    room: roomId ?? null,
    chat: roomRecord?.num ?? null,
    streaming,
    keyed,
    keyedBy,
    region: answerer.provider === 'mistral' ? region : null,
    provider: destination(PROVIDER)?.name,
    source: destination(SOURCE)?.name,
    model: answerer.name,
    answerer,
    historyChars: about ? 0 : historyChars(along),
    systemChars: byModel ? withReplyLanguage(instructionsOf(fwHere, fwList), reply.tag).length : 0,
    // The language replies come in, when one is asked for (C166).
    replyIn: byModel && reply.tag ? languageName(reply.tag) : null,
    edition,
    query,
    translateLater: (reads === 'english' || reads === 'mostlyEnglish') && baseOf(translateTo) !== 'en' ? languageName(translateTo) : null,
    // The language a source's search is read in, for what it searches for (C168).
    searchLang: answerer.group === 'source' ? (reads === 'yours' ? sourceAskLanguage(reply, sourceLocale(i18n.locale)) : 'en') : null,
    nameOf: languageName,
    // Several at once, each a branch of the plan (C172).
    many: heldWho && heldWho.length > 1 ? heldWho : null,
    // The privacy filter, for a model off this computer (C167).
    privacy: answerer.group === 'model' ? { on: (settings.privacyFilter ?? 'off') !== 'off', names: settings.privacyFilter === 'names' ? localChecker?.name ?? null : null, along: about ? [] : alongPrivate } : null,
    // The frameworks on the chat, by name; the ones that go, when a model answers (C164).
    frameworkNames: frameworksOf(fwHere, fwList).map(nameOfFramework),
    thinking: settings.thinking === true,
    frameworks: byModel ? frameworksOf(fwHere, fwList).map(nameOfFramework) : [],
    perMillion: answerer.price?.inputPerMillion ?? null,
    hiddenOut: about ? 0 : hiddenOut,
    sourcesOut: about ? NO_SOURCES : sourcesOut,
    describe: about ? describeFresh : describe,
    resend: !about && Boolean(roomId) && stalledIn === roomId,
    ink,
    roomName: roomNameHere,
    about,
  }), [roomId, roomRecord, roomNameHere, streaming, ink, keyed, keyedBy, region, byModel, answerer, along, hiddenOut, sourcesOut, describe, describeFresh, stalledIn, fwHere, fwList, nameOfFramework, settings.thinking, about, reply, languageName, edition, query, reads, translateTo, alongPrivate, settings.privacyFilter, localChecker, i18n.locale, heldWho])

  /**
   * Sends a prompt to the room in the space: to the provider with a key,
   * else to the source. With an empty room, or no room at all, it first
   * makes the chat (titled with the prompt's first words, sending nothing)
   * and shows it in a room beside what is here (welcome spec §5; C125).
   * Answers at once whether the prompt went, and `done` once it is answered.
   */
  const onPrompt = useCallback(async (text, shown) => {
    const aboutNow = shown?.about ?? null
    const chatId = aboutNow ? null : roomOnScreen(current.current) ?? null
    if (creating.current) return { refused: 'promptBusy' }
    // The line named a recipient; if that has changed since, say so first.
    const fresh = await keyedProviders().catch(() => ({}))
    if (JSON.stringify(fresh) !== JSON.stringify(shown?.keyedBy ?? null)) { setKeyedBy(fresh); return { refused: 'promptChanged' } }
    // Who answers, read again: the line named them, and no one else is sent
    // to (C150).
    const conv = chatId ? await getConversation(chatId).catch(() => null) : null
    const fwIds = frameworksOf((chatId ? conv?.frameworks : pendingFwNow.current) ?? [], fwListNow.current).map((fw) => fw.id)
    const system = () => withReplyLanguage(instructionsOf(fwIds, fwListNow.current), replyNow.current?.tag ?? null)
    const under = { frameworks: recordOf(fwIds, fwListNow.current) }
    const who = answererOf({ chosen: chatId ? conv?.answerer ?? null : pendingNow.current, keyed: fresh, defaultModel: latest.current.settings.defaultModel })
    if (shown?.answerer && who.id !== shown.answerer.id) return { refused: 'promptChanged' }
    if (who.later || who.gone || who.needsKey || who.unchecked) return { refused: 'promptChanged' }

    // A prompt to several at once (stage 8; C172): the chat here answers
    // with the first, each other is a new branch of its plan from the same
    // point, and all write at once. Every one must be able to answer.
    if (text && !aboutNow && shown?.many?.length > 1) {
      const held = heldManyNow.current
      const ids = held && held.room === (chatId ?? NEW_ROOM) ? held.ids : null
      if (!ids || ids.join('|') !== shown.many.map((w) => w.id).join('|')) return { refused: 'promptChanged' }
      const whos = ids.map((x) => answererOf({ chosen: x, keyed: fresh, defaultModel: latest.current.settings.defaultModel }))
      if (whos.some((w) => w.later || w.gone || w.needsKey || w.unchecked)) return { refused: 'promptChanged' }
      if (creating.current) return { refused: 'promptBusy' }
      creating.current = true
      let id = chatId
      const others = []
      try {
        if (!id) {
          const chat = await createConversation({ title: titleFromPrompt(text), model: latest.current.settings.defaultModel, answerer: whos[0].id, frameworks: fwIds })
          setPendingAnswerer(null)
          setPendingFrameworks(null)
          await assignDefaultRoom(chat.id)
          id = chat.id
          const placed = planRoom(current.current, id)
          if (placed.next) await run(placed.next, null)
        } else if ((conv?.answerer ?? null) !== whos[0].id) {
          await changeRecords(db.current, [{ store: 'conversations', id, set: { answerer: whos[0].id }, expect: { answerer: conv?.answerer ?? null } }])
        }
        const base = await getConversation(id)
        const before = await getMessages(id)
        const last = before.length ? before[before.length - 1] : null
        for (const w of whos.slice(1)) {
          const opts = { title: base?.title ?? titleFromPrompt(text), model: w.group === 'model' ? w.id : base?.model, answerer: w.id, frameworks: fwIds }
          const made = last ? await createBranch(id, last.id, opts) : await createConversation({ ...opts, parentId: id, room: base?.room ?? null })
          others.push(made.id)
        }
      } catch {
        return { refused: 'manyFailed' }
      } finally {
        creating.current = false
      }
      setHeldMany(null)
      setStalledIn((was) => (was === chatId ? null : was))
      updateWelcome((w) => tick(w, 'ask'))
      const group = { id: crypto.randomUUID(), chats: [id, ...others] }
      const sendOne = (to, w, i) => {
        const { locale } = latest.current
        if (w.group !== 'source') return sendMessage(to, text, w.id, system(), [], null, { ...under, group, describe: i === 0 })
        const lang = sourceAskLanguage(replyNow.current, sourceLocale(locale))
        const yours = destination(w.id)?.answersIn === 'yours'
        const words = searchWords(text, yours ? lang : 'en')
        const searchedFor = words === text.trim().replace(/[?？!.]+$/u, '').trim() ? null : { text: words.slice(0, 300), lang: baseOf(yours ? lang : 'en'), by: 'search', at: new Date().toISOString() }
        return askSource(to, text, { source: w.id, lang, fallbackLang: yours ? 'en' : null, asked: searchedFor, group })
      }
      const first = readyRoom.current === id
        ? sendOne(id, whos[0], 0)
        : new Promise((resolve, reject) => { waiting.current = { chatId: id, go: () => sendOne(id, whos[0], 0).then(resolve, reject), drop: () => resolve() } })
      const all = [first, ...whos.slice(1).map((w, i) => sendOne(others[i], w, i + 1))]
      const done = Promise.allSettled(all).then((results) => {
        loadConversations().catch(() => {})
        const bad = results.findIndex((r) => r.status === 'rejected' && r.reason?.name !== 'AbortError')
        return bad < 0 ? null : failure(results[bad].reason, whos[bad].group === 'source' ? whos[bad].name : undefined)
      })
      return { done }
    }

    // A question to a source that reads only English goes translated, as the
    // line said (C85), unless the browser finds it is English already. If
    // the translation fails, nothing is sent.
    let asked = null
    const q = text && who.group === 'source' ? shown?.query ?? null : null
    if (q && q.who.kind !== 'none') {
      const bt = browserTranslation()
      const found = await bt.detect(text)
      const from = found ?? q.from
      if (baseOf(from) !== 'en') {
        try {
          const by = q.who.kind === 'browser' && found && found !== q.from && !(await bt.can(from, 'en')) ? translatorFor({ helper: q.who.helper ?? null }) : q.who
          if (by.kind === 'none') return { refused: 'queryFailed' }
          const [out] = await translateText([text], { who: by, from, to: 'en', query: true })
          const sent = String(out ?? '').trim().slice(0, 300)
          if (!sent) return { refused: 'queryFailed' }
          asked = { text: sent, lang: 'en', by: by.kind === 'browser' ? BY_BROWSER : by.helper.id, at: new Date().toISOString() }
        } catch {
          return { refused: 'queryFailed' }
        }
      }
    }

    // Nothing typed, and the last reply here stalled: send it again without
    // streaming, as the Enter line offered (C114).
    if (!text) {
      if (!shown?.resend || !chatId || who.group === 'source' || (who.group === 'model' && !fresh[who.provider])) return { refused: 'promptFailed' }
      setStalledIn(null)
      const done = resendWhole(chatId, who.id, system(), under)
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
        const chat = await createConversation({ title: titleFromPrompt(text), model: latest.current.settings.defaultModel, answerer: who.chosen ? who.id : null, frameworks: fwIds })
        setPendingAnswerer(null)
        setPendingFrameworks(null)
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

    const full = aboutNow ? `${aboutNow.text}\n\n${text}` : text
    if (aboutNow) clearPicked()
    const send = () => {
      const { locale } = latest.current
      return who.group !== 'source'
        ? sendMessage(id, full, who.id, system(), [], null, under)
        : askSource(id, text, { source: who.id, lang: askIn(locale), fallbackLang: destination(who.id)?.answersIn === 'yours' ? 'en' : null, asked: searched(locale) })
    }
    // The edition a source with one in each language is asked in (C166 (e));
    // nothing found there, the English one (LPN §6).
    const askIn = (locale) => sourceAskLanguage(replyNow.current, sourceLocale(locale))
    // A source answers a search: a leading question phrase is left out, as
    // the Enter line said, and the search kept with the prompt (C168).
    const searched = (locale) => {
      const said = asked?.text ?? text
      const lang = asked ? 'en' : destination(who.id)?.answersIn === 'yours' ? askIn(locale) : 'en'
      const words = searchWords(said, lang)
      if (words === said.trim().replace(/[?？!.]+$/u, '').trim()) return asked
      return { text: words.slice(0, 300), lang: baseOf(lang), by: asked?.by ?? 'search', at: new Date().toISOString() }
    }
    // A new room sends once its messages are loaded, so nothing is lost
    // between the two.
    const sending = readyRoom.current === id
      ? send()
      : new Promise((resolve, reject) => { waiting.current = { chatId: id, go: () => send().then(resolve, reject), drop: () => resolve() } })
    const done = sending
      .then(() => { loadConversations().catch(() => {}); return null })
      .catch((err) => {
        if (err?.name === 'Refused') keyedProviders().then(setKeyedBy, () => {})
        // A stall: the Enter line now offers to send it again (C114).
        if (err?.name === 'Stalled') { setStalledIn(id); return null }
        return failure(err, who.group === 'source' ? who.name : undefined)
      })
    return { done }
  }, [askSource, createConversation, loadConversations, resendWhole, run, sendMessage, updateWelcome, clearPicked])

  const screensNow = useRef(null)
  useEffect(() => { screensNow.current = screens }, [screens])
  const pickAnswerer = useCallback(async (row) => {
    if (row.later) return
    if (row.needsKey || row.unchecked) { setPicking(false); writeField(`>api:${row.provider}`); return }
    // A box ticked joins the ones ticked before, in that order; unticked, it
    // leaves the gap closed (slider v9; C172 (c)). One left is one choice.
    const ans = screensNow.current?.answering
    const now = ans?.held?.length > 1 ? ans.held.map((h) => h.id) : [ans?.now?.id].filter(Boolean)
    const next = now.includes(row.id) ? now.filter((x) => x !== row.id) : [...now, row.id]
    if (!next.length) return
    const nameOf = (x) => [...(ans?.rows?.model ?? []), ...(ans?.rows?.local ?? []), ...(ans?.rows?.source ?? [])].find((r) => r.id === x)?.name ?? x
    const body = next.length === 1 ? `by:${next[0]}` : `by:${next.map((x) => `"${String(nameOf(x)).replace(/"/g, '')}"`).join(', ')}`
    const p = preview(`>${body}`, { mode: 'command', arrangement: current.current, screens: screensNow.current ?? {} })
    if (!p.act) { if (next.length === 1) setPicking(false); return }
    await onRun(p.next ?? null, body, null, p.act)
  }, [onRun, writeField])
  const toggleFramework = useCallback(async (id) => {
    const fw = frameworkScreens
    const ids = fw.now.includes(id) ? fw.now.filter((x) => x !== id) : [...fw.now, id]
    const word = (x) => {
      const it = fw.list.find((f) => f.id === x)
      return it?.builtIn ? it.id : `"${(it?.name ?? '').replace(/"/g, '')}"`
    }
    const line = ids.length ? `>framework:${ids.map(word).join(', ')}` : '>framework:off'
    const p = preview(line, { mode: 'command', arrangement: current.current, screens: screensNow.current ?? {} })
    if (!p.act) return
    await onRun(p.next ?? null, line.slice(1), null, p.act)
  }, [frameworkScreens, onRun])
  const frameworkItems = useMemo(() => fwList.map((fw) => ({
    id: fw.id,
    builtIn: fw.builtIn,
    name: nameOfFramework(fw),
    about: fw.builtIn ? i18n._(COPY.frameworksAbout[fw.id]) : fw.instruction.slice(0, 120),
    at: fwHere.includes(fw.id) ? fwHere.indexOf(fw.id) + 1 : null,
  })), [fwList, fwHere, nameOfFramework, i18n])
  const toggleFwPicker = useCallback(() => {
    setInspected(null)
    setCompared(null)
    setKeyPanel(null)
    setPicking(false)
    setFwPicking((was) => !was)
  }, [])

  const togglePicker = useCallback(() => {
    setFwPicking(false)
    setInspected(null)
    setCompared(null)
    setKeyPanel(null)
    setPicking((was) => !was)
  }, [])

  function pickBoard(board) {
    const a = current.current
    // Sym: on the strip brings a room as sym: does, when there is none here.
    if (board === 'room' && roomOnScreen(a) === undefined) {
      const { next } = preview('>room:', { mode: 'command', arrangement: a, screens })
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
  const shares = useMemo(() => columnShares(arrangement), [arrangement])
  const shareTotal = shares.reduce((sum, x) => sum + x, 0) || 1
  // What stands beside an edge, named in a sentence.
  const edgeName = (board) => (board === 'room' ? i18n._(COPY.shell.edgeRoom) : board === 'welcome' ? i18n._(COPY.shell.edgeWelcome) : boardName(i18n, board))
  const stripArrangement = useMemo(
    () => ({ ...arrangement, context: { ...arrangement.context, room: roomRecord?.num ?? undefined } }),
    [arrangement, roomRecord],
  )
  const welcomeHint = useMemo(() => (onWelcome && !welcome.finished ? { next: nextStep(welcome) } : null), [onWelcome, welcome])
  const searches = { almanac: recordsView.search, collection: collectionSearch }
  const searchCounts = { almanac: recordsSearch, collection: { count: collectionShown.cards.length, cards: true } }
  const shared = { arrangement, lines, screens, prompt, onRun, onPrompt, onTop: FEATURES.onTop, welcome: welcomeHint, onSearch, searches, searchCounts }
  const filtered = isAtRest(recordsView) ? null : { search: recordsView.search.trim(), line: viewLine(recordsView) }
  const drawBoard = (board) => {
    if (board === 'room' && roomId !== undefined) {
      return <RoomBoard key={`room:${roomId ?? 'new'}`} chatId={roomId} rev={roomRev} addressed={arrangement.addressed === 'room'} onAddress={focusBoard} onReady={onRoomReady} onLeave={onRoomLeave} onName={onRoomName} />
    }
    if (board === 'almanac') {
      return (
        <AlmanacBoard
          key="almanac" rows={shownRows} filtered={filtered} columns={arrangement.recordsCols ? recordsColumns(arrangement) : null}
          saved={saved} currentSaved={currentSaved} addressed={arrangement.addressed === 'almanac'}
          onAddress={focusBoard} onWrite={writeField} onClear={onRecordsClear} onOpenSaved={onOpenSaved}
          backup={backupDue} onBackupLater={backupLater}
        />
      )
    }
    if (board === 'library') {
      return <LibraryBoard key="library" items={catalogue} addressed={arrangement.addressed === 'library'} onAddress={focusBoard} onWrite={writeField} />
    }
    if (board === 'welcome') {
      return <WelcomeBoard key="welcome" welcome={welcome} addressed={arrangement.addressed === 'welcome'} onAddress={focusBoard} onWrite={writeField} barSlot={setCardSlot} keep={keepNotice} />
    }
    if (board === 'collection') {
      return (
        <CollectionBoard
          key="collection" collection={shownCollection} collections={collections} label={collectionLabel}
          entries={collectionShown.entries} counts={collectionShown.counts} view={collectionShown.view} sources={collectionAll.sources}
          pickable={pickable} searching={Boolean(collectionSearch.trim())} addressed={arrangement.addressed === 'collection'}
          onAddress={focusBoard} onWrite={writeField} onView={(change) => setCollectionView((v) => ({ ...v, ...change }))} onShow={onShowCollection}
          cards={collectionAll.cards} picked={pickedHere} onPick={onPick} onClearPicked={clearPicked}
          onFind={(num) => { findPassage(num) }} onPrompt={toPrompt} rowOf={(n) => numbered.get(n) ?? null}
        />
      )
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
    <div className={`ch-shell bar-${bar.at}${onWelcome ? ' on-welcome' : ''}${stretching !== false ? ' stretching' : ''}${arrangement.focus && arrangement.columns.length === 1 ? ' focused' : ''}`}>
      {!onWelcome && <Strip arrangement={stripArrangement} onPick={pickBoard} />}
      {/* One bar in one place, moved by its class or its holder, so moving
          it never loses the field's focus or what is typed. */}
      <div ref={dockSlot} className="ch-bar-host" />
      {!barWindow && createPortal(
        <Bar {...shared} board={arrangement.addressed} doc={document} className={`ch-dock ${bar.at} ${bar.side}`} write={write} onMode={onMode} inspect={inspectedRow} onInspectClose={() => setInspected(null)} compare={comparedRows} onCompareClose={() => setCompared(null)}
          keyPanel={keyPanel ? { ...keyPanel, ...keyInfo, holdOnly: settings.storageMode === 'memory', region, onRegion: (r) => updateSetting('mistralRegion', r),
            local: { ...LOCAL_ENTRY, origin: window.location.origin, status: local.status, models: local.models, away: local.away ?? [], onCheck: () => runLocalCheck() } } : null}
          onKeyFocus={(id) => setKeyPanel({ focus: id })} onKeySaved={onKeySaved} onKeysClose={() => setKeyPanel(null)}
          picker={picking ? { rows: answerRows, now: answerer, picked: heldIds && heldIds.length > 1 ? heldIds : null, reference: referenceName } : null} onPicker={togglePicker} onPickAnswerer={pickAnswerer} onPickerClose={() => setPicking(false)}
          frameworkPicker={fwPicking ? { items: frameworkItems } : null} onFrameworkPicker={toggleFwPicker} onToggleFramework={toggleFramework} onFrameworkPickerClose={() => setFwPicking(false)} />,
        barHost,
      )}
      {barWindow && <p className="ch-away ch-marg">{i18n._(COPY.shell.barAway)}</p>}
      <main className="ch-stage space" ref={stageRef}>
        {arrangement.columns.map((column, i) => (
          <Fragment key={column.join(' ')}>
            {i > 0 && (
              <div
                className={`ch-edge${stretching === i ? ' on' : ''}`}
                role="separator"
                aria-orientation="vertical"
                aria-label={i18n._(COPY.shell.edge, { first: edgeName(arrangement.columns[i - 1][0]), second: edgeName(column[0]) })}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round((shares[i - 1] / shareTotal) * 100)}
                title={i18n._(COPY.shell.edgeHelp)}
                tabIndex={0}
                onPointerDown={(e) => onEdgeDown(i, e)}
                onPointerMove={onEdgeMove}
                onPointerUp={onEdgeUp}
                onPointerCancel={onEdgeUp}
                onDoubleClick={() => onEdgeReset(i)}
                onKeyDown={(e) => onEdgeKey(i, e)}
              />
            )}
            <div className="ch-col" style={{ '--share': shares[i] }}>
              {column.map(drawBoard)}
            </div>
          </Fragment>
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
