import React, { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, Eye, MessageCircleQuestion, RefreshCw, Sparkles,
  X, Settings2, Bird, Trash2, Plus, Pencil,
} from 'lucide-react'
import { getSetting, setSetting } from '../lib/db'

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

const PERSONAS_SETTING_KEY = 'parrotPersonas'

/* ── Main Component ──────────────────────────────────────── */

/**
 * CollabModal
 *
 * Props:
 *   onClose()                      — called on Cancel or backdrop click
 *   onApply(presets, instruction)  — called only when user clicks "Apply to Conversation"
 *   activePresets  Set<string>     — currently committed presets (read-only, seeds local state)
 *   customInstruction string       — currently committed custom instruction
 */
export default function CollabModal({ onClose, onApply, activePresets, customInstruction }) {
  // Local copies — changes here don't affect the parent until Apply is clicked
  const [localPresets, setLocalPresets] = useState(() => new Set(activePresets))
  const [localCustom, setLocalCustom] = useState(customInstruction || '')

  // Parrot Personas
  const [personas, setPersonas] = useState([])
  const [personaTitle, setPersonaTitle] = useState('')
  const [savedFlash, setSavedFlash] = useState(false)
  const [editingPersonaId, setEditingPersonaId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editInstruction, setEditInstruction] = useState('')

  // Load saved personas on mount
  useEffect(() => {
    getSetting(PERSONAS_SETTING_KEY).then(raw => {
      if (raw) {
        try { setPersonas(JSON.parse(raw)) } catch {}
      }
    })
  }, [])

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

  const handleSavePersona = async () => {
    const title = personaTitle.trim()
    const instruction = localCustom.trim()
    if (!title || !instruction) return

    const id = `persona_${Date.now()}`
    const newPersona = { id, title, instruction }
    const next = [...personas, newPersona]
    setPersonas(next)
    await setSetting(PERSONAS_SETTING_KEY, JSON.stringify(next))
    setPersonaTitle('')
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 1500)
  }

  const handleDeletePersona = async (id) => {
    setLocalPresets(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    const next = personas.filter(p => p.id !== id)
    setPersonas(next)
    await setSetting(PERSONAS_SETTING_KEY, JSON.stringify(next))
  }

  const handleStartEdit = (e, persona) => {
    e.stopPropagation()
    setEditingPersonaId(persona.id)
    setEditTitle(persona.title)
    setEditInstruction(persona.instruction)
  }

  const handleSaveEdit = async (e, id) => {
    e.stopPropagation()
    const title = editTitle.trim()
    const instruction = editInstruction.trim()
    if (!title || !instruction) return
    const next = personas.map(p => p.id === id ? { ...p, title, instruction } : p)
    setPersonas(next)
    await setSetting(PERSONAS_SETTING_KEY, JSON.stringify(next))
    setEditingPersonaId(null)
  }

  const handleCancelEdit = (e) => {
    e.stopPropagation()
    setEditingPersonaId(null)
  }

  // Build the combined system prompt preview from local presets + custom instruction
  const allPresetsById = [
    ...COLLAB_PRESETS.map(p => ({ id: p.id, prompt: p.prompt })),
    ...personas.map(p => ({ id: p.id, prompt: p.instruction })),
  ]
  const activePrompts = allPresetsById
    .filter(p => localPresets.has(p.id))
    .map(p => p.prompt)
  if (localCustom.trim() && !personas.some(p => localPresets.has(p.id) && p.instruction === localCustom.trim())) {
    activePrompts.push(localCustom.trim())
  }
  const combinedPrompt = activePrompts.join('\n\n')

  const hasChanges = (
    localPresets.size !== activePresets.size ||
    [...localPresets].some(id => !activePresets.has(id)) ||
    localCustom !== (customInstruction || '')
  )

  const canSavePersona = personaTitle.trim().length > 0 && localCustom.trim().length > 0

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
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(184,160,112,0.12)' }}>
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
            className="p-2 rounded-lg text-[var(--p-text-secondary)] border border-transparent hover:border-[var(--p-text-primary)]/20 transition-colors"
          >
            <X className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ scrollbarWidth: 'thin', scrollbarColor: '#E9E9E7 transparent' }}>

          {/* Built-in Presets */}
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
                      border: isActive ? '1.5px solid #B8A070' : '1px solid var(--p-border)',
                      backgroundColor: isActive ? 'var(--p-bg-subtle)' : 'var(--p-bg-surface)',
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: isActive ? 'rgba(184,160,112,0.12)' : 'var(--p-bg-alt)' }}
                      >
                        <Icon className="w-4 h-4" style={{ color: isActive ? '#B8A070' : '#787774' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-[var(--p-text-primary)]">{preset.label}</div>
                        <p className="text-xs text-[var(--p-text-secondary)] mt-0.5 leading-relaxed">{preset.description}</p>
                      </div>
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

          {/* Parrot Personas — saved personas */}
          {personas.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Bird className="w-3.5 h-3.5 text-[#7C6CD4]" />
                Parrot Personas
              </h3>
              <div className="space-y-2">
                {personas.map((persona) => {
                  const isActive = localPresets.has(persona.id)
                  return (
                    <motion.div
                      key={persona.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={SPRING_SNAPPY}
                      className="group relative rounded-lg transition-colors"
                      style={{
                        border: isActive ? '1.5px solid #7C6CD4' : '1px solid #EBEBEB',
                        backgroundColor: isActive ? 'rgba(124,108,212,0.04)' : '#FFFFFF',
                      }}
                    >
                      {editingPersonaId === persona.id ? (
                        <div className="p-4 space-y-2" onClick={e => e.stopPropagation()}>
                          <input
                            autoFocus
                            className="w-full bg-white rounded-md px-3 py-1.5 text-sm font-semibold text-[#1E2532] outline-none border border-[#EBEBEB] focus:border-[#4A7AE5] transition-colors"
                            value={editTitle}
                            onChange={e => setEditTitle(e.target.value)}
                            placeholder="Persona title"
                          />
                          <textarea
                            className="w-full bg-white rounded-md px-3 py-1.5 text-xs text-[#6B7C93] outline-none border border-[#EBEBEB] focus:border-[#4A7AE5] transition-colors resize-none leading-relaxed"
                            rows={3}
                            value={editInstruction}
                            onChange={e => setEditInstruction(e.target.value)}
                            placeholder="Instruction"
                          />
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={handleCancelEdit}
                              className="px-3 py-1 rounded-md text-xs text-[#6B7C93] border border-[#EBEBEB] hover:bg-[#F5F5F5] transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={e => handleSaveEdit(e, persona.id)}
                              disabled={!editTitle.trim() || !editInstruction.trim()}
                              className="px-3 py-1 rounded-md text-xs font-semibold transition-colors disabled:opacity-40"
                              style={{ backgroundColor: 'rgba(124,108,212,0.1)', color: '#7C6CD4' }}
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          className="w-full text-left p-4"
                          onClick={() => toggleLocalPreset(persona.id)}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                              style={{ backgroundColor: isActive ? 'rgba(124,108,212,0.12)' : '#F5F5F5' }}
                            >
                              <Bird className="w-4 h-4" style={{ color: isActive ? '#7C6CD4' : '#6B7C93' }} />
                            </div>
                            <div className="flex-1 min-w-0 pr-6">
                              <div className="text-sm font-semibold text-[#1E2532]">{persona.title}</div>
                              <p className="text-xs text-[#6B7C93] mt-0.5 leading-relaxed line-clamp-2">
                                {persona.instruction}
                              </p>
                            </div>
                            <div
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5 transition-colors"
                              style={{ backgroundColor: isActive ? '#7C6CD4' : '#EBEBEB' }}
                            />
                          </div>
                        </button>
                      )}
                      {/* Edit + Delete buttons (shown on hover, hidden while editing) */}
                      {editingPersonaId !== persona.id && (
                        <>
                          <button
                            onClick={e => handleStartEdit(e, persona)}
                            className="absolute top-3 right-9 p-1.5 rounded-md text-[#D5D5D5] hover:text-[#B8A070] hover:bg-[#FAF7EF] opacity-0 group-hover:opacity-100 transition-all"
                            title="Edit persona"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeletePersona(persona.id) }}
                            className="absolute top-3 right-1 p-1.5 rounded-md text-[#D5D5D5] hover:text-[#EF4444] hover:bg-[#FEF2F2] opacity-0 group-hover:opacity-100 transition-all"
                            title="Delete persona"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Parrot Persona — Custom Interaction */}
          <div>
            <h3 className="text-xs font-medium text-[var(--p-text-secondary)] uppercase tracking-wider mb-3">
              Parrot Persona: Custom Interaction
            </h3>

            {/* Persona title field */}
            <input
              type="text"
              value={personaTitle}
              onChange={(e) => setPersonaTitle(e.target.value)}
              placeholder="Title"
              className="w-full bg-white rounded-lg px-4 py-2.5 text-sm text-[#1E2532] outline-none border border-[#EBEBEB] focus:border-[#7C6CD4] transition-colors placeholder:text-[var(--p-text-muted)] mb-2"
            />

            <textarea
              value={localCustom}
              onChange={(e) => setLocalCustom(e.target.value)}
              placeholder="Add your own instruction for Claude in this conversation..."
              className="w-full bg-white rounded-lg px-4 py-3 text-sm text-[var(--p-text-primary)] resize-none outline-none border border-[#E9E9E7] focus:border-[#B8A070] transition-colors placeholder:text-[var(--p-text-muted)]"
              rows={3}
            />

            {/* Save Persona button */}
            <div className="flex items-center justify-between mt-2">
              <p className="text-[11px] text-[var(--p-text-muted)]">
                Add a title above to save as a reusable Parrot Persona.
              </p>
              <AnimatePresence mode="wait">
                {savedFlash ? (
                  <motion.span
                    key="saved"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={SPRING_SNAPPY}
                    className="text-[11px] font-semibold text-[#22C55E]"
                  >
                    Saved!
                  </motion.span>
                ) : (
                  <motion.button
                    key="save-btn"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleSavePersona}
                    disabled={!canSavePersona}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors"
                    style={{
                      borderColor: canSavePersona ? '#7C6CD4' : '#EBEBEB',
                      color: canSavePersona ? '#7C6CD4' : 'var(--p-text-muted)',
                      backgroundColor: canSavePersona ? 'rgba(124,108,212,0.06)' : 'transparent',
                    }}
                  >
                    Save Persona
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Combined prompt preview */}
          {combinedPrompt && (
            <div>
              <h3 className="text-xs font-medium text-[var(--p-text-secondary)] uppercase tracking-wider mb-3">
                Combined System Prompt
              </h3>
              <div className="px-4 py-3 bg-[var(--p-bg-subtle)] border border-[var(--p-border)] rounded-lg">
                <p className="text-xs text-[var(--p-text-primary)] leading-relaxed whitespace-pre-wrap">
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
