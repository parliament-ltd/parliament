// chats@1.0 — homepage section that lists conversations across rooms.
//
// Composer tier — bulk delete writes to IndexedDB and the row click
// navigates to /chat/:id. Search, view toggle (Summary / Notes /
// Highlights / Branches), and bulk actions are V1 selector behaviors
// preserved as defaults per phase-1-pr-plan.md PR-6 exit criteria.
// The full V1 selector (sidebars, family colors, branch hierarchy,
// inline note editing) stays at /chats — this section is the homepage
// view of the same conversation data.
//
// Publishes `row-hover` on the room hostAPI; blueprint@1.0 subscribes
// and highlights the matching room on hover.

import ChatsPreview from './chats-preview'

export default {
  name: 'chats',
  version: '1.0',
  displayName: 'Chats',
  author: 'parliament',
  description: 'Conversation list with search, view toggle, bulk actions; publishes row-hover on the bus.',
  tier: 'composer',
  slotTargets: [
    { slot: 'section-slot', primary: true },
  ],
  capabilityRequirements: ['storage:read', 'storage:write'],
  configSchema: {
    defaultView: {
      type: 'enum',
      options: ['summary', 'notes', 'highlights', 'branches'],
      default: 'summary',
      label: 'Default second-line content',
    },
    publishHoverEvents: {
      type: 'boolean',
      default: true,
      label: 'Publish row-hover events on the bus',
    },
  },

  render: ChatsPreview,
  previewRender: ChatsPreview,
}
