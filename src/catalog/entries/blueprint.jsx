// blueprint@1.0 — homepage SVG floor-plan section.
//
// Reader tier — no model calls. Loads the user's room list from
// IndexedDB and renders an irregular per-layout SVG path for each
// room (PR-14 redesign). Subscribes to `row-hover` on the room
// hostAPI; chats@1.0 publishes the events. Hovering a chat row lights
// up its room on the floor plan.

import BlueprintRender from './blueprint-render'

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

  render: BlueprintRender,
  previewRender: BlueprintRender,
}
