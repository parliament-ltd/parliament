// messages@1.0 — live render component for the V2 RoomShell chat path.
//
// PR-10a.5 wired the live message list, streaming, and ghost-text
// continue. PR-10a.6 added per-message annotation handlers (favorites,
// notes, highlights). PR-10a.7 added the per-message Branch icon.
// PR-10a.9 threaded the collab-mode system prompt through send + continue.
//
// What this slice (PR-10a.10) wires:
//   - Hide message (Eye menu): kept in the chat store for this visit;
//     a hidden message is not shown and not sent (stage 4).
//   - Delete message (trash icon): leaves the chat at once and is not
//     sent; the chat store deletes it after 20s unless Undo is pressed,
//     even if the chat was left meanwhile (stage 4).
//   - Send to branch (ArrowRightCircle menu, formerly "Move to branch"):
//     opens SelectConversationModal; on select, copies the message
//     content into the target conversation's messages.
//   - Pin for reference (Pin menu, V2-new): opens SelectConversationModal;
//     on select, writes a pin record against the target conversation
//     via the existing `pins` IndexedDB store. Renders pins as
//     collapsible quote blocks at the top of the active conversation's
//     message area when pins are present.
//
// What this slice intentionally does NOT wire (Phase 2 / future):
//   - Multi-select "Send to branch" mode for bulk transfer (CLAUDE.md
//     describes this as a selection mode in the parent's UI).
//   - Persistent hide across reloads (a hide lasts for this visit).
//   - Per-message action menu items contributed by other components —
//     contributions ARE aggregated by RoomShell, but the UI surface for
//     contributed actions is still deferred.

import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useLingui } from '@lingui/react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronRight, Quote, X } from 'lucide-react'
import MessageList from '../../components/core/MessageList'
import MessageCard from '../../components/core/MessageCard'
import EditableMessages from '../../components/core/EditableMessages'
import { HIGHLIGHT_COLORS } from '../../lib/constants'
import { stripAttachedFileBlocks } from '../../lib/fileUpload'
import { useChatEdits } from '../../stores/useChatEdits'
import { settleAsk as dbSettleAsk, settleSuggestion as dbSettleSuggestion } from '../../lib/db'
const NO_ASK_INFO = new Map()
import { waiting as editWaits, tellsOf } from '../../editing/told'
import { withoutAnswers } from '../../editing/answers'
import BranchSlider from '../../components/core/BranchSlider'
import { lineItems, membersOf } from '../../lib/branchGroups'
import { usePlanOf, waitingIn } from '../../stores/usePlanOf'
import { contextShare } from '../../lib/branchSummary'
import { answerFor } from '../../lib/included'
import { promptFacts } from '../../lib/branchVerbs'
import { LOCAL_READS } from '../../shell/estimate'
import { subscribe as onChatStore } from '../../stores/chatStore'
import SelectConversationModal from '../../components/SelectConversationModal'
import { useRoomChat } from '../../stores/useRoomChat'
import { useConversationId } from '../../stores/ConversationScope'
import { useStreamText, useStreamMessageId, useHiddenIds, usePendingDeletes, useStreamThinking, useStreamAnswering } from '../../stores/chatHooks'
import { getStream } from '../../stores/chatStore'
import { hideMessage, showAllMessages, scheduleDelete, undoDelete } from '../../stores/chatStore'
import { COPY } from '../../copy'
import { useSettings } from '../../stores/SettingsContext'
import { useAnnotations } from '../../stores/AnnotationsContext'

// No quoted passages: one list, so a message without any draws once.
const NO_QUOTES = Object.freeze([])
import { useConversations } from '../../stores/ConversationContext'
import { hasKey, modelFacts, destination } from '../../net'
import { RoomHost } from '../../lib/useViewportWidth'
import {
  deleteMessage as dbDeleteMessage,
  addMessage as dbAddMessage,
  addPin as dbAddPin,
  getPins as dbGetPins,
  deletePin as dbDeletePin,
  createConversation as dbCreateConversation,
  getConversation as dbGetConversation,
  getMessages as dbGetMessages,
  getDocket as dbGetDocket,
} from '../../lib/db'
import { onRecordsChanged } from '../../lib/records'
import { watchAcross } from '../../editing/across'

const SPRING_SNAPPY = { type: 'spring', stiffness: 500, damping: 30 }

const byTime = (a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0)

// The other branches of the prompts this chat sent to several (stage 8,
// piece 2; C173): read from their own chats, again whenever one starts or
// stops writing, and watched while shown, so leaving one tab for another,
// or the room moving to a branch, never stops one still writing.
function useBranchMembers(ids, watchConversation) {
  const [members, setMembers] = useState(() => new Map())
  const key = ids.join('|')
  useEffect(() => {
    if (!key) return undefined
    const list = key.split('|')
    let live = true
    const load = async (id) => {
      const msgs = await dbGetMessages(id).catch(() => null)
      if (!live) return
      setMembers((prev) => {
        const next = new Map(prev)
        if (msgs) next.set(id, [...msgs].sort(byTime))
        else next.delete(id)
        return next
      })
    }
    list.forEach(load)
    const offs = list.map((id) => onChatStore(`status:${id}`, () => load(id)))
    const unwatch = list.map((id) => watchConversation(id))
    return () => { live = false; offs.forEach((f) => f()); unwatch.forEach((f) => f()) }
  }, [key, watchConversation])
  return members
}
const DELETE_UNDO_MS = 20_000

// Why a reply stopped short, said on the reply (C109; stage 4).
const STOPPED = { left: COPY.chat.stoppedOnReply, limit: COPY.chat.cutLimit, error: COPY.chat.cutError }

// A finished reply is edited in place (stage 11): a model's, and a source's
// answer too, read as plain text, whose edits go to a model and never to the
// source (the editing spec; the spike's 201b). Not one still arriving or cut
// off, a source's list of results, or an answer shown translated.
const editableReply = (m, streamingId) => m.role === 'assistant' && m.id !== streamingId && !m.incomplete && Boolean(m.content)
  && (!m.source || (m.source.shape !== 'list' && !m.translation))

export default function MessagesRender() {
  // The conversation this board shows, told by the board (stage 3).
  const conversationId = useConversationId()
  const { messages, isStreaming, continueMessage, activeConversationId, watchConversation, saveEditedReply } = useRoomChat()
  // The reply being written, read from the chat store, so only this list
  // redraws while it streams; the rest of the page does not (stage 3).
  const streamingContent = useStreamText(activeConversationId)
  const streamingMessageId = useStreamMessageId(activeConversationId)
  // A model's thinking as it goes, and whether its answer has begun (C165).
  const streamingThinking = useStreamThinking(activeConversationId)
  const streamingAnswering = useStreamAnswering(activeConversationId)
  const { i18n } = useLingui()
  const { settings } = useSettings()
  const {
    favorites, notes, highlights, showNotes,
    toggleFavorite, toggleNotePanel, saveNote, addHighlight,
  } = useAnnotations()
  // The room board this draws in: its chat's frameworks and reply language,
  // for Continue (stage 13, piece 8; C251 (d)).
  const roomHost = useContext(RoomHost)
  const { conversations, loadConversations } = useConversations()

  const containerRef = useRef(null)
  const bottomRef = useRef(null)
  const [activePopoverMsgId, setActivePopoverMsgId] = useState(null)

  // ─── Hide / delete, kept in the chat store (stage 4) ─────
  //
  // Hidden messages and messages waiting to be deleted are kept by chat in
  // the chat store, so a send leaves them out: what is sent is what is
  // shown. A hide lasts for this visit to the app. A delete waits 20s for
  // Undo and then happens, even if the chat was left meanwhile.
  const hiddenIds = useHiddenIds(activeConversationId)
  const pendingDeletes = usePendingDeletes(activeConversationId)

  const visibleMessages = useMemo(() => {
    const deleting = new Set(pendingDeletes.map(p => p.messageId))
    return messages.filter(m => !hiddenIds.has(m.id) && !deleting.has(m.id))
  }, [messages, hiddenIds, pendingDeletes])

  const handleHide = useCallback((msgId) => {
    if (activeConversationId) hideMessage(activeConversationId, msgId)
  }, [activeConversationId])

  const handleShowHidden = useCallback(() => {
    if (activeConversationId) showAllMessages(activeConversationId)
  }, [activeConversationId])

  const handleDelete = useCallback((msgId) => {
    if (!activeConversationId) return
    scheduleDelete(activeConversationId, msgId, { remove: dbDeleteMessage, ms: DELETE_UNDO_MS })
  }, [activeConversationId])

  const handleUndoDelete = useCallback((msgId) => {
    if (activeConversationId) undoDelete(activeConversationId, msgId)
  }, [activeConversationId])

  // ─── Send to branch / Pin for reference state ─────────────
  //
  // One modal serves both flows. `transferModal` is null when closed,
  // otherwise { mode: 'send' | 'pin', message } where message is the
  // record being acted on.
  const [transferModal, setTransferModal] = useState(null)

  const handleSendToBranch = useCallback((msg) => {
    setTransferModal({ mode: 'send', message: msg })
  }, [])

  // ─── Pinned references for the active conversation ────────
  //
  // Loaded on conversation switch + after any pin write that targets
  // the active conversation. Renders as a collapsible list above the
  // message stream.
  const [pins, setPins] = useState([])
  const refreshPins = useCallback(async () => {
    if (!activeConversationId) {
      setPins([])
      return
    }
    try {
      const list = await dbGetPins(activeConversationId)
      setPins(list || [])
    } catch {
      setPins([])
    }
  }, [activeConversationId])

  useEffect(() => {
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect -- messages move into the store in stage 4
    refreshPins().catch(() => {})
    void cancelled
  }, [refreshPins])
  // A quote made or changed elsewhere (the heart, tagadd:, another tab) shows here too (C147).
  useEffect(() => onRecordsChanged((c) => { if (c.kind === 'quote') refreshPins().catch(() => {}) }), [refreshPins])

  const handlePinForReference = useCallback((msg) => {
    setTransferModal({ mode: 'pin', message: msg })
  }, [])

  const closeTransferModal = useCallback(() => setTransferModal(null), [])

  const onTransferSelect = useCallback(async (targetConvId) => {
    const t = transferModal
    if (!t) return
    if (t.mode === 'send') {
      try {
        await dbAddMessage({
          conversationId: targetConvId,
          role: t.message.role,
          content: t.message.content,
        })
      } catch (err) {
        if (import.meta.env.DEV) console.warn('[messages@1.0] send-to-branch failed:', err)
      }
    } else if (t.mode === 'pin') {
      try {
        await dbAddPin({
          targetConversationId: targetConvId,
          sourceConversationId: activeConversationId,
          sourceMessageId: t.message.id,
          content: t.message.content,
        })
        // Refresh local pins if we're pinning into the active conversation
        if (targetConvId === activeConversationId) {
          await refreshPins()
        }
      } catch (err) {
        if (import.meta.env.DEV) console.warn('[messages@1.0] pin-for-reference failed:', err)
      }
    }
    setTransferModal(null)
  }, [transferModal, activeConversationId, refreshPins])

  const onTransferNewChat = useCallback(async () => {
    const t = transferModal
    if (!t) return
    try {
      const source = activeConversationId ? await dbGetConversation(activeConversationId) : null
      const conv = await dbCreateConversation({
        title: `From: ${source?.title || 'conversation'}`,
        model: source?.model || settings.defaultModel,
        room: source?.room ?? null,
      })
      if (t.mode === 'send') {
        await dbAddMessage({
          conversationId: conv.id,
          role: t.message.role,
          content: t.message.content,
        })
      } else {
        await dbAddPin({
          targetConversationId: conv.id,
          sourceConversationId: activeConversationId,
          sourceMessageId: t.message.id,
          content: t.message.content,
        })
      }
      await loadConversations()
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[messages@1.0] new-chat-from-message failed:', err)
    }
    setTransferModal(null)
  }, [transferModal, activeConversationId, settings.defaultModel, loadConversations])


  // Quote (C145 (a)): a passage kept beside its own chat, numbered, never
  // sent. Stored with the quotes "Pin for reference" makes (A23).
  const handleQuote = useCallback(async (msg, text) => {
    const words = String(text ?? '').trim()
    if (!activeConversationId || !words) return
    try {
      await dbAddPin({ targetConversationId: activeConversationId, sourceConversationId: activeConversationId, sourceMessageId: msg.id, content: words })
      await refreshPins()
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[messages@1.0] quote failed:', err)
    }
  }, [activeConversationId, refreshPins])

  // Each message's quoted passages, to mark where they sit (C145 (b)). A
  // pinned copy of a whole message is not a passage.
  const quotesByMessage = useMemo(() => {
    const out = new Map()
    for (const p of pins) {
      if (p.num == null || p.sourceConversationId !== activeConversationId || !p.sourceMessageId || !p.content) continue
      if (!out.has(p.sourceMessageId)) out.set(p.sourceMessageId, [])
      out.get(p.sourceMessageId).push({ num: p.num, text: p.content })
    }
    return out
  }, [pins, activeConversationId])

  const handleRemovePin = useCallback(async (pinId) => {
    try { await dbDeletePin(pinId) } catch { /* tolerate */ }
    setPins(prev => prev.filter(p => p.id !== pinId))
  }, [])

  // ─── Auto-scroll + numbering ─────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: isStreaming ? 'auto' : 'smooth' })
  }, [messages, streamingContent, isStreaming])

  const handleContinue = useCallback(async (incompleteId) => {
    try {
      // The gateway picks the key; here only whether there is one (stage 4).
      if (!(await hasKey())) return
      const systemPrompt = roomHost?.systemFor?.(activeConversationId) ?? ''
      await continueMessage(incompleteId, settings.defaultModel, systemPrompt)
    } catch (err) {
      if (err?.name !== 'AbortError' && import.meta.env.DEV) {
        console.warn('[messages@1.0] continueMessage failed:', err)
      }
    }
  }, [settings.defaultModel, continueMessage, roomHost, activeConversationId])

  const handleCopyText = useCallback(async (content) => {
    try {
      await navigator.clipboard.writeText(content)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = content
      document.body.appendChild(textarea)
      textarea.select()
      try { document.execCommand('copy') } catch { /* nothing more we can do */ }
      document.body.removeChild(textarea)
    }
  }, [])

  const numberByMessageId = useMemo(() => {
    const m = new Map()
    let userCount = 0
    let assistantCount = 0
    for (const msg of messages) {
      if (msg.role === 'user') {
        userCount++
        m.set(msg.id, userCount)
      } else if (msg.role === 'assistant') {
        assistantCount++
        m.set(msg.id, assistantCount)
      }
    }
    return m
  }, [messages])

  // ── Branches (stage 8, piece 2; C173) ────────────────────
  // Where a prompt here went to several, its replies are a slider of tabs.
  const memberIds = useMemo(() => membersOf(visibleMessages, activeConversationId), [visibleMessages, activeConversationId])
  const members = useBranchMembers(memberIds, watchConversation)
  const lineChat = useMemo(() => conversations.find((c) => c.id === activeConversationId) ?? null, [conversations, activeConversationId])
  // Branches sent to one after another whose turn has not come (C202).
  const linePlan = usePlanOf(lineChat?.docketId ?? null)
  // The edits of this chat and its branches on screen (stage 11, piece 3;
  // C216): which were told and are closed, which wait, and who was told.
  const chatEdits = useChatEdits([activeConversationId, ...memberIds])
  const closedEdits = useMemo(() => new Set([...chatEdits.values()].flat().filter((r) => r.sent).map((r) => r.edit)), [chatEdits])
  const toldToOf = useCallback((msg) => {
    if (msg.role !== 'user' || !msg.told) return null
    const r = [...chatEdits.values()].flat().find((e) => e.sent?.prompt === msg.id)
    return r ? (modelFacts(r.sent.to)?.name ?? r.sent.to) : null
  }, [chatEdits])
  // Asks (piece 4; C218): each marker's number and state, by message and
  // ask id; accepting or undoing one recorded.
  const chatAsks = useChatEdits([activeConversationId, ...memberIds], 'asks')
  const askInfoOf = useMemo(() => {
    const byMessage = new Map()
    for (const r of [...chatAsks.values()].flat()) {
      if (!byMessage.has(r.messageId)) byMessage.set(r.messageId, new Map())
      byMessage.get(r.messageId).set(r.edit, { num: r.num, state: r.state })
    }
    return (messageId) => byMessage.get(messageId) ?? NO_ASK_INFO
  }, [chatAsks])
  const settleAskOf = useCallback((messageId, askId, how) => {
    dbSettleAsk(`${messageId}:${askId}`, how === 'accept' ? 'accepted' : 'taken back').catch(() => {})
  }, [])
  // Suggestions (stage 12, piece 1; C229): each marker's number, by message
  // and suggestion id; accepting or rejecting one in place recorded.
  const chatSuggestions = useChatEdits([activeConversationId, ...memberIds], 'suggestions')
  const sugInfoOf = useMemo(() => {
    const byMessage = new Map()
    for (const r of [...chatSuggestions.values()].flat()) {
      if (r.state !== 'open') continue
      if (!byMessage.has(r.messageId)) byMessage.set(r.messageId, new Map())
      byMessage.get(r.messageId).set(r.mark, { num: r.num })
    }
    return (messageId) => byMessage.get(messageId) ?? NO_ASK_INFO
  }, [chatSuggestions])
  const settleSugOf = useCallback((messageId, sugId, how) => {
    dbSettleSuggestion(`${messageId}:${sugId}`, how === 'accept' ? 'accepted' : 'rejected').catch(() => {})
  }, [])
  // Suggestions waiting in a branch, counted in rust on its tab (C231 (g)).
  const suggestionsOpenIn = useCallback((chatId) => (chatSuggestions.get(chatId) ?? []).filter((r) => r.state === 'open').length, [chatSuggestions])
  const sugWords = useMemo(() => ({
    ripple: i18n._(COPY.chat.sugRipple), sweep: i18n._(COPY.chat.sugSweep), accept: i18n._(COPY.chat.sugAccept), reject: i18n._(COPY.chat.sugReject),
  }), [i18n])
  const askWords = useMemo(() => ({
    label: i18n._(COPY.chat.askLabel), placeholder: i18n._(COPY.chat.askPlaceholder),
    ask: i18n._(COPY.chat.askMarker), accept: i18n._(COPY.chat.askAccept), undo: i18n._(COPY.chat.askUndo),
  }), [i18n])
  const editsWaitingIn = useCallback((chatId) => (chatEdits.get(chatId) ?? []).filter(editWaits).length, [chatEdits])
  const items = useMemo(() => lineItems(visibleMessages, activeConversationId, members, (chatId, groupId) => waitingIn(linePlan, chatId, groupId)), [visibleMessages, activeConversationId, members, linePlan])
  const [planNum, setPlanNum] = useState(null)
  useEffect(() => {
    let live = true
    if (!lineChat?.docketId) return undefined
    dbGetDocket(lineChat.docketId).then((d) => { if (live) setPlanNum(d?.num ?? null) }, () => {})
    return () => { live = false }
  }, [lineChat?.docketId])
  // A fork from a message (C178; C251 (c)): new:branch with the chat's
  // address in its plan, else its number, and the step it ends, written into
  // the bar for Enter. From a prompt, the fork ends before it, so it can be
  // asked differently. The branch panel went with R26.
  const hosted = useContext(RoomHost) != null
  const branchFrom = useCallback((msg) => {
    const at = messages.findIndex((m) => m.id === msg.id)
    const address = planNum != null && lineChat?.branch ? `${planNum}${lineChat.branch}` : lineChat?.num ?? null
    if (at < 0 || address == null) return
    const step = messages.slice(0, at + 1).filter((m) => m.role === 'user').length - (msg.role === 'user' ? 1 : 0)
    window.dispatchEvent(new CustomEvent('parliament-write', { detail: { value: `>new:branch ${address} ${step}` } }))
  }, [messages, planNum, lineChat?.branch, lineChat?.num])
  // The summary a branch starts from: the branch it summarizes and who wrote it (C175).
  const summaryInfo = useCallback((msg) => {
    if (msg.role !== 'assistant' || !msg.summary) return null
    const of = conversations.find((c) => c.id === msg.summary.of)
    const address = planNum != null && of?.branch && of.docketId === lineChat?.docketId ? `${planNum}${of.branch}` : null
    return { address, name: modelFacts(msg.model)?.name ?? null }
  }, [conversations, planNum, lineChat?.docketId])

  // What a card shows and does, for a message: drawn on its own, or by the
  // editor of a prompt and its reply (stage 11, piece 2).
  const cardPropsOf = useCallback((msg, idx) => {
    // The streaming card is the message the stream fills, by id.
    const isLatestAssistantStreaming = isStreaming && msg.id === streamingMessageId

    const displayContent = isLatestAssistantStreaming ? streamingContent : msg.content
    const isGhost = msg.incomplete && !isLatestAssistantStreaming
    // What it thought: live while it streams, kept with it after (C165).
    const thinking = isLatestAssistantStreaming
      ? (streamingThinking ? { text: streamingThinking, live: true, answering: streamingAnswering, since: getStream(activeConversationId)?.thinkingAt ?? null } : null)
      : (msg.role === 'assistant' && msg.thinking ? { text: msg.thinking, ms: msg.thinkingMs ?? null } : null)
    const noteRecord = notes.get(msg.id)
    const isFav = favorites.has(msg.id)
    // A finished reply from a model is edited in place (stage 11, piece 1);
    // one still arriving, cut off, or from a source is not.
    const editable = !isGhost && editableReply(msg, isLatestAssistantStreaming ? msg.id : null)

    return {
      id: msg.id,
      type: msg.role === 'user' ? 'user' : 'assistant',
      // Answers to asks land where they were asked, not in this reply (C218 (b)).
      content: msg.role === 'assistant' && !msg.source ? withoutAnswers(displayContent) : displayContent,
      attachmentMeta: msg.attachmentMeta,
      number: numberByMessageId.get(msg.id) || 0,
      index: idx,
      isGhostText: isGhost,
      stoppedNote: isGhost && Object.hasOwn(STOPPED, msg.stopReason ?? '') ? i18n._(msg.stopReason === 'error' && !msg.content ? COPY.chat.cutErrorEmpty : STOPPED[msg.stopReason]) : null,
      source: msg.source ?? null,
      frameworks: msg.role === 'assistant' ? msg.frameworks ?? null : null,
      translation: msg.role === 'assistant' ? msg.translation ?? null : null,
      citations: msg.role === 'assistant' ? msg.citations ?? null : null,
      asked: msg.role === 'user' ? msg.asked ?? null : null,
      included: msg.role === 'user' ? msg.included ?? null : null,
      tells: msg.role === 'user' ? tellsOf(msg.told) : null,
      summary: summaryInfo(msg),
      thinking,
      isFavorited: isFav,
      showNotes: showNotes.has(msg.id),
      savedNoteText: noteRecord?.text || '',
      highlights,
      quotes: quotesByMessage.get(msg.id) ?? NO_QUOTES,
      isPopoverActive: activePopoverMsgId === msg.id,
      onPopoverChange: (active) => setActivePopoverMsgId(active ? msg.id : null),
      onContinue: isGhost ? () => handleContinue(msg.id) : undefined,
      onCopyText: () => handleCopyText(msg.content),
      onFavorite: () => toggleFavorite(msg.id),
      onNote: () => toggleNotePanel(msg.id),
      onNoteSave: (text) => saveNote(msg.id, text),
      onHighlight: (text, color) => addHighlight(msg.id, text, color),
      onBranch: () => branchFrom(msg),
      onHide: () => handleHide(msg.id),
      onDelete: () => handleDelete(msg.id),
      onMoveToBranch: () => handleSendToBranch(msg),
      onPinForReference: () => handlePinForReference(msg),
      onQuote: (text) => handleQuote(msg, text),
      editable,
      blocks: msg.blocks ?? null,
      onSaveEdits: editable ? (saved) => saveEditedReply(activeConversationId, msg.id, saved) : undefined,
      clean: settings.markup === 'off',
      closedEdits,
      toldTo: toldToOf(msg),
      askInfo: askInfoOf(msg.id),
      onSettleAsk: (askId, how) => settleAskOf(msg.id, askId, how),
      askWords,
      sugInfo: sugInfoOf(msg.id),
      onSettleSuggestion: (sugId, how) => settleSugOf(msg.id, sugId, how),
      sugWords,
    }
  }, [
    saveEditedReply, settings.markup, closedEdits, toldToOf, askInfoOf, settleAskOf, askWords, sugInfoOf, settleSugOf, sugWords,
    isStreaming, streamingContent, streamingMessageId, streamingThinking, streamingAnswering, activeConversationId, i18n,
    numberByMessageId, activePopoverMsgId,
    favorites, notes, highlights, showNotes,
    handleContinue, handleCopyText,
    toggleFavorite, toggleNotePanel, saveNote, addHighlight,
    handleHide, handleDelete, handleSendToBranch, handlePinForReference,
    handleQuote, quotesByMessage, summaryInfo, branchFrom,
  ])

  const renderCard = useCallback((msg, idx) => <MessageCard key={msg.id} {...cardPropsOf(msg, idx)} />, [cardPropsOf])

  // ── Prompts edited in place (stage 11, piece 2; C214) ──────
  // A prompt and its finished reply are one editor, so a selection can run
  // from one into the other; a prompt with no finished reply under it, or
  // with the tabs of several branches under it, is edited on its own.
  const replyEditable = useCallback((m) => editableReply(m, isStreaming ? streamingMessageId : null), [isStreaming, streamingMessageId])
  const paired = useMemo(() => {
    const out = []
    for (let i = 0; i < items.length; i++) {
      const m = items[i]
      const prompt = !m.kind && m.role === 'user' && typeof m.content === 'string' && stripAttachedFileBlocks(m.content).trim() !== ''
      if (!prompt) { out.push(m); continue }
      const next = items[i + 1]
      const reply = next && !next.kind && replyEditable(next) ? next : null
      out.push({ kind: 'pair', key: `pair-${m.id}`, id: m.id, prompt: m, reply })
      if (reply) i++
    }
    return out
  }, [items, replyEditable])

  // Highlights as every card finds them, by their words.
  const highlightTerms = useMemo(() => {
    const seen = new Map()
    for (const hl of highlights) {
      const key = hl.text.toLowerCase()
      if (!seen.has(key)) seen.set(key, { text: hl.text, bg: HIGHLIGHT_COLORS.find((c) => c.color === hl.color)?.bg || 'rgba(184,160,112,0.18)' })
    }
    return [...seen.values()]
  }, [highlights])

  // Under an edited prompt (the editing spec): its branch, edited; the other
  // branches keep theirs; ask again as the plan's next letter (again:).
  const editedLineOf = useCallback((prompt) => {
    const marked = Array.isArray(prompt.blocks) && prompt.blocks.some((b) => b?.struck != null || (Array.isArray(b?.text) && b.text.some((r) => r?.struck != null || r?.added != null)))
    const address = planNum != null && lineChat?.branch ? `${planNum}${lineChat.branch}` : null
    if (!marked || !address) return null
    const family = lineChat?.docketId ? conversations.filter((c) => c.docketId === lineChat.docketId && c.branch) : []
    const others = family.length > 1
    const top = family.reduce((n, c) => Math.max(n, c.branch.charCodeAt(0)), 0)
    const next = top ? `${planNum}${String.fromCharCode(top + 1)}` : null
    return (
      <p className="p-marg">
        {i18n._(COPY.chat.promptEdited, { address })}
        {others && <>; {i18n._(COPY.chat.promptEditedOthers)}</>}
        {hosted && (
          <>
            <span className="sep" aria-hidden="true"> · </span>
            <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('parliament-write', { detail: { value: `>again:${address}` } }))}>
              {next ? i18n._(COPY.chat.askAgainAs, { next }) : i18n._(COPY.chat.askAgain)}
            </button>
          </>
        )}
      </p>
    )
  }, [planNum, lineChat, conversations, hosted, i18n])

  // The asks of both cards of a pair, by ask id.
  const pairAsks = useCallback((sections) => new Map(sections.flatMap((s) => [...askInfoOf(s.message.id)])), [askInfoOf])
  const pairSugs = useCallback((sections) => new Map(sections.flatMap((s) => [...sugInfoOf(s.message.id)])), [sugInfoOf])

  const renderPair = useCallback((item, idx) => {
    const { prompt, reply } = item
    const sections = [{ part: 'prompt', message: prompt, card: cardPropsOf(prompt, idx), quotes: quotesByMessage.get(prompt.id) ?? NO_QUOTES, editedLine: editedLineOf(prompt) }]
    if (reply) sections.push({ part: 'reply', message: reply, plain: Boolean(reply.source), card: cardPropsOf(reply, idx), quotes: quotesByMessage.get(reply.id) ?? NO_QUOTES })
    return (
      <EditableMessages
        key={item.key}
        sections={sections}
        terms={highlightTerms}
        quotedTitle={(num) => i18n._(COPY.chat.quoted, { num })}
        clean={settings.markup === 'off'}
        onSave={(messageId, saved) => saveEditedReply(activeConversationId, messageId, saved)}
        words={{ joined: i18n._(COPY.chat.joinedToBar), label: i18n._(COPY.chat.pairLabel) }}
        closedEdits={closedEdits}
        askInfo={pairAsks(sections)}
        onSettleAsk={settleAskOf}
        askWords={askWords}
        sugInfo={pairSugs(sections)}
        onSettleSuggestion={settleSugOf}
        sugWords={sugWords}
      />
    )
  }, [cardPropsOf, quotesByMessage, editedLineOf, highlightTerms, i18n, settings.markup, saveEditedReply, activeConversationId, closedEdits, settleAskOf, askWords, pairAsks, pairSugs, settleSugOf, sugWords])

  // A tab's letter, who answered, and the branch's address (203b).
  const infoOf = useCallback((chatId, tab) => {
    const chat = conversations.find((c) => c.id === chatId)
    const reply = tab.reply.find((m) => m.role === 'assistant')
    const name = reply?.source?.name ?? modelFacts(reply?.model)?.name ?? modelFacts(chat?.answerer)?.name ?? destination(chat?.answerer)?.name ?? i18n._(COPY.branches.unknown)
    const letter = chat?.branch ?? null
    // How much of what its model reads at once the branch fills, and about
    // what a summary would, worked out here (slider v9; C175).
    const whoId = chat?.answerer ?? chat?.model ?? null
    const facts = modelFacts(whoId)
    const window = facts ? (destination(facts.provider)?.kind === 'local' ? LOCAL_READS : facts.contextWindow) : null
    const list = chatId === activeConversationId ? visibleMessages : members.get(chatId) ?? []
    const chars = list.reduce((n, m) => n + (m.content && !m.source ? m.content.length : 0), 0)
    // Its last answer from a source, for include: (C176).
    return { letter, name, address: planNum != null && letter ? `${planNum}${letter}` : null, context: contextShare(chars, window), answer: answerFor(list), prompt: promptFacts(list), steps: list.filter((m) => m.role === 'user').length, waiting: editsWaitingIn(chatId), suggesting: suggestionsOpenIn(chatId) }
  }, [conversations, planNum, i18n, activeConversationId, visibleMessages, members, editsWaitingIn, suggestionsOpenIn])
  // A message of another branch is numbered as in its own chat.
  const numberOf = useCallback((chatId, msg) => {
    const list = members.get(chatId) ?? []
    const at = list.findIndex((x) => x.id === msg.id)
    return at < 0 ? 0 : list.slice(0, at + 1).filter((x) => x.role === msg.role).length
  }, [members])
  // A message, or the tabs of a prompt sent to several; the line's own tab
  // draws its thread the same way, so a later prompt there to several gets
  // tabs of its own (again:, C177).
  function renderItem(item, idx) {
    if (item.kind === 'pair') return renderPair(item, idx)
    return item.kind === 'slider'
      ? <BranchSlider key={item.key} item={item} line={activeConversationId} infoOf={infoOf} renderLine={renderItem} numberOf={numberOf} />
      : renderCard(item, idx)
  }

  void conversationId

  // A selection dragged from one card into another (C280 (d); editing/across.js).
  const chatRef = useRef(null)
  useEffect(() => watchAcross(chatRef.current), [])

  return (
    <div className="relative h-full flex flex-col" ref={chatRef}>
      {pins.length > 0 && (
        <PinnedReferences pins={pins} onRemove={handleRemovePin} />
      )}

      <MessageList
        messages={paired}
        renderCard={renderItem}
        hiddenCount={messages.filter(m => hiddenIds.has(m.id)).length}
        onShowHidden={handleShowHidden}
        isStreaming={isStreaming}
        containerRef={containerRef}
        bottomRef={bottomRef}
      />

      <UndoBanner
        pendingDeletes={pendingDeletes}
        onUndo={handleUndoDelete}
      />

      <AnimatePresence>
        {transferModal && (
          <SelectConversationModal
            conversations={conversations}
            currentId={activeConversationId}
            title={transferModal.mode === 'pin' ? i18n._(COPY.chat.quoteWhichChat) : 'Send to branch'}
            newChatLabel={
              transferModal.mode === 'pin'
                ? i18n._(COPY.chat.quoteNewChat)
                : 'New conversation with this message'
            }
            onClose={closeTransferModal}
            onSelect={onTransferSelect}
            onNewChat={onTransferNewChat}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── PinnedReferences ────────────────────────────────────────
//
// Renders the conversation's pinned references as a collapsible block
// at the top of the message area. Each pin shows a quoted preview of
// the source message's content + a small remove (X) affordance. Pins
// are visual-only — Claude does not see them on subsequent sends.

function PinnedReferences({ pins, onRemove }) {
  const { i18n } = useLingui()
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="mx-4 mt-3 mb-1 rounded-lg border border-[var(--p-border)] bg-[var(--p-bg-subtle)]">
      <button
        type="button"
        onClick={() => setExpanded(prev => !prev)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left hover:bg-[var(--p-hover-bg)] transition-colors"
      >
        <div className="flex items-center gap-2">
          {expanded
            ? <ChevronDown className="w-3 h-3 text-[var(--p-text-secondary)]" />
            : <ChevronRight className="w-3 h-3 text-[var(--p-text-secondary)]" />}
          <Quote className="w-3 h-3 text-[#7C6CD4]" />
          <span className="text-[10px] font-medium text-[var(--p-text-secondary)] uppercase tracking-wider" title={i18n._(COPY.chat.quotesHelp)}>
            {i18n._(COPY.chat.quotesHere)}
          </span>
          <span className="text-[10px] text-[#7C6CD4]">({pins.length})</span>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={SPRING_SNAPPY}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2">
              {pins.map(pin => (
                <div
                  key={pin.id}
                  className="group relative rounded-md border border-[var(--p-border)] bg-white px-3 py-2"
                >
                  <p className="text-[11px] text-[var(--p-text-primary)] leading-relaxed line-clamp-3" dir="auto">
                    {pin.content}
                  </p>
                  {pin.num != null && (
                    <p className="mt-1 text-[10px] font-mono text-[var(--p-text-muted)]">
                      {pin.num}{(pin.tags ?? []).length > 0 && ` · ${pin.tags.join(', ')}`}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => onRemove(pin.id)}
                    className="absolute top-1.5 right-1.5 p-0.5 rounded text-[var(--p-text-muted)] opacity-0 group-hover:opacity-100 hover:text-[var(--p-error,#E03E3E)] transition-all"
                    title={i18n._(COPY.chat.quoteRemove)}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── UndoBanner ─────────────────────────────────────────────
//
// Inline banner that appears when there's a pending delete. Mirrors V1
// Albatross's bottom-of-message-area toast. Shows a single Undo
// affordance for the most-recent delete; hitting it cancels the
// scheduled db.delete and unhides the message. Multiple pending
// deletes show a count.

function UndoBanner({ pendingDeletes, onUndo }) {
  return (
    <AnimatePresence>
      {pendingDeletes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={SPRING_SNAPPY}
          className="mx-4 mb-2 px-4 py-3 rounded-lg border border-[var(--p-border)] bg-white shadow-sm flex items-center justify-between gap-3"
        >
          <span className="text-xs text-[var(--p-text-secondary)]">
            {pendingDeletes.length === 1
              ? 'Message deleted'
              : `${pendingDeletes.length} messages deleted`}
          </span>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onUndo(pendingDeletes[pendingDeletes.length - 1].messageId)}
            className="text-xs font-medium text-[var(--p-text-primary)] underline underline-offset-2 shrink-0"
          >
            Undo
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
