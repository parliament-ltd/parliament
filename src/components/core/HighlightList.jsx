import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Trash2, Pencil } from 'lucide-react'
import { SPRING_SNAPPY, HIGHLIGHT_COLORS } from '../../lib/constants'

/**
 * Renders the list of active highlights with prev/next navigation,
 * remove buttons, and an inline "Add Highlight" form.
 *
 * highlights: Array of { text, color, count, ids }
 * onNavigate(text, direction): scroll to prev/next occurrence
 * onRemove(ids): remove all highlight records for a term
 * onAdd(text, color): persist a new highlight term
 */
export default function HighlightList({
  highlights = [],
  onNavigate,
  onRemove,
  onAdd,
}) {
  const [showAddForm, setShowAddForm]     = useState(false)
  const [addText,     setAddText]         = useState('')
  const [addColor,    setAddColor]        = useState(HIGHLIGHT_COLORS[0].color)

  const handleAdd = () => {
    if (!addText.trim()) return
    onAdd?.(addText.trim(), addColor)
    setAddText('')
    setShowAddForm(false)
  }

  return (
    <div className="space-y-2">
      {highlights.map((hl) => (
        <motion.div
          key={hl.text}
          whileHover={{ x: 4 }}
          className="flex items-center gap-2 px-3 py-2 bg-white border border-[#F1F1EF] rounded-lg group/hl cursor-pointer"
        >
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, repeatDelay: 4, duration: 0.5 }}
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: hl.color }}
          />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-[var(--p-text-primary)] truncate">{hl.text}</div>
            <div className="text-xs text-[var(--p-text-secondary)]">
              {hl.count} occurrence{hl.count !== 1 ? 's' : ''}
            </div>
          </div>
          <div className="flex items-center gap-0.5 opacity-0 group-hover/hl:opacity-100 transition-opacity">
            <motion.button
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.85 }}
              onClick={(e) => { e.stopPropagation(); onNavigate?.(hl.text, 'prev') }}
              className="p-1 hover:bg-[#F1F1EF] rounded text-[var(--p-text-secondary)] hover:text-[var(--p-text-primary)] transition-colors"
              title="Previous occurrence"
            >
              <ChevronLeft className="w-3 h-3" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.85 }}
              onClick={(e) => { e.stopPropagation(); onNavigate?.(hl.text, 'next') }}
              className="p-1 hover:bg-[#F1F1EF] rounded text-[var(--p-text-secondary)] hover:text-[var(--p-text-primary)] transition-colors"
              title="Next occurrence"
            >
              <ChevronRight className="w-3 h-3" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.85 }}
              onClick={(e) => { e.stopPropagation(); onRemove?.(hl.ids) }}
              className="p-1 hover:bg-[#F1F1EF] rounded text-[var(--p-text-secondary)] hover:text-[#E03E3E] transition-colors"
              title="Remove highlight"
            >
              <Trash2 className="w-3 h-3" />
            </motion.button>
          </div>
        </motion.div>
      ))}

      {/* Add highlight toggle / form */}
      <AnimatePresence>
        {showAddForm ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={SPRING_SNAPPY}
            className="overflow-hidden"
          >
            <div className="border border-[#B8A070]/30 rounded-lg p-3 bg-white space-y-2">
              <input
                type="text"
                value={addText}
                onChange={(e) => setAddText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && addText.trim()) handleAdd()
                  if (e.key === 'Escape') { setAddText(''); setShowAddForm(false) }
                }}
                placeholder="Text to highlight..."
                className="w-full bg-white rounded px-2 py-1.5 text-xs text-[var(--p-text-primary)] outline-none border border-[#E9E9E7] focus:border-[#B8A070] transition-colors placeholder:text-[var(--p-text-muted)]"
                autoFocus
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {HIGHLIGHT_COLORS.map((c) => (
                    <motion.button
                      key={c.id}
                      whileHover={{ scale: 1.3 }}
                      whileTap={{ scale: 0.85 }}
                      onClick={() => setAddColor(c.color)}
                      className="w-5 h-5 rounded-full border-2 shadow-sm"
                      style={{
                        backgroundColor: c.color,
                        borderColor: addColor === c.color ? '#191919' : 'white',
                      }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { setAddText(''); setShowAddForm(false) }}
                    className="px-2 py-1 rounded text-[10px] font-medium text-[var(--p-text-secondary)] hover:text-[var(--p-text-primary)] hover:bg-[#F1F1EF] transition-colors"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleAdd}
                    className="px-2 py-1 rounded text-[10px] font-medium text-white bg-[#B8A070] hover:bg-[#3A6AD4] transition-colors"
                  >
                    Add
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.button
            whileHover={{ x: 4, borderColor: '#B8A070', color: '#B8A070' }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowAddForm(true)}
            className="w-full px-3 py-2 border border-dashed border-[#E9E9E7] rounded-lg text-xs text-[var(--p-text-secondary)] transition-colors flex items-center gap-1.5"
          >
            <Pencil className="w-3 h-3" />
            + Add Highlight
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
