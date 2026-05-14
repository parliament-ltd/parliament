// context@1.0 — context-window health meter (tokens / messages / progress bar).
//
// Wraps src/components/core/ContextMeter.jsx without moving or modifying it.
// Reader tier — pure read of token counts; never makes a model call.
//
// ─── Settings → component config (per audit §3.6) ─────────
//
// V1 stored `contextThreshold` and `autoCompress` as global SettingsContext
// values shared across every conversation. V2 moves them into this
// component's config so a room can declare its own threshold and
// auto-compress posture. Migration at PR-10a bakes the existing app
// setting into each migrated room as the per-component config value;
// later changes to the (still-existing) app setting affect new rooms
// only — the app setting becomes "factory default for new rooms" rather
// than a live override. Per-room editing in the editor wins.
//
// `autoCompress: true` is reserved configuration in Phase 1 — the
// auto-compress trigger code does not ship until Phase 2 (it would need
// the consent flow because the model call would no longer be in DIRECT
// response to a user action). The field round-trips through mode files
// today so PR-10a migration can populate it without a schema bump later.

import ContextMeter from '../../components/core/ContextMeter'
import ContextRender from './context-render'

export default {
  name: 'context',
  version: '1.0',
  displayName: 'Context health',
  author: 'parliament',
  description: 'Token / message / context-window meter with threshold warnings.',
  icon: 'Activity',
  surfaces: ['room'],
  tier: 'reader',
  slotTargets: [
    { slot: 'right-rail',       primary: true },
    { slot: 'right-rail-extra', fallbackOk: true },
    { slot: 'left-rail',        fallbackOk: true },
    { slot: 'sheet',            fallbackOk: true },
  ],
  capabilityRequirements: ['storage:read'],
  configSchema: {
    contextThreshold: {
      type: 'number',
      default: 75,
      label: 'Warning threshold (%) of context window',
    },
    autoCompress: {
      type: 'boolean',
      default: false,
      label: 'Auto-compress at threshold (Phase 2 — reserved)',
    },
    displayMode: {
      type: 'enum',
      options: ['meter', 'compact', 'ambient'],
      default: 'meter',
      label: 'Display mode',
    },
  },

  // Production render — self-binds to ChatContext (PR-10a.6).
  render: ContextRender,

  previewRender: () => (
    <div className="border border-[var(--p-border)] rounded-xl bg-white max-w-sm">
      <ContextMeter
        usage={42}
        threshold={75}
        totalTokens={84_320}
        contextWindow={200_000}
        messageCount={18}
        hiddenCount={0}
        totalMessageCount={18}
        displayMode="meter"
      />
    </div>
  ),
}
