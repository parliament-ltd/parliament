import { lazy, Suspense, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BarChart3, Table2, Layers, Maximize2, Download } from 'lucide-react'
import { usePelican } from '../../../stores/PelicanContext'
import { SPRING_SMOOTH, SPRING_SNAPPY, SPRING_GENTLE, getContextColor } from '../../../lib/constants'
import EmptyCanvas from './EmptyCanvas'

// Lazy-load heavy canvas components — part of Pelican's code-split chunk
const ChartCanvas  = lazy(() => import('./ChartCanvas'))
const TableCanvas  = lazy(() => import('./TableCanvas'))
const SummaryDashboard = lazy(() => import('./SummaryDashboard'))

const CHART_TYPES = [
  { id: 'bar',     label: 'Bar' },
  { id: 'line',    label: 'Line' },
  { id: 'area',    label: 'Area' },
  { id: 'scatter', label: 'Scatter' },
  { id: 'pie',     label: 'Pie' },
]

const CANVAS_TABS = [
  { id: 'chart',   label: 'Chart',   Icon: BarChart3 },
  { id: 'table',   label: 'Table',   Icon: Table2 },
  { id: 'summary', label: 'Summary', Icon: Layers },
]

export default function DataCanvas({ conversationId, contextUsage, contextThreshold }) {
  const {
    files, activeFileId,
    canvasView, setCanvasView,
    activeChart, setActiveChart,
    sortColumn, sortDir, handleSort,
    activeFilters,
  } = usePelican()

  const fileInputRef = useRef(null)
  const hasData = files.length > 0

  const contextColor = getContextColor(contextUsage, contextThreshold)

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Toolbar */}
      <div
        className="flex items-center justify-between px-5 py-3 flex-shrink-0 plcn-canvas-bar"
        style={{ borderBottom: '1px solid #F1F1EF' }}
      >
        {/* View tabs */}
        <div className="flex items-center gap-1">
          {CANVAS_TABS.map(({ id, label, Icon }) => {
            const active = canvasView === id
            return (
              <motion.button
                key={id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setCanvasView(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  active
                    ? 'bg-[#B8A070]/10 text-[#B8A070]'
                    : 'text-[#787774] hover:text-[#191919] hover:bg-[#FAFAFA]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </motion.button>
            )
          })}
        </div>

        {/* Right toolbar controls */}
        <div className="flex items-center gap-2">
          {/* Chart type selector — only visible on chart view */}
          <AnimatePresence>
            {canvasView === 'chart' && hasData && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={SPRING_SNAPPY}
                className="flex items-center gap-0.5 px-1 py-0.5 border border-[#E9E9E7] rounded-lg overflow-hidden"
              >
                {CHART_TYPES.map(({ id, label }) => (
                  <motion.button
                    key={id}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => setActiveChart(id)}
                    className={`px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${
                      activeChart === id
                        ? 'bg-[#B8A070]/10 text-[#B8A070]'
                        : 'text-[#787774] hover:text-[#191919]'
                    }`}
                    title={label}
                  >
                    {label}
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {hasData && (
            <>
              <div className="w-px h-5 bg-[#F1F1EF]" />
              {/* Context health meter */}
              <div className="flex items-center gap-2 px-2">
                <div className="w-20 h-1.5 bg-[#F1F1EF] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${contextUsage}%` }}
                    transition={{ ...SPRING_GENTLE, delay: 0.3 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: contextColor }}
                  />
                </div>
                <span
                  className="text-[10px] font-medium tabular-nums"
                  style={{ color: contextColor }}
                >
                  {contextUsage}%
                </span>
              </div>
            </>
          )}

          <div className="w-px h-5 bg-[#F1F1EF]" />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-1.5 rounded-lg text-[#787774] hover:text-[#191919] hover:bg-[#FAFAFA] transition-colors"
            title="Fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-1.5 rounded-lg text-[#787774] hover:text-[#191919] hover:bg-[#FAFAFA] transition-colors"
            title="Download"
          >
            <Download className="w-4 h-4" />
          </motion.button>
        </div>
      </div>

      {/* Canvas content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {!hasData ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={SPRING_SMOOTH}
              className="h-full"
            >
              <EmptyCanvas onBrowse={() => fileInputRef.current?.click()} />
            </motion.div>
          ) : canvasView === 'chart' ? (
            <motion.div
              key="chart"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={SPRING_SMOOTH}
              className="h-full p-6"
            >
              <Suspense fallback={<CanvasLoader />}>
                <ChartCanvas
                  fileId={activeFileId}
                  chartType={activeChart}
                  filters={activeFilters}
                />
              </Suspense>
            </motion.div>
          ) : canvasView === 'table' ? (
            <motion.div
              key="table"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={SPRING_SMOOTH}
              className="h-full"
            >
              <Suspense fallback={<CanvasLoader />}>
                <TableCanvas
                  fileId={activeFileId}
                  sortColumn={sortColumn}
                  sortDir={sortDir}
                  onSort={handleSort}
                  filters={activeFilters}
                />
              </Suspense>
            </motion.div>
          ) : (
            <motion.div
              key="summary"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={SPRING_SMOOTH}
              className="h-full overflow-y-auto p-6"
              style={{ scrollbarWidth: 'thin', scrollbarColor: '#E9E9E7 transparent' }}
            >
              <Suspense fallback={<CanvasLoader />}>
                <SummaryDashboard fileId={activeFileId} conversationId={conversationId} />
              </Suspense>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function CanvasLoader() {
  return (
    <div className="h-full flex items-center justify-center">
      <motion.div
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="text-xs text-[#787774]"
      >
        Loading…
      </motion.div>
    </div>
  )
}
