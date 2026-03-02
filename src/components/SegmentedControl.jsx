import { motion } from 'framer-motion'

const SPRING_SNAPPY = { type: 'spring', stiffness: 500, damping: 30 }

export default function SegmentedControl({ options, value, onChange }) {
  return (
    <div className="flex gap-1 bg-white border border-[#EBEBEB] rounded-lg p-1 w-fit">
      {options.map((option) => {
        const active = value === option.id
        return (
          <motion.button
            key={option.id}
            whileTap={{ scale: 0.97 }}
            transition={SPRING_SNAPPY}
            onClick={() => onChange(option.id)}
            className={`
              px-4 py-1.5 rounded-md text-xs font-semibold transition-colors
              ${active ? 'bg-[#EEEEEE] text-[#1E2532]' : 'text-[#6B7C93] hover:text-[#1E2532]'}
            `}
          >
            {option.label}
          </motion.button>
        )
      })}
    </div>
  )
}