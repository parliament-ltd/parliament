// NarrowSheet — chevron-handle expandable panel used between the
// body and the input-dock in canvas-centric / document-centric narrow
// modes (PR-16). Aesthetic mirrors single-column-with-sheet's chevron
// handle, but this primitive sits ABOVE the input dock; single-column
// keeps its sheet BELOW the input. Different ergonomics, same handle
// vocabulary.
//
// Open/close is instant — no motion. Matches single-column-with-sheet.

import { useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'

export default function NarrowSheet({ label = 'Sheet', children }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-t border-[var(--p-border)] bg-white">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-center gap-1.5 py-2 text-[11px] font-medium uppercase tracking-wider text-[var(--p-text-secondary)] hover:text-[var(--p-gold-light)] transition-colors"
        aria-expanded={open}
      >
        {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        {label}
      </button>
      {open && (
        <div className="max-h-72 overflow-y-auto p-3 space-y-3 border-t border-[var(--p-border-subtle)]">
          {children}
        </div>
      )}
    </div>
  )
}
