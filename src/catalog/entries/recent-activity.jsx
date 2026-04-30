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
