// Retired with R24, carried out on 27 October 2026 with today's chat page (C251 (e)).
// Was src/catalog/entries/web-search.jsx. Nothing imports it and it is not built.
// To restore: move it back, with today's chat page and its route and providers in App.jsx.
// web-search@1.0 — contributes a "Web search" item to input@1.0's
// `+` overflow menu; when armed, asks input@1.0 to include the active
// provider's web_search tool definition in the next outgoing API call.
//
// Per the PR-18b contribution model: this component declares an
// `inputAction` in its manifest. RoomShell aggregates it; input@1.0
// renders it inside the `+` menu. When the user taps it, input@1.0
// publishes `input-action:web-search`. The render component (./web-
// search-render.jsx) subscribes and toggles its own armed state.
//
// Per-message toggle (W1): tapping arms the tool for the next send only.
// After a successful send, input@1.0 publishes `message-sent`; the
// render unsubscribes the armed state. Manual reset is available too
// via the chip strip's × button (input@1.0 calls hostAPI._disarmTool).
//
// Provider-neutral: the render component looks up the active provider's
// `web_search` tool definition via `provider.getAvailableTools()`. Today
// only Anthropic ships one; when Phase 2 brings OpenAI / Mistral, each
// provider exposes its own native shape and this manifest is unchanged.
// If the active provider has no web_search tool, the `+` menu item
// disables with a tooltip explaining the limitation.
//
// No slot UI: render returns null. Parking slot in templates is
// `input-dock` (mounts near input@1.0); the visible affordance lives
// inside input@1.0's chip strip + `+` menu.

import WebSearchRender from './web-search-render'
import WebSearchPreview from './web-search-preview'

export default {
  name: 'web-search',
  version: '1.0',
  displayName: 'Web search',
  author: 'parliament',
  description: 'Lets the AI search the web on your next message. Uses Anthropic API credits.',
  icon: 'Globe',
  surfaces: ['room'],
  tier: 'composer',
  slotTargets: [
    { slot: 'input-dock',       primary: false, fallbackOk: true },
    { slot: 'chat-panel',       fallbackOk: true },
    { slot: 'right-rail',       fallbackOk: true },
    { slot: 'right-rail-extra', fallbackOk: true },
    { slot: 'sheet',            fallbackOk: true },
  ],
  // Arms a tool that the model uses to make outbound search calls;
  // the API call itself goes through input@1.0's send path. PR-18d
  // shipped without this required field — caught by the validator at
  // module-load time when this entry is registered. PR-18f restores it.
  capabilityRequirements: ['model:complete'],
  configSchema: {},

  contributions: {
    inputActions: [
      {
        id: 'web-search',
        label: 'Web search',
        iconName: 'Globe',
      },
    ],
  },

  render: WebSearchRender,
  previewRender: WebSearchPreview,
}
