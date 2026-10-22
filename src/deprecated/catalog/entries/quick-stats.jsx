// Retired with R7, approved by Stefan on 22 October 2026: The homepage's quick stats.
// Was src/catalog/entries/quick-stats.jsx. Nothing imports it and it is not built. To restore:
// Move it back with quick-stats-render.jsx and register it in src/catalog/index.js.

// quick-stats@1.0 — small homepage tile showing aggregate counts.
//
// Reader tier — reads conversation/message/highlight/note counts from
// IndexedDB. Not mounted in the seeded homepage by default; users can
// add it via the homepage editor when PR-8 lands. Catalog-registered so
// it shows in the library Components tab.

import QuickStatsRender from './quick-stats-render'

export default {
  name: 'quick-stats',
  version: '1.0',
  displayName: 'Quick stats',
  author: 'parliament',
  description: 'At-a-glance totals: conversations, messages, highlights, notes.',
  icon: 'Hash',
  surfaces: ['homepage'],
  tier: 'reader',
  slotTargets: [
    { slot: 'section-slot', primary: true },
  ],
  capabilityRequirements: ['storage:read'],
  configSchema: {},

  render: QuickStatsRender,
  previewRender: QuickStatsRender,
}
