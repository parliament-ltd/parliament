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
  description: 'A floor-plan view of every room you\'ve built. Hover a chat row to spotlight which room it lives in.',
  icon: 'LayoutDashboard',
  surfaces: ['homepage'],
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
