import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, GitBranch, Plus, MessageSquare, ArrowUp, ArrowDown, Trash2, Copy, Pin, Star, PanelRight, Check, Settings, AlertCircle, X, StickyNote, Highlighter, Pencil, RefreshCw, Sparkles } from 'lucide-react';

const SPRING_SNAPPY = { type: 'spring', stiffness: 500, damping: 30 };
const SPRING_SMOOTH = { type: 'spring', stiffness: 300, damping: 28 };
const SIDEBAR_RESIZE = { type: 'spring', stiffness: 150, damping: 25 };
const staggerContainer = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.03, delayChildren: 0.06 } } };
const staggerItem = { hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0, transition: SPRING_SMOOTH } };

/* ═══════════════════════════════════════════════════════════ */
/*  FAMILY COLORS — shared by parent + branches                */
/* ═══════════════════════════════════════════════════════════ */

const FAMILY_COLORS = [
  '#4A7AE5', // blue
  '#22C55E', // green
  '#E5A620', // amber
  '#7C6CD4', // purple
  '#EF4444', // red
  '#06B6D4', // cyan
  '#EC4899', // pink
  '#F97316', // orange
];

/* ═══════════════════════════════════════════════════════════ */
/*  MOCK DATA — flat model, branches are top-level             */
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
      { id: 'h2', text: 'Ghost text renders with 50% opacity and dashed left border. The incomplete message stays visible in the UI with a pulsing cursor indicator.', color: '#22C55E', multiline: true },
    ],
    tags: ['design', 'ui'],
  },
  {
    id: 'c1-b1', title: 'Chat Interface — Product Focus', lastEdited: '2025-02-26T11:00:00', created: '2025-02-21T10:00:00', pinned: false, storageBytes: 381920,
    familyId: 'f1', parentId: 'c1', parentTitle: 'Custom Chat Interface Design',
    aiSummary: 'Shifted focus to product positioning and feature prioritization. Identified chat selector enrichment and branch visualization as key differentiators. Extended the design system with insight panels.',
    notes: [
      { id: 'n6', text: 'This branch became the main working thread after Feb 21', messageRef: null },
      { id: 'n7', text: 'Product focus resonated more with the overall vision', messageRef: 8 },
    ],
    highlights: [
      { id: 'h9', text: 'Global view toggle: Summary, Notes, Highlights — switches inline content across all rows', color: '#4A7AE5', multiline: false },
      { id: 'h10', text: 'Count badges are interactive — clicking overrides that row independently of the global toggle', color: '#E5A620', multiline: false },
      { id: 'h11', text: 'Branch rows should be peers, not children. Any conversation can become the primary one over time.', color: '#22C55E', multiline: true },
    ],
    tags: ['product', 'design'],
  },
  {
    id: 'c1-b2', title: 'Chat Interface — Technical Deep Dive', lastEdited: '2025-02-23T16:45:00', created: '2025-02-21T14:30:00', pinned: false, storageBytes: 122880,
    familyId: 'f1', parentId: 'c1', parentTitle: 'Custom Chat Interface Design',
    aiSummary: 'Explored IndexedDB schema design, Web Crypto API integration, and streaming response handling. Documented provider abstraction patterns.',
    notes: [],
    highlights: [
      { id: 'h12', text: 'AES-GCM with non-extractable CryptoKey for API key encryption at rest', color: '#7C6CD4', multiline: false },
    ],
    tags: ['technical', 'architecture'],
  },
  {
    id: 'c2', title: 'API Integration Strategy', lastEdited: '2025-02-25T10:12:00', created: '2025-02-22T14:00:00', pinned: false, storageBytes: 184320,
    familyId: null, parentId: null, parentTitle: null,
    aiSummary: 'Explored provider abstraction layer design. Decided on interface-based approach with Claude as sole V1 provider. Discussed streaming, error handling, and retry logic.',
    notes: [],
    highlights: [
      { id: 'h3', text: 'All API calls must go through /providers/anthropic.js', color: '#E5A620', multiline: false },
    ],
    tags: ['api', 'architecture'],
  },
  {
    id: 'c3', title: 'Context Window Optimization', lastEdited: '2025-02-24T18:45:00', created: '2025-02-19T08:30:00', pinned: false, storageBytes: 512000,
    familyId: 'f2', parentId: null, parentTitle: null,
    aiSummary: 'Deep dive into token management strategies. Concluded that auto-compression via branching is superior to in-place summarization.',
    notes: [
      { id: 'n3', text: 'Revisit the compression ratio calculations — may need tuning', messageRef: 8 },
    ],
    highlights: [
      { id: 'h4', text: '200k token context window, keep prompts under 80k', color: '#4A7AE5', multiline: false },
      { id: 'h5', text: 'Branch-based compression preserves original conversation intact. The original branch remains as a full archive.', color: '#22C55E', multiline: true },
      { id: 'h6', text: 'Show token count per message during selection (~340 tokens)', color: '#E5A620', multiline: false },
    ],
    tags: ['performance', 'tokens'],
  },
  {
    id: 'c3-b1', title: 'Token Compression Experiments', lastEdited: '2025-02-24T17:00:00', created: '2025-02-20T11:00:00', pinned: false, storageBytes: 163840,
    familyId: 'f2', parentId: 'c3', parentTitle: 'Context Window Optimization',
    aiSummary: 'Tested various compression ratios and summarization prompts. Found that 60-70% reduction maintains conversation coherence while freeing significant context.',
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
    aiSummary: 'Designed export formats: encrypted .apb for backups, plain JSON for portability. Review modal synthesizes highlights, notes, and favorites.',
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

const MOCK_STORAGE_PERCENT = 82;

const TAG_COLORS = {
  'design': '#4A7AE5', 'ui': '#7C6CD4', 'api': '#22C55E', 'architecture': '#E5A620',
  'performance': '#EF4444', 'tokens': '#E5A620', 'research': '#4A7AE5', 'collaboration': '#7C6CD4',
  'v2': '#6B7C93', 'export': '#22C55E', 'review': '#4A7AE5', 'ux': '#7C6CD4',
  'shortcuts': '#E5A620', 'prompts': '#EF4444', 'ai': '#4A7AE5', 'product': '#22C55E',
  'technical': '#7C6CD4', 'experiments': '#E5A620',
};

// Build family color map from data
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

/* ═══════════════════════════════════════════════════════════ */
/*  SMALL COMPONENTS                                            */
/* ═══════════════════════════════════════════════════════════ */

function StorageWarningBanner({ usagePercent }) {
  const [dismissed, setDismissed] = useState(false);
  if (usagePercent < 80 || dismissed) return null;
  const isCritical = usagePercent >= 95;
  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={SPRING_SMOOTH}
      className={`flex items-center gap-2.5 px-8 py-2.5 text-xs border-b ${isCritical ? 'text-red-500 border-red-100' : 'text-amber-600 border-amber-100'}`}
      style={{ backgroundColor: isCritical ? '#FEF2F2' : '#FFFBEB' }}>
      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="flex-1">{isCritical ? 'Storage critically full. Export or delete conversations.' : 'Browser storage getting full. Consider exporting a backup.'}</span>
      <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.85 }} onClick={() => setDismissed(true)} className="p-0.5 rounded hover:bg-black/5"><X className="w-3 h-3" /></motion.button>
    </motion.div>
  );
}

function Checkbox({ checked, indeterminate = false, onChange }) {
  return (
    <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.85 }}
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      className="w-4 h-4 rounded border flex items-center justify-center transition-colors flex-shrink-0"
      style={{ borderColor: checked || indeterminate ? '#4A7AE5' : '#D5D5D5', backgroundColor: checked || indeterminate ? '#4A7AE5' : 'transparent' }}>
      {checked && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
      {indeterminate && !checked && <div className="w-2 h-0.5 bg-white rounded-full" />}
    </motion.button>
  );
}

function InlineAction({ icon: Icon, label, onClick, danger = false }) {
  const [showTooltip, setShowTooltip] = useState(false);
  return (
    <div className="relative">
      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onClick}
        onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)}
        className={`p-1.5 rounded-md transition-colors ${danger ? 'hover:bg-red-50 text-[#6B7C93] hover:text-red-500' : 'hover:bg-white/60 text-[#6B7C93] hover:text-[#1E2532]'}`}>
        <Icon className="w-3.5 h-3.5" />
      </motion.button>
      <AnimatePresence>
        {showTooltip && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.12 }}
            className="absolute left-1/2 -translate-x-1/2 top-8 px-2 py-1 bg-[#1E2532] rounded text-[10px] text-white font-medium whitespace-nowrap z-50">{label}</motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InlineTitleEditor({ title, onSave, onCancel }) {
  const [value, setValue] = useState(title);
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select(); }, []);
  const commit = () => { const t = value.trim(); if (t && t !== title) onSave(t); else onCancel(); };
  return (
    <input ref={inputRef} value={value} onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); } if (e.key === 'Escape') onCancel(); }}
      onBlur={commit} onClick={(e) => e.stopPropagation()}
      className="bg-white rounded px-1.5 py-0.5 text-sm font-semibold text-[#1E2532] outline-none border border-[#4A7AE5] w-full max-w-[320px]" maxLength={60} />
  );
}

function InlineNoteEditor({ note = '', onSave, onCancel }) {
  const [value, setValue] = useState(note);
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  return (
    <div className="flex items-start gap-2 w-full" onClick={(e) => e.stopPropagation()}>
      <textarea ref={inputRef} value={value} onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSave(value.trim()); } if (e.key === 'Escape') onCancel(); }}
        placeholder="Add a note..." className="flex-1 bg-white rounded-lg px-3 py-2 text-xs text-[#1E2532] outline-none border border-[#4A7AE5] resize-none leading-relaxed placeholder:text-[#D5D5D5]" rows={2} maxLength={280} />
      <div className="flex flex-col gap-1">
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => onSave(value.trim())}
          className="px-2.5 py-1.5 rounded-md text-[10px] font-semibold bg-[#4A7AE5] text-white">Save</motion.button>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onCancel}
          className="px-2.5 py-1.5 rounded-md text-[10px] font-semibold text-[#6B7C93] hover:bg-[#EEEEEE]">Cancel</motion.button>
      </div>
    </div>
  );
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
  ];
  return (
    <div className="flex items-center bg-[#F5F5F5] rounded-lg p-0.5 gap-0.5">
      {views.map(({ id, icon: Icon, label }) => {
        const isActive = activeView === id;
        return (
          <motion.button key={id} onClick={() => onChangeView(id)}
            className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-colors ${isActive ? 'text-[#1E2532]' : 'text-[#9CA7B8] hover:text-[#6B7C93]'}`}
            whileHover={!isActive ? { backgroundColor: 'rgba(0,0,0,0.03)' } : {}}>
            {isActive && <motion.div layoutId="view-toggle-bg" className="absolute inset-0 bg-white rounded-md shadow-sm" transition={SPRING_SNAPPY} />}
            <span className="relative flex items-center gap-1.5"><Icon className="w-3 h-3" />{label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  COUNT BADGE                                                 */
/* ═══════════════════════════════════════════════════════════ */

function CountBadge({ icon: Icon, count, isActive, activeColor, onClick }) {
  if (count === 0) return null;
  return (
    <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 font-semibold transition-colors ${isActive ? 'text-white' : 'text-[#9CA7B8] hover:text-[#6B7C93]'}`}
      style={isActive ? { backgroundColor: activeColor } : { backgroundColor: 'rgba(0,0,0,0.04)' }}>
      <Icon className="w-2.5 h-2.5" />{count}
    </motion.button>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  FAVORITE CARD                                               */
/* ═══════════════════════════════════════════════════════════ */

function FavoriteCard({ favorite, onRemove }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e) => { e.stopPropagation(); navigator.clipboard.writeText(favorite.snippet).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  return (
    <motion.div variants={staggerItem} whileHover={{ borderColor: '#E0E0E0' }}
      className="group rounded-lg border border-[#EBEBEB] bg-white transition-colors cursor-pointer overflow-hidden">
      <div className="px-3 pt-3 pb-2">
        <p className="text-xs text-[#1E2532] leading-relaxed" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{favorite.snippet}</p>
      </div>
      <div className="flex items-center justify-between px-3 pb-2.5">
        <span className="text-[10px] text-[#6B7C93] truncate flex-1 mr-2">{favorite.source}</span>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.85 }} onClick={handleCopy} className="p-1 rounded hover:bg-[#EEEEEE] text-[#6B7C93] hover:text-[#1E2532] transition-colors">
            <AnimatePresence mode="wait">
              {copied ? <motion.div key="c" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}><Check className="w-3 h-3 text-[#22C55E]" /></motion.div>
                : <motion.div key="d" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}><Copy className="w-3 h-3" /></motion.div>}
            </AnimatePresence>
          </motion.button>
          <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.85 }} onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="p-1 rounded hover:bg-[#EEEEEE] text-[#6B7C93] hover:text-red-500 transition-colors"><Trash2 className="w-3 h-3" /></motion.button>
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  CHAT TABLE ROW — flat model, all conversations equal       */
/* ═══════════════════════════════════════════════════════════ */

function ChatTableRow({ chat, globalView, familyColor, familyCount, allChats, isDeemphasized, selected, onToggleSelected, onTitleEdit, onUpdateNotes, rowOverride, onSetRowOverride }) {
  const isSelected = selected.has(chat.id);
  const [editingTitle, setEditingTitle] = useState(false);
  const [addingNote, setAddingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);

  const hasNotes = chat.notes && chat.notes.length > 0;
  const hasHighlights = chat.highlights && chat.highlights.length > 0;
  const noteCount = chat.notes?.length || 0;
  const highlightCount = chat.highlights?.length || 0;
  const isBranch = !!chat.parentId;

  // Find children for this chat (if it's a parent)
  const children = allChats.filter(c => c.parentId === chat.id);
  const hasBranchRelationship = isBranch || children.length > 0;

  const effectiveView = rowOverride || globalView;

  const toggleRowOverride = (view) => {
    if (rowOverride === view) onSetRowOverride(chat.id, null);
    else onSetRowOverride(chat.id, view);
    setAddingNote(false);
    setEditingNoteId(null);
  };

  const handleAddNote = (text) => {
    if (!text) { setAddingNote(false); return; }
    onUpdateNotes(chat.id, [...(chat.notes || []), { id: `n-${Date.now()}`, text, messageRef: null }]);
    setAddingNote(false);
  };

  const handleEditNote = (noteId, newText) => {
    if (!newText) { setEditingNoteId(null); return; }
    onUpdateNotes(chat.id, (chat.notes || []).map(n => n.id === noteId ? { ...n, text: newText } : n));
    setEditingNoteId(null);
  };

  const handleDeleteNote = (noteId) => {
    onUpdateNotes(chat.id, (chat.notes || []).filter(n => n.id !== noteId));
  };

  return (
    <motion.div variants={staggerItem}>
      <motion.div
        whileHover={{ backgroundColor: '#FAFAFA' }}
        transition={{ duration: 0.1 }}
        className="group border-b border-[#F5F5F5] cursor-pointer"
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
                <InlineTitleEditor title={chat.title}
                  onSave={(t) => { setEditingTitle(false); onTitleEdit(chat.id, t); }}
                  onCancel={() => setEditingTitle(false)} />
              ) : (
                <span className="text-sm font-semibold text-[#1E2532] truncate"
                  onDoubleClick={(e) => { e.stopPropagation(); setEditingTitle(true); }}
                  title="Double-click to rename">{chat.title}</span>
              )}
              {chat.pinned && <Pin className="w-3 h-3 text-[#4A7AE5] flex-shrink-0" style={{ fill: '#4A7AE5' }} />}

              {/* Badges: branch count (on parents), notes, highlights */}
              <div className="flex items-center gap-1 ml-1">
                {children.length > 0 && (
                  <CountBadge icon={GitBranch} count={children.length}
                    isActive={effectiveView === 'branches' && rowOverride === 'branches'}
                    activeColor="#7C6CD4" onClick={() => toggleRowOverride('branches')} />
                )}
                <CountBadge icon={StickyNote} count={noteCount}
                  isActive={effectiveView === 'notes' && rowOverride === 'notes'}
                  activeColor="#4A7AE5" onClick={() => toggleRowOverride('notes')} />
                <CountBadge icon={Highlighter} count={highlightCount}
                  isActive={effectiveView === 'highlights' && rowOverride === 'highlights'}
                  activeColor="#E5A620" onClick={() => toggleRowOverride('highlights')} />
              </div>
            </div>

            {/* Inline content */}
            <AnimatePresence mode="wait">
              {effectiveView === 'summary' && (
                <motion.p key="summary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}
                  className="text-[11px] text-[#9CA7B8] leading-relaxed mt-1 line-clamp-1"
                  style={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {chat.aiSummary}
                </motion.p>
              )}

              {effectiveView === 'notes' && (
                <motion.div key="notes" initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -3 }} transition={{ duration: 0.15 }}
                  className="mt-1.5 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                  {hasNotes ? (
                    chat.notes.map((note) => (
                      <div key={note.id} className="group/note flex items-start gap-2">
                        <div className="w-1 min-h-[16px] rounded-full flex-shrink-0 mt-0.5 bg-[#4A7AE5]/20" />
                        <div className="flex-1 min-w-0">
                          {editingNoteId === note.id ? (
                            <InlineNoteEditor note={note.text} onSave={(t) => handleEditNote(note.id, t)} onCancel={() => setEditingNoteId(null)} />
                          ) : (
                            <div className="flex items-start gap-1.5">
                              <p className="text-[11px] text-[#4A5568] leading-relaxed flex-1">
                                {note.text}
                                {note.messageRef && <span className="text-[#C0C8D4] ml-1.5">(Message {note.messageRef})</span>}
                              </p>
                              <div className="flex items-center gap-0 opacity-0 group-hover/note:opacity-100 transition-opacity flex-shrink-0">
                                <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.85 }} onClick={() => setEditingNoteId(note.id)}
                                  className="p-0.5 rounded hover:bg-[#EEEEEE] text-[#C0C8D4] hover:text-[#6B7C93] transition-colors"><Pencil className="w-2.5 h-2.5" /></motion.button>
                                <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.85 }} onClick={() => handleDeleteNote(note.id)}
                                  className="p-0.5 rounded hover:bg-red-50 text-[#C0C8D4] hover:text-red-400 transition-colors"><Trash2 className="w-2.5 h-2.5" /></motion.button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : null}
                  {/* Add note — always visible in notes view, de-emphasized */}
                  {!addingNote && (
                    <button
                      onClick={() => setAddingNote(true)}
                      className="text-left px-2.5 py-1.5 rounded-md border border-dashed border-[#EBEBEB] hover:border-[#4A7AE5] text-[10px] text-[#C0C8D4] hover:text-[#4A7AE5] transition-colors w-full"
                      style={{ opacity: 0.45 }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '0.45'}>
                      + Add a note
                    </button>
                  )}
                  {addingNote && (
                    <InlineNoteEditor onSave={handleAddNote} onCancel={() => setAddingNote(false)} />
                  )}
                </motion.div>
              )}

              {effectiveView === 'highlights' && (
                <motion.div key="highlights" initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -3 }} transition={{ duration: 0.15 }}
                  className="mt-1.5 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                  {hasHighlights ? (
                    chat.highlights.map((hl) => (
                      <div key={hl.id} className="flex items-stretch gap-2 group/hl">
                        <div className="flex-shrink-0 flex items-stretch pt-0.5 pb-0.5">
                          <div className="rounded-full" style={{ backgroundColor: hl.color, width: 3, minHeight: hl.multiline ? 28 : 12, opacity: hl.multiline ? 1 : 0.6 }} />
                        </div>
                        <p className="text-[11px] text-[#4A5568] leading-relaxed flex-1">{hl.text}</p>
                        <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.85 }}
                          className="p-0.5 rounded opacity-0 group-hover/hl:opacity-100 hover:bg-[#EEEEEE] text-[#C0C8D4] hover:text-[#6B7C93] transition-all flex-shrink-0 self-start">
                          <Copy className="w-2.5 h-2.5" />
                        </motion.button>
                      </div>
                    ))
                  ) : null}
                </motion.div>
              )}

              {/* ── Branches view ── */}
              {effectiveView === 'branches' && (
                <motion.div key="branches" initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -3 }} transition={{ duration: 0.15 }}
                  className="mt-1.5 space-y-1" onClick={(e) => e.stopPropagation()}>
                  {isBranch && (
                    <div className="flex items-center gap-2">
                      <div className="flex-shrink-0 flex items-stretch">
                        <div className="rounded-full" style={{ backgroundColor: familyColor || '#7C6CD4', width: 3, minHeight: 16 }} />
                      </div>
                      <span className="text-[10px] text-[#9CA7B8]">↳ branched from</span>
                      <button className="text-[10px] text-[#4A5568] font-semibold hover:text-[#4A7AE5] transition-colors cursor-pointer" onClick={(e) => e.stopPropagation()}>
                        {chat.parentTitle}
                      </button>
                    </div>
                  )}
                  {children.length > 0 && (
                    children.map((child) => (
                      <div key={child.id} className="flex items-center gap-2">
                        <div className="flex-shrink-0 flex items-stretch">
                          <div className="rounded-full" style={{ backgroundColor: familyColor || '#7C6CD4', width: 3, minHeight: 16 }} />
                        </div>
                        <GitBranch className="w-2.5 h-2.5 text-[#7C6CD4]" />
                        <button className="text-[11px] text-[#4A5568] font-semibold hover:text-[#4A7AE5] transition-colors cursor-pointer" onClick={(e) => e.stopPropagation()}>
                          {child.title}
                        </button>
                        <span className="text-[10px] text-[#C0C8D4]">{formatRelative(child.lastEdited)}</span>
                      </div>
                    ))
                  )}
                  {!isBranch && children.length === 0 && null}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Topics — stacked */}
          <div className="w-36 flex-shrink-0 px-2 flex flex-col items-center justify-center gap-1 pt-0.5">
            {chat.tags && chat.tags.map(tag => (
              <span key={tag} className="text-[9px] font-semibold px-2 py-0.5 rounded-full truncate max-w-full text-center"
                style={{ backgroundColor: `${TAG_COLORS[tag] || '#6B7C93'}11`, color: TAG_COLORS[tag] || '#6B7C93' }}>{tag}</span>
            ))}
          </div>

          {/* Edited */}
          <div className="w-24 flex-shrink-0 px-2 text-center pt-0.5">
            <span className="text-xs text-[#C0C8D4]">{formatRelative(chat.lastEdited)}</span>
          </div>

          {/* Created */}
          <div className="w-24 flex-shrink-0 px-2 text-center pt-0.5">
            <span className="text-xs text-[#C0C8D4]">{formatShortDate(chat.created)}</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  MAIN COMPONENT                                              */
/* ═══════════════════════════════════════════════════════════ */

export default function ChatSelectorV6() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [sortField, setSortField] = useState('lastEdited');
  const [sortDir, setSortDir] = useState('desc');
  const [favorites, setFavorites] = useState(MOCK_FAVORITES);
  const [favSidebarOpen, setFavSidebarOpen] = useState(true);
  const [chats, setChats] = useState(MOCK_CHATS);
  const [globalView, setGlobalView] = useState('summary');
  const [rowOverrides, setRowOverrides] = useState({});

  const familyColorMap = useMemo(() => buildFamilyColorMap(chats), [chats]);

  // Count family members
  const familyCounts = useMemo(() => {
    const counts = {};
    chats.forEach(c => { if (c.familyId) counts[c.familyId] = (counts[c.familyId] || 0) + 1; });
    return counts;
  }, [chats]);

  const handleGlobalViewChange = (view) => { setGlobalView(view); setRowOverrides({}); };
  const setRowOverride = (chatId, view) => {
    setRowOverrides(prev => {
      const next = { ...prev };
      if (view === null || view === globalView) delete next[chatId];
      else next[chatId] = view;
      return next;
    });
  };

  const toggleSelected = (id) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const handleSort = (field) => { if (sortField === field) setSortDir(p => p === 'desc' ? 'asc' : 'desc'); else { setSortField(field); setSortDir('desc'); } };
  const removeFavorite = (id) => setFavorites(prev => prev.filter(f => f.id !== id));
  const handleTitleEdit = (id, t) => setChats(prev => prev.map(c => c.id === id ? { ...c, title: t } : c));
  const handleUpdateNotes = (id, notes) => setChats(prev => prev.map(c => c.id === id ? { ...c, notes } : c));

  const handleBulkPinToggle = () => {
    const anyUnpinned = [...selected].some(id => { const c = chats.find(ch => ch.id === id); return c && !c.pinned; });
    setChats(prev => prev.map(c => selected.has(c.id) ? { ...c, pinned: anyUnpinned } : c));
    setSelected(new Set());
  };
  const handleBulkDelete = () => { setChats(prev => prev.filter(c => !selected.has(c.id))); setSelected(new Set()); };
  const handleBulkRegenerate = () => { setSelected(new Set()); };

  const pinLabel = useMemo(() => {
    const anyUnpinned = [...selected].some(id => { const c = chats.find(ch => ch.id === id); return c && !c.pinned; });
    return anyUnpinned ? 'Pin' : 'Unpin';
  }, [selected, chats]);

  const selectedSizeTotal = useMemo(() => {
    let t = 0;
    selected.forEach(id => { const c = chats.find(ch => ch.id === id); if (c?.storageBytes) t += c.storageBytes; });
    return t;
  }, [selected, chats]);

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
    filtered.sort((a, b) => {
      let aV, bV;
      if (sortField === 'storageBytes') { aV = a.storageBytes || 0; bV = b.storageBytes || 0; }
      else { aV = new Date(a[sortField]).getTime(); bV = new Date(b[sortField]).getTime(); }
      return sortDir === 'desc' ? bV - aV : aV - bV;
    });
    filtered.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
    return filtered;
  }, [chats, searchQuery, sortField, sortDir]);

  // Determine which rows are de-emphasized (no content for active global view)
  const isRowDeemphasized = (chat) => {
    if (globalView === 'notes') return !chat.notes || chat.notes.length === 0;
    if (globalView === 'highlights') return !chat.highlights || chat.highlights.length === 0;
    if (globalView === 'branches') {
      const isBranch = !!chat.parentId;
      const hasChildren = chats.some(c => c.parentId === chat.id);
      return !isBranch && !hasChildren;
    }
    return false;
  };

  const allIds = useMemo(() => sortedChats.map(c => c.id), [sortedChats]);
  const allSelected = allIds.length > 0 && allIds.every(id => selected.has(id));
  const someSelected = allIds.some(id => selected.has(id));
  const toggleAll = () => { allSelected ? setSelected(new Set()) : setSelected(new Set(allIds)); };

  return (
    <div className="flex h-screen font-sans overflow-hidden" style={{ backgroundColor: '#FFFFFF', color: '#1E2532' }}>
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING_SMOOTH, delay: 0.1 }}
          className="flex items-center justify-between px-8 pt-8 pb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <motion.div animate={{ rotate: [0, -8, 8, 0] }} transition={{ duration: 0.6, delay: 0.6, ease: 'easeInOut' }}>
                <MessageSquare className="w-5 h-5 text-[#4A7AE5]" />
              </motion.div>
              <h1 className="text-lg font-semibold text-[#1E2532]">Chats</h1>
            </div>
            <ViewToggle activeView={globalView} onChangeView={handleGlobalViewChange} />
          </div>
          <div className="flex items-center gap-2">
            {!favSidebarOpen && (
              <motion.button initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setFavSidebarOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-semibold border border-[#EBEBEB] bg-white text-[#6B7C93] hover:text-[#E5A620] hover:border-[#E5A620]/40 transition-colors">
                <Star className="w-3.5 h-3.5" /><span className="text-xs">{favorites.length}</span>
              </motion.button>
            )}
            <motion.button whileHover={{ scale: 1.03, borderColor: '#4A7AE5' }} whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm border border-[#EBEBEB] bg-white text-[#1E2532] transition-colors">
              <Plus className="w-4 h-4" /> New Chat
            </motion.button>
            <motion.button whileHover={{ scale: 1.1, rotate: 45 }} whileTap={{ scale: 0.9 }}
              className="p-2.5 rounded-lg border border-[#EBEBEB] bg-white text-[#6B7C93] hover:text-[#1E2532] hover:border-[#D5D5D5] transition-colors" title="Settings & API">
              <Settings className="w-4 h-4" />
            </motion.button>
          </div>
        </motion.div>

        <StorageWarningBanner usagePercent={MOCK_STORAGE_PERCENT} />

        {/* Search */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING_SMOOTH, delay: 0.15 }} className="px-8 pb-5">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D5D5D5]" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats, notes, highlights, tags..."
              className="w-full bg-white rounded-lg pl-10 pr-4 py-2.5 text-sm text-[#1E2532] outline-none placeholder:text-[#D5D5D5] border border-[#EBEBEB] focus:border-[#4A7AE5] transition-colors" />
          </div>
        </motion.div>

        {/* Table */}
        <div className="flex-1 overflow-hidden px-8 pb-8 flex">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ ...SPRING_SMOOTH, delay: 0.2 }}
            className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <div className="border border-[#EBEBEB] rounded-xl overflow-hidden flex flex-col flex-1">
              {/* Table Header */}
              <motion.div animate={{ backgroundColor: someSelected ? '#F0F5FF' : '#FAFAFA' }} transition={{ duration: 0.2 }}
                className="flex items-center border-b border-[#EBEBEB] px-2" style={{ minHeight: 40 }}>
                <div className="w-8 flex-shrink-0 flex items-center justify-center">
                  <Checkbox checked={allSelected} indeterminate={someSelected && !allSelected} onChange={toggleAll} />
                </div>
                <AnimatePresence mode="wait">
                  {someSelected ? (
                    <motion.div key="bulk" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={SPRING_SNAPPY}
                      className="flex-1 flex items-center gap-1 px-1">
                      <span className="text-[11px] font-semibold text-[#4A7AE5]">
                        {selected.size} selected
                        {selectedSizeTotal > 0 && <span className="text-[#6B7C93] font-normal"> — {formatBytes(selectedSizeTotal)}</span>}
                      </span>
                      <div className="flex items-center gap-0.5 ml-3">
                        <InlineAction icon={Pin} label={pinLabel} onClick={handleBulkPinToggle} />
                        <InlineAction icon={RefreshCw} label="Regenerate summaries" onClick={handleBulkRegenerate} />
                        <InlineAction icon={Trash2} label="Delete" onClick={handleBulkDelete} danger />
                      </div>
                      <div className="ml-auto">
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setSelected(new Set())}
                          className="px-2.5 py-1 rounded-md text-[11px] font-semibold text-[#6B7C93] hover:text-[#1E2532] hover:bg-white/60 transition-colors">Clear</motion.button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div key="headers" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex items-center">
                      <div className="flex-1 min-w-0 px-2">
                        <span className="text-[11px] font-semibold text-[#C0C8D4] uppercase tracking-wider">Title</span>
                      </div>
                      <div className="w-36 flex-shrink-0 px-2 text-center">
                        <span className="text-[11px] font-semibold text-[#C0C8D4] uppercase tracking-wider">Topics</span>
                      </div>
                      <button onClick={() => handleSort('lastEdited')} className="w-24 flex-shrink-0 px-2 flex items-center justify-center gap-1 group cursor-pointer">
                        <span className={`text-[11px] font-semibold uppercase tracking-wider transition-colors ${sortField === 'lastEdited' ? 'text-[#4A7AE5]' : 'text-[#C0C8D4] group-hover:text-[#6B7C93]'}`}>Edited</span>
                        {sortField === 'lastEdited' && <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={SPRING_SNAPPY}>{sortDir === 'desc' ? <ArrowDown className="w-3 h-3 text-[#4A7AE5]" /> : <ArrowUp className="w-3 h-3 text-[#4A7AE5]" />}</motion.div>}
                      </button>
                      <button onClick={() => handleSort('created')} className="w-24 flex-shrink-0 px-2 flex items-center justify-center gap-1 group cursor-pointer">
                        <span className={`text-[11px] font-semibold uppercase tracking-wider transition-colors ${sortField === 'created' ? 'text-[#4A7AE5]' : 'text-[#C0C8D4] group-hover:text-[#6B7C93]'}`}>Created</span>
                        {sortField === 'created' && <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={SPRING_SNAPPY}>{sortDir === 'desc' ? <ArrowDown className="w-3 h-3 text-[#4A7AE5]" /> : <ArrowUp className="w-3 h-3 text-[#4A7AE5]" />}</motion.div>}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Table Body */}
              <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#EBEBEB transparent' }}>
                <motion.div variants={staggerContainer} initial="hidden" animate="show">
                  {sortedChats.map((chat) => (
                    <ChatTableRow key={chat.id} chat={chat}
                      globalView={globalView}
                      familyColor={chat.familyId ? familyColorMap[chat.familyId] : null}
                      familyCount={chat.familyId ? familyCounts[chat.familyId] : 0}
                      allChats={chats}
                      isDeemphasized={isRowDeemphasized(chat)}
                      rowOverride={rowOverrides[chat.id] || null}
                      onSetRowOverride={setRowOverride}
                      selected={selected} onToggleSelected={toggleSelected}
                      onTitleEdit={handleTitleEdit} onUpdateNotes={handleUpdateNotes} />
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

              {/* Footer — simplified */}
              <div className="flex items-center justify-between px-4 py-2 border-t border-[#EBEBEB] bg-[#FAFAFA]">
                <span className="text-[11px] text-[#C0C8D4]">
                  {chats.length} conversation{chats.length !== 1 ? 's' : ''}
                </span>
                <span className="text-[11px] text-[#C0C8D4]">
                  {formatBytes(chats.reduce((s, c) => s + (c.storageBytes || 0), 0))} total
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ═══ Favorites Sidebar ═══ */}
      <motion.div animate={{ width: favSidebarOpen ? 300 : 0 }} transition={SIDEBAR_RESIZE}
        className="flex-shrink-0 overflow-hidden" style={{ borderLeft: favSidebarOpen ? '1px solid #F0F0F0' : 'none' }}>
        <AnimatePresence>
          {favSidebarOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2, delay: 0.1 }} className="w-[300px] h-full flex flex-col">
              <div className="flex items-center justify-between px-4" style={{ paddingTop: '2.25rem', paddingBottom: '1rem' }}>
                <div className="flex items-center gap-2">
                  <Star className="w-3.5 h-3.5 text-[#E5A620]" style={{ fill: '#E5A620' }} />
                  <span className="text-sm font-semibold text-[#1E2532]">Favorites</span>
                  <span className="text-xs text-[#C0C8D4]">{favorites.length}</span>
                </div>
                <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }} onClick={() => setFavSidebarOpen(false)}
                  className="p-1.5 rounded hover:bg-[#EEEEEE] text-[#6B7C93] hover:text-[#1E2532] transition-colors" title="Collapse">
                  <PanelRight className="w-4 h-4" />
                </motion.button>
              </div>
              <div className="flex-1 overflow-y-auto px-3 pb-4" style={{ scrollbarWidth: 'thin', scrollbarColor: '#EBEBEB transparent' }}>
                {favorites.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full px-4">
                    <Star className="w-8 h-8 text-[#EBEBEB] mb-3" />
                    <p className="text-xs text-[#6B7C93] text-center leading-relaxed">Star messages in conversations to save them here</p>
                  </div>
                ) : (
                  <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-2">
                    {favorites.map((fav) => <FavoriteCard key={fav.id} favorite={fav} onRemove={() => removeFavorite(fav.id)} />)}
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