// Retired with R24, carried out on 27 October 2026 with today's chat page (C251 (e)).
// Was src/catalog/entries/file-attach.jsx. Nothing imports it and it is not built.
// To restore: move it back, with today's chat page and its route and providers in App.jsx.
// file-attach@1.0 — contributes an "Attach files" item to input@1.0's
// `+` overflow menu; opens a multi-select file picker and stages the
// chosen files on the room hostAPI's attachments registry so input@1.0
// folds them into the next outgoing message.
//
// PR-18e ships this as the first functional V2 file-attach surface —
// the V1 intrinsic file-input button in InputArea was a placeholder
// that read files but never passed them anywhere, and is removed this
// PR. file-attach@1.0 picks up that work properly.
//
// Per-message semantics:
//   - Picker stages files; chips render above the textarea.
//   - Tapping × on a chip removes one file.
//   - After a successful send, `message-sent` fires; the render clears
//     its local list and the chip strip empties.
//   - Branching / re-send does NOT replay binary attachments (the
//     base64 isn't persisted). The attachment chips in history are a
//     memory aid via `attachmentMeta` persisted on the user message.
//
// Provider neutrality:
//   - Images and PDFs go to the API as Anthropic content blocks
//     (image/document). Other providers will need their own mapping
//     in their provider adapter (Phase 2 multi-provider work).
//   - Text/code attachments are inlined into the prompt text via
//     `<attached_file>` boundary tags — a wire-format-neutral
//     mitigation against prompt injection that works for any
//     provider unchanged.
//
// No slot UI: render returns null. Parking slot is `input-dock` (or
// `chat-panel` in document-centric); the visible affordance is the
// `+` menu item and the chip strip rendered by input@1.0.

import FileAttachRender from './file-attach-render'
import FileAttachPreview from './file-attach-preview'

export default {
  name: 'file-attach',
  version: '1.0',
  displayName: 'File attach',
  author: 'parliament',
  description: 'Pick image / PDF / text files and stage them on the next outgoing message. 10 MB per binary file; 200 KB per text/code file; up to 10 attachments per message.',
  icon: 'Paperclip',
  surfaces: ['room'],
  tier: 'composer',
  slotTargets: [
    { slot: 'input-dock',       primary: false, fallbackOk: true },
    { slot: 'chat-panel',       fallbackOk: true },
    { slot: 'right-rail',       fallbackOk: true },
    { slot: 'right-rail-extra', fallbackOk: true },
    { slot: 'sheet',            fallbackOk: true },
  ],
  // Files are staged in memory and folded into input@1.0's outbound
  // send path; the model API call is the consumer. PR-18e shipped
  // without this required field — caught by the validator at
  // module-load time when this entry is registered. PR-18f restores it.
  capabilityRequirements: ['model:complete'],
  configSchema: {},

  contributions: {
    inputActions: [
      {
        id: 'file-attach',
        label: 'Attach files',
        iconName: 'Paperclip',
      },
    ],
  },

  render: FileAttachRender,
  previewRender: FileAttachPreview,
}
