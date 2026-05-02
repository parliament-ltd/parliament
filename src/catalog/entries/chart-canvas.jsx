// chart-canvas@1.0 — recharts-backed chart visualization for data-workspace rooms.
//
// PR-11a — second of the five Pelican-decomposition entries. Reader
// tier: no model calls, no IndexedDB writes. Reads the active file's
// parsed data via FileShelfContext and renders bar / line / area /
// scatter / pie depending on `chartType` config.
//
// Soft dependency on file-shelf@1.0: when a room mounts chart-canvas
// without a file-shelf, RoomShell substitutes the data-source-needed
// empty state. Prevents the canvas from rendering against an
// uninitialized FileShelfContext (which would just render "No data" but
// without explaining why).

import { useFileShelf } from '../../stores/FileShelfContext'
import ChartCanvas from '../../components/core/ChartCanvas'

const CHART_TYPES = ['bar', 'line', 'area', 'scatter', 'pie']

function ChartCanvasRender({ config = {} }) {
  const { activeFileId } = useFileShelf()
  const chartType = CHART_TYPES.includes(config.chartType) ? config.chartType : 'bar'
  return (
    <div className="px-5 py-4 min-h-[360px] flex flex-col">
      <ChartCanvas fileId={activeFileId} chartType={chartType} filters={[]} />
    </div>
  )
}

function ChartCanvasPreview() {
  return (
    <div className="border border-[var(--p-border)] rounded-xl bg-white p-4 max-w-md">
      <div className="text-[10px] font-medium text-[#787774] uppercase tracking-wider mb-3">Chart preview</div>
      <div className="h-32 flex items-end gap-1 px-2">
        {[60, 80, 50, 90, 70, 95, 65].map((h, i) => (
          <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, backgroundColor: '#B8A070' }} />
        ))}
      </div>
      <div className="text-[10px] text-[#787774] italic mt-2">
        Preview only — production render binds to FileShelfContext.
      </div>
    </div>
  )
}

export default {
  name: 'chart-canvas',
  version: '1.0',
  displayName: 'Chart canvas',
  author: 'parliament',
  description: 'Auto-detected charts (bar / line / area / scatter / pie) over the active dataset.',
  tier: 'reader',
  slotTargets: [
    { slot: 'canvas', primary: true },
    { slot: 'msg-area', fallbackOk: true },
  ],
  capabilityRequirements: ['storage:read'],
  configSchema: {
    chartType: {
      type: 'enum',
      options: CHART_TYPES,
      default: 'bar',
      label: 'Default chart type',
    },
  },
  softDependencies: [
    { component: 'file-shelf@1.0', fallbackUI: 'data-source-needed' },
  ],
  render: ChartCanvasRender,
  previewRender: ChartCanvasPreview,
}
