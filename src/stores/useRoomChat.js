import { useMemo } from 'react'
import { useChat } from './ChatContext'
import { useConversationId } from './ConversationScope'
import { useMessages, useIsStreaming } from './chatHooks'

// A room's own chat (stage 8, piece 7; C175 (a), ruled 23 October: any
// number of rooms). The chat the room shows, as its board tells it
// (ConversationScope), else the open chat: its messages, whether a reply
// is arriving, and the tokens its messages took, as useChat gives them for
// the open chat. A room's parts read this, so with several rooms open each
// shows its own chat.
const usageOf = (messages) => messages.reduce((acc, m) => ({
  input: acc.input + (m.role === 'user' ? m.tokenCount || 0 : 0),
  output: acc.output + (m.role === 'assistant' ? m.tokenCount || 0 : 0),
}), { input: 0, output: 0 })

export function useRoomChat() {
  const chat = useChat()
  const scoped = useConversationId()
  const id = scoped ?? chat.activeConversationId
  const messages = useMessages(id)
  const isStreaming = useIsStreaming(id)
  const tokenUsage = useMemo(() => usageOf(messages), [messages])
  const { continueMessage } = chat
  return useMemo(() => ({
    ...chat,
    activeConversationId: id,
    messages,
    isStreaming,
    tokenUsage,
    continueMessage: (messageId, model, systemPrompt = '') => continueMessage(messageId, model, systemPrompt, id),
  }), [chat, id, messages, isStreaming, tokenUsage, continueMessage])
}
