import { motion } from 'framer-motion'

const SPRING_SNAPPY = { type: 'spring', stiffness: 500, damping: 30 }

export default function Toggle({ enabled, onChange, label, description }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className="flex items-start gap-3 w-full text-left"
    >
      <div
        className={`
          relative flex-shrink-0 w-9 h-5 rounded-full transition-colors mt-0.5
          ${enabled ? 'bg-[#4A7AE5]' : 'bg-[#EBEBEB]'}
        `}
      >
        <motion.div
          animate={{ x: enabled ? 16 : 2 }}
          transition={SPRING_SNAPPY}
          className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm"
        />
      </div>
      <div>
        {label && <span className="text-sm font-semibold text-[#1E2532] block">{label}</span>}
        {description && <span className="text-xs text-[#6B7C93] block mt-0.5">{description}</span>}
      </div>
    </button>
  )
}