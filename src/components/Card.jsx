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
    whileHover: { scale: 1.01, borderColor: danger ? '#EF4444' : '#4A7AE5' },
    transition: SPRING_SMOOTH,
  } : {}

  return (
    <Component
      onClick={onClick}
      className={`
        px-5 py-4 rounded-xl border bg-white
        ${danger ? 'border-[#EF4444]/30 bg-[#EF4444]/5' : 'border-[#EBEBEB]'}
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