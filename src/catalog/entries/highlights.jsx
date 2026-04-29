// highlights@1.0 — list of saved highlight terms with occurrence navigation.
//
// Wraps src/components/core/HighlightList.jsx without moving or modifying it.
// Reader tier — no model calls; reads/writes its own annotations against the
// `highlights` IndexedDB store, owned by this component (not the room).
//
// ─── Message-action contribution ──────────────────────────
//
// Contributes "Highlight selection" to the per-message action menu surfaced
// by messages@1.0. RoomShell aggregates this contribution alongside the
// notes@1.0 and branches@1.0 actions and exposes the merged list via the
// hostAPI; messages@1.0 reads `hostAPI.getMessageActions()` to render its
// menu (see src/components/RoomShell.jsx).
//
// The handler runs against whatever message+selection the menu was opened
// against. Wiring real selection text into the handler arguments lands when
// /chat/:id moves through RoomShell at PR-10a; in the dev /catalog route
// the handler is invoked with stub arguments so the contribution surface
// can be exercised without a live conversation.

import HighlightList from '../../components/core/HighlightList'
import { HIGHLIGHT_COLORS } from '../../lib/constants'

const SAMPLE_HIGHLIGHTS = [
  { text: 'warm-tinted neutrals', color: HIGHLIGHT_COLORS[0].color, count: 3, ids: ['s1', 's2', 's3'] },
  { text: 'gold accent',          color: HIGHLIGHT_COLORS[1].color, count: 2, ids: ['s4', 's5'] },
  { text: 'cool grey',            color: HIGHLIGHT_COLORS[2].color, count: 1, ids: ['s6'] },
]

export default {
  name: 'highlights',
  version: '1.0',
  displayName: 'Highlights',
  author: 'parliament',
  description: 'Saved highlight terms with occurrence navigation, color tagging, and inline add form.',
  tier: 'reader',
  slotTargets: [
    { slot: 'left-rail',        primary: true },
    { slot: 'right-rail',       fallbackOk: true },
    { slot: 'right-rail-extra', fallbackOk: true },
    { slot: 'margin',           fallbackOk: true },
    { slot: 'sheet',            fallbackOk: true },
  ],
  capabilityRequirements: ['storage:read', 'storage:write'],
  configSchema: {
    defaultColor: {
      type: 'enum',
      options: HIGHLIGHT_COLORS.map(c => c.id),
      default: 'blue',
      label: 'Default color for new highlights',
    },
    showAddForm: {
      type: 'boolean',
      default: true,
      label: 'Show inline "+ Add highlight" form',
    },
  },
  contributions: {
    messageActions: [
      {
        id: 'highlight-selection',
        label: 'Highlight selection',
        // Runtime handler is wired by the consuming surface. RoomShell
        // does not call this directly — it surfaces the contribution via
        // hostAPI.getMessageActions() so messages@1.0 can render the menu.
      },
    ],
  },

  render: ({ highlights = [], onNavigate, onRemove, onAdd }) => (
    <HighlightList
      highlights={highlights}
      onNavigate={onNavigate}
      onRemove={onRemove}
      onAdd={onAdd}
    />
  ),

  previewRender: () => (
    <div className="border border-[var(--p-border)] rounded-xl bg-white p-3 max-w-sm">
      <HighlightList
        highlights={SAMPLE_HIGHLIGHTS}
        onNavigate={() => {}}
        onRemove={() => {}}
        onAdd={() => {}}
      />
    </div>
  ),
}
