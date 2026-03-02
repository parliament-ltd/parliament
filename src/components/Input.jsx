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
        <label className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider block mb-2">
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
            w-full bg-white rounded-lg px-4 py-2.5 text-sm text-[#1E2532] outline-none
            border transition-colors placeholder:text-[#D5D5D5]
            ${error ? 'border-[#EF4444] focus:border-[#EF4444]' : 'border-[#EBEBEB] focus:border-[#4A7AE5]'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            ${secret ? 'pr-10 font-mono' : ''}
          `}
          {...props}
        />
        {secret && (
          <button
            type="button"
            onClick={() => setShowSecret(!showSecret)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7C93] hover:text-[#1E2532] transition-colors"
          >
            {showSecret
              ? <EyeOff className="w-4 h-4" />
              : <Eye className="w-4 h-4" />
            }
          </button>
        )}
      </div>
      {error && (
        <p className="text-xs text-[#EF4444] mt-1.5">{error}</p>
      )}
    </div>
  )
}