import React, { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Markdown from './core/Markdown'
import {
  BookOpen, X, Info, StickyNote, Star, GitBranch,
  Zap, Eye, Loader, AlertCircle,
} from 'lucide-react'

/* ── Animation Constants ─────────────────────────────────── */

const SPRING_SNAPPY = { type: 'spring', stiffness: 500, damping: 30 }
const SPRING_SMOOTH = { type: 'spring', stiffness: 300, damping: 28 }
const interactiveHover = { x: 4 }

/* ── Main Component ──────────────────────────────────────── */

export default function ReviewModal({
  onClose,
  messages = [],
  highlights = [],
  notes = [],           // Array of { messageId, text }
  favorites = [],       // Array of message objects
  branches: _branches = [],  // Array of branch conversations; not shown yet
  tokenUsage = {},      // { input, output }
  contextUsage: _contextUsage = 0,  // not shown yet
  onGenerateSynthesis,  // async (options) => string — calls Claude
  onExportMarkdown,     // () => void — reuses existing export
}) {
  const [summaryDepth, setSummaryDepth] = useState('brief')
  const [reflectionNote, setReflectionNote] = useState('')
  const [showInfoTooltip, setShowInfoTooltip] = useState(false)

  // Category toggles — what feeds into the synthesis
  const [includeHighlights, setIncludeHighlights] = useState(true)
  const [includeNotes, setIncludeNotes] = useState(true)
  const [includeFavorites, setIncludeFavorites] = useState(true)

  // Synthesis state
  const [synthesis, setSynthesis] = useState(null)
  const [synthesisLoading, setSynthesisLoading] = useState(false)
  const [synthesisError, setSynthesisError] = useState(null)

  // Session stats
  const totalTokens = (tokenUsage.input || 0) + (tokenUsage.output || 0)
  const estimatedCost = ((tokenUsage.input || 0) * 3 / 1_000_000 + (tokenUsage.output || 0) * 15 / 1_000_000).toFixed(2)

  // Reflection prompts — generated from the conversation's annotations
  const reflectionPrompts = useMemo(() => {
    const prompts = []
    if (highlights.length > 0) {
      const terms = [...new Set(highlights.map(h => h.text))].slice(0, 3).join(', ')
      prompts.push(`You highlighted references to ${terms}. What's your main takeaway?`)
    }
    if (notes.length > 0) {
      prompts.push(`You took ${notes.length} note${notes.length !== 1 ? 's' : ''} during this conversation. What patterns do you see?`)
    }
    if (favorites.length > 0) {
      prompts.push(`You favorited ${favorites.length} message${favorites.length !== 1 ? 's' : ''}. What made them stand out?`)
    }
    if (messages.length > 10) {
      prompts.push('If you had to summarize this conversation in one sentence, what would it be?')
    }
    if (prompts.length === 0) {
      prompts.push('What are your key takeaways from this conversation?')
      prompts.push('What would you do differently next time?')
    }
    return prompts
  }, [highlights, notes, favorites, messages])

  const handleGenerateSynthesis = useCallback(async () => {
    if (!onGenerateSynthesis || synthesisLoading) return
    setSynthesisLoading(true)
    setSynthesisError(null)
    try {
      const result = await onGenerateSynthesis({
        depth: summaryDepth,
        includeHighlights,
        includeNotes,
        includeFavorites,
      })
      setSynthesis(result)
    } catch (err) {
      setSynthesisError(err.message || 'Failed to generate synthesis.')
    } finally {
      setSynthesisLoading(false)
    }
  }, [onGenerateSynthesis, summaryDepth, includeHighlights, includeNotes, includeFavorites, synthesisLoading])

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
        className="relative z-10 bg-white border border-[#E9E9E7] rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col"
        style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-4" style={{ borderBottom: '1px solid #F1F1EF' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(184,160,112,0.12)' }}>
              <BookOpen className="w-4 h-4 text-[#B8A070]" />
            </div>
            <div>
              <h2 className="text-sm font-medium text-[var(--p-text-primary)]">Review</h2>
              <p className="text-[11px] text-[var(--p-text-secondary)] mt-0.5">Reflect on your conversation</p>
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
        <div className="flex-1 overflow-y-auto p-5 space-y-6" style={{ scrollbarWidth: 'thin', scrollbarColor: '#E9E9E7 transparent' }}>

          {/* Summary Depth */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-xs font-medium text-[var(--p-text-secondary)] uppercase tracking-wider">Summary depth</h3>
              <div
                className="relative"
                onMouseEnter={() => setShowInfoTooltip(true)}
                onMouseLeave={() => setShowInfoTooltip(false)}
              >
                <Info className="w-3.5 h-3.5 text-[var(--p-text-secondary)] cursor-help" />
                <AnimatePresence>
                  {showInfoTooltip && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-1/2 -translate-x-1/2 top-6 w-52 px-3 py-2 bg-white border border-[#E9E9E7] rounded-lg shadow-lg z-10"
                    >
                      <p className="text-[10px] text-[var(--p-text-secondary)] leading-relaxed">
                        Detailed reviews analyze full conversation content and use more tokens. Brief reviews focus on your highlights and notes only.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            <div className="flex gap-1 bg-[var(--p-bg-surface)] border border-[var(--p-border)] rounded-lg p-1 w-fit">
              {['brief', 'detailed'].map((d) => (
                <motion.button
                  key={d}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSummaryDepth(d)}
                  className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors capitalize border ${
                    summaryDepth === d
                      ? 'border-[var(--p-text-primary)]/30 text-[var(--p-text-primary)]'
                      : 'border-transparent text-[var(--p-text-secondary)] hover:text-[var(--p-text-primary)] hover:border-[var(--p-text-primary)]/15'
                  }`}
                >
                  {d}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Category Toggles */}
          <div>
            <h3 className="text-xs font-medium text-[var(--p-text-secondary)] uppercase tracking-wider mb-3">
              Include in review
            </h3>
            <div className="flex flex-wrap gap-2">
              <ToggleChip
                label={`Highlights (${highlights.length})`}
                active={includeHighlights}
                onClick={() => setIncludeHighlights(prev => !prev)}
                disabled={highlights.length === 0}
              />
              <ToggleChip
                label={`Notes (${notes.length})`}
                active={includeNotes}
                onClick={() => setIncludeNotes(prev => !prev)}
                disabled={notes.length === 0}
              />
              <ToggleChip
                label={`Favorites (${favorites.length})`}
                active={includeFavorites}
                onClick={() => setIncludeFavorites(prev => !prev)}
                disabled={favorites.length === 0}
              />
            </div>
          </div>

          {/* Highlights */}
          {highlights.length > 0 && includeHighlights && (
            <div>
              <h3 className="text-xs font-medium text-[var(--p-text-secondary)] uppercase tracking-wider mb-3">
                Highlights ({highlights.length})
              </h3>
              <div className="space-y-2">
                {[...new Map(highlights.map(h => [h.text, h])).values()].map((h) => (
                  <div key={h.text} className="flex items-center gap-2 px-3 py-2 bg-white border border-[#E9E9E7] rounded-lg">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: h.color }} />
                    <span className="text-xs text-[var(--p-text-primary)]">{h.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {notes.length > 0 && includeNotes && (
            <div>
              <h3 className="text-xs font-medium text-[var(--p-text-secondary)] uppercase tracking-wider mb-3">
                Notes ({notes.length})
              </h3>
              <div className="space-y-2">
                {notes.map((n, i) => (
                  <div key={i} className="flex items-start gap-2 px-3 py-2 bg-white border border-[#E9E9E7] rounded-lg">
                    <StickyNote className="w-3.5 h-3.5 text-[#D9730D] mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-[var(--p-text-primary)]">{n.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Session Stats */}
          <div>
            <h3 className="text-xs font-medium text-[var(--p-text-secondary)] uppercase tracking-wider mb-3">
              Session Stats
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <StatCard label="Tokens Used" value={totalTokens.toLocaleString()} />
              <StatCard label="Messages" value={messages.length.toString()} />
              <StatCard label="Est. Cost" value={`$${estimatedCost}`} />
            </div>
          </div>

          {/* Synthesis */}
          <div>
            <h3 className="text-xs font-medium text-[var(--p-text-secondary)] uppercase tracking-wider mb-3">
              Synthesis
            </h3>
            {synthesis ? (
              <div className="px-4 py-3 bg-[#B8A070]/5 border border-[#B8A070]/15 rounded-lg">
                <div className="text-xs text-[var(--p-text-primary)] leading-relaxed parliament-md">
                  <Markdown>
                    {synthesis}
                  </Markdown>
                </div>
              </div>
            ) : synthesisError ? (
              <div className="px-4 py-3 bg-[#E03E3E]/5 border border-[#E03E3E]/15 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-[#E03E3E] mt-0.5 flex-shrink-0" />
                <p className="text-xs text-[#E03E3E]">{synthesisError}</p>
              </div>
            ) : (
              <motion.button
                whileHover={{ scale: 1.02, borderColor: '#B8A070' }}
                whileTap={{ scale: 0.98 }}
                onClick={handleGenerateSynthesis}
                disabled={synthesisLoading}
                className="w-full px-4 py-3 bg-white border border-[#E9E9E7] rounded-lg text-xs font-medium text-[#B8A070] transition-colors flex items-center justify-center gap-2"
              >
                {synthesisLoading ? (
                  <>
                    <Loader className="w-3.5 h-3.5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    Generate Synthesis with Claude
                  </>
                )}
              </motion.button>
            )}
          </div>

          {/* Reflection Prompts */}
          <div>
            <h3 className="text-xs font-medium text-[var(--p-text-secondary)] uppercase tracking-wider mb-3">
              Prompts for reflection
            </h3>
            <div className="space-y-2">
              {reflectionPrompts.map((prompt, i) => (
                <motion.div
                  key={i}
                  whileHover={interactiveHover}
                  className="px-3 py-2.5 bg-[var(--p-bg-surface)] border border-[var(--p-border)] rounded-lg cursor-pointer hover:border-[#B8A070]/40 transition-colors"
                >
                  <p className="text-xs text-[var(--p-text-primary)] leading-relaxed">{prompt}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Reflection Note */}
          <div>
            <h3 className="text-xs font-medium text-[var(--p-text-secondary)] uppercase tracking-wider mb-3">
              Your reflection
            </h3>
            <textarea
              value={reflectionNote}
              onChange={(e) => setReflectionNote(e.target.value)}
              placeholder="What are your key takeaways from this conversation?"
              className="w-full bg-white border border-[#E9E9E7] rounded-lg px-4 py-3 text-sm text-[var(--p-text-primary)] resize-none focus:outline-none focus:border-[#B8A070] transition-colors placeholder:text-[var(--p-text-muted)]"
              rows={4}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 pt-4" style={{ borderTop: '1px solid #F1F1EF' }}>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-[var(--p-text-secondary)] hover:text-[var(--p-text-primary)] border border-transparent hover:border-[var(--p-text-primary)]/20 transition-colors"
          >
            Dismiss
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02, opacity: 0.9 }}
            whileTap={{ scale: 0.98 }}
            onClick={onExportMarkdown}
            className="px-5 py-2 rounded-lg text-xs font-medium text-white"
            style={{ backgroundColor: '#191919' }}
          >
            Save as Markdown
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ── Sub-components ──────────────────────────────────────── */

function ToggleChip({ label, active, onClick, disabled }) {
  return (
    <motion.button
      whileTap={disabled ? {} : { scale: 0.97 }}
      onClick={disabled ? undefined : onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
        disabled
          ? 'border-[#F1F1EF] text-[var(--p-text-muted)] cursor-not-allowed'
          : active
            ? 'bg-[#B8A070]/10 border-[#B8A070] text-[#B8A070]'
            : 'bg-white border-[#E9E9E7] text-[var(--p-text-secondary)] hover:border-[#9B9A97]'
      }`}
    >
      {label}
    </motion.button>
  )
}

function StatCard({ label, value }) {
  return (
    <div className="px-3 py-2.5 bg-white border border-[#E9E9E7] rounded-lg">
      <div className="text-[10px] text-[var(--p-text-secondary)]">{label}</div>
      <div className="text-sm font-medium text-[var(--p-text-primary)] mt-0.5">{value}</div>
    </div>
  )
}