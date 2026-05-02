import React, { useState, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, GitBranch, Plus, MessageSquare, Trash2, Copy, Pin, Star, Check, Settings, AlertCircle, X, StickyNote, Highlighter, Sparkles, RefreshCw } from 'lucide-react';

const SPRING_SNAPPY = { type: 'spring', stiffness: 500, damping: 30 };
const SPRING_SMOOTH = { type: 'spring', stiffness: 300, damping: 28 };
const staggerContainer = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.03, delayChildren: 0.06 } } };
const staggerItem = { hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0, transition: SPRING_SMOOTH } };

/* ═══════════════════════════════════════════════════════════ */
/*  FAMILY COLORS                                               */
/* ═══════════════════════════════════════════════════════════ */

const FAMILY_COLORS = [
  '#4A7AE5', '#22C55E', '#E5A620', '#7C6CD4',
  '#EF4444', '#06B6D4', '#EC4899', '#F97316',
];

/* ═══════════════════════════════════════════════════════════ */
/*  MOCK DATA                                                    */
/* ═══════════════════════════════════════════════════════════ */

const MOCK_CHATS = [
  {
    id: 'c1', title: 'Custom Chat Interface Design', lastEdited: '2025-02-25T14:30:00', created: '2025-02-20T09:15:00', pinned: true, storageBytes: 245760,
    familyId: 'f1', parentId: null, parentTitle: null,
    aiSummary: 'Designed a multi-panel chat interface with branching, context metering, and ghost text recovery. Settled on spring animations and a minimal white aesthetic.',
    notes: [
      { id: 'n1', text: 'This is the main design thread — reference for all UI decisions', messageRef: 14 },
      { id: 'n2', text: 'Need to revisit the sidebar width on smaller screens', messageRef: null },
    ],
    highlights: [
      { id: 'h1', text: 'Context meter should use gradient fill from blue to amber at 80%', color: '#4A7AE5', multiline: false },
      { id: 'h2', text: 'Ghost text renders with 50% opacity and dashed left border.', color: '#22C55E', multiline: true },
    ],
    tags: ['design', 'ui'],
  },
  {
    id: 'c1-b1', title: 'Chat Interface — Product Focus', lastEdited: '2025-02-26T11:00:00', created: '2025-02-21T10:00:00', pinned: false, storageBytes: 381920,
    familyId: 'f1', parentId: 'c1', parentTitle: 'Custom Chat Interface Design',
    aiSummary: 'Shifted focus to product positioning and feature prioritization. Identified chat selector enrichment and branch visualization as key differentiators.',
    notes: [
      { id: 'n6', text: 'This branch became the main working thread after Feb 21', messageRef: null },
      { id: 'n7', text: 'Product focus resonated more with the overall vision', messageRef: 8 },
    ],
    highlights: [
      { id: 'h9', text: 'Global view toggle: Summary, Notes, Highlights — switches inline content across all rows', color: '#4A7AE5', multiline: false },
      { id: 'h10', text: 'Count badges are interactive — clicking overrides that row independently', color: '#E5A620', multiline: false },
      { id: 'h11', text: 'Branch rows should be peers, not children.', color: '#22C55E', multiline: true },
    ],
    tags: ['product', 'design'],
  },
  {
    id: 'c1-b2', title: 'Chat Interface — Technical Deep Dive', lastEdited: '2025-02-23T16:45:00', created: '2025-02-21T14:30:00', pinned: false, storageBytes: 122880,
    familyId: 'f1', parentId: 'c1', parentTitle: 'Custom Chat Interface Design',
    aiSummary: 'Explored IndexedDB schema design, Web Crypto API integration, and streaming response handling.',
    notes: [],
    highlights: [
      { id: 'h12', text: 'AES-GCM with non-extractable CryptoKey for API key encryption at rest', color: '#7C6CD4', multiline: false },
    ],
    tags: ['technical', 'architecture'],
  },
  {
    id: 'c2', title: 'API Integration Strategy', lastEdited: '2025-02-25T10:12:00', created: '2025-02-22T14:00:00', pinned: false, storageBytes: 184320,
    familyId: null, parentId: null, parentTitle: null,
    aiSummary: 'Explored provider abstraction layer design. Decided on interface-based approach with Claude as sole V1 provider.',
    notes: [],
    highlights: [
      { id: 'h3', text: 'All API calls must go through /providers/anthropic.js', color: '#E5A620', multiline: false },
    ],
    tags: ['api', 'architecture'],
  },
  {
    id: 'c3', title: 'Context Window Optimization', lastEdited: '2025-02-24T18:45:00', created: '2025-02-19T08:30:00', pinned: false, storageBytes: 512000,
    familyId: 'f2', parentId: null, parentTitle: null,
    aiSummary: 'Deep dive into token management strategies. Auto-compression via branching is superior to in-place summarization.',
    notes: [
      { id: 'n3', text: 'Revisit the compression ratio calculations — may need tuning', messageRef: 8 },
    ],
    highlights: [
      { id: 'h4', text: '200k token context window, keep prompts under 80k', color: '#4A7AE5', multiline: false },
      { id: 'h5', text: 'Branch-based compression preserves original conversation intact.', color: '#22C55E', multiline: true },
      { id: 'h6', text: 'Show token count per message during selection (~340 tokens)', color: '#E5A620', multiline: false },
    ],
    tags: ['performance', 'tokens'],
  },
  {
    id: 'c3-b1', title: 'Token Compression Experiments', lastEdited: '2025-02-24T17:00:00', created: '2025-02-20T11:00:00', pinned: false, storageBytes: 163840,
    familyId: 'f2', parentId: 'c3', parentTitle: 'Context Window Optimization',
    aiSummary: 'Tested various compression ratios and summarization prompts. 60-70% reduction maintains conversation coherence.',
    notes: [
      { id: 'n8', text: 'The 65% compression sweet spot needs more testing with longer conversations', messageRef: 12 },
    ],
    highlights: [],
    tags: ['performance', 'experiments'],
  },
  {
    id: 'c4', title: 'User Research Findings', lastEdited: '2025-02-23T09:00:00', created: '2025-02-18T11:20:00', pinned: false, storageBytes: 71680,
    familyId: null, parentId: null, parentTitle: null,
    aiSummary: 'Analyzed power user behavior patterns. Key finding: 12% of users account for 64% of API calls.',
    notes: [
      { id: 'n4', text: 'Need to validate these numbers with a larger sample', messageRef: null },
    ],
    highlights: [],
    tags: ['research'],
  },
  {
    id: 'c5', title: 'Export & Review System', lastEdited: '2025-02-21T12:00:00', created: '2025-02-15T16:45:00', pinned: false, storageBytes: 143360,
    familyId: null, parentId: null, parentTitle: null,
    aiSummary: 'Designed export formats: encrypted .apb for backups, plain JSON for portability.',
    notes: [
      { id: 'n5', text: 'The review modal is a differentiator — prioritize this', messageRef: 22 },
    ],
    highlights: [],
    tags: ['export', 'review'],
  },
  {
    id: 'c6', title: 'Keyboard Shortcuts Design', lastEdited: '2025-02-20T08:30:00', created: '2025-02-14T13:00:00', pinned: false, storageBytes: 40960,
    familyId: null, parentId: null, parentTitle: null,
    aiSummary: 'Mapped keyboard shortcuts using Cmd/Ctrl as base modifier. Avoided browser conflicts.',
    notes: [],
    highlights: [],
    tags: ['ux', 'shortcuts'],
  },
  {
    id: 'c7', title: 'Prompt Engineering Patterns', lastEdited: '2025-02-19T16:20:00', created: '2025-02-12T10:45:00', pinned: false, storageBytes: 204800,
    familyId: null, parentId: null, parentTitle: null,
    aiSummary: 'Explored chain-of-thought prompting, system prompt patterns, and context injection techniques.',
    notes: [],
    highlights: [
      { id: 'h8', text: 'Auto-title uses lightweight summarization after first exchange', color: '#4A7AE5', multiline: false },
    ],
    tags: ['prompts', 'ai'],
  },
];

const MOCK_FAVORITES = [
  { id: 'f1', snippet: '=VLOOKUP(A2, Sheet2!A:B, 2, FALSE)', source: 'API Integration Strategy', sourceId: 'c2' },
  { id: 'f2', snippet: 'The context window limit is 200k tokens. For optimal performance, keep prompts under 80k.', source: 'Context Window Optimization', sourceId: 'c3' },
  { id: 'f3', snippet: 'git checkout -b feature/new-branch && git push -u origin feature/new-branch', source: 'Custom Chat Interface Design', sourceId: 'c1' },
  { id: 'f4', snippet: 'Power users: 12% of user base, 64% of total API calls.', source: 'User Research Findings', sourceId: 'c4' },
];

function buildFamilyColorMap(chats) {
  const families = [...new Set(chats.filter(c => c.familyId).map(c => c.familyId))];
  const map = {};
  families.forEach((fid, i) => { map[fid] = FAMILY_COLORS[i % FAMILY_COLORS.length]; });
  return map;
}

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
  if (diffMins < 1) return 'just now';
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
  if (bytes == null || bytes === 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const VIEWS = [
  { id: 'summary', icon: Sparkles, label: 'Summary' },
  { id: 'notes', icon: StickyNote, label: 'Notes' },
  { id: 'highlights', icon: Highlighter, label: 'Highlights' },
  { id: 'branches', icon: GitBranch, label: 'Branches' },
];

/* ═══════════════════════════════════════════════════════════ */
/*  STORAGE WARNING BANNER                                      */
/* ═══════════════════════════════════════════════════════════ */

function StorageWarningBanner({ usagePercent }) {
  const [dismissed, setDismissed] = useState(false);
  if (usagePercent < 80 || dismissed) return null;
  const isCritical = usagePercent >= 95;
  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={SPRING_SMOOTH}
      className={`flex items-center gap-2 px-5 py-2 text-xs ${isCritical ? 'text-red-500' : 'text-amber-600'}`}
      style={{ backgroundColor: isCritical ? '#FEF2F2' : '#FFFBEB' }}>
      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="flex-1">{isCritical ? 'Storage critically full.' : 'Storage getting full. Consider exporting.'}</span>
      <button onClick={() => setDismissed(true)} className="p-1 rounded-full active:bg-black/5"><X className="w-3 h-3" /></button>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  CHECKBOX                                                    */
/* ═══════════════════════════════════════════════════════════ */

function Checkbox({ checked, onChange }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      className="w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors"
      style={{
        borderColor: checked ? '#4A7AE5' : '#D5D5D5',
        backgroundColor: checked ? '#4A7AE5' : 'transparent',
      }}
    >
      {checked && (
        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  FAVORITES BOTTOM SHEET                                      */
/* ═══════════════════════════════════════════════════════════ */

function FavoritesSheet({ open, onClose, favorites, onRemove }) {
  if (!open) return null;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50"
      style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={SPRING_SMOOTH}
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[70vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full bg-[#D5D5D5]" />
        </div>
        <div className="flex items-center justify-between px-5 pb-3 pt-1">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-[#E5A620]" style={{ fill: '#E5A620' }} />
            <span className="text-base font-semibold text-[#1E2532]">Favorites</span>
            <span className="text-xs text-[#C0C8D4]">{favorites.length}</span>
          </div>
          <button onClick={onClose} className="p-2 -mr-2 rounded-full active:bg-[#EEEEEE]">
            <X className="w-4 h-4 text-[#6B7C93]" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-8" style={{ WebkitOverflowScrolling: 'touch' }}>
          {favorites.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Star className="w-8 h-8 text-[#EBEBEB] mb-3" />
              <p className="text-xs text-[#6B7C93] text-center leading-relaxed">Star messages in conversations to save them here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {favorites.map((fav) => (
                <FavoriteCardMobile key={fav.id} favorite={fav} onRemove={() => onRemove(fav.id)} />
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function FavoriteCardMobile({ favorite, onRemove }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(favorite.snippet).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="rounded-xl border border-[#EBEBEB] bg-white overflow-hidden">
      <div className="px-4 pt-3 pb-2">
        <p className="text-xs text-[#1E2532] leading-relaxed" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {favorite.snippet}
        </p>
      </div>
      <div className="flex items-center justify-between px-4 pb-3">
        <span className="text-[10px] text-[#6B7C93] truncate flex-1 mr-3">{favorite.source}</span>
        <div className="flex items-center gap-1">
          <button onClick={handleCopy} className="p-2 rounded-lg active:bg-[#EEEEEE] text-[#6B7C93]">
            {copied ? <Check className="w-3.5 h-3.5 text-[#22C55E]" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button onClick={onRemove} className="p-2 rounded-lg active:bg-red-50 text-[#6B7C93]">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  FLOATING BULK ACTION BAR                                    */
/* ═══════════════════════════════════════════════════════════ */

function BulkActionBar({ selectedCount, selectedBytes, onPin, onRegenerate, onDelete, onClear }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.96 }}
      transition={SPRING_SNAPPY}
      className="absolute left-4 right-4 z-30 flex items-center justify-between rounded-2xl bg-white border border-[#EBEBEB] px-4 py-2.5"
      style={{ top: 8, boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)' }}
    >
      {/* Left: count + size */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[13px] font-semibold text-[#4A7AE5]">
          {selectedCount > 0 ? selectedCount : 'Select'}
        </span>
        {selectedBytes > 0 && (
          <span className="text-[11px] text-[#C0C8D4]">{formatBytes(selectedBytes)}</span>
        )}
      </div>

      {/* Center: actions */}
      <div className="flex items-center gap-0.5">
        <button onClick={onPin} className="p-2.5 rounded-xl active:bg-[#F0F5FF] text-[#6B7C93] active:text-[#4A7AE5]">
          <Pin className="w-[18px] h-[18px]" />
        </button>
        <button onClick={onRegenerate} className="p-2.5 rounded-xl active:bg-[#F0F5FF] text-[#6B7C93] active:text-[#4A7AE5]">
          <RefreshCw className="w-[18px] h-[18px]" />
        </button>
        <button onClick={onDelete} className="p-2.5 rounded-xl active:bg-red-50 text-[#6B7C93] active:text-red-500">
          <Trash2 className="w-[18px] h-[18px]" />
        </button>
      </div>

      {/* Right: dismiss */}
      <button onClick={onClear} className="p-2 -mr-1 rounded-xl active:bg-[#EEEEEE]">
        <X className="w-4 h-4 text-[#6B7C93]" />
      </button>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  VIEW CONTENT RENDERERS                                      */
/* ═══════════════════════════════════════════════════════════ */

function SummaryContent({ chat }) {
  if (!chat.aiSummary) return null;
  return (
    <p className="text-[12px] text-[#9CA7B8] leading-relaxed mt-1"
      style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
      {chat.aiSummary}
    </p>
  );
}

function NotesContent({ chat }) {
  const hasNotes = chat.notes && chat.notes.length > 0;
  if (!hasNotes) return <p className="text-[11px] text-[#D5D5D5] mt-1 italic">No notes</p>;
  return (
    <div className="mt-1.5 space-y-1">
      {chat.notes.slice(0, 2).map((note) => (
        <div key={note.id} className="flex items-start gap-2">
          <div className="w-1 min-h-[14px] rounded-full flex-shrink-0 mt-0.5 bg-[#4A7AE5]/20" />
          <p className="text-[12px] text-[#4A5568] leading-relaxed flex-1"
            style={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {note.text}
          </p>
        </div>
      ))}
      {chat.notes.length > 2 && (
        <span className="text-[10px] text-[#C0C8D4] ml-3">+{chat.notes.length - 2} more</span>
      )}
    </div>
  );
}

function HighlightsContent({ chat }) {
  const hasHighlights = chat.highlights && chat.highlights.length > 0;
  if (!hasHighlights) return <p className="text-[11px] text-[#D5D5D5] mt-1 italic">No highlights</p>;
  return (
    <div className="mt-1.5 space-y-1">
      {chat.highlights.slice(0, 2).map((hl) => (
        <div key={hl.id} className="flex items-start gap-2">
          <div className="flex-shrink-0 mt-0.5">
            <div className="rounded-full" style={{ backgroundColor: hl.color, width: 3, height: hl.multiline ? 24 : 14, opacity: hl.multiline ? 1 : 0.6 }} />
          </div>
          <p className="text-[12px] text-[#4A5568] leading-relaxed flex-1"
            style={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {hl.text}
          </p>
        </div>
      ))}
      {chat.highlights.length > 2 && (
        <span className="text-[10px] text-[#C0C8D4] ml-3">+{chat.highlights.length - 2} more</span>
      )}
    </div>
  );
}

function BranchesContent({ chat, allChats, familyColor }) {
  const isBranch = !!chat.parentId;
  const children = allChats.filter(c => c.parentId === chat.id);
  if (!isBranch && children.length === 0) return <p className="text-[11px] text-[#D5D5D5] mt-1 italic">No branches</p>;
  return (
    <div className="mt-1.5 space-y-1">
      {isBranch && (
        <div className="flex items-center gap-2">
          <div className="rounded-full flex-shrink-0" style={{ backgroundColor: familyColor || '#7C6CD4', width: 3, height: 14 }} />
          <span className="text-[10px] text-[#9CA7B8]">branched from</span>
          <span className="text-[12px] text-[#4A5568] font-semibold truncate">{chat.parentTitle}</span>
        </div>
      )}
      {children.map((child) => (
        <div key={child.id} className="flex items-center gap-2">
          <div className="rounded-full flex-shrink-0" style={{ backgroundColor: familyColor || '#7C6CD4', width: 3, height: 14 }} />
          <GitBranch className="w-2.5 h-2.5 text-[#7C6CD4] flex-shrink-0" />
          <span className="text-[12px] text-[#4A5568] font-semibold truncate">{child.title}</span>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  CHAT ROW                                                    */
/* ═══════════════════════════════════════════════════════════ */

function ChatRow({ chat, activeView, allChats, familyColor, isDeemphasized, selectionMode, isSelected, onToggleSelect }) {
  return (
    <motion.div
      variants={staggerItem}
      className="border-b border-[#F0F0F0]"
      style={{ opacity: isDeemphasized ? 0.4 : 1, transition: 'opacity 0.2s ease' }}
    >
      <div
        className="flex items-start gap-3 px-5 py-3.5 active:bg-[#FAFAFA] transition-colors"
        style={{ backgroundColor: isSelected ? '#F0F5FF' : undefined }}
        onClick={() => selectionMode && onToggleSelect(chat.id)}
      >
        {/* Checkbox — slides in from left */}
        <AnimatePresence>
          {selectionMode && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 20, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={SPRING_SNAPPY}
              className="flex-shrink-0 pt-0.5 overflow-hidden"
            >
              <Checkbox checked={isSelected} onChange={() => onToggleSelect(chat.id)} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-semibold text-[#1E2532] truncate flex-1">{chat.title}</span>
            {chat.pinned && <Pin className="w-3 h-3 text-[#4A7AE5] flex-shrink-0" style={{ fill: '#4A7AE5' }} />}
          </div>

          {/* Dates */}
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-[11px] text-[#C0C8D4]">edited {formatRelative(chat.lastEdited)}</span>
            <span className="text-[11px] text-[#C0C8D4]">created {formatShortDate(chat.created)}</span>
          </div>

          {/* View-specific content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12 }}
            >
              {activeView === 'summary' && <SummaryContent chat={chat} />}
              {activeView === 'notes' && <NotesContent chat={chat} />}
              {activeView === 'highlights' && <HighlightsContent chat={chat} />}
              {activeView === 'branches' && <BranchesContent chat={chat} allChats={allChats} familyColor={familyColor} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  BOTTOM TAB BAR                                              */
/* ═══════════════════════════════════════════════════════════ */

function BottomTabBar({ activeView, onChangeView }) {
  return (
    <div
      className="flex items-center justify-around border-t border-[#EBEBEB] bg-white/95 backdrop-blur-sm"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)', paddingTop: 10 }}
    >
      {VIEWS.map(({ id, icon: Icon, label }) => {
        const isActive = activeView === id;
        return (
          <button
            key={id}
            onClick={() => onChangeView(id)}
            className="flex flex-col items-center gap-1 px-4 py-1 relative"
          >
            {isActive && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute -top-[10px] left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-[#4A7AE5]"
                transition={SPRING_SNAPPY}
              />
            )}
            <Icon
              className="w-5 h-5 transition-colors"
              style={{ color: isActive ? '#4A7AE5' : '#C0C8D4' }}
            />
            <span
              className="text-[10px] font-semibold transition-colors"
              style={{ color: isActive ? '#4A7AE5' : '#C0C8D4' }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  MAIN COMPONENT                                              */
/* ═══════════════════════════════════════════════════════════ */

export default function ChatSelectorMobile() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState('summary');
  const [chats, setChats] = useState(MOCK_CHATS);
  const [favorites, setFavorites] = useState(MOCK_FAVORITES);
  const [favSheetOpen, setFavSheetOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  // Selection mode state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState(new Set());

  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });

  const familyColorMap = useMemo(() => buildFamilyColorMap(chats), [chats]);
  const removeFavorite = (id) => setFavorites(prev => prev.filter(f => f.id !== id));

  const toggleSelected = useCallback((id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelected(new Set());
  }, []);

  const sortedChats = useMemo(() => {
    let filtered = [...chats];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.title.toLowerCase().includes(q)
        || (c.aiSummary && c.aiSummary.toLowerCase().includes(q))
        || (c.notes && c.notes.some(n => n.text.toLowerCase().includes(q)))
        || (c.tags && c.tags.some(t => t.toLowerCase().includes(q)))
        || (c.parentTitle && c.parentTitle.toLowerCase().includes(q))
      );
    }
    filtered.sort((a, b) => new Date(b.lastEdited).getTime() - new Date(a.lastEdited).getTime());
    filtered.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
    return filtered;
  }, [chats, searchQuery]);

  const isRowDeemphasized = useCallback((chat) => {
    if (activeView === 'notes') return !chat.notes || chat.notes.length === 0;
    if (activeView === 'highlights') return !chat.highlights || chat.highlights.length === 0;
    if (activeView === 'branches') {
      const isBranch = !!chat.parentId;
      const hasChildren = chats.some(c => c.parentId === chat.id);
      return !isBranch && !hasChildren;
    }
    return false;
  }, [activeView, chats]);

  const selectedSizeTotal = useMemo(() => {
    let t = 0;
    selected.forEach(id => { const c = chats.find(ch => ch.id === id); if (c?.storageBytes) t += c.storageBytes; });
    return t;
  }, [selected, chats]);

  /* ── Swipe right on list → enter selection mode ── */
  const handleTouchStart = useCallback((e) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now(),
    };
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (selectionMode) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    const dt = Date.now() - touchStartRef.current.time;

    if (dx > 60 && Math.abs(dx) > Math.abs(dy) * 1.8 && dt < 400) {
      setSelectionMode(true);
    }
  }, [selectionMode]);

  /* ── Bulk actions ── */
  const handleBulkPin = () => {
    const anyUnpinned = [...selected].some(id => { const c = chats.find(ch => ch.id === id); return c && !c.pinned; });
    setChats(prev => prev.map(c => selected.has(c.id) ? { ...c, pinned: anyUnpinned } : c));
    exitSelectionMode();
  };
  const handleBulkRegenerate = () => { exitSelectionMode(); };
  const handleBulkDelete = () => {
    setChats(prev => prev.filter(c => !selected.has(c.id)));
    exitSelectionMode();
  };

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
      {/* ═══ Top Bar ═══ */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...SPRING_SMOOTH, delay: 0.05 }}
        className="flex items-center justify-between px-5 pt-3 pb-2"
        style={{ paddingTop: 'max(env(safe-area-inset-top, 12px), 12px)' }}
      >
        {/* Left: Settings + Favorites */}
        <div className="flex items-center gap-1.5">
          <motion.button
            whileTap={{ scale: 0.9 }}
            className="p-2.5 rounded-xl border border-[#EBEBEB] bg-white active:bg-[#FAFAFA]"
          >
            <Settings className="w-4 h-4 text-[#6B7C93]" />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setFavSheetOpen(true)}
            className="p-2.5 rounded-xl border border-[#EBEBEB] bg-white active:bg-[#FAFAFA] relative"
          >
            <Star className="w-4 h-4 text-[#6B7C93]" />
            {favorites.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#E5A620] text-white text-[9px] font-bold flex items-center justify-center">
                {favorites.length}
              </span>
            )}
          </motion.button>
        </div>

        {/* Right: + Chat */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#EBEBEB] bg-white active:bg-[#FAFAFA]"
        >
          <Plus className="w-4 h-4 text-[#4A7AE5]" />
          <span className="text-[13px] font-semibold text-[#1E2532]">Chat</span>
        </motion.button>
      </motion.div>

      {/* ═══ Search Bar ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...SPRING_SMOOTH, delay: 0.1 }}
        className="px-5 pb-3"
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D5D5D5]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search chats..."
            className="w-full bg-[#F8F8F8] rounded-xl pl-9 pr-4 py-2.5 text-sm text-[#1E2532] outline-none placeholder:text-[#D5D5D5] border border-transparent transition-colors"
            style={{ borderColor: searchFocused ? '#4A7AE5' : 'transparent' }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full active:bg-[#EEEEEE]"
            >
              <X className="w-3.5 h-3.5 text-[#C0C8D4]" />
            </button>
          )}
        </div>
      </motion.div>

      <StorageWarningBanner usagePercent={82} />

      {/* ═══ Chat List Area ═══ */}
      <div className="flex-1 relative overflow-hidden">

        {/* Floating bulk action bar — overlays list */}
        <AnimatePresence>
          {selectionMode && (
            <BulkActionBar
              selectedCount={selected.size}
              selectedBytes={selectedSizeTotal}
              onPin={handleBulkPin}
              onRegenerate={handleBulkRegenerate}
              onDelete={handleBulkDelete}
              onClear={exitSelectionMode}
            />
          )}
        </AnimatePresence>

        {/* Scrollable list */}
        <div
          className="h-full overflow-y-auto"
          style={{
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
          }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Spacer when bulk bar is visible so first row isn't hidden */}
          <AnimatePresence>
            {selectionMode && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 56 }}
                exit={{ height: 0 }}
                transition={{ duration: 0.15 }}
              />
            )}
          </AnimatePresence>

          <motion.div variants={staggerContainer} initial="hidden" animate="show">
            {sortedChats.map((chat) => (
              <ChatRow
                key={chat.id}
                chat={chat}
                activeView={activeView}
                allChats={chats}
                familyColor={chat.familyId ? familyColorMap[chat.familyId] : null}
                isDeemphasized={isRowDeemphasized(chat)}
                selectionMode={selectionMode}
                isSelected={selected.has(chat.id)}
                onToggleSelect={toggleSelected}
              />
            ))}
          </motion.div>

          {sortedChats.length === 0 && searchQuery && (
            <div className="flex flex-col items-center justify-center py-20 px-8">
              <Search className="w-8 h-8 text-[#EBEBEB] mb-3" />
              <p className="text-sm text-[#6B7C93] text-center">No chats matching "{searchQuery}"</p>
            </div>
          )}
          {sortedChats.length === 0 && !searchQuery && (
            <div className="flex flex-col items-center justify-center py-20 px-8">
              <MessageSquare className="w-8 h-8 text-[#EBEBEB] mb-3" />
              <p className="text-sm text-[#6B7C93] mb-1">No conversations yet</p>
              <p className="text-xs text-[#C0C8D4]">Start your first conversation</p>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-center py-4 px-5">
            <span className="text-[11px] text-[#D5D5D5]">
              {chats.length} conversation{chats.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* ═══ Bottom Tab Bar ═══ */}
      <BottomTabBar activeView={activeView} onChangeView={setActiveView} />

      {/* ═══ Favorites Sheet ═══ */}
      <AnimatePresence>
        {favSheetOpen && (
          <FavoritesSheet
            open={favSheetOpen}
            onClose={() => setFavSheetOpen(false)}
            favorites={favorites}
            onRemove={removeFavorite}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
