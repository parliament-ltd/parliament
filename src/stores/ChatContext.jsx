import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react'
import { getMessages, addMessage, updateMessage } from '../lib/db'
import { useConversations } from './ConversationContext'

const ChatContext = createContext(null)

// Interval for incremental streaming persistence (ms)
const PERSIST_INTERVAL = 3000

export function ChatProvider({ children }) {
  const [messages, setMessages] = useState([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [tokenUsage, setTokenUsage] = useState({ input: 0, output: 0 })
  const [activeConversationId, setActiveConversationId] = useState(null)

  const { updateConversation } = useConversations()

  const abortControllerRef = useRef(null)
  const streamingMessageIdRef = useRef(null)
  const persistIntervalRef = useRef(null)
  const latestContentRef = useRef('')
  const messagesRef = useRef([])

  // Keep messagesRef in sync with state
  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  // Load messages for a conversation from IndexedDB
  const loadMessages = useCallback(async (conversationId) => {
    const msgs = await getMessages(conversationId)
    setMessages(msgs)
    setActiveConversationId(conversationId)

    // Calculate cumulative token usage from loaded messages
    const usage = msgs.reduce(
      (acc, msg) => ({
        input: acc.input + (msg.role === 'user' ? msg.tokenCount || 0 : 0),
        output: acc.output + (msg.role === 'assistant' ? msg.tokenCount || 0 : 0),
      }),
      { input: 0, output: 0 }
    )
    setTokenUsage(usage)
  }, [])

  // Start incremental persistence during streaming
  const startPersistInterval = useCallback(() => {
    persistIntervalRef.current = setInterval(async () => {
      const msgId = streamingMessageIdRef.current
      const content = latestContentRef.current
      if (msgId && content) {
        try {
          await updateMessage(msgId, { content, incomplete: true })
        } catch {
          // Fire-and-forget — don't block streaming
        }
      }
    }, PERSIST_INTERVAL)
  }, [])

  const stopPersistInterval = useCallback(() => {
    if (persistIntervalRef.current) {
      clearInterval(persistIntervalRef.current)
      persistIntervalRef.current = null
    }
  }, [])

  // Auto-generate title, summary, and tags after the first user→assistant exchange.
  // All three are fire-and-forget: failures are silent.
  // They run in parallel to minimize latency.
  const generateMetadataIfNeeded = useCallback(async (conversationId, currentMessages, apiKey, provider) => {
    // Only trigger on exactly 2 messages (first user + first assistant)
    if (currentMessages.length !== 2) return
    if (currentMessages[0].role !== 'user' || currentMessages[1].role !== 'assistant') return

    // Run all three in parallel — each is independent and fire-and-forget
    const titlePromise = provider.generateTitle(apiKey, currentMessages)
      .then(title => updateConversation(conversationId, { title }))
      .catch(err => console.warn('Auto-title generation failed:', err.message))

    const summaryPromise = provider.generateSummary(apiKey, currentMessages)
      .then(aiSummary => updateConversation(conversationId, { aiSummary }))
      .catch(err => console.warn('Auto-summary generation failed:', err.message))

    const tagsPromise = provider.generateTags(apiKey, currentMessages)
      .then(tags => updateConversation(conversationId, { tags }))
      .catch(err => console.warn('Auto-tags generation failed:', err.message))

    // We don't await the combined result — this is background work
    Promise.allSettled([titlePromise, summaryPromise, tagsPromise])
  }, [updateConversation])

  // Send a message and handle streaming response
  // systemPrompt: optional string from collaboration mode presets + custom instruction
  const sendMessage = useCallback(async (apiKey, conversationId, userContent, model, provider, systemPrompt = '') => {
    // 1. Add user message to state and IndexedDB
    const userMsg = await addMessage({
      conversationId,
      role: 'user',
      content: userContent,
    })
    setMessages(prev => [...prev, userMsg])

    // 2. Create a placeholder assistant message marked incomplete
    const assistantMsg = await addMessage({
      conversationId,
      role: 'assistant',
      content: '',
      incomplete: true,
    })
    streamingMessageIdRef.current = assistantMsg.id
    latestContentRef.current = ''

    setMessages(prev => [...prev, assistantMsg])
    setIsStreaming(true)
    setStreamingContent('')

    // 3. Set up abort controller
    abortControllerRef.current = new AbortController()

    // 4. Start incremental persistence
    startPersistInterval()

    try {
      // Build message history for API call from the ref (synchronous read).
      // Exclude the empty assistant placeholder we just added.
      // Also include the user message we just created in case the ref
      // hasn't caught up yet via the useEffect.
      const currentMessages = messagesRef.current
      const historyMessages = currentMessages.filter(m => m.id !== assistantMsg.id)

      // If the user message we just added isn't in the ref yet, append it
      const hasUserMsg = historyMessages.some(m => m.id === userMsg.id)
      if (!hasUserMsg) {
        historyMessages.push(userMsg)
      }

      const history = historyMessages
        .filter(m => m.content) // Exclude any empty messages
        .map(m => ({ role: m.role, content: m.content }))

      // 5. Call provider with streaming
      // Pass systemPrompt so it gets set as the top-level `system` field in the API request
      const response = await provider.sendMessage(
        apiKey,
        history,
        model,
        (chunk) => {
          latestContentRef.current += chunk
          setStreamingContent(prev => prev + chunk)
        },
        abortControllerRef.current.signal,
        systemPrompt || undefined
      )

      // 6. Stream complete — final persist with incomplete: false
      stopPersistInterval()
      const finalContent = latestContentRef.current
      const tokenCount = response?.usage?.output_tokens || 0

      await updateMessage(assistantMsg.id, {
        content: finalContent,
        incomplete: false,
        tokenCount,
      })

      // Update message in state
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantMsg.id
            ? { ...m, content: finalContent, incomplete: false, tokenCount }
            : m
        )
      )

      // Update cumulative token usage
      const inputTokens = response?.usage?.input_tokens || 0
      setTokenUsage(prev => ({
        input: prev.input + inputTokens,
        output: prev.output + tokenCount,
      }))

      // 7. Auto-generate title, summary, and tags (fire and forget — not awaited)
      const completedMessages = messagesRef.current.map(m =>
        m.id === assistantMsg.id
          ? { ...m, content: finalContent, incomplete: false, tokenCount }
          : m
      )
      generateMetadataIfNeeded(conversationId, completedMessages, apiKey, provider)
    } catch (error) {
      stopPersistInterval()

      // Persist whatever content we received so far
      const partialContent = latestContentRef.current
      if (partialContent) {
        await updateMessage(assistantMsg.id, {
          content: partialContent,
          incomplete: true,
        })
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantMsg.id
              ? { ...m, content: partialContent, incomplete: true }
              : m
          )
        )
      } else {
        // No content received — remove the empty placeholder
        setMessages(prev => prev.filter(m => m.id !== assistantMsg.id))
      }

      // Re-throw if not an abort (abort is expected from stopGenerating)
      if (error.name !== 'AbortError') {
        throw error
      }
    } finally {
      setIsStreaming(false)
      setStreamingContent('')
      streamingMessageIdRef.current = null
      latestContentRef.current = ''
      abortControllerRef.current = null
    }
  }, [startPersistInterval, stopPersistInterval, generateMetadataIfNeeded])

  // Continue from an interrupted (ghost text) message
  // systemPrompt: optional string from collaboration mode presets + custom instruction
  const continueMessage = useCallback(async (apiKey, incompleteMessageId, model, provider, systemPrompt = '') => {
    const currentMessages = messagesRef.current
    const incompleteMsg = currentMessages.find(m => m.id === incompleteMessageId)
    if (!incompleteMsg) return

    const msgIndex = currentMessages.indexOf(incompleteMsg)
    const priorMessages = currentMessages.slice(0, msgIndex)
      .filter(m => m.content)
      .map(m => ({ role: m.role, content: m.content }))

    // The continue instruction lives as a constant in the provider abstraction
    const continueInstruction = provider.getContinueInstruction()

    const history = [
      ...priorMessages,
      { role: 'assistant', content: incompleteMsg.content },
      { role: 'user', content: continueInstruction },
    ]

    // Reuse the existing message record
    streamingMessageIdRef.current = incompleteMsg.id
    latestContentRef.current = incompleteMsg.content

    setIsStreaming(true)
    setStreamingContent(incompleteMsg.content)

    abortControllerRef.current = new AbortController()
    startPersistInterval()

    try {
      const response = await provider.sendMessage(
        apiKey,
        history,
        model,
        (chunk) => {
          latestContentRef.current += chunk
          setStreamingContent(prev => prev + chunk)
        },
        abortControllerRef.current.signal,
        systemPrompt || undefined
      )

      stopPersistInterval()
      const finalContent = latestContentRef.current
      const tokenCount = (incompleteMsg.tokenCount || 0) + (response?.usage?.output_tokens || 0)

      await updateMessage(incompleteMsg.id, {
        content: finalContent,
        incomplete: false,
        tokenCount,
      })

      setMessages(prev =>
        prev.map(m =>
          m.id === incompleteMsg.id
            ? { ...m, content: finalContent, incomplete: false, tokenCount }
            : m
        )
      )

      const inputTokens = response?.usage?.input_tokens || 0
      setTokenUsage(prev => ({
        input: prev.input + inputTokens,
        output: prev.output + (response?.usage?.output_tokens || 0),
      }))
    } catch (error) {
      stopPersistInterval()

      const partialContent = latestContentRef.current
      if (partialContent !== incompleteMsg.content) {
        await updateMessage(incompleteMsg.id, {
          content: partialContent,
          incomplete: true,
        })
        setMessages(prev =>
          prev.map(m =>
            m.id === incompleteMsg.id
              ? { ...m, content: partialContent, incomplete: true }
              : m
          )
        )
      }

      if (error.name !== 'AbortError') {
        throw error
      }
    } finally {
      setIsStreaming(false)
      setStreamingContent('')
      streamingMessageIdRef.current = null
      latestContentRef.current = ''
      abortControllerRef.current = null
    }
  }, [startPersistInterval, stopPersistInterval])

  // Stop an in-progress generation
  const stopGenerating = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }, [])

  // Clear messages (when switching conversations)
  const clearMessages = useCallback(() => {
    setMessages([])
    setStreamingContent('')
    setTokenUsage({ input: 0, output: 0 })
    setActiveConversationId(null)
  }, [])

  return (
    <ChatContext.Provider value={{
      messages,
      isStreaming,
      streamingContent,
      tokenUsage,
      activeConversationId,
      loadMessages,
      sendMessage,
      continueMessage,
      stopGenerating,
      clearMessages,
    }}>
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const context = useContext(ChatContext)
  if (!context) throw new Error('useChat must be used within ChatProvider')
  return context
}