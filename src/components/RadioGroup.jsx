import { motion } from 'framer-motion'

const SPRING_SNAPPY = { type: 'spring', stiffness: 500, damping: 30 }

export default function RadioGroup({ label, options, value, onChange }) {
  return (
    <div>
      {label && (
        <label className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider block mb-3">
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
                w-full text-left px-4 py-3 rounded-lg border flex items-center gap-3 transition-colors
                ${active ? 'border-[#4A7AE5] bg-[#4A7AE5]/5' : 'border-[#EBEBEB] hover:border-[#D5D5D5]'}
              `}
            >
              {/* Radio circle */}
              <div className={`
                w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0
                ${active ? 'border-[#4A7AE5]' : 'border-[#D5D5D5]'}
              `}>
                <motion.div
                  initial={false}
                  animate={{ scale: active ? 1 : 0 }}
                  transition={SPRING_SNAPPY}
                  className="w-2 h-2 rounded-full bg-[#4A7AE5]"
                />
              </div>

              {Icon && <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-[#4A7AE5]' : 'text-[#6B7C93]'}`} />}

              <div>
                <span className={`text-sm font-semibold block ${active ? 'text-[#1E2532]' : 'text-[#6B7C93]'}`}>
                  {option.label}
                </span>
                {option.description && (
                  <span className="text-xs text-[#6B7C93] block mt-0.5">{option.description}</span>
                )}
              </div>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}