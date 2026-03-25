import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Database, MessageSquare, PanelRight, Send, Sparkles,
  Wand2, Filter, ArrowUpRight, Hash, Type, Calendar, Activity,
} from 'lucide-react'
import { usePelican } from '../../../stores/PelicanContext'
import { useChat } from '../../../stores/ChatContext'
import { useSettings } from '../../../stores/SettingsContext'
import { useConversations } from '../../../stores/ConversationContext'
import { getProvider } from '../../../providers'
import { loadApiKey } from '../../../lib/crypto'
import { buildDataSample } from '../../../lib/fileParser'
import { SPRING_SMOOTH, SPRING_SNAPPY, SPRING_GENTLE, getContextColor } from '../../../lib/constants'

const SIDEBAR_RESIZE = { type: 'spring', stiffness: 150, damping: 25 }

const TYPE_ICONS = {
  number:  Hash,
  string:  Type,
  date:    Calendar,
  boolean: Activity,
}

export default function InspectorPanel({ conversationId, contextUsage, contextThreshold }) {
  const {
    activeFileId, files, contextFiles, getParsedData,
    inspectorCollapsed, setInspectorCollapsed,
    selectedColumn, setSelectedColumn,
    setCanvasView,
  } = usePelican()

  const { messages, isStreaming, streamingContent, sendMessage, stopGenerating } = useChat()
  const { settings } = useSettings()
  const { conversations } = useConversations()

  const [columnStats, setColumnStats] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [apiKey, setApiKey] = useState(null)
  const [sendError, setSendError] = useState(null)
  const lastSendRef = useRef(0)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const hasData = files.length > 0

  // Load column stats for the active file
  useEffect(() => {
    if (!activeFileId) { setColumnStats([]); return }
    getParsedData(activeFileId).then(parsed => {
      if (parsed) setColumnStats(parsed.columnStats || [])
    })
  }, [activeFileId, getParsedData])

  // Load API key
  useEffect(() => {
    loadApiKey().then(setApiKey)
  }, [])

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  // Pre-populate chat from inspector actions
  const sendToChat = useCallback((text) => {
    setChatInput(text)
    inputRef.current?.focus()
  }, [])

  // Handle send
  const handleSend = useCallback(async () => {
    const trimmed = chatInput.trim()
    if (!trimmed || isStreaming) return
    const now = Date.now()
    if (now - lastSendRef.current < 500) return
    lastSendRef.current = now

    setSendError(null)
    setChatInput('')

    try {
      const systemPrompt = buildDataSystemPrompt(files, contextFiles, columnStats, activeFileId)
      await sendMessage(apiKey, conversationId, trimmed, settings.defaultModel, getProvider('anthropic'), systemPrompt)
    } catch (err) {
      setSendError(err.message || 'Send failed')
    }
  }, [chatInput, isStreaming, apiKey, conversationId, settings.defaultModel, files, contextFiles, columnStats, activeFileId, sendMessage])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      isStreaming ? stopGenerating() : handleSend()
    }
  }, [isStreaming, stopGenerating, handleSend])

  return (
    <motion.div
      animate={{ width: inspectorCollapsed ? 48 : 380 }}
      transition={SIDEBAR_RESIZE}
      className="flex flex-col flex-shrink-0 relative overflow-hidden bg-white"
      style={{ borderLeft: '1px solid #F1F1EF' }}
    >
      <AnimatePresence mode="wait">
        {inspectorCollapsed ? (
          /* Collapsed icon strip */
          <motion.div
            key="collapsed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={SPRING_SNAPPY}
            className="flex flex-col items-center pt-4 gap-3"
          >
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setInspectorCollapsed(false)}
              className="p-2 rounded-lg hover:bg-[#F1F1EF] text-[#B8A070] transition-colors"
              title="Expand panel"
            >
              <PanelRight className="w-5 h-5" />
            </motion.button>
            <div className="w-6 h-px bg-[#F1F1EF]" />
            <div className="p-2 text-[#787774]" title="Schema"><Database className="w-4 h-4" /></div>
            <div className="p-2 text-[#787774]" title="Chat"><MessageSquare className="w-4 h-4" /></div>
          </motion.div>
        ) : (
          /* Expanded panel */
          <motion.div
            key="expanded"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, delay: 0.1 }}
            className="flex flex-col flex-1 overflow-hidden"
          >
            {/* Inspector header */}
            <div
              className="flex items-center justify-between px-4 py-3 flex-shrink-0"
              style={{ borderBottom: '1px solid #F1F1EF' }}
            >
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-[#B8A070]" />
                <span className="text-xs font-semibold text-[#191919]">Inspector</span>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setInspectorCollapsed(true)}
                className="p-1.5 rounded-lg hover:bg-[#F1F1EF] text-[#B8A070] transition-colors"
                title="Collapse panel"
              >
                <PanelRight className="w-4 h-4" />
              </motion.button>
            </div>

            {/* Schema inspector */}
            <div
              className="overflow-y-auto flex-shrink-0"
              style={{ maxHeight: 'calc(50vh - 48px)', scrollbarWidth: 'thin', scrollbarColor: '#E9E9E7 transparent' }}
            >
              {hasData && columnStats.length > 0 ? (
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-medium text-[#787774] uppercase tracking-wider">Schema</h3>
                    <span className="text-[10px] text-[#787774]">{columnStats.length} cols</span>
                  </div>
                  <div className="space-y-0.5">
                    {columnStats.map(col => (
                      <ColumnRow
                        key={col.name}
                        column={col}
                        selected={selectedColumn === col.name}
                        onClick={() => setSelectedColumn(selectedColumn === col.name ? null : col.name)}
                      />
                    ))}
                  </div>
                  <AnimatePresence>
                    {selectedColumn && (
                      <ColumnDetail
                        column={columnStats.find(c => c.name === selectedColumn)}
                        onAction={sendToChat}
                      />
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div
                  className="flex items-center justify-center px-6"
                  style={{ height: 'calc(50vh - 80px)' }}
                >
                  <div className="text-center">
                    <Database className="w-8 h-8 text-[#9B9A97] mx-auto mb-2" />
                    <p className="text-xs text-[#787774]">Load a file to inspect its schema</p>
                  </div>
                </div>
              )}
            </div>

            {/* Chat panel */}
            <div
              className="flex flex-col border-t border-[#F1F1EF]"
              style={{ height: 'calc(50vh - 48px)' }}
            >
              {/* Chat header */}
              <div
                className="flex items-center gap-2 px-4 py-2.5 flex-shrink-0"
                style={{ borderBottom: '1px solid #F1F1EF' }}
              >
                <MessageSquare className="w-3.5 h-3.5 text-[#B8A070]" />
                <span className="text-xs font-semibold text-[#191919]">Chat</span>
                <span className="text-[10px] text-[#787774] ml-auto">
                  {messages.length > 0 ? `${messages.length} messages` : 'Ready'}
                </span>
              </div>

              {/* Messages */}
              <div
                className="flex-1 overflow-y-auto px-3 py-3 space-y-3"
                style={{ scrollbarWidth: 'thin', scrollbarColor: '#E9E9E7 transparent' }}
              >
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center px-4">
                      <Sparkles className="w-6 h-6 text-[#9B9A97] mx-auto mb-2" />
                      <p className="text-[11px] text-[#787774] leading-relaxed">
                        {hasData
                          ? 'Ask about your data — or click column actions above to explore.'
                          : 'Drop a file to get started, or ask me to help you find data.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map((msg, i) => (
                      <ChatBubble key={msg.id} message={msg} isLast={i === messages.length - 1} streamingContent={streamingContent} isStreaming={isStreaming} />
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Send error */}
              <AnimatePresence>
                {sendError && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="px-3 py-1.5"
                  >
                    <p className="text-[10px] text-[#E03E3E]">{sendError}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Input */}
              <div className="px-3 pb-3 pt-1 flex-shrink-0">
                <div className="flex items-end gap-2 border border-[#E9E9E7] rounded-xl px-3 py-2 focus-within:border-[#B8A070] transition-colors">
                  <textarea
                    ref={inputRef}
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={hasData ? 'Ask about your data…' : 'Describe what to analyze…'}
                    className="flex-1 text-xs text-[#191919] resize-none outline-none placeholder:text-[#9B9A97] bg-transparent"
                    rows={2}
                  />
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={isStreaming ? stopGenerating : handleSend}
                    className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
                      isStreaming
                        ? 'bg-[#E03E3E]/10 text-[#E03E3E] hover:bg-[#E03E3E]/20'
                        : chatInput.trim()
                          ? 'bg-[#B8A070] text-white'
                          : 'bg-[#F1F1EF] text-[#9B9A97]'
                    }`}
                  >
                    <Send className="w-3.5 h-3.5" />
                  </motion.button>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <ChatShortcut icon={Sparkles} label="Suggest" onClick={() => sendToChat('Suggest analyses for this dataset')} />
                  <ChatShortcut icon={Wand2} label="Transform" onClick={() => sendToChat('Suggest useful transformations for this data')} />
                  <ChatShortcut icon={Filter} label="Filter" onClick={() => sendToChat('What filters would be useful for this dataset?')} />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── ColumnRow ────────────────────────────────────────────

function ColumnRow({ column, selected, onClick }) {
  const Icon = TYPE_ICONS[column.type] || Type
  const typeColors = {
    number: '#B8A070',
    string: '#0F7B6C',
    date:   '#D9730D',
    boolean: '#787774',
  }
  const color = typeColors[column.type] || '#787774'

  return (
    <motion.button
      whileHover={{ x: 2, backgroundColor: '#FAFAFA' }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
        selected ? 'bg-[#B8A070]/5' : ''
      }`}
    >
      <Icon className="w-3 h-3 flex-shrink-0" style={{ color }} />
      <span className={`text-[11px] flex-1 truncate ${selected ? 'font-semibold text-[#191919]' : 'text-[#787774]'}`}>
        {column.name}
      </span>
      <span className="text-[9px] text-[#787774] px-1.5 py-0.5 rounded bg-[#F1F1EF]">
        {column.type}
      </span>
      {column.nulls > 0 && (
        <span className="text-[9px] text-[#D9730D] font-medium">{column.nulls}⌀</span>
      )}
    </motion.button>
  )
}

// ─── ColumnDetail ─────────────────────────────────────────

function ColumnDetail({ column, onAction }) {
  if (!column) return null

  const actions = [
    { label: 'Group by',  command: `Group by ${column.name}` },
    { label: 'Filter',    command: `Filter where ${column.name} = ` },
    { label: 'Visualize', command: `Show distribution of ${column.name}` },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={SPRING_SNAPPY}
      className="overflow-hidden"
    >
      <div className="mt-2 px-3 py-3 bg-[#B8A070]/5 border border-[#B8A070]/15 rounded-xl">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-[#191919]">{column.name}</span>
          <span className="text-[10px] text-[#B8A070] font-medium">{column.type}</span>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mb-3">
          <DetailRow label="Unique" value={column.unique?.toLocaleString() ?? '—'} />
          <DetailRow label="Nulls" value={String(column.nulls ?? 0)} warn={column.nulls > 0} />
          <DetailRow label="Sample" value={column.sample ?? '—'} />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {actions.map(action => (
            <motion.button
              key={action.label}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onAction(action.command)}
              className="text-[10px] font-medium text-[#B8A070] px-2 py-1 rounded-md bg-white border border-[#B8A070]/20 hover:bg-[#B8A070]/10 transition-colors flex items-center gap-1"
            >
              <ArrowUpRight className="w-2.5 h-2.5" />
              {action.label}
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

function DetailRow({ label, value, warn = false }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] text-[#787774]">{label}</span>
      <span className={`text-[10px] font-medium ${warn ? 'text-[#D9730D]' : 'text-[#191919]'}`}>{value}</span>
    </div>
  )
}

// ─── ChatBubble ───────────────────────────────────────────

function ChatBubble({ message, isLast, streamingContent, isStreaming }) {
  const isUser = message.role === 'user'
  const content = isLast && isStreaming && streamingContent ? streamingContent : message.content

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRING_SMOOTH}
      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
    >
      <div className={`max-w-[90%] px-3 py-2 rounded-xl text-[11px] leading-relaxed ${
        isUser
          ? 'bg-[#B8A070] text-white rounded-br-md'
          : 'bg-[#F7F6F3] text-[#191919] rounded-bl-md border border-[#E9E9E7]'
      }`}>
        {isUser ? (
          content
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p:      ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
              strong: ({ children }) => <strong className="font-semibold text-[#191919]">{children}</strong>,
              em:     ({ children }) => <em className="italic">{children}</em>,
              code:   ({ inline, children }) =>
                inline
                  ? <code className="px-1 py-0.5 rounded bg-white border border-[#E9E9E7] font-mono text-[10px]">{children}</code>
                  : <code className="block px-2.5 py-2 mt-1.5 mb-1.5 rounded-lg bg-white border border-[#E9E9E7] font-mono text-[10px] overflow-x-auto whitespace-pre">{children}</code>,
              pre:    ({ children }) => <>{children}</>,
              ul:     ({ children }) => <ul className="list-disc list-inside space-y-0.5 my-1.5">{children}</ul>,
              ol:     ({ children }) => <ol className="list-decimal list-inside space-y-0.5 my-1.5">{children}</ol>,
              li:     ({ children }) => <li className="text-[11px]">{children}</li>,
              a:      ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#B8A070] underline underline-offset-2 hover:text-[#C4A94D]">{children}</a>,
              h1:     ({ children }) => <h1 className="text-sm font-semibold text-[#191919] mt-2 mb-1 first:mt-0">{children}</h1>,
              h2:     ({ children }) => <h2 className="text-xs font-semibold text-[#191919] mt-2 mb-1 first:mt-0">{children}</h2>,
              h3:     ({ children }) => <h3 className="text-[11px] font-semibold text-[#191919] mt-1.5 mb-0.5 first:mt-0">{children}</h3>,
              blockquote: ({ children }) => <blockquote className="border-l-2 border-[#B8A070]/40 pl-2.5 my-1.5 text-[#787774]">{children}</blockquote>,
              hr:     () => <hr className="my-2 border-[#E9E9E7]" />,
              table:  ({ children }) => <div className="overflow-x-auto my-2"><table className="text-[10px] border-collapse w-full">{children}</table></div>,
              th:     ({ children }) => <th className="px-2 py-1 text-left font-semibold bg-[#F1F1EF] border border-[#E9E9E7]">{children}</th>,
              td:     ({ children }) => <td className="px-2 py-1 border border-[#E9E9E7]">{children}</td>,
            }}
          >
            {content}
          </ReactMarkdown>
        )}
      </div>
    </motion.div>
  )
}

// ─── ChatShortcut ─────────────────────────────────────────

function ChatShortcut({ icon: Icon, label, onClick }) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="text-[10px] text-[#787774] hover:text-[#B8A070] transition-colors flex items-center gap-1 px-2 py-1 rounded-md hover:bg-[#FAFAFA]"
    >
      <Icon className="w-3 h-3" />
      {label}
    </motion.button>
  )
}

// ─── Data system prompt builder ───────────────────────────

function buildDataSystemPrompt(files, contextFiles, columnStats, activeFileId) {
  const contextFileList = files.filter(f => contextFiles.has(f.id))
  if (contextFileList.length === 0) return null

  const activeFile = files.find(f => f.id === activeFileId)
  const schemaSection = activeFile && columnStats.length > 0
    ? `Active dataset: ${activeFile.name} (${activeFile.rows.toLocaleString()} rows, ${activeFile.cols} columns)\nSchema: ${columnStats.map(c => `${c.name} (${c.type})`).join(', ')}`
    : ''

  const filesSection = contextFileList
    .map(f => `- ${f.name}: ${f.rows.toLocaleString()} rows, ${f.cols} columns (${f.type.toUpperCase()})`)
    .join('\n')

  return `You are a data analyst assistant. The user is exploring data in Pelican mode.

Files currently in context:
${filesSection}

${schemaSection}

When the user asks about data:
- Reference specific columns and values from the schema when relevant
- Suggest concrete analyses, filters, or visualizations they can apply
- Keep responses focused and actionable
- If they ask for a chart or view change, describe what they should see and mention the canvas tabs (Chart, Table, Summary)`
}
