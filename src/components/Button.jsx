import { motion } from 'framer-motion'

const SPRING_SNAPPY = { type: 'spring', stiffness: 500, damping: 30 }

const variants = {
  default: 'border border-[var(--p-border)] bg-[var(--p-bg-surface)] text-[var(--p-text-primary)] hover:border-[var(--p-gold-light)]',
  primary: 'border border-[#B8A070] bg-[#B8A070] text-white',
  danger: 'border border-[#E03E3E] bg-[#E03E3E] text-white hover:bg-[#C5342A]',
  ghost: 'border border-transparent bg-transparent text-[var(--p-text-secondary)] hover:bg-[var(--p-bg-alt)] hover:text-[var(--p-text-primary)]',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-xs',
  lg: 'px-5 py-3 text-sm',
}

export default function Button({
  children,
  variant = 'default',
  size = 'md',
  icon: Icon,
  iconOnly = false,
  disabled = false,
  onClick,
  className = '',
  ...props
}) {
  return (
    <motion.button
      whileHover={disabled ? {} : { scale: 1.03, borderColor: variant === 'default' ? 'var(--p-gold-light)' : undefined }}
      whileTap={disabled ? {} : { scale: 0.97 }}
      transition={SPRING_SNAPPY}
      onClick={onClick}
      disabled={disabled}
      className={`
        rounded-md font-medium transition-colors inline-flex items-center justify-center gap-2
        ${variants[variant]}
        ${iconOnly ? 'p-2.5' : sizes[size]}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      {...props}
    >
      {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
      {!iconOnly && children}
    </motion.button>
  )
}
