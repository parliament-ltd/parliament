import { motion } from 'framer-motion'

const SPRING_SNAPPY = { type: 'spring', stiffness: 500, damping: 30 }

export default function RadioGroup({ label, options, value, onChange }) {
  return (
    <div>
      {label && (
        <label className="text-xs font-medium text-[#787774] uppercase tracking-wider block mb-3">
          {label}
        </label>
      )}
      <div className="space-y-2">
        {options.map((option) => {
          const active = value === option.id
          const Icon = option.icon
          return (
            <motion.button
              key={option.id}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => onChange(option.id)}
              className={`
                w-full text-left px-4 py-3 rounded-md border flex items-center gap-3 transition-colors
                ${active ? 'border-[#B8A070] bg-[#B8A070]/5' : 'border-[#E9E9E7] hover:border-[#9B9A97]'}
              `}
            >
              {/* Radio circle */}
              <div className={`
                w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0
                ${active ? 'border-[#B8A070]' : 'border-[#9B9A97]'}
              `}>
                <motion.div
                  initial={false}
                  animate={{ scale: active ? 1 : 0 }}
                  transition={SPRING_SNAPPY}
                  className="w-2 h-2 rounded-full bg-[#B8A070]"
                />
              </div>

              {Icon && <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-[#B8A070]' : 'text-[#787774]'}`} />}

              <div>
                <span className={`text-sm font-medium block ${active ? 'text-[#191919]' : 'text-[#787774]'}`}>
                  {option.label}
                </span>
                {option.description && (
                  <span className="text-xs text-[#787774] block mt-0.5">{option.description}</span>
                )}
              </div>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
