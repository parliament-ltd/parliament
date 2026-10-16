// ColumnInspector — column-schema viewer for data-workspace rooms.
//
// PR-11a — extracted from V1 src/adapters/pelican/components/InspectorPanel.jsx.
// V1's InspectorPanel embedded a compact chat surface alongside the
// schema view. The catalog decomposition splits those: messages@1.0 +
// input@1.0 handle chat, this component owns just the column list.
// V1's per-column "Ask about this", "Group by", "Filter" actions
// expanded into the chat input via a tightly-coupled callback; they are
// not wired in PR-11a (cross-component dispatch is a Phase 2 concern
// once the bus event surface gains a typed "compose" channel beyond the
// three Phase 1 events).

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Database, Hash, Type, Calendar, Activity } from 'lucide-react'
import { useFileShelf } from '../../stores/FileShelfContext'
import { SPRING_SNAPPY } from '../../lib/constants'

const TYPE_ICONS = {
  number: Hash,
  string: Type,
  date: Calendar,
  boolean: Activity,
}

const TYPE_COLORS = {
  number: '#B8A070',
  string: '#0F7B6C',
  date: '#D9730D',
  boolean: '#787774',
}

export default function ColumnInspector() {
  const { activeFileId, files, getParsedData } = useFileShelf()
  const activeFile = files.find(f => f.id === activeFileId) || null
  const [columnStats, setColumnStats] = useState([])
  const [selectedColumn, setSelectedColumn] = useState(null)

  // Load column stats whenever the active file changes.
  useEffect(() => {
    if (!activeFileId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- data blocks are reworked in stage 13
      setColumnStats([])
      setSelectedColumn(null)
      return
    }
    let cancelled = false
    getParsedData(activeFileId).then(parsed => {
      if (cancelled) return
      setColumnStats(parsed?.columnStats || [])
      setSelectedColumn(null)
    })
    return () => { cancelled = true }
  }, [activeFileId, getParsedData])

  if (!activeFile) {
    return (
      <div className="flex items-center justify-center px-4 py-6">
        <div className="text-center">
          <Database className="w-7 h-7 text-[#9B9A97] mx-auto mb-2" />
          <p className="text-xs text-[#787774]">Load a file to inspect its schema</p>
        </div>
      </div>
    )
  }

  if (columnStats.length === 0) {
    return (
      <div className="px-4 py-3">
        <p className="text-[11px] text-[#787774] italic">Parsing schema…</p>
      </div>
    )
  }

  return (
    <div className="px-3 py-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[10px] font-medium text-[#787774] uppercase tracking-wider">Schema</h3>
        <span className="text-[10px] text-[#787774]">{columnStats.length} cols</span>
      </div>
      <div className="space-y-0.5">
        {columnStats.map(col => (
          <ColumnRow
            key={col.name}
            column={col}
            selected={selectedColumn === col.name}
            onClick={() => setSelectedColumn(prev => prev === col.name ? null : col.name)}
          />
        ))}
      </div>
      <AnimatePresence>
        {selectedColumn && (
          <ColumnDetail column={columnStats.find(c => c.name === selectedColumn)} />
        )}
      </AnimatePresence>
    </div>
  )
}

function ColumnRow({ column, selected, onClick }) {
  const Icon = TYPE_ICONS[column.type] || Type
  const color = TYPE_COLORS[column.type] || '#787774'

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

function ColumnDetail({ column }) {
  if (!column) return null
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
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          <DetailRow label="Unique" value={column.unique?.toLocaleString() ?? '-'} />
          <DetailRow label="Nulls" value={String(column.nulls ?? 0)} warn={column.nulls > 0} />
          <DetailRow label="Sample" value={column.sample ?? '-'} />
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
