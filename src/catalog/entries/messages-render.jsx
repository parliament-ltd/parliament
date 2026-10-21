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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLingui } from '@lingui/react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronRight, Pin, X } from 'lucide-react'
import MessageList from '../../components/core/MessageList'
import MessageCard from '../../components/core/MessageCard'
import SelectConversationModal from '../../components/SelectConversationModal'
import { useChat } from '../../stores/ChatContext'
import { useConversationId } from '../../stores/ConversationScope'
import { useStreamText, useStreamMessageId, useHiddenIds, usePendingDeletes } from '../../stores/chatHooks'
import { hideMessage, showAllMessages, scheduleDelete, undoDelete } from '../../stores/chatStore'
import { COPY } from '../../copy'
import { useSettings } from '../../stores/SettingsContext'
import { useAnnotations } from '../../stores/AnnotationsContext'
import { useBranchPanel } from '../../stores/BranchPanelContext'
import { useCollabMode } from '../../stores/CollabModeContext'
import { useConversations } from '../../stores/ConversationContext'
import { hasKey } from '../../net'
import {
  deleteMessage as dbDeleteMessage,
  addMessage as dbAddMessage,
  addPin as dbAddPin,
  getPins as dbGetPins,
  deletePin as dbDeletePin,
  createConversation as dbCreateConversation,
  getConversation as dbGetConversation,
} from '../../lib/db'

const SPRING_SNAPPY = { type: 'spring', stiffness: 500, damping: 30 }
const DELETE_UNDO_MS = 20_000

// Why a reply stopped short, said on the reply (C109; stage 4).
const STOPPED = { left: COPY.chat.stoppedOnReply, limit: COPY.chat.cutLimit, error: COPY.chat.cutError }

export default function MessagesRender() {
  // The conversation this board shows, told by the board (stage 3).
  const conversationId = useConversationId()
  const { messages, isStreaming, continueMessage, activeConversationId } = useChat()
  // The reply being written, read from the chat store, so only this list
  // redraws while it streams; the rest of the page does not (stage 3).
  const streamingContent = useStreamText(activeConversationId)
  const streamingMessageId = useStreamMessageId(activeConversationId)
  const { i18n } = useLingui()
  const { settings } = useSettings()
  const {
    favorites, notes, highlights, showNotes,
    toggleFavorite, toggleNotePanel, saveNote, addHighlight,
  } = useAnnotations()
  const { openBranchPanel } = useBranchPanel()
  const { buildSystemPrompt } = useCollabMode()
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
      const systemPrompt = buildSystemPrompt()
      await continueMessage(incompleteId, settings.defaultModel, systemPrompt)
    } catch (err) {
      if (err?.name !== 'AbortError' && import.meta.env.DEV) {
        console.warn('[messages@1.0] continueMessage failed:', err)
      }
    }
  }, [settings.defaultModel, continueMessage, buildSystemPrompt])

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

  const renderCard = useCallback((msg, idx) => {
    // The streaming card is the message the stream fills, by id.
    const isLatestAssistantStreaming = isStreaming && msg.id === streamingMessageId

    const displayContent = isLatestAssistantStreaming ? streamingContent : msg.content
    const isGhost = msg.incomplete && !isLatestAssistantStreaming
    const noteRecord = notes.get(msg.id)
    const isFav = favorites.has(msg.id)

    return (
      <MessageCard
        key={msg.id}
        id={msg.id}
        type={msg.role === 'user' ? 'user' : 'assistant'}
        content={displayContent}
        attachmentMeta={msg.attachmentMeta}
        number={numberByMessageId.get(msg.id) || 0}
        index={idx}
        isGhostText={isGhost}
        stoppedNote={isGhost && Object.hasOwn(STOPPED, msg.stopReason ?? '') ? i18n._(STOPPED[msg.stopReason]) : null}
        source={msg.source ?? null}
        isFavorited={isFav}
        showNotes={showNotes.has(msg.id)}
        savedNoteText={noteRecord?.text || ''}
        highlights={highlights}
        isPopoverActive={activePopoverMsgId === msg.id}
        onPopoverChange={(active) => setActivePopoverMsgId(active ? msg.id : null)}
        onContinue={isGhost ? () => handleContinue(msg.id) : undefined}
        onCopyText={() => handleCopyText(msg.content)}
        onFavorite={() => toggleFavorite(msg.id)}
        onNote={() => toggleNotePanel(msg.id)}
        onNoteSave={(text) => saveNote(msg.id, text)}
        onHighlight={(text, color) => addHighlight(msg.id, text, color)}
        onBranch={() => openBranchPanel(msg.id)}
        onHide={() => handleHide(msg.id)}
        onDelete={() => handleDelete(msg.id)}
        onMoveToBranch={() => handleSendToBranch(msg)}
        onPinForReference={() => handlePinForReference(msg)}
      />
    )
  }, [
    isStreaming, streamingContent, streamingMessageId, i18n,
    numberByMessageId, activePopoverMsgId,
    favorites, notes, highlights, showNotes,
    handleContinue, handleCopyText,
    toggleFavorite, toggleNotePanel, saveNote, addHighlight,
    openBranchPanel,
    handleHide, handleDelete, handleSendToBranch, handlePinForReference,
  ])

  void conversationId

  return (
    <div className="relative h-full flex flex-col">
      {pins.length > 0 && (
        <PinnedReferences pins={pins} onRemove={handleRemovePin} />
      )}

      <MessageList
        messages={visibleMessages}
        renderCard={renderCard}
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
            title={transferModal.mode === 'pin' ? 'Pin to conversation' : 'Send to branch'}
            newChatLabel={
              transferModal.mode === 'pin'
                ? 'New conversation pinned with this reference'
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
          <Pin className="w-3 h-3 text-[#7C6CD4]" />
          <span className="text-[10px] font-medium text-[var(--p-text-secondary)] uppercase tracking-wider">
            Pinned references
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
                  <p className="text-[11px] text-[var(--p-text-primary)] leading-relaxed line-clamp-3">
                    {pin.content}
                  </p>
                  <button
                    type="button"
                    onClick={() => onRemove(pin.id)}
                    className="absolute top-1.5 right-1.5 p-0.5 rounded text-[var(--p-text-muted)] opacity-0 group-hover:opacity-100 hover:text-[var(--p-error,#E03E3E)] transition-all"
                    title="Remove pin"
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
            className="text-xs font-medium text-[#B8A070] hover:text-[var(--p-text-primary)] transition-colors shrink-0"
          >
            Undo
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
