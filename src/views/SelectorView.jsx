import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, GitBranch, Plus, MessageSquare, ArrowUp, ArrowDown,
  Trash2, Copy, Pin, PanelRight, Check, Settings, AlertCircle, X,
  Star, StickyNote, Highlighter, Pencil, RefreshCw, Sparkles,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useConversations } from '../stores/ConversationContext'
import { useSettings } from '../stores/SettingsContext'
import { getProvider } from '../providers'
import { loadApiKey } from '../lib/crypto'
import {
  getFavorites as dbGetAllFavorites,
  deleteFavorite as dbDeleteFavorite,
  getMessages,
  initDB,
  getSetting,
  setSetting,
} from '../lib/db'
import TourTooltip from '../components/TourTooltip'

// Ensure apollo-md styles are available (also injected by ChatView, but SelectorView
// may load independently so we register them here too — safe to call from multiple modules)
const MD_STYLE_ID = 'apollo-markdown-styles'
if (typeof document !== 'undefined' && !document.getElementById(MD_STYLE_ID)) {
  const style = document.createElement('style')
  style.id = MD_STYLE_ID
  style.textContent = `
    .apollo-md h1, .apollo-md h2, .apollo-md h3,
    .apollo-md h4, .apollo-md h5, .apollo-md h6 {
      font-weight: 600; margin-top: 0.6em; margin-bottom: 0.3em;
      line-height: 1.3; color: #1E2532;
    }
    .apollo-md p { margin-bottom: 0.5em; }
    .apollo-md p:last-child { margin-bottom: 0; }
    .apollo-md ul, .apollo-md ol { margin: 0.3em 0 0.5em 1.2em; padding: 0; }
    .apollo-md li { margin-bottom: 0.15em; }
    .apollo-md strong { font-weight: 600; }
    .apollo-md em { font-style: italic; }
    .apollo-md code {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.88em; background: rgba(0,0,0,0.05);
      padding: 0.1em 0.3em; border-radius: 3px;
    }
    .apollo-md a { color: #4A7AE5; text-decoration: underline; }
    .apollo-md blockquote {
      border-left: 3px solid #EBEBEB; padding-left: 0.7em;
      margin: 0.4em 0; color: #6B7C93;
    }
    .apollo-md mark { border-radius: 2px; padding: 0 1px; color: inherit; }
  `
  document.head.appendChild(style)
}

const SELECTOR_TOUR_STEPS = [
  {
    title: 'Welcome to Apollo',
    desc: 'Apollo is a power-user chat interface for Claude that runs entirely in your browser. Your conversations, highlights, and notes are stored locally — nothing leaves your device except API calls to Anthropic.',
    target: null,
    placement: 'center',
  },
  {
    title: 'Add your API key first',
    desc: 'Click the Settings icon to add your Anthropic API key. It\'s encrypted and stored only in this browser — Apollo never stores it on a server.',
    target: '[data-tour="settings-btn"]',
    placement: 'bottom',
  },
  {
    title: 'Create a new chat',
    desc: 'Click New Chat to start a conversation. Apollo auto-generates titles, summaries, and topic tags for every conversation.',
    target: '[data-tour="new-chat-btn"]',
    placement: 'bottom',
  },
  {
    title: 'Knowledge views',
    desc: 'Switch between Summary, Notes, Highlights, and Branches to explore your conversations in depth. These views turn your chat history into a searchable knowledge base.',
    target: '[data-tour="view-toggle"]',
    placement: 'bottom',
  },
]

/* ═══════════════════════════════════════════════════════════ */
/*  CONSTANTS                                                   */
/* ═══════════════════════════════════════════════════════════ */

const SPRING_SNAPPY = { type: 'spring', stiffness: 500, damping: 30 }
const SPRING_SMOOTH = { type: 'spring', stiffness: 300, damping: 28 }
const SIDEBAR_RESIZE = { type: 'spring', stiffness: 150, damping: 25 }
const staggerContainer = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.03, delayChildren: 0.06 } } }
const staggerItem = { hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0, transition: SPRING_SMOOTH } }

const FAMILY_COLORS = [
  '#4A7AE5', // blue
  '#22C55E', // green
  '#E5A620', // amber
  '#7C6CD4', // purple
  '#EF4444', // red
  '#06B6D4', // cyan
  '#EC4899', // pink
  '#F97316', // orange
]

// Dynamic tag colors — assigns a consistent color to any tag string via hash
const TAG_PALETTE = [
  '#4A7AE5', // blue
  '#7C6CD4', // purple
  '#22C55E', // green
  '#E5A620', // amber
  '#EF4444', // red
  '#06B6D4', // cyan
  '#EC4899', // pink
  '#F97316', // orange
  '#8B5CF6', // violet
  '#14B8A6', // teal
]

function getTagColor(tag) {
  let hash = 0
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash)
    hash = hash & hash // Convert to 32-bit int
  }
  return TAG_PALETTE[Math.abs(hash) % TAG_PALETTE.length]
}

/* ═══════════════════════════════════════════════════════════ */
/*  UTILITIES                                                   */
/* ═══════════════════════════════════════════════════════════ */

function formatRelative(dateStr) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const yy = String(date.getFullYear()).slice(-2)
  return `${mm}/${dd}/${yy}`
}

function formatShortDate(dateStr) {
  const d = new Date(dateStr)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const yy = String(d.getFullYear()).slice(-2)
  return `${mm}/${dd}/${yy}`
}

function formatBytes(bytes) {
  if (bytes == null || bytes === 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function buildFamilyColorMap(conversations) {
  const families = [...new Set(conversations.filter(c => c.familyId).map(c => c.familyId))]
  const map = {}
  families.forEach((fid, i) => { map[fid] = FAMILY_COLORS[i % FAMILY_COLORS.length] })
  return map
}

/* ═══════════════════════════════════════════════════════════ */
/*  Load all favorites across all conversations, hydrated      */
/* ═══════════════════════════════════════════════════════════ */

async function loadAllFavoritesHydrated(conversations) {
  const db = await initDB()
  const allFavRecords = await db.getAll('favorites')
  if (allFavRecords.length === 0) return []

  const convTitles = {}
  ;(conversations || []).forEach(c => { convTitles[c.id] = c.title || 'New conversation' })

  const hydrated = []
  for (const fav of allFavRecords) {
    try {
      const msg = await db.get('messages', fav.messageId)
      if (msg) {
        hydrated.push({
          id: fav.id,
          messageId: fav.messageId,
          conversationId: fav.conversationId,
          snippet: msg.content?.slice(0, 200) || '',
          source: convTitles[fav.conversationId] || 'Unknown conversation',
          sourceConversationId: fav.conversationId,
        })
      }
    } catch {
      // Message may have been deleted — skip
    }
  }
  return hydrated
}

/* ═══════════════════════════════════════════════════════════ */
/*  STORAGE WARNING BANNER                                     */
/* ═══════════════════════════════════════════════════════════ */

function StorageWarningBanner({ usagePercent }) {
  const [dismissed, setDismissed] = useState(false)
  if (usagePercent < 80 || dismissed) return null
  const isCritical = usagePercent >= 95

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={SPRING_SMOOTH}
      className={`flex items-center gap-2.5 px-8 py-2.5 text-xs border-b ${
        isCritical
          ? 'text-[#EF4444] border-[#EF4444]/10'
          : 'text-[#E5A620] border-[#E5A620]/10'
      }`}
      style={{ backgroundColor: isCritical ? '#FEF2F2' : '#FFFBEB' }}
    >
      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="flex-1">
        {isCritical
          ? 'Storage critically full. Export or delete conversations.'
          : 'Browser storage getting full. Consider exporting a backup.'}
      </span>
      <motion.button
        whileHover={{ scale: 1.15 }}
        whileTap={{ scale: 0.85 }}
        onClick={() => setDismissed(true)}
        className="p-0.5 rounded hover:bg-black/5"
      >
        <X className="w-3 h-3" />
      </motion.button>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════ */
/*  CHECKBOX                                                    */
/* ═══════════════════════════════════════════════════════════ */

function Checkbox({ checked, indeterminate = false, onChange }) {
  return (
    <motion.button
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.85 }}
      onClick={(e) => { e.stopPropagation(); onChange() }}
      className="w-4 h-4 rounded border flex items-center justify-center transition-colors flex-shrink-0"
      style={{
        borderColor: checked || indeterminate ? '#4A7AE5' : '#D5D5D5',
        backgroundColor: checked || indeterminate ? '#4A7AE5' : 'transparent',
      }}
    >
      {checked && (
        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
      {indeterminate && !checked && (
        <div className="w-2 h-0.5 bg-white rounded-full" />
      )}
    </motion.button>
  )
}

/* ═══════════════════════════════════════════════════════════ */
/*  INLINE ACTION (bulk toolbar)                                */
/* ═══════════════════════════════════════════════════════════ */

function InlineAction({ icon: Icon, label, onClick, danger = false }) {
  const [showTooltip, setShowTooltip] = useState(false)
  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={onClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`p-1.5 rounded-md transition-colors ${danger ? 'hover:bg-[#EF4444]/5 text-[#6B7C93] hover:text-[#EF4444]' : 'hover:bg-white/60 text-[#6B7C93] hover:text-[#1E2532]'}`}
      >
        <Icon className="w-3.5 h-3.5" />
      </motion.button>
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.12 }}
            className="absolute left-1/2 -translate-x-1/2 top-8 px-2 py-1 bg-[#1E2532] rounded text-[10px] text-white font-medium whitespace-nowrap z-50"
          >
            {label}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════ */
/*  INLINE TITLE EDITOR                                        */
/* ═══════════════════════════════════════════════════════════ */

function InlineTitleEditor({ title, onSave, onCancel }) {
  const [value, setValue] = useState(title)
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  const commit = () => {
    const trimmed = value.trim()
    if (trimmed && trimmed !== title) onSave(trimmed)
    else onCancel()
  }

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { e.preventDefault(); commit() }
        if (e.key === 'Escape') onCancel()
      }}
      onBlur={commit}
      onClick={(e) => e.stopPropagation()}
      className="bg-white rounded px-1.5 py-0.5 text-sm font-semibold text-[#1E2532] outline-none border border-[#4A7AE5] w-full max-w-[320px]"
      maxLength={60}
    />
  )
}

/* ═══════════════════════════════════════════════════════════ */
/*  INLINE NOTE EDITOR                                         */
/* ═══════════════════════════════════════════════════════════ */

function InlineNoteEditor({ note = '', onSave, onCancel }) {
  const [value, setValue] = useState(note)
  const inputRef = useRef(null)
  useEffect(() => { inputRef.current?.focus() }, [])

  return (
    <div className="flex items-start gap-2 w-full" onClick={(e) => e.stopPropagation()}>
      <textarea
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSave(value.trim()) }
          if (e.key === 'Escape') onCancel()
        }}
        placeholder="Add a note..."
        className="flex-1 bg-white rounded-lg px-3 py-2 text-xs text-[#1E2532] outline-none border border-[#4A7AE5] resize-none leading-relaxed placeholder:text-[#D5D5D5]"
        rows={2}
        maxLength={280}
      />
      <div className="flex flex-col gap-1">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSave(value.trim())}
          className="px-2.5 py-1.5 rounded-md text-[10px] font-semibold bg-[#4A7AE5] text-white"
        >
          Save
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onCancel}
          className="px-2.5 py-1.5 rounded-md text-[10px] font-semibold text-[#6B7C93] hover:bg-[#EEEEEE]"
        >
          Cancel
        </motion.button>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════ */
/*  VIEW TOGGLE                                                 */
/* ═══════════════════════════════════════════════════════════ */

function ViewToggle({ activeView, onChangeView }) {
  const views = [
    { id: 'summary', icon: Sparkles, label: 'Summary' },
    { id: 'notes', icon: StickyNote, label: 'Notes' },
    { id: 'highlights', icon: Highlighter, label: 'Highlights' },
    { id: 'branches', icon: GitBranch, label: 'Branches' },
  ]

  return (
    <div className="flex items-center bg-[#F5F5F5] rounded-lg p-0.5 gap-0.5">
      {views.map(({ id, icon: Icon, label }) => {
        const isActive = activeView === id
        return (
          <motion.button
            key={id}
            onClick={() => onChangeView(id)}
            className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-colors ${
              isActive ? 'text-[#1E2532]' : 'text-[#9CA7B8] hover:text-[#6B7C93]'
            }`}
            whileHover={!isActive ? { backgroundColor: 'rgba(0,0,0,0.03)' } : {}}
          >
            {isActive && (
              <motion.div
                layoutId="view-toggle-bg"
                className="absolute inset-0 bg-white rounded-md shadow-sm"
                transition={SPRING_SNAPPY}
              />
            )}
            <span className="relative flex items-center gap-1.5">
              <Icon className="w-3 h-3" />{label}
            </span>
          </motion.button>
        )
      })}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════ */
/*  COUNT BADGE                                                 */
/* ═══════════════════════════════════════════════════════════ */

function CountBadge({ icon: Icon, count, isActive, activeColor, onClick }) {
  if (count === 0) return null
  return (
    <motion.button
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      onClick={(e) => { e.stopPropagation(); onClick() }}
      className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 font-semibold transition-colors ${
        isActive ? 'text-white' : 'text-[#9CA7B8] hover:text-[#6B7C93]'
      }`}
      style={isActive ? { backgroundColor: activeColor } : { backgroundColor: 'rgba(0,0,0,0.04)' }}
    >
      <Icon className="w-2.5 h-2.5" />{count}
    </motion.button>
  )
}

/* ═══════════════════════════════════════════════════════════ */
/*  FAVORITE CARD                                               */
/* ═══════════════════════════════════════════════════════════ */

function FavoriteCard({ favorite, onRemove, onNavigate }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = (e) => {
    e.stopPropagation()
    navigator.clipboard.writeText(favorite.snippet || favorite.text || '').catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <motion.div
      variants={staggerItem}
      whileHover={{ borderColor: '#E0E0E0' }}
      className="group rounded-lg border border-[#EBEBEB] bg-white transition-colors cursor-pointer overflow-hidden"
      onClick={() => onNavigate?.(favorite.sourceConversationId || favorite.conversationId)}
    >
      <div
        className="px-3 pt-3 pb-2 text-xs text-[#1E2532] leading-relaxed apollo-md"
        style={{
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {favorite.snippet || favorite.text || favorite.content || ''}
        </ReactMarkdown>
      </div>
      <div className="flex items-center justify-between px-3 pb-2.5">
        <span className="text-[10px] text-[#6B7C93] truncate flex-1 mr-2">{favorite.source || ''}</span>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <motion.button
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.85 }}
            onClick={handleCopy}
            className="p-1 rounded hover:bg-[#EEEEEE] text-[#6B7C93] hover:text-[#1E2532] transition-colors"
          >
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.div key="check" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ duration: 0.15 }}>
                  <Check className="w-3 h-3 text-[#22C55E]" />
                </motion.div>
              ) : (
                <motion.div key="copy" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ duration: 0.15 }}>
                  <Copy className="w-3 h-3" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.85 }}
            onClick={(e) => { e.stopPropagation(); onRemove() }}
            className="p-1 rounded hover:bg-[#EEEEEE] text-[#6B7C93] hover:text-[#EF4444] transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════ */
/*  CHAT TABLE ROW — flat model, all conversations equal       */
/* ═══════════════════════════════════════════════════════════ */

function ChatTableRow({
  chat, globalView, familyColor, allChats, isDeemphasized,
  selected, onToggleSelected, onNavigate, onTitleEdit, onUpdateNotes,
  rowOverride, onSetRowOverride,
}) {
  const isSelected = selected.has(chat.id)
  const [editingTitle, setEditingTitle] = useState(false)
  const [addingNote, setAddingNote] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState(null)

  // Safely handle missing arrays
  const notes = chat.notes || []
  const highlights = chat.highlights || []
  const tags = chat.tags || []
  const noteCount = notes.length
  const highlightCount = highlights.length
  const isBranch = !!chat.parentId

  // Find children for this chat (if it's a parent)
  const children = allChats.filter(c => c.parentId === chat.id)

  const effectiveView = rowOverride || globalView

  const toggleRowOverride = (view) => {
    if (rowOverride === view) onSetRowOverride(chat.id, null)
    else onSetRowOverride(chat.id, view)
    setAddingNote(false)
    setEditingNoteId(null)
  }

  const handleAddNote = (text) => {
    if (!text) { setAddingNote(false); return }
    onUpdateNotes(chat.id, [...notes, { id: `n-${Date.now()}`, text, messageRef: null }])
    setAddingNote(false)
  }

  const handleEditNote = (noteId, newText) => {
    if (!newText) { setEditingNoteId(null); return }
    onUpdateNotes(chat.id, notes.map(n => n.id === noteId ? { ...n, text: newText } : n))
    setEditingNoteId(null)
  }

  const handleDeleteNote = (noteId) => {
    onUpdateNotes(chat.id, notes.filter(n => n.id !== noteId))
  }

  return (
    <motion.div variants={staggerItem}>
      <motion.div
        whileHover={{ backgroundColor: '#FAFAFA' }}
        transition={{ duration: 0.1 }}
        className="group border-b border-[#F5F5F5]"
        style={{
          backgroundColor: isSelected ? '#F0F5FF' : undefined,
          opacity: isDeemphasized ? 0.45 : 1,
          transition: 'opacity 0.2s ease',
        }}
      >
        <div className="flex items-start px-2" style={{ minHeight: 58, paddingTop: 10, paddingBottom: 10 }}>
          {/* Checkbox */}
          <div className="w-8 flex-shrink-0 flex items-center justify-center pt-0.5">
            <Checkbox checked={isSelected} onChange={() => onToggleSelected(chat.id)} />
          </div>

          {/* Title + badges + inline content */}
          <div className="flex-1 min-w-0 px-2">
            {/* Title line */}
            <div className="flex items-center gap-1.5">
              {editingTitle ? (
                <div onClick={(e) => e.stopPropagation()}>
                  <InlineTitleEditor
                    title={chat.title || 'New conversation'}
                    onSave={(t) => { setEditingTitle(false); onTitleEdit(chat.id, t) }}
                    onCancel={() => setEditingTitle(false)}
                  />
                </div>
              ) : (
                <span
                  className="text-sm font-semibold text-[#1E2532] truncate cursor-pointer hover:text-[#4A7AE5] transition-colors"
                  onClick={() => onNavigate(chat.id)}
                  onDoubleClick={(e) => { e.stopPropagation(); setEditingTitle(true) }}
                  title="Double-click to rename"
                >
                  {chat.title || 'New conversation'}
                </span>
              )}
              {chat.pinned && <Pin className="w-3 h-3 text-[#4A7AE5] flex-shrink-0" style={{ fill: '#4A7AE5' }} />}

              {/* Badges: branch count (on parents), notes, highlights */}
              <div className="flex items-center gap-1 ml-1">
                {children.length > 0 && (
                  <CountBadge
                    icon={GitBranch}
                    count={children.length}
                    isActive={effectiveView === 'branches' && rowOverride === 'branches'}
                    activeColor="#7C6CD4"
                    onClick={() => toggleRowOverride('branches')}
                  />
                )}
                <CountBadge
                  icon={StickyNote}
                  count={noteCount}
                  isActive={effectiveView === 'notes' && rowOverride === 'notes'}
                  activeColor="#4A7AE5"
                  onClick={() => toggleRowOverride('notes')}
                />
                <CountBadge
                  icon={Highlighter}
                  count={highlightCount}
                  isActive={effectiveView === 'highlights' && rowOverride === 'highlights'}
                  activeColor="#E5A620"
                  onClick={() => toggleRowOverride('highlights')}
                />
              </div>
            </div>

            {/* Inline content based on effective view */}
            <AnimatePresence mode="wait">
              {/* ── Summary view ── */}
              {effectiveView === 'summary' && (
                <motion.p
                  key="summary"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  className="text-[11px] leading-relaxed mt-1 line-clamp-1"
                  style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 1,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    color: chat.aiSummary ? '#7A8694' : '#B0B8C1',
                  }}
                >
                  {chat.aiSummary || 'Summary will appear after your first exchange'}
                </motion.p>
              )}

              {/* ── Notes view ── */}
              {effectiveView === 'notes' && (
                <motion.div
                  key="notes"
                  initial={{ opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -3 }}
                  transition={{ duration: 0.15 }}
                  className="mt-1.5 space-y-1.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  {notes.map((note) => (
                    <div key={note.id} className="group/note flex items-start gap-2">
                      <div className="w-1 min-h-[16px] rounded-full flex-shrink-0 mt-0.5 bg-[#4A7AE5]/20" />
                      <div className="flex-1 min-w-0">
                        {editingNoteId === note.id ? (
                          <InlineNoteEditor
                            note={note.text}
                            onSave={(t) => handleEditNote(note.id, t)}
                            onCancel={() => setEditingNoteId(null)}
                          />
                        ) : (
                          <div className="flex items-start gap-1.5">
                            <p className="text-[11px] text-[#4A5568] leading-relaxed flex-1">
                              {note.text}
                              {note.messageRef && (
                                <span className="text-[#C0C8D4] ml-1.5">(Message {note.messageRef})</span>
                              )}
                            </p>
                            <div className="flex items-center gap-0 opacity-0 group-hover/note:opacity-100 transition-opacity flex-shrink-0">
                              <motion.button
                                whileHover={{ scale: 1.15 }}
                                whileTap={{ scale: 0.85 }}
                                onClick={() => setEditingNoteId(note.id)}
                                className="p-0.5 rounded hover:bg-[#EEEEEE] text-[#C0C8D4] hover:text-[#6B7C93] transition-colors"
                              >
                                <Pencil className="w-2.5 h-2.5" />
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.15 }}
                                whileTap={{ scale: 0.85 }}
                                onClick={() => handleDeleteNote(note.id)}
                                className="p-0.5 rounded hover:bg-[#EF4444]/5 text-[#C0C8D4] hover:text-[#EF4444] transition-colors"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </motion.button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {/* Add note — always visible in notes view */}
                  {!addingNote && (
                    <button
                      onClick={() => setAddingNote(true)}
                      className="text-left px-2.5 py-1.5 rounded-md border border-dashed border-[#EBEBEB] hover:border-[#4A7AE5] text-[10px] text-[#94A0AE] hover:text-[#4A7AE5] transition-all w-full"
                      style={{ opacity: 0.45 }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '0.45'}
                    >
                      + Add a note
                    </button>
                  )}
                  {addingNote && (
                    <InlineNoteEditor onSave={handleAddNote} onCancel={() => setAddingNote(false)} />
                  )}
                </motion.div>
              )}

              {/* ── Highlights view ── */}
              {effectiveView === 'highlights' && (
                <motion.div
                  key="highlights"
                  initial={{ opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -3 }}
                  transition={{ duration: 0.15 }}
                  className="mt-1.5 space-y-1.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  {highlights.length > 0 ? (
                    highlights.map((hl) => (
                      <div key={hl.id} className="flex items-stretch gap-2 group/hl">
                        <div className="flex-shrink-0 flex items-stretch pt-0.5 pb-0.5">
                          <div
                            className="rounded-full"
                            style={{
                              backgroundColor: hl.color || '#4A7AE5',
                              width: 3,
                              minHeight: hl.multiline ? 28 : 12,
                              opacity: hl.multiline ? 1 : 0.6,
                            }}
                          />
                        </div>
                        <p className="text-[11px] text-[#4A5568] leading-relaxed flex-1">{hl.text}</p>
                        <motion.button
                          whileHover={{ scale: 1.15 }}
                          whileTap={{ scale: 0.85 }}
                          onClick={() => navigator.clipboard.writeText(hl.text).catch(() => {})}
                          className="p-0.5 rounded opacity-0 group-hover/hl:opacity-100 hover:bg-[#EEEEEE] text-[#C0C8D4] hover:text-[#6B7C93] transition-all flex-shrink-0 self-start"
                        >
                          <Copy className="w-2.5 h-2.5" />
                        </motion.button>
                      </div>
                    ))
                  ) : (
                    <p className="text-[10px] text-[#B0B8C1] italic">
                    </p>
                  )}
                </motion.div>
              )}

              {/* ── Branches view ── */}
              {effectiveView === 'branches' && (
                <motion.div
                  key="branches"
                  initial={{ opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -3 }}
                  transition={{ duration: 0.15 }}
                  className="mt-1.5 space-y-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  {isBranch && (
                    <div className="flex items-center gap-2">
                      <div className="flex-shrink-0 flex items-stretch">
                        <div className="rounded-full" style={{ backgroundColor: familyColor || '#7C6CD4', width: 3, minHeight: 16 }} />
                      </div>
                      <span className="text-[10px] text-[#9CA7B8]">↳ branched from</span>
                      <button
                        className="text-[10px] text-[#4A5568] font-semibold hover:text-[#4A7AE5] transition-colors cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); onNavigate(chat.parentId) }}
                      >
                        {chat.parentTitle || 'Parent conversation'}
                      </button>
                    </div>
                  )}
                  {children.length > 0 && children.map((child) => (
                    <div key={child.id} className="flex items-center gap-2">
                      <div className="flex-shrink-0 flex items-stretch">
                        <div className="rounded-full" style={{ backgroundColor: familyColor || '#7C6CD4', width: 3, minHeight: 16 }} />
                      </div>
                      <GitBranch className="w-2.5 h-2.5 text-[#7C6CD4]" />
                      <button
                        className="text-[11px] text-[#4A5568] font-semibold hover:text-[#4A7AE5] transition-colors cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); onNavigate(child.id) }}
                      >
                        {child.title}
                      </button>
                      <span className="text-[10px] text-[#8E99A4]">{formatRelative(child.updatedAt)}</span>
                    </div>
                  ))}
                  {!isBranch && children.length === 0 && (
                    <p className="text-[10px] text-[#B0B8C1] italic">
                      No branch relationships
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Topics — stacked pills */}
          <div className="w-36 flex-shrink-0 px-2 flex flex-col items-center justify-center gap-1 pt-0.5">
            {tags.map(tag => {
              const color = getTagColor(tag)
              return (
                <span
                  key={tag}
                  className="text-[9px] font-semibold px-2 py-0.5 rounded-full truncate max-w-full text-center"
                  style={{
                    backgroundColor: `${color}15`,
                    color: color,
                  }}
                >
                  {tag}
                </span>
              )
            })}
          </div>

          {/* Edited */}
          <div className="w-24 flex-shrink-0 px-2 text-center pt-0.5">
            <span className="text-xs text-[#8E99A4]">{formatRelative(chat.updatedAt)}</span>
          </div>

          {/* Created */}
          <div className="w-24 flex-shrink-0 px-2 text-center pt-0.5">
            <span className="text-xs text-[#8E99A4]">{formatShortDate(chat.createdAt)}</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════ */
/*  MAIN COMPONENT                                              */
/* ═══════════════════════════════════════════════════════════ */

export default function SelectorView() {
  const navigate = useNavigate()
  const {
    conversations,
    createConversation,
    updateConversation,
    deleteConversations,
  } = useConversations()
  const { storageUsage, settings } = useSettings()

  // ── Tour ──
  const [showTour, setShowTour] = useState(false)
  useEffect(() => {
    getSetting('tourCompleted_selector').then(done => {
      if (!done) setShowTour(true)
    })
  }, [])
  const handleTourDone = useCallback(async () => {
    setShowTour(false)
    await setSetting('tourCompleted_selector', true)
  }, [])

  // ── Local state ──
  const [searchQuery, setSearchQuery] = useState('')
  const [selected, setSelected] = useState(new Set())
  const [sortField, setSortField] = useState('updatedAt')
  const [sortDir, setSortDir] = useState('desc')
  const [favSidebarOpen, setFavSidebarOpen] = useState(true)
  const [favorites, setFavorites] = useState([])
  const [globalView, setGlobalView] = useState('summary')
  const [rowOverrides, setRowOverrides] = useState({})
  const [notesMap, setNotesMap] = useState({})       // { conversationId: [note, ...] }
  const [highlightsMap, setHighlightsMap] = useState({}) // { conversationId: [highlight, ...] }

  // ── Load notes and highlights from their IndexedDB stores ──
  useEffect(() => {
    let cancelled = false
    async function loadAnnotations() {
      try {
        const db = await initDB()

        // Load all notes, group by conversationId
        const allNotes = await db.getAll('notes')
        const nMap = {}
        for (const note of allNotes) {
          const cid = note.conversationId
          if (!nMap[cid]) nMap[cid] = []
          nMap[cid].push({
            id: note.id,
            text: note.text,
            // messageId is a UUID in IndexedDB — only show as messageRef if it's a number
            // Position-based resolution will be added when the notes system is fully built
            messageRef: typeof note.messageId === 'number' ? note.messageId : null,
          })
        }

        // Load all highlights, group by conversationId
        const allHighlights = await db.getAll('highlights')
        const hMap = {}
        for (const hl of allHighlights) {
          const cid = hl.conversationId
          if (!hMap[cid]) hMap[cid] = []
          hMap[cid].push({
            id: hl.id,
            text: hl.text,
            color: hl.color || '#4A7AE5',
            multiline: hl.multiline ?? (hl.text && hl.text.length > 80),
          })
        }

        if (!cancelled) {
          setNotesMap(nMap)
          setHighlightsMap(hMap)
        }
      } catch (err) {
        console.warn('Failed to load annotations:', err)
      }
    }
    loadAnnotations()
    return () => { cancelled = true }
  }, [conversations]) // reload when conversations change (e.g. after adding a note)

  // ── Hydrate conversations with notes + highlights from separate stores ──
  const hydratedConversations = useMemo(() => {
    return (conversations || []).map(conv => ({
      ...conv,
      notes: conv.notes || notesMap[conv.id] || [],
      highlights: conv.highlights || highlightsMap[conv.id] || [],
      tags: conv.tags || [],
      aiSummary: conv.aiSummary || null,
    }))
  }, [conversations, notesMap, highlightsMap])

  // ── Load favorites from IndexedDB ──
  useEffect(() => {
    let cancelled = false
    async function loadFavs() {
      try {
        const hydrated = await loadAllFavoritesHydrated(conversations)
        if (!cancelled) setFavorites(hydrated)
      } catch {}
    }
    if (conversations && conversations.length > 0) {
      loadFavs()
    }
    return () => { cancelled = true }
  }, [conversations])

  // ── Family color map ──
  const familyColorMap = useMemo(
    () => buildFamilyColorMap(hydratedConversations),
    [hydratedConversations]
  )

  // ── Filter by search (across titles, summaries, notes, tags, parent titles) ──
  const filteredChats = useMemo(() => {
    let filtered = [...hydratedConversations]
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(c =>
        (c.title || '').toLowerCase().includes(q)
        || (c.aiSummary && c.aiSummary.toLowerCase().includes(q))
        || (c.notes && c.notes.some(n => n.text.toLowerCase().includes(q)))
        || (c.tags && c.tags.some(t => t.toLowerCase().includes(q)))
        || (c.parentTitle && c.parentTitle.toLowerCase().includes(q))
      )
    }
    return filtered
  }, [hydratedConversations, searchQuery])

  // ── Sort: pinned first, then by field ──
  const sortedChats = useMemo(() => {
    const sorted = [...filteredChats]
    sorted.sort((a, b) => {
      let aVal, bVal
      if (sortField === 'storageBytes') {
        aVal = a.storageBytes || 0
        bVal = b.storageBytes || 0
      } else {
        aVal = new Date(a[sortField] || 0).getTime()
        bVal = new Date(b[sortField] || 0).getTime()
      }
      return sortDir === 'desc' ? bVal - aVal : aVal - bVal
    })
    sorted.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))
    return sorted
  }, [filteredChats, sortField, sortDir])

  // ── Determine de-emphasis ──
  // Only de-emphasize rows when at least one conversation has content for the active view.
  // If no conversations have notes/highlights yet, de-emphasis would dim everything — useless.
  const anyHasNotes = useMemo(
    () => hydratedConversations.some(c => c.notes && c.notes.length > 0),
    [hydratedConversations]
  )
  const anyHasHighlights = useMemo(
    () => hydratedConversations.some(c => c.highlights && c.highlights.length > 0),
    [hydratedConversations]
  )

  const isRowDeemphasized = useCallback((chat) => {
    if (globalView === 'notes') {
      if (!anyHasNotes) return false
      return !chat.notes || chat.notes.length === 0
    }
    if (globalView === 'highlights') {
      if (!anyHasHighlights) return false
      return !chat.highlights || chat.highlights.length === 0
    }
    if (globalView === 'branches') {
      const isBranch = !!chat.parentId
      const hasChildren = hydratedConversations.some(c => c.parentId === chat.id)
      return !isBranch && !hasChildren
    }
    return false
  }, [globalView, hydratedConversations, anyHasNotes, anyHasHighlights])

  // ── Select-all logic ──
  const allVisibleIds = useMemo(() => sortedChats.map(c => c.id), [sortedChats])
  const allSelected = allVisibleIds.length > 0 && allVisibleIds.every(id => selected.has(id))
  const someSelected = allVisibleIds.some(id => selected.has(id))

  const toggleAll = useCallback(() => {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(allVisibleIds))
  }, [allSelected, allVisibleIds])

  // ── Selected size total ──
  const selectedSizeTotal = useMemo(() => {
    let total = 0
    selected.forEach((id) => {
      const conv = hydratedConversations.find((c) => c.id === id)
      if (conv?.storageBytes) total += conv.storageBytes
    })
    return total
  }, [selected, hydratedConversations])

  // ── Smart pin label ──
  const pinLabel = useMemo(() => {
    const anyUnpinned = [...selected].some(id => {
      const c = hydratedConversations.find(ch => ch.id === id)
      return c && !c.pinned
    })
    return anyUnpinned ? 'Pin' : 'Unpin'
  }, [selected, hydratedConversations])

  // ── Storage percent ──
  const storagePercent = useMemo(() => {
    if (!storageUsage?.quota) return 0
    return Math.round((storageUsage.usage / storageUsage.quota) * 100)
  }, [storageUsage])

  // ── Handlers ──
  const handleGlobalViewChange = useCallback((view) => {
    setGlobalView(view)
    setRowOverrides({})
  }, [])

  const setRowOverride = useCallback((chatId, view) => {
    setRowOverrides(prev => {
      const next = { ...prev }
      if (view === null || view === globalView) delete next[chatId]
      else next[chatId] = view
      return next
    })
  }, [globalView])

  const removeFavorite = useCallback(async (favId) => {
    try {
      await dbDeleteFavorite(favId)
      setFavorites(prev => prev.filter(f => f.id !== favId))
    } catch {}
  }, [])

  const handleSort = useCallback((field) => {
    if (sortField === field) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }, [sortField])

  const toggleSelected = useCallback((id) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }, [])

  const handleNavigate = useCallback((id) => {
    navigate(`/chat/${id}`)
  }, [navigate])

  const handleNewChat = useCallback(async () => {
    try {
      const conv = await createConversation({ title: 'New conversation' })
      navigate(`/chat/${conv.id}`)
    } catch (err) {
      console.error('Failed to create conversation:', err)
    }
  }, [createConversation, navigate])

  const handleTitleEdit = useCallback(async (id, newTitle) => {
    try {
      await updateConversation(id, { title: newTitle })
    } catch (err) {
      console.error('Failed to update title:', err)
    }
  }, [updateConversation])

  const handleUpdateNotes = useCallback(async (conversationId, newNotes) => {
    try {
      const db = await initDB()

      // Clear existing notes for this conversation and rewrite
      const existingNotes = await db.getAllFromIndex('notes', 'conversationId', conversationId)
      const tx = db.transaction('notes', 'readwrite')
      for (const existing of existingNotes) {
        await tx.store.delete(existing.id)
      }
      for (const note of newNotes) {
        await tx.store.put({
          id: note.id,
          conversationId,
          messageId: note.messageRef || null,
          text: note.text,
          createdAt: note.createdAt || new Date().toISOString(),
        })
      }
      await tx.done

      // Update local state so the UI reflects changes immediately
      setNotesMap(prev => ({ ...prev, [conversationId]: newNotes }))
    } catch (err) {
      console.error('Failed to update notes:', err)
    }
  }, [])

  const handleBulkPinToggle = useCallback(async () => {
    const anyUnpinned = [...selected].some(id => {
      const c = hydratedConversations.find(ch => ch.id === id)
      return c && !c.pinned
    })
    const promises = [...selected].map(id => updateConversation(id, { pinned: anyUnpinned }))
    await Promise.allSettled(promises)
    setSelected(new Set())
  }, [selected, hydratedConversations, updateConversation])

  const handleBulkRegenerate = useCallback(async () => {
    const selectedIds = [...selected]
    setSelected(new Set())

    try {
      const apiKey = await loadApiKey(settings?.storageMode || 'session')
      if (!apiKey) {
        console.warn('No API key available for regeneration')
        return
      }
      const provider = getProvider('anthropic')

      // Process each selected conversation in parallel
      const promises = selectedIds.map(async (convId) => {
        try {
          // Load messages for this conversation
          const msgs = await getMessages(convId)
          if (msgs.length < 2) return // Need at least one exchange

          // Take the first few messages for generation
          const messagesToUse = msgs.slice(0, 6).map(m => ({
            role: m.role,
            content: m.content,
          }))

          // Run title, summary, and tags in parallel
          const results = await Promise.allSettled([
            provider.generateTitle(apiKey, messagesToUse)
              .then(title => updateConversation(convId, { title })),
            provider.generateSummary(apiKey, messagesToUse)
              .then(aiSummary => updateConversation(convId, { aiSummary })),
            provider.generateTags(apiKey, messagesToUse)
              .then(tags => updateConversation(convId, { tags })),
          ])

          const failures = results.filter(r => r.status === 'rejected')
          if (failures.length > 0) {
            console.warn(`Regeneration partially failed for ${convId}:`, failures.map(f => f.reason?.message))
          }
        } catch (err) {
          console.warn(`Regeneration failed for conversation ${convId}:`, err.message)
        }
      })

      await Promise.allSettled(promises)
    } catch (err) {
      console.warn('Bulk regeneration failed:', err.message)
    }
  }, [selected, settings, updateConversation])

  const handleBulkDelete = useCallback(async () => {
    try {
      await deleteConversations([...selected])
      setSelected(new Set())
    } catch (err) {
      console.error('Failed to delete conversations:', err)
    }
  }, [selected, deleteConversations])

  // ── Render ──
  return (
    <div className="flex h-screen font-sans overflow-hidden" style={{ backgroundColor: '#FFFFFF', color: '#1E2532' }}>
      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING_SMOOTH, delay: 0.1 }}
          className="flex items-center justify-between px-8 pt-8 pb-4"
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ rotate: [0, -8, 8, 0] }}
                transition={{ duration: 0.6, delay: 0.6, ease: 'easeInOut' }}
              >
                <MessageSquare className="w-5 h-5 text-[#4A7AE5]" />
              </motion.div>
              <h1 className="text-lg font-semibold text-[#1E2532]">Chats</h1>
            </div>
            <div data-tour="view-toggle">
              <ViewToggle activeView={globalView} onChangeView={handleGlobalViewChange} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!favSidebarOpen && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setFavSidebarOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-semibold border border-[#EBEBEB] bg-white text-[#6B7C93] hover:text-[#E5A620] hover:border-[#E5A620]/40 transition-colors"
              >
                <Star className="w-3.5 h-3.5" />
                <span className="text-xs">{favorites.length}</span>
              </motion.button>
            )}
            <motion.button
              data-tour="new-chat-btn"
              onClick={handleNewChat}
              whileHover={{ scale: 1.03, borderColor: '#4A7AE5' }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm border border-[#EBEBEB] bg-white text-[#1E2532] transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Chat
            </motion.button>
            <motion.button
              data-tour="settings-btn"
              onClick={() => navigate('/settings')}
              whileHover={{ scale: 1.1, rotate: 45 }}
              whileTap={{ scale: 0.9 }}
              className="p-2.5 rounded-lg border border-[#EBEBEB] bg-white text-[#6B7C93] hover:text-[#1E2532] hover:border-[#D5D5D5] transition-colors"
              title="Settings & API"
            >
              <Settings className="w-4 h-4" />
            </motion.button>
          </div>
        </motion.div>

        {/* Storage warning banner */}
        <StorageWarningBanner usagePercent={storagePercent} />

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING_SMOOTH, delay: 0.15 }}
          className="px-8 pb-5"
        >
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D5D5D5]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats, notes, highlights, tags..."
              className="w-full bg-white rounded-lg pl-10 pr-4 py-2.5 text-sm text-[#1E2532] outline-none placeholder:text-[#D5D5D5] border border-[#EBEBEB] focus:border-[#4A7AE5] transition-colors"
            />
          </div>
        </motion.div>

        {/* Table */}
        <div className="flex-1 overflow-hidden px-8 pb-8 flex">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ ...SPRING_SMOOTH, delay: 0.2 }}
            className="flex-1 flex flex-col min-w-0 overflow-hidden"
          >
            <div className="border border-[#EBEBEB] rounded-xl overflow-hidden flex flex-col flex-1">
              {/* Table Header */}
              <motion.div
                animate={{ backgroundColor: someSelected ? '#F0F5FF' : '#FAFAFA' }}
                transition={{ duration: 0.2 }}
                className="flex items-center border-b border-[#EBEBEB] px-2"
                style={{ minHeight: 40 }}
              >
                <div className="w-8 flex-shrink-0 flex items-center justify-center">
                  <Checkbox checked={allSelected} indeterminate={someSelected && !allSelected} onChange={toggleAll} />
                </div>

                <AnimatePresence mode="wait">
                  {someSelected ? (
                    <motion.div
                      key="bulk"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={SPRING_SNAPPY}
                      className="flex-1 flex items-center gap-1 px-1"
                    >
                      <span className="text-[11px] font-semibold text-[#4A7AE5]">
                        {selected.size} selected
                        {selectedSizeTotal > 0 && (
                          <span className="text-[#6B7C93] font-normal"> — {formatBytes(selectedSizeTotal)}</span>
                        )}
                      </span>
                      <div className="flex items-center gap-0.5 ml-3">
                        <InlineAction icon={Pin} label={pinLabel} onClick={handleBulkPinToggle} />
                        <InlineAction icon={RefreshCw} label="Regenerate summaries" onClick={handleBulkRegenerate} />
                        <InlineAction icon={Trash2} label="Delete" onClick={handleBulkDelete} danger />
                      </div>
                      <div className="ml-auto">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setSelected(new Set())}
                          className="px-2.5 py-1 rounded-md text-[11px] font-semibold text-[#6B7C93] hover:text-[#1E2532] hover:bg-white/60 transition-colors"
                        >
                          Clear
                        </motion.button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div key="headers" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex items-center">
                      <div className="flex-1 min-w-0 px-2">
                        <span className="text-[11px] font-semibold text-[#94A0AE] uppercase tracking-wider">Title</span>
                      </div>

                      <div className="w-36 flex-shrink-0 px-2 text-center">
                        <span className="text-[11px] font-semibold text-[#94A0AE] uppercase tracking-wider">Topics</span>
                      </div>

                      <button onClick={() => handleSort('updatedAt')} className="w-24 flex-shrink-0 px-2 flex items-center justify-center gap-1 group cursor-pointer">
                        <span className={`text-[11px] font-semibold uppercase tracking-wider transition-colors ${sortField === 'updatedAt' ? 'text-[#4A7AE5]' : 'text-[#94A0AE] group-hover:text-[#6B7C93]'}`}>Edited</span>
                        {sortField === 'updatedAt' && (
                          <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={SPRING_SNAPPY}>
                            {sortDir === 'desc' ? <ArrowDown className="w-3 h-3 text-[#4A7AE5]" /> : <ArrowUp className="w-3 h-3 text-[#4A7AE5]" />}
                          </motion.div>
                        )}
                      </button>

                      <button onClick={() => handleSort('createdAt')} className="w-24 flex-shrink-0 px-2 flex items-center justify-center gap-1 group cursor-pointer">
                        <span className={`text-[11px] font-semibold uppercase tracking-wider transition-colors ${sortField === 'createdAt' ? 'text-[#4A7AE5]' : 'text-[#94A0AE] group-hover:text-[#6B7C93]'}`}>Created</span>
                        {sortField === 'createdAt' && (
                          <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={SPRING_SNAPPY}>
                            {sortDir === 'desc' ? <ArrowDown className="w-3 h-3 text-[#4A7AE5]" /> : <ArrowUp className="w-3 h-3 text-[#4A7AE5]" />}
                          </motion.div>
                        )}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Table Body */}
              <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#EBEBEB transparent' }}>
                <motion.div variants={staggerContainer} initial={false} animate="show">
                  {sortedChats.map((chat) => (
                    <ChatTableRow
                      key={chat.id}
                      chat={chat}
                      globalView={globalView}
                      familyColor={chat.familyId ? familyColorMap[chat.familyId] : null}
                      allChats={hydratedConversations}
                      isDeemphasized={isRowDeemphasized(chat)}
                      rowOverride={rowOverrides[chat.id] || null}
                      onSetRowOverride={setRowOverride}
                      selected={selected}
                      onToggleSelected={toggleSelected}
                      onNavigate={handleNavigate}
                      onTitleEdit={handleTitleEdit}
                      onUpdateNotes={handleUpdateNotes}
                    />
                  ))}
                </motion.div>
                {sortedChats.length === 0 && searchQuery && (
                  <div className="flex flex-col items-center justify-center py-16 px-4">
                    <Search className="w-8 h-8 text-[#EBEBEB] mb-3" />
                    <p className="text-sm text-[#6B7C93]">No chats matching "{searchQuery}"</p>
                  </div>
                )}
                {sortedChats.length === 0 && !searchQuery && (
                  <div className="flex flex-col items-center justify-center py-16 px-4">
                    <MessageSquare className="w-8 h-8 text-[#EBEBEB] mb-3" />
                    <p className="text-sm text-[#6B7C93] mb-1">No conversations yet</p>
                    <p className="text-xs text-[#6B7C93] mb-4">Start your first conversation with Claude</p>
                    <motion.button
                      onClick={handleNewChat}
                      whileHover={{ scale: 1.03, borderColor: '#4A7AE5' }}
                      whileTap={{ scale: 0.97 }}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm border border-[#EBEBEB] bg-white text-[#1E2532] transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      New Chat
                    </motion.button>
                  </div>
                )}
              </div>

              {/* Footer — simplified */}
              <div className="flex items-center justify-between px-4 py-2 border-t border-[#EBEBEB] bg-[#FAFAFA]">
                <span className="text-[11px] text-[#94A0AE]">
                  {hydratedConversations.length} conversation{hydratedConversations.length !== 1 ? 's' : ''}
                </span>
                <span className="text-[11px] text-[#94A0AE]">
                  {formatBytes(hydratedConversations.reduce((sum, c) => sum + (c.storageBytes || 0), 0))} total
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ═══ Right Sidebar — Favorites ═══ */}
      <motion.div
        animate={{ width: favSidebarOpen ? 300 : 0 }}
        transition={SIDEBAR_RESIZE}
        className="flex-shrink-0 overflow-hidden"
        style={{ borderLeft: favSidebarOpen ? '1px solid #F0F0F0' : 'none' }}
      >
        <AnimatePresence>
          {favSidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, delay: 0.1 }}
              className="w-[300px] h-full flex flex-col"
            >
              {/* Sidebar Header */}
              <div className="flex items-center justify-between px-4" style={{ paddingTop: '2.25rem', paddingBottom: '1rem' }}>
                <div className="flex items-center gap-2">
                  <Star className="w-3.5 h-3.5 text-[#E5A620]" style={{ fill: '#E5A620' }} />
                  <span className="text-sm font-semibold text-[#1E2532]">Favorites</span>
                  <span className="text-xs text-[#94A0AE]">{favorites.length}</span>
                </div>
                <motion.button
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setFavSidebarOpen(false)}
                  className="p-1.5 rounded hover:bg-[#EEEEEE] text-[#6B7C93] hover:text-[#1E2532] transition-colors"
                  title="Collapse"
                >
                  <PanelRight className="w-4 h-4" />
                </motion.button>
              </div>

              {/* Favorites List */}
              <div className="flex-1 overflow-y-auto px-3 pb-4" style={{ scrollbarWidth: 'thin', scrollbarColor: '#EBEBEB transparent' }}>
                {favorites.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full px-4">
                    <Star className="w-8 h-8 text-[#EBEBEB] mb-3" />
                    <p className="text-xs text-[#6B7C93] text-center leading-relaxed">
                      Star messages in conversations to save them here for quick access
                    </p>
                  </div>
                ) : (
                  <motion.div variants={staggerContainer} initial={false} animate="show" className="space-y-2">
                    {favorites.map((fav) => (
                      <FavoriteCard key={fav.id} favorite={fav} onRemove={() => removeFavorite(fav.id)} onNavigate={handleNavigate} />
                    ))}
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Onboarding Tour */}
      {showTour && <TourTooltip steps={SELECTOR_TOUR_STEPS} onDone={handleTourDone} />}
    </div>
  )
}