import { motion } from 'framer-motion'
import { Activity } from 'lucide-react'
import { SPRING_SMOOTH, SPRING_GENTLE, getContextColor } from '../../lib/constants'

/**
 * Renders context health data.
 *
 * displayMode:
 *   'meter'   — full sidebar section with MetricRows, progress bar, warning card (Albatross)
 *   'compact' — small badge (Secretarybird, future)
 *   'ambient' — returns null; ambient signal delivered via getContextColor externally
 */
export default function ContextMeter({
  usage,
  threshold,
  totalTokens,
  contextWindow,
  messageCount,
  hiddenCount = 0,
  totalMessageCount,
  displayMode = 'meter',
}) {
  if (displayMode === 'ambient') return null

  const color = getContextColor(usage, threshold)

  if (displayMode === 'compact') {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full border border-[#EBEBEB] bg-white">
        <Activity className="w-3 h-3" style={{ color }} />
        <span className="text-[10px] font-semibold tabular-nums" style={{ color }}>
          {usage}%
        </span>
      </div>
    )
  }

  // displayMode === 'meter'
  return (
    <div className="p-4 pb-6" data-tour="context-health">
      <h3 className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider mb-3">
        Context Health
      </h3>
      <div className="space-y-3">
        <MetricRow
          label="Messages"
          value={
            hiddenCount > 0
              ? `${messageCount} / ${totalMessageCount}`
              : `${totalMessageCount}`
          }
        />
        <MetricRow
          label="Tokens"
          value={`${totalTokens.toLocaleString()} / ${contextWindow.toLocaleString()}`}
          color={color}
        />
        <MetricRow
          label="Context"
          value={`${usage}%`}
          color={color}
        />
        <div className="relative w-full h-1.5 bg-[#F0F0F0] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${usage}%` }}
            transition={{ ...SPRING_GENTLE, delay: 0.5 }}
            className="h-full rounded-full"
            style={{ backgroundColor: color }}
          />
          <div
            className="absolute top-0 bottom-0 w-px bg-[#6B7C93]/30"
            style={{ left: `${threshold}%` }}
            title={`Threshold: ${threshold}%`}
          />
        </div>
      </div>

      {usage >= threshold / 2 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING_GENTLE, delay: 0.5 }}
          className="mt-4 p-3 bg-white rounded-lg border border-[#EBEBEB]"
        >
          <div className="flex items-start gap-2">
            <motion.div
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ repeat: Infinity, repeatDelay: 3, duration: 0.6 }}
            >
              <Activity className="w-4 h-4 mt-0.5" style={{ color }} />
            </motion.div>
            <div>
              <div className="text-xs font-semibold" style={{ color }}>
                {usage >= threshold ? 'Context Nearly Full' : 'Approaching Limit'}
              </div>
              <div className="text-xs text-[#6B7C93] mt-1">
                {usage >= threshold
                  ? 'Branch this conversation to free up context space.'
                  : 'Consider compressing the conversation or starting a new branch.'}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}

/* ── Internal sub-component ─────────────────────────────── */

function MetricRow({ label, value, color }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={SPRING_SMOOTH}
      className="flex items-center justify-between text-xs"
    >
      <span className="text-[#6B7C93]">{label}</span>
      <span className="font-semibold" style={{ color: color || '#1E2532' }}>
        {value}
      </span>
    </motion.div>
  )
}
