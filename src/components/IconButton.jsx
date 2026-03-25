import { motion } from 'framer-motion'

const SPRING_SNAPPY = { type: 'spring', stiffness: 500, damping: 30 }

export default function IconButton({
  icon: Icon,
  onClick,
  title,
  active = false,
  size = 'md',
  className = '',
}) {
  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-2.5',
  }

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  }

  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      transition={SPRING_SNAPPY}
      onClick={onClick}
      title={title}
      className={`
        rounded-lg transition-colors
        ${sizeClasses[size]}
        ${active
          ? 'bg-[#B8A070]/10 text-[#B8A070]'
          : 'text-[var(--p-text-secondary)] border border-transparent hover:border-[var(--p-text-primary)]/20 hover:text-[var(--p-text-primary)]'
        }
        ${className}
      `}
    >
      <Icon className={iconSizes[size]} />
    </motion.button>
  )
}