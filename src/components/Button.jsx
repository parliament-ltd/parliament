import { motion } from 'framer-motion'

const SPRING_SNAPPY = { type: 'spring', stiffness: 500, damping: 30 }

const variants = {
  default: 'border border-[#EBEBEB] bg-white text-[#1E2532] hover:border-[#4A7AE5]',
  primary: 'border border-[#4A7AE5] bg-[#4A7AE5] text-white',
  danger: 'border border-[#EF4444] bg-[#EF4444] text-white hover:bg-[#DC2626]',
  ghost: 'border border-transparent bg-transparent text-[#6B7C93] hover:bg-[#EEEEEE] hover:text-[#1E2532]',
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
      whileHover={disabled ? {} : { scale: 1.03, borderColor: variant === 'default' ? '#4A7AE5' : undefined }}
      whileTap={disabled ? {} : { scale: 0.97 }}
      transition={SPRING_SNAPPY}
      onClick={onClick}
      disabled={disabled}
      className={`
        rounded-lg font-semibold transition-colors inline-flex items-center justify-center gap-2
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