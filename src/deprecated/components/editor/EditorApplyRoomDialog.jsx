// Retired with R21, approved by Stefan on 27 October 2026 (C250 (b)).
// Was src/components/editor/EditorApplyRoomDialog.jsx. Nothing imports it and it is not built.
// To restore: move it back with the rest of the old editor and wizard, and put back their routes in App.jsx.
// EditorApplyRoomDialog — modal that pops when the user drops a room
// card from the Rooms tab onto the editor canvas (PR-19d).
//
// Three toggles (default ON): Layout, Schema, Components.
//   - Layout disabled when source layout matches current layout.
//   - Components disabled when source is the homepage AND current is a
//     room canvas (homepage components don't transfer).
//   - Components disabled when applyLayout is OFF and source/current
//     layouts differ — there'd be no valid slots for the incoming
//     components.
//
// When Components is ON, the source's components expand below as a
// checklist (each row defaults ON; users can deselect individual rows).
//
// When source.scope === 'homepage', a secondary "Open homepage editor"
// button appears on the left of the footer — that's the canonical
// entry point for editing the homepage post-PR-19d.
//
// Visual chrome cribbed from EditorMigrationDialog.

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Box } from 'lucide-react'
import { planLayoutMigration } from '../../lib/layoutMigration'
import { findCatalogEntry } from '../../lib/refs'

const SPRING_SMOOTH = { type: 'spring', stiffness: 300, damping: 28 }

export default function EditorApplyRoomDialog({
  sourceMode,
  currentMode,
  catalogEntries,
  onCancel,
  onConfirm,
  onOpenHomepageEditor,
}) {
  const sourceLayoutRef = sourceMode?.layout?.ref
  const currentLayoutRef = currentMode?.layout?.ref
  const sameLayout = sourceLayoutRef && sourceLayoutRef === currentLayoutRef
  const isHomepageSource = sourceMode?.scope === 'homepage'
  const isRoomCanvas = currentMode?.scope !== 'homepage'
  const componentsBlockedByScope = isHomepageSource && isRoomCanvas

  const [applyLayout, setApplyLayout] = useState(!sameLayout)
  const [applyScheme, setApplyScheme] = useState(true)
  const [applyComponentsRaw, setApplyComponents] = useState(!componentsBlockedByScope)

  const sourceComponents = sourceMode?.components || []
  const [componentChecked, setComponentChecked] = useState(() =>
    Object.fromEntries(sourceComponents.map((c) => [c.id, true]))
  )

  // Components toggle is also blocked when layouts differ AND we're not
  // applying the source's layout — incoming components would have no
  // slots to land in.
  const layoutsDifferWithoutApply = !sameLayout && !applyLayout
  const componentsToggleDisabled = componentsBlockedByScope || layoutsDifferWithoutApply
  // Effective value — when the toggle is forcibly blocked, it reads OFF
  // for both UI and submit. The raw state remembers the user's prior
  // intent so re-enabling the toggle restores it.
  const applyComponents = applyComponentsRaw && !componentsToggleDisabled

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  // Migration preview: when Layout is ON and layouts differ, show
  // how many of the CURRENT canvas's components would migrate vs orphan.
  const migrationPreview = useMemo(() => {
    if (!applyLayout || sameLayout || !currentMode) return null
    const plan = planLayoutMigration({
      fromLayout: currentLayoutRef,
      toLayout: sourceLayoutRef,
      components: currentMode.components || [],
    })
    return { keep: plan.moves.length, orphan: plan.orphans.length }
  }, [applyLayout, sameLayout, currentMode, currentLayoutRef, sourceLayoutRef])

  function toggleCompChecked(id) {
    setComponentChecked((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  function handleDone() {
    const componentRefsToApply = applyComponents
      ? sourceComponents.filter((c) => componentChecked[c.id]).map((c) => c.id)
      : []
    onConfirm({
      applyLayout: applyLayout && !sameLayout,
      applyScheme,
      applyComponents,
      componentRefsToApply,
    })
  }

  const sourceName = sourceMode?.meta?.name?.trim() || (isHomepageSource ? 'The Study' : 'this room')

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-[150] flex items-center justify-center p-5"
        style={{ backgroundColor: 'rgba(25, 25, 25, 0.32)' }}
        onClick={onCancel}
        role="dialog"
        aria-modal="true"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 6 }}
          transition={SPRING_SMOOTH}
          onClick={(e) => e.stopPropagation()}
          className="w-[460px] max-w-[94vw] max-h-[86vh] bg-[var(--p-bg-surface)] border border-[var(--p-border)] rounded-xl shadow-2xl shadow-black/20 p-6 flex flex-col gap-4"
        >
          <div>
            <div className="text-base font-medium text-[var(--p-text-primary)]">
              Apply &ldquo;{sourceName}&rdquo; to canvas?
            </div>
            <div className="text-[12.5px] text-[var(--p-text-secondary)] leading-[1.55] mt-1">
              Pick what to bring over.
            </div>
          </div>

          <div className="flex flex-col gap-2 max-h-[460px] overflow-y-auto">
            <ToggleRow
              label="Layout"
              checked={applyLayout}
              disabled={sameLayout}
              onChange={setApplyLayout}
              hint={sameLayout ? 'Same layout' : null}
              extra={migrationPreview && (
                <div className="text-[11px] text-[var(--p-text-muted)] mt-1">
                  {migrationPreview.orphan === 0
                    ? `All ${migrationPreview.keep} placed component${migrationPreview.keep === 1 ? '' : 's'} ${migrationPreview.keep === 1 ? 'fits' : 'fit'} the new layout.`
                    : `${migrationPreview.orphan} of your components will move to the holding tray. ${migrationPreview.keep} will keep ${migrationPreview.keep === 1 ? 'its slot' : 'their slots'}.`}
                </div>
              )}
            />

            <ToggleRow
              label="Scheme"
              checked={applyScheme}
              onChange={setApplyScheme}
            />

            <ToggleRow
              label="Components"
              checked={applyComponents}
              disabled={componentsToggleDisabled}
              onChange={setApplyComponents}
              hint={
                componentsBlockedByScope
                  ? "Components don't transfer from The Study"
                  : layoutsDifferWithoutApply
                    ? 'Layout must be applied to bring over components'
                    : null
              }
            />

            {applyComponents && !componentsToggleDisabled && (
              <div className="ml-7 pl-3 border-l border-[var(--p-border)] flex flex-col gap-1 mt-1">
                {sourceComponents.length === 0 && (
                  <div className="text-[11px] text-[var(--p-text-muted)]">
                    The source room has no components.
                  </div>
                )}
                {sourceComponents.map((c) => {
                  const entry = findCatalogEntry(catalogEntries, c.ref)
                  return (
                    <label
                      key={c.id}
                      className="flex items-center gap-2 text-[12px] text-[var(--p-text-secondary)] cursor-pointer py-1"
                    >
                      <input
                        type="checkbox"
                        checked={!!componentChecked[c.id]}
                        onChange={() => toggleCompChecked(c.id)}
                        className="accent-[var(--p-gold-light)]"
                      />
                      <ComponentGlyph iconName={entry?.icon} />
                      <span>{entry?.displayName || c.ref}</span>
                    </label>
                  )
                })}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pt-1">
            {isHomepageSource && onOpenHomepageEditor && (
              <button
                onClick={onOpenHomepageEditor}
                className="px-3 py-1.5 text-xs font-medium rounded-md border border-[var(--p-border)] bg-transparent text-[var(--p-text-secondary)] hover:border-[var(--p-gold-light)] hover:text-[var(--p-gold-light)] transition-colors"
              >
                Edit The Study
              </button>
            )}
            <div className="flex-1" />
            <button
              onClick={onCancel}
              className="px-3 py-1.5 text-xs font-medium rounded-md border border-[var(--p-border)] bg-transparent text-[var(--p-text-secondary)] hover:border-[var(--p-gold-light)] hover:text-[var(--p-gold-light)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDone}
              className="px-3 py-1.5 text-xs font-medium rounded-md border border-[var(--p-gold-light)] bg-[var(--p-gold-light)] text-white hover:bg-[var(--p-gold-muted)] hover:border-[var(--p-gold-muted)] transition-colors"
            >
              Done
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function ToggleRow({ label, checked, disabled, onChange, hint, extra }) {
  return (
    <div className={`rounded-md border border-[var(--p-border)] px-3 py-2 ${disabled ? 'opacity-60' : ''}`}>
      <label className={`flex items-center gap-2.5 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="accent-[var(--p-gold-light)]"
        />
        <span className="text-[13px] font-medium text-[var(--p-text-primary)]">{label}</span>
        {hint && (
          <span className="text-[11px] text-[var(--p-text-muted)]">{hint}</span>
        )}
      </label>
      {extra}
    </div>
  )
}

function ComponentGlyph({ iconName }) {
  void iconName
  return <Box className="w-3.5 h-3.5 text-[var(--p-text-muted)]" strokeWidth={1.5} />
}
