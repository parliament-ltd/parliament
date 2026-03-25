import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, Eye, MessageCircleQuestion, RefreshCw, Sparkles,
  X, Settings2,
} from 'lucide-react'

/* ── Animation Constants ─────────────────────────────────── */

const SPRING_SNAPPY = { type: 'spring', stiffness: 500, damping: 30 }

/* ── Preset Definitions ──────────────────────────────────── */

const COLLAB_PRESETS = [
  {
    id: 'challenge',
    icon: Shield,
    label: 'Challenge Artifacts',
    description: 'Claude will self-critique outputs, flag assumptions, and identify gaps before presenting final results.',
    prompt: 'Before presenting any artifact or substantial output, critically evaluate it first. Identify assumptions, potential gaps, and weaknesses. Present your self-critique alongside the output.',
  },
  {
    id: 'reasoning',
    icon: Eye,
    label: 'Show Reasoning',
    description: 'Claude walks through its thinking process before giving answers, making logic transparent.',
    prompt: 'Walk me through your reasoning before giving me the answer. Show your thought process step by step.',
  },
  {
    id: 'pushback',
    icon: MessageCircleQuestion,
    label: 'Push Back on Me',
    description: 'Claude will flag questionable assumptions and challenge your direction when it spots potential issues.',
    prompt: "Push back if my assumptions are wrong. Don't just agree with me — tell me when you think I'm heading in the wrong direction.",
  },
  {
    id: 'alternatives',
    icon: RefreshCw,
    label: 'Offer Alternatives',
    description: 'Claude provides multiple approaches or options rather than a single answer, expanding your view.',
    prompt: "When answering, provide alternative approaches or perspectives. Don't just give one answer — show me the landscape of options.",
  },
  {
    id: 'uncertainty',
    icon: Sparkles,
    label: 'Flag Uncertainty',
    description: "Claude explicitly calls out what it's confident about versus what it's unsure of.",
    prompt: "Tell me what you're uncertain about. Distinguish between what you're confident in and where you're making educated guesses.",
  },
]

/* ── Main Component ──────────────────────────────────────── */

/**
 * CollabModal
 *
 * Props:
 *   onClose()                      — called on Cancel or backdrop click
 *   onApply(presets, instruction)  — called only when user clicks "Apply to Conversation"
 *   activePresets  Set<string>     — currently committed presets (read-only, seeds local state)
 *   customInstruction string       — currently committed custom instruction
 *
 * Presets are kept in LOCAL state inside the modal and are only committed to the
 * parent (via onApply) when the user explicitly clicks "Apply to Conversation".
 * Clicking Cancel or the X icon discards all pending changes — the badge in the
 * Actions panel therefore only reflects what has actually been applied.
 */
export default function CollabModal({ onClose, onApply, activePresets, customInstruction }) {
  // Local copies — changes here don't affect the parent until Apply is clicked
  const [localPresets, setLocalPresets] = useState(() => new Set(activePresets))
  const [localCustom, setLocalCustom] = useState(customInstruction || '')

  const toggleLocalPreset = useCallback((id) => {
    setLocalPresets(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const handleApply = () => {
    onApply?.(localPresets, localCustom)
    onClose()
  }

  // Build the combined system prompt preview from local presets + custom instruction
  const activePrompts = COLLAB_PRESETS
    .filter(p => localPresets.has(p.id))
    .map(p => p.prompt)
  if (localCustom.trim()) activePrompts.push(localCustom.trim())
  const combinedPrompt = activePrompts.join('\n\n')

  const hasChanges = (
    localPresets.size !== activePresets.size ||
    [...localPresets].some(id => !activePresets.has(id)) ||
    localCustom !== (customInstruction || '')
  )

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
    >
      <div className="absolute inset-0" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={SPRING_SNAPPY}
        className="relative z-10 bg-white border border-[#E9E9E7] rounded-xl w-full max-w-xl max-h-[85vh] flex flex-col"
        style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-4" style={{ borderBottom: '1px solid #F1F1EF' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(74,122,229,0.1)' }}>
              <Settings2 className="w-4 h-4 text-[#B8A070]" />
            </div>
            <div>
              <div className="text-sm font-medium text-[var(--p-text-primary)]">Collaboration Mode</div>
              <p className="text-[11px] text-[var(--p-text-secondary)] mt-0.5">
                Shape how Claude responds in this conversation
              </p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="p-2 rounded-lg text-[var(--p-text-secondary)] hover:bg-[#F1F1EF] transition-colors"
          >
            <X className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ scrollbarWidth: 'thin', scrollbarColor: '#E9E9E7 transparent' }}>

          {/* Presets */}
          <div>
            <h3 className="text-xs font-medium text-[var(--p-text-secondary)] uppercase tracking-wider mb-3">
              Presets {localPresets.size > 0 && (
                <span className="text-[#B8A070] normal-case tracking-normal">({localPresets.size} selected)</span>
              )}
            </h3>
            <div className="space-y-2">
              {COLLAB_PRESETS.map((preset) => {
                const Icon = preset.icon
                const isActive = localPresets.has(preset.id)
                return (
                  <motion.button
                    key={preset.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => toggleLocalPreset(preset.id)}
                    className="w-full text-left rounded-lg p-4 transition-colors"
                    style={{
                      border: isActive ? '1.5px solid #B8A070' : '1px solid #E9E9E7',
                      backgroundColor: isActive ? 'rgba(74,122,229,0.04)' : '#FFFFFF',
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: isActive ? 'rgba(74,122,229,0.1)' : '#F7F6F3' }}
                      >
                        <Icon className="w-4 h-4" style={{ color: isActive ? '#B8A070' : '#787774' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-[var(--p-text-primary)]">{preset.label}</div>
                        <p className="text-xs text-[var(--p-text-secondary)] mt-0.5 leading-relaxed">{preset.description}</p>
                      </div>
                      {/* Active indicator dot */}
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5 transition-colors"
                        style={{ backgroundColor: isActive ? '#B8A070' : '#E9E9E7' }}
                      />
                    </div>
                  </motion.button>
                )
              })}
            </div>
          </div>

          {/* Custom instruction */}
          <div>
            <h3 className="text-xs font-medium text-[var(--p-text-secondary)] uppercase tracking-wider mb-3">
              Custom Instruction
            </h3>
            <textarea
              value={localCustom}
              onChange={(e) => setLocalCustom(e.target.value)}
              placeholder="Add your own instruction for Claude in this conversation..."
              className="w-full bg-white rounded-lg px-4 py-3 text-sm text-[var(--p-text-primary)] resize-none outline-none border border-[#E9E9E7] focus:border-[#B8A070] transition-colors placeholder:text-[var(--p-text-muted)]"
              rows={3}
            />
          </div>

          {/* Combined prompt preview */}
          {combinedPrompt && (
            <div>
              <h3 className="text-xs font-medium text-[var(--p-text-secondary)] uppercase tracking-wider mb-3">
                Combined System Prompt
              </h3>
              <div className="px-4 py-3 bg-[#F7F6F3] border border-[#F1F1EF] rounded-lg">
                <p className="text-xs text-[#37352F] leading-relaxed whitespace-pre-wrap">
                  {combinedPrompt}
                </p>
              </div>
              <p className="text-[10px] text-[var(--p-text-muted)] mt-1.5">
                This will be prepended to every message sent to Claude in this conversation.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 pt-4" style={{ borderTop: '1px solid #F1F1EF' }}>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-[var(--p-text-secondary)] hover:text-[var(--p-text-primary)] transition-colors"
          >
            Cancel
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleApply}
            className="px-5 py-2 rounded-lg text-xs font-medium text-white transition-opacity"
            style={{
              backgroundColor: '#191919',
              opacity: hasChanges ? 1 : 0.5,
            }}
          >
            Apply to Conversation
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export { COLLAB_PRESETS }
