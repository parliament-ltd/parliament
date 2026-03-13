import { motion } from 'framer-motion'

const SPRING_SNAPPY = { type: 'spring', stiffness: 500, damping: 30 }

export default function SegmentedControl({ options, value, onChange }) {
  return (
    <div className="flex gap-1 bg-white border border-[#E9E9E7] rounded-md p-1 w-fit">
      {options.map((option) => {
        const active = value === option.id
        return (
          <motion.button
            key={option.id}
            whileTap={{ scale: 0.97 }}
            transition={SPRING_SNAPPY}
            onClick={() => onChange(option.id)}
            className={`
              px-4 py-1.5 rounded-md text-xs font-medium transition-colors
              ${active ? 'bg-[#F1F1EF] text-[#191919]' : 'text-[#787774] hover:text-[#191919]'}
            `}
          >
            {option.label}
          </motion.button>
        )
      })}
    </div>
  )
}
