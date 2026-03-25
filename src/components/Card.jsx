import { motion } from 'framer-motion'

const SPRING_SMOOTH = { type: 'spring', stiffness: 300, damping: 28 }

export default function Card({
  children,
  danger = false,
  hover = false,
  onClick,
  className = '',
  ...props
}) {
  const Component = hover || onClick ? motion.div : 'div'
  const motionProps = hover || onClick ? {
    whileHover: { scale: 1.01, borderColor: danger ? '#E03E3E' : 'var(--p-gold-light)' },
    transition: SPRING_SMOOTH,
  } : {}

  return (
    <Component
      onClick={onClick}
      className={`
        px-5 py-4 rounded-lg border bg-[var(--p-bg-surface)]
        ${danger ? 'border-[#E03E3E]/30 bg-[#E03E3E]/5' : 'border-[var(--p-border)]'}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      {...motionProps}
      {...props}
    >
      {children}
    </Component>
  )
}
