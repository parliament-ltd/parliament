// ripple-analysis@1.0 — cross-paragraph + cross-document impact surface.
//
// PR-11b — third of the three Secretarybird-decomposition entries.
// Reads paragraphs[i].ripple state from DocumentContext; the
// Submit & Branch flow that generates new ripple flags lives on
// document-canvas (single combined Composer-tier call). This
// component owns:
//   - the Ripple toggle (controls whether Submit's prompt asks for
//     ripple flags, mirrored on rippleEnabled in DocumentContext)
//   - the Expand Scope affordance + RippleScopeModal — a per-target
//     Composer-tier Haiku call that runs only when the user clicks
//     "Scan N Chats"
//   - the dismiss / hover / jump UI for existing flags
//
// Tier: composer. All model calls are user-initiated. Phase 1 ships
// zero Agent components per refactor/tier-classification.md.
//
// Soft dependency on document-canvas@1.0: when a room mounts
// ripple-analysis without document-canvas, RoomShell substitutes the
// document-source-needed empty-state template. Without document-canvas
// there are no paragraphs to analyze.

import RippleAnalysis from '../../components/core/RippleAnalysis'

function RippleAnalysisRender() {
  return <RippleAnalysis />
}

function RippleAnalysisPreview() {
  return (
    <div className="border border-[var(--p-border)] rounded-xl bg-white p-4 max-w-xs">
      <div className="text-[10px] font-medium text-[#787774] uppercase tracking-wider mb-3">
        Impact analysis
      </div>
      <div className="space-y-2 mb-3">
        <div className="px-3 py-2 rounded-lg border" style={{ backgroundColor: '#E5A6200C', borderColor: '#E5A62025' }}>
          <div className="text-[10px] font-semibold mb-1" style={{ color: '#E5A620' }}>CONTRADICTION</div>
          <div className="text-[10px] text-[#4A5568]">Earlier paragraph says X; this section now says Y.</div>
        </div>
        <div className="px-3 py-2 rounded-lg border" style={{ backgroundColor: '#4A7AE50A', borderColor: '#4A7AE525' }}>
          <div className="text-[10px] font-semibold mb-1" style={{ color: '#4A7AE5' }}>OPPORTUNITY</div>
          <div className="text-[10px] text-[#4A5568]">Could connect this point to the conclusion.</div>
        </div>
      </div>
      <div className="text-[10px] text-[#787774] italic">
        Preview only — production render binds to DocumentContext.
      </div>
    </div>
  )
}

export default {
  name: 'ripple-analysis',
  version: '1.0',
  displayName: 'Ripple analysis',
  author: 'parliament',
  description: 'Cross-paragraph and cross-document consistency flags. Runs on Submit & Branch; expand scope to scan other chats.',
  tier: 'composer',
  slotTargets: [
    { slot: 'margin', primary: true },
    { slot: 'right-rail', fallbackOk: true },
  ],
  capabilityRequirements: ['storage:read', 'storage:write'],
  configSchema: {},
  softDependencies: [
    { component: 'document-canvas@1.0', fallbackUI: 'document-source-needed' },
  ],
  render: RippleAnalysisRender,
  previewRender: RippleAnalysisPreview,
}
