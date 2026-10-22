// branches@1.0 — live render for the V2 RoomShell chat path.
//
// PR-10a.7. Self-binds to ChatContext + ConversationContext per
// refactor/v2-phase1-audit.md §2.8a. Owns the BranchCreationPanel
// modal per audit decision NQ-5.8.
//
// What this slice wires:
//   - Side-rail BranchList shows the active conversation's children
//     (parentId === activeConversationId) plus a row for the current
//     thread; clicking a row navigates to that conversation.
//   - "Compress Context" action — opens the panel anchored to the
//     latest message. Same behavior as the V1 Albatross right-rail
//     surface and the Cmd/Ctrl+Shift+B shortcut (handled by the panel
//     provider — see App.jsx).
//   - BranchCreationPanel renders when the shared BranchPanelContext
//     reports an open message id. The panel offers Full History or
//     Compressed Summary mode; lazy preview generation fires only on
//     explicit user click. On create: writes to IndexedDB, navigates
//     to the new conversation.
//
// Why this owns the modal but NOT the open-state: the per-message
// GitBranch icon in messages@1.0 needs to open the panel too, and a
// per-room render (the messages component is in `msg-area`, the
// branches component is in `left-rail`) can't easily reach across.
// BranchPanelContext (mounted at App.jsx alongside AnnotationsContext)
// gives both surfaces a small shared dispatch handle without expanding
// the hostAPI bus past its three-event Phase 1 cap.
//
// Keyboard shortcut: Cmd/Ctrl+Shift+B opens the panel anchored to the
// latest message. The handler lives in App.jsx so it works app-wide on
// /chat/:id even if branches@1.0 isn't mounted in the active room — a
// user with the Quiet Room template still wants their shortcut to
// branch.

import { useCallback, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Activity } from 'lucide-react'
import BranchList from '../../components/core/BranchList'
import BranchCreationPanel from '../../components/BranchCreationPanel'
import { useChat } from '../../stores/ChatContext'
import { useConversations } from '../../stores/ConversationContext'
import { useSettings } from '../../stores/SettingsContext'
import { useBranchPanel } from '../../stores/BranchPanelContext'
import { gateway, hasKey, models as providerModels, findModel, DEFAULT_MODEL_PROVIDER as PROVIDER } from '../../net'
import {
  createBranch,
  createConversation,
  addMessage,
  getConversation,
} from '../../lib/db'

// Same prompt body the V1 Albatross adapter used. Scoped to under
// 200 words and "key decisions, conclusions, open questions" per
// CLAUDE.md §"Compression at Branch Time".
const SUMMARY_PROMPT =
  'Provide a concise summary of our conversation so far. Focus on key decisions, ' +
  'conclusions, and open questions. Keep it under 200 words. Respond with ONLY the ' +
  'summary, no preamble.'

const DEFAULT_CONTEXT_WINDOW = 200_000

export default function BranchesRender({ config = {} } = {}) {
  const navigate = useNavigate()
  const { messages, tokenUsage, activeConversationId } = useChat()
  const { conversations, loadConversations } = useConversations()
  const { settings } = useSettings()
  const { openForMessageId, openBranchPanel, closeBranchPanel } = useBranchPanel()

  // Active conversation record (for parentId / branchPoint display) +
  // its branches. Cheap to derive — the conversations list is already
  // in memory from ConversationContext.
  const currentConversation = useMemo(
    () => conversations.find(c => c.id === activeConversationId) || null,
    [conversations, activeConversationId]
  )

  const branches = useMemo(() => {
    if (!activeConversationId) return []
    return conversations
      .filter(c => c.parentId === activeConversationId)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
  }, [conversations, activeConversationId])

  // Project current context usage as a percentage. Mirrors the
  // calculation in context-render.jsx — we don't import it because the
  // panel needs the raw number, not the meter UI.
  const contextUsage = useMemo(() => {
    const models = providerModels(PROVIDER)
    const modelInfo = findModel(models, settings.defaultModel) || models[0]
    const contextWindow = modelInfo?.contextWindow || DEFAULT_CONTEXT_WINDOW
    const totalTokens = (tokenUsage?.input || 0) + (tokenUsage?.output || 0)
    return contextWindow > 0
      ? Math.min(Math.round((totalTokens / contextWindow) * 100), 100)
      : 0
  }, [tokenUsage, settings.defaultModel])

  // Resolve the message the panel is anchored to. The shared context
  // stores just the id; we hydrate against the live messages list so
  // the panel sees the latest content (e.g. a streaming response
  // that's since completed).
  const anchorMessage = useMemo(() => {
    if (!openForMessageId) return null
    return messages.find(m => m.id === openForMessageId) || null
  }, [openForMessageId, messages])

  const anchorIndex = useMemo(() => {
    if (!anchorMessage) return 0
    const idx = messages.findIndex(m => m.id === anchorMessage.id)
    return idx === -1 ? 0 : idx + 1
  }, [anchorMessage, messages])

  // ─── Branch creation paths ─────────────────────────────────

  const handleBranchFull = useCallback(async () => {
    if (!anchorMessage || !activeConversationId) return
    const branch = await createBranch(activeConversationId, anchorMessage.id)
    await loadConversations()
    closeBranchPanel()
    navigate(`/chat/${branch.id}`)
  }, [anchorMessage, activeConversationId, loadConversations, closeBranchPanel, navigate])

  const handleBranchCompressed = useCallback(async () => {
    if (!anchorMessage || !activeConversationId) return
    let keyed = false
    try {
      keyed = await hasKey(PROVIDER)
    } catch {
      keyed = false
    }
    // Without a key we can't generate a summary. V1 silently fell back
    // to Full History on any compress error — preserve that behavior so
    // the user always lands in a valid branch.
    if (!keyed) {
      await handleBranchFull()
      return
    }

    try {
      const branchIdx = messages.findIndex(m => m.id === anchorMessage.id)
      const branchMessages = messages.slice(0, branchIdx + 1)
      const summaryMessages = branchMessages
        .map(m => ({ role: m.role, content: m.content?.slice(0, 500) || '' }))
      summaryMessages.push({ role: 'user', content: SUMMARY_PROMPT })

      let summaryText = ''
      await gateway.call(PROVIDER, 'sendMessage', [
        summaryMessages,
        'claude-haiku',
        (chunk) => { summaryText += chunk },
        new AbortController().signal,
      ], { label: 'branch summary' })
      if (!summaryText.trim()) throw new Error('Empty summary generated')

      const parent = await getConversation(activeConversationId)
      const branchConv = await createConversation({
        title: `Summary: ${parent?.title || 'conversation'}`,
        model: parent?.model || settings.defaultModel,
        parentId: activeConversationId,
        branchPoint: anchorMessage.id,
        room: parent?.room ?? null,
      })
      await addMessage({
        conversationId: branchConv.id,
        role: 'assistant',
        content: summaryText.trim(),
        tokenCount: 0,
      })

      await loadConversations()
      closeBranchPanel()
      navigate(`/chat/${branchConv.id}`)
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('[branches@1.0] compressed branch failed; falling back to Full History:', err)
      }
      await handleBranchFull()
    }
  }, [
    anchorMessage, activeConversationId, messages,
    settings.defaultModel, loadConversations, closeBranchPanel, navigate,
    handleBranchFull,
  ])

  const handlePreviewSummary = useCallback(async (messageId) => {
    const keyed = await hasKey(PROVIDER).catch(() => false)
    if (!keyed) throw new Error('No API key configured. Add one in Settings to preview a summary.')
    const branchIdx = messages.findIndex(m => m.id === messageId)
    if (branchIdx === -1) throw new Error('Message not found.')
    const branchMessages = messages.slice(0, branchIdx + 1)
    const summaryMessages = branchMessages
      .map(m => ({ role: m.role, content: m.content?.slice(0, 500) || '' }))
    summaryMessages.push({ role: 'user', content: SUMMARY_PROMPT })

    let summaryText = ''
    await gateway.call(PROVIDER, 'sendMessage', [
      summaryMessages,
      'claude-haiku',
      (chunk) => { summaryText += chunk },
      new AbortController().signal,
    ], { label: 'branch summary preview' })
    if (!summaryText.trim()) throw new Error('Empty summary generated.')
    return summaryText.trim()
  }, [messages])

  // ─── Compress Context action ───────────────────────────────

  const handleCompressContext = useCallback(() => {
    if (!messages.length) return
    const last = messages[messages.length - 1]
    openBranchPanel(last.id)
  }, [messages, openBranchPanel])

  // Auto-compress on threshold cross — preserved from V1 (gated behind
  // settings.autoCompress === 'automatic'). Only fires when the panel
  // isn't already open and there's something to compress. Per audit
  // §3.6 the threshold is moving to per-component config; until the
  // editor (PR-8) exposes that, keep reading from app settings as the
  // factory default.
  const threshold = typeof config.contextThreshold === 'number'
    ? config.contextThreshold
    : (settings.contextThreshold ?? 75)

  useEffect(() => {
    if (settings.autoCompress !== 'automatic') return
    if (contextUsage < threshold) return
    if (openForMessageId) return
    if (!messages.length) return
    handleCompressContext()
  }, [
    settings.autoCompress, contextUsage, threshold,
    openForMessageId, messages.length, handleCompressContext,
  ])

  // ─── Render ────────────────────────────────────────────────

  const showCompressButton = config.showCompressButton !== false
  const showParentLink = config.showParentLink !== false
  const defaultBranchMode = config.defaultBranchMode || 'full-history'

  return (
    <div className="px-4 py-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-[var(--p-text-secondary)] uppercase tracking-wider">
          Branches{branches.length > 0 && (
            <span className="text-[#7C6CD4] normal-case tracking-normal ml-1">
              ({branches.length})
            </span>
          )}
        </h3>
      </div>

      <BranchList
        branches={branches}
        currentConversation={
          showParentLink ? currentConversation : { ...currentConversation, parentId: null }
        }
        messageCount={messages.length}
        onNavigate={(id) => navigate(`/chat/${id}`)}
      />

      {showCompressButton && (
        <motion.button
          whileHover={{ x: 2, borderColor: '#B8A070' }}
          whileTap={{ scale: 0.98 }}
          onClick={handleCompressContext}
          disabled={!messages.length}
          className="mt-1 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border border-[#E9E9E7] bg-white text-[var(--p-text-secondary)] hover:text-[var(--p-text-primary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Activity className="w-3.5 h-3.5" />
          Compress Context
        </motion.button>
      )}

      {anchorMessage && (
        <BranchCreationPanel
          message={anchorMessage}
          messageIndex={anchorIndex}
          totalMessages={messages.length}
          contextUsage={contextUsage}
          isIncomplete={anchorMessage.incomplete === true}
          defaultMode={defaultBranchMode}
          onClose={closeBranchPanel}
          onBranchFull={handleBranchFull}
          onBranchCompressed={handleBranchCompressed}
          onPreviewSummary={handlePreviewSummary}
        />
      )}
    </div>
  )
}
