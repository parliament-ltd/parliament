import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, GitBranch, Plus, MessageSquare, Trash2, Copy, Pin,
  Check, Settings, AlertCircle, X, StickyNote, Highlighter,
  Sparkles, RefreshCw, Star,
} from 'lucide-react'
import { useConversations } from '../../stores/ConversationContext'
import { useSettings } from '../../stores/SettingsContext'
import {
  getFavorites, deleteFavorite, getHighlights, getNotes,
} from '../../lib/db'
import { SPRING_SNAPPY, SPRING_SMOOTH } from '../../lib/constants'
const FAMILY_COLORS = ['#B8A070', '#0F7B6C', '#D9730D', '#7C6CD4', '#E03E3E', '#06B6D4', '#EC4899', '#F97316']

const VIEWS = [
  { id: 'summary', icon: Sparkles, label: 'Summary' },
  { id: 'notes', icon: StickyNote, label: 'Notes' },
  { id: 'highlights', icon: Highlighter, label: 'Highlights' },
  { id: 'branches', icon: GitBranch, label: 'Branches' },
]

function buildFamilyColorMap(conversations) {
  const families = [...new Set(conversations.filter(c => c.familyId).map(c => c.familyId))]
  const map = {}
  families.forEach((fid, i) => { map[fid] = FAMILY_COLORS[i % FAMILY_COLORS.length] })
  return map
}

function formatRelative(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const yy = String(date.getFullYear()).slice(-2)
  return `${mm}/${dd}/${yy}`
}

function formatBytes(bytes) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/* ── Storage Warning Banner ────────────────────────────── */

function StorageWarningBanner({ usagePercent }) {
  const [dismissed, setDismissed] = useState(false)
  if (usagePercent < 80 || dismissed) return null
  const isCritical = usagePercent >= 95
  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={SPRING_SMOOTH}
      className={`flex items-center gap-2 px-5 py-2 text-xs ${isCritical ? 'text-red-500 bg-red-50' : 'text-amber-600 bg-amber-50'}`}>
      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="flex-1">{isCritical ? 'Storage critically full.' : 'Storage getting full. Consider exporting.'}</span>
      <button onClick={() => setDismissed(true)} className="p-1 rounded-full active:bg-black/5"><X className="w-3 h-3" /></button>
    </motion.div>
  )
}

/* ── Checkbox ─────────────────────────────────────────── */

function Checkbox({ checked, onChange }) {
  return (
    <button onClick={(e) => { e.stopPropagation(); onChange() }}
      className="w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors"
      style={{ borderColor: checked ? '#B8A070' : '#9B9A97', backgroundColor: checked ? '#B8A070' : 'transparent' }}>
      {checked && (
        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  )
}

/* ── Bulk Action Bar ──────────────────────────────────── */

function BulkActionBar({ selectedCount, selectedBytes, onPin, onDelete, onClear }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.96 }}
      transition={SPRING_SNAPPY}
      className="absolute left-4 right-4 z-30 flex items-center justify-between rounded-2xl bg-white border border-[#E9E9E7] px-4 py-2.5"
      style={{ top: 8, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[13px] font-medium text-[#B8A070]">{selectedCount} selected</span>
        {selectedBytes > 0 && <span className="text-[11px] text-[#C0C8D4]">{formatBytes(selectedBytes)}</span>}
      </div>
      <div className="flex items-center gap-0.5">
        <button onClick={onPin} className="p-2.5 rounded-xl active:bg-[#F0F5FF] text-[#787774]">
          <Pin className="w-[18px] h-[18px]" />
        </button>
        <button onClick={onDelete} className="p-2.5 rounded-xl active:bg-red-50 text-[#787774]">
          <Trash2 className="w-[18px] h-[18px]" />
        </button>
      </div>
      <button onClick={onClear} className="p-2 -mr-1 rounded-xl active:bg-[#F1F1EF]">
        <X className="w-4 h-4 text-[#787774]" />
      </button>
    </motion.div>
  )
}

/* ── Chat Row ─────────────────────────────────────────── */

function ChatRow({ conv, activeView, allConvs, familyColor, rowData, selectionMode, isSelected, onOpen, onToggleSelect }) {
  const notes = rowData?.notes || []
  const highlights = rowData?.highlights || []
  const isBranch = !!conv.parentId
  const children = allConvs.filter(c => c.parentId === conv.id)

  const isDeemphasized = (
    (activeView === 'notes' && notes.length === 0) ||
    (activeView === 'highlights' && highlights.length === 0) ||
    (activeView === 'branches' && !isBranch && children.length === 0)
  )

  return (
    <motion.div
      className="border-b border-[#F1F1EF]"
      style={{ opacity: isDeemphasized ? 0.4 : 1, transition: 'opacity 0.2s ease' }}
    >
      <div
        className="flex items-start gap-3 px-5 py-3.5 active:bg-[#F7F6F3] transition-colors"
        style={{ backgroundColor: isSelected ? '#F0F5FF' : undefined }}
        onClick={() => selectionMode ? onToggleSelect(conv.id) : onOpen(conv.id)}
      >
        <AnimatePresence>
          {selectionMode && (
            <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 20, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
              transition={SPRING_SNAPPY} className="flex-shrink-0 pt-0.5 overflow-hidden">
              <Checkbox checked={isSelected} onChange={() => onToggleSelect(conv.id)} />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-medium text-[#191919] truncate flex-1">{conv.title || 'Untitled'}</span>
            {conv.pinned && <Pin className="w-3 h-3 text-[#B8A070] flex-shrink-0" style={{ fill: '#B8A070' }} />}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-[11px] text-[#C0C8D4]">edited {formatRelative(conv.updatedAt)}</span>
          </div>

          {/* View-specific content */}
          <AnimatePresence mode="wait">
            <motion.div key={activeView} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.12 }}>
              {activeView === 'summary' && conv.aiSummary && (
                <p className="text-[12px] text-[#9CA7B8] leading-relaxed mt-1 line-clamp-2">{conv.aiSummary}</p>
              )}
              {activeView === 'notes' && (
                notes.length === 0
                  ? <p className="text-[11px] text-[#9B9A97] mt-1 italic">No notes</p>
                  : <div className="mt-1.5 space-y-1">
                    {notes.slice(0, 2).map(n => (
                      <div key={n.id} className="flex items-start gap-2">
                        <div className="w-1 min-h-[14px] rounded-full flex-shrink-0 mt-0.5 bg-[#B8A070]/20" />
                        <p className="text-[12px] text-[#37352F] line-clamp-1 flex-1">{n.text}</p>
                      </div>
                    ))}
                    {notes.length > 2 && <span className="text-[10px] text-[#C0C8D4] ml-3">+{notes.length - 2} more</span>}
                  </div>
              )}
              {activeView === 'highlights' && (
                highlights.length === 0
                  ? <p className="text-[11px] text-[#9B9A97] mt-1 italic">No highlights</p>
                  : <div className="mt-1.5 space-y-1">
                    {highlights.slice(0, 2).map(h => (
                      <div key={h.id} className="flex items-start gap-2">
                        <div className="flex-shrink-0 mt-1 w-0.5 h-3.5 rounded-full" style={{ backgroundColor: h.color || '#B8A070' }} />
                        <p className="text-[12px] text-[#37352F] line-clamp-1 flex-1">{h.text}</p>
                      </div>
                    ))}
                    {highlights.length > 2 && <span className="text-[10px] text-[#C0C8D4] ml-3">+{highlights.length - 2} more</span>}
                  </div>
              )}
              {activeView === 'branches' && (
                !isBranch && children.length === 0
                  ? <p className="text-[11px] text-[#9B9A97] mt-1 italic">No branches</p>
                  : <div className="mt-1.5 space-y-1">
                    {isBranch && (
                      <div className="flex items-center gap-2">
                        <div className="rounded-full flex-shrink-0" style={{ backgroundColor: familyColor || '#7C6CD4', width: 3, height: 14 }} />
                        <span className="text-[10px] text-[#9CA7B8]">branched from</span>
                        <span className="text-[12px] text-[#37352F] font-medium truncate">{conv.parentTitle || '...'}</span>
                      </div>
                    )}
                    {children.slice(0, 2).map(child => (
                      <div key={child.id} className="flex items-center gap-2">
                        <div className="rounded-full flex-shrink-0" style={{ backgroundColor: familyColor || '#7C6CD4', width: 3, height: 14 }} />
                        <GitBranch className="w-2.5 h-2.5 text-[#7C6CD4] flex-shrink-0" />
                        <span className="text-[12px] text-[#37352F] font-medium truncate">{child.title}</span>
                      </div>
                    ))}
                  </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}

/* ── Bottom Tab Bar ───────────────────────────────────── */

function BottomTabBar({ activeView, onChangeView }) {
  return (
    <div className="flex items-center justify-around border-t border-[#E9E9E7] bg-white/95 backdrop-blur-sm"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)', paddingTop: 10 }}>
      {VIEWS.map(({ id, icon: Icon, label }) => {
        const isActive = activeView === id
        return (
          <button key={id} onClick={() => onChangeView(id)} className="flex flex-col items-center gap-1 px-4 py-1 relative">
            {isActive && (
              <motion.div layoutId="swift-tab-indicator" className="absolute -top-[10px] left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-[#B8A070]" transition={SPRING_SNAPPY} />
            )}
            <Icon className="w-5 h-5 transition-colors" style={{ color: isActive ? '#B8A070' : '#C0C8D4' }} />
            <span className="text-[10px] font-medium transition-colors" style={{ color: isActive ? '#B8A070' : '#C0C8D4' }}>{label}</span>
          </button>
        )
      })}
    </div>
  )
}

/* ── Favorites Sheet ──────────────────────────────────── */

function FavoritesSheet({ open, onClose, favorites, onRemove }) {
  if (!open) return null
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }} onClick={onClose}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={SPRING_SMOOTH}
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1"><div className="w-9 h-1 rounded-full bg-[#9B9A97]" /></div>
        <div className="flex items-center justify-between px-5 pb-3 pt-1">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-[#D9730D]" style={{ fill: '#D9730D' }} />
            <span className="text-base font-medium text-[#191919]">Favorites</span>
            <span className="text-xs text-[#C0C8D4]">{favorites.length}</span>
          </div>
          <button onClick={onClose} className="p-2 -mr-2 rounded-full active:bg-[#F1F1EF]"><X className="w-4 h-4 text-[#787774]" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-8" style={{ WebkitOverflowScrolling: 'touch' }}>
          {favorites.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Star className="w-8 h-8 text-[#E9E9E7] mb-3" />
              <p className="text-xs text-[#787774] text-center">Star messages in conversations to save them here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {favorites.map(fav => (
                <FavoriteCard key={fav.id} favorite={fav} onRemove={() => onRemove(fav.id)} />
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

function FavoriteCard({ favorite, onRemove }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(favorite.content || favorite.snippet || '').catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div className="rounded-lg border border-[#E9E9E7] bg-white overflow-hidden">
      <div className="px-4 pt-3 pb-2">
        <p className="text-xs text-[#191919] leading-relaxed line-clamp-3">{favorite.content || favorite.snippet || ''}</p>
      </div>
      <div className="flex items-center justify-between px-4 pb-3">
        <span className="text-[10px] text-[#787774] truncate flex-1 mr-3">{favorite.conversationTitle || ''}</span>
        <div className="flex items-center gap-1">
          <button onClick={handleCopy} className="p-2 rounded-lg active:bg-[#F1F1EF] text-[#787774]">
            {copied ? <Check className="w-3.5 h-3.5 text-[#0F7B6C]" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button onClick={onRemove} className="p-2 rounded-lg active:bg-red-50 text-[#787774]">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Swift Selector Layout ────────────────────────────── */

export default function SwiftSelectorLayout() {
  const navigate = useNavigate()
  const { conversations, deleteConversation, updateConversation, createConversation, loadConversations } = useConversations()
  const { storageUsage } = useSettings()

  // Refresh from IndexedDB on mount — picks up storageBytes/familyId/parentTitle
  // writes that happen outside the React context (addMessage, createBranch).
  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  const [searchQuery, setSearchQuery] = useState('')
  const [activeView, setActiveView] = useState('summary')
  const [searchFocused, setSearchFocused] = useState(false)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selected, setSelected] = useState(new Set())
  const [favorites, setFavorites] = useState([])
  const [favSheetOpen, setFavSheetOpen] = useState(false)
  const [rowData, setRowData] = useState({}) // convId → { notes, highlights }
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 })

  useEffect(() => {
    getFavorites().then(setFavorites).catch(console.error)
  }, [])

  // Load notes + highlights for visible conversations (lazy, per-view)
  useEffect(() => {
    if (activeView !== 'notes' && activeView !== 'highlights') return
    const loadData = async () => {
      const updated = {}
      await Promise.all(conversations.map(async (conv) => {
        try {
          const [notes, highlights] = await Promise.all([getNotes(conv.id), getHighlights(conv.id)])
          updated[conv.id] = { notes, highlights }
        } catch {}
      }))
      setRowData(updated)
    }
    loadData()
  }, [activeView, conversations])

  const familyColorMap = useMemo(() => buildFamilyColorMap(conversations), [conversations])

  const sortedConvs = useMemo(() => {
    let filtered = [...conversations]
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(c =>
        (c.title || '').toLowerCase().includes(q) ||
        (c.aiSummary || '').toLowerCase().includes(q)
      )
    }
    filtered.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
    filtered.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))
    return filtered
  }, [conversations, searchQuery])

  const toggleSelected = useCallback((id) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }, [])

  const exitSelectionMode = useCallback(() => { setSelectionMode(false); setSelected(new Set()) }, [])

  const selectedSizeTotal = useMemo(() => {
    let t = 0
    selected.forEach(id => { const c = conversations.find(c => c.id === id); if (c?.storageBytes) t += c.storageBytes })
    return t
  }, [selected, conversations])

  const handleNewChat = useCallback(async () => {
    const conv = await createConversation()
    navigate(`/chat/${conv.id}`)
  }, [createConversation, navigate])

  const handleBulkPin = useCallback(async () => {
    const anyUnpinned = [...selected].some(id => { const c = conversations.find(c => c.id === id); return c && !c.pinned })
    await Promise.all([...selected].map(id => updateConversation(id, { pinned: anyUnpinned })))
    exitSelectionMode()
  }, [selected, conversations, updateConversation, exitSelectionMode])

  const handleBulkDelete = useCallback(async () => {
    await Promise.all([...selected].map(id => deleteConversation(id)))
    await loadConversations()
    exitSelectionMode()
  }, [selected, deleteConversation, loadConversations, exitSelectionMode])

  const handleRemoveFavorite = useCallback(async (favId) => {
    try { await deleteFavorite(favId) } catch {}
    setFavorites(prev => prev.filter(f => f.id !== favId))
  }, [])

  const storagePercent = storageUsage?.quota ? Math.round((storageUsage.usage / storageUsage.quota) * 100) : 0

  // Swipe right → selection mode
  const handleTouchStart = useCallback((e) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, time: Date.now() }
  }, [])

  const handleTouchEnd = useCallback((e) => {
    if (selectionMode) return
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y
    const dt = Date.now() - touchStartRef.current.time
    if (dx > 60 && Math.abs(dx) > Math.abs(dy) * 1.8 && dt < 400) {
      setSelectionMode(true)
    }
  }, [selectionMode])

  return (
    <div className="flex flex-col font-sans overflow-hidden bg-white text-[#191919]"
      style={{ height: '100dvh', maxWidth: 430, margin: '0 auto', position: 'relative' }}>

      {/* ── Top Bar ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...SPRING_SMOOTH, delay: 0.05 }}
        className="flex items-center justify-between px-5 pb-2"
        style={{ paddingTop: 'max(env(safe-area-inset-top, 12px), 12px)' }}
      >
        <div className="flex items-center gap-1.5">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate('/settings')}
            data-tour="settings-btn"
            className="p-2.5 rounded-lg border border-[#E9E9E7] bg-white active:bg-[#F7F6F3]">
            <Settings className="w-4 h-4 text-[#787774]" />
          </motion.button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setFavSheetOpen(true)}
            className="p-2.5 rounded-lg border border-[#E9E9E7] bg-white active:bg-[#F7F6F3] relative">
            <Star className="w-4 h-4 text-[#787774]" />
            {favorites.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#D9730D] text-white text-[9px] font-bold flex items-center justify-center">
                {favorites.length}
              </span>
            )}
          </motion.button>
        </div>

        <motion.button whileTap={{ scale: 0.95 }} onClick={handleNewChat} data-tour="new-chat-btn"
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-[#E9E9E7] bg-white active:bg-[#F7F6F3]">
          <Plus className="w-4 h-4 text-[#B8A070]" />
          <span className="text-[13px] font-medium text-[#191919]">Chat</span>
        </motion.button>
      </motion.div>

      {/* ── Search Bar ── */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING_SMOOTH, delay: 0.1 }} className="px-5 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9B9A97]" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)}
            placeholder="Search chats..."
            className="w-full bg-[#F8F8F8] rounded-xl pl-9 pr-4 py-2.5 text-[#191919] outline-none placeholder:text-[#9B9A97] border transition-colors"
            style={{ borderColor: searchFocused ? '#B8A070' : 'transparent', fontSize: 16 }} />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full active:bg-[#F1F1EF]">
              <X className="w-3.5 h-3.5 text-[#C0C8D4]" />
            </button>
          )}
        </div>
      </motion.div>

      <AnimatePresence><StorageWarningBanner usagePercent={storagePercent} /></AnimatePresence>

      {/* ── Chat List ── */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence>
          {selectionMode && (
            <BulkActionBar selectedCount={selected.size} selectedBytes={selectedSizeTotal}
              onPin={handleBulkPin} onDelete={handleBulkDelete} onClear={exitSelectionMode} />
          )}
        </AnimatePresence>

        <div className="h-full overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}
          onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>

          <AnimatePresence>
            {selectionMode && (
              <motion.div initial={{ height: 0 }} animate={{ height: 56 }} exit={{ height: 0 }} transition={{ duration: 0.15 }} />
            )}
          </AnimatePresence>

          {sortedConvs.map((conv) => (
            <ChatRow
              key={conv.id}
              conv={conv}
              activeView={activeView}
              allConvs={conversations}
              familyColor={conv.familyId ? familyColorMap[conv.familyId] : null}
              rowData={rowData[conv.id]}
              selectionMode={selectionMode}
              isSelected={selected.has(conv.id)}
              onOpen={(id) => navigate(`/chat/${id}`)}
              onToggleSelect={toggleSelected}
            />
          ))}

          {sortedConvs.length === 0 && searchQuery && (
            <div className="flex flex-col items-center justify-center py-20 px-8">
              <Search className="w-8 h-8 text-[#E9E9E7] mb-3" />
              <p className="text-sm text-[#787774] text-center">No chats matching "{searchQuery}"</p>
            </div>
          )}
          {sortedConvs.length === 0 && !searchQuery && (
            <div className="flex flex-col items-center justify-center py-20 px-8">
              <img src="/parliament_logo.png" alt="" className="w-12 h-12 mb-4 object-contain" style={{ opacity: 0.26 }} />
              <p className="text-sm text-[#787774] mb-1">No conversations yet</p>
              <p className="text-xs text-[#C0C8D4]">Tap + Chat to start</p>
            </div>
          )}

          <div className="flex items-center justify-center py-4 px-5">
            <span className="text-[11px] text-[#9B9A97]">{conversations.length} conversation{conversations.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {/* ── Bottom Tab Bar ── */}
      <BottomTabBar activeView={activeView} onChangeView={(v) => { setActiveView(v) }} />

      {/* ── Favorites Sheet ── */}
      <AnimatePresence>
        {favSheetOpen && (
          <FavoritesSheet open favorites={favorites} onClose={() => setFavSheetOpen(false)} onRemove={handleRemoveFavorite} />
        )}
      </AnimatePresence>

      {/* Tour disabled on mobile — tooltip positioning is unreliable on small screens */}
    </div>
  )
}
