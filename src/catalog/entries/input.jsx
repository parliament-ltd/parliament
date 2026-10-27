// input@1.0 — the room's input: where the bar docks, and the holder of the
// features of input (web search, voice, files; C248). It draws nothing:
// the bar is the composer (C37). The composer it drew (input-render.jsx,
// InputArea.jsx) and its three settings were retired with today's chat
// page on 27 October 2026 (R25, R41; C251) and live in src/deprecated/.
// Its features are settings the Lab reads (lib/labBlocks.js, inputFeatures.js).

export default {
  name: 'input',
  version: '1.0',
  displayName: 'Input',
  author: 'parliament',
  description: 'Where the bar sits in a room, with its features: web search, voice and files.',
  icon: 'MessageSquare',
  surfaces: ['room'],
  tier: 'composer',
  slotTargets: [
    { slot: 'input-dock', primary: true },
    { slot: 'msg-area',   fallbackOk: true },
    { slot: 'sheet',      fallbackOk: true },
  ],
  capabilityRequirements: ['storage:read', 'storage:write', 'model:complete'],
  configSchema: {},
  render: function InputRender() { return null },
  previewRender: function InputPreview() { return null },
}
