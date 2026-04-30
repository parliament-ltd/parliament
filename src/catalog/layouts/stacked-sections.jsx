// stacked-sections@1.0 — homepage layout. A vertical stack of collapsible
// section cards rendered from a single `section-slot` (capacity: stack).
//
// Slot inventory matches refactor/v2-phase1-audit.md §2.1 (homepage scope):
//   section-slot (stack)
//
// Per [phase-1-pr-plan.md](refactor/phase-1-pr-plan.md) PR-6, the seeded
// homepage mode mounts four default components — blueprint, chats, library,
// favorites — into this slot, in that order. Each component renders inside
// a section card with a sticky-ish header; clicking the header toggles the
// section body open/closed.
//
// Section metadata (title, meta line) lives on the mode-file component spec
// under `config.section`: `{ title, meta }`. The layout reads it from each
// child's spec via the slotContents structure. RoomShell currently flattens
// slotContents to React elements only, so PR-6 stamps section metadata
// onto the spec at seed time and the layout reads it back via
// `mode.components` lookup. PR-8's editor will let users override these
// per-section.

import SectionCard from './section-card'

export default {
  name: 'stacked-sections',
  version: '1.0',
  displayName: 'Stacked sections',
  scope: 'homepage',
  slots: [
    { id: 'section-slot', capacity: 'stack' },
  ],

  render: ({ slotContents = {}, mode }) => {
    const sections = slotContents['section-slot'] || []
    // mode.components is the canonical spec source; we use it to recover
    // each section's title/meta config since slotContents only carries
    // pre-rendered React elements.
    const specs = (mode?.components || []).reduce((acc, c) => {
      acc[c.id] = c
      return acc
    }, {})

    return (
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-5">
        {sections.length === 0 ? (
          <div className="text-sm text-[var(--p-text-secondary)] px-5 py-4 rounded-xl border border-dashed border-[var(--p-border)] bg-white">
            No sections mounted on this homepage yet.
          </div>
        ) : (
          sections.map((node, i) => {
            const spec = specs[node.key] || {}
            const section = spec.config?.section || {}
            return (
              <SectionCard
                key={node.key || i}
                title={section.title || spec.ref || 'Section'}
                meta={section.meta}
              >
                {node}
              </SectionCard>
            )
          })
        )}
      </div>
    )
  },
}
