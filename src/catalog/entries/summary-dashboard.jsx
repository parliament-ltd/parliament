// summary-dashboard@1.0 — KPI / insights / quality dashboard for data-workspace rooms.
//
// PR-11a — fourth of the five Pelican-decomposition entries. Composer
// tier — the Generate Insights button fires a Composer-tier Claude call
// against a sample of the active dataset (Phase 1 ships zero Agent
// components, so the V1 auto-generate-on-load behavior was removed —
// users now click an explicit button per refactor/tier-classification.md).
//
// Soft dependency on file-shelf@1.0 — same contract as chart-canvas /
// table-canvas.

import { useFileShelf } from '../../stores/FileShelfContext'
import { useChat } from '../../stores/ChatContext'
import SummaryDashboard from '../../components/core/SummaryDashboard'

function SummaryDashboardRender({ config = {} }) {
  const { activeFileId } = useFileShelf()
  const { activeConversationId } = useChat()
  void config
  return (
    <div className="px-5 py-4 border-t border-[var(--p-border)]">
      <SummaryDashboard fileId={activeFileId} conversationId={activeConversationId} />
    </div>
  )
}

function SummaryDashboardPreview() {
  return (
    <div className="border border-[var(--p-border)] rounded-xl bg-white p-4 max-w-md">
      <div className="text-[10px] font-medium text-[#787774] uppercase tracking-wider mb-3">Summary preview</div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        {['Rows', 'Avg revenue', 'Unique', 'Completeness'].map((label, i) => (
          <div key={label} className="px-3 py-2 bg-[#FAFAFA] rounded-lg">
            <div className="text-[9px] text-[#787774] uppercase tracking-wider">{label}</div>
            <div className="text-base font-semibold text-[#191919] mt-0.5">{['12,480', '$4,210', '34', '98%'][i]}</div>
          </div>
        ))}
      </div>
      <div className="text-[10px] text-[#787774] italic">
        Preview only. Click "Generate insights" in the live render to query Claude.
      </div>
    </div>
  )
}

export default {
  name: 'summary-dashboard',
  version: '1.0',
  displayName: 'Summary dashboard',
  author: 'parliament',
  description: 'KPI cards, AI-generated insights (on click), distributions, and data-quality flags for the active dataset.',
  icon: 'Gauge',
  surfaces: ['room'],
  tier: 'composer',
  slotTargets: [
    { slot: 'canvas', primary: true },
    { slot: 'msg-area', fallbackOk: true },
  ],
  capabilityRequirements: ['storage:read'],
  configSchema: {
    sampleRows: {
      type: 'number',
      default: 50,
      label: 'Rows sampled per Claude insight call',
    },
  },
  softDependencies: [
    { component: 'file-shelf@1.0', fallbackUI: 'data-source-needed' },
  ],
  render: SummaryDashboardRender,
  previewRender: SummaryDashboardPreview,
}
