import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

const SPRING_SNAPPY = { type: 'spring', stiffness: 500, damping: 30 }
const CARD_W = 320
const CARD_H_EST = 200 // conservative estimate for clamping

/**
 * TourTooltip — floating guided tour card.
 *
 * Each step shape:
 *   { title, desc, target: '[data-tour="..."]', placement: 'top'|'bottom'|'left'|'right'|'center' }
 *
 * If a 'left' placement would push the card off-screen it auto-flips to 'right'.
 * All placements clamp to viewport edges so the card is always visible.
 */
export default function TourTooltip({ steps, onDone }) {
  const [stepIndex, setStepIndex] = useState(0)
  const [targetRect, setTargetRect] = useState(null)

  const step = steps[stepIndex]

  // Find and measure the target element whenever the step changes
  useEffect(() => {
    if (!step.target) {
      setTargetRect(null)
      return
    }
    const el = document.querySelector(step.target)
    if (!el) { setTargetRect(null); return }

    el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })

    // Small delay so scroll finishes before measuring
    const t = setTimeout(() => {
      setTargetRect(el.getBoundingClientRect())
    }, 180)
    return () => clearTimeout(t)
  }, [stepIndex, step.target])

  const handleNext = useCallback(() => {
    if (stepIndex < steps.length - 1) setStepIndex(i => i + 1)
    else onDone()
  }, [stepIndex, steps.length, onDone])

  const handlePrev = useCallback(() => {
    if (stepIndex > 0) setStepIndex(i => i - 1)
  }, [stepIndex])

  // Calculate tooltip card position relative to the target element.
  // Clamps to viewport so the card is always reachable even at screen edges.
  const cardStyle = (() => {
    const PAD = 14 // gap between target and card
    const vw = window.innerWidth
    const vh = window.innerHeight

    const clampLeft = (x) => Math.max(12, Math.min(x, vw - CARD_W - 12))
    const clampTop  = (y) => Math.max(12, Math.min(y, vh - CARD_H_EST - 12))

    if (!targetRect || step.placement === 'center') {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: CARD_W,
        zIndex: 200,
      }
    }

    const { top, bottom, left, right, width } = targetRect
    const centerX = left + width / 2

    switch (step.placement) {
      case 'bottom':
        return {
          position: 'fixed',
          top: clampTop(bottom + PAD),
          left: clampLeft(centerX - CARD_W / 2),
          width: CARD_W,
          zIndex: 200,
        }
      case 'top':
        return {
          position: 'fixed',
          top: clampTop(top - PAD - CARD_H_EST),
          left: clampLeft(centerX - CARD_W / 2),
          width: CARD_W,
          zIndex: 200,
        }
      case 'right':
        return {
          position: 'fixed',
          top: clampTop(top),
          left: clampLeft(right + PAD),
          width: CARD_W,
          zIndex: 200,
        }
      case 'left': {
        const leftPos = left - PAD - CARD_W
        // Auto-flip to right if card would go off-screen to the left
        if (leftPos < 12) {
          return {
            position: 'fixed',
            top: clampTop(top),
            left: clampLeft(right + PAD),
            width: CARD_W,
            zIndex: 200,
          }
        }
        return {
          position: 'fixed',
          top: clampTop(top),
          left: leftPos,
          width: CARD_W,
          zIndex: 200,
        }
      }
      default:
        return {
          position: 'fixed',
          top: clampTop(bottom + PAD),
          left: clampLeft(centerX - CARD_W / 2),
          width: CARD_W,
          zIndex: 200,
        }
    }
  })()

  return (
    <>
      {/* Dim overlay — pointer-events: none so underlying UI stays interactive */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 198, backgroundColor: 'rgba(0,0,0,0.18)' }}
      />

      {/* Highlight ring around target */}
      <AnimatePresence mode="wait">
        {targetRect && (
          <motion.div
            key={step.target}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="pointer-events-none"
            style={{
              position: 'fixed',
              top: targetRect.top - 5,
              left: targetRect.left - 5,
              width: targetRect.width + 10,
              height: targetRect.height + 10,
              borderRadius: 10,
              border: '2px solid #B8A070',
              boxShadow: '0 0 0 4000px rgba(0,0,0,0.18)',
              zIndex: 199,
            }}
          />
        )}
      </AnimatePresence>

      {/* Tooltip card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={stepIndex}
          initial={{ opacity: 0, y: 6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.97 }}
          transition={SPRING_SNAPPY}
          style={cardStyle}
          className="bg-white border border-[#E9E9E7] rounded-xl shadow-2xl shadow-black/10 p-5"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <span className="text-[10px] font-medium text-[var(--p-text-secondary)] uppercase tracking-wider">
                Step {stepIndex + 1} of {steps.length}
              </span>
              <h3 className="text-sm font-medium text-[var(--p-text-primary)] mt-0.5">{step.title}</h3>
            </div>
            <button
              onClick={onDone}
              className="p-1 rounded hover:bg-[#F1F1EF] text-[var(--p-text-secondary)] hover:text-[var(--p-text-primary)] transition-colors shrink-0"
              title="Skip tour"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Description */}
          <p className="text-xs text-[#37352F] leading-relaxed">{step.desc}</p>

          {/* Progress dots */}
          <div className="flex items-center gap-1.5 mt-4">
            {steps.map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all duration-200"
                style={{
                  width: i === stepIndex ? 16 : 6,
                  height: 6,
                  backgroundColor: i === stepIndex ? '#B8A070' : '#E9E9E7',
                }}
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2 mt-3">
            {stepIndex > 0 && (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handlePrev}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[#E9E9E7] bg-white text-[var(--p-text-secondary)] hover:text-[var(--p-text-primary)] transition-colors"
              >
                Back
              </motion.button>
            )}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleNext}
              className="px-4 py-1.5 rounded-lg text-xs font-medium text-white"
              style={{ background: 'linear-gradient(135deg, #B8A070, #9C8760)' }}
            >
              {stepIndex === steps.length - 1 ? 'Done' : 'Next'}
            </motion.button>
            <button
              onClick={onDone}
              className="ml-auto text-[10px] text-[var(--p-text-muted)] hover:text-[var(--p-text-secondary)] transition-colors"
            >
              Skip tour
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  )
}
