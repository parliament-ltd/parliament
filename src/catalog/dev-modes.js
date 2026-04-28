// Hand-built mode files used by the dev /catalog debug surface (PR-3).
//
// These are NOT seeded into IndexedDB — they live in code purely so the
// debug route can exercise the mode → layout → slot → component pipeline
// without depending on stores that later PRs will populate. Each mode is a
// minimal but schema-conformant parliament-mode/1.0 object.

import { MODE_SCHEMA } from '../lib/modes'

export const THREE_PANEL_DEMO_MODE = Object.freeze({
  schema: MODE_SCHEMA,
  parliamentVersion: '0.4.0',
  id: 'dev_three_panel_demo',
  scope: 'room',
  meta: {
    name: 'Three-panel demo',
    description: 'Hand-built mode used by the /catalog debug route to verify RoomShell.',
    created: '2026-04-28T00:00:00.000Z',
    modified: '2026-04-28T00:00:00.000Z',
  },
  deviceClass: 'visual-pointer',
  layout: { ref: 'three-panel@^1.0' },
  scheme: { ref: 'parliament@^1.0' },
  components: [
    { id: 'demo-messages', ref: 'messages@^1.0', slot: 'msg-area',   order: 0, essential: true,  config: {} },
    { id: 'demo-input',    ref: 'input@^1.0',    slot: 'input-dock', order: 0, essential: true,  config: {} },
    { id: 'demo-toc',      ref: 'toc@^1.0',      slot: 'left-rail',  order: 0, essential: false, config: {} },
  ],
  pipelines: [],
  requestedPermissions: [],
  buildIntent: null,
})
