import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, GitBranch, Trash2, StickyNote, Activity, Star, Copy,
  X, ArrowUp, FileText, Eye, Settings2, BookOpen, Zap, Square, AlertCircle,
  Highlighter, ChevronDown, ChevronRight,
  ArrowRightCircle, GripHorizontal, List, Pencil
} from 'lucide-react';

const SPRING_SNAPPY = { type: 'spring', stiffness: 500, damping: 30 };
const SPRING_SMOOTH = { type: 'spring', stiffness: 300, damping: 28 };
const SPRING_GENTLE = { type: 'spring', stiffness: 200, damping: 24 };

const DUSTY_GOLD = '#C4A94D';

/* ═══════════════════════════════════════════════════════════ */
/*  MOCK DATA                                                    */
/* ═══════════════════════════════════════════════════════════ */

const MOCK_MESSAGES = [
  { id: 1, role: 'user', content: 'How difficult would it be to create a UI for Claude that allows for better management of chats?', incomplete: false },
  { id: 2, role: 'assistant', content: 'Creating a custom UI for Claude via the API is actually quite straightforward. You could build features like a sidebar with searchable table of contents, collapsible sections, tag/folder systems, split-pane views, and custom search functionality.', incomplete: false },
  { id: 3, role: 'user', content: 'What about context management? How would you handle long conversations that exceed the context window?', incomplete: false },
  { id: 4, role: 'assistant', content: 'Context management is one of the biggest challenges. The best approach is branch-based compression — when the context fills up, you create a new branch with a compressed summary of the conversation so far. The original stays intact as an archive.', incomplete: false },
  { id: 5, role: 'user', content: "I'm more curious if this UI would be helpful to the general public.", incomplete: false, hasBranch: true },
  { id: 6, role: 'assistant', content: 'Great strategic thinking! Based on usage patterns, the primary pain points are organization & navigation, context management, and workflow issues. A UI focusing on these areas could serve power users, professionals, and cost-conscious users effectively.', incomplete: false },
];

const MOCK_HIGHLIGHTS = [
  { id: 1, text: 'API', color: '#E5A620', messageId: 2 },
  { id: 2, text: 'context management', color: '#22C55E', messageId: 4 },
  { id: 3, text: 'power users', color: '#4A7AE5', messageId: 6 },
];

const MOCK_BRANCHES = [
  { id: 'main', title: 'Main Thread', messageCount: 23, active: true },
  { id: 'product', title: 'Alt: Product Focus', messageCount: 8, active: false },
  { id: 'technical', title: 'Alt: Technical Deep Dive', messageCount: 15, active: false },
];

/* ═══════════════════════════════════════════════════════════ */
/*  UNIFIED PANEL (Bottom Sheet)                                */
/* ═══════════════════════════════════════════════════════════ */

function UnifiedPanel({ open, onClose, messages, highlights, branches }) {
  const [expandedSection, setExpandedSection] = useState(null);
  const [highlightCycleIdx, setHighlightCycleIdx] = useState({}); // text → current index
  const [deletedHighlight, setDeletedHighlight] = useState(null); // flash feedback
  const longPressTimerRef = useRef(null);

  const tocItems = messages
    .filter(m => m.role === 'user')
    .map(m => ({ id: m.id, label: m.content.slice(0, 55) + (m.content.length > 55 ? '...' : '') }));

  const toggleSection = (section) => {
    setExpandedSection(prev => prev === section ? null : section);
  };

  // Count occurrences of a highlight term across messages
  const getOccurrences = useCallback((text) => {
    return messages.filter(m => m.content && m.content.toLowerCase().includes(text.toLowerCase())).map(m => m.id);
  }, [messages]);

  // Tap highlight → cycle to next occurrence and scroll
  const handleHighlightTap = useCallback((hl) => {
    const occurrences = getOccurrences(hl.text);
    if (occurrences.length === 0) return;
    const currentIdx = highlightCycleIdx[hl.text] || 0;
    const nextIdx = (currentIdx + 1) % occurrences.length;
    setHighlightCycleIdx(prev => ({ ...prev, [hl.text]: nextIdx }));
    const msgId = occurrences[nextIdx];
    document.getElementById(`msg-${msgId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [getOccurrences, highlightCycleIdx]);

  // Long-press highlight → delete with flash feedback
  const handleHighlightLongPressStart = useCallback((hl) => {
    longPressTimerRef.current = setTimeout(() => {
      setDeletedHighlight(hl.id);
      setTimeout(() => setDeletedHighlight(null), 1200);
      // In production: call deleteHighlight(hl.id)
    }, 600);
  }, []);

  const handleHighlightLongPressEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const COLLAB_PRESETS = [
    { id: 'challenge', label: 'Challenge Artifacts', desc: 'Self-critique outputs before presenting' },
    { id: 'reasoning', label: 'Show Reasoning', desc: 'Walk through thinking step by step' },
    { id: 'pushback', label: 'Push Back on Me', desc: 'Flag questionable assumptions' },
    { id: 'alternatives', label: 'Offer Alternatives', desc: 'Provide multiple approaches' },
    { id: 'uncertainty', label: 'Flag Uncertainty', desc: 'Distinguish confidence vs guesses' },
  ];

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50"
      style={{ backgroundColor: 'rgba(0,0,0,0.15)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={SPRING_SMOOTH}
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-9 h-1 rounded-full bg-[#D5D5D5]" />
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-2 pb-6" style={{ WebkitOverflowScrolling: 'touch', paddingBottom: 'max(env(safe-area-inset-bottom, 24px), 24px)' }}>

          {/* ── Chats (navigate back) ── */}
          <PanelRow icon={MessageSquare} label="Chats" color="#4A7AE5" onClick={() => { onClose(); }} />

          {/* ── Table of Contents (expandable) ── */}
          <PanelRow icon={List} label="Contents" color="#6B7C93"
            expandable expanded={expandedSection === 'toc'}
            onClick={() => toggleSection('toc')} />
          <AnimatePresence>
            {expandedSection === 'toc' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={SPRING_SNAPPY} className="overflow-hidden">
                <div className="pl-12 pr-4 pb-2 space-y-0.5">
                  {tocItems.length === 0 ? (
                    <p className="text-xs text-[#D5D5D5] py-2">Messages will appear here</p>
                  ) : (
                    tocItems.map(item => (
                      <button key={item.id} onClick={() => {
                        document.getElementById(`msg-${item.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        onClose();
                      }} className="w-full text-left px-3 py-2 rounded-xl text-[13px] text-[#6B7C93] active:bg-[#FAFAFA] active:text-[#1E2532] transition-colors truncate">
                        {item.label}
                      </button>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Highlights (expandable, tap-to-cycle, long-press-to-delete) ── */}
          <PanelRow icon={Highlighter} label="Highlights" color="#22C55E"
            badge={highlights.length > 0 ? highlights.length : null}
            expandable expanded={expandedSection === 'highlights'}
            onClick={() => toggleSection('highlights')} />
          <AnimatePresence>
            {expandedSection === 'highlights' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={SPRING_SNAPPY} className="overflow-hidden">
                <div className="pl-12 pr-4 pb-2 space-y-1.5">
                  {highlights.map(hl => {
                    const occurrences = getOccurrences(hl.text);
                    const currentIdx = (highlightCycleIdx[hl.text] || 0) % Math.max(occurrences.length, 1);
                    const isDeleted = deletedHighlight === hl.id;
                    return (
                      <motion.button
                        key={hl.id}
                        animate={{ opacity: isDeleted ? 0 : 1, height: isDeleted ? 0 : 'auto' }}
                        transition={{ duration: 0.3 }}
                        onClick={() => handleHighlightTap(hl)}
                        onTouchStart={() => handleHighlightLongPressStart(hl)}
                        onTouchEnd={handleHighlightLongPressEnd}
                        onTouchCancel={handleHighlightLongPressEnd}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-[#F0F0F0] active:bg-[#FAFAFA] active:border-[#D5D5D5] transition-colors text-left"
                      >
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: hl.color }} />
                        <span className="text-xs font-semibold text-[#1E2532] flex-1 truncate">{hl.text}</span>
                        {occurrences.length > 0 && (
                          <span className="text-[10px] text-[#C0C8D4] flex-shrink-0 tabular-nums">
                            {currentIdx + 1}/{occurrences.length}
                          </span>
                        )}
                      </motion.button>
                    );
                  })}
                  <button className="w-full px-3 py-2 rounded-xl border border-dashed border-[#EBEBEB] text-xs text-[#C0C8D4] active:text-[#4A7AE5] active:border-[#4A7AE5] transition-colors">
                    + Add Highlight
                  </button>
                  <p className="text-[10px] text-[#D5D5D5] px-1">Tap to jump between occurrences. Hold to remove.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Branches (expandable) ── */}
          <PanelRow icon={GitBranch} label="Branches" color="#7C6CD4"
            badge={branches.length > 0 ? branches.length : null}
            expandable expanded={expandedSection === 'branches'}
            onClick={() => toggleSection('branches')} />
          <AnimatePresence>
            {expandedSection === 'branches' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={SPRING_SNAPPY} className="overflow-hidden">
                <div className="pl-12 pr-4 pb-2 space-y-1.5">
                  {branches.map(branch => (
                    <button key={branch.id}
                      className={`w-full text-left px-3 py-2.5 rounded-xl border transition-colors ${
                        branch.active ? 'border-[#4A7AE5] bg-[#4A7AE5]/5' : 'border-[#F0F0F0] active:bg-[#FAFAFA]'
                      }`}>
                      <div className="flex items-center gap-2">
                        <GitBranch className={`w-3 h-3 ${branch.active ? 'text-[#4A7AE5]' : 'text-[#6B7C93]'}`} />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-semibold text-[#1E2532] truncate block">{branch.title}</span>
                          {branch.messageCount > 0 && <span className="text-[10px] text-[#6B7C93]">{branch.messageCount} messages</span>}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Collaboration Mode (expandable with presets) ── */}
          <PanelRow icon={Settings2} label="Collaboration Mode" color="#4A7AE5"
            expandable expanded={expandedSection === 'collab'}
            onClick={() => toggleSection('collab')} />
          <AnimatePresence>
            {expandedSection === 'collab' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={SPRING_SNAPPY} className="overflow-hidden">
                <div className="pl-12 pr-4 pb-2 space-y-1.5">
                  {COLLAB_PRESETS.map(preset => (
                    <CollabPresetToggle key={preset.id} preset={preset} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Remaining actions (non-expandable) ── */}
          <PanelRow icon={BookOpen} label="Review" color="#6B7C93" onClick={onClose} />
          <PanelRow icon={FileText} label="Export to Markdown" color="#6B7C93" onClick={onClose} />
          <PanelRow icon={Activity} label="Compress Context" color="#E5A620" onClick={onClose} />
        </div>
      </motion.div>
    </motion.div>
  );
}

function CollabPresetToggle({ preset }) {
  const [active, setActive] = useState(false);
  return (
    <button
      onClick={() => setActive(prev => !prev)}
      className={`w-full text-left px-3 py-2.5 rounded-xl border transition-colors ${
        active ? 'border-[#4A7AE5] bg-[#4A7AE5]/5' : 'border-[#F0F0F0] active:bg-[#FAFAFA]'
      }`}>
      <div className="flex items-center gap-2.5">
        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
          active ? 'border-[#4A7AE5] bg-[#4A7AE5]' : 'border-[#D5D5D5]'
        }`}>
          {active && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
        </div>
        <div className="flex-1 min-w-0">
          <span className={`text-xs font-semibold block ${active ? 'text-[#1E2532]' : 'text-[#4A5568]'}`}>{preset.label}</span>
          <span className="text-[10px] text-[#6B7C93]">{preset.desc}</span>
        </div>
      </div>
    </button>
  );
}

function PanelRow({ icon: Icon, label, color, badge, expandable, expanded, onClick }) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left active:bg-[#FAFAFA] transition-colors">
      <Icon className="w-5 h-5 flex-shrink-0" style={{ color }} />
      <span className="flex-1 text-[14px] font-medium text-[#1E2532]">{label}</span>
      {badge != null && (
        <span className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: color + '18', color }}>
          {badge}
        </span>
      )}
      {expandable && (
        <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={SPRING_SNAPPY}>
          <ChevronDown className="w-4 h-4 text-[#C0C8D4]" />
        </motion.div>
      )}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  MESSAGE CARD — tap to select, expands action row           */
/* ═══════════════════════════════════════════════════════════ */

function MobileMessageCard({ message, isFavorited, hasNote, isSelected, onSelect, onFavorite, onBranch, onNote, onCopy, onHide, onDelete, onMoveToBranch }) {
  const isUser = message.role === 'user';
  const isGhostText = message.incomplete;

  return (
    <motion.div
      id={`msg-${message.id}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: isGhostText ? 0.55 : 1, y: 0 }}
      transition={SPRING_GENTLE}
      className={`relative ${isUser ? 'ml-8' : 'mr-8'} mb-1`}
    >
      {/* Branch indicator */}
      {message.hasBranch && (
        <div className="absolute -left-6 top-0 bottom-0 flex items-center">
          <div className="flex items-center gap-0.5 text-[#7C6CD4]">
            <GitBranch className="w-3.5 h-3.5" />
            <div className="h-px w-2 bg-[#7C6CD4]" />
          </div>
        </div>
      )}

      <motion.div
        onClick={() => onSelect(isSelected ? null : message.id)}
        animate={{ borderColor: isSelected ? '#4A7AE5' : isGhostText ? '#D5D5D5' : '#DDDDE3' }}
        transition={{ duration: 0.15 }}
        className={`rounded-2xl border bg-white cursor-pointer relative ${
          isGhostText ? 'border-dashed' : ''
        }`}
      >
        {/* Persistent indicators — top-left */}
        {(isFavorited || hasNote) && (
          <div className="absolute top-2.5 left-3.5 flex items-center gap-1.5">
            {isFavorited && (
              <Star className="w-3 h-3" style={{ fill: DUSTY_GOLD, color: DUSTY_GOLD, strokeLinejoin: 'round' }} />
            )}
            {hasNote && <StickyNote className="w-3 h-3 text-[#E5A620]" />}
          </div>
        )}

        {/* Content */}
        <div className={`px-4 pt-4 pb-3.5 ${isFavorited || hasNote ? 'pt-7' : ''}`}>
          <p className="text-[14px] leading-relaxed text-[#1E2532]">
            {message.content}
          </p>
        </div>

        {/* Expanded action row — slides in when selected */}
        <AnimatePresence>
          {isSelected && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={SPRING_SNAPPY}
              className="overflow-hidden"
            >
              <div className="flex items-center justify-around px-2 py-2 border-t border-[#F0F0F0]">
                <ActionIcon icon={Star} label="Favorite" color={isFavorited ? DUSTY_GOLD : '#6B7C93'}
                  filled={isFavorited} onClick={(e) => { e.stopPropagation(); onFavorite(message.id); }} />
                <ActionIcon icon={GitBranch} label="Branch" color="#7C6CD4"
                  onClick={(e) => { e.stopPropagation(); onBranch?.(message); }} />
                <ActionIcon icon={StickyNote} label="Note" color="#E5A620"
                  onClick={(e) => { e.stopPropagation(); onNote?.(message.id); }} />
                <ActionIcon icon={Copy} label="Copy" color="#6B7C93"
                  onClick={(e) => { e.stopPropagation(); onCopy?.(message.content); }} />
                <ActionIcon icon={ArrowRightCircle} label="Move" color="#4A7AE5"
                  onClick={(e) => { e.stopPropagation(); onMoveToBranch?.(message); }} />
                <ActionIcon icon={Eye} label="Hide" color="#6B7C93"
                  onClick={(e) => { e.stopPropagation(); onHide?.(message.id); }} />
                <ActionIcon icon={Trash2} label="Delete" color="#EF4444"
                  onClick={(e) => { e.stopPropagation(); onDelete?.(message.id); }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Ghost text continue button */}
      {isGhostText && message.content && (
        <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="mt-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#4A7AE5] border border-[#EBEBEB] active:border-[#4A7AE5] transition-colors">
          Continue
        </motion.button>
      )}
    </motion.div>
  );
}

function ActionIcon({ icon: Icon, label, color, filled, onClick }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-0.5 p-1.5 rounded-xl active:bg-[#FAFAFA] transition-colors">
      <Icon className="w-4 h-4" style={filled ? { fill: color, color, strokeLinejoin: 'round' } : { color }} />
      <span className="text-[9px] font-semibold" style={{ color }}>{label}</span>
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  MAIN COMPONENT                                              */
/* ═══════════════════════════════════════════════════════════ */

export default function ChatInterfaceMobile() {
  const [panelOpen, setPanelOpen] = useState(false);
  const [favorites, setFavorites] = useState(new Set());
  const [notes, setNotes] = useState(new Set());
  const [inputValue, setInputValue] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const [selectedMsgId, setSelectedMsgId] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [hiddenMessages, setHiddenMessages] = useState(new Set());
  const [pendingDeletes, setPendingDeletes] = useState([]);
  const [apiError, setApiError] = useState(null);
  const [newChatFlash, setNewChatFlash] = useState(false);
  const [branchFlash, setBranchFlash] = useState(false);

  const [contextUsage] = useState(65);
  const contextThreshold = 80;
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });

  const messages = MOCK_MESSAGES;
  const visibleMessages = messages.filter(m => !hiddenMessages.has(m.id));
  const hiddenCount = messages.length - visibleMessages.length;

  const getContextColor = (u) => u < (contextThreshold / 2) ? '#22C55E' : u < contextThreshold ? '#E5A620' : '#EF4444';
  const contextColor = getContextColor(contextUsage);

  const toggleFav = useCallback((id) => setFavorites(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  }), []);

  // Swipe gestures: left → new chat, right → instant compressed branch
  const handleTouchStart = useCallback((e) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, time: Date.now() };
  }, []);

  const handleTouchEnd = useCallback((e) => {
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    const dt = Date.now() - touchStartRef.current.time;
    const isHorizontal = Math.abs(dx) > Math.abs(dy) * 2 && dt < 400;

    if (dx < -80 && isHorizontal) {
      // Swipe left → new chat
      setNewChatFlash(true);
      setTimeout(() => setNewChatFlash(false), 1500);
    } else if (dx > 80 && isHorizontal && visibleMessages.length > 0) {
      // Swipe right → instant compressed branch from last message
      setBranchFlash(true);
      setTimeout(() => setBranchFlash(false), 2000);
      // In production: handleCreateBranchCompressed(lastMessage.id)
    }
  }, [visibleMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Tap outside selected card to deselect
  const handleMessagesAreaClick = useCallback((e) => {
    // Only deselect if clicking the scroll area itself, not a card
    if (e.target === e.currentTarget) {
      setSelectedMsgId(null);
    }
  }, []);

  return (
    <div
      className="flex flex-col font-sans overflow-hidden"
      style={{
        backgroundColor: '#FFFFFF',
        color: '#1E2532',
        height: '100dvh',
        maxWidth: 430,
        margin: '0 auto',
        position: 'relative',
      }}
    >
      {/* ═══ Top Bar — centered grip icon only ═══ */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex items-center justify-center pt-2 pb-1"
        style={{ paddingTop: 'max(env(safe-area-inset-top, 8px), 8px)' }}
      >
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setPanelOpen(true)}
          className="p-2 rounded-xl active:bg-[#FAFAFA] transition-colors"
        >
          <GripHorizontal className="w-5 h-5" style={{ color: contextColor }} />
        </motion.button>
      </motion.div>

      {/* ═══ Error Banners ═══ */}
      <AnimatePresence>
        {apiError?.type === 'key_failure' && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="px-5 py-3 bg-[#EF4444]/10 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#EF4444] flex-shrink-0" />
            <p className="text-xs text-[#EF4444] flex-1">{apiError.message}</p>
            <button onClick={() => setApiError(null)} className="p-1"><X className="w-3.5 h-3.5 text-[#EF4444]" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Messages ═══ */}
      <div className="flex-1 overflow-y-auto px-4 py-3"
        style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={handleMessagesAreaClick}
      >
        {/* Empty state */}
        {visibleMessages.length === 0 && !isStreaming && hiddenCount === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <MessageSquare className="w-12 h-12 text-[#EBEBEB] mb-4" />
            <p className="text-sm text-[#6B7C93] mb-1">Start a conversation</p>
            <p className="text-xs text-[#D5D5D5]">Type below or swipe left to start fresh</p>
          </div>
        )}

        <div className="space-y-3">
          {visibleMessages.map((msg) => (
            <MobileMessageCard
              key={msg.id}
              message={msg}
              isFavorited={favorites.has(msg.id)}
              hasNote={notes.has(msg.id)}
              isSelected={selectedMsgId === msg.id}
              onSelect={setSelectedMsgId}
              onFavorite={toggleFav}
              onBranch={() => {}}
              onNote={() => {}}
              onCopy={() => {}}
              onHide={() => {}}
              onDelete={() => {}}
              onMoveToBranch={() => {}}
            />
          ))}
        </div>

        {/* Hidden messages indicator */}
        {hiddenCount > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center py-3">
            <button onClick={() => setHiddenMessages(new Set())}
              className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-[#EBEBEB] active:border-[#4A7AE5] transition-colors">
              <Eye className="w-3.5 h-3.5 text-[#6B7C93]" />
              <span className="text-xs text-[#6B7C93]">{hiddenCount} message{hiddenCount !== 1 ? 's' : ''} hidden</span>
            </button>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ═══ Undo Delete Toast ═══ */}
      <AnimatePresence>
        {pendingDeletes.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            transition={SPRING_SNAPPY}
            className="mx-4 mb-2 px-4 py-3 rounded-2xl border border-[#EBEBEB] bg-white shadow-sm flex items-center justify-between gap-3">
            <span className="text-xs text-[#4A5568]">
              {pendingDeletes.length === 1 ? 'Message deleted' : `${pendingDeletes.length} messages deleted`}
            </span>
            <button className="text-xs font-semibold text-[#4A7AE5] active:text-[#3A6AD4] shrink-0">Undo</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ New Chat Toast ═══ */}
      <AnimatePresence>
        {newChatFlash && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            transition={SPRING_SNAPPY}
            className="mx-4 mb-2 px-4 py-3 rounded-2xl border border-[#4A7AE5]/30 bg-[#4A7AE5]/5 flex items-center gap-2.5">
            <MessageSquare className="w-4 h-4 text-[#4A7AE5] flex-shrink-0" />
            <span className="text-xs font-semibold text-[#1E2532]">New chat started</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Branch Toast ═══ */}
      <AnimatePresence>
        {branchFlash && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            transition={SPRING_SNAPPY}
            className="mx-4 mb-2 px-4 py-3 rounded-2xl border border-[#7C6CD4]/30 bg-[#7C6CD4]/5 flex items-center gap-2.5">
            <GitBranch className="w-4 h-4 text-[#7C6CD4] flex-shrink-0" />
            <div className="flex-1">
              <span className="text-xs font-semibold text-[#1E2532]">Branching with compressed summary</span>
              <span className="text-[10px] text-[#6B7C93] block mt-0.5">Continuing in a fresh context window</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Inline Errors ═══ */}
      <AnimatePresence>
        {apiError?.type === 'rate_limit' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-5 py-1.5">
            <p className="text-xs text-[#E5A620]">{apiError.message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Input Area ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...SPRING_SMOOTH, delay: 0.3 }}
        className="px-4 pb-3 pt-2"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 12px), 12px)' }}
      >
        <div className="flex items-start gap-2.5">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              placeholder="Type here, or swipe left to start a new chat."
              rows={1}
              className="w-full bg-white rounded-xl px-4 py-2.5 text-[14px] text-[#1E2532] outline-none placeholder:text-[#D5D5D5] border transition-colors resize-none"
              style={{
                borderColor: inputFocused ? '#4A7AE5' : '#DDDDE3',
                maxHeight: 120,
                minHeight: 40,
                lineHeight: '20px',
              }}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
            />
          </div>
          {/* Send/Stop — context health colored */}
          <motion.button
            whileTap={{ scale: 0.85 }}
            className="rounded-xl border flex items-center justify-center flex-shrink-0 transition-colors"
            style={{
              width: 40,
              height: 40,
              borderColor: isStreaming ? '#EF4444' : inputValue.trim() ? contextColor : '#DDDDE3',
              backgroundColor: isStreaming ? '#EF4444' : inputValue.trim() ? contextColor : 'transparent',
            }}
          >
            <AnimatePresence mode="wait">
              {isStreaming ? (
                <motion.div key="stop" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} transition={SPRING_SNAPPY}>
                  <Square className="w-4 h-4 text-white" />
                </motion.div>
              ) : (
                <motion.div key="send" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} transition={SPRING_SNAPPY}>
                  <ArrowUp className="w-5 h-5 transition-colors" style={{ color: inputValue.trim() ? '#FFFFFF' : contextColor }} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </motion.div>

      {/* ═══ Unified Panel ═══ */}
      <AnimatePresence>
        {panelOpen && (
          <UnifiedPanel
            open={panelOpen}
            onClose={() => setPanelOpen(false)}
            messages={messages}
            highlights={MOCK_HIGHLIGHTS}
            branches={MOCK_BRANCHES}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
