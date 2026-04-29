// Self-contained render wrapper for collab-mode@1.0. Renders a labeled
// trigger button that opens the existing CollabModal with empty defaults.
// Used both by the catalog debug card and by RoomShell until ChatContext
// integration arrives in a later PR.
//
// Lives in its own file so collab-mode.jsx's manifest entry stays a clean
// default-export (react-refresh's "only-export-components" rule).

import { useState } from 'react'
import { Settings2 } from 'lucide-react'
import CollabModal from '../../components/CollabModal'

export default function CollabModePreview({ config = {} } = {}) {
  const [open, setOpen] = useState(false)
  const label = config.triggerLabel ?? 'Collaboration mode'

  return (
    <div className="border border-[var(--p-border)] rounded-xl bg-white p-4">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-[var(--p-border)] bg-white text-[var(--p-text-primary)] hover:border-[var(--p-accent-gold,#B8A070)] transition-colors"
      >
        <Settings2 className="w-4 h-4 text-[var(--p-text-secondary)]" />
        {label}
      </button>
      <p className="text-xs text-[var(--p-text-muted)] mt-3">
        Opens the Collaboration mode panel with presets and Parrot Personas.
      </p>

      {open && (
        <CollabModal
          onClose={() => setOpen(false)}
          onApply={() => setOpen(false)}
          activePresets={new Set()}
          customInstruction=""
        />
      )}
    </div>
  )
}
