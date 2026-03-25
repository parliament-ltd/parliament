import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export default function Input({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  disabled = false,
  error,
  secret = false,
  className = '',
  ...props
}) {
  const [showSecret, setShowSecret] = useState(false)

  return (
    <div className={className}>
      {label && (
        <label className="text-xs font-medium text-[var(--p-text-secondary)] uppercase tracking-wider block mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          type={secret && !showSecret ? 'password' : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            w-full bg-[var(--p-bg-surface)] rounded-md px-4 py-2.5 text-sm text-[var(--p-text-primary)] outline-none
            border transition-colors placeholder:text-[var(--p-text-muted)]
            ${error ? 'border-[#E03E3E] focus:border-[#E03E3E]' : 'border-[var(--p-border)] focus:border-[var(--p-gold-light)]'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            ${secret ? 'pr-10 font-mono' : ''}
          `}
          {...props}
        />
        {secret && (
          <button
            type="button"
            onClick={() => setShowSecret(!showSecret)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--p-text-secondary)] hover:text-[var(--p-text-primary)] transition-colors"
          >
            {showSecret
              ? <EyeOff className="w-4 h-4" />
              : <Eye className="w-4 h-4" />
            }
          </button>
        )}
      </div>
      {error && (
        <p className="text-xs text-[#E03E3E] mt-1.5">{error}</p>
      )}
    </div>
  )
}
