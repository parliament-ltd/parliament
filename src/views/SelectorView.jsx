import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, GitBranch, Plus, MessageSquare, ArrowUp, ArrowDown,
  Trash2, Pin, PinOff, ChevronRight, Settings, AlertCircle,
  Check, X, MoreHorizontal,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useConversations } from '../stores/ConversationContext';
import { useSettings } from '../stores/SettingsContext';

// ═══════════════════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════════════════

const SPRING_SNAPPY = { type: 'spring', stiffness: 500, damping: 30 };
const SPRING_SMOOTH = { type: 'spring', stiffness: 300, damping: 28 };
const staggerContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.03, delayChildren: 0.06 } },
};
const staggerItem = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: SPRING_SMOOTH },
};

// ═══════════════════════════════════════════════════════════
//  UTILITIES
// ═══════════════════════════════════════════════════════════

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
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatBytes(bytes) {
  if (bytes == null || bytes === 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ═══════════════════════════════════════════════════════════
//  INLINE TITLE EDITOR
// ═══════════════════════════════════════════════════════════

function InlineTitleEditor({ title, onSave, onCancel }) {
  const [value, setValue] = useState(title);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = value.trim();
      if (trimmed && trimmed !== title) {
        onSave(trimmed);
      } else {
        onCancel();
      }
    }
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={() => {
        const trimmed = value.trim();
        if (trimmed && trimmed !== title) {
          onSave(trimmed);
        } else {
          onCancel();
        }
      }}
      className="bg-white rounded px-2 py-0.5 text-sm text-[#1E2532] outline-none border border-[#4A7AE5] w-full max-w-[300px]"
      maxLength={60}
    />
  );
}

// ═══════════════════════════════════════════════════════════
//  CONVERSATION ROW
// ═══════════════════════════════════════════════════════════

function ConversationRow({
  conversation,
  isSelected,
  onToggleSelect,
  onNavigate,
  onTitleEdit,
  onToggleExpand,
  isExpanded,
  branchCount,
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const { id, title, updatedAt, createdAt, pinned, storageBytes } = conversation;

  const handleTitleSave = (newTitle) => {
    setEditingTitle(false);
    onTitleEdit(id, newTitle);
  };

  const handleRowClick = (e) => {
    // Don't navigate if clicking checkbox, expand toggle, or editing title
    if (e.target.closest('[data-no-navigate]')) return;
    onNavigate(id);
  };

  return (
    <motion.div
      variants={staggerItem}
      className="group flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-[#F0F0F0] transition-colors"
      style={{ backgroundColor: isSelected ? '#F0F5FF' : 'transparent' }}
      onClick={handleRowClick}
      whileHover={{ backgroundColor: isSelected ? '#F0F5FF' : '#FAFAFA' }}
    >
      {/* Checkbox */}
      <div data-no-navigate>
        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(id);
          }}
          className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
            isSelected
              ? 'bg-[#4A7AE5] border-[#4A7AE5]'
              : 'border-[#EBEBEB] bg-white'
          }`}
          whileTap={{ scale: 0.9 }}
        >
          {isSelected && <Check size={12} className="text-white" />}
        </motion.button>
      </div>

      {/* Pin indicator */}
      {pinned && (
        <Pin size={12} className="text-[#4A7AE5] flex-shrink-0" />
      )}

      {/* Title */}
      <div className="flex-1 min-w-0">
        {editingTitle ? (
          <div data-no-navigate>
            <InlineTitleEditor
              title={title || 'New conversation'}
              onSave={handleTitleSave}
              onCancel={() => setEditingTitle(false)}
            />
          </div>
        ) : (
          <div
            className="text-sm text-[#1E2532] truncate"
            onDoubleClick={(e) => {
              e.stopPropagation();
              setEditingTitle(true);
            }}
            title="Double-click to rename"
          >
            {title || 'New conversation'}
          </div>
        )}
      </div>

      {/* Branch count badge */}
      {branchCount > 0 && (
        <div data-no-navigate>
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(id);
            }}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-[#7C6CD4] bg-[#7C6CD4]/8 hover:bg-[#7C6CD4]/15 transition-colors"
            whileTap={{ scale: 0.95 }}
          >
            <GitBranch size={11} />
            <span>{branchCount}</span>
            <motion.div
              animate={{ rotate: isExpanded ? 90 : 0 }}
              transition={SPRING_SNAPPY}
            >
              <ChevronRight size={11} />
            </motion.div>
          </motion.button>
        </div>
      )}

      {/* Size */}
      <div className="text-xs text-[#6B7C93] w-16 text-right flex-shrink-0">
        {formatBytes(storageBytes)}
      </div>

      {/* Last edited */}
      <div className="text-xs text-[#6B7C93] w-20 text-right flex-shrink-0">
        {formatRelative(updatedAt)}
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
//  BRANCH ROW (nested under parent)
// ═══════════════════════════════════════════════════════════

function BranchRow({ branch, onNavigate }) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={SPRING_SMOOTH}
      className="flex items-center gap-3 pl-12 pr-4 py-2 cursor-pointer border-b border-[#F0F0F0] transition-colors hover:bg-[#FAFAFA]"
      onClick={() => onNavigate(branch.id)}
    >
      <GitBranch size={12} className="text-[#7C6CD4] flex-shrink-0" />
      <div className="text-sm text-[#6B7C93] truncate flex-1">
        {branch.title || 'Untitled branch'}
      </div>
      <div className="text-xs text-[#6B7C93] w-16 text-right flex-shrink-0">
        {formatBytes(branch.storageBytes)}
      </div>
      <div className="text-xs text-[#6B7C93] w-20 text-right flex-shrink-0">
        {formatRelative(branch.updatedAt)}
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
//  BULK ACTION BAR
// ═══════════════════════════════════════════════════════════

function BulkActionBar({ selectedCount, totalSize, onDelete, onPin, onUnpin, onClearSelection }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={SPRING_SMOOTH}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-xl border border-[#EBEBEB] bg-white shadow-2xl shadow-black/10"
    >
      <span className="text-sm text-[#1E2532] font-medium">
        {selectedCount} selected
        {totalSize > 0 && (
          <span className="text-[#6B7C93] font-normal"> — {formatBytes(totalSize)}</span>
        )}
      </span>

      <div className="w-px h-5 bg-[#EBEBEB]" />

      <motion.button
        onClick={onPin}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#1E2532] border border-[#EBEBEB] bg-white hover:border-[#4A7AE5] transition-colors"
        whileTap={{ scale: 0.97 }}
      >
        <Pin size={12} /> Pin
      </motion.button>

      <motion.button
        onClick={onUnpin}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#1E2532] border border-[#EBEBEB] bg-white hover:border-[#4A7AE5] transition-colors"
        whileTap={{ scale: 0.97 }}
      >
        <PinOff size={12} /> Unpin
      </motion.button>

      <motion.button
        onClick={onDelete}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#EF4444] border border-[#EF4444]/30 bg-white hover:bg-[#EF4444]/5 transition-colors"
        whileTap={{ scale: 0.97 }}
      >
        <Trash2 size={12} /> Delete
      </motion.button>

      <div className="w-px h-5 bg-[#EBEBEB]" />

      <motion.button
        onClick={onClearSelection}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#6B7C93] hover:text-[#1E2532] transition-colors"
        whileTap={{ scale: 0.97 }}
      >
        <X size={12} /> Clear
      </motion.button>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
//  STORAGE WARNING BANNER
// ═══════════════════════════════════════════════════════════

function StorageWarningBanner({ usagePercent }) {
  if (usagePercent < 80) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      className={`px-4 py-2.5 text-xs flex items-center gap-2 ${
        usagePercent >= 95
          ? 'bg-[#EF4444]/5 text-[#EF4444] border-b border-[#EF4444]/20'
          : 'bg-[#E5A620]/5 text-[#E5A620] border-b border-[#E5A620]/20'
      }`}
    >
      <AlertCircle size={13} />
      <span>
        {usagePercent >= 95
          ? 'Storage is critically full. Export a backup or delete old conversations to continue saving.'
          : 'Your browser storage is getting full. Consider exporting a backup or cleaning up old conversations.'}
      </span>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
//  EMPTY STATE
// ═══════════════════════════════════════════════════════════

function EmptyState({ onNewChat }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <MessageSquare size={40} className="text-[#D5D5D5] mb-4" />
      <p className="text-sm text-[#6B7C93] mb-1">No conversations yet</p>
      <p className="text-xs text-[#6B7C93] mb-5">Start your first conversation with Claude</p>
      <motion.button
        onClick={onNewChat}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold text-white"
        style={{ background: 'linear-gradient(135deg, #4A7AE5, #7C6CD4)' }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
      >
        <Plus size={14} /> New conversation
      </motion.button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  SORT HEADER
// ═══════════════════════════════════════════════════════════

function SortButton({ label, sortKey, currentSort, currentDir, onSort, className }) {
  const isActive = currentSort === sortKey;
  return (
    <button
      onClick={() => onSort(sortKey)}
      className={`flex items-center gap-1 text-xs font-semibold uppercase tracking-wider transition-colors ${
        isActive ? 'text-[#4A7AE5]' : 'text-[#6B7C93]'
      } hover:text-[#4A7AE5] ${className || ''}`}
    >
      {label}
      {isActive && (
        currentDir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />
      )}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════
//  MAIN SELECTOR VIEW
// ═══════════════════════════════════════════════════════════

export default function SelectorView() {
  const navigate = useNavigate();
  const {
    conversations,
    createConversation,
    deleteConversations,
    updateConversation,
  } = useConversations();
  const { storageEstimate } = useSettings();

  // ── Local state ──
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState('updatedAt');  // 'updatedAt' | 'createdAt' | 'storageBytes'
  const [sortDir, setSortDir] = useState('desc');
  const [selected, setSelected] = useState(new Set());
  const [expanded, setExpanded] = useState(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);

  // ── Derived data ──
  // Separate root conversations from branches
  const { roots, branchesByParent } = useMemo(() => {
    const roots = [];
    const branchesByParent = {};

    (conversations || []).forEach((conv) => {
      if (conv.parentId) {
        if (!branchesByParent[conv.parentId]) {
          branchesByParent[conv.parentId] = [];
        }
        branchesByParent[conv.parentId].push(conv);
      } else {
        roots.push(conv);
      }
    });

    // Sort branches within each parent by updatedAt desc
    Object.values(branchesByParent).forEach((branches) => {
      branches.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    });

    return { roots, branchesByParent };
  }, [conversations]);

  // Filter by search query
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return roots;
    const q = searchQuery.toLowerCase();
    return roots.filter((c) => (c.title || '').toLowerCase().includes(q));
  }, [roots, searchQuery]);

  // Sort — pinned always first, then by sort key
  const sorted = useMemo(() => {
    const pinned = filtered.filter((c) => c.pinned);
    const unpinned = filtered.filter((c) => !c.pinned);

    const comparator = (a, b) => {
      let aVal, bVal;
      if (sortKey === 'storageBytes') {
        aVal = a.storageBytes || 0;
        bVal = b.storageBytes || 0;
      } else {
        aVal = new Date(a[sortKey] || 0);
        bVal = new Date(b[sortKey] || 0);
      }
      if (sortDir === 'asc') return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    };

    pinned.sort(comparator);
    unpinned.sort(comparator);
    return [...pinned, ...unpinned];
  }, [filtered, sortKey, sortDir]);

  // Selected size total
  const selectedSizeTotal = useMemo(() => {
    let total = 0;
    selected.forEach((id) => {
      const conv = conversations?.find((c) => c.id === id);
      if (conv?.storageBytes) total += conv.storageBytes;
    });
    return total;
  }, [selected, conversations]);

  // Storage usage percent
  const storagePercent = useMemo(() => {
    if (!storageEstimate?.quota) return 0;
    return Math.round((storageEstimate.usage / storageEstimate.quota) * 100);
  }, [storageEstimate]);

  // ── Handlers ──
  const handleSort = useCallback((key) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }, [sortKey]);

  const handleToggleSelect = useCallback((id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleToggleExpand = useCallback((id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleNewChat = useCallback(async () => {
    try {
      const id = await createConversation({ title: 'New conversation' });
      navigate(`/chat/${id}`);
    } catch (err) {
      console.error('Failed to create conversation:', err);
    }
  }, [createConversation, navigate]);

  const handleNavigate = useCallback((id) => {
    navigate(`/chat/${id}`);
  }, [navigate]);

  const handleTitleEdit = useCallback(async (id, newTitle) => {
    try {
      await updateConversation(id, { title: newTitle });
    } catch (err) {
      console.error('Failed to update title:', err);
    }
  }, [updateConversation]);

  const handleBulkDelete = useCallback(async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    try {
      await deleteConversations([...selected]);
      setSelected(new Set());
      setConfirmDelete(false);
    } catch (err) {
      console.error('Failed to delete conversations:', err);
    }
  }, [selected, confirmDelete, deleteConversations]);

  const handleBulkPin = useCallback(async () => {
    const promises = [...selected].map((id) =>
      updateConversation(id, { pinned: true })
    );
    await Promise.allSettled(promises);
    setSelected(new Set());
  }, [selected, updateConversation]);

  const handleBulkUnpin = useCallback(async () => {
    const promises = [...selected].map((id) =>
      updateConversation(id, { pinned: false })
    );
    await Promise.allSettled(promises);
    setSelected(new Set());
  }, [selected, updateConversation]);

  // Reset confirmDelete when selection changes
  useEffect(() => {
    setConfirmDelete(false);
  }, [selected]);

  // ── Render ──
  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#F0F0F0]">
        <h1 className="text-lg font-semibold text-[#1E2532]">Conversations</h1>
        <div className="flex items-center gap-3">
          <motion.button
            onClick={handleNewChat}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #4A7AE5, #7C6CD4)' }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <Plus size={14} /> New chat
          </motion.button>
          <motion.button
            onClick={() => navigate('/settings')}
            className="p-2 rounded-lg border border-[#EBEBEB] bg-white text-[#6B7C93] hover:text-[#1E2532] hover:border-[#4A7AE5] transition-colors"
            whileTap={{ scale: 0.95 }}
          >
            <Settings size={16} />
          </motion.button>
        </div>
      </div>

      {/* Storage warning */}
      <StorageWarningBanner usagePercent={storagePercent} />

      {/* Search + Sort bar */}
      <div className="flex items-center gap-4 px-6 py-3 border-b border-[#F0F0F0]">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#D5D5D5]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full bg-white rounded-lg pl-9 pr-4 py-2 text-sm text-[#1E2532] outline-none border border-[#EBEBEB] focus:border-[#4A7AE5] transition-colors placeholder:text-[#D5D5D5]"
          />
        </div>

        {/* Sort buttons */}
        <div className="flex items-center gap-4">
          <SortButton
            label="Last edited"
            sortKey="updatedAt"
            currentSort={sortKey}
            currentDir={sortDir}
            onSort={handleSort}
          />
          <SortButton
            label="Created"
            sortKey="createdAt"
            currentSort={sortKey}
            currentDir={sortDir}
            onSort={handleSort}
          />
          <SortButton
            label="Size"
            sortKey="storageBytes"
            currentSort={sortKey}
            currentDir={sortDir}
            onSort={handleSort}
          />
        </div>
      </div>

      {/* Column headers */}
      <div className="flex items-center gap-3 px-4 py-2 text-xs text-[#6B7C93] border-b border-[#F0F0F0]">
        <div className="w-5" /> {/* checkbox column */}
        <div className="flex-1">Title</div>
        <div className="w-16 text-right">Size</div>
        <div className="w-20 text-right">Edited</div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          searchQuery ? (
            <div className="text-center py-12">
              <p className="text-sm text-[#6B7C93]">No conversations matching "{searchQuery}"</p>
            </div>
          ) : (
            <EmptyState onNewChat={handleNewChat} />
          )
        ) : (
          <motion.div variants={staggerContainer} initial="hidden" animate="show">
            {sorted.map((conv) => (
              <React.Fragment key={conv.id}>
                <ConversationRow
                  conversation={conv}
                  isSelected={selected.has(conv.id)}
                  onToggleSelect={handleToggleSelect}
                  onNavigate={handleNavigate}
                  onTitleEdit={handleTitleEdit}
                  onToggleExpand={handleToggleExpand}
                  isExpanded={expanded.has(conv.id)}
                  branchCount={(branchesByParent[conv.id] || []).length}
                />

                {/* Expanded branches */}
                <AnimatePresence>
                  {expanded.has(conv.id) &&
                    branchesByParent[conv.id]?.map((branch) => (
                      <BranchRow
                        key={branch.id}
                        branch={branch}
                        onNavigate={handleNavigate}
                      />
                    ))}
                </AnimatePresence>
              </React.Fragment>
            ))}
          </motion.div>
        )}
      </div>

      {/* Conversation count footer */}
      <div className="px-6 py-2 border-t border-[#F0F0F0] text-xs text-[#6B7C93]">
        {roots.length} conversation{roots.length !== 1 ? 's' : ''}
        {Object.values(branchesByParent).flat().length > 0 && (
          <span> · {Object.values(branchesByParent).flat().length} branch{Object.values(branchesByParent).flat().length !== 1 ? 'es' : ''}</span>
        )}
      </div>

      {/* Bulk action bar */}
      <AnimatePresence>
        {selected.size > 0 && (
          <BulkActionBar
            selectedCount={selected.size}
            totalSize={selectedSizeTotal}
            onDelete={handleBulkDelete}
            onPin={handleBulkPin}
            onUnpin={handleBulkUnpin}
            onClearSelection={() => setSelected(new Set())}
          />
        )}
      </AnimatePresence>
    </div>
  );
}