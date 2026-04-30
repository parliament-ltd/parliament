// scratchpad@1.0 — homepage tile holding a single free-form note.
//
// Utility tier — no model calls, no conversation reads. State persists
// to a single setting key (`scratchpad-text`) so the note survives
// reloads but is not tied to any conversation.

import ScratchpadRender from './scratchpad-render'

export default {
  name: 'scratchpad',
  version: '1.0',
  displayName: 'Scratchpad',
  author: 'parliament',
  description: 'A single free-form note that persists across sessions.',
  tier: 'utility',
  slotTargets: [
    { slot: 'section-slot', primary: true },
  ],
  capabilityRequirements: ['storage:read', 'storage:write'],
  configSchema: {
    placeholder: {
      type: 'string',
      default: 'A place to jot anything…',
      label: 'Placeholder text',
    },
  },

  render: ScratchpadRender,
  previewRender: ScratchpadRender,
}
