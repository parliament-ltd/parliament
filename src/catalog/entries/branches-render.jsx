// branches@1.0 — the room's branches, on the new screens.
//
// The chat's branches, and its parent, in a list (BranchList). Each action
// writes its command into the bar for Enter, as the step list and the
// branch slider do (C173 (f); stage 13, piece 8, C251 (b)):
//   - a branch or the parent, clicked: open:<number>;
//   - "Carry on": what the block's "New branches carry" setting names,
//     new:branch <number> for the whole history, open:<number> summary for
//     a summary (C175);
//   - at the block's "Warns at", a line saying how full the context is,
//     with the same command to click. It never acts by itself.
//
// The branch panel, its own summary call and its links to today's chat
// page went with R26 and R42 (C250, C251): the bar makes branches now.

import { useMemo } from 'react'
import { useLingui } from '@lingui/react'
import BranchList from '../../components/core/BranchList'
import { COPY } from '../../copy'
import { useRoomChat } from '../../stores/useRoomChat'
import { useConversations } from '../../stores/ConversationContext'
import { useSettings } from '../../stores/SettingsContext'
import { models as providerModels, findModel, DEFAULT_MODEL_PROVIDER as PROVIDER } from '../../net'

const DEFAULT_CONTEXT_WINDOW = 200_000
const write = (value) => window.dispatchEvent(new CustomEvent('parliament-write', { detail: { value } }))

export default function BranchesRender({ config = {} } = {}) {
  const { i18n } = useLingui()
  const B = COPY.branchesBlock
  const { messages, tokenUsage, activeConversationId } = useRoomChat()
  const { conversations } = useConversations()
  const { settings } = useSettings()

  const currentConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) || null,
    [conversations, activeConversationId],
  )
  const branches = useMemo(() => {
    if (!activeConversationId) return []
    return conversations
      .filter((c) => c.parentId === activeConversationId)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
  }, [conversations, activeConversationId])

  // How full the context is, as the Context health block works it out.
  const contextUsage = useMemo(() => {
    const models = providerModels(PROVIDER)
    const modelInfo = findModel(models, settings.defaultModel) || models[0]
    const contextWindow = modelInfo?.contextWindow || DEFAULT_CONTEXT_WINDOW
    const totalTokens = (tokenUsage?.input || 0) + (tokenUsage?.output || 0)
    return contextWindow > 0 ? Math.min(Math.round((totalTokens / contextWindow) * 100), 100) : 0
  }, [tokenUsage, settings.defaultModel])

  const showCompressButton = config.showCompressButton !== false
  const showParentLink = config.showParentLink !== false
  const summary = config.defaultBranchMode === 'compressed-summary'
  const threshold = typeof config.contextThreshold === 'number' ? config.contextThreshold : (settings.contextThreshold ?? 75)

  const num = currentConversation?.num ?? null
  const carryOn = num == null ? null : summary ? `open:${num} summary` : `new:branch ${num}`
  const numOf = (id) => conversations.find((c) => c.id === id)?.num ?? null
  const openChat = (id) => {
    const n = numOf(id)
    if (n != null) write(`>open:${n}`)
  }
  const full = carryOn && messages.length > 0 && contextUsage >= threshold

  return (
    <div className="px-4 py-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-[var(--p-text-secondary)] uppercase tracking-wider">
          {i18n._(B.title)}{branches.length > 0 && (
            <span className="text-[#7C6CD4] normal-case tracking-normal ml-1">({branches.length})</span>
          )}
        </h3>
      </div>

      <BranchList
        branches={branches}
        currentConversation={showParentLink ? currentConversation : { ...currentConversation, parentId: null }}
        messageCount={messages.length}
        onNavigate={openChat}
      />

      {full && (
        <p className="text-xs text-[var(--p-text-secondary)] italic">
          {i18n._(B.full, { percent: contextUsage })}{' '}
          <button type="button" className="underline underline-offset-2" title={i18n._(B.writes, { command: carryOn })} onClick={() => write(`>${carryOn}`)}>{carryOn}</button>
        </p>
      )}

      {showCompressButton && carryOn && (
        <button
          type="button"
          onClick={() => write(`>${carryOn}`)}
          disabled={!messages.length}
          title={i18n._(B.writes, { command: carryOn })}
          className="mt-1 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border border-[#E9E9E7] bg-white text-[var(--p-text-secondary)] hover:text-[var(--p-text-primary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {i18n._(summary ? B.carryOnSummary : B.carryOnWhole)}
        </button>
      )}
    </div>
  )
}
