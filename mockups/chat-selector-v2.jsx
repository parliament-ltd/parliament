import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, GitBranch, Plus, MessageSquare, ArrowUp, ArrowDown, Trash2, Copy, Archive, Pin, PinOff, ChevronRight, Star, PanelRight, Check, Settings, AlertCircle, X } from 'lucide-react';

const SPRING_SNAPPY = { type: 'spring', stiffness: 500, damping: 30 };
const SPRING_SMOOTH = { type: 'spring', stiffness: 300, damping: 28 };
const SIDEBAR_RESIZE = { type: 'spring', stiffness: 150, damping: 25 };
const staggerContainer = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.03, delayChildren: 0.06 } } };
const staggerItem = { hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0, transition: SPRING_SMOOTH } };

/* ═══════════════════════════════════════════════════════════ */
/*  MOCK DATA                                                  */
/* ═══════════════════════════════════════════════════════════ */

const MOCK_CHATS = [
  {
    id: 'c1', title: 'Custom Chat Interface Design', lastEdited: '2025-02-25T14:30:00', created: '2025-02-20T09:15:00', pinned: true, storageBytes: 245760,
    branches: [
      { id: 'c1-b1', title: 'Alt: Product Focus', lastEdited: '2025-02-24T11:00:00', created: '2025-02-21T10:00:00', storageBytes: 81920 },
      { id: 'c1-b2', title: 'Alt: Technical Deep Dive', lastEdited: '2025-02-23T16:45:00', created: '2025-02-21T14:30:00', storageBytes: 122880 },
    ],
  },
  { id: 'c2', title: 'API Integration Strategy', lastEdited: '2025-02-25T10:12:00', created: '2025-02-22T14:00:00', pinned: false, storageBytes: 184320, branches: [] },
  {
    id: 'c3', title: 'Context Window Optimization', lastEdited: '2025-02-24T18:45:00', created: '2025-02-19T08:30:00', pinned: false, storageBytes: 512000,
    branches: [{ id: 'c3-b1', title: 'Alt: Token Compression', lastEdited: '2025-02-24T17:00:00', created: '2025-02-20T11:00:00', storageBytes: 163840 }],
  },
  { id: 'c4', title: 'User Research Findings', lastEdited: '2025-02-23T09:00:00', created: '2025-02-18T11:20:00', pinned: false, storageBytes: 71680, branches: [] },
  {
    id: 'c5', title: 'Collaboration Mode Prototyping', lastEdited: '2025-02-22T15:30:00', created: '2025-02-17T10:00:00', pinned: false, storageBytes: 327680,
    branches: [
      { id: 'c5-b1', title: 'Alt: Preset System', lastEdited: '2025-02-22T14:00:00', created: '2025-02-18T09:00:00', storageBytes: 92160 },
      { id: 'c5-b2', title: 'Alt: Activity Tracking', lastEdited: '2025-02-21T09:15:00', created: '2025-02-18T15:30:00', storageBytes: 61440 },
    ],
  },
  { id: 'c6', title: 'Export & Review System', lastEdited: '2025-02-21T12:00:00', created: '2025-02-15T16:45:00', pinned: false, storageBytes: 143360, branches: [] },
  { id: 'c7', title: 'Keyboard Shortcuts Design', lastEdited: '2025-02-20T08:30:00', created: '2025-02-14T13:00:00', pinned: false, storageBytes: 40960, branches: [] },
  {
    id: 'c8', title: 'Prompt Engineering Patterns', lastEdited: '2025-02-19T16:20:00', created: '2025-02-12T10:45:00', pinned: false, storageBytes: 204800,
    branches: [{ id: 'c8-b1', title: 'Alt: Chain-of-Thought', lastEdited: '2025-02-19T14:00:00', created: '2025-02-13T08:30:00', storageBytes: 102400 }],
  },
];

const MOCK_FAVORITES = [
  { id: 'f1', snippet: '=VLOOKUP(A2, Sheet2!A:B, 2, FALSE)', source: 'API Integration Strategy', sourceId: 'c2' },
  { id: 'f2', snippet: 'The context window limit is 200k tokens. For optimal performance, keep prompts under 80k and use summarization for longer threads.', source: 'Context Window Optimization', sourceId: 'c3' },
  { id: 'f3', snippet: 'git checkout -b feature/new-branch && git push -u origin feature/new-branch', source: 'Custom Chat Interface Design', sourceId: 'c1' },
  { id: 'f4', snippet: 'Key insight: power users represent 12% of the user base but account for 64% of total API calls.', source: 'User Research Findings', sourceId: 'c4' },
  { id: 'f5', snippet: '=INDEX(B:B, MATCH(1, (A:A="criteria1")*(C:C>100), 0))', source: 'API Integration Strategy', sourceId: 'c2' },
  { id: 'f6', snippet: 'For keyboard shortcuts, use Cmd/Ctrl as the modifier base. Avoid conflicts with browser defaults. Priority shortcuts: Cmd+K (search), Cmd+B (branch), Cmd+/ (shortcuts panel).', source: 'Keyboard Shortcuts Design', sourceId: 'c7' },
];

// Toggle to demo storage warning banner — set to 82 for amber, 96 for red, 50 for none
const MOCK_STORAGE_PERCENT = 82;

/* ═══════════════════════════════════════════════════════════ */
/*  UTILITIES                                                   */
/* ═══════════════════════════════════════════════════════════ */

function formatRelative(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const yy = String(date.getFullYear()).slice(-2);
  return `${mm}/${dd}/${yy}`;
}

function formatShortDate(dateStr) {
  const d = new Date(dateStr);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${mm}/${dd}/${yy}`;
}

function formatBytes(bytes) {
  if (bytes == null || bytes === 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getAllIds(chats) {
  const ids = [];
  chats.forEach(c => { ids.push(c.id); c.branches.forEach(b => ids.push(b.id)); });
  return ids;
}

/* ═══════════════════════════════════════════════════════════ */
/*  STORAGE WARNING BANNER                                     */
/* ═══════════════════════════════════════════════════════════ */

function StorageWarningBanner({ usagePercent }) {
  const [dismissed, setDismissed] = useState(false);
  if (usagePercent < 80 || dismissed) return null;

  const isCritical = usagePercent >= 95;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={SPRING_SMOOTH}
      className={`flex items-center gap-2.5 px-8 py-2.5 text-xs border-b ${
        isCritical
          ? 'bg-[#EF4444]/5 text-[#EF4444] border-[#EF4444]/15'
          : 'bg-[#E5A620]/5 text-[#E5A620] border-[#E5A620]/15'
      }`}
    >
      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="flex-1">
        {isCritical
          ? 'Storage is critically full. Export a backup or delete old conversations to continue saving.'
          : 'Your browser storage is getting full. Consider exporting a backup or cleaning up old conversations.'}
      </span>
      <motion.button
        whileHover={{ scale: 1.15 }}
        whileTap={{ scale: 0.85 }}
        onClick={() => setDismissed(true)}
        className="p-0.5 rounded hover:bg-black/5 transition-colors"
      >
        <X className="w-3 h-3" />
      </motion.button>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  INLINE TITLE EDITOR                                        */
/* ═══════════════════════════════════════════════════════════ */

function InlineTitleEditor({ title, onSave, onCancel }) {
  const [value, setValue] = useState(title);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const commit = () => {
    const trimmed = value.trim();
    if (trimmed && trimmed !== title) {
      onSave(trimmed);
    } else {
      onCancel();
    }
  };

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { e.preventDefault(); commit(); }
        if (e.key === 'Escape') onCancel();
      }}
      onBlur={commit}
      onClick={(e) => e.stopPropagation()}
      className="bg-white rounded px-1.5 py-0.5 text-sm font-semibold text-[#1E2532] outline-none border border-[#4A7AE5] w-full max-w-[320px]"
      maxLength={60}
    />
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  CHECKBOX                                                    */
/* ═══════════════════════════════════════════════════════════ */

function Checkbox({ checked, indeterminate = false, onChange }) {
  return (
    <motion.button
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.85 }}
      onClick={(e) => { e.stopPropagation(); onChange(); }}
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
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  INLINE ACTION (bulk toolbar)                                */
/* ═══════════════════════════════════════════════════════════ */

function InlineAction({ icon: Icon, label, onClick, danger = false }) {
  const [showTooltip, setShowTooltip] = useState(false);
  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={onClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`p-1.5 rounded-md transition-colors ${danger ? 'hover:bg-[#EF4444]/10 text-[#6B7C93] hover:text-[#EF4444]' : 'hover:bg-white/60 text-[#6B7C93] hover:text-[#1E2532]'}`}
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
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  FAVORITE CARD                                               */
/* ═══════════════════════════════════════════════════════════ */

function FavoriteCard({ favorite, onRemove }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(favorite.snippet).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <motion.div
      variants={staggerItem}
      whileHover={{ borderColor: '#E0E0E0' }}
      className="group rounded-lg border border-[#EBEBEB] bg-white transition-colors cursor-pointer overflow-hidden"
    >
      <div className="px-3 pt-3 pb-2">
        <p className="text-xs text-[#1E2532] leading-relaxed line-clamp-3" style={{
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {favorite.snippet}
        </p>
      </div>
      <div className="flex items-center justify-between px-3 pb-2.5">
        <span className="text-[10px] text-[#6B7C93] truncate flex-1 mr-2">{favorite.source}</span>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <motion.button
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.85 }}
            onClick={handleCopy}
            className="p-1 rounded hover:bg-[#EEEEEE] text-[#6B7C93] hover:text-[#1E2532] transition-colors"
            title="Copy"
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
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="p-1 rounded hover:bg-[#EEEEEE] text-[#6B7C93] hover:text-[#EF4444] transition-colors"
            title="Remove"
          >
            <Trash2 className="w-3 h-3" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  CHAT TABLE ROW                                              */
/* ═══════════════════════════════════════════════════════════ */

function ChatTableRow({ chat, isExpanded, onToggleExpand, selected, onToggleSelected, onTitleEdit }) {
  const hasBranches = chat.branches.length > 0;
  const isSelected = selected.has(chat.id);
  const [editingTitle, setEditingTitle] = useState(false);

  return (
    <motion.div variants={staggerItem}>
      <motion.div
        whileHover={{ backgroundColor: '#FAFAFA' }}
        transition={{ duration: 0.1 }}
        className="group flex items-center px-2 border-b border-[#F5F5F5] cursor-pointer"
        style={{ minHeight: 52, backgroundColor: isSelected ? '#F0F5FF' : undefined }}
        onClick={() => hasBranches ? onToggleExpand() : null}
      >
        {/* Checkbox */}
        <div className="w-10 flex-shrink-0 flex items-center justify-center">
          <Checkbox checked={isSelected} onChange={() => onToggleSelected(chat.id)} />
        </div>

        {/* Expand toggle */}
        <div className="w-8 flex-shrink-0 flex items-center justify-center">
          {hasBranches && (
            <motion.button
              animate={{ rotate: isExpanded ? 90 : 0 }}
              transition={SPRING_SNAPPY}
              onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
              className="p-0.5 rounded hover:bg-[#EEEEEE] transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5 text-[#6B7C93]" />
            </motion.button>
          )}
        </div>

        {/* Title + pin + branch badge */}
        <div className="flex-1 min-w-0 px-2 flex items-center gap-2">
          {editingTitle ? (
            <InlineTitleEditor
              title={chat.title}
              onSave={(newTitle) => { setEditingTitle(false); onTitleEdit(chat.id, newTitle); }}
              onCancel={() => setEditingTitle(false)}
            />
          ) : (
            <span
              className="text-sm font-semibold text-[#1E2532] truncate"
              onDoubleClick={(e) => { e.stopPropagation(); setEditingTitle(true); }}
              title="Double-click to rename"
            >
              {chat.title}
            </span>
          )}
          {chat.pinned && <Pin className="w-3 h-3 text-[#4A7AE5] flex-shrink-0" style={{ fill: '#4A7AE5' }} />}
          {hasBranches && (
            <span className="flex items-center gap-1 text-[10px] text-[#7C6CD4] bg-[#7C6CD4]/8 px-1.5 py-0.5 rounded-full flex-shrink-0 font-semibold">
              <GitBranch className="w-2.5 h-2.5" />{chat.branches.length}
            </span>
          )}
        </div>

        {/* Size */}
        <div className="w-24 flex-shrink-0 px-2 text-center">
          <span className="text-xs text-[#6B7C93]">{formatBytes(chat.storageBytes)}</span>
        </div>

        {/* Last edited */}
        <div className="w-28 flex-shrink-0 px-2 text-center">
          <span className="text-xs text-[#6B7C93]">{formatRelative(chat.lastEdited)}</span>
        </div>

        {/* Created */}
        <div className="w-28 flex-shrink-0 px-2 text-center">
          <span className="text-xs text-[#6B7C93]">{formatShortDate(chat.created)}</span>
        </div>
      </motion.div>

      {/* Expanded branches */}
      <AnimatePresence>
        {isExpanded && hasBranches && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={SPRING_SNAPPY}
            className="overflow-hidden"
          >
            {chat.branches.map((branch) => (
              <BranchRow key={branch.id} branch={branch} selected={selected} onToggleSelected={onToggleSelected} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  BRANCH ROW                                                  */
/* ═══════════════════════════════════════════════════════════ */

function BranchRow({ branch, selected, onToggleSelected }) {
  const isSelected = selected.has(branch.id);

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={SPRING_SMOOTH}
      whileHover={{ backgroundColor: '#FAFAFA' }}
      className="group flex items-center px-2 border-b border-[#F5F5F5] cursor-pointer"
      style={{ minHeight: 44, backgroundColor: isSelected ? '#F0F5FF' : undefined }}
    >
      <div className="w-10 flex-shrink-0 flex items-center justify-center">
        <Checkbox checked={isSelected} onChange={() => onToggleSelected(branch.id)} />
      </div>
      <div className="w-8 flex-shrink-0" />
      <div className="flex-1 min-w-0 px-2 flex items-center gap-2 pl-4">
        <div className="w-4 h-px bg-[#7C6CD4]/30 flex-shrink-0" />
        <GitBranch className="w-3 h-3 text-[#7C6CD4] flex-shrink-0" />
        <span className="text-xs font-semibold text-[#4A5568] truncate">{branch.title}</span>
      </div>
      <div className="w-24 flex-shrink-0 px-2 text-center">
        <span className="text-xs text-[#6B7C93]">{formatBytes(branch.storageBytes)}</span>
      </div>
      <div className="w-28 flex-shrink-0 px-2 text-center">
        <span className="text-xs text-[#6B7C93]">{formatRelative(branch.lastEdited)}</span>
      </div>
      <div className="w-28 flex-shrink-0 px-2 text-center">
        <span className="text-xs text-[#6B7C93]">{formatShortDate(branch.created)}</span>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  MAIN COMPONENT                                              */
/* ═══════════════════════════════════════════════════════════ */

export default function ChatSelector() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedChats, setExpandedChats] = useState(new Set(['c1']));
  const [selected, setSelected] = useState(new Set());
  const [sortField, setSortField] = useState('lastEdited');
  const [sortDir, setSortDir] = useState('desc');
  const [favorites, setFavorites] = useState(MOCK_FAVORITES);
  const [favSidebarOpen, setFavSidebarOpen] = useState(true);
  const [chats, setChats] = useState(MOCK_CHATS);

  const toggleExpanded = (id) => setExpandedChats(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleSelected = (id) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const handleSort = (field) => {
    if (sortField === field) setSortDir(prev => prev === 'desc' ? 'asc' : 'desc');
    else { setSortField(field); setSortDir('desc'); }
  };
  const removeFavorite = (id) => setFavorites(prev => prev.filter(f => f.id !== id));

  const handleTitleEdit = (id, newTitle) => {
    setChats(prev => prev.map(c => c.id === id ? { ...c, title: newTitle } : c));
  };

  const handleBulkPin = () => {
    setChats(prev => prev.map(c => selected.has(c.id) ? { ...c, pinned: true } : c));
    setSelected(new Set());
  };

  const handleBulkUnpin = () => {
    setChats(prev => prev.map(c => selected.has(c.id) ? { ...c, pinned: false } : c));
    setSelected(new Set());
  };

  const handleBulkDelete = () => {
    setChats(prev => prev.filter(c => !selected.has(c.id)));
    setSelected(new Set());
  };

  // Calculate total size of selected conversations
  const selectedSizeTotal = useMemo(() => {
    let total = 0;
    selected.forEach(id => {
      const chat = chats.find(c => c.id === id);
      if (chat?.storageBytes) total += chat.storageBytes;
      // Also check branches
      chats.forEach(c => {
        const branch = c.branches.find(b => b.id === id);
        if (branch?.storageBytes) total += branch.storageBytes;
      });
    });
    return total;
  }, [selected, chats]);

  const sortedChats = useMemo(() => {
    let filtered = [...chats];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.title.toLowerCase().includes(q) ||
        c.branches.some(b => b.title.toLowerCase().includes(q))
      );
    }
    // Sort by selected field
    filtered.sort((a, b) => {
      let aVal, bVal;
      if (sortField === 'storageBytes') {
        aVal = a.storageBytes || 0;
        bVal = b.storageBytes || 0;
      } else {
        aVal = new Date(a[sortField]).getTime();
        bVal = new Date(b[sortField]).getTime();
      }
      return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
    });
    // Pinned always first
    filtered.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
    return filtered;
  }, [chats, searchQuery, sortField, sortDir]);

  const allVisibleIds = useMemo(() => getAllIds(sortedChats), [sortedChats]);
  const allSelected = allVisibleIds.length > 0 && allVisibleIds.every(id => selected.has(id));
  const someSelected = allVisibleIds.some(id => selected.has(id));
  const toggleAll = () => { allSelected ? setSelected(new Set()) : setSelected(new Set(allVisibleIds)); };

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
          <div className="flex items-center gap-3">
            <motion.div animate={{ rotate: [0, -8, 8, 0] }} transition={{ duration: 0.6, delay: 0.6, ease: 'easeInOut' }}>
              <MessageSquare className="w-5 h-5 text-[#4A7AE5]" />
            </motion.div>
            <h1 className="text-lg font-semibold text-[#1E2532]">Chats</h1>
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
              whileHover={{ scale: 1.03, borderColor: '#4A7AE5' }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm border border-[#EBEBEB] bg-white text-[#1E2532] transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Chat
            </motion.button>
            <motion.button
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
        <StorageWarningBanner usagePercent={MOCK_STORAGE_PERCENT} />

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
              placeholder="Search chats..."
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
                <div className="w-10 flex-shrink-0 flex items-center justify-center">
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
                        <InlineAction icon={Pin} label="Pin" onClick={handleBulkPin} />
                        <InlineAction icon={PinOff} label="Unpin" onClick={handleBulkUnpin} />
                        <InlineAction icon={Trash2} label="Delete" onClick={handleBulkDelete} danger />
                      </div>
                      <div className="ml-auto flex items-center gap-1">
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
                      <div className="w-8 flex-shrink-0" />
                      <div className="flex-1 min-w-0 px-2">
                        <span className="text-[11px] font-semibold text-[#6B7C93] uppercase tracking-wider">Title</span>
                      </div>

                      {/* Size column header — new for Step 8 */}
                      <button onClick={() => handleSort('storageBytes')} className="w-24 flex-shrink-0 px-2 flex items-center justify-center gap-1 group cursor-pointer">
                        <span className={`text-[11px] font-semibold uppercase tracking-wider transition-colors ${sortField === 'storageBytes' ? 'text-[#4A7AE5]' : 'text-[#6B7C93] group-hover:text-[#1E2532]'}`}>Size</span>
                        {sortField === 'storageBytes' && (
                          <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={SPRING_SNAPPY}>
                            {sortDir === 'desc' ? <ArrowDown className="w-3 h-3 text-[#4A7AE5]" /> : <ArrowUp className="w-3 h-3 text-[#4A7AE5]" />}
                          </motion.div>
                        )}
                      </button>

                      <button onClick={() => handleSort('lastEdited')} className="w-28 flex-shrink-0 px-2 flex items-center justify-center gap-1 group cursor-pointer">
                        <span className={`text-[11px] font-semibold uppercase tracking-wider transition-colors ${sortField === 'lastEdited' ? 'text-[#4A7AE5]' : 'text-[#6B7C93] group-hover:text-[#1E2532]'}`}>Edited</span>
                        {sortField === 'lastEdited' && (
                          <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={SPRING_SNAPPY}>
                            {sortDir === 'desc' ? <ArrowDown className="w-3 h-3 text-[#4A7AE5]" /> : <ArrowUp className="w-3 h-3 text-[#4A7AE5]" />}
                          </motion.div>
                        )}
                      </button>
                      <button onClick={() => handleSort('created')} className="w-28 flex-shrink-0 px-2 flex items-center justify-center gap-1 group cursor-pointer">
                        <span className={`text-[11px] font-semibold uppercase tracking-wider transition-colors ${sortField === 'created' ? 'text-[#4A7AE5]' : 'text-[#6B7C93] group-hover:text-[#1E2532]'}`}>Created</span>
                        {sortField === 'created' && (
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
                <motion.div variants={staggerContainer} initial="hidden" animate="show">
                  {sortedChats.map((chat) => (
                    <ChatTableRow
                      key={chat.id}
                      chat={chat}
                      isExpanded={expandedChats.has(chat.id)}
                      onToggleExpand={() => toggleExpanded(chat.id)}
                      selected={selected}
                      onToggleSelected={toggleSelected}
                      onTitleEdit={handleTitleEdit}
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
                    <p className="text-xs text-[#6B7C93]">Start your first conversation with Claude</p>
                  </div>
                )}
              </div>

              {/* Table footer — conversation count */}
              <div className="flex items-center justify-between px-4 py-2 border-t border-[#EBEBEB] bg-[#FAFAFA]">
                <span className="text-[11px] text-[#6B7C93]">
                  {chats.length} conversation{chats.length !== 1 ? 's' : ''}
                  {chats.reduce((sum, c) => sum + c.branches.length, 0) > 0 && (
                    <span> · {chats.reduce((sum, c) => sum + c.branches.length, 0)} branch{chats.reduce((sum, c) => sum + c.branches.length, 0) !== 1 ? 'es' : ''}</span>
                  )}
                </span>
                <span className="text-[11px] text-[#6B7C93]">
                  {formatBytes(chats.reduce((sum, c) => sum + (c.storageBytes || 0) + c.branches.reduce((bs, b) => bs + (b.storageBytes || 0), 0), 0))} total
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
              <div className="flex items-center justify-between px-4" style={{ paddingTop: '2.25rem', paddingBottom: '1rem' }}>
                <div className="flex items-center gap-2">
                  <Star className="w-3.5 h-3.5 text-[#E5A620]" style={{ fill: '#E5A620' }} />
                  <span className="text-sm font-semibold text-[#1E2532]">Favorites</span>
                  <span className="text-xs text-[#6B7C93]">{favorites.length}</span>
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

              <div className="flex-1 overflow-y-auto px-3 pb-4" style={{ scrollbarWidth: 'thin', scrollbarColor: '#EBEBEB transparent' }}>
                {favorites.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full px-4">
                    <Star className="w-8 h-8 text-[#EBEBEB] mb-3" />
                    <p className="text-xs text-[#6B7C93] text-center leading-relaxed">
                      Star messages in conversations to save them here for quick access
                    </p>
                  </div>
                ) : (
                  <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-2">
                    {favorites.map((fav) => (
                      <FavoriteCard key={fav.id} favorite={fav} onRemove={() => removeFavorite(fav.id)} />
                    ))}
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
