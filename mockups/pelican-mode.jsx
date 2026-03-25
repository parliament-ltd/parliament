import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3, Table2, PieChart, TrendingUp, FileSpreadsheet, Upload, X, ChevronDown, ChevronUp,
  Filter, Search, Download, Maximize2, Minimize2, MessageSquare,
  Send, Eye, Hash, Type, Calendar, Plus,
  Sparkles, ChevronRight, Layers, AreaChart, ScatterChart, Activity,
  Trash2, Wand2, LineChart, PanelRight, ChevronLeft, Database,
  ArrowUpDown, MoreHorizontal, AlertCircle, CheckCircle, FileText, Settings2,
  ArrowUpRight, Link2, Unlink, Zap
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════ */
/*  ANIMATION CONSTANTS — Apollo Design System                  */
/* ═══════════════════════════════════════════════════════════ */

const SPRING_SNAPPY = { type: 'spring', stiffness: 500, damping: 30 };
const SPRING_SMOOTH = { type: 'spring', stiffness: 300, damping: 28 };
const SPRING_GENTLE = { type: 'spring', stiffness: 200, damping: 24 };
const SIDEBAR_RESIZE = { type: 'spring', stiffness: 150, damping: 25 };
const staggerContainer = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.08 } } };
const staggerItem = { hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0, transition: SPRING_SMOOTH } };

/* ═══════════════════════════════════════════════════════════ */
/*  MOCK DATA                                                    */
/* ═══════════════════════════════════════════════════════════ */

const MOCK_FILES = [
  { id: 'f1', name: 'Q3_revenue.csv', rows: 2847, cols: 12, size: '1.2 MB', type: 'csv', inContext: true },
  { id: 'f2', name: 'customer_segments.xlsx', rows: 15230, cols: 8, size: '3.8 MB', type: 'xlsx', inContext: false },
  { id: 'f3', name: 'campaign_results.csv', rows: 892, cols: 15, size: '420 KB', type: 'csv', inContext: true },
];

const MOCK_COLUMNS = [
  { name: 'date', type: 'date', icon: Calendar, nulls: 0, unique: 365, sample: '2025-07-01' },
  { name: 'region', type: 'string', icon: Type, nulls: 0, unique: 5, sample: 'West' },
  { name: 'product_line', type: 'string', icon: Type, nulls: 12, unique: 8, sample: 'Enterprise' },
  { name: 'revenue', type: 'number', icon: Hash, nulls: 0, unique: 2831, sample: '284,500' },
  { name: 'units_sold', type: 'number', icon: Hash, nulls: 3, unique: 1204, sample: '12' },
  { name: 'cost', type: 'number', icon: Hash, nulls: 0, unique: 2650, sample: '142,250' },
  { name: 'margin_pct', type: 'number', icon: Hash, nulls: 0, unique: 847, sample: '50.0' },
  { name: 'channel', type: 'string', icon: Type, nulls: 0, unique: 4, sample: 'Direct' },
  { name: 'rep_id', type: 'string', icon: Type, nulls: 45, unique: 128, sample: 'R-0042' },
  { name: 'deal_size', type: 'string', icon: Type, nulls: 0, unique: 3, sample: 'Large' },
  { name: 'close_date', type: 'date', icon: Calendar, nulls: 18, unique: 312, sample: '2025-08-15' },
  { name: 'is_renewal', type: 'boolean', icon: Activity, nulls: 0, unique: 2, sample: 'true' },
];

const MOCK_TABLE_DATA = [
  { date: '2025-07-01', region: 'West', product_line: 'Enterprise', revenue: 284500, units_sold: 12, cost: 142250, margin_pct: 50.0, channel: 'Direct' },
  { date: '2025-07-01', region: 'East', product_line: 'Pro', revenue: 156200, units_sold: 48, cost: 93720, margin_pct: 40.0, channel: 'Partner' },
  { date: '2025-07-02', region: 'West', product_line: 'Starter', revenue: 42800, units_sold: 107, cost: 29960, margin_pct: 30.0, channel: 'Online' },
  { date: '2025-07-02', region: 'Central', product_line: 'Enterprise', revenue: 312000, units_sold: 8, cost: 149760, margin_pct: 52.0, channel: 'Direct' },
  { date: '2025-07-03', region: 'South', product_line: 'Pro', revenue: 198400, units_sold: 62, cost: 119040, margin_pct: 40.0, channel: 'Direct' },
  { date: '2025-07-03', region: 'East', product_line: 'Enterprise', revenue: 425000, units_sold: 15, cost: 191250, margin_pct: 55.0, channel: 'Partner' },
  { date: '2025-07-04', region: 'West', product_line: 'Starter', revenue: 38200, units_sold: 95, cost: 28650, margin_pct: 25.0, channel: 'Online' },
  { date: '2025-07-04', region: 'Central', product_line: 'Pro', revenue: 167800, units_sold: 53, cost: 100680, margin_pct: 40.0, channel: 'Partner' },
  { date: '2025-07-05', region: 'South', product_line: 'Enterprise', revenue: 380000, units_sold: 10, cost: 171000, margin_pct: 55.0, channel: 'Direct' },
  { date: '2025-07-05', region: 'East', product_line: 'Starter', revenue: 51200, units_sold: 128, cost: 33280, margin_pct: 35.0, channel: 'Online' },
];

const CHART_TYPES = [
  { id: 'bar', icon: BarChart3, label: 'Bar' },
  { id: 'line', icon: LineChart, label: 'Line' },
  { id: 'area', icon: AreaChart, label: 'Area' },
  { id: 'scatter', icon: ScatterChart, label: 'Scatter' },
  { id: 'pie', icon: PieChart, label: 'Pie' },
];

const REGION_COLORS = { West: '#B8A070', East: '#0F7B6C', Central: '#D9730D', South: '#7C6CD4', North: '#EC4899' };

/* Refinement #2: canvasAction on assistant messages */
const MOCK_CHAT = [
  { id: 1, role: 'user', content: 'Load Q3_revenue.csv and show me revenue by region' },
  { id: 2, role: 'assistant', content: 'Loaded Q3_revenue.csv — 2,847 rows, 12 columns. Here\'s revenue by region as a bar chart. The West region leads at $1.42M, followed by East at $1.18M.', canvasAction: 'Bar chart created' },
  { id: 3, role: 'user', content: 'Add product line as a color breakdown' },
  { id: 4, role: 'assistant', content: 'Updated with product line segments. Enterprise dominates West (68%). I notice South has an unusually high margin (55%) — want to investigate?', canvasAction: 'Chart updated' },
];

const SUMMARY_STATS = [
  { label: 'Total Revenue', value: '$2.05M', change: '+12.4%', positive: true },
  { label: 'Avg Margin', value: '42.3%', change: '+2.1pp', positive: true },
  { label: 'Total Units', value: '538', change: '-8.2%', positive: false },
  { label: 'Avg Deal Size', value: '$38.1K', change: '+18.7%', positive: true },
];

/* ═══════════════════════════════════════════════════════════ */
/*  MAIN COMPONENT                                              */
/* ═══════════════════════════════════════════════════════════ */

export default function PelicanMode() {
  const [hasData, setHasData] = useState(true);
  const [activeFile, setActiveFile] = useState('f1');
  const [canvasView, setCanvasView] = useState('chart');
  const [activeChart, setActiveChart] = useState('bar');
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [selectedColumn, setSelectedColumn] = useState(null);
  const [activeFilters, setActiveFilters] = useState([{ column: 'region', op: 'in', values: ['West', 'East', 'South'] }]);
  const [sortColumn, setSortColumn] = useState('revenue');
  const [sortDir, setSortDir] = useState('desc');
  const [contextFiles, setContextFiles] = useState(new Set(['f1', 'f3']));
  const [contextUsage] = useState(42);

  const activeFileData = MOCK_FILES.find(f => f.id === activeFile);
  const getContextColor = (u) => u < 50 ? '#0F7B6C' : u < 80 ? '#D9730D' : '#E03E3E';
  const sendToChat = (text) => setChatInput(text);
  const toggleContext = (fileId) => { setContextFiles(prev => { const n = new Set(prev); n.has(fileId) ? n.delete(fileId) : n.add(fileId); return n; }); };

  return (
    <div className="flex h-screen text-[#191919] font-sans overflow-hidden relative" style={{ backgroundColor: '#FFFFFF' }}>

      {/* ═══ LEFT: File Shelf Sidebar ═══ */}
      <motion.div initial={{ x: -260 }} animate={{ x: 0 }} transition={SPRING_SMOOTH} className="w-[260px] flex flex-col flex-shrink-0" style={{ backgroundColor: '#FFFFFF', borderRight: '1px solid #F1F1EF' }}>
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <motion.div animate={{ rotate: [0, -6, 6, 0] }} transition={{ duration: 0.6, delay: 0.6, ease: 'easeInOut' }}><Database className="w-5 h-5 text-[#B8A070]" /></motion.div>
            <span className="text-sm font-semibold text-[#191919]">Pelican</span>
            <span className="text-[10px] text-[#787774] bg-[#B8A070]/8 px-1.5 py-0.5 rounded font-medium">DATA</span>
          </div>
          <div className="flex items-center gap-1">
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setHasData(!hasData)} className="p-1.5 rounded hover:bg-[#EEEEEE] text-[#787774] hover:text-[#191919] transition-colors" title={hasData ? 'Preview empty state' : 'Preview loaded state'}><Eye className="w-3.5 h-3.5" /></motion.button>
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="p-1.5 rounded hover:bg-[#EEEEEE] text-[#787774] hover:text-[#191919] transition-colors"><Settings2 className="w-4 h-4" /></motion.button>
          </div>
        </div>

        <div className="px-4 pb-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-[#787774] uppercase tracking-wider">Staged Files</h3>
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="p-1 rounded hover:bg-[#EEEEEE] text-[#787774] hover:text-[#B8A070] transition-colors" title="Upload file"><Plus className="w-3.5 h-3.5" /></motion.button>
          </div>
          {hasData ? (
            <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-1.5">
              {MOCK_FILES.map((file) => (<FileCard key={file.id} file={file} active={activeFile === file.id} inContext={contextFiles.has(file.id)} onClick={() => setActiveFile(file.id)} onToggleContext={() => toggleContext(file.id)} />))}
              <DropZoneButton />
            </motion.div>
          ) : (<DropZoneButton />)}
        </div>

        {hasData && (
          <div className="px-4 py-3 border-t border-[#F1F1EF]">
            <h3 className="text-xs font-semibold text-[#787774] uppercase tracking-wider mb-3">Active Dataset</h3>
            <div className="space-y-2">
              <StatRow label="File" value={activeFileData?.name || '—'} />
              <StatRow label="Rows" value={activeFileData?.rows?.toLocaleString() || '—'} />
              <StatRow label="Columns" value={activeFileData?.cols || '—'} />
              <StatRow label="Size" value={activeFileData?.size || '—'} />
            </div>
            <div className="mt-3 pt-3 border-t border-[#F1F1EF]">
              <div className="flex items-center gap-1.5 mb-1.5"><Link2 className="w-3 h-3 text-[#B8A070]" /><span className="text-[10px] font-semibold text-[#B8A070]">{contextFiles.size} files in context</span></div>
              <p className="text-[10px] text-[#787774] leading-relaxed">Claude can reference data from all files marked with the link icon.</p>
            </div>
          </div>
        )}

        {hasData && (
          <div className="px-4 py-3 border-t border-[#F1F1EF] flex-1">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-[#787774] uppercase tracking-wider">Filters</h3>
              <span className="text-[10px] text-[#B8A070] font-semibold">{activeFilters.length} active</span>
            </div>
            <div className="space-y-2">
              {activeFilters.map((f, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 px-3 py-2 bg-[#B8A070]/5 border border-[#B8A070]/15 rounded-lg">
                  <Filter className="w-3 h-3 text-[#B8A070] flex-shrink-0" />
                  <span className="text-[11px] text-[#191919] flex-1 truncate"><span className="font-semibold">{f.column}</span> {f.op} {f.values.join(', ')}</span>
                  <motion.button whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }} className="text-[#787774] hover:text-[#E03E3E] transition-colors"><X className="w-3 h-3" /></motion.button>
                </motion.div>
              ))}
              <motion.button whileHover={{ borderColor: '#B8A070' }} className="w-full px-3 py-2 border border-dashed border-[#E9E9E7] rounded-lg text-[11px] text-[#787774] hover:text-[#B8A070] transition-colors flex items-center gap-2"><Plus className="w-3 h-3" /> Add filter</motion.button>
            </div>
          </div>
        )}

        <div className="px-4 py-3 border-t border-[#F1F1EF]">
          <div className="space-y-1">
            <QuickAction icon={Download} label="Export Results" disabled={!hasData} />
            <QuickAction icon={Sparkles} label="Auto-Analyze" accent disabled={!hasData} />
            <QuickAction icon={Wand2} label="Suggest Charts" disabled={!hasData} />
          </div>
        </div>
      </motion.div>

      {/* ═══ CENTER: Data Canvas ═══ */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#F1F1EF]">
          <div className="flex items-center gap-1">
            {[{ id: 'chart', icon: BarChart3, label: 'Chart' }, { id: 'table', icon: Table2, label: 'Table' }, { id: 'summary', icon: Layers, label: 'Summary' }].map((tab) => {
              const Icon = tab.icon; const active = canvasView === tab.id;
              return (<motion.button key={tab.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setCanvasView(tab.id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${active ? 'bg-[#B8A070]/10 text-[#B8A070]' : 'text-[#787774] hover:text-[#191919] hover:bg-[#FAFAFA]'}`}><Icon className="w-3.5 h-3.5" />{tab.label}</motion.button>);
            })}
          </div>
          <div className="flex items-center gap-2">
            <AnimatePresence>{canvasView === 'chart' && hasData && (
              <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} transition={SPRING_SNAPPY} className="flex items-center gap-0.5 px-1 py-0.5 border border-[#E9E9E7] rounded-lg overflow-hidden">
                {CHART_TYPES.map((ct) => { const Icon = ct.icon; const active = activeChart === ct.id; return (<motion.button key={ct.id} whileTap={{ scale: 0.92 }} onClick={() => setActiveChart(ct.id)} className={`p-1.5 rounded-md transition-colors ${active ? 'bg-[#B8A070]/10 text-[#B8A070]' : 'text-[#787774] hover:text-[#191919]'}`} title={ct.label}><Icon className="w-3.5 h-3.5" /></motion.button>); })}
              </motion.div>
            )}</AnimatePresence>
            {hasData && (<><div className="w-px h-5 bg-[#F1F1EF]" /><div className="flex items-center gap-2 px-2"><div className="w-20 h-2 bg-[#F1F1EF] rounded-full overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${contextUsage}%` }} transition={SPRING_GENTLE} className="h-full rounded-full" style={{ backgroundColor: getContextColor(contextUsage) }} /></div><span className="text-[10px] font-semibold" style={{ color: getContextColor(contextUsage) }}>{contextUsage}%</span></div></>)}
            <div className="w-px h-5 bg-[#F1F1EF]" />
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="p-1.5 rounded-lg text-[#787774] hover:text-[#191919] hover:bg-[#FAFAFA] transition-colors" title="Fullscreen"><Maximize2 className="w-4 h-4" /></motion.button>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="p-1.5 rounded-lg text-[#787774] hover:text-[#191919] hover:bg-[#FAFAFA] transition-colors" title="Download"><Download className="w-4 h-4" /></motion.button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {!hasData ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={SPRING_SMOOTH} className="h-full flex items-center justify-center p-8"><EmptyCanvas /></motion.div>
            ) : canvasView === 'chart' ? (
              <motion.div key="chart" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={SPRING_SMOOTH} className="h-full p-6"><ChartCanvas activeChart={activeChart} /></motion.div>
            ) : canvasView === 'table' ? (
              <motion.div key="table" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={SPRING_SMOOTH} className="h-full"><TableCanvas data={MOCK_TABLE_DATA} sortColumn={sortColumn} sortDir={sortDir} onSort={(col) => { if (sortColumn === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortColumn(col); setSortDir('desc'); } }} /></motion.div>
            ) : (
              <motion.div key="summary" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={SPRING_SMOOTH} className="h-full p-6 overflow-y-auto"><SummaryDashboard onAskAbout={sendToChat} /></motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ═══ RIGHT: Inspector + Chat (collapsible) ═══ */}
      <motion.div animate={{ width: chatCollapsed ? 48 : 380 }} transition={SIDEBAR_RESIZE} className="flex flex-col flex-shrink-0 relative overflow-hidden" style={{ backgroundColor: '#FFFFFF', borderLeft: '1px solid #F1F1EF' }}>
        <AnimatePresence mode="wait">
          {chatCollapsed ? (
            <motion.div key="collapsed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={SPRING_SNAPPY} className="flex flex-col items-center pt-4 gap-3">
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setChatCollapsed(false)} className="p-2 rounded-lg hover:bg-[#EEEEEE] text-[#B8A070] transition-colors" title="Expand panel"><PanelRight className="w-5 h-5" /></motion.button>
              <div className="w-6 h-px bg-[#F1F1EF]" />
              <div className="p-2 text-[#787774]" title="Schema"><Database className="w-4 h-4" /></div>
              <div className="p-2 text-[#787774]" title="Chat"><MessageSquare className="w-4 h-4" /></div>
            </motion.div>
          ) : (
            <motion.div key="expanded" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25, delay: 0.1 }} className="flex flex-col flex-1">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#F1F1EF]">
                <div className="flex items-center gap-2"><Database className="w-4 h-4 text-[#B8A070]" /><span className="text-xs font-semibold text-[#191919]">Inspector</span></div>
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setChatCollapsed(true)} className="p-1.5 rounded-lg hover:bg-[#EEEEEE] text-[#B8A070] transition-colors" title="Collapse panel"><PanelRight className="w-4 h-4" /></motion.button>
              </div>

              {hasData ? (
                <div className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(50vh - 48px)' }}>
                  <div className="px-4 py-3">
                    <div className="flex items-center justify-between mb-2"><h3 className="text-xs font-semibold text-[#787774] uppercase tracking-wider">Schema</h3><span className="text-[10px] text-[#787774]">{MOCK_COLUMNS.length} columns</span></div>
                    <div className="space-y-0.5">{MOCK_COLUMNS.map((col) => (<ColumnRow key={col.name} column={col} selected={selectedColumn === col.name} onClick={() => setSelectedColumn(selectedColumn === col.name ? null : col.name)} />))}</div>
                  </div>
                  <AnimatePresence>{selectedColumn && (<motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={SPRING_SNAPPY} className="overflow-hidden"><ColumnDetail column={MOCK_COLUMNS.find(c => c.name === selectedColumn)} onAction={sendToChat} /></motion.div>)}</AnimatePresence>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center px-6" style={{ maxHeight: 'calc(50vh - 48px)' }}><div className="text-center"><Database className="w-8 h-8 text-[#9B9A97] mx-auto mb-2" /><p className="text-xs text-[#787774]">Load a file to inspect its schema</p></div></div>
              )}

              <div className="flex flex-col border-t border-[#F1F1EF]" style={{ height: 'calc(50vh - 48px)' }}>
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#F1F1EF]"><MessageSquare className="w-3.5 h-3.5 text-[#B8A070]" /><span className="text-xs font-semibold text-[#191919]">Chat</span><span className="text-[10px] text-[#787774] ml-auto">{hasData ? `${MOCK_CHAT.length} messages` : 'Ready'}</span></div>
                <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
                  {hasData ? MOCK_CHAT.map((msg) => (<ChatBubble key={msg.id} message={msg} />)) : (
                    <div className="h-full flex items-center justify-center"><div className="text-center px-4"><Sparkles className="w-6 h-6 text-[#9B9A97] mx-auto mb-2" /><p className="text-[11px] text-[#787774] leading-relaxed">Drop a file to get started, or ask me to help you find and load data.</p></div></div>
                  )}
                </div>
                <div className="px-3 pb-3 pt-1">
                  <div className="flex items-end gap-2 border border-[#E9E9E7] rounded-xl px-3 py-2 focus-within:border-[#B8A070] transition-colors">
                    <textarea value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder={hasData ? 'Ask about your data...' : 'Describe what you want to analyze...'} className="flex-1 text-xs text-[#191919] resize-none outline-none placeholder:text-[#9B9A97] bg-transparent" rows={2} />
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${chatInput.trim() ? 'bg-[#B8A070] text-white' : 'bg-[#EEEEEE] text-[#9B9A97]'}`}><Send className="w-3.5 h-3.5" /></motion.button>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <ChatShortcut icon={Sparkles} label="Suggest" /><ChatShortcut icon={Wand2} label="Transform" /><ChatShortcut icon={Filter} label="Filter" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  REFINEMENT #1: EMPTY CANVAS STATE                            */
/* ═══════════════════════════════════════════════════════════ */

function EmptyCanvas() {
  return (
    <div className="text-center max-w-md">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={SPRING_GENTLE} className="w-20 h-20 rounded-2xl bg-[#B8A070]/5 border-2 border-dashed border-[#B8A070]/20 flex items-center justify-center mx-auto mb-5">
        <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}><Upload className="w-8 h-8 text-[#B8A070]/40" /></motion.div>
      </motion.div>
      <h2 className="text-lg font-semibold text-[#191919] mb-2">Drop a file to get started</h2>
      <p className="text-sm text-[#787774] leading-relaxed mb-6">Pelican supports CSV, XLSX, TSV, and JSON files. Drop one here or use the file shelf to browse.</p>
      <div className="flex items-center justify-center gap-3">
        <motion.button whileHover={{ scale: 1.03, borderColor: '#B8A070' }} whileTap={{ scale: 0.97 }} className="px-4 py-2.5 rounded-xl text-xs font-semibold border border-[#E9E9E7] bg-white text-[#191919] flex items-center gap-2 transition-colors"><Upload className="w-3.5 h-3.5" /> Browse Files</motion.button>
        <motion.button whileHover={{ scale: 1.03, opacity: 0.9 }} whileTap={{ scale: 0.97 }} className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#B8A070] text-white flex items-center gap-2"><Sparkles className="w-3.5 h-3.5" /> Try Sample Data</motion.button>
      </div>
      <div className="mt-8 grid grid-cols-3 gap-3">
        {[{ icon: BarChart3, label: 'Visualize', desc: 'Charts & graphs' }, { icon: Table2, label: 'Explore', desc: 'Sort, filter, query' }, { icon: Layers, label: 'Summarize', desc: 'AI-powered insights' }].map((item) => {
          const Icon = item.icon;
          return (<div key={item.label} className="px-3 py-3 rounded-xl bg-[#FAFAFA] border border-[#F1F1EF]"><Icon className="w-4 h-4 text-[#B8A070] mb-1.5" /><div className="text-[11px] font-semibold text-[#191919]">{item.label}</div><div className="text-[10px] text-[#787774]">{item.desc}</div></div>);
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  FILE CARD — #3: context indicator                            */
/* ═══════════════════════════════════════════════════════════ */

function FileCard({ file, active, inContext, onClick, onToggleContext }) {
  const typeColor = file.type === 'csv' ? '#0F7B6C' : '#D9730D';
  return (
    <motion.div variants={staggerItem} className={`relative rounded-xl border transition-colors ${active ? 'bg-[#B8A070]/5 border-[#B8A070]/30' : 'bg-white border-[#E9E9E7] hover:bg-[#FAFAFA]'}`}>
      <motion.button whileHover={{ x: 2 }} whileTap={{ scale: 0.98 }} onClick={onClick} className="w-full text-left px-3 py-2.5">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: active ? 'rgba(74, 122, 229, 0.1)' : '#F5F5F5' }}><FileSpreadsheet className="w-4 h-4" style={{ color: active ? '#B8A070' : '#787774' }} /></div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-[#191919] truncate">{file.name}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: `${typeColor}15`, color: typeColor }}>{file.type.toUpperCase()}</span>
              <span className="text-[10px] text-[#787774]">{file.rows.toLocaleString()} rows</span>
              <span className="text-[10px] text-[#787774]">{file.size}</span>
            </div>
          </div>
        </div>
      </motion.button>
      <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); onToggleContext(); }}
        className={`absolute top-2 right-2 p-1 rounded-md transition-colors ${inContext ? 'text-[#B8A070] bg-[#B8A070]/10 hover:bg-[#B8A070]/20' : 'text-[#9B9A97] hover:text-[#787774] hover:bg-[#F5F5F5]'}`}
        title={inContext ? 'In context — click to remove' : 'Click to add to context'}>
        {inContext ? <Link2 className="w-3 h-3" /> : <Unlink className="w-3 h-3" />}
      </motion.button>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  CHART CANVAS                                                 */
/* ═══════════════════════════════════════════════════════════ */

function ChartCanvas({ activeChart }) {
  const maxRevenue = 1420000;
  const barData = [
    { region: 'West', revenue: 1420000, enterprise: 965600, pro: 312000, starter: 142400 },
    { region: 'East', revenue: 1180000, enterprise: 637200, pro: 354000, starter: 188800 },
    { region: 'Central', revenue: 890000, enterprise: 534000, pro: 267000, starter: 89000 },
    { region: 'South', revenue: 720000, enterprise: 468000, pro: 180000, starter: 72000 },
  ];
  return (
    <div className="h-full flex flex-col">
      <div className="mb-6"><h2 className="text-base font-semibold text-[#191919]">Revenue by Region</h2><p className="text-xs text-[#787774] mt-1">Q3 2025 · Segmented by product line · Filtered to West, East, South</p></div>
      <div className="flex items-center gap-4 mb-6">
        {[{ label: 'Enterprise', color: '#B8A070' }, { label: 'Pro', color: '#7C6CD4' }, { label: 'Starter', color: '#0F7B6C' }].map((item) => (<div key={item.label} className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} /><span className="text-[11px] text-[#787774]">{item.label}</span></div>))}
      </div>
      <div className="flex-1 flex items-end gap-8 px-4 pb-8 relative">
        <div className="absolute left-0 top-0 bottom-8 flex flex-col justify-between w-14">{['$1.5M', '$1.0M', '$0.5M', '$0'].map((label, i) => (<span key={i} className="text-[10px] text-[#787774] text-right pr-2">{label}</span>))}</div>
        <div className="absolute left-14 right-0 top-0 bottom-8 flex flex-col justify-between pointer-events-none">{[0, 1, 2, 3].map((i) => <div key={i} className="h-px bg-[#F1F1EF]" />)}</div>
        <div className="flex-1 flex items-end justify-around ml-14 relative z-10">
          {barData.map((d, i) => {
            const total = d.revenue; const maxH = 280; const h = (total / maxRevenue) * maxH;
            const segments = [{ key: 'enterprise', value: d.enterprise, color: '#B8A070' }, { key: 'pro', value: d.pro, color: '#7C6CD4' }, { key: 'starter', value: d.starter, color: '#0F7B6C' }];
            return (
              <div key={d.region} className="flex flex-col items-center gap-2">
                <motion.div initial={{ height: 0 }} animate={{ height: h }} transition={{ ...SPRING_GENTLE, delay: i * 0.1 }} className="w-16 rounded-t-lg overflow-hidden flex flex-col-reverse cursor-pointer" style={{ minHeight: 4 }}>
                  {segments.map((seg) => { const segH = (seg.value / total) * h; return (<motion.div key={seg.key} initial={{ height: 0 }} animate={{ height: segH }} transition={{ ...SPRING_GENTLE, delay: i * 0.1 + 0.15 }} className="w-full hover:brightness-110 transition-all" style={{ backgroundColor: seg.color, minHeight: segH > 0 ? 2 : 0 }} title={`${seg.key}: $${(seg.value / 1000).toFixed(0)}K`} />); })}
                </motion.div>
                <span className="text-xs font-semibold text-[#191919]">{d.region}</span>
                <span className="text-[10px] text-[#787774]">${(d.revenue / 1000000).toFixed(2)}M</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  TABLE CANVAS                                                 */
/* ═══════════════════════════════════════════════════════════ */

function TableCanvas({ data, sortColumn, sortDir, onSort }) {
  const columns = ['date', 'region', 'product_line', 'revenue', 'units_sold', 'cost', 'margin_pct', 'channel'];
  const sortedData = useMemo(() => [...data].sort((a, b) => { const av = a[sortColumn], bv = b[sortColumn]; if (typeof av === 'number') return sortDir === 'asc' ? av - bv : bv - av; return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av)); }), [data, sortColumn, sortDir]);
  const formatCell = (col, val) => { if (col === 'revenue' || col === 'cost') return `$${val.toLocaleString()}`; if (col === 'margin_pct') return `${val}%`; return val; };
  return (
    <div className="h-full overflow-auto">
      <table className="w-full text-xs">
        <thead className="sticky top-0 z-10"><tr style={{ backgroundColor: '#FAFAFA' }}>{columns.map((col) => (<th key={col} onClick={() => onSort(col)} className="text-left px-4 py-3 text-[10px] font-semibold text-[#787774] uppercase tracking-wider cursor-pointer hover:text-[#191919] transition-colors border-b border-[#F1F1EF] select-none"><div className="flex items-center gap-1">{col.replace(/_/g, ' ')}{sortColumn === col && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}><ArrowUpDown className="w-3 h-3 text-[#B8A070]" /></motion.div>}</div></th>))}</tr></thead>
        <tbody>{sortedData.map((row, i) => (<motion.tr key={i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING_SMOOTH, delay: i * 0.02 }} className="hover:bg-[#FAFAFA] transition-colors cursor-pointer border-b border-[#F1F1EF]">{columns.map((col) => (<td key={col} className={`px-4 py-3 ${col === 'revenue' ? 'font-semibold text-[#191919]' : 'text-[#787774]'}`}>{col === 'region' ? (<span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: REGION_COLORS[row[col]] || '#787774' }} />{row[col]}</span>) : formatCell(col, row[col])}</td>))}</motion.tr>))}</tbody>
      </table>
      <div className="px-4 py-3 border-t border-[#F1F1EF] bg-[#FAFAFA] flex items-center justify-between sticky bottom-0">
        <span className="text-[10px] text-[#787774]">Showing {data.length} of 2,847 rows</span>
        <div className="flex items-center gap-2">
          <motion.button whileHover={{ scale: 1.02 }} className="px-3 py-1 text-[10px] font-semibold text-[#787774] border border-[#E9E9E7] rounded-md hover:border-[#B8A070] hover:text-[#B8A070] transition-colors">Load more</motion.button>
          <motion.button whileHover={{ scale: 1.02 }} className="px-3 py-1 text-[10px] font-semibold text-[#787774] border border-[#E9E9E7] rounded-md hover:border-[#B8A070] hover:text-[#B8A070] transition-colors">Load all</motion.button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  SUMMARY DASHBOARD — #6: interactive insights                 */
/* ═══════════════════════════════════════════════════════════ */

function SummaryDashboard({ onAskAbout }) {
  const insights = [
    { icon: AlertCircle, color: '#D9730D', text: 'South region has 55% margin — 13pp above average. This appears driven by Enterprise deals with lower cost-of-sale. Worth investigating if this is sustainable or reflects a small sample.', question: 'Why does the South region have such a high margin? Is it a sample size issue?' },
    { icon: TrendingUp, color: '#B8A070', text: 'Online channel shows 35% growth in unit volume but declining average deal size. The Starter product through Online is cannibalizing Pro sales in East region.', question: 'Show me the trend of Online channel deal sizes over Q3, broken down by product line' },
    { icon: CheckCircle, color: '#0F7B6C', text: 'Revenue distribution across regions is more balanced than Q2, with the West share dropping from 38% to 33% — healthy diversification trend.', question: 'Compare Q2 vs Q3 regional revenue distribution side by side' },
  ];
  return (
    <div className="space-y-6 max-w-4xl">
      <div><h3 className="text-xs font-semibold text-[#787774] uppercase tracking-wider mb-3">Key Metrics</h3>
        <div className="grid grid-cols-4 gap-3">{SUMMARY_STATS.map((stat) => (<motion.div key={stat.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={SPRING_SMOOTH} className="px-4 py-3.5 bg-white border border-[#E9E9E7] rounded-xl"><div className="text-[10px] text-[#787774] uppercase tracking-wider">{stat.label}</div><div className="text-xl font-semibold text-[#191919] mt-1">{stat.value}</div><div className={`text-[11px] font-semibold mt-1 flex items-center gap-1 ${stat.positive ? 'text-[#0F7B6C]' : 'text-[#E03E3E]'}`}><TrendingUp className={`w-3 h-3 ${!stat.positive ? 'rotate-180' : ''}`} />{stat.change} vs Q2</div></motion.div>))}</div>
      </div>
      <div><h3 className="text-xs font-semibold text-[#787774] uppercase tracking-wider mb-3">AI Insights</h3>
        <div className="space-y-2">{insights.map((insight, i) => (<motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ ...SPRING_SMOOTH, delay: i * 0.1 }} className="px-4 py-3 bg-white border border-[#E9E9E7] rounded-xl"><div className="flex items-start gap-3"><insight.icon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: insight.color }} /><div className="flex-1 min-w-0"><p className="text-xs text-[#787774] leading-relaxed">{insight.text}</p><motion.button whileHover={{ scale: 1.02, x: 2 }} whileTap={{ scale: 0.98 }} onClick={() => onAskAbout(insight.question)} className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold text-[#B8A070] hover:text-[#3A6AD5] transition-colors"><ArrowUpRight className="w-3 h-3" />Ask about this</motion.button></div></div></motion.div>))}</div>
      </div>
      <div><h3 className="text-xs font-semibold text-[#787774] uppercase tracking-wider mb-3">Distributions</h3>
        <div className="grid grid-cols-2 gap-3">
          <DistributionCard title="Revenue by Region" items={[{ label: 'West', value: 33, color: '#B8A070' }, { label: 'East', value: 28, color: '#0F7B6C' }, { label: 'Central', value: 22, color: '#D9730D' }, { label: 'South', value: 17, color: '#7C6CD4' }]} />
          <DistributionCard title="Revenue by Product Line" items={[{ label: 'Enterprise', value: 62, color: '#B8A070' }, { label: 'Pro', value: 27, color: '#7C6CD4' }, { label: 'Starter', value: 11, color: '#0F7B6C' }]} />
        </div>
      </div>
      <div><h3 className="text-xs font-semibold text-[#787774] uppercase tracking-wider mb-3">Data Quality</h3>
        <div className="px-4 py-3 bg-white border border-[#E9E9E7] rounded-xl"><div className="grid grid-cols-3 gap-4">
          <div><div className="text-[10px] text-[#787774]">Completeness</div><div className="text-sm font-semibold text-[#0F7B6C] mt-0.5">97.2%</div><div className="text-[10px] text-[#787774]">78 nulls across 12 cols</div></div>
          <div><div className="text-[10px] text-[#787774]">Duplicates</div><div className="text-sm font-semibold text-[#0F7B6C] mt-0.5">0</div><div className="text-[10px] text-[#787774]">No exact duplicates</div></div>
          <div><div className="text-[10px] text-[#787774]">Date Range</div><div className="text-sm font-semibold text-[#191919] mt-0.5">Jul 1 — Sep 30</div><div className="text-[10px] text-[#787774]">92 days, no gaps</div></div>
        </div></div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  COLUMN ROW + DETAIL — #4: actions → chat                     */
/* ═══════════════════════════════════════════════════════════ */

function ColumnRow({ column, selected, onClick }) {
  const Icon = column.icon;
  const typeColors = { number: '#B8A070', string: '#0F7B6C', date: '#D9730D', boolean: '#7C6CD4' };
  const color = typeColors[column.type] || '#787774';
  return (<motion.button whileHover={{ x: 2, backgroundColor: '#FAFAFA' }} whileTap={{ scale: 0.98 }} onClick={onClick} className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${selected ? 'bg-[#B8A070]/5' : ''}`}><Icon className="w-3 h-3 flex-shrink-0" style={{ color }} /><span className={`text-[11px] flex-1 truncate ${selected ? 'font-semibold text-[#191919]' : 'text-[#787774]'}`}>{column.name}</span><span className="text-[9px] text-[#787774] px-1.5 py-0.5 rounded bg-[#F5F5F5]">{column.type}</span>{column.nulls > 0 && <span className="text-[9px] text-[#D9730D] font-medium">{column.nulls}⌀</span>}</motion.button>);
}

function ColumnDetail({ column, onAction }) {
  if (!column) return null;
  const actions = [{ label: 'Group by', command: `Group by ${column.name}` }, { label: 'Filter', command: `Filter where ${column.name} = ` }, { label: 'Visualize', command: `Show distribution of ${column.name}` }];
  return (
    <div className="px-4 py-3 mx-4 mb-3 bg-[#B8A070]/5 border border-[#B8A070]/15 rounded-xl">
      <div className="flex items-center justify-between mb-2"><span className="text-xs font-semibold text-[#191919]">{column.name}</span><span className="text-[10px] text-[#B8A070] font-medium">{column.type}</span></div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5"><DetailRow label="Unique" value={column.unique.toLocaleString()} /><DetailRow label="Nulls" value={column.nulls} warn={column.nulls > 0} /><DetailRow label="Sample" value={column.sample} /></div>
      <div className="flex items-center gap-1.5 mt-3">{actions.map((action) => (<motion.button key={action.label} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => onAction(action.command)} className="text-[10px] font-semibold text-[#B8A070] px-2 py-1 rounded-md bg-white border border-[#B8A070]/20 hover:bg-[#B8A070]/10 transition-colors flex items-center gap-1"><ArrowUpRight className="w-2.5 h-2.5" />{action.label}</motion.button>))}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  CHAT BUBBLE — #2: canvas action indicator                    */
/* ═══════════════════════════════════════════════════════════ */

function ChatBubble({ message }) {
  const isUser = message.role === 'user';
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={SPRING_SMOOTH} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
      <div className={`max-w-[90%] px-3 py-2 rounded-xl text-[11px] leading-relaxed ${isUser ? 'bg-[#B8A070] text-white rounded-br-md' : 'bg-[#F5F5F5] text-[#191919] rounded-bl-md border border-[#E9E9E7]'}`}>{message.content}</div>
      {message.canvasAction && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ ...SPRING_SNAPPY, delay: 0.15 }} className="flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-[#0F7B6C]/10 border border-[#0F7B6C]/20 cursor-pointer hover:bg-[#0F7B6C]/15 transition-colors">
          <ArrowUpRight className="w-2.5 h-2.5 text-[#0F7B6C]" /><span className="text-[9px] font-semibold text-[#0F7B6C]">{message.canvasAction}</span>
        </motion.div>
      )}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  HELPER COMPONENTS                                            */
/* ═══════════════════════════════════════════════════════════ */

function DropZoneButton() {
  return (<motion.button variants={staggerItem} whileHover={{ borderColor: '#B8A070', color: '#B8A070' }} whileTap={{ scale: 0.98 }} className="w-full px-3 py-3 border border-dashed border-[#E9E9E7] rounded-xl text-xs text-[#787774] transition-colors flex items-center justify-center gap-2"><Upload className="w-3.5 h-3.5" />Drop files or browse</motion.button>);
}

function DistributionCard({ title, items }) {
  return (
    <div className="px-4 py-3.5 bg-white border border-[#E9E9E7] rounded-xl">
      <div className="text-[11px] font-semibold text-[#191919] mb-3">{title}</div>
      <div className="space-y-2">{items.map((item) => (<div key={item.label} className="flex items-center gap-2"><span className="text-[10px] text-[#787774]" style={{ width: items[0].label.length > 6 ? 64 : 48 }}>{item.label}</span><div className="flex-1 h-2.5 bg-[#F5F5F5] rounded-full overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${item.value}%` }} transition={{ ...SPRING_GENTLE, delay: 0.2 }} className="h-full rounded-full" style={{ backgroundColor: item.color }} /></div><span className="text-[10px] font-semibold text-[#191919] w-8 text-right">{item.value}%</span></div>))}</div>
    </div>
  );
}

function StatRow({ label, value }) { return (<div className="flex items-center justify-between"><span className="text-[11px] text-[#787774]">{label}</span><span className="text-[11px] font-semibold text-[#191919] truncate ml-2">{value}</span></div>); }
function DetailRow({ label, value, warn = false }) { return (<div className="flex items-center justify-between"><span className="text-[10px] text-[#787774]">{label}</span><span className={`text-[10px] font-semibold ${warn ? 'text-[#D9730D]' : 'text-[#191919]'}`}>{value}</span></div>); }

function QuickAction({ icon: Icon, label, accent = false, disabled = false }) {
  return (<motion.button whileHover={disabled ? {} : { x: 3 }} whileTap={disabled ? {} : { scale: 0.98 }} className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center gap-2 ${disabled ? 'text-[#9B9A97] cursor-not-allowed' : accent ? 'text-[#B8A070] hover:bg-[#B8A070]/5 font-semibold' : 'text-[#787774] hover:bg-[#FAFAFA] hover:text-[#B8A070]'}`} disabled={disabled}><Icon className="w-4 h-4 flex-shrink-0" /><span className="truncate">{label}</span></motion.button>);
}

function ChatShortcut({ icon: Icon, label }) {
  return (<motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="text-[10px] text-[#787774] hover:text-[#B8A070] transition-colors flex items-center gap-1 px-2 py-1 rounded-md hover:bg-[#FAFAFA]"><Icon className="w-3 h-3" /> {label}</motion.button>);
}
