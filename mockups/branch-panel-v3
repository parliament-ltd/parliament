import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Send, Square, AlertCircle } from 'lucide-react'
import { useChat } from '../stores/ChatContext'
import { useConversations } from '../stores/ConversationContext'
import { useSettings } from '../stores/SettingsContext'
import { getProvider } from '../providers'
import { loadApiKey } from '../lib/crypto'
import { IconButton } from '../components'

const SPRING_SNAPPY = { type: 'spring', stiffness: 500, damping: 30 }
const SPRING_SMOOTH = { type: 'spring', stiffness: 300, damping: 28 }
const SEND_DEBOUNCE_MS = 500

export default function ChatView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { messages, isStreaming, streamingContent, loadMessages, sendMessage, continueMessage, stopGenerating, clearMessages } = useChat()
  const { updateConversation } = useConversations()
  const { settings, refreshStorageEstimate } = useSettings()

  const [inputValue, setInputValue] = useState('')
  const [apiKey, setApiKey] = useState(null)
  const [apiError, setApiError] = useState(null) // { type: 'key_failure' | 'rate_limit' | 'generic', message: string }
  const [loading, setLoading] = useState(true)

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const lastSendTimeRef = useRef(0)

  // Load conversation messages and API key on mount
  useEffect(() => {
    async function init() {
      try {
        const key = await loadApiKey(settings.storageMode)
        setApiKey(key)
        await loadMessages(id)
      } catch {
        // Conversation may not exist
      } finally {
        setLoading(false)
      }
    }
    init()
    return () => clearMessages()
  }, [id, settings.storageMode, loadMessages, clearMessages])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  // Clear rate limit error on successful send
  useEffect(() => {
    if (!isStreaming && apiError?.type === 'rate_limit') {
      setApiError(null)
    }
  }, [isStreaming, apiError])

  const handleSend = useCallback(async () => {
    const trimmed = inputValue.trim()
    if (!trimmed) return // Empty input silently ignored
    if (isStreaming) return
    if (!apiKey) {
      setApiError({ type: 'key_failure', message: 'No API key configured. Add one in Settings to continue.' })
      return
    }

    // 500ms debounce guard
    const now = Date.now()
    if (now - lastSendTimeRef.current < SEND_DEBOUNCE_MS) return
    lastSendTimeRef.current = now

    setInputValue('')
    setApiError(null)

    try {
      const provider = getProvider('anthropic')
      await sendMessage(apiKey, id, trimmed, settings.defaultModel, provider)
      await refreshStorageEstimate()
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        setApiError({
          type: 'key_failure',
          message: 'Your API key is no longer working. Your conversation is safe — update your key in Settings to continue.',
        })
      } else if (error.status === 429) {
        setApiError({
          type: 'rate_limit',
          message: 'Rate limit reached. Please wait a moment.',
        })
      } else if (error.name !== 'AbortError') {
        setApiError({
          type: 'generic',
          message: error.message || 'Something went wrong. Please try again.',
        })
      }
    }
  }, [inputValue, isStreaming, apiKey, id, settings.defaultModel, sendMessage, refreshStorageEstimate])

  const handleContinue = useCallback(async (messageId) => {
    if (!apiKey) return
    setApiError(null)
    try {
      const provider = getProvider('anthropic')
      await continueMessage(apiKey, messageId, settings.defaultModel, provider)
      await refreshStorageEstimate()
    } catch (error) {
      if (error.name !== 'AbortError') {
        setApiError({ type: 'generic', message: error.message || 'Failed to continue. Please try again.' })
      }
    }
  }, [apiKey, settings.defaultModel, continueMessage, refreshStorageEstimate])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (isStreaming) {
        stopGenerating()
      } else {
        handleSend()
      }
    }
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center font-sans text-[#6B7C93]">
        <p className="text-sm">Loading conversation...</p>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col font-sans text-[#1E2532] bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#F0F0F0]">
        <IconButton icon={ArrowLeft} onClick={() => navigate('/')} title="Back to Chats" />
        <h1 className="text-sm font-semibold text-[#1E2532] truncate">
          {messages.length > 0 ? messages[0].content.slice(0, 60) : 'New Conversation'}
        </h1>
      </div>

      {/* Key failure banner */}
      {apiError?.type === 'key_failure' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="px-6 py-3 bg-[#EF4444]/10 border-b border-[#EF4444]/20 flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 text-[#EF4444] flex-shrink-0" />
          <p className="text-xs text-[#EF4444]">{apiError.message}</p>
        </motion.div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && !isStreaming && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-sm text-[#6B7C93] mb-1">Start a conversation</p>
            <p className="text-xs text-[#D5D5D5]">Type a message below to begin</p>
          </div>
        )}

        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: msg.incomplete && !isStreaming ? 0.55 : 1, y: 0 }}
            transition={SPRING_SMOOTH}
            className={`max-w-2xl ${msg.role === 'user' ? 'ml-auto' : 'mr-auto'}`}
          >
            <div
              className={`px-4 py-3 rounded-xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#F5F5F5] text-[#1E2532]'
                  : 'border border-[#EBEBEB] text-[#1E2532]'
              } ${
                msg.incomplete && !isStreaming
                  ? 'border-dashed border-[#D5D5D5]'
                  : ''
              }`}
            >
              <p className="text-[10px] font-semibold text-[#6B7C93] mb-1.5">
                {msg.role === 'user' ? 'You' : 'Claude'}
              </p>
              <div className="whitespace-pre-wrap">
                {/* Show streaming content for the active incomplete message */}
                {msg.incomplete && isStreaming && streamingContent
                  ? streamingContent
                  : msg.content}
              </div>
            </div>

            {/* Ghost text continue button */}
            {msg.incomplete && !isStreaming && msg.content && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => handleContinue(msg.id)}
                className="mt-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#4A7AE5] border border-[#EBEBEB] hover:border-[#4A7AE5] transition-colors"
              >
                Continue
              </motion.button>
            )}
          </motion.div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Rate limit inline message */}
      {apiError?.type === 'rate_limit' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="px-6 py-1.5"
        >
          <p className="text-xs text-[#E5A620]">{apiError.message}</p>
        </motion.div>
      )}

      {/* Input */}
      <div className="border-t border-[#F0F0F0] px-6 py-4">
        <div className="flex items-end gap-3 max-w-2xl mx-auto">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 bg-white rounded-lg px-4 py-2.5 text-sm text-[#1E2532] outline-none border border-[#EBEBEB] focus:border-[#4A7AE5] transition-colors placeholder:text-[#D5D5D5] resize-none"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={SPRING_SNAPPY}
            onClick={isStreaming ? stopGenerating : handleSend}
            className="p-2.5 rounded-lg border border-[#EBEBEB] bg-white text-[#6B7C93] hover:border-[#4A7AE5] hover:text-[#4A7AE5] transition-colors flex-shrink-0"
          >
            <AnimatePresence mode="wait">
              {isStreaming ? (
                <motion.div
                  key="stop"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={SPRING_SNAPPY}
                >
                  <Square className="w-4 h-4" />
                </motion.div>
              ) : (
                <motion.div
                  key="send"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={SPRING_SNAPPY}
                >
                  <Send className="w-4 h-4" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </div>
    </div>
  )
}
