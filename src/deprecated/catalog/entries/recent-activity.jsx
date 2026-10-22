// Retired with R7, approved by Stefan on 22 October 2026: The homepage's recent activity.
// Was src/catalog/entries/recent-activity.jsx. Nothing imports it and it is not built. To restore:
// Move it back with recent-activity-render.jsx and register it in src/catalog/index.js.

// recent-activity@1.0 — homepage section listing the user's last few
// active conversations.
//
// Reader tier — reads conversations from ConversationContext and
// surfaces the N most-recently-updated ones with click-to-open. Not
// mounted in the seeded homepage by default; users can add it via the
// homepage editor when PR-8 lands.

import RecentActivityRender from './recent-activity-render'

export default {
  name: 'recent-activity',
  version: '1.0',
  displayName: 'Recent activity',
  author: 'parliament',
  description: 'The most recently updated conversations.',
  icon: 'Clock',
  surfaces: ['homepage'],
  tier: 'reader',
  slotTargets: [
    { slot: 'section-slot', primary: true },
  ],
  capabilityRequirements: ['storage:read'],
  configSchema: {
    limit: {
      type: 'number',
      default: 5,
      label: 'Number of conversations to show',
    },
  },

  render: RecentActivityRender,
  previewRender: RecentActivityRender,
}
