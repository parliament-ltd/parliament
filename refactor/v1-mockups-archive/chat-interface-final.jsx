import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Bookmark, GitBranch, Trash2, ChevronLeft, ChevronRight, MessageSquare, FileText, MoreVertical, StickyNote, Activity, Zap, AlertCircle, CheckCircle, Copy, ArrowRightCircle, BookOpen, Star, Info, X, Settings2, Shield, MessageCircleQuestion, RefreshCw, Sparkles, Eye, ToggleLeft, ToggleRight, PanelRight } from 'lucide-react';

const SPRING_SNAPPY = { type: 'spring', stiffness: 500, damping: 30 };
const SPRING_SMOOTH = { type: 'spring', stiffness: 300, damping: 28 };
const SPRING_GENTLE = { type: 'spring', stiffness: 200, damping: 24 };
const staggerContainer = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } } };
const staggerItem = { hidden: { opacity: 0, x: -12 }, show: { opacity: 1, x: 0, transition: SPRING_SMOOTH } };
const interactiveHover = { x: 4 };
const interactiveTap = { scale: 0.98 };
const SIDEBAR_RESIZE = { type: 'spring', stiffness: 150, damping: 25 };
const messageVariants = { hidden: { opacity: 0, y: 20, scale: 0.97 }, show: (i) => ({ opacity: 1, y: 0, scale: 1, transition: { ...SPRING_GENTLE, delay: i * 0.08 } }) };

const COLLAB_PRESETS = [
  { id: 'challenge', icon: Shield, label: 'Challenge Artifacts', description: 'Claude will self-critique outputs, flag assumptions, and identify gaps before presenting final results.', prompt: 'Before presenting any artifact or substantial output, critically evaluate it first. Identify assumptions, potential gaps, and weaknesses. Present your self-critique alongside the output.' },
  { id: 'reasoning', icon: Eye, label: 'Show Reasoning', description: 'Claude walks through its thinking process before giving answers, making logic transparent.', prompt: 'Walk me through your reasoning before giving me the answer. Show your thought process step by step.' },
  { id: 'pushback', icon: MessageCircleQuestion, label: 'Push Back on Me', description: 'Claude will flag questionable assumptions and challenge your direction when it spots potential issues.', prompt: "Push back if my assumptions are wrong. Don't just agree with me — tell me when you think I'm heading in the wrong direction." },
  { id: 'alternatives', icon: RefreshCw, label: 'Offer Alternatives', description: 'Claude provides multiple approaches or options rather than a single answer, expanding your view.', prompt: "When answering, provide alternative approaches or perspectives. Don't just give one answer — show me the landscape of options." },
  { id: 'uncertainty', icon: Sparkles, label: 'Flag Uncertainty', description: "Claude explicitly calls out what it's confident about versus what it's unsure of.", prompt: "Tell me what you're uncertain about. Distinguish between what you're confident in and where you're making educated guesses." },
];

const COLLAB_ACTIVITIES = [
  { id: 'iterate', label: 'Iteration', description: 'Refined responses through follow-ups', color: '#4A7AE5' },
  { id: 'evaluate', label: 'Evaluation', description: 'Questioned or verified outputs', color: '#7C6CD4' },
  { id: 'context', label: 'Context Set', description: 'Defined goals or constraints', color: '#22C55E' },
  { id: 'collab', label: 'Collab Mode', description: 'Collaboration presets active', color: '#E5A620' },
];

export default function EnhancedChatInterface() {
  const [contextUsage] = useState(65);
  const [showNotes, setShowNotes] = useState(new Set());
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showCollabModal, setShowCollabModal] = useState(false);
  const [favorites, setFavorites] = useState(new Set());
  const [activeHighlights] = useState([{ id: 1, text: 'API integration', color: '#E5A620' }, { id: 2, text: 'context window', color: '#22C55E' }]);
  const [activePresets, setActivePresets] = useState(new Set(['challenge']));
  const [activeActivities] = useState(new Set(['iterate', 'context', 'collab']));

  const getContextColor = (u) => u < 50 ? '#22C55E' : u < 80 ? '#E5A620' : '#EF4444';
  const togglePreset = (id) => setActivePresets(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleNote = (id) => setShowNotes(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleFav = (id) => setFavorites(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div className="flex h-screen text-[#1E2532] font-sans overflow-hidden relative" style={{ backgroundColor: '#FFFFFF' }}>
      {/* Left Sidebar */}
      <motion.div initial={{ x: -288 }} animate={{ x: 0 }} transition={SPRING_SMOOTH} className="w-72 flex flex-col" style={{ backgroundColor: '#FFFFFF', borderRight: '1px solid #F0F0F0' }}>
        <div className="p-4">
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING_SMOOTH, delay: 0.2 }} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <motion.div animate={{ rotate: [0, -8, 8, 0] }} transition={{ duration: 0.6, delay: 0.6, ease: 'easeInOut' }}><MessageSquare className="w-5 h-5 text-[#4A7AE5] cursor-pointer" /></motion.div>
            </div>
            <div className="flex items-center gap-1">
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="text-[#6B7C93] hover:text-[#1E2532] transition-colors p-1.5 rounded hover:bg-[#EEEEEE]" title="Undo (Ctrl+Z)"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg></motion.button>
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="text-[#6B7C93] hover:text-[#1E2532] transition-colors p-1.5 rounded hover:bg-[#EEEEEE]" title="Redo (Ctrl+Y)"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" /></svg></motion.button>
            </div>
          </motion.div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-1 mb-6">
            <h3 className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider mb-2">Contents</h3>
            <NavItem active>Introduction</NavItem><NavItem>Getting Started</NavItem><NavItem>Core Concepts</NavItem><NavItem indent>API Integration</NavItem><NavItem indent>Context Management</NavItem><NavItem>Advanced Topics</NavItem><NavItem indent>Customization Options</NavItem><NavItem indent>Performance</NavItem><NavItem>Best Practices</NavItem><NavItem>Conclusion</NavItem>
          </motion.div>
          <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-1">
            <h3 className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider mb-2">Quick Actions</h3>
            <ActionButton icon={Settings2} onClick={() => setShowCollabModal(true)} badge={activePresets.size > 0 ? activePresets.size : null}>Collaboration Mode</ActionButton>
            <ActionButton icon={BookOpen} onClick={() => setShowReviewModal(true)}>Review</ActionButton>
            <ActionButton icon={GitBranch}>Branch Conversation</ActionButton>
            <ActionButton icon={FileText}>Export to Markdown</ActionButton>
            <ActionButton icon={Activity}>Compress Context</ActionButton>
            <ActionButton icon={Zap}>Keyboard Shortcuts</ActionButton>
          </motion.div>
        </div>
      </motion.div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <MessageCard type="user" content="How difficult would it be to create a UI for Claude that allows for better management of chats?" number={1} index={0} onDelete={() => {}} onBranch={() => {}} onNote={() => toggleNote(1)} onFavorite={() => toggleFav(1)} isFavorited={favorites.has(1)} showNotes={showNotes.has(1)} />
          <MessageCard type="assistant" content="Creating a custom UI for Claude via the API is actually quite straightforward. You could build features like a sidebar with searchable table of contents, collapsible sections, tag/folder systems, split-pane views, and custom search functionality." number={2} index={1} onDelete={() => {}} onBranch={() => {}} onNote={() => toggleNote(2)} onFavorite={() => toggleFav(2)} isFavorited={favorites.has(2)} showNotes={showNotes.has(2)} highlights={['API', 'searchable table of contents']} />

          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ ...SPRING_GENTLE, delay: 0.3 }} className="flex items-center justify-center py-2">
            <motion.button whileHover={{ scale: 1.04, borderColor: '#4A7AE5' }} whileTap={{ scale: 0.97 }} className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-[#EBEBEB] cursor-pointer transition-colors">
              <Eye className="w-3.5 h-3.5 text-[#6B7C93]" /><span className="text-xs text-[#6B7C93]">2 messages hidden</span>
            </motion.button>
          </motion.div>

          <MessageCard type="user" content="I'm more curious if this UI would be helpful to the general public." number={5} index={2} onDelete={() => {}} onBranch={() => {}} onNote={() => toggleNote(5)} onFavorite={() => toggleFav(5)} isFavorited={favorites.has(5)} showNotes={showNotes.has(5)} hasBranch />
          <MessageCard type="assistant" content="Great strategic thinking! Based on usage patterns, the primary pain points are organization & navigation, context management, and workflow issues. A UI focusing on these areas could serve power users, professionals, and cost-conscious users effectively." number={6} index={3} onDelete={() => {}} onBranch={() => {}} onNote={() => toggleNote(6)} onFavorite={() => toggleFav(6)} isFavorited={favorites.has(6)} showNotes={showNotes.has(6)} highlights={['context management', 'power users']} />
        </div>

        <div className="relative p-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING_SMOOTH, delay: 0.4 }} className="flex items-stretch gap-3">
            <textarea placeholder="Ask a follow-up question..." className="flex-1 bg-white rounded-lg px-4 py-3 text-sm text-[#1E2532] resize-none outline-none placeholder:text-[#D5D5D5] border border-[#EBEBEB] focus:border-[#4A7AE5] transition-colors" rows={3} />
            <motion.button whileHover={{ scale: 1.03, borderColor: '#4A7AE5' }} whileTap={{ scale: 0.97 }} className="px-6 rounded-lg font-semibold text-sm border border-[#EBEBEB] bg-white text-[#1E2532] transition-colors">Send</motion.button>
          </motion.div>
        </div>
      </div>

      {/* Right Sidebar */}
      <motion.div animate={{ width: rightSidebarCollapsed ? 48 : 320 }} transition={SIDEBAR_RESIZE} className="flex flex-col relative overflow-hidden" style={{ flexShrink: 0, backgroundColor: '#FFFFFF', borderLeft: '1px solid #F0F0F0' }}>
        <AnimatePresence mode="wait">
          {rightSidebarCollapsed ? (
            <motion.button key="expand" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={SPRING_SNAPPY} onClick={() => setRightSidebarCollapsed(false)} className="p-3 hover:bg-[#EEEEEE] transition-colors mt-10" style={{ color: getContextColor(contextUsage) }} title="Expand sidebar"><PanelRight className="w-5 h-5" /></motion.button>
          ) : (
            <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, delay: 0.1 }} className="flex flex-col flex-1 pt-10">
              <div className="p-4" style={{ borderBottom: '1px solid #F0F0F0' }}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider">Highlights</h3>
                  <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }} onClick={() => setRightSidebarCollapsed(true)} className="p-1 rounded hover:bg-[#EEEEEE] transition-colors" style={{ color: getContextColor(contextUsage) }} title="Collapse sidebar"><PanelRight className="w-5 h-5" /></motion.button>
                </div>
                <p className="text-xs text-[#6B7C93] mb-4">Navigate through highlighted terms</p>
                <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-2">
                  {activeHighlights.map((h) => <HighlightItem key={h.id} text={h.text} color={h.color} count={3} onDelete={() => {}} />)}
                  <motion.button variants={staggerItem} whileHover={{ ...interactiveHover, borderColor: '#4A7AE5', color: '#4A7AE5' }} whileTap={interactiveTap} className="w-full px-3 py-2 border border-dashed border-[#EBEBEB] rounded-lg text-xs text-[#6B7C93] transition-colors">+ Add Highlight</motion.button>
                </motion.div>
              </div>
              <div className="p-4" style={{ borderBottom: '1px solid #F0F0F0' }}>
                <h3 className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider mb-3">Context Health</h3>
                <div className="space-y-3"><MetricRow label="Total Tokens" value="32,450 / 50,000" /></div>
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING_GENTLE, delay: 0.5 }} className="mt-4 p-3 bg-white rounded-lg border border-[#EBEBEB]">
                  <div className="flex items-start gap-2">
                    <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, repeatDelay: 3, duration: 0.6 }}><Activity className="w-4 h-4 text-[#E5A620] mt-0.5" /></motion.div>
                    <div><div className="text-xs font-semibold text-[#E5A620]">Approaching Limit</div><div className="text-xs text-[#6B7C93] mt-1">Consider compressing the conversation or starting a new thread.</div></div>
                  </div>
                </motion.div>
              </div>
              <div className="flex-1 p-4">
                <h3 className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider mb-3">Branches</h3>
                <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-2">
                  <BranchItem label="Main Thread" active messages={23} /><BranchItem label="Alt: Product Focus" messages={8} /><BranchItem label="Alt: Technical Deep Dive" messages={15} />
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>{showReviewModal && <ReviewModal onClose={() => setShowReviewModal(false)} highlights={activeHighlights} favorites={favorites} collabActivities={COLLAB_ACTIVITIES} activeCollabActivities={activeActivities} />}</AnimatePresence>
      <AnimatePresence>{showCollabModal && <CollaborationModal onClose={() => setShowCollabModal(false)} presets={COLLAB_PRESETS} activePresets={activePresets} onTogglePreset={togglePreset} />}</AnimatePresence>

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Inter:wght@400;600;700&display=swap');
        * { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
        code, pre { font-family: 'Space Mono', monospace; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: #FFFFFF; }
        ::-webkit-scrollbar-thumb { background: #D5D5D5; border-radius: 2px; }
        ::-webkit-scrollbar-thumb:hover { background: #D5D5D5; }
      `}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */

function CollaborationModal({ onClose, presets, activePresets, onTogglePreset }) {
  const [customPrompt, setCustomPrompt] = useState('');
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="absolute inset-0 z-50 flex items-center justify-center p-6" style={{ backgroundColor: 'rgba(144, 200, 233, 0.15)' }}>
      <div className="absolute inset-0" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={SPRING_SMOOTH} className="relative z-10 border border-[#EBEBEB] rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl shadow-black/10 text-[#1E2532]" style={{ backgroundColor: '#FFFFFF' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EBEBEB]">
          <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-[#4A7AE5]/10 flex items-center justify-center"><Settings2 className="w-4 h-4 text-[#4A7AE5]" /></div><div><h2 className="text-sm font-semibold text-[#1E2532]">Collaboration Mode</h2><p className="text-xs text-[#6B7C93]">Set the terms of how Claude works with you</p></div></div>
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onClose} className="p-2 rounded-lg hover:bg-[#EEEEEE] text-[#6B7C93] hover:text-[#1E2532] transition-colors"><X className="w-4 h-4" /></motion.button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div className="flex items-center gap-2"><div className="flex gap-1">{presets.map(p => <div key={p.id} className="w-2 h-2 rounded-full transition-colors duration-200" style={{ backgroundColor: activePresets.has(p.id) ? '#4A7AE5' : '#C8D1DC' }} />)}</div><span className="text-[10px] text-[#6B7C93]">{activePresets.size} of {presets.length} modes active</span></div>
          <div className="space-y-2">{presets.map((preset) => { const Icon = preset.icon; const isActive = activePresets.has(preset.id); return (
            <motion.div key={preset.id} whileHover={{ x: 2 }} onClick={() => onTogglePreset(preset.id)} className={`p-4 rounded-xl border cursor-pointer transition-colors ${isActive ? 'bg-[#4A7AE5]/8 border-[#4A7AE5]/30' : 'bg-white border-[#EBEBEB] hover:border-[#D5D5D5]'}`}>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: isActive ? 'rgba(74, 122, 229, 0.12)' : 'rgba(209, 217, 224, 0.5)' }}><Icon className="w-4 h-4" style={{ color: isActive ? '#4A7AE5' : '#6B7C93' }} /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1"><span className={`text-xs font-semibold ${isActive ? 'text-[#1E2532]' : 'text-[#4A5568]'}`}>{preset.label}</span><motion.div animate={{ scale: isActive ? 1 : 0.9 }} transition={SPRING_SNAPPY}>{isActive ? <ToggleRight className="w-5 h-5 text-[#22C55E]" /> : <ToggleLeft className="w-5 h-5 text-[#C8D1DC]" />}</motion.div></div>
                  <p className="text-[11px] text-[#6B7C93] leading-relaxed">{preset.description}</p>
                  <AnimatePresence>{isActive && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={SPRING_SNAPPY} className="overflow-hidden"><div className="mt-2 px-3 py-2 bg-[#F5F5F5] rounded-lg border border-[#EBEBEB]"><span className="text-[10px] text-[#4A5568] font-mono leading-relaxed">{preset.prompt}</span></div></motion.div>}</AnimatePresence>
                </div>
              </div>
            </motion.div>); })}</div>
          <div><h3 className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider mb-3">Custom instruction</h3><textarea value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)} placeholder="Add your own collaboration instruction..." className="w-full bg-white border border-[#EBEBEB] rounded-lg px-4 py-3 text-xs text-[#1E2532] resize-none focus:outline-none focus:border-[#4A7AE5] transition-colors placeholder:text-[#D5D5D5]" rows={3} /></div>
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#EBEBEB]">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-semibold text-[#6B7C93] hover:text-[#1E2532] hover:bg-[#EEEEEE] transition-colors">Cancel</motion.button>
          <motion.button whileHover={{ scale: 1.02, opacity: 0.9 }} whileTap={{ scale: 0.98 }} onClick={onClose} className="px-5 py-2 rounded-lg text-xs font-semibold text-white" style={{ backgroundColor: '#1E2532' }}>Apply to Conversation</motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════ */

function NavItem({ children, active = false, indent = false }) {
  return (<motion.button variants={staggerItem} whileHover={interactiveHover} whileTap={interactiveTap} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${indent ? 'pl-8' : ''} ${active ? 'text-[#1E2532] font-semibold' : 'text-[#6B7C93] hover:text-[#1E2532]'}`}><span className="truncate">{children}</span></motion.button>);
}

function ActionButton({ icon: Icon, children, onClick, badge = null }) {
  return (<motion.button variants={staggerItem} whileHover={interactiveHover} whileTap={interactiveTap} onClick={onClick} className="w-full text-left px-3 py-2 rounded-lg text-sm text-[#4A5568] hover:bg-white hover:text-[#4A7AE5] transition-colors flex items-center gap-2"><Icon className="w-4 h-4 flex-shrink-0" /><span className="truncate flex-1">{children}</span>{badge !== null && <span className="w-4 h-4 rounded-full bg-[#4A7AE5]/15 text-[#4A7AE5] text-[10px] font-bold flex items-center justify-center flex-shrink-0">{badge}</span>}</motion.button>);
}

function MessageCard({ type, content, number, index = 0, onDelete, onBranch, onNote, onFavorite, isFavorited = false, showNotes, highlights = [], hasBranch = false }) {
  const [noteText, setNoteText] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  return (
    <motion.div custom={index} variants={messageVariants} initial="hidden" animate="show" layout="position" className={`relative group ${type === 'user' ? 'ml-12' : 'mr-12'}`}>
      <AnimatePresence>{hasBranch && <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="absolute -left-8 top-0 bottom-0 flex items-center"><div className="flex items-center gap-1 text-[#7C6CD4]"><GitBranch className="w-4 h-4" /><div className="h-px w-4 bg-[#7C6CD4]" /></div></motion.div>}</AnimatePresence>
      <motion.div whileHover={{ borderColor: '#E0E0E0' }} transition={{ duration: 0.2 }} className="rounded-xl border transition-colors border-[#EBEBEB]" style={{ backgroundColor: '#FFFFFF' }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #F0F0F0' }}>
          <div className="flex items-center gap-3"><span className="text-xs font-mono text-[#D5D5D5] opacity-0 group-hover:opacity-100 transition-opacity">#{number}</span></div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <IconButton onClick={onFavorite} active={isFavorited} title="Favorite"><Star className="w-3.5 h-3.5" style={isFavorited ? { fill: '#E5A620', color: '#E5A620' } : {}} /></IconButton>
            <IconButton onClick={onNote} active={showNotes} title="Add note"><StickyNote className="w-3.5 h-3.5" /></IconButton>
            <IconButton onClick={onBranch} title="Branch from here"><GitBranch className="w-3.5 h-3.5" /></IconButton>
            <IconButton onClick={onDelete} title="Delete message"><Trash2 className="w-3.5 h-3.5" /></IconButton>
            <div className="relative">
              <IconButton onClick={() => setShowMenu(!showMenu)} title="More options"><MoreVertical className="w-3.5 h-3.5" /></IconButton>
              <AnimatePresence>{showMenu && <motion.div initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -4 }} transition={{ duration: 0.12 }} className="absolute right-0 top-8 w-44 border border-[#EBEBEB] rounded-lg shadow-xl z-30 overflow-hidden" style={{ backgroundColor: '#FFFFFF' }}>
                <button onClick={() => setShowMenu(false)} className="w-full text-left px-3 py-2 text-xs text-[#4A5568] hover:bg-[#EEEEEE] hover:text-[#1E2532] transition-colors flex items-center gap-2"><Eye className="w-3.5 h-3.5" />Hide message</button>
                <button onClick={() => setShowMenu(false)} className="w-full text-left px-3 py-2 text-xs text-[#4A5568] hover:bg-[#EEEEEE] hover:text-[#1E2532] transition-colors flex items-center gap-2"><ArrowRightCircle className="w-3.5 h-3.5" />Move to branch</button>
                <button onClick={() => setShowMenu(false)} className="w-full text-left px-3 py-2 text-xs text-[#4A5568] hover:bg-[#EEEEEE] hover:text-[#1E2532] transition-colors flex items-center gap-2"><Copy className="w-3.5 h-3.5" />Duplicate</button>
                <button onClick={() => setShowMenu(false)} className="w-full text-left px-3 py-2 text-xs text-[#4A5568] hover:bg-[#EEEEEE] hover:text-[#1E2532] transition-colors flex items-center gap-2"><FileText className="w-3.5 h-3.5" />Copy text</button>
              </motion.div>}</AnimatePresence>
            </div>
          </div>
        </div>
        <div className="px-4 py-4 overflow-hidden">
          <motion.p initial={{ y: '100%' }} animate={{ y: 0 }} transition={{ ...SPRING_GENTLE, delay: index * 0.08 + 0.15 }} className="text-sm leading-relaxed text-[#1E2532]">
            {content.split(' ').map((word, i) => { const isH = highlights.some((h) => word.toLowerCase().includes(h.toLowerCase())); return isH ? <motion.mark key={i} initial={{ backgroundColor: 'rgba(229,166,32,0)' }} animate={{ backgroundColor: 'rgba(229,166,32,0.2)' }} transition={{ duration: 0.4, delay: index * 0.08 + 0.3 + i * 0.02 }} className="text-[#1E2532] px-1 rounded">{word}{' '}</motion.mark> : <span key={i}>{word} </span>; })}
          </motion.p>
        </div>
        <AnimatePresence>{showNotes && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={SPRING_SNAPPY} className="overflow-hidden"><div className="px-4 pb-4 pt-0"><div className="border border-[#EBEBEB] rounded-lg p-3" style={{ backgroundColor: '#FEFCE8' }}><div className="flex items-center gap-2 mb-2"><StickyNote className="w-3.5 h-3.5 text-[#E5A620]" /><span className="text-xs font-semibold text-[#E5A620]">Note</span></div><textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add a note about this message..." className="w-full bg-transparent text-xs text-[#4A5568] resize-none focus:outline-none placeholder:text-[#D5D5D5]" rows={2} /></div></div></motion.div>}</AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

function IconButton({ onClick, children, active = false, title }) {
  return (<motion.button onClick={onClick} title={title} whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.85 }} className={`p-1.5 rounded transition-colors ${active ? 'bg-[#4A7AE5]/15 text-[#4A7AE5]' : 'hover:bg-[#EEEEEE] text-[#6B7C93] hover:text-[#1E2532]'}`}>{children}</motion.button>);
}

function HighlightItem({ text, color, count, onDelete }) {
  return (<motion.div variants={staggerItem} whileHover={interactiveHover} className="flex items-center gap-2 px-3 py-2 bg-white border border-[#F0F0F0] rounded-lg group cursor-pointer"><motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, repeatDelay: 4, duration: 0.5 }} className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} /><div className="flex-1 min-w-0"><div className="text-xs font-semibold text-[#1E2532] truncate">{text}</div><div className="text-xs text-[#6B7C93]">{count} occurrences</div></div><div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button className="p-1 hover:bg-[#EEEEEE] rounded text-[#6B7C93] hover:text-[#1E2532]"><ChevronLeft className="w-3 h-3" /></button><button className="p-1 hover:bg-[#EEEEEE] rounded text-[#6B7C93] hover:text-[#1E2532]"><ChevronRight className="w-3 h-3" /></button><button onClick={onDelete} className="p-1 hover:bg-[#EEEEEE] rounded text-[#6B7C93] hover:text-[#EF4444]"><Trash2 className="w-3 h-3" /></button></div></motion.div>);
}

function MetricRow({ label, value }) {
  const getColor = () => { if (label === 'Total Tokens') { const c = parseInt(value.split('/')[0].replace(/,/g, '')); const t = parseInt(value.split('/')[1].replace(/,/g, '')); const p = (c / t) * 100; return p < 50 ? '#22C55E' : p < 80 ? '#E5A620' : '#EF4444'; } return '#1E2532'; };
  return (<motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={SPRING_SMOOTH} className="flex items-center justify-between text-xs"><span className="text-[#6B7C93]">{label}</span><span className="font-semibold" style={{ color: getColor() }}>{value}</span></motion.div>);
}

function BranchItem({ label, messages, active = false }) {
  return (<motion.button variants={staggerItem} whileHover={interactiveHover} whileTap={interactiveTap} className={`w-full text-left px-3 py-2 rounded-lg transition-all ${active ? 'bg-white border border-[#4A7AE5] shadow-sm' : 'bg-white border border-[#F0F0F0] hover:border-[#D5D5D5]'}`}><div className="flex items-center gap-2"><GitBranch className={`w-3.5 h-3.5 ${active ? 'text-[#4A7AE5]' : 'text-[#6B7C93]'}`} /><div className="flex-1 min-w-0"><div className="text-xs font-semibold text-[#1E2532] truncate">{label}</div><div className="text-xs text-[#6B7C93]">{messages} messages</div></div></div></motion.button>);
}

/* ═══════════════════════════════════════════════════════════ */

function ReviewModal({ onClose, highlights, favorites, collabActivities = [], activeCollabActivities = new Set() }) {
  const [selectedBranches, setSelectedBranches] = useState(new Set(['main']));
  const [summaryDepth, setSummaryDepth] = useState('brief');
  const [reflectionNote, setReflectionNote] = useState('');
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);
  const branches = [{ id: 'main', label: 'Main Thread', messages: 23 }, { id: 'product', label: 'Alt: Product Focus', messages: 8 }, { id: 'technical', label: 'Alt: Technical Deep Dive', messages: 15 }];
  const toggleBranch = (id) => setSelectedBranches((prev) => { const n = new Set(prev); if (n.has(id)) { if (n.size > 1) n.delete(id); } else n.add(id); return n; });
  const mockNotes = [{ message: 2, text: 'Key insight about API flexibility' }, { message: 6, text: 'Good framework for thinking about user segments' }];
  const mockPrompts = ['You highlighted several references to context management — what\'s your main takeaway on handling it?', 'Your notes suggest interest in both power users and general public — who would you prioritize first?', 'How might the API integration approach change if targeting non-technical users?'];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="absolute inset-0 z-50 flex items-center justify-center p-6" style={{ backgroundColor: 'rgba(108, 155, 255, 0.08)' }}>
      <div className="absolute inset-0" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={SPRING_SMOOTH} className="relative z-10 border border-[#EBEBEB] rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl shadow-black/10 text-[#1E2532]" style={{ backgroundColor: '#FFFFFF' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EBEBEB]">
          <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-[#4A7AE5]/10 flex items-center justify-center"><BookOpen className="w-4 h-4 text-[#4A7AE5]" /></div><div><h2 className="text-sm font-semibold text-[#1E2532]">Review</h2><p className="text-xs text-[#6B7C93]">Reflect on your conversation</p></div></div>
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onClose} className="p-2 rounded-lg hover:bg-[#EEEEEE] text-[#6B7C93] hover:text-[#1E2532] transition-colors"><X className="w-4 h-4" /></motion.button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <div><h3 className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider mb-3">Branches to review</h3><div className="flex flex-wrap gap-2">{branches.map((b) => { const s = selectedBranches.has(b.id); return <motion.button key={b.id} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => toggleBranch(b.id)} className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors flex items-center gap-2 ${s ? 'bg-[#4A7AE5]/10 border-[#4A7AE5] text-[#4A7AE5]' : 'bg-white border-[#EBEBEB] text-[#6B7C93] hover:border-[#D5D5D5]'}`}><GitBranch className="w-3 h-3" />{b.label}<span className={`text-[10px] ${s ? 'text-[#4A7AE5]/60' : 'text-[#6B7C93]/60'}`}>{b.messages}</span></motion.button>; })}</div></div>
          <div><div className="flex items-center gap-2 mb-3"><h3 className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider">Summary depth</h3><div className="relative" onMouseEnter={() => setShowInfoTooltip(true)} onMouseLeave={() => setShowInfoTooltip(false)}><Info className="w-3.5 h-3.5 text-[#6B7C93] cursor-help" /><AnimatePresence>{showInfoTooltip && <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.15 }} className="absolute left-1/2 -translate-x-1/2 top-6 w-52 px-3 py-2 bg-white border border-[#EBEBEB] rounded-lg shadow-lg z-10"><p className="text-[10px] text-[#6B7C93] leading-relaxed">Detailed summaries analyze full conversation content and use more tokens. Brief summaries focus on your highlights and notes only.</p></motion.div>}</AnimatePresence></div></div><div className="flex gap-1 bg-white border border-[#EBEBEB] rounded-lg p-1 w-fit">{['brief', 'detailed'].map((d) => <motion.button key={d} whileTap={{ scale: 0.97 }} onClick={() => setSummaryDepth(d)} className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors capitalize ${summaryDepth === d ? 'bg-[#EEEEEE] text-[#1E2532]' : 'text-[#6B7C93] hover:text-[#1E2532]'}`}>{d}</motion.button>)}</div></div>
          <div><h3 className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider mb-3">Highlights ({highlights.length})</h3><div className="space-y-2">{highlights.map((h) => <div key={h.id} className="flex items-center gap-2 px-3 py-2 bg-white border border-[#EBEBEB] rounded-lg"><div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: h.color }} /><span className="text-xs text-[#1E2532]">{h.text}</span></div>)}</div></div>
          <div><h3 className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider mb-3">Notes ({mockNotes.length})</h3><div className="space-y-2">{mockNotes.map((n, i) => <div key={i} className="flex items-start gap-2 px-3 py-2 bg-white border border-[#EBEBEB] rounded-lg"><StickyNote className="w-3.5 h-3.5 text-[#E5A620] mt-0.5 flex-shrink-0" /><div><span className="text-[10px] text-[#6B7C93]">Message #{n.message}</span><p className="text-xs text-[#1E2532] mt-0.5">{n.text}</p></div></div>)}</div></div>
          <div><h3 className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider mb-3">Session Stats</h3><div className="grid grid-cols-3 gap-2"><div className="px-3 py-2.5 bg-white border border-[#EBEBEB] rounded-lg"><div className="text-[10px] text-[#6B7C93]">Tokens Used</div><div className="text-sm font-semibold text-[#1E2532] mt-0.5">32,450</div></div><div className="px-3 py-2.5 bg-white border border-[#EBEBEB] rounded-lg"><div className="text-[10px] text-[#6B7C93]">Messages</div><div className="text-sm font-semibold text-[#1E2532] mt-0.5">23</div></div><div className="px-3 py-2.5 bg-white border border-[#EBEBEB] rounded-lg"><div className="text-[10px] text-[#6B7C93]">Session Cost</div><div className="text-sm font-semibold text-[#1E2532] mt-0.5">$0.47</div></div></div></div>
          <div><h3 className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider mb-3">Synthesis</h3><div className="px-4 py-3 bg-[#4A7AE5]/5 border border-[#4A7AE5]/15 rounded-lg"><p className="text-xs text-[#1E2532] leading-relaxed">Your conversation explored building a custom chat interface for Claude, focusing on context management and navigation improvements. You've been particularly interested in how these features serve different user segments — from power users who need granular control to casual users who benefit from simpler organization.</p></div></div>
          <div><h3 className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider mb-3">Collaboration Activity</h3><div className="space-y-2">{collabActivities.map((a) => { const act = activeCollabActivities.has(a.id); return <div key={a.id} className={`flex items-center gap-2 px-3 py-2 bg-white border border-[#EBEBEB] rounded-lg transition-opacity ${act ? 'opacity-100' : 'opacity-40'}`}><div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: act ? a.color : '#C8D1DC', boxShadow: act ? `0 0 6px ${a.color}40` : 'none' }} /><div className="flex-1 min-w-0"><div className="text-xs font-semibold text-[#1E2532]">{a.label}</div><div className="text-xs text-[#6B7C93]">{a.description}</div></div></div>; })}</div></div>
          <div><h3 className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider mb-3">Prompts for reflection</h3><div className="space-y-2">{mockPrompts.map((p, i) => <motion.div key={i} whileHover={interactiveHover} className="px-3 py-2.5 bg-white border border-[#EBEBEB] rounded-lg cursor-pointer hover:border-[#4A7AE5]/40 transition-colors"><p className="text-xs text-[#4A5568] leading-relaxed">{p}</p></motion.div>)}</div></div>
          <div><h3 className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider mb-3">Your reflection</h3><textarea value={reflectionNote} onChange={(e) => setReflectionNote(e.target.value)} placeholder="What are your key takeaways from this conversation?" className="w-full bg-white border border-[#EBEBEB] rounded-lg px-4 py-3 text-sm text-[#1E2532] resize-none focus:outline-none focus:border-[#4A7AE5] transition-colors placeholder:text-[#D5D5D5]" rows={4} /></div>
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#EBEBEB]">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-semibold text-[#6B7C93] hover:text-[#1E2532] hover:bg-[#EEEEEE] transition-colors">Dismiss</motion.button>
          <motion.button whileHover={{ scale: 1.02, opacity: 0.9 }} whileTap={{ scale: 0.98 }} className="px-5 py-2 bg-gradient-to-r from-[#4A7AE5] to-[#7C6CD4] rounded-lg text-xs font-semibold text-white">Save as Markdown</motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
