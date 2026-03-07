import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, Eye, MessageCircleQuestion, RefreshCw, Sparkles,
  X, Settings2, Plus, Trash2,
} from 'lucide-react'

/* ── Animation Constants ─────────────────────────────────── */

const SPRING_SNAPPY = { type: 'spring', stiffness: 500, damping: 30 }
const SPRING_SMOOTH = { type: 'spring', stiffness: 300, damping: 28 }

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

export default function CollabModal({ onClose, activePresets, onTogglePreset, customInstruction, onCustomInstructionChange }) {
  const [localCustom, setLocalCustom] = useState(customInstruction || '')

  const handleApply = () => {
    onCustomInstructionChange?.(localCustom)
    onClose()
  }

  // Build the combined system prompt preview from active presets + custom instruction
  const activePrompts = COLLAB_PRESETS
    .filter(p => activePresets.has(p.id))
    .map(p => p.prompt)
  if (localCustom.trim()) activePrompts.push(localCustom.trim())
  const combinedPrompt = activePrompts.join('\n\n')

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
        className="relative z-10 bg-white border border-[#EBEBEB] rounded-xl w-full max-w-xl max-h-[85vh] flex flex-col"
        style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-4" style={{ borderBottom: '1px solid #F0F0F0' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(74,122,229,0.1)' }}>
              <Settings2 className="w-4 h-4 text-[#4A7AE5]" />
            </div>
            <div>
              <div className="text-sm font-semibold text-[#1E2532]">Collaboration Mode</div>
              <p className="text-[11px] text-[#6B7C93] mt-0.5">
                Shape how Claude responds in this conversation
              </p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="p-2 rounded-lg text-[#6B7C93] hover:bg-[#EEEEEE] transition-colors"
          >
            <X className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ scrollbarWidth: 'thin', scrollbarColor: '#EBEBEB transparent' }}>

          {/* Presets */}
          <div>
            <h3 className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider mb-3">
              Presets {activePresets.size > 0 && (
                <span className="text-[#4A7AE5] normal-case tracking-normal">({activePresets.size} active)</span>
              )}
            </h3>
            <div className="space-y-2">
              {COLLAB_PRESETS.map((preset) => {
                const Icon = preset.icon
                const isActive = activePresets.has(preset.id)
                return (
                  <motion.button
                    key={preset.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onTogglePreset(preset.id)}
                    className="w-full text-left rounded-lg p-4 transition-colors"
                    style={{
                      border: isActive ? '1.5px solid #4A7AE5' : '1px solid #EBEBEB',
                      backgroundColor: isActive ? 'rgba(74,122,229,0.04)' : '#FFFFFF',
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{
                          backgroundColor: isActive ? 'rgba(74,122,229,0.1)' : '#F5F5F5',
                        }}
                      >
                        <Icon className="w-4 h-4" style={{ color: isActive ? '#4A7AE5' : '#6B7C93' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-[#1E2532]">{preset.label}</div>
                        <p className="text-xs text-[#6B7C93] mt-0.5 leading-relaxed">{preset.description}</p>
                      </div>
                      {/* Active indicator dot */}
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5 transition-colors"
                        style={{
                          backgroundColor: isActive ? '#4A7AE5' : '#EBEBEB',
                        }}
                      />
                    </div>
                  </motion.button>
                )
              })}
            </div>
          </div>

          {/* Custom instruction */}
          <div>
            <h3 className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider mb-3">
              Custom Instruction
            </h3>
            <textarea
              value={localCustom}
              onChange={(e) => setLocalCustom(e.target.value)}
              placeholder="Add your own instruction for Claude in this conversation..."
              className="w-full bg-white rounded-lg px-4 py-3 text-sm text-[#1E2532] resize-none outline-none border border-[#EBEBEB] focus:border-[#4A7AE5] transition-colors placeholder:text-[#D5D5D5]"
              rows={3}
            />
          </div>

          {/* Combined prompt preview */}
          {combinedPrompt && (
            <div>
              <h3 className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider mb-3">
                Combined System Prompt
              </h3>
              <div className="px-4 py-3 bg-[#FAFAFA] border border-[#F0F0F0] rounded-lg">
                <p className="text-xs text-[#4A5568] leading-relaxed whitespace-pre-wrap">
                  {combinedPrompt}
                </p>
              </div>
              <p className="text-[10px] text-[#D5D5D5] mt-1.5">
                This will be prepended to every message sent to Claude in this conversation.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 pt-4" style={{ borderTop: '1px solid #F0F0F0' }}>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-[#6B7C93] hover:text-[#1E2532] transition-colors"
          >
            Cancel
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleApply}
            className="px-5 py-2 rounded-lg text-xs font-semibold text-white"
            style={{ backgroundColor: '#1E2532' }}
          >
            Apply to Conversation
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export { COLLAB_PRESETS }