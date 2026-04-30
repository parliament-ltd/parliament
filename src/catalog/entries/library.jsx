// library@1.0 — homepage section browsing the Parliament library.
//
// Five visible tabs: Rooms, Layouts, Components, Schemes, Resources.
// "Sections" is hidden in Phase 1 per audit NQ-8 — not enough V2
// section components ship in Phase 1 to warrant its own browse surface.
//
// Reader tier — reads from libraryRooms / libraryLayouts /
// libraryComponents / librarySchemes IndexedDB stores (seeded by PR-1).
// Resources tab shows 6 placeholder coming-soon cards drawn from the
// resources spec; clicking opens a read-only preview overlay.

import LibraryPreview from './library-preview'

export default {
  name: 'library',
  version: '1.0',
  displayName: 'Library',
  author: 'parliament',
  description: 'Browse rooms, layouts, components, schemes, and (placeholder) resources.',
  tier: 'reader',
  slotTargets: [
    { slot: 'section-slot', primary: true },
  ],
  capabilityRequirements: ['storage:read'],
  configSchema: {
    defaultTab: {
      type: 'enum',
      options: ['rooms', 'layouts', 'components', 'schemes', 'resources'],
      default: 'rooms',
      label: 'Tab open by default',
    },
  },

  render: LibraryPreview,
  previewRender: LibraryPreview,
}
