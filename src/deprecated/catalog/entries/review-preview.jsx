// Retired with R40, approved by Stefan on 27 October 2026: the Review modal and its block,
// replaced by the Reflection board (C237 (d)). Was src/catalog/entries/review-preview.jsx. Nothing imports it and it is not built.
// To restore: move it back with review.jsx.

// Self-contained render wrapper for review@1.0. Renders a labeled trigger
// button that opens the existing ReviewModal with empty data. Used both by
// the catalog debug card and by RoomShell until ChatContext integration
// arrives in a later PR.
//
// Lives in its own file so review.jsx's manifest entry stays a clean
// default-export (react-refresh's "only-export-components" rule).

import { useState } from 'react'
import { BookOpen } from 'lucide-react'
import ReviewModal from '../../components/ReviewModal'

export default function ReviewPreview({ config = {} } = {}) {
  const [open, setOpen] = useState(false)
  const label = config.triggerLabel ?? 'Review'

  return (
    <div className="border border-[var(--p-border)] rounded-xl bg-white p-4">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-[var(--p-border)] bg-white text-[var(--p-text-primary)] hover:border-[var(--p-accent-gold,#B8A070)] transition-colors"
      >
        <BookOpen className="w-4 h-4 text-[var(--p-text-secondary)]" />
        {label}
      </button>
      <p className="text-xs text-[var(--p-text-muted)] mt-3">
        Opens the Review panel — synthesizes the active conversation with category toggles.
      </p>

      {open && (
        <ReviewModal
          onClose={() => setOpen(false)}
          messages={[]}
          highlights={[]}
          notes={[]}
          favorites={[]}
          branches={[]}
          tokenUsage={{}}
          contextUsage={0}
          onGenerateSynthesis={async () => 'Preview only — synthesis disabled in /catalog.'}
          onExportMarkdown={() => {}}
        />
      )}
    </div>
  )
}
