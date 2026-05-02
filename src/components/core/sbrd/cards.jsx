// Card primitives shared between document-canvas (inline gutter when
// markup mode is on) and claude-comments / ripple-analysis (sidebar
// surfaces). Lifted from V1 secretarybird ChatLayout.jsx — same
// visual fidelity, no behavior change.

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, Check, X, ArrowRight, ChevronDown, AlertTriangle, Lightbulb,
  CornerDownRight, Send,
} from 'lucide-react'
import { SPRING_SMOOTH } from '../../../lib/constants'

const GOLD = '#B8A070'
const DELETION = '#EF4444'
const SUGGESTION = '#22C55E'
const RIPPLE_WARN = '#E5A620'
const RIPPLE_OPP = '#4A7AE5'

const staggerItem = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: SPRING_SMOOTH },
}

/* ─── Claude-origin paragraph card (Keep / Remove) ──────── */

export function ClaudeOriginCard({ onAccept, onReject, onJump }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={SPRING_SMOOTH}
      className="px-3 py-2.5 rounded-lg border"
      style={{ backgroundColor: `${SUGGESTION}08`, borderColor: `${SUGGESTION}30`, fontFamily: 'system-ui, sans-serif' }}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <Sparkles className="w-3 h-3 flex-shrink-0" style={{ color: SUGGESTION }} />
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: SUGGESTION }}>
          Added by Claude
        </span>
        {onJump && (
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onJump} className="ml-auto p-0.5 rounded" style={{ color: `${SUGGESTION}70` }}>
            <ArrowRight className="w-3 h-3" />
          </motion.button>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <motion.button whileTap={{ scale: 0.95 }} onClick={onAccept} className="flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-semibold text-white" style={{ backgroundColor: SUGGESTION }}>
          <Check className="w-2.5 h-2.5" /> Keep
        </motion.button>
        <motion.button whileTap={{ scale: 0.95 }} onClick={onReject} className="flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-semibold text-[#6B7C93] border border-[#E5E7EB] hover:bg-[#F5F5F5] transition-colors">
          <X className="w-2.5 h-2.5" /> Remove
        </motion.button>
      </div>
    </motion.div>
  )
}

/* ─── Claude suggestion card (Accept / Reject per chunk) ─── */

export function ClaudeSuggestionCard({ suggestion, onAccept, onReject, onJump }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <motion.div
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={SPRING_SMOOTH}
      className="px-3 py-2.5 rounded-lg border"
      style={{ backgroundColor: `${SUGGESTION}08`, borderColor: `${SUGGESTION}30`, fontFamily: 'system-ui, sans-serif' }}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <Sparkles className="w-3 h-3 flex-shrink-0" style={{ color: SUGGESTION }} />
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: SUGGESTION }}>
          Suggested edit
        </span>
        {onJump && (
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onJump} className="ml-auto p-0.5 rounded" style={{ color: `${SUGGESTION}70` }}>
            <ArrowRight className="w-3 h-3" />
          </motion.button>
        )}
      </div>
      {suggestion.reasoning && (
        <div className="mb-2">
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1 text-[10px] text-[#6B7C93] hover:text-[#4A5568] transition-colors"
          >
            <ChevronDown className="w-3 h-3 transition-transform" style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }} />
            Reasoning
          </button>
          <AnimatePresence>
            {expanded && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <p className="text-[10px] text-[#4A5568] leading-relaxed mt-1 pl-2 border-l-2" style={{ borderColor: `${SUGGESTION}40` }}>
                  {suggestion.reasoning}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <motion.button whileTap={{ scale: 0.95 }} onClick={onAccept} className="flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-semibold text-white" style={{ backgroundColor: SUGGESTION }}>
          <Check className="w-2.5 h-2.5" /> Accept
        </motion.button>
        <motion.button whileTap={{ scale: 0.95 }} onClick={onReject} className="flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-semibold text-[#6B7C93] border border-[#E5E7EB] hover:bg-[#F5F5F5] transition-colors">
          <X className="w-2.5 h-2.5" /> Reject
        </motion.button>
      </div>
    </motion.div>
  )
}

/* ─── Margin comment (inline gutter when markup is on) ──── */

export function MarginComment({
  comment, expanded, isActive, onToggle, onActivate, onDelete,
  replyingTo, setReplyingTo, replyInput, onReplyChange, submittedReplies, onSubmitReply,
}) {
  const isReplying = replyingTo === comment.id
  return (
    <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={SPRING_SMOOTH} style={{ fontFamily: 'system-ui, sans-serif' }}>
      <div
        className="group relative px-3 py-2 bg-[#FFF9E6] rounded-lg cursor-pointer hover:bg-[#FFF5D6] transition-colors"
        style={{ border: isActive ? `1.5px solid ${GOLD}` : '1px solid #E5D9A8' }}
        onClick={() => { onActivate(); onToggle() }}
      >
        {onDelete && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={e => { e.stopPropagation(); onDelete() }}
            className="absolute top-1 right-1 p-1 rounded opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity hover:bg-[#E5D9A8]/50"
            style={{ color: '#B5A353' }}
            title="Delete comment"
          >
            <X className="w-3 h-3" />
          </motion.button>
        )}
        {comment.selectedText && (
          <p className="text-[10px] text-[#9B8A2F] italic leading-relaxed mb-1.5 pb-1.5 border-b border-[#E5D9A8]/60 truncate">
            "{comment.selectedText}"
          </p>
        )}
        <div className="flex items-start justify-between gap-2">
          <p className="text-[11px] text-[#6B5D1F] leading-relaxed">{comment.text}</p>
          {comment.claudeReply && (
            <ChevronDown
              className="w-3 h-3 flex-shrink-0 mt-0.5 transition-transform"
              style={{ color: '#B5A353', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
            />
          )}
        </div>
      </div>
      <AnimatePresence>
        {expanded && comment.claudeReply && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={SPRING_SMOOTH} className="overflow-hidden">
            <div className="ml-3 mt-1 pl-3 border-l-2 border-[#22C55E]/30">
              <div className="flex items-center gap-1.5 mb-1">
                <Sparkles className="w-2.5 h-2.5" style={{ color: SUGGESTION }} />
                <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: SUGGESTION }}>Claude</span>
              </div>
              <p className="text-[10px] text-[#4A5568] leading-relaxed">{comment.claudeReply.text}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {submittedReplies.length > 0 && (
        <div className="ml-3 mt-1 pl-3 border-l-2 border-[#E5D9A8]/60 space-y-1">
          {submittedReplies.map((reply, i) => (
            <p key={i} className="text-[10px] text-[#6B5D1F] leading-relaxed py-0.5">{reply.text}</p>
          ))}
        </div>
      )}
      <div className="mt-1.5" onClick={e => e.stopPropagation()}>
        {!isReplying ? (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={e => { e.stopPropagation(); setReplyingTo(comment.id) }}
            className="text-[9px] font-medium transition-colors"
            style={{ color: `${GOLD}99` }}
            onMouseEnter={e => { e.currentTarget.style.color = GOLD }}
            onMouseLeave={e => { e.currentTarget.style.color = `${GOLD}99` }}
          >
            Reply
          </motion.button>
        ) : (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={SPRING_SMOOTH} className="flex items-center gap-1.5">
            <input
              autoFocus
              type="text"
              placeholder="Reply…"
              value={replyInput}
              onChange={e => onReplyChange(e.target.value)}
              onKeyDown={e => {
                e.stopPropagation()
                if (e.key === 'Enter') { e.preventDefault(); onSubmitReply() }
                if (e.key === 'Escape') setReplyingTo(null)
              }}
              className="flex-1 px-2 py-1 text-[10px] bg-white border border-[#E5D9A8] rounded focus:outline-none focus:border-[#B8A070] transition-colors text-[#1E2532]"
            />
            <motion.button whileTap={{ scale: 0.9 }} onClick={onSubmitReply} className="p-1 rounded transition-colors" style={{ color: GOLD }}>
              <Send className="w-3 h-3" />
            </motion.button>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

/* ─── Sidebar comment card ─── */

export function CommentCard({
  comment, expanded, isActive, onToggle, onActivate, onJump, onDelete,
  replyingTo, setReplyingTo, replyInput, onReplyChange, submittedReplies, onSubmitReply,
}) {
  const isReplying = replyingTo === comment.id
  return (
    <motion.div
      variants={staggerItem}
      className="group px-3 py-2.5 bg-[#FFF9E6] rounded-xl cursor-pointer transition-colors"
      style={{ border: isActive ? `1.5px solid ${GOLD}` : '1px solid #E5D9A8' }}
      onClick={onActivate}
    >
      {comment.selectedText && (
        <p className="text-[10px] text-[#9B8A2F] italic leading-relaxed mb-1.5 pb-1.5 border-b border-[#E5D9A8]/60 truncate">
          "{comment.selectedText}"
        </p>
      )}
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-[11px] text-[#6B5D1F] leading-relaxed flex-1">{comment.text}</p>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {onDelete && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={e => { e.stopPropagation(); onDelete() }}
              className="p-1 rounded opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity hover:bg-[#E5D9A8]/40"
              style={{ color: '#B5A353' }}
              title="Delete comment"
            >
              <X className="w-3 h-3" />
            </motion.button>
          )}
          {onJump && (
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={e => { e.stopPropagation(); onJump() }} className="p-1 rounded transition-colors" style={{ color: '#B5A353' }} title="Jump to paragraph">
              <ArrowRight className="w-3 h-3" />
            </motion.button>
          )}
        </div>
      </div>
      {comment.claudeReply && (
        <div className="mt-2 pt-2 border-t border-[#E5D9A8]/50">
          <div className="flex items-center gap-1.5 mb-1 cursor-pointer" onClick={onToggle}>
            <Sparkles className="w-2.5 h-2.5" style={{ color: SUGGESTION }} />
            <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: SUGGESTION }}>Claude's reasoning</span>
            <ChevronDown
              className="w-3 h-3 ml-auto transition-transform"
              style={{ color: SUGGESTION, transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
            />
          </div>
          <AnimatePresence>
            {expanded && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <p className="text-[10px] text-[#4A5568] leading-relaxed">{comment.claudeReply.text}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
      {submittedReplies.length > 0 && (
        <div className="mt-2 pl-3 border-l-2 border-[#E5D9A8]/60 space-y-1">
          {submittedReplies.map((reply, i) => (
            <p key={i} className="text-[10px] text-[#6B5D1F] leading-relaxed py-0.5">{reply.text}</p>
          ))}
        </div>
      )}
      <div className="mt-2">
        {!isReplying ? (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={e => { e.stopPropagation(); setReplyingTo(comment.id) }}
            className="text-[9px] font-medium transition-colors"
            style={{ color: `${GOLD}99` }}
            onMouseEnter={e => { e.currentTarget.style.color = GOLD }}
            onMouseLeave={e => { e.currentTarget.style.color = `${GOLD}99` }}
          >
            Reply
          </motion.button>
        ) : (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={SPRING_SMOOTH} className="flex items-center gap-1.5">
            <input
              autoFocus
              type="text"
              placeholder="Reply…"
              value={replyInput}
              onChange={e => onReplyChange(e.target.value)}
              onKeyDown={e => {
                e.stopPropagation()
                if (e.key === 'Enter') { e.preventDefault(); onSubmitReply() }
                if (e.key === 'Escape') setReplyingTo(null)
              }}
              className="flex-1 px-2 py-1 text-[10px] bg-white border border-[#E5D9A8] rounded focus:outline-none focus:border-[#B8A070] transition-colors text-[#1E2532]"
            />
            <motion.button whileTap={{ scale: 0.9 }} onClick={onSubmitReply} className="p-1 rounded transition-colors" style={{ color: GOLD }}>
              <Send className="w-3 h-3" />
            </motion.button>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

/* ─── Ripple flag card ─── */

export function RippleCard({ ripple, paraText, onJump, onDismiss, onHover, onLeave }) {
  const isWarning = ripple.type === 'contradiction' || ripple.type === 'dependency_break'
  const color = isWarning ? RIPPLE_WARN : RIPPLE_OPP
  const Icon = isWarning ? AlertTriangle : Lightbulb
  const typeLabel = {
    contradiction: 'Contradiction',
    dependency_break: 'Dependency Break',
    opportunity: 'Opportunity',
    tone_shift: 'Tone Shift',
    duplication: 'Duplication',
  }[ripple.type] || ripple.type
  return (
    <motion.div
      variants={staggerItem}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className="group relative px-3 py-2.5 rounded-xl border cursor-pointer transition-colors"
      style={{ backgroundColor: `${color}0C`, borderColor: `${color}25` }}
    >
      {onDismiss && (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={e => { e.stopPropagation(); onDismiss() }}
          className="absolute top-1.5 right-1.5 p-1 rounded opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity hover:bg-white/60"
          style={{ color: '#6B7C93' }}
          title="Dismiss"
        >
          <X className="w-3 h-3" />
        </motion.button>
      )}
      <div className="flex items-start gap-2 mb-2">
        <Icon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color }}>
              {typeLabel}
            </span>
            <span
              className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
              style={{
                backgroundColor: ripple.severity === 'high' ? `${DELETION}18`
                  : ripple.severity === 'medium' ? `${RIPPLE_WARN}18`
                  : 'rgba(107,124,147,0.12)',
                color: ripple.severity === 'high' ? DELETION
                  : ripple.severity === 'medium' ? RIPPLE_WARN
                  : '#6B7C93',
              }}
            >
              {ripple.severity}
            </span>
          </div>
          <p className="text-[11px] text-[#4A5568] leading-relaxed">{ripple.summary}</p>
          {paraText && (
            <p className="text-[10px] text-[#6B7C93] mt-1.5 flex items-center gap-1">
              <CornerDownRight className="w-2.5 h-2.5 flex-shrink-0" />
              <span className="truncate italic">
                &ldquo;{paraText.slice(0, 80)}{paraText.length > 80 ? '…' : ''}&rdquo;
              </span>
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 ml-5">
        <motion.button whileTap={{ scale: 0.97 }} onClick={onJump} className="text-[10px] font-semibold px-2 py-1 rounded-md transition-colors" style={{ color }}>
          Go to paragraph
        </motion.button>
        <motion.button whileTap={{ scale: 0.97 }} onClick={onDismiss} className="text-[10px] font-semibold text-[#6B7C93] px-2 py-1 rounded-md hover:bg-[#F5F5F5] transition-colors">
          Dismiss
        </motion.button>
      </div>
    </motion.div>
  )
}

/* ─── Helper widgets ─── */

export function SidebarSectionLabel({ label, count }) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider">{label}</h3>
      {count !== undefined && (
        <span className="text-[10px] font-semibold" style={{ color: GOLD }}>{count}</span>
      )}
    </div>
  )
}
