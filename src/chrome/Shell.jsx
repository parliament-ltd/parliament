import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { useLingui } from '@lingui/react'
import './chrome.css'
import { COPY } from '../copy'
import { initDB, getConversation, getSetting, setSetting, getMessages, getSbrdDocument, createBranch, createSummaryBranch, getStorageEstimate, getPlan } from '../lib/db'
import { renameMode } from '../lib/modes'
import { loadSpace, saveArrangement } from '../lib/arrangements'
import { keepCommand, readCommands } from '../lib/commandHistory'
import { assignDefaultRoom } from '../lib/migration'
import { titleFromPrompt } from '../lib/chatTitles'
import { shipped, address, planOpen, planPopBack, planPopBar, planRoom, planShowInRoom, roomOnScreen, currentRoom, chatIn, isRoom, settle, SPACE, columnShares, withShares, withUsualShares, recordsColumns } from '../shell/arrangement'
import { historyChars } from '../shell/estimate'
import { WELCOME_SETTING, freshWelcome, cleanWelcome, tick, nextStep, showSteps, stepsShown } from '../shell/welcome'
import { detectFeatures } from '../shell/features'
import { openPopout, closePopout, placePopout, onPopoutClosed } from '../shell/popout'
import { keepKeys, metadataModel, destination, keyStatus, noKeyNeeded, gateway, shipped as shippedEntries, DEFAULT_MODEL_PROVIDER as PROVIDER, pickerRows, answererOf, modelFacts, allModels, keyedProviders, setRegion, checkLocal, localAway, helperOf, translatorFor, translateText, browserTranslation } from '../net'
import { replyLanguageOf, withReplyLanguage, sourceAskLanguage, translateInto, nameOf, baseOf } from '../lib/languages'
import { piecesOfAnswer, translationOf, lastSourceAnswer, BY_BROWSER } from '../lib/translations'
import { findPrivate } from '../lib/privacyFilter'
import { searchWords } from '../lib/searchWords'
import { replyTargets } from '../lib/branchGroups'
import { subscribe as subscribeBranches, shownIn, viewedIn, setViewed } from '../stores/branchView'
import { instructionLike } from '../lib/injection'
import AnswerPicker from './AnswerPicker'
import { ignite } from './ignition'
import { isStorageKept, askToKeepStorage } from '../lib/storageKeep'
import { useChat } from '../stores/ChatContext'
import { useConversations } from '../stores/ConversationContext'
import { useSettings } from '../stores/SettingsContext'
import { frameworkList, frameworksOf, instructionsOf, recordOf } from '../lib/frameworks'
import { readOwnFrameworks, keepOwnFramework, removeOwnFramework, restoreOwnFramework } from '../lib/frameworkStore'
import { useIsStreaming, useHiddenIds, usePendingDeletes, useStreamEnd, useMessages } from '../stores/chatHooks'
import { sendableOf, hiddenIds, pendingDeletes, isStreaming as replyArriving, stopStream, streamingIds } from '../stores/chatStore'
import { fromSource } from '../stores/sendHistory'
import { preview, viewFromSaved, lineOf, LOCAL_READS } from './preview'
import { answerFor, includedOf } from '../lib/included'
import { promptFacts, promptNow } from '../lib/branchVerbs'
import { checkSourceTexts } from '../lib/sourceCheck'
import Bar from './Bar'
import Strip from './Strip'
import Board from './Board'
import { boardName, roomLabel, andList } from './say'
import RoomBoard from './RoomBoard'
import PlanBoard from './PlanBoard'
import WelcomeBoard, { WelcomeFoot } from './WelcomeBoard'
import AlmanacBoard from './AlmanacBoard'
import LibraryBoard from './LibraryBoard'
import { readCatalogue } from '../lib/catalogue'
import { listEntries } from '../catalog'
import { listLayoutEntries } from '../catalog/layouts'
import { readAlmanac } from '../lib/almanacRows'
import { backupReminderState, getBackupStatus, dismissBackupBanner, getBackupLog } from '../lib/backup'
import SettingsBoard from './SettingsBoard'
import { parseBackupFile, BACKUP_VERSION } from '../lib/backup'
import { useLocation, useNavigate } from 'react-router-dom'
import { offeredLanguages, isDraft, startingLanguage } from '../i18n'
import { createFactsCache } from '../lib/chatFacts'
import { readSaved, keepSearch, forgetSearch, putSaved } from '../lib/savedSearches'
import { readCollections, writeCollection, newCollection, withRows } from '../lib/collections'
import { aboutText, WORDED } from '../lib/cardActs'
import { ROW_GUESS } from './rowWindow'
import { cardsOf, tabCounts, sequenceOf } from '../lib/collectionCards'
import { searchTerms } from '../lib/recordsFilter'
import CollectionBoard from './CollectionBoard'
import { changeRecords, eraseRecords, addOwnNote, removeOwnNote, newPlan, planStep, changeStep, holdBranch, newRun, newPlanBranch, moveBranch, putPlanBack, removeStep, removePlanBranch, removePlan, createPlanChat, markStep as markRunStep, settleLeft } from '../lib/records'
import { createRunner, runScope } from '../lib/runner'
import { tabBus, withDocketLock } from '../lib/bus'
import { showPlan, planKey, planPromptPreview } from '../lib/planVerbs'
import { planBoardOf, latestPlan, compareRuns } from '../lib/planBoard'
import { spendingOf } from '../lib/spending'
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
// What the plan commands do, carried out by planAct (stage 10, piece 2; C198).
const PLAN_ACTS = new Set(['newPlan', 'planStep', 'planRun', 'planBranch', 'planHold', 'planMove', 'planDelete', 'run', 'stop', 'stopReply'])

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
  if (err?.name === 'PrivateOnly') return 'privacySearchEmpty'
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
const NO_PLAN = Object.freeze({ none: true }) // the Plan board, showing no plan

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

  const commit = useCallback((raw) => {
    if (!raw || raw === current.current) return
    // The room the bar pointed at last, kept (C175 (a)).
    const next = settle(raw)
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
  const readyRooms = useRef(new Set()) // the chats whose rooms have loaded their messages (C175 (a): several)
  const isReady = (id) => readyRooms.current.has(id)
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
    // Settings: search narrows the card to the rows that match (C181).
    if (board === 'settings') setSettingsSearch(text)
  }, [])
  const [settingsSearch, setSettingsSearch] = useState('')
  const [settingsCount, setSettingsCount] = useState(0)
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

  // A prompt and its reply joined in a room (stage 11, piece 2; C214 (b)):
  // their words still standing come to the bar as a prompt, to edit and send
  // with Enter. Always written as a prompt, never read as a command, so words
  // from a reply can never run one.
  useEffect(() => {
    const onDraft = (e) => {
      const value = e.detail?.value
      if (typeof value !== 'string' || !value.trim()) return
      // Joined by typing, the cursor stays where the person is typing.
      setWrite({ value: value.slice(0, 200_000), mode: 'prompt', focus: e.detail?.focus !== false, n: ++writes.current })
    }
    window.addEventListener('parliament-prompt-draft', onDraft)
    return () => window.removeEventListener('parliament-prompt-draft', onDraft)
  }, [])

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
  // backup:, restore:, import: (stage 9, piece 2; C182): the panel under the
  // field, { mode, file }, and the notice it ends with, for the bar.
  const [backupPanel, setBackupPanel] = useState(null)
  const backupEnd = useRef(null)
  const endBackup = useCallback((says) => {
    setBackupPanel(null)
    const end = backupEnd.current
    backupEnd.current = null
    end?.(says ?? null)
    // A restore changed what is stored: the page reads it all again.
    if (says?.reload) setTimeout(() => window.location.reload(), 1600)
  }, [])

  // Settings' updater, for acts that change a setting (thinking:, C165).
  const updateSettingNow = useRef(async () => {})
  // The plan commands' acts (C198), defined with the Plan board below.
  const planActNow = useRef(async () => 'later')
  // Keeps a translation on its message (translate:, C166).
  const keepTranslationNow = useRef(async () => {})
  // Has the helper summarize a chat (open:203b summary, C175).
  const summarizeChatNow = useRef(async () => { throw new Error('Not ready') })
  // A veil for what goes to a hosted helper, with the privacy filter on (C179).
  const veilForNow = useRef(async () => null)
  // Asks a branch's last prompt again as a new branch (again:, C177).
  const askAgainNow = useRef(async () => 'againFailed')

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
  // Where the next prompts go among a prompt's branches, held by to: until
  // changed (stage 8, piece 3; C174): { groupId, chats }. For this tab only.
  const [heldTo, setHeldTo] = useState(null)
  const heldToNow = useRef(null)
  useEffect(() => { heldToNow.current = heldTo }, [heldTo])
  // Answers from sources include: holds for the next prompt here (stage 8,
  // piece 5; C176): { room, items }. For this tab only, not stored.
  const [heldInclude, setHeldInclude] = useState(null)
  const heldIncludeNow = useRef(null)
  useEffect(() => { heldIncludeNow.current = heldInclude }, [heldInclude])
  const [replyPicking, setReplyPicking] = useState(false)

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
  const [langPicking, setLangPicking] = useState(false) // language:'s picker (C184)
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
  const [roomNameOf, setRoomNameOf] = useState({}) // chat id -> what its room is called, for each room on screen (C175 (a))
  const onRoomName = useCallback((chatId, value) => setRoomNameOf((was) => (was[chatId] === value ? was : { ...was, [chatId]: value })), [])
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
    if (PLAN_ACTS.has(what.kind)) return planActNow.current(what, body)
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
          // To a hosted helper with the privacy filter on, swapped first (C179).
          const v = what.who.kind === 'model' ? await veilForNow.current(what.who.helper.provider, parts.pieces) : null
          out = await translateText(v ? parts.pieces.map(v.out) : parts.pieces, { who: what.who, from: what.from, to: what.to })
          if (v) out = out.map(v.back)
        } catch (err) {
          return err?.name === 'NamesUnchecked' ? 'namesUnchecked' : 'translateFailed'
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
    if (what.kind === 'branchSummary') {
      // open:203b summary (C175): the helper writes a summary of the branch,
      // then the plan's next letter starts from it, with who answers it and
      // its frameworks, and the room shows it. The bar is free meanwhile.
      const failed = { message: 'openSummaryFailed', values: { address: what.address } }
      const later = (async () => {
        let text
        try {
          text = await summarizeChatNow.current(what.chatId, what.helper)
        } catch (err) {
          return err?.name === 'NamesUnchecked' ? 'namesUnchecked' : failed
        }
        let made
        try {
          const base = await getConversation(what.chatId)
          made = await createSummaryBranch(what.chatId, { text, by: what.helper.id, title: base?.title, model: base?.model, answerer: base?.answerer ?? null, frameworks: base?.frameworks ?? null })
        } catch {
          return failed
        }
        await loadConversations().catch(() => {})
        const placed = planRoom(current.current, made.id)
        if (placed.next) await run(placed.next, null)
        const address = what.plan != null && made.branch ? `${what.plan}${made.branch}` : String(made.num ?? '')
        return { message: 'openSummaryDone', values: { address: what.address, next: address } }
      })()
      remember(body)
      return { done: true, says: { message: 'openSummaryWriting', values: { address: what.address } }, later }
    }
    if (what.kind === 'check') {
      // check: (C169): a closer look by a model on this computer at the last
      // answer from a source, free; a warning, never a guarantee.
      const later = (async () => {
        const message = (await getMessages(what.chatId).catch(() => [])).find((m) => m.id === what.messageId)
        if (!message?.content) return 'checkFailed'
        let said
        try {
          said = await gateway.call(what.provider ?? 'ollama', 'checkText', [message.content, { model: what.model }], { label: 'check text' })
        } catch {
          return 'checkFailed'
        }
        if (!said.instructions) return { message: 'checkClean', values: { name: what.name } }
        return said.quote ? { message: 'checkFound', values: { name: what.name, quote: said.quote } } : { message: 'checkFoundUnquoted', values: { name: what.name } }
      })()
      remember(body)
      return { done: true, says: what.provider && what.provider !== 'ollama' ? { message: 'checkWorkingHosted', values: { name: what.name } } : 'checkWorking', later }
    }
    if (what.kind === 'thinking') {
      // thinking:on / thinking:off (C165): a setting of the person's.
      await updateSettingNow.current('thinking', what.on)
      if (touched.current) touched.current.setting = { key: 'thinking', before: what.before }
      remember(body)
      return null
    }
    if (what.kind === 'markup') {
      // markup:on / markup:off (stage 11, piece 1): replies marked up, or clean.
      await updateSettingNow.current('markup', what.on ? 'on' : 'off')
      if (touched.current) touched.current.setting = { key: 'markup', before: what.before ? 'on' : 'off' }
      remember(body)
      return null
    }
    if (what.kind === 'languagePicker') {
      // A bare language: or the globe (C184): the picker under the field.
      setInspected(null)
      setCompared(null)
      setKeyPanel(null)
      setPicking(false)
      setFwPicking(false)
      setLangPicking(true)
      remember(body)
      return null
    }
    if (what.kind === 'language') {
      // language: (C166 (b); C184): the page's language, and replies and
      // searches follow it; a reply language of their own ends. One undo:
      // puts both back.
      setLangPicking(false)
      await updateSettingNow.current('interfaceLanguage', what.tag)
      const back = [{ key: 'interfaceLanguage', before: what.before.interfaceLanguage }]
      if (what.before.replyLanguage != null) {
        await updateSettingNow.current('replyLanguage', null)
        back.push({ key: 'replyLanguage', before: what.before.replyLanguage })
      }
      if (touched.current) touched.current.setting = back
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
      setStepPick(null) // the room's own choice, not a step's (C202)
      setFwPicking(false)
      // Bare by: shows who can answer, under the bar.
      setInspected(null)
      setCompared(null)
      setKeyPanel(null)
      setPicking(true)
      remember(body)
      return null
    }
    if (what.kind === 'backupPanel' || what.kind === 'filePick') {
      // backup: opens the panel; restore: and import: a file picker first,
      // and the panel says what the file is before anything happens (A21).
      setKeyPanel(null)
      setPicking(false)
      setInspected(null)
      backupEnd.current?.(null)
      const later = new Promise((resolve) => { backupEnd.current = resolve })
      if (what.kind === 'backupPanel') {
        setBackupPanel({ mode: 'backup', file: null })
      } else {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.parliament,.apb,.json,application/json'
        input.onchange = async () => {
          const file = input.files?.[0]
          if (!file) { endBackup(null); return }
          try {
            setBackupPanel({ mode: what.then, file: { name: file.name, parsed: await parseBackupFile(file) } })
          } catch (err) {
            // Not a backup: import: says it is not a file Parliament reads yet.
            const other = what.then === 'import' && /not a valid Parliament backup/.test(String(err?.message))
            setBackupPanel({ mode: what.then, file: { name: file.name, ...(other ? { other: true } : { error: String(err?.message || '') }) } })
          }
        }
        input.click()
      }
      remember(body)
      return { done: true, says: what.kind === 'backupPanel' ? null : { message: 'filePicking' }, later }
    }
    if (what.kind === 'fork') {
      // new:branch (C178): a whole copy to the chat's end, or to the end of
      // a step, as the next letter of its plan; the room shows it.
      const msgs = await getMessages(what.chatId).catch(() => [])
      const prompts = msgs.map((m, i) => (m.role === 'user' ? i : -1)).filter((i) => i >= 0)
      if (!msgs.length && what.step !== 0) return { message: 'newBranchEmpty', values: { address: what.address } }
      if (what.step != null && what.step > prompts.length) return { message: 'newBranchSteps', values: { address: what.address, count: prompts.length } }
      const point = what.step == null || what.step === prompts.length ? msgs.length - 1 : prompts[what.step] - 1
      const conv = await getConversation(what.chatId).catch(() => null)
      const opts = { title: conv?.title, model: conv?.model, answerer: conv?.answerer ?? null, frameworks: conv?.frameworks ?? null }
      let made
      try {
        // Before the first prompt: an empty branch of the plan.
        made = point >= 0 ? await createBranch(what.chatId, msgs[point].id, opts) : await createConversation({ ...opts, parentId: what.chatId, room: conv?.room ?? null })
      } catch {
        return { message: 'newBranchFailed', values: { address: what.address } }
      }
      await loadConversations().catch(() => {})
      const placed = planRoom(current.current, made.id)
      if (placed.next) await run(placed.next, null)
      remember(body)
      const next = what.plan != null && made.branch ? `${what.plan}${made.branch}` : String(made.num ?? '')
      return { done: true, says: { message: 'newBranchDone', values: { next, address: what.address } } }
    }
    if (what.kind === 'again') {
      // again:203a (C177): the bar is free while the new branch writes.
      const later = askAgainNow.current(what)
      remember(body)
      return { done: true, says: { message: 'againAsking', values: { next: what.next } }, later }
    }
    if (what.kind === 'include') {
      // include: (C176): held for the next prompt here; nothing is stored
      // until that prompt goes, and then with it.
      setHeldInclude(what.items.length ? { room: what.room, items: what.items } : null)
      remember(body)
      return null
    }
    if (what.kind === 'replyTo') {
      // to: (C174): held until changed; nothing is stored.
      if (touched.current) touched.current.heldTo = { before: heldToNow.current }
      setHeldTo({ groupId: what.groupId, chats: what.chats })
      remember(body)
      return null
    }
    if (what.kind === 'answerers') {
      // by: with several (C172 (c)): held for the next prompt here; the
      // picker stays open, so more can be ticked.
      if (touched.current) touched.current.many = { before: heldManyNow.current }
      // The order as by: says (then: one after another; C202); the conditions
      // chosen in the picker stay while the order does.
      const was = heldManyNow.current
      const order = what.order ?? 'together'
      const same = was && was.room === (what.room ?? NEW_ROOM) && (was.order ?? 'together') === order
      setHeldMany({ room: what.room ?? NEW_ROOM, ids: what.ids, order, conds: same ? was.conds ?? {} : {} })
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
  }, [readKeys, remember, run, showView, updateWelcome, markdownOf, exportFile, commit, loadConversations, createConversation, findCard, findPassage, findRow, holdNote, clearPicked, i18n, readOwn])

  // ── undo: (C134, as built) ────────────────────────────
  // Each command line that changes something is kept with what it changed,
  // so undo: can take it back whole: rows, saved searches, the filters on
  // Records and the space. The last 50 lines, for this tab. If something it
  // changed has changed since, undo stops there rather than write over it.
  const undoStack = useRef([])
  const undoFence = useRef(null) // the last run started here: undo: stops there (almanac spec §5)
  const [fenceShown, setFenceShown] = useState(null) // the same, for the Enter line
  const [undoTop, setUndoTop] = useState(null) // the line undo: would take back
  const touched = useRef(null) // what the command running now changed in rows and saved searches

  const undo = useCallback(async (body) => {
    const entry = undoStack.current.at(-1)
    if (!entry) return undoFence.current ? { message: 'undoAtRun', values: undoFence.current } : 'undoNothing'
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
    if (entry.plans) {
      // A change to a plan (C198): each record as it was, unless changed since.
      try {
        for (const back of [...entry.plans].reverse()) await putPlanBack(db.current, back)
      } catch (err) {
        return stop(err?.name === 'Changed' ? { message: 'undoChanged', values: { nums: err.nums } } : 'undoFailed')
      }
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
    if (entry.heldTo) setHeldTo(entry.heldTo.before)
    if (entry.pendingFw) setPendingFrameworks(entry.pendingFw.before)
    if (entry.setting) for (const s of [].concat(entry.setting)) await updateSettingNow.current(s.key, s.before)
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
    touched.current = { records: [], saved: [], collections: [], created: [], pending: null, pendingFw: null, own: [], setting: null, many: null, heldTo: null, plans: [] }
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
    // A run writes turns that cannot be unwritten, so undo: stops at it,
    // and says so (almanac spec §5).
    if (t.ran) {
      undoStack.current = []
      setUndoTop(null)
      undoFence.current = t.ran
      setFenceShown(t.ran)
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
    if (t.heldTo) entry.heldTo = t.heldTo
    if (t.plans.length) entry.plans = t.plans
    if (body && (entry.arrangement || entry.view || entry.records || entry.saved || entry.collections || entry.created || entry.pending || entry.pendingFw || entry.own || entry.setting || entry.many || entry.heldTo || entry.plans)) {
      undoStack.current = [...undoStack.current, entry].slice(-UNDO_MAX)
      setUndoTop(body)
    }
    return out
  }, [act, run, undo])

  const onRoomReady = useCallback((chatId) => {
    readyRooms.current.add(chatId)
    const w = waiting.current
    if (w && w.chatId === chatId) { waiting.current = null; w.go() }
  }, [])
  const onRoomLeave = useCallback((chatId) => { readyRooms.current.delete(chatId) }, [])

  // ── Prompts from the bar (stage 4) ────────────────────
  const { sendMessage, resendWhole, askSource, keepTranslation, summarizeChat, regroupPrompt, veilFor, focusChat } = useChat()
  useEffect(() => { veilForNow.current = veilFor }, [veilFor])
  // A source answers a search (C168), with its edition (C166 (e)).
  const askSourceAs = useCallback((to, text, w, extra = {}) => {
    const { locale } = latest.current
    const lang = sourceAskLanguage(replyNow.current, sourceLocale(locale))
    const yours = destination(w.id)?.answersIn === 'yours'
    const words = searchWords(text, yours ? lang : 'en')
    const searchedFor = words === text.trim().replace(/[?？!.]+$/u, '').trim() ? null : { text: words.slice(0, 300), lang: baseOf(yours ? lang : 'en'), by: 'search', at: new Date().toISOString() }
    return askSource(to, text, { source: w.id, lang, fallbackLang: yours ? 'en' : null, asked: searchedFor, ...extra })
  }, [askSource])
  useEffect(() => { keepTranslationNow.current = keepTranslation }, [keepTranslation])
  useEffect(() => { summarizeChatNow.current = summarizeChat }, [summarizeChat])
  const { settings, updateSetting } = useSettings()
  // A setting changed by set:, a click on Settings, or undo:. How keys are
  // kept moves them there: "Don't save" holds them for this tab and removes
  // the saved copies (settings spec §8).
  const changeSetting = useCallback(async (key, value) => {
    await updateSetting(key, value)
    if (key === 'storageMode') await keepKeys(value !== 'memory').catch(() => {})
  }, [updateSetting])
  useEffect(() => { updateSettingNow.current = changeSetting })
  // Text size (set:text): the chrome's type and the rooms' together.
  useEffect(() => { document.documentElement.dataset.text = settings.fontSize ?? 'default' }, [settings.fontSize])
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
  const roomNameHere = roomId ? roomNameOf[roomId] ?? null : null
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
  // The slider of branches on screen, and the tab viewed (C173, C174).
  // The tabs in the room a prompt goes to (C175 (a)).
  const shownHere = useCallback(() => shownIn(roomId ?? null), [roomId])
  const branchShown = useSyncExternalStore(subscribeBranches, shownHere, shownHere)
  const viewedNow = useCallback(() => (branchShown ? viewedIn(branchShown.groupId) : null), [branchShown])
  const branchViewed = useSyncExternalStore(subscribeBranches, viewedNow, viewedNow)
  const targets = useMemo(() => replyTargets({ shown: branchShown, viewed: branchViewed, held: heldTo }), [branchShown, branchViewed, heldTo])
  const addressOf = useCallback((id) => branchShown?.members.find((m) => m.chatId === id)?.address ?? '', [branchShown])
  // Several held for the next prompt in this room (C172 (c)).
  const heldIds = heldMany && roomId !== undefined && heldMany.room === (roomId ?? NEW_ROOM) ? heldMany.ids : null
  const heldWho = useMemo(() => (heldIds ? heldIds.map((id) => answererOf({ chosen: id, keyed: keys, defaultModel: settings.defaultModel })) : null), [heldIds, keys, settings.defaultModel, region, localRev]) // eslint-disable-line react-hooks/exhaustive-deps -- region changes the prices, a check the models
  // All at once, or one after another (branch slider v9; C201). Each after
  // the first runs on its condition: as chosen, else if nothing is found
  // after a source, and if it fails after a model.
  const heldOrder = heldIds && heldIds.length > 1 && heldMany?.order === 'sequence' ? 'sequence' : 'together'
  const heldConds = useMemo(() => (heldWho ? heldWho.map((w, i) => (i === 0 ? null : heldMany?.conds?.[w.id] ?? (heldWho[i - 1].group === 'source' ? 'nothing' : 'failed'))) : null), [heldWho, heldMany])
  const heldCondsNow = useRef(null)
  useEffect(() => { heldCondsNow.current = heldConds }, [heldConds])
  // Who answers the step being chosen for: its own, else its chat's, else the default.
  const [stepPick, setStepPick] = useState(null) // { letter, stepId, index, address, model, chatId }
  const stepPickNow = useRef(null)
  useEffect(() => { stepPickNow.current = stepPick }, [stepPick])
  const stepBranchWho = useMemo(() => (stepPick ? answererOf({ chosen: (stepPick.chatId ? conversations.find((c) => c.id === stepPick.chatId)?.answerer : null) ?? null, keyed: keys, defaultModel: settings.defaultModel }) : null), [stepPick, conversations, keys, settings.defaultModel])
  const stepWho = useMemo(() => (stepPick ? answererOf({ chosen: stepPick.model ?? (stepPick.chatId ? conversations.find((c) => c.id === stepPick.chatId)?.answerer : null) ?? null, keyed: keys, defaultModel: settings.defaultModel }) : null), [stepPick, conversations, keys, settings.defaultModel])
  const onPickOrder = useCallback((order) => setHeldMany((h) => (h ? { ...h, order, conds: h.order === order ? h.conds : {} } : h)), [])
  const onPickCond = useCallback((id) => setHeldMany((h) => {
    const at = h?.ids.indexOf(id) ?? -1
    if (at < 1) return h
    const NEXT = { nothing: 'failed', failed: 'finished', finished: 'always', always: 'nothing' }
    return { ...h, conds: { ...(h.conds ?? {}), [id]: NEXT[heldCondsNow.current?.[at] ?? 'finished'] ?? 'nothing' } }
  }), [])
  const answering = useMemo(() => ({ room: roomId, num: roomRecord?.num ?? null, now: answerer, rows: answerRows, stored: chosenHere, held: heldWho, order: heldOrder }), [roomId, roomRecord, answerer, answerRows, chosenHere, heldWho, heldOrder])
  // Among the branches (C174): who answers the one or more the next prompt
  // carries on, when that is not the room's own line. A new prompt to
  // several (by: with several) comes first.
  const branchTarget = useMemo(() => {
    if (!targets || (heldWho && heldWho.length > 1)) return null
    const ids = targets.chats
    if (ids.length === 1 && ids[0] === roomId) return null
    const whos = ids.map((id) => answererOf({ chosen: conversations.find((c) => c.id === id)?.answerer ?? null, keyed: keys, defaultModel: settings.defaultModel }))
    return { ids, whos, addresses: ids.map(addressOf) }
  }, [targets, heldWho, roomId, conversations, keys, settings.defaultModel, addressOf, region, localRev]) // eslint-disable-line react-hooks/exhaustive-deps -- region changes the prices, a check the models
  const branching = useMemo(() => ({ shown: branchShown, held: heldTo }), [branchShown, heldTo])
  const fwStored = roomId ? roomRecord?.frameworks ?? null : pendingFrameworks
  const fwHere = useMemo(() => frameworksOf(fwStored ?? [], fwList).map((fw) => fw.id), [fwStored, fwList])
  const frameworkScreens = useMemo(() => ({ room: roomId, num: roomRecord?.num ?? null, now: fwHere, stored: fwStored, list: fwList, nameOf: nameOfFramework }), [roomId, roomRecord, fwHere, fwStored, fwList, nameOfFramework])
  const helper = useMemo(() => ({ keyed, provider: destination(PROVIDER)?.name, price: modelFacts(metadataModel(PROVIDER))?.cost ?? null }), [keyed])

  // ── Reply language, the helper and translating (stage 7, piece 6; C166) ──
  // What replies are in: the person's choice, else the interface's language
  // where the browser lists it. Sent to every model as one line of the
  // system prompt, and named on the Enter line.
  const browserLanguages = useMemo(() => (typeof navigator === 'undefined' ? [] : [...(navigator.languages ?? [])]), [])
  // A language chosen with language: is read, whatever the browser lists (C184).
  const pageChosen = Boolean(settings.interfaceLanguage) && offeredLanguages().includes(settings.interfaceLanguage)
  const reply = useMemo(() => replyLanguageOf({ setting: settings.replyLanguage ?? null, locale: i18n.locale, browser: browserLanguages, chosen: pageChosen }), [settings.replyLanguage, i18n.locale, browserLanguages, pageChosen])
  useEffect(() => { replyNow.current = reply }, [reply])
  const languageName = useCallback((tag) => nameOf(tag, i18n.locale), [i18n.locale])
  // The model that reads text from sources, and translates it.
  const helperNow = useMemo(() => helperOf({ chosen: settings.helper ?? null, keyed: keys }), [settings.helper, keys, localRev]) // eslint-disable-line react-hooks/exhaustive-deps -- a check changes the models
  const translateTo = translateInto(reply, i18n.locale)
  // The chat on screen's messages, and its last answer from a source.
  // The room a prompt goes to: its chat's messages, held by its room (C175 (a)).
  const roomMessages = useMessages(roomId ?? null)
  // The open chat is the room a prompt goes to; the rooms hold their own.
  useEffect(() => { focusChat(roomId ?? null) }, [roomId, focusChat])
  const shown = roomId ? roomMessages : NONE
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
    // language: (C184): what the picker offers, the choice, and what
    // following the browser gives.
    language: { offered: offeredLanguages().map((tag) => ({ tag, draft: isDraft(tag) })), chosen: settings.interfaceLanguage ?? null, locale: i18n.locale, reply: settings.replyLanguage ?? null, browserTag: startingLanguage() },
    helping: { now: helperNow, rows: answerRows, stored: settings.helper ?? null },
    translating: { room: roomId, num: roomRecord?.num ?? null, last: lastAnswer, to: translateTo, who: translator, queries: settings.translateQueries === true, nameOf: languageName, privacy: settings.privacyFilter ?? 'off' },
    privacy: { mode: settings.privacyFilter ?? 'off', local: localChecker?.name ?? null },
    checking: { room: roomId, num: roomRecord?.num ?? null, last: lastAnswer && { messageId: lastAnswer.messageId, source: lastAnswer.source, text: lastAnswer.text }, local: localChecker && { id: localChecker.id, name: localChecker.name },
      // With none on this computer, the helper when it is a hosted model (C179).
      hosted: helperNow && helperNow.group === 'model' && !helperNow.needsKey && !helperNow.later && !helperNow.gone ? { id: helperNow.id, name: helperNow.name, provider: helperNow.provider, price: helperNow.price ?? null } : null },
  }), [settings.privacyFilter, localChecker, settings.replyLanguage, settings.interfaceLanguage, settings.helper, settings.translateQueries, reply, i18n.locale, languageName, helperNow, answerRows, roomId, roomRecord, lastAnswer, translateTo, translator])
  // open:203b summary (C175): what the Enter line needs of a chat, read
  // from Records: its address and the next branch's, what it holds, the
  // sources that answered in it, and who answers the new branch, with how
  // much that model reads at once.
  const chatRowsById = useMemo(() => new Map((almanacRows ?? []).filter((r) => r.kind === 'chat').map((r) => [r.chatId, r])), [almanacRows])

  // A question to a source that reads only English goes translated first,
  // as the line said (C85), unless the browser finds it is English already.
  // Returns what was asked ({ text, lang, by, at }), or null when it goes
  // as written; throws when it cannot be translated, and nothing is sent.
  const translateQuery = useCallback(async (text, q) => {
    if (!q || q.who.kind === 'none') return null
    const bt = browserTranslation()
    const found = await bt.detect(text)
    const from = found ?? q.from
    if (baseOf(from) === 'en') return null
    const by = q.who.kind === 'browser' && found && found !== q.from && !(await bt.can(from, 'en')) ? translatorFor({ helper: q.who.helper ?? null }) : q.who
    if (by.kind === 'none') throw new Error('queryFailed')
    const v = by.kind === 'model' ? await veilForNow.current(by.helper.provider, [text]) : null
    const [raw] = await translateText([v ? v.out(text) : text], { who: by, from, to: 'en', query: true })
    const out = v ? v.back(raw) : raw
    const sent = String(out ?? '').trim().slice(0, 300)
    if (!sent) throw new Error('queryFailed')
    return { text: sent, lang: 'en', by: by.kind === 'browser' ? BY_BROWSER : by.helper.id, at: new Date().toISOString() }
  }, [])
  // For a source: whether a question to it goes translated, and by whom
  // (C85), as a typed one would; null when it goes as written.
  const queryOf = useCallback((id) => {
    const reads = destination(id)?.answersIn
    return queriesOn && (reads === 'english' || reads === 'mostlyEnglish')
      ? { from: queryFrom, to: 'en', who: translatorFor({ browser: browserCan[`${queryFrom}>en`] ?? null, helper: helperNow }) }
      : null
  }, [queriesOn, queryFrom, browserCan, helperNow])
  const queryOfNow = useRef(queryOf)
  useEffect(() => { queryOfNow.current = queryOf }, [queryOf])

  // ── The runner (stage 10, piece 3; almanac spec §5; C196; C200) ─
  // Runs a plan's steps from this tab, one plan in one tab at a time (a Web
  // Lock per plan), each step sent as a prompt typed in its chat is, to who
  // answers it. stop: reaches the tab that runs it over the bus.
  const [runningHere, setRunningHere] = useState([])
  const runDeps = useRef({})
  useEffect(() => {
    runDeps.current = {
      readBranch: async ({ docketId, n, letter }) => {
        const plan = await getPlan({ id: docketId })
        const b = plan?.runs.find((r) => r.n === n)?.branches?.[letter]
        return b ? { chatId: b.chatId ?? null, steps: b.steps ?? [] } : null
      },
      // A branch with no chat gets one as it first runs, named for it.
      ensureChat: async ({ docketId, n, letter, step }) => {
        const plan = await getPlan({ id: docketId })
        const named = plan?.docket.branches?.find((b) => b.letter === letter)
        const room = plan?.runs.find((r) => r.n === n)?.branches?.[letter]?.room ?? null
        const now = new Date().toISOString()
        const { settings: s } = latest.current
        const conversation = {
          id: crypto.randomUUID(), title: named?.name || plan?.docket.title || titleFromPrompt(step.prompt), model: s.defaultModel,
          parentId: null, branchPoint: null, createdInMode: null, room, ...(step.model ? { answerer: step.model } : {}),
          pinned: false, storageBytes: 0, createdAt: now, updatedAt: now,
        }
        const chat = await createPlanChat(db.current, { docketId, n, letter, conversation })
        if (!room) await assignDefaultRoom(chat.id, s.newChatRoom ?? undefined).catch(() => {})
        loadConversations().catch(() => {})
        return chat.id
      },
      markStep: (args) => markRunStep(db.current, args),
      // One step, as a prompt in its chat: to who answers it, with its
      // frameworks and reply language, through the privacy filter. No title
      // request follows: the chat is named for its branch. How it ended is
      // read from what was kept.
      sendStep: async ({ chatId, step, group = null, included = null }) => {
        if (replyArriving(chatId)) return 'failed'
        const conv = await getConversation(chatId).catch(() => null)
        const fresh = await keyedProviders().catch(() => ({}))
        const who = answererOf({ chosen: step.model ?? conv?.answerer ?? null, keyed: fresh, defaultModel: latest.current.settings.defaultModel })
        if (who.later || who.gone || who.needsKey || who.unchecked) return 'failed'
        const fw = frameworksOf(conv?.frameworks ?? [], fwListNow.current).map((x) => x.id)
        const together = group ? { group } : {}
        if (who.group === 'source') {
          // Translated first for a source that reads only English, as typed (C85; C201).
          let asked = null
          try {
            asked = await translateQuery(step.prompt, queryOfNow.current(who.id))
          } catch {
            return 'failed'
          }
          const words = asked ? searchWords(asked.text, 'en') : null
          const searched = asked ? (words === asked.text.trim().replace(/[?？!.]+$/u, '').trim() ? asked : { ...asked, text: words.slice(0, 300) }) : null
          await askSourceAs(chatId, step.prompt, who, { step: step.id, ...together, ...(searched ? { asked: searched } : {}) })
        } else {
          // Answers held by include: go to each model that runs, as data (C176; C202).
          await sendMessage(chatId, step.prompt, who.id, withReplyLanguage(instructionsOf(fw, fwListNow.current), replyNow.current?.tag ?? null), [], null, { frameworks: recordOf(fw, fwListNow.current), describe: false, step: step.id, ...together, ...(included?.length ? { included } : {}) })
        }
        loadConversations().catch(() => {})
        const msgs = await getMessages(chatId).catch(() => [])
        const at = msgs.findIndex((m) => m.role === 'user' && m.step === step.id)
        const reply = at >= 0 ? msgs.slice(at + 1).find((m) => m.role === 'assistant') : null
        // A source that answered and found nothing: an answer, not a stop (C196 (e)).
        if (reply && !reply.incomplete && reply.source?.found === false) return 'nothing'
        return reply?.content && !reply.incomplete ? 'done' : 'stopped'
      },
      // The next run for one branch: the others wait in it.
      newRunFor: async ({ docketId, letters }) => {
        const now = new Date().toISOString()
        const made = await newRun(db.current, { docketId, newId: () => crypto.randomUUID(), now })
        for (const l of Object.keys(made.branches)) if (!letters.includes(l)) await holdBranch(db.current, { docketId, n: made.n, letter: l, on: true, now }).catch(() => {})
        return made.n
      },
    }
  })
  const runnerRef = useRef(null)
  if (!runnerRef.current) {
    runnerRef.current = createRunner({
      readBranch: (a) => runDeps.current.readBranch(a),
      ensureChat: (a) => runDeps.current.ensureChat(a),
      markStep: (a) => runDeps.current.markStep(a),
      sendStep: (a) => runDeps.current.sendStep(a),
      newRunFor: (a) => runDeps.current.newRunFor(a),
      stopChat: (chatId) => stopStream(chatId, 'stopped'),
      lock: withDocketLock,
      onChange: (active) => setRunningHere(active),
    })
  }
  // stop: from another tab: this tab stops what it runs, and stop:all every reply.
  useEffect(() => tabBus().on((s) => {
    if (s.type !== 'stop') return
    runnerRef.current.stop(s)
    if (s.scope === 'all') for (const id of streamingIds()) stopStream(id, 'stopped')
  }), [])
  // Whether a plan is being run, here or in another tab.
  const planRuns = useCallback(async (docketId) => {
    if (runnerRef.current.runs(docketId)) return true
    if (typeof navigator === 'undefined' || !navigator.locks?.query) return false
    const { held = [] } = await navigator.locks.query().catch(() => ({}))
    return held.some((l) => l.name === `parliament-docket-${docketId}`)
  }, [])

  // ── The Plan board (stage 10, piece 2; C196 (a); C198) ─
  // One plan at one run: the one its context names (open:201, open:run 2),
  // else the plan of the chat in the room on screen, else the plan changed
  // last (C200). Read while the board is on the screen, and
  // again whenever something is stored, here or in another tab.
  const planOnScreen = arrangement.columns.flat().includes('docket') || arrangement.popped.some((p) => p.board === 'docket')
  const planAsked = planKey(arrangement.context?.docket)
  const planNum = planAsked?.num ?? (roomId ? chatRowsById.get(roomId)?.docketNum : null) ?? latestPlan(almanacRows)
  const planRun = planAsked?.run ?? null
  const planAgainst = planAsked?.against ?? null // diff: the run beside it (C202)
  const [planRead, setPlanRead] = useState(null) // { num, run, against, plan, texts }
  const [planPick, setPlanPick] = useState(null) // { num, letter }: the branch picked on the board
  useEffect(() => {
    if (!started || !planOnScreen || planNum == null) return undefined
    let live = true
    const read = async () => {
      let plan = await getPlan({ num: planNum }).catch(() => null)
      // A step left running when no tab runs the plan: its tab closed (C196 (d)).
      if (plan && plan.runs.some((r) => Object.values(r.branches || {}).some((b) => (b.steps || []).some((s) => s.status === 'running'))) && !(await planRuns(plan.docket.id))) {
        if (await settleLeft(db.current, { docketId: plan.docket.id }).catch(() => 0)) plan = await getPlan({ num: planNum }).catch(() => plan)
      }
      const texts = new Map()
      const shownRun = plan?.runs.find((r) => r.n === planRun) ?? plan?.runs.at(-1)
      const besideRun = planAgainst ? plan?.runs.find((r) => r.n === planAgainst) : null
      const chats = new Set()
      for (const run of [shownRun, besideRun]) {
        for (const b of Object.values(run?.branches ?? {})) if (b?.chatId && (b.steps ?? []).some((s) => s.messageId)) chats.add(b.chatId)
      }
      for (const id of chats) {
        for (const m of await getMessages(id).catch(() => [])) if (m.role === 'user') texts.set(m.id, typeof m.content === 'string' ? m.content : '')
      }
      if (live) setPlanRead({ num: planNum, run: planRun, against: planAgainst, plan, texts })
    }
    read()
    const off = onRecordsChanged(() => { read() })
    return () => { live = false; off() }
  }, [started, planOnScreen, planNum, planRun, planAgainst, planRuns])
  const planBoard = useMemo(() => {
    if (!planOnScreen || !planRead?.plan || planRead.num !== planNum || planRead.run !== planRun || planRead.against !== planAgainst) return null
    const chatOf = (id) => {
      const r = chatRowsById.get(id)
      return r ? { num: r.num, roomId: r.roomId ?? null, title: r.title ?? '' } : null
    }
    const rooms = new Map(recordsNames.rooms.map((r) => [r.id, roomLabel(i18n, r.name)]))
    const opts = { textOf: (id) => planRead.texts.get(id), chatOf, roomName: (id) => rooms.get(id) ?? null, selected: planPick?.num === planNum ? planPick.letter : null }
    const board = planBoardOf(planRead.plan, { ...opts, run: planRun })
    // diff: the other run beside it, what differs marked on both (C202).
    if (!planAgainst || !planRead.plan.runs.some((r) => r.n === planAgainst) || planAgainst === board.n) return board
    const beside = planBoardOf(planRead.plan, { ...opts, run: planAgainst })
    return { ...board, against: planAgainst, beside, marks: compareRuns(board, beside), besideMarks: compareRuns(beside, board) }
  }, [planOnScreen, planRead, planNum, planRun, planAgainst, chatRowsById, recordsNames, i18n, planPick])
  const planBoardNow = useRef(null)
  useEffect(() => { planBoardNow.current = planBoard }, [planBoard])
  // What the plan commands do (C198): all on this device, nothing sent;
  // each kept with what it changed, so undo: takes it back.
  const planAct = useCallback(async (what, body) => {
    const newId = () => crypto.randomUUID()
    const now = new Date().toISOString()
    const keep = (back) => { if (back) touched.current?.plans.push(back) }
    const said = () => { if (!what.fromPrompt) remember(body) }
    try {
      if (what.kind === 'newPlan') {
        const made = await newPlan(db.current, { title: what.title ?? '', newId, now })
        keep(made.back)
        await run(showPlan(current.current, made.docket.num), null)
        said()
        return { done: true, says: { message: 'planNewDone', values: { num: made.docket.num } } }
      }
      if (what.kind === 'planStep') {
        const out = await planStep(db.current, { docketId: what.docketId, n: what.n, letter: what.letter, prompt: what.prompt ?? '', newId, now })
        keep(out.back)
        setPlanPick({ num: what.num, letter: what.letter })
        said()
        return { done: true, says: { message: 'planStepDone', values: { index: out.index, address: what.address } } }
      }
      if (what.kind === 'planRun') {
        const made = await newRun(db.current, { docketId: what.docketId, newId, now })
        keep(made.back)
        await run(showPlan(current.current, what.num), null)
        said()
        return { done: true, says: { message: 'planRunDone', values: { n: made.n } } }
      }
      if (what.kind === 'planBranch') {
        const out = await newPlanBranch(db.current, { docketId: what.docketId, n: what.n, name: what.name ?? '', now })
        keep(out.back)
        setPlanPick({ num: what.num, letter: out.letter })
        said()
        return { done: true, says: { message: 'planBranchDone', values: { address: `${what.num}${out.letter}` } } }
      }
      if (what.kind === 'planHold') {
        for (const letter of what.letters) keep((await holdBranch(db.current, { docketId: what.docketId, n: what.n, letter, on: what.on, now })).back)
        said()
        return null
      }
      if (what.kind === 'planMove') {
        const out = await moveBranch(db.current, { docketId: what.docketId, letter: what.letter, after: what.after ?? null, before: what.before ?? null, now })
        keep(out.back)
        said()
        return null
      }
      if (what.kind === 'run') {
        // run: (almanac spec §5): what it runs, read again; if that changed, say so first.
        const p = planBoardNow.current
        const scope = p && p.docketId === what.docketId ? runScope(p, { letter: what.letter ?? null }) : null
        if (!scope || scope.bad || scope.newRun !== what.newRun || scope.branches.map((b) => b.letter).join() !== what.letters.join()) return 'runChanged'
        const out = await runnerRef.current.start({ docketId: what.docketId, num: what.num, n: what.n, letters: what.letters, newRun: what.newRun })
        if (!out.started) return out.reason === 'elsewhere' ? { message: 'runElsewhere', values: { num: what.num } } : 'runFailed'
        if (touched.current) touched.current.ran = { num: what.num, run: out.n }
        said()
        const later = out.finished.then((res) => {
          if (!res) return null
          const paused = Object.entries(res.ended).filter(([, o]) => o !== 'done' && o !== 'gone').map(([l]) => `${what.num}${l}`)
          return paused.length ? { message: 'runPaused', values: { run: res.n, num: what.num, nums: paused, board: 'docket' } } : { message: 'runDone', values: { run: res.n, num: what.num } }
        })
        return { done: true, says: { message: 'runStarted', values: { run: out.n, num: what.num } }, later }
      }
      if (what.kind === 'stop') {
        // stop: (almanac spec §5): here, and in every other tab.
        const signal = { type: 'stop', scope: what.scope, ...(what.num != null ? { num: what.num } : {}), ...(what.letter ? { letter: what.letter } : {}) }
        tabBus().post(signal)
        runnerRef.current.stop(signal)
        if (what.scope === 'all') for (const id of streamingIds()) stopStream(id, 'stopped')
        said()
        return { done: true, says: { message: 'stopDone' } }
      }
      if (what.kind === 'stopReply') {
        stopStream(what.chatId, 'stopped')
        said()
        return { done: true, says: { message: 'stopDone' } }
      }
      if (what.kind === 'planDelete') {
        // delete: of what has not been sent (C199): undo: brings it back.
        if (what.what === 'step') {
          const out = await removeStep(db.current, { docketId: what.docketId, n: what.n, letter: what.letter, stepId: what.stepId, now })
          keep(out.back)
          said()
          return { done: true, says: { message: 'deletedStep', values: { index: what.index, address: what.address } } }
        }
        if (what.what === 'branch') {
          const out = await removePlanBranch(db.current, { docketId: what.docketId, letter: what.letter, now })
          keep(out.back)
          said()
          return { done: true, says: out.planGone ? { message: 'deletedPlan', values: { num: what.num } } : { message: 'deletedBranch', values: { address: what.address } } }
        }
        const out = await removePlan(db.current, { docketId: what.docketId })
        keep(out.back)
        said()
        return { done: true, says: { message: 'deletedPlan', values: { num: what.num } } }
      }
    } catch (err) {
      if (err?.code === 'fixed') return 'planFixed'
      if (err?.code === 'running') return { message: 'planHoldRunning', values: { address: `${what.num}${what.letters?.[0] ?? ''}` } }
      return err?.name === 'PlanError' ? 'planChanged' : 'planFailed'
    }
    return 'later'
  }, [run, remember])
  useEffect(() => { planActNow.current = planAct }, [planAct])
  // A prompt with the Plan board addressed: a step planned, nothing sent.
  // Where it goes is read again; if that has changed since, say so first.
  const promptToPlan = useCallback(async (text, shown) => {
    const now = planBoardNow.current
    const p = now ? planPromptPreview(text, now) : null
    const was = shown?.plan ? planPromptPreview(text, shown.plan) : null
    if (!p?.ready || !was?.ready || p.act.address !== was.act.address || p.act.n !== was.act.n) return { refused: 'promptChanged' }
    const out = await onRun(null, `new:step ${p.act.address}`, null, { ...p.act, prompt: text, fromPrompt: true })
    if (out && !out.done) return { refused: out }
    return { done: Promise.resolve(out?.says ?? null) }
  }, [onRun])
  // When a planned step runs, changed by a click on the board (C201).
  const onPlanCondition = useCallback((letter, stepId, condition) => {
    const p = planBoardNow.current
    if (!p || p.n !== p.latest || !db.current) return
    changeStep(db.current, { docketId: p.docketId, n: p.n, letter, stepId, set: { condition } }).catch(() => {})
  }, [])
  // A planned step's words, written on the board (C197 (d)): kept as typed.
  const onPlanText = useCallback((letter, stepId, text) => {
    const p = planBoardNow.current
    if (!p || p.n !== p.latest || !db.current) return
    changeStep(db.current, { docketId: p.docketId, n: p.n, letter, stepId, set: { prompt: text } }).catch(() => {})
  }, [])
  const planModelName = useCallback((id) => modelFacts(id)?.name ?? destination(id)?.name ?? id, [])
  // A × on the board (C199): the delete: it stands for, run at once, and
  // what it did said under the bar.
  const [barSaid, setBarSaid] = useState(null)
  const onPlanDelete = useCallback(async (line) => {
    const p = preview(`>${line}`, { mode: 'command', arrangement: current.current, screens: screensNow.current ?? {} })
    if (!p.act || p.act.confirm) { setBarSaid({ says: p.says ?? null }); return }
    const out = await onRun(p.next ?? null, line, null, p.act)
    const says = out && !out.done ? (typeof out === 'string' ? { message: out } : out) : out?.says ?? null
    setBarSaid({ says })
  }, [onRun])
  // Who answers a step, chosen in the picker under the bar (C202).
  const onPlanWho = useCallback((step) => {
    setFwPicking(false)
    setInspected(null)
    setKeyPanel(null)
    setReplyPicking(false)
    setStepPick(step)
    setPicking(true)
  }, [])
  const onPlanPick = useCallback((letter) => {
    const p = planBoardNow.current
    if (p) setPlanPick((was) => (was?.num === p.num && was.letter === letter ? null : { num: p.num, letter }))
  }, [])
  const summarizing = useMemo(() => ({
    helper: helperNow,
    privacy: settings.privacyFilter ?? 'off',
    factsOf: (chatId) => {
      const row = chatRowsById.get(chatId)
      if (!row) return null
      const chat = conversations.find((c) => c.id === chatId)
      const who = answererOf({ chosen: chat?.answerer ?? null, keyed: keys, defaultModel: settings.defaultModel })
      const plan = row.docketNum ?? null
      return {
        address: plan != null && row.branch ? `${plan}${row.branch}` : String(row.num),
        plan,
        next: plan != null && row.planNext ? `${plan}${row.planNext}` : null,
        chars: String(row.words ?? '').length,
        sources: (row.sources ?? []).map((id) => destination(id)?.name ?? id),
        answerer: { name: who.name, group: who.group, window: who.group === 'local' ? LOCAL_READS : modelFacts(who.id)?.contextWindow ?? null },
      }
    },
  }), [helperNow, settings.privacyFilter, settings.defaultModel, chatRowsById, conversations, keys])
  // include: (C176): the room's last answer from a source, the branches on
  // screen with theirs, and what is held.
  const roomAnswer = useMemo(() => answerFor(shown), [shown])
  const including = useMemo(() => ({ room: roomId, chatAnswer: roomAnswer, members: branchShown?.members ?? [], held: heldInclude }), [roomId, roomAnswer, branchShown, heldInclude])
  // again: (C177): a chat's last prompt and who answers it, for the room's
  // chat and the branches on screen; another chat is opened first.
  const roomPrompt = useMemo(() => promptFacts(shown), [shown])
  const roomSteps = useMemo(() => shown.filter((m) => m.role === 'user').length, [shown])
  const again = useMemo(() => ({
    room: roomId,
    rows: almanacRows ?? [],
    factsOf: (chatId) => {
      const row = chatRowsById.get(chatId)
      if (!row) return null
      const chat = conversations.find((c) => c.id === chatId)
      const member = branchShown?.members?.find((m) => m.chatId === chatId) ?? null
      const plan = row.docketNum ?? null
      return {
        address: plan != null && row.branch ? `${plan}${row.branch}` : String(row.num),
        plan,
        next: plan != null && row.planNext ? `${plan}${row.planNext}` : null,
        onScreen: chatId === roomId || Boolean(member),
        prompt: chatId === roomId ? roomPrompt : member?.prompt ?? null,
        // Its steps, the person's prompts, for new:branch 201a 2 (C178).
        steps: chatId === roomId ? roomSteps : member?.steps ?? null,
        answerer: answererOf({ chosen: chat?.answerer ?? null, keyed: keys, defaultModel: settings.defaultModel }),
      }
    },
  }), [roomId, almanacRows, chatRowsById, conversations, branchShown, roomPrompt, roomSteps, keys, settings.defaultModel])
  // ── Settings as a board (stage 9, piece 1; C181) ──────
  // What its sections show: the settings now, the providers and their keys,
  // the models with their marks, this month's spending from Records, the
  // storage and the last backup (read while Settings is on screen).
  const settingsOpen = arrangement.columns.some((c) => c.includes('settings')) || arrangement.popped.some((p) => p.board === 'settings')
  const [settingsStored, setSettingsStored] = useState({ storage: { usage: 0, quota: 0, kept: null }, lastBackup: null })
  useEffect(() => {
    if (!settingsOpen) return undefined
    let live = true
    Promise.all([getStorageEstimate().catch(() => ({ usage: 0, quota: 0 })), isStorageKept().catch(() => null), getBackupLog().catch(() => [])])
      .then(([est, kept, log]) => { if (live) setSettingsStored({ storage: { usage: est.usage ?? 0, quota: est.quota ?? 0, kept }, lastBackup: log.length ? log[log.length - 1].backedUpAt ?? null : null }) })
    return () => { live = false }
    // Read again when the backup panel closes: a backup changes the last date.
  }, [settingsOpen, almanacRows, backupPanel])
  const roomTemplates = useMemo(() => (catalogue ?? [])
    .filter((i) => i.shelf === 'room' && i.template && !i.soon)
    .map((i) => ({ id: i.template, name: roomLabel(i18n, i.name) })), [catalogue, i18n])
  const settingsFacts = useMemo(() => {
    const rows = almanacRows ?? []
    const now = new Date()
    const month = now.toISOString().slice(0, 7)
    // This month by runs of plans and chats on their own (settings spec §9; C203).
    const spending = spendingOf(rows, month)
    const chats = rows.filter((r) => r.kind === 'chat')
    return {
      values: {
        defaultModel: settings.defaultModel, storageMode: settings.storageMode, describeNewChats: settings.describeNewChats !== false,
        finishRepliesOnLeave: Boolean(settings.finishRepliesOnLeave), fontSize: settings.fontSize ?? 'default', mistralRegion: settings.mistralRegion ?? 'global',
        thinking: settings.thinking === true, privacyFilter: settings.privacyFilter ?? 'off', translateQueries: settings.translateQueries === true,
        newChatRoom: settings.newChatRoom ?? null, backupReminder: settings.backupReminder ?? 'monthly', interfaceLanguage: settings.interfaceLanguage ?? null,
        runWarn: settings.runWarn ?? null,
      },
      providers: keyInfo.keys,
      rows: answerRows,
      reference: referenceName,
      local: { ...LOCAL_ENTRY, status: local.status, models: local.models ?? [] },
      region: destination('mistral')?.ships ? { provider: destination('mistral').name } : null,
      rooms: roomTemplates,
      replyIn: reply.tag ? languageName(reply.tag) : null,
      helperName: helperNow?.name ?? null,
      spending: {
        total: spending.total,
        chats: spending.chats,
        runs: spending.runs.length,
        unknown: spending.unknown,
        // The four costliest: runs where there are any, else chats.
        top: (spending.runs.length ? spending.runs : spending.solo).slice(0, 4),
        monthName: new Intl.DateTimeFormat(i18n.locale, { month: 'long' }).format(now),
      },
      counts: {
        chats: chats.length,
        plans: new Set(chats.map((r) => r.docketNum).filter((n) => n != null)).size,
        markings: rows.filter((r) => r.kind === 'note' || r.kind === 'highlight' || r.kind === 'term' || r.kind === 'quote').length,
      },
      storage: settingsStored.storage,
      lastBackup: settingsStored.lastBackup,
      backupVersion: BACKUP_VERSION,
      // The globe in Appearance, once more than one language is offered (C184).
      languages: offeredLanguages().length > 1 ? { now: i18n.locale } : null,
    }
  }, [settings, keyInfo, answerRows, referenceName, local, roomTemplates, reply, languageName, helperNow, almanacRows, i18n.locale, settingsStored])
  // What set: reads (lib/settingVerbs.js).
  const settingScreen = useMemo(() => ({ values: settingsFacts.values, rows: answerRows, rooms: roomTemplates, regionProvider: settingsFacts.region?.provider ?? null }), [settingsFacts, answerRows, roomTemplates])
  // What run: and stop: say before Enter (C200): keys, who answers each
  // step, how long a chat is already, what runs in this tab, the room's reply.
  const runFacts = useMemo(() => ({
    keyed: keyedBy,
    whoOf: (model, chatId) => answererOf({ chosen: model ?? (chatId ? conversations.find((c) => c.id === chatId)?.answerer : null) ?? null, keyed: keyedBy ?? {}, defaultModel: settings.defaultModel }),
    charsOf: (chatId) => String(chatRowsById.get(chatId)?.words ?? '').length,
    here: runningHere,
    room: roomId ? { chatId: roomId, num: roomRecord?.num ?? null, streaming: Boolean(streaming) } : null,
    queryOf,
    nameOf: languageName,
    warn: typeof settings.runWarn === 'number' ? settings.runWarn : null,
  }), [settings.runWarn, keyedBy, conversations, settings.defaultModel, chatRowsById, runningHere, roomId, roomRecord, streaming, queryOf, languageName, region, localRev]) // eslint-disable-line react-hooks/exhaustive-deps -- region changes the prices, a check the models
  const screens = useMemo(() => ({ lastRoom, roomName: roomNameHere, stepsOff: welcome.off, measure: measureSpace, numbered, keys: keyInfo.keys, noKey: keyInfo.noKey, records, undo: undoTop, undoFence: fenceShown, hiddenOf, collection: collectionScreens, helper, answering, local: LOCAL_ENTRY, frameworks: frameworkScreens, thinking: { on: settings.thinking === true }, markup: { on: settings.markup !== 'off' }, ...languageScreens, branching, summarizing, including, again, setting: settingScreen, plan: planBoard, runFacts }), [lastRoom, roomNameHere, welcome.off, measureSpace, numbered, keyInfo, records, undoTop, fenceShown, hiddenOf, collectionScreens, helper, answering, frameworkScreens, settings.thinking, settings.markup, languageScreens, branching, summarizing, including, again, settingScreen, planBoard, runFacts])

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
  const firstPrompt = roomId == null || (Boolean(roomId) && isReady(roomId) && roomMessages.length === 0)
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
  // What include: holds for a prompt in this room (C176).
  const includeHere = heldInclude && roomId !== undefined && heldInclude.room === (roomId ?? null) ? heldInclude : null
  // With no room in the space, a prompt starts a chat in a room beside
  // what is here, so it is offered as going to a new room (C125).
  const prompt = useMemo(() => ({
    // With the Plan board addressed, a prompt is a step planned (C198).
    plan: arrangement.addressed === 'docket' ? planBoard ?? NO_PLAN : null,
    // A branch this tab is running takes no prompt by hand (C196 (f)).
    branchRunning: (() => {
      const r = roomId ? chatRowsById.get(roomId) : null
      return r && runningHere.some((x) => x.num === r.docketNum && x.letter === r.branch) ? `${r.docketNum}${r.branch}` : null
    })(),
    room: roomId ?? null,
    chat: roomRecord?.num ?? null,
    streaming,
    keyed,
    keyedBy,
    region: answerer.provider === 'mistral' ? region : null,
    provider: destination(PROVIDER)?.name,
    source: destination(SOURCE)?.name,
    model: (branchTarget?.ids.length === 1 ? branchTarget.whos[0] : answerer).name,
    answerer: branchTarget?.ids.length === 1 ? branchTarget.whos[0] : answerer,
    historyChars: about ? 0 : historyChars(along) + (includeHere && answerer.group !== 'source' ? includeHere.items.reduce((n, x) => n + (x.chars ?? 0), 0) : 0),
    // The privacy filter on a search, as it is set (C179).
    privacySearch: { on: (settings.privacyFilter ?? 'off') !== 'off' },
    // Answers from sources held for this prompt (C176).
    included: includeHere ? { count: includeHere.items.length, sources: [...new Set(includeHere.items.map((x) => x.source))], flagged: includeHere.items.some((x) => x.phrases?.length) } : null,
    systemChars: byModel ? withReplyLanguage(instructionsOf(fwHere, fwList), reply.tag).length : 0,
    // The language replies come in, when one is asked for (C166).
    replyIn: byModel && reply.tag ? languageName(reply.tag) : null,
    edition,
    query,
    translateLater: (reads === 'english' || reads === 'mostlyEnglish') && baseOf(translateTo) !== 'en' ? languageName(translateTo) : null,
    // The language a source's search is read in, for what it searches for (C168).
    searchLang: answerer.group === 'source' ? (reads === 'yours' ? sourceAskLanguage(reply, sourceLocale(i18n.locale)) : 'en') : null,
    nameOf: languageName,
    // Several at once, each a branch of the plan (C172), or several branches
    // there already, each carrying its own on (C174).
    many: heldWho && heldWho.length > 1 ? heldWho : branchTarget?.ids.length > 1 ? branchTarget.whos : null,
    manyOrder: heldWho && heldWho.length > 1 ? heldOrder : 'together',
    manyConds: heldWho && heldWho.length > 1 ? heldConds : null,
    toMany: !(heldWho && heldWho.length > 1) && branchTarget?.ids.length > 1 ? branchTarget.addresses : null,
    toBranch: branchTarget?.ids.length === 1 ? branchTarget.addresses[0] : null,
    targetIds: targets?.chats ?? null,
    carriesOn: targets?.why === 'carried' && branchViewed && branchShown && branchViewed !== branchShown.line ? { line: addressOf(branchShown.line), viewed: addressOf(branchViewed) } : null,
    // In the field: where the prompt goes among the branches (C174).
    toLabel: targets && branchShown ? { chats: targets.chats.map(addressOf), all: targets.chats.length === branchShown.chats.length && targets.chats.length > 1, count: targets.chats.length, name: targets.chats.length === 1 ? branchShown.members.find((m) => m.chatId === targets.chats[0])?.name ?? '' : '' } : null,
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
  }), [arrangement.addressed, planBoard, runningHere, chatRowsById, heldOrder, heldConds, includeHere, roomId, roomRecord, roomNameHere, streaming, ink, keyed, keyedBy, region, byModel, answerer, along, hiddenOut, sourcesOut, describe, describeFresh, stalledIn, fwHere, fwList, nameOfFramework, settings.thinking, about, reply, languageName, edition, query, reads, translateTo, alongPrivate, settings.privacyFilter, localChecker, i18n.locale, heldWho, branchTarget, targets, branchViewed, branchShown, addressOf])

  /**
   * Sends a prompt to the room in the space: to the provider with a key,
   * else to the source. With an empty room, or no room at all, it first
   * makes the chat (titled with the prompt's first words, sending nothing)
   * and shows it in a room beside what is here (welcome spec §5; C125).
   * Answers at once whether the prompt went, and `done` once it is answered.
   */
  const onPrompt = useCallback(async (text, shown) => {
    if (shown?.plan) return promptToPlan(text, shown)
    const aboutNow = shown?.about ?? null
    const roomChat = aboutNow ? null : roomOnScreen(current.current) ?? null
    // Among a prompt's branches (C174): where the line said it goes, read
    // again; if that has changed since, say so first.
    const shownNow = shownIn(roomChat ?? null)
    const targetsNow = replyTargets({ shown: shownNow, viewed: shownNow ? viewedIn(shownNow.groupId) : null, held: heldToNow.current })
    // A new prompt to several (by: with several) is not among branches.
    const branchCase = !aboutNow && Boolean(text) && !(shown?.many?.length > 1 && !shown?.toMany)
    const toIds = branchCase ? targetsNow?.chats ?? null : null
    const shownIds = branchCase ? shown?.targetIds ?? null : null
    if ((toIds ?? []).join('|') !== (shownIds ?? []).join('|')) return { refused: 'promptChanged' }
    // One branch other than the room's: the room moves to it, and it carries on.
    const moveTo = toIds && toIds.length === 1 && toIds[0] !== roomChat ? toIds[0] : null
    const chatId = moveTo ?? roomChat
    if (creating.current) return { refused: 'promptBusy' }
    // The line named a recipient; if that has changed since, say so first.
    const fresh = await keyedProviders().catch(() => ({}))
    if (JSON.stringify(fresh) !== JSON.stringify(shown?.keyedBy ?? null)) { setKeyedBy(fresh); return { refused: 'promptChanged' } }
    // Who answers, read again: the line named them, and no one else is sent
    // to (C150).
    const conv = chatId ? await getConversation(chatId).catch(() => null) : null
    // A branch a run is sending to, here or in another tab, takes no prompt
    // by hand until it ends (C196 (f)).
    if (conv?.docketId && conv.branch && await planRuns(conv.docketId)) {
      const plan = await getPlan({ id: conv.docketId }).catch(() => null)
      const b = plan?.runs.find((r) => r.n === (conv.run || 1))?.branches?.[conv.branch]
      if (b?.steps?.some((s) => s.status === 'running')) return { refused: { message: 'promptBranchRunning', values: { address: `${plan.docket.num}${conv.branch}` } } }
    }
    const fwIds = frameworksOf((chatId ? conv?.frameworks : pendingFwNow.current) ?? [], fwListNow.current).map((fw) => fw.id)
    const system = () => withReplyLanguage(instructionsOf(fwIds, fwListNow.current), replyNow.current?.tag ?? null)
    const under = { frameworks: recordOf(fwIds, fwListNow.current) }
    const who = answererOf({ chosen: chatId ? conv?.answerer ?? null : pendingNow.current, keyed: fresh, defaultModel: latest.current.settings.defaultModel })
    if (shown?.answerer && who.id !== shown.answerer.id) return { refused: 'promptChanged' }
    if (who.later || who.gone || who.needsKey || who.unchecked) return { refused: 'promptChanged' }

    // Answers from sources include: held for this prompt (C176): as the line
    // said, read again and checked on this device in a worker, then sent to
    // the models among its recipients as data. A source gets the words only.
    const heldInc = heldIncludeNow.current && heldIncludeNow.current.room === (roomChat ?? null) ? heldIncludeNow.current : null
    if (!aboutNow && (heldInc?.items.length ?? 0) !== (shown?.included?.count ?? 0)) return { refused: 'promptChanged' }
    let included = null
    if (heldInc && text && !aboutNow) {
      try {
        const found = await Promise.all(heldInc.items.map(async (x) => (await getMessages(x.chatId)).find((m) => m.id === x.messageId && m.role === 'assistant' && m.source && m.content)))
        if (found.some((m) => !m)) return { refused: 'includeFailed' }
        const checked = await checkSourceTexts(found.map((m) => m.content))
        included = found.map((m, i) => includedOf(m, checked[i]))
      } catch {
        return { refused: 'includeFailed' }
      }
    }
    const withInc = (w) => (included && w.group !== 'source' ? { included } : {})
    const spentInc = (whos) => { if (included && whos.some((w) => w.group !== 'source')) setHeldInclude(null) }

    // A source answers a search (C168), with its edition (C166 (e)): for a
    // prompt to several, each source on its own.
    const askOne = (to, w, extra = {}) => askSourceAs(to, text, w, extra)

    // Several branches there already, each carrying its own on (C174): each
    // with who answers it and its own frameworks.
    if (toIds && toIds.length > 1) {
      const convs = await Promise.all(toIds.map((x) => getConversation(x).catch(() => null)))
      if (convs.some((c) => !c)) return { refused: 'promptChanged' }
      const whos = convs.map((c) => answererOf({ chosen: c.answerer ?? null, keyed: fresh, defaultModel: latest.current.settings.defaultModel }))
      if (whos.some((w) => w.later || w.gone || w.needsKey || w.unchecked)) return { refused: 'promptChanged' }
      if (whos.map((w) => w.id).join('|') !== (shown?.many ?? []).map((w) => w.id).join('|')) return { refused: 'promptChanged' }
      setStalledIn(null)
      const sendOne = (c, w) => {
        const fw = frameworksOf(c.frameworks ?? [], fwListNow.current).map((x) => x.id)
        if (w.group === 'source') return askOne(c.id, w)
        return sendMessage(c.id, text, w.id, withReplyLanguage(instructionsOf(fw, fwListNow.current), replyNow.current?.tag ?? null), [], null, { frameworks: recordOf(fw, fwListNow.current), ...withInc(w) })
      }
      spentInc(whos)
      const all = convs.map((c, i) => (c.id === roomChat && !isReady(roomChat)
        ? new Promise((resolve, reject) => { waiting.current = { chatId: c.id, go: () => sendOne(c, whos[i]).then(resolve, reject), drop: () => resolve() } })
        : sendOne(c, whos[i])))
      const done = Promise.allSettled(all).then((results) => {
        loadConversations().catch(() => {})
        const bad = results.findIndex((r) => r.status === 'rejected' && r.reason?.name !== 'AbortError')
        return bad < 0 ? null : failure(results[bad].reason, whos[bad].group === 'source' ? whos[bad].name : undefined)
      })
      return { done }
    }

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
          await assignDefaultRoom(chat.id, latest.current.settings.newChatRoom ?? undefined)
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
      // One after another (branch slider v9; C201): the prompt is planned as
      // a step in each branch, each after the first on its condition, and
      // the runner sends them in turn, as a run of the plan.
      if (shown?.manyOrder === 'sequence') {
        const chats = [id, ...others]
        const convs = await Promise.all(chats.map((x) => getConversation(x).catch(() => null)))
        if (convs.some((c) => !c?.docketId || !c.branch)) return { refused: 'manyFailed' }
        const docketId = convs[0].docketId
        const n = convs[0].run || 1
        const at = new Date().toISOString()
        const chain = []
        try {
          for (const [i, c] of convs.entries()) {
            const { step } = await planStep(db.current, { docketId, n, letter: c.branch, prompt: text, model: whos[i].id, condition: i ? shown.manyConds?.[i] ?? 'finished' : null, group: group.id, newId: () => crypto.randomUUID(), now: at })
            chain.push({ letter: c.branch, stepId: step.id })
          }
        } catch {
          return { refused: 'manyFailed' }
        }
        const num = (await getPlan({ id: docketId }).catch(() => null))?.docket.num ?? null
        // The room's chat sends once its messages are loaded, as a typed prompt does.
        if (!isReady(id)) await new Promise((resolve) => { waiting.current = { chatId: id, go: resolve, drop: resolve } })
        const out = await runnerRef.current.start({ docketId, num, n, letters: chain.map((l) => l.letter), chain, group, included })
        if (!out.started) return { refused: out.reason === 'elsewhere' ? { message: 'runElsewhere', values: { num } } : 'runFailed' }
        spentInc(whos)
        const done = out.finished.then((res) => {
          loadConversations().catch(() => {})
          if (!res) return null
          const which = (keep) => Object.entries(res.ended).filter(([, o]) => keep(o)).map(([l]) => `${num}${l}`)
          const paused = which((o) => o !== 'done' && o !== 'unmet' && o !== 'gone')
          if (paused.length) return { message: 'runPaused', values: { run: res.n, num, nums: paused, board: 'docket' } }
          const unmet = which((o) => o === 'unmet')
          return unmet.length ? { message: 'manyUnmet', values: { count: unmet.length, nums: unmet } } : null
        })
        return { done }
      }
      const sendOne = (to, w, i) => (w.group !== 'source'
        ? sendMessage(to, text, w.id, system(), [], null, { ...under, group, describe: i === 0, ...withInc(w) })
        : askOne(to, w, { group }))
      spentInc(whos)
      const first = isReady(id)
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
    try {
      asked = await translateQuery(text, q)
    } catch {
      return { refused: 'queryFailed' }
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
    if (moveTo) {
      const placed = planShowInRoom(current.current, moveTo)
      if (placed.next) await run(placed.next, null)
    }
    if (!id) {
      creating.current = true
      try {
        const chat = await createConversation({ title: titleFromPrompt(text), model: latest.current.settings.defaultModel, answerer: who.chosen ? who.id : null, frameworks: fwIds })
        setPendingAnswerer(null)
        setPendingFrameworks(null)
        await assignDefaultRoom(chat.id, latest.current.settings.newChatRoom ?? undefined)
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
        ? sendMessage(id, full, who.id, system(), [], null, { ...under, ...withInc(who) })
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
    spentInc([who])
    // A new room sends once its messages are loaded, so nothing is lost
    // between the two.
    const sending = isReady(id)
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
  }, [askSource, askSourceAs, createConversation, loadConversations, resendWhole, run, sendMessage, updateWelcome, clearPicked, promptToPlan, planRuns, translateQuery])

  // again:203a (editing spec; C177): the branch's last prompt, read again,
  // asked as a new branch of its plan, the next letter, by who answers that
  // branch, with its frameworks and anything it brought in from sources.
  // The new branch is a copy up to the prompt (C172 (a)), and joins the
  // prompt's group, so its reply shows among the tabs, and is viewed.
  const askAgain = useCallback(async (what) => {
    if (creating.current) return 'promptBusy'
    const conv = await getConversation(what.chatId).catch(() => null)
    const msgs = await getMessages(what.chatId).catch(() => [])
    const at = msgs.findIndex((m) => m.id === what.promptId)
    if (!conv || at < 0) return 'againChanged'
    const p = msgs[at]
    const fresh = await keyedProviders().catch(() => ({}))
    const w = answererOf({ chosen: conv.answerer ?? null, keyed: fresh, defaultModel: latest.current.settings.defaultModel })
    if (w.id !== what.answerer.id || w.later || w.gone || w.needsKey || w.unchecked) return 'againChanged'
    const fw = frameworksOf(conv.frameworks ?? [], fwListNow.current).map((x) => x.id)
    creating.current = true
    let made
    try {
      const opts = { title: conv.title, model: w.group === 'source' ? conv.model : w.id, answerer: conv.answerer ?? null, frameworks: fw }
      made = at > 0 ? await createBranch(what.chatId, msgs[at - 1].id, opts) : await createConversation({ ...opts, parentId: what.chatId, room: conv.room ?? null })
    } catch {
      return { message: 'againFailed', values: { address: what.address } }
    } finally {
      creating.current = false
    }
    const group = { id: p.group?.id ?? crypto.randomUUID(), chats: [...(p.group?.chats ?? [what.chatId]), made.id] }
    // The branch is made either way; without this it shows as a chat of its own.
    await regroupPrompt(p.id, group).catch(() => {})
    setViewed(group.id, made.id)
    loadConversations().catch(() => {})
    const next = what.plan != null && made.branch ? `${what.plan}${made.branch}` : String(made.num ?? '')
    const sent = w.group === 'source'
      ? askSourceAs(made.id, promptNow(p), w, { group })
      : sendMessage(made.id, promptNow(p), w.id, withReplyLanguage(instructionsOf(fw, fwListNow.current), replyNow.current?.tag ?? null), [], null,
        { frameworks: recordOf(fw, fwListNow.current), group, describe: false, ...(Array.isArray(p.included) && p.included.length ? { included: p.included } : {}) })
    return sent.then(() => ({ message: 'againDone', values: { next, address: what.address } }), (err) => failure(err, w.group === 'source' ? w.name : undefined))
  }, [askSourceAs, createConversation, loadConversations, regroupPrompt, sendMessage])
  useEffect(() => { askAgainNow.current = askAgain }, [askAgain])

  const screensNow = useRef(null)
  useEffect(() => { screensNow.current = screens }, [screens])
  // A control on Settings runs its set: line, as if typed and entered: the
  // same change, said the same way, and the same undo: (C181).
  const runSetting = useCallback(async (line) => {
    if (current.current.addressed !== 'settings') commit(address(current.current, 'settings'))
    const p = preview(`>${line}`, { mode: 'command', arrangement: current.current, screens: screensNow.current ?? {} })
    if (p.act) await onRun(p.next ?? null, line, null, p.act)
  }, [onRun, commit])
  // A line run as if typed and entered, wherever the bar points: the
  // globe's language: and the picker's choices (C184).
  const runCommand = useCallback(async (line) => {
    const p = preview(`>${line}`, { mode: 'command', arrangement: current.current, screens: screensNow.current ?? {} })
    // An act, or a change to the space (open:settings), as Enter would run it.
    if (p.act || p.next) await onRun(p.next ?? null, line, null, p.act ?? null)
  }, [onRun])
  // An address that asks for a board (/settings, the old page's; R37; C186)
  // opens it once the space is loaded, and the address goes back to /.
  const location = useLocation()
  const goTo = useNavigate()
  const askedOpen = typeof location.state?.open === 'string' ? location.state.open : null
  useEffect(() => {
    if (!started || !askedOpen) return
    goTo('/', { replace: true, state: null })
    runCommand(`open:${askedOpen}`)
  }, [started, askedOpen, goTo, runCommand])
  const pickAnswerer = useCallback(async (row) => {
    if (row.later) return
    // For one step of a plan (C202): its model, or none for the branch's own.
    const forStep = stepPickNow.current
    if (forStep) {
      if (row.needsKey || row.unchecked) { setPicking(false); setStepPick(null); writeField(`>api:${row.provider}`); return }
      const p = planBoardNow.current
      if (p && p.n === p.latest && db.current) await changeStep(db.current, { docketId: p.docketId, n: p.n, letter: forStep.letter, stepId: forStep.stepId, set: { model: row.id ?? null } }).catch(() => {})
      setPicking(false)
      setStepPick(null)
      return
    }
    if (row.needsKey || row.unchecked) { setPicking(false); writeField(`>api:${row.provider}`); return }
    // A box ticked joins the ones ticked before, in that order; unticked, it
    // leaves the gap closed (slider v9; C172 (c)). One left is one choice.
    const ans = screensNow.current?.answering
    const now = ans?.held?.length > 1 ? ans.held.map((h) => h.id) : [ans?.now?.id].filter(Boolean)
    const next = now.includes(row.id) ? now.filter((x) => x !== row.id) : [...now, row.id]
    if (!next.length) return
    const nameOf = (x) => [...(ans?.rows?.model ?? []), ...(ans?.rows?.local ?? []), ...(ans?.rows?.source ?? [])].find((r) => r.id === x)?.name ?? x
    const joint = ans?.order === 'sequence' ? ' then ' : ', '
    const body = next.length === 1 ? `by:${next[0]}` : `by:${next.map((x) => `"${String(nameOf(x)).replace(/"/g, '')}"`).join(joint)}`
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

  // From the field's marginalia: with branches on screen, where the prompt
  // goes among them (C174); else who answers.
  const togglePicker = useCallback(() => {
    setStepPick(null)
    setFwPicking(false)
    setInspected(null)
    setCompared(null)
    setKeyPanel(null)
    if (shownIn(roomOnScreen(current.current) ?? null)) { setPicking(false); setReplyPicking((was) => !was); return }
    setReplyPicking(false)
    setPicking((was) => !was)
  }, [])
  // A row of that picker ticks or unticks a branch, as to: does (C174).
  const toggleReplyTarget = useCallback(async (chatId) => {
    const s = shownIn(roomOnScreen(current.current) ?? null)
    if (!s) return
    const now = replyTargets({ shown: s, viewed: viewedIn(s.groupId), held: heldToNow.current })?.chats ?? []
    const next = now.includes(chatId) ? now.filter((x) => x !== chatId) : [...now, chatId]
    if (!next.length) return
    const addr = (id) => s.members.find((m) => m.chatId === id)?.address
    if (next.some((id) => !addr(id))) return
    const body = next.length === s.chats.length && next.length > 1 ? 'to:all' : `to:${next.map(addr).join(', ')}`
    const p = preview(`>${body}`, { mode: 'command', arrangement: current.current, screens: screensNow.current ?? {} })
    if (p.act) await onRun(p.next ?? null, body, null, p.act)
  }, [onRun])
  const allReplyTargets = useCallback(async () => {
    const p = preview('>to:all', { mode: 'command', arrangement: current.current, screens: screensNow.current ?? {} })
    if (p.act) await onRun(p.next ?? null, 'to:all', null, p.act)
  }, [onRun])

  function pickBoard(board) {
    const a = current.current
    // Sym: on the strip brings a room as sym: does, when there is none
    // here; with rooms here, it points the bar at the room a prompt goes to.
    if (board === 'room') {
      const here = currentRoom(a)
      if (!here) {
        const { next } = preview('>room:', { mode: 'command', arrangement: a, screens })
        if (next) run(next, null)
        return
      }
      board = here
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
  const edgeName = (board) => (isRoom(board) ? i18n._(COPY.shell.edgeRoom) : board === 'welcome' ? i18n._(COPY.shell.edgeWelcome) : boardName(i18n, board))
  const stripArrangement = useMemo(
    () => ({ ...arrangement, context: { ...arrangement.context, room: roomRecord?.num ?? undefined } }),
    [arrangement, roomRecord],
  )
  const welcomeHint = useMemo(() => (onWelcome && !welcome.finished ? { next: nextStep(welcome) } : null), [onWelcome, welcome])
  const searches = { almanac: recordsView.search, collection: collectionSearch, settings: settingsSearch }
  const searchCounts = { almanac: recordsSearch, collection: { count: collectionShown.cards.length, cards: true }, settings: { count: settingsCount, settings: true } }
  const shared = { arrangement, lines, screens, prompt, onRun, onPrompt, onTop: FEATURES.onTop, welcome: welcomeHint, onSearch, searches, searchCounts, said: barSaid }
  const filtered = isAtRest(recordsView) ? null : { search: recordsView.search.trim(), line: viewLine(recordsView) }
  const drawBoard = (board) => {
    // Each room with its own chat (C175 (a)).
    if (isRoom(board)) {
      const chat = chatIn(arrangement, board)
      return <RoomBoard key={`${board}:${chat ?? 'new'}`} board={board} chatId={chat} rev={roomRev} addressed={arrangement.addressed === board} onAddress={focusBoard} onReady={onRoomReady} onLeave={onRoomLeave} onName={onRoomName} />
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
    if (board === 'settings') {
      return (
        <SettingsBoard
          key="settings" addressed={arrangement.addressed === 'settings'} onAddress={focusBoard}
          section={arrangement.context?.settings ?? null} query={settingsSearch} facts={settingsFacts}
          onSet={runSetting} onWrite={writeField} onCount={setSettingsCount}
          onOpenRun={(num, n) => { run(showPlan(current.current, num, n), null) }}
        />
      )
    }
    if (board === 'library') {
      return <LibraryBoard key="library" items={catalogue} addressed={arrangement.addressed === 'library'} onAddress={focusBoard} onWrite={writeField} />
    }
    if (board === 'welcome') {
      return <WelcomeBoard key="welcome" welcome={welcome} addressed={arrangement.addressed === 'welcome'} onAddress={focusBoard} onWrite={writeField} barSlot={setCardSlot} keep={keepNotice} languages={offeredLanguages().length > 1 ? { now: i18n.locale } : null} onLanguage={() => runCommand('language:')} />
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
    if (board === 'docket') {
      return (
        <PlanBoard
          key="docket" plan={planBoard} loading={planOnScreen && planNum != null && !planBoard && !(planRead?.num === planNum && planRead?.run === planRun && !planRead?.plan)} addressed={arrangement.addressed === 'docket'}
          nameOf={planModelName} onAddress={focusBoard} onWrite={writeField} onPick={onPlanPick} onText={onPlanText} onDelete={onPlanDelete} onCondition={onPlanCondition} onWho={onPlanWho} onRun={(n) => runCommand(`open:run ${n}`)}
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
          backupPanel={backupPanel} onBackupDone={endBackup}
          picker={replyPicking && branchShown && targets
            ? { kind: 'reply', members: branchShown.members, targets, line: branchShown.line, onToggle: toggleReplyTarget, onAll: allReplyTargets }
            : picking && stepPick ? { rows: answerRows, now: stepPick.model ? stepWho : null, picked: null, reference: referenceName, forStep: { ...stepPick, branchName: stepBranchWho?.name ?? null } }
            : picking ? { rows: answerRows, now: answerer, picked: heldIds && heldIds.length > 1 ? heldIds : null, reference: referenceName, order: heldOrder, conds: heldConds ?? [], onOrder: onPickOrder, onCond: onPickCond } : null} onPicker={togglePicker} onPickAnswerer={pickAnswerer} onPickerClose={() => { setPicking(false); setReplyPicking(false); setStepPick(null) }}
          frameworkPicker={fwPicking ? { items: frameworkItems } : null} onFrameworkPicker={toggleFwPicker} onToggleFramework={toggleFramework} onFrameworkPickerClose={() => setFwPicking(false)}
          languagePicker={langPicking ? { items: offeredLanguages().map((tag) => ({ tag, draft: isDraft(tag) })), now: i18n.locale } : null} onPickLanguage={(tag) => runCommand(`language:${tag}`)} onLanguagePickerClose={() => setLangPicking(false)} />,
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
