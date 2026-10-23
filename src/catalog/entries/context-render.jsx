// context@1.0 — live render component for the V2 RoomShell chat path.
//
// PR-10a.6. Self-binds to ChatContext + SettingsContext per
// refactor/v2-phase1-audit.md §2.8a.
//
// Reads token usage from useChat() and the active model from
// useSettings(). Looks up the model's context-window size via the
// provider abstraction; defaults to 200k if the model lookup fails.
// Threshold and displayMode come from the component's config (per
// audit §3.6 — V1 app settings moved into per-component config at the
// PR-10a migration).
//
// This is a lighter slice than messages-render / input-render — context
// is a pure read with no mutators or persistence.

import ContextMeter from '../../components/core/ContextMeter'
import { useRoomChat } from '../../stores/useRoomChat'
import { useSettings } from '../../stores/SettingsContext'
import { useHiddenIds } from '../../stores/chatHooks'
import { models as providerModels, findModel, DEFAULT_MODEL_PROVIDER as PROVIDER } from '../../net'

const DEFAULT_CONTEXT_WINDOW = 200_000

export default function ContextRender({ config = {} } = {}) {
  const { messages, tokenUsage, activeConversationId } = useRoomChat()
  // Hidden messages are not sent, so the meter counts them apart (stage 4).
  const hiddenIds = useHiddenIds(activeConversationId)
  const hiddenCount = messages.filter(m => hiddenIds.has(m.id)).length
  const { settings } = useSettings()

  // Resolve the active model's context window via the provider's model
  // info. Falls back to a sane default if the model id isn't registered
  // — keeps the meter rendering rather than crashing on unknown ids.
  const models = providerModels(PROVIDER)
  const modelInfo = findModel(models, settings.defaultModel) || models[0]
  const contextWindow = modelInfo?.contextWindow || DEFAULT_CONTEXT_WINDOW

  const totalTokens = (tokenUsage?.input || 0) + (tokenUsage?.output || 0)
  const usage = contextWindow > 0
    ? Math.min(Math.round((totalTokens / contextWindow) * 100), 100)
    : 0

  const threshold = typeof config.contextThreshold === 'number'
    ? config.contextThreshold
    : 75
  const displayMode = config.displayMode ?? 'meter'

  return (
    <ContextMeter
      usage={usage}
      threshold={threshold}
      totalTokens={totalTokens}
      contextWindow={contextWindow}
      messageCount={messages.length - hiddenCount}
      hiddenCount={hiddenCount}
      totalMessageCount={messages.length}
      displayMode={displayMode}
    />
  )
}
