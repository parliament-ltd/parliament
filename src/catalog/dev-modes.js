// Hand-built mode files used by the dev /catalog debug surface (PR-3).
//
// These are NOT seeded into IndexedDB — they live in code purely so the
// debug route can exercise the mode → layout → slot → component pipeline
// without depending on stores that later PRs will populate. Each mode is a
// minimal but schema-conformant parliament-mode/1.0 object.
//
// PR-5 expanded the demo to render every shell-side primitive shipped so
// far — TOC, messages, input, voice-input, highlights, notes, branches,
// context, collab-mode, review — across the three-panel layout's rails.
// This satisfies the PR-5 exit criterion: "hand-built mode file with all
// components renders correctly at /catalog debug route."

import { MODE_SCHEMA } from '../lib/modes'

export const THREE_PANEL_DEMO_MODE = Object.freeze({
  schema: MODE_SCHEMA,
  parliamentVersion: '0.5.0',
  id: 'dev_three_panel_demo',
  scope: 'room',
  meta: {
    name: 'Three-panel demo',
    description: 'Hand-built mode used by the /catalog debug route to verify RoomShell.',
    created: '2026-04-28T00:00:00.000Z',
    modified: '2026-04-29T00:00:00.000Z',
  },
  deviceClass: 'visual-pointer',
  layout: { ref: 'three-panel@^1.0' },
  scheme: { ref: 'parliament@^1.0' },
  components: [
    // Center column.
    { id: 'demo-messages', ref: 'messages@^1.0', slot: 'msg-area',   order: 0, essential: true,  config: {} },
    { id: 'demo-input',    ref: 'input@^1.0',    slot: 'input-dock', order: 0, essential: true,  config: {} },

    // Left rail.
    { id: 'demo-toc',      ref: 'toc@^1.0',      slot: 'left-rail',  order: 0, essential: false, config: {} },

    // Right rail (stack): annotation surfaces.
    { id: 'demo-highlights', ref: 'highlights@^1.0', slot: 'right-rail', order: 0, essential: false, config: {} },
    { id: 'demo-notes',      ref: 'notes@^1.0',      slot: 'right-rail', order: 1, essential: false, config: {} },
    { id: 'demo-branches',   ref: 'branches@^1.0',   slot: 'right-rail', order: 2, essential: false, config: {} },

    // Right-rail-extra (stack): context + builders + voice-input.
    { id: 'demo-context',     ref: 'context@^1.0',     slot: 'right-rail-extra', order: 0, essential: false, config: { displayMode: 'meter', contextThreshold: 75 } },
    { id: 'demo-collab',      ref: 'collab-mode@^1.0', slot: 'right-rail-extra', order: 1, essential: false, config: {} },
    { id: 'demo-review',      ref: 'review@^1.0',      slot: 'right-rail-extra', order: 2, essential: false, config: {} },
    { id: 'demo-voice-input', ref: 'voice-input@^1.0', slot: 'right-rail-extra', order: 3, essential: false, config: {} },
  ],
  pipelines: [],
  requestedPermissions: [],
  buildIntent: null,
})
