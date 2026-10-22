// Retired with R7, approved by Stefan on 22 October 2026: The homepage's scratchpad.
// Was src/catalog/entries/scratchpad.jsx. Nothing imports it and it is not built. To restore:
// Move it back with scratchpad-render.jsx and register it in src/catalog/index.js.

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
  icon: 'NotebookPen',
  surfaces: ['homepage'],
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
