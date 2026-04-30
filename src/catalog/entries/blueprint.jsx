// blueprint@1.0 — homepage section showing every user-built room as a
// tile, with a hover-glow when a sibling chats@1.0 row points at the
// same room.
//
// Reader tier — no model calls; reads the user's room list from
// IndexedDB plus the active conversation list to compute per-room
// counts. Subscribes to `row-hover` on the room hostAPI; chats@1.0
// publishes them. Exit-criterion check for PR-6: hovering a chat row
// highlights its room on the blueprint.

import BluePreview from './blueprint-preview'

export default {
  name: 'blueprint',
  version: '1.0',
  displayName: 'Blueprint',
  author: 'parliament',
  description: 'Floor-plan view of the rooms the user has built; cross-references chat rows.',
  tier: 'reader',
  slotTargets: [
    { slot: 'section-slot', primary: true },
  ],
  capabilityRequirements: ['storage:read'],
  configSchema: {
    showCounts: {
      type: 'boolean',
      default: true,
      label: 'Show conversation counts per room',
    },
  },

  render: BluePreview,
  previewRender: BluePreview,
}
