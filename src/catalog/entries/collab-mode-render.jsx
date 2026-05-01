// collab-mode@1.0 — production render for the V2 RoomShell chat path.
//
// PR-10a.9. Self-binds to CollabModeContext per refactor/v2-phase1-audit.md
// §2.8a. Renders a labeled trigger button (with active-count badge when
// presets are applied) that opens the existing CollabModal — the modal
// itself is the V1 component shipped at PR-5; we only swap the host
// state from local-on-mount to the shared context.
//
// What this slice wires:
//   - Modal seeded from CollabModeContext.activePresets +
//     customInstruction so previously-applied presets persist across
//     modal open/close (V1 behavior).
//   - onApply pushes back through context.apply(), which is what
//     input@1.0 + messages@1.0 ghost-continue read via
//     buildSystemPrompt() for the next user send / continue.
//   - State resets on conversation change (handled inside the context;
//     matches V1 Albatross's per-mount lifetime).

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Settings2 } from 'lucide-react'
import CollabModal from '../../components/CollabModal'
import { useCollabMode } from '../../stores/CollabModeContext'

export default function CollabModeRender({ config = {} } = {}) {
  const { activePresets, customInstruction, apply, activeCount } = useCollabMode()
  const [open, setOpen] = useState(false)

  const label = config.triggerLabel ?? 'Collaboration mode'
  const showBadge = config.showBadge !== false

  return (
    <div className="px-4 py-4">
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        whileHover={{ scale: 1.02, borderColor: '#B8A070' }}
        whileTap={{ scale: 0.98 }}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-[var(--p-border)] bg-white text-[var(--p-text-primary)] transition-colors"
      >
        <Settings2
          className="w-4 h-4"
          style={{ color: activeCount > 0 ? '#B8A070' : 'var(--p-text-secondary)' }}
        />
        {label}
        {showBadge && activeCount > 0 && (
          <span
            className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-semibold"
            style={{ backgroundColor: 'rgba(184,160,112,0.15)', color: '#B8A070' }}
          >
            {activeCount}
          </span>
        )}
      </motion.button>

      {open && (
        <CollabModal
          onClose={() => setOpen(false)}
          activePresets={activePresets}
          customInstruction={customInstruction}
          onApply={(presets, instruction) => {
            apply(presets, instruction)
          }}
        />
      )}
    </div>
  )
}
