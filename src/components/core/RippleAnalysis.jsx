// RippleAnalysis — render component for ripple-analysis@1.0.
//
// Surfaces cross-paragraph and cross-document impact flags. Targets
// the `margin` slot of document-centric@1.0 (order 1, after
// claude-comments). State lives in DocumentContext (paragraphs[i].ripple
// + rippleEnabled toggle).
//
// Phase 1 ripple analysis is single-shot: the cross-paragraph scan
// runs on the user-initiated Submit & Branch click in
// document-canvas's toolbar (which calls DocumentContext.submitAndBranch).
// This component renders the resulting flags + provides a
// "Expand Scope" affordance that opens RippleScopeModal for a
// cross-document scan over selected chats.
//
// Composer tier: the cross-document scan kicks off a Haiku call per
// selected conversation, but only on user click. No autonomous calls.
//
// Soft dependency on document-canvas@1.0: when a room mounts
// ripple-analysis without a document-canvas, RoomShell substitutes
// the document-source-needed empty-state template.

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, BellOff, ChevronDown, CheckCheck } from 'lucide-react'
import { SPRING_SMOOTH } from '../../lib/constants'
import { RippleCard, SidebarSectionLabel } from './sbrd/cards'
import RippleScopeModal from './sbrd/RippleScopeModal'
import { useDocument } from '../../stores/DocumentContext'
import { useChat } from '../../stores/ChatContext'

const SUGGESTION = '#22C55E'

const staggerContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.08 } },
}

export default function RippleAnalysis() {
  const {
    paragraphs,
    counts,
    rippleEnabled, setRippleEnabled,
    setSelectedParagraph,
    dismissRipple,
    setRipplesByParaId,
    setHoveredRipple,
    conversationTitle,
  } = useDocument()
  const { activeConversationId } = useChat()
  const [showScopeModal, setShowScopeModal] = useState(false)

  const { pendingRipples } = counts

  return (
    <>
      <div data-tour="sbrd-ripple" className="space-y-3" style={{ fontFamily: 'system-ui, sans-serif' }}>
        <div className="flex items-center justify-between">
          <SidebarSectionLabel label="Impact Analysis" count={pendingRipples} />
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setRippleEnabled(v => !v)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium transition-colors"
            style={rippleEnabled
              ? { backgroundColor: 'rgba(229,166,32,0.1)', color: '#E5A620' }
              : { color: '#6B7C93' }}
            title={rippleEnabled ? 'Disable ripple analysis' : 'Enable ripple analysis'}
          >
            {rippleEnabled ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
            Ripple
          </motion.button>
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowScopeModal(true)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg border text-[11px] font-medium transition-colors sbrd-scope-btn"
          style={{ borderColor: 'var(--p-border)' }}
        >
          <span>Expand Scope</span>
          <ChevronDown className="w-3 h-3" />
        </motion.button>

        {!rippleEnabled && (
          <p className="px-3 py-2.5 bg-[#F5F5F5] rounded-lg text-[11px] text-[#6B7C93] leading-relaxed">
            Ripple is off. Enable it to detect cross-section impacts on submit.
          </p>
        )}

        {rippleEnabled && (
          <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-2">
            {paragraphs.filter(p => p.ripple).map(para => (
              <RippleCard
                key={`ripple-${para.id}`}
                ripple={para.ripple}
                paraText={para.text}
                onJump={() => setSelectedParagraph(para.id)}
                onDismiss={() => dismissRipple(para.id)}
                onHover={() => setHoveredRipple(para.id)}
                onLeave={() => setHoveredRipple(null)}
              />
            ))}
            {pendingRipples === 0 && (
              <div className="px-3 py-6 text-center">
                <CheckCheck className="w-6 h-6 mx-auto mb-2" style={{ color: SUGGESTION }} />
                <p className="text-xs text-[#6B7C93]">No impacts detected</p>
                <p className="text-[10px] text-[#9B9A97] mt-1">
                  Submit edits to trigger cross-paragraph analysis.
                </p>
              </div>
            )}
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {showScopeModal && (
          <RippleScopeModal
            currentId={activeConversationId}
            currentTitle={conversationTitle}
            paragraphs={paragraphs}
            setRipplesByParaId={setRipplesByParaId}
            onClose={() => setShowScopeModal(false)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
