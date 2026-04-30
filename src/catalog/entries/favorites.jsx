// favorites@1.0 — homepage section showing every saved-favorite message
// across every conversation, with click-to-jump back to the source.
//
// Reader tier — reads `favorites` and `messages` IndexedDB stores;
// writes happen only when the user clicks the trash icon to remove a
// favorite. No model calls.

import FavoritesPreview from './favorites-preview'

export default {
  name: 'favorites',
  version: '1.0',
  displayName: 'Favorites',
  author: 'parliament',
  description: 'Cross-cutting saved-message snippets pulled from every conversation.',
  tier: 'reader',
  slotTargets: [
    { slot: 'section-slot', primary: true },
  ],
  capabilityRequirements: ['storage:read', 'storage:write'],
  configSchema: {
    maxItems: {
      type: 'number',
      default: 30,
      label: 'Maximum cards to display',
    },
  },

  render: FavoritesPreview,
  previewRender: FavoritesPreview,
}
