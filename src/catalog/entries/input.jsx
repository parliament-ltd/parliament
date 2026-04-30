// input@1.0 — message composer textarea + send/stop + '+' menu.
//
// Wraps src/components/core/InputArea.jsx without moving or modifying it.
// Composer tier per the user-action-vs-autonomous rule (the model call fires
// when the user clicks Send — direct user action — see refactor/tier-classification.md).
//
// `subscribeToVoice` config field controls whether this component listens
// for `voice-transcript` events on the room bus and appends final
// transcripts to its value. PR-5 wired the subscription alongside
// voice-input@1.0, the publisher. The built-in mic button on the
// underlying InputArea (cardLayout-only) stays for V1 fallback and is
// removed at PR-10b.
//
// PR-10a.5: render is a self-binding component (InputRender) that calls
// useChat().sendMessage / stopGenerating directly per
// refactor/v2-phase1-audit.md §2.8a "Component data plumbing". The
// catalog debug surface (/catalog) keeps using InputPreview which has
// its own value state and a no-op send — that route doesn't have an
// active conversation in scope so a real send would have nowhere to land.

import InputPreview from './input-preview'
import InputRender from './input-render'

export default {
  name: 'input',
  version: '1.0',
  displayName: 'Input',
  author: 'parliament',
  description: 'Message composer with send / stop, attachment, and tool-toggle menu.',
  tier: 'composer',
  slotTargets: [
    { slot: 'input-dock', primary: true },
    { slot: 'msg-area',   fallbackOk: true },
    { slot: 'sheet',      fallbackOk: true },
  ],
  capabilityRequirements: ['storage:read', 'storage:write', 'model:complete'],
  configSchema: {
    placeholder: {
      type: 'string',
      default: 'Ask a question...',
      label: 'Placeholder text',
    },
    subscribeToVoice: {
      type: 'boolean',
      default: true,
      label: 'Append transcripts from voice-input@1.0',
    },
    cardLayout: {
      type: 'boolean',
      default: false,
      label: 'Use unified card layout (mobile)',
    },
  },

  // Production render — self-binds to ChatContext (PR-10a.5).
  // previewRender stays self-contained for the dev /catalog route where
  // there's no active conversation in scope.
  render: InputRender,
  previewRender: InputPreview,
}
