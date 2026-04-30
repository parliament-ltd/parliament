// BranchCreationPanel — V2 extraction of the V1 Albatross modal.
//
// PR-10a.7. Owned by `branches@1.0` per audit NQ-5.8. Visual design and
// interaction lifted from the V1 inline modal in
// adapters/albatross/ChatLayout.jsx (the original `BranchCreationPanel`
// helper). Mockup reference: mockups/branch-panel-v3.jsx and CLAUDE.md
// §"Compression at Branch Time".
//
// Behavioral differences from V1:
//   1. Single-click create — V1 had a fake 1500ms "Compressing..."
//      animation followed by an "Open Branch" button that fired the
//      real Haiku call. V2 fires the real work on the first Create
//      Branch click and shows progress while it runs. One click, one
//      navigation.
//   2. Errors during compress fall back to Full History silently
//      (V1 behavior, but here we surface via a toast-style line above
//      the footer rather than swallowing).
//
// Lazy summary preview (preserved from V1):
//   - Savings % displays immediately when Compressed Summary is
//     selected (computed locally from contextUsage).
//   - The actual summary text is generated only on first click of
//     "Preview summary" — that's the API call. Result cached in this
//     component's state for the rest of the panel session. Closing the
//     panel unmounts and clears the cache.

import { useState } from 'react'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  GitBranch, Zap, Copy, Info, AlertCircle, ChevronRight, X,
} from 'lucide-react'
import { SPRING_SNAPPY } from '../lib/constants'

function getMeterColor(p) {
  if (p < 50) return '#0F7B6C'
  if (p < 80) return '#D9730D'
  return '#E03E3E'
}

export default function BranchCreationPanel({
  message,
  messageIndex,
  totalMessages,
  contextUsage,
  isIncomplete,
  defaultMode,
  onClose,
  onBranchFull,
  onBranchCompressed,
  onPreviewSummary,
}) {
  const [mode, setMode] = useState(defaultMode === 'compressed-summary' ? 'compressed' : null)
  const [busy, setBusy] = useState(false)
  const [previewExpanded, setPreviewExpanded] = useState(false)
  const [previewContent, setPreviewContent] = useState(null) // null = not fetched
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState(null)
  const [createError, setCreateError] = useState(null)

  // Local rough estimate of post-compress context usage. Mirrors V1's
  // 12% retain factor, with a 2% floor so the bar always shows
  // something. Real number lands once the new conversation loads, but
  // for the panel this is good enough to convey "much smaller".
  const compressedPct = Math.max(Math.round(contextUsage * 0.12), 2)
  const meterTarget = mode === 'compressed' ? compressedPct : contextUsage

  const handleCreate = async () => {
    if (!mode || busy) return
    setBusy(true)
    setCreateError(null)
    try {
      if (mode === 'compressed') {
        await onBranchCompressed?.()
      } else {
        await onBranchFull?.()
      }
      // onBranchX is expected to navigate; if we're still mounted after
      // it resolves we can clear busy in case it didn't navigate.
      // Closing the panel is the parent's job.
    } catch (err) {
      setCreateError(err?.message || 'Could not create branch.')
      setBusy(false)
    }
  }

  const handlePreviewClick = async (e) => {
    e.stopPropagation()
    if (previewExpanded) {
      setPreviewExpanded(false)
      return
    }
    setPreviewExpanded(true)
    if (previewContent !== null || previewLoading) return
    setPreviewLoading(true)
    setPreviewError(null)
    try {
      const text = await onPreviewSummary?.(message.id)
      setPreviewContent(text || '')
    } catch (err) {
      setPreviewError(err?.message || 'Could not generate preview. You can still create the branch.')
    } finally {
      setPreviewLoading(false)
    }
  }

  const ctaLabel = busy
    ? (mode === 'compressed' ? 'Compressing…' : 'Creating…')
    : 'Create Branch'

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
        className="relative z-10 bg-[var(--p-bg-surface)] border border-[var(--p-border)] rounded-xl w-full max-w-[420px] flex flex-col"
        style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)' }}
      >
        {/* Header */}
        <div className="p-5 pb-4" style={{ borderBottom: '1px solid var(--p-border-subtle)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'rgba(196,169,77,0.12)' }}
              >
                <GitBranch className="w-4 h-4" style={{ color: '#C4A94D' }} />
              </div>
              <div>
                <div className="text-sm font-medium text-[var(--p-text-primary)]">Create Branch</div>
                <div className="text-[11px] text-[var(--p-text-secondary)] mt-0.5">
                  Forking from message {messageIndex} of {totalMessages}
                </div>
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
          <div className="mt-4">
            <div className="flex justify-between mb-1">
              <span className="text-[10px] font-medium text-[var(--p-text-secondary)] uppercase tracking-wider">
                Context window after branch
              </span>
              <span
                className="text-xs font-bold tabular-nums"
                style={{ color: getMeterColor(meterTarget) }}
              >
                {Math.round(meterTarget)}%
              </span>
            </div>
            <div className="h-1.5 bg-[var(--p-bg-alt)] rounded-full overflow-hidden">
              <motion.div
                animate={{ width: `${meterTarget}%` }}
                transition={{ duration: 1.2, ease: [0.32, 0.72, 0, 1] }}
                className="h-full rounded-full"
                style={{ backgroundColor: getMeterColor(meterTarget) }}
              />
            </div>
          </div>
        </div>

        {/* Body — mode cards */}
        <div className="p-4 space-y-3">
          {isIncomplete && (
            <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-lg bg-[var(--p-bg-subtle)] border border-[var(--p-border)]">
              <AlertCircle className="w-3.5 h-3.5 text-[#D9730D] flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-[var(--p-text-secondary)] leading-relaxed">
                The last response was interrupted. You can still branch. The partial
                content will be preserved and you can continue it in the new branch.
              </p>
            </div>
          )}

          {/* Full History */}
          <ModeCard
            active={mode === 'full'}
            disabled={busy}
            onSelect={() => { if (!busy) setMode('full') }}
            icon={<Copy className="w-4 h-4" style={{ color: mode === 'full' ? '#B8A070' : '#787774' }} />}
            title="Full History"
            description={`Copy all ${messageIndex} messages as-is. Continue with the same context.`}
            extra={mode === 'full' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-3 flex items-center gap-2 px-3 py-2 bg-[var(--p-bg-subtle)] border border-[var(--p-border)] rounded-lg"
              >
                <Info className="w-3 h-3 text-[var(--p-text-secondary)] flex-shrink-0" />
                <span className="text-[11px] text-[var(--p-text-secondary)]">
                  Branch starts at {Math.round(contextUsage)}% context (same as current conversation)
                </span>
              </motion.div>
            )}
          />

          {/* Compressed Summary */}
          <ModeCard
            active={mode === 'compressed'}
            disabled={busy}
            onSelect={() => { if (!busy) setMode('compressed') }}
            icon={<Zap className="w-4 h-4" style={{ color: mode === 'compressed' ? '#B8A070' : '#787774' }} />}
            titleNode={
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-[var(--p-text-primary)]">Compressed Summary</span>
                <span className="text-xs font-medium text-[#0F7B6C]">(saves context)</span>
              </div>
            }
            description="Start fresh with an AI-generated summary of the conversation so far."
            extra={mode === 'compressed' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-3 space-y-3"
              >
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-lg"
                  style={{ backgroundColor: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)' }}
                >
                  <Zap className="w-3 h-3 text-[#0F7B6C] flex-shrink-0" />
                  <span className="text-[11px] text-[#0F7B6C] font-medium">
                    {Math.round(contextUsage)}% → ~{compressedPct}%, frees up {Math.max(0, Math.round(contextUsage - compressedPct))}%
                  </span>
                </div>
                <button
                  onClick={handlePreviewClick}
                  className="flex items-center gap-1.5 text-[11px] font-medium text-[#B8A070] bg-transparent border-none cursor-pointer p-0"
                >
                  <ChevronRight
                    className="w-3 h-3 transition-transform"
                    style={{ transform: previewExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                  />
                  {previewLoading ? 'Generating preview…' : 'Preview summary'}
                </button>
                {previewExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={SPRING_SNAPPY}
                    className="overflow-hidden"
                  >
                    <div className="px-3 py-2.5 bg-[var(--p-bg-subtle)] border border-[var(--p-border)] rounded-lg">
                      {previewLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 border-2 border-[#B8A070] border-t-transparent rounded-full animate-spin flex-shrink-0" />
                          <p className="text-[11px] text-[var(--p-text-secondary)]">Generating summary…</p>
                        </div>
                      ) : previewError ? (
                        <p className="text-[11px] text-[#D9730D] leading-relaxed">{previewError}</p>
                      ) : previewContent ? (
                        <div className="text-[11px] text-[var(--p-text-secondary)] leading-relaxed parliament-md">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{previewContent}</ReactMarkdown>
                        </div>
                      ) : null}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          />

          {createError && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg border border-[#E03E3E]/30 bg-[#E03E3E]/5">
              <AlertCircle className="w-3.5 h-3.5 text-[#E03E3E] flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-[#E03E3E] leading-relaxed">{createError}</p>
            </div>
          )}
        </div>

        {/* Footer — gold shimmer CTA */}
        <div
          className="flex items-center justify-between p-4"
          style={{ borderTop: '1px solid var(--p-border-subtle)' }}
        >
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 rounded-lg text-xs font-medium text-[var(--p-text-secondary)] hover:text-[var(--p-text-primary)] transition-colors disabled:opacity-50"
          >
            Cancel
          </motion.button>
          <motion.button
            whileHover={mode && !busy ? { scale: 1.03 } : {}}
            whileTap={mode && !busy ? { scale: 0.97 } : {}}
            onClick={handleCreate}
            className="px-5 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-all"
            style={{
              border: mode ? 'none' : '1px solid var(--p-border)',
              background: mode
                ? 'linear-gradient(90deg, #B8A070 25%, #C9B37E 50%, #B8A070 75%)'
                : 'var(--p-bg-surface)',
              backgroundSize: mode ? '200% 100%' : 'auto',
              animation: mode && !busy ? 'gold-shimmer 2s infinite linear' : 'none',
              color: mode ? '#FFFFFF' : '#9B9A97',
              cursor: mode && !busy ? 'pointer' : 'not-allowed',
              opacity: (!mode || busy) ? 0.7 : 1,
            }}
          >
            {busy
              ? <Zap className="w-3.5 h-3.5" />
              : <GitBranch className="w-3.5 h-3.5" />}
            {ctaLabel}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function ModeCard({ active, disabled, onSelect, icon, title, titleNode, description, extra }) {
  return (
    <motion.div
      whileHover={!disabled ? { borderColor: active ? '#B8A070' : '#9B9A97' } : {}}
      onClick={onSelect}
      className="rounded-lg p-4 transition-colors"
      style={{
        border: active ? '1.5px solid #B8A070' : '1px solid var(--p-border)',
        backgroundColor: active ? 'var(--p-bg-subtle)' : 'var(--p-bg-surface)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled && !active ? 0.6 : 1,
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: active ? 'rgba(184,160,112,0.12)' : 'var(--p-bg-alt)' }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          {titleNode || (
            <div className="text-sm font-medium text-[var(--p-text-primary)]">{title}</div>
          )}
          <p className="text-xs text-[var(--p-text-secondary)] mt-0.5">{description}</p>
          {extra}
        </div>
        <div
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
            active
              ? 'border-[#B8A070] bg-[#B8A070]'
              : 'border-[var(--p-text-muted)] bg-[var(--p-bg-surface)]'
          }`}
        >
          {active && <div className="w-2 h-2 rounded-full bg-white" />}
        </div>
      </div>
    </motion.div>
  )
}
