import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, AlertCircle, CheckCircle, Sparkles, ArrowUpRight } from 'lucide-react'
import { useFileShelf } from '../../stores/FileShelfContext'
import { useSettings } from '../../stores/SettingsContext'
import { getProvider } from '../../providers'
import { loadApiKey } from '../../lib/crypto'
import { buildDataSample } from '../../lib/fileParser'
import { SPRING_SMOOTH, SPRING_GENTLE } from '../../lib/constants'

/**
 * SummaryDashboard — KPI cards, AI-generated insights, distributions, data quality.
 *
 * On first load with a new fileId, calls Claude to generate insights from a
 * data sample (first 50 rows as CSV text + schema). Results are cached in
 * component state for the session — switching away and back reuses the cache.
 *
 * The `onAskAbout` callback pre-populates the compact chat input in InspectorPanel
 * when the user clicks "Ask about this" on an insight card.
 */

// ── Insight icon map ───────────────────────────────────────
const INSIGHT_ICONS = {
  warning: AlertCircle,
  trend:   TrendingUp,
  good:    CheckCircle,
}
const INSIGHT_COLORS = {
  warning: '#D9730D',
  trend:   '#B8A070',
  good:    '#0F7B6C',
}

export default function SummaryDashboard({ fileId, conversationId, onAskAbout }) {
  void conversationId
  const { getParsedData, files, activeFileId } = useFileShelf()
  const activeFile = files.find(f => f.id === activeFileId) || null
  const { settings } = useSettings()

  const [parsed, setParsed] = useState(null)
  const [loadingData, setLoadingData] = useState(false)

  // AI insights state
  const [insights, setInsights] = useState(null)   // null = not yet generated
  const [kpis, setKpis] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [insightError, setInsightError] = useState(null)

  // Load parsed data
  useEffect(() => {
    if (!fileId) return
    setLoadingData(true)
    // Reset AI state when file changes
    setInsights(null)
    setKpis(null)
    setInsightError(null)
    getParsedData(fileId).then(data => {
      setParsed(data)
      setLoadingData(false)
    })
  }, [fileId, getParsedData])

  // PR-11a: removed the auto-generate-on-data-load effect. V1 Pelican fired
  // a Claude call automatically the first time a user landed on the Summary
  // tab — that's an autonomous model call (Agent tier per
  // refactor/tier-classification.md), and Phase 1 ships zero Agent
  // components. The generation now waits for an explicit "Generate
  // insights" click; KPIs / quality / distributions still render against
  // the parsed-data sample once it's loaded but stay empty until clicked.

  const generateInsights = useCallback(async (data) => {
    setGenerating(true)
    setInsightError(null)
    try {
      const apiKey = await loadApiKey()
      if (!apiKey) throw new Error('No API key configured')

      const sample = buildDataSample(data.headers, data.rows, 50)
      const schemaDesc = data.headers.map(h =>
        `${h} (${data.columnTypes[h] || 'string'})`
      ).join(', ')

      const prompt = `You are a data analyst. Analyze this dataset and return a JSON object.

Dataset: ${activeFile?.name || 'file'}
Schema: ${schemaDesc}
Row count: ${data.rows.length}

Sample data (first 50 rows in CSV format):
${sample}

Return ONLY valid JSON with this exact structure:
{
  "kpis": [
    { "label": "string", "value": "string", "change": "string or null", "positive": true/false/null }
  ],
  "insights": [
    { "type": "warning|trend|good", "text": "string (1-2 sentences)", "question": "string (follow-up question)" }
  ],
  "distributions": [
    { "title": "string", "items": [{ "label": "string", "value": number (0-100 percent) }] }
  ],
  "quality": {
    "completeness": number (0-100),
    "duplicates": number,
    "dateRange": "string or null"
  }
}

Rules:
- kpis: 3-4 most important metrics, using real computed values from the data
- insights: 2-3 observations (mix of warning/trend/good)
- distributions: 1-2 breakdowns showing % shares (values must sum to ~100)
- quality: estimate completeness from null counts, count exact duplicate rows
- Return ONLY the JSON object, no markdown, no explanation`

      const provider = getProvider('anthropic')
      let responseText = ''
      await provider.sendMessage(
        apiKey,
        [{ role: 'user', content: prompt }],
        settings.defaultModel,
        (chunk) => { responseText += chunk },
        null,
        null
      )

      // Extract JSON from response (strip any accidental markdown fences)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Invalid response format')
      const result = JSON.parse(jsonMatch[0])

      setKpis(result.kpis || [])
      setInsights({ insights: result.insights || [], distributions: result.distributions || [], quality: result.quality || null })
    } catch (err) {
      setInsightError(err.message || 'Failed to generate insights')
    } finally {
      setGenerating(false)
    }
  }, [activeFile, settings.defaultModel])

  if (loadingData) {
    return <DashboardSkeleton />
  }

  if (!parsed) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-[#787774]">No data loaded.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">

      {/* KPI Cards */}
      <section>
        <h3 className="text-xs font-medium text-[#787774] uppercase tracking-wider mb-3">Key Metrics</h3>
        {kpis ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {kpis.map((kpi, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...SPRING_SMOOTH, delay: i * 0.06 }}
                className="px-4 py-3.5 bg-white border border-[#E9E9E7] rounded-xl"
              >
                <div className="text-[10px] text-[#787774] uppercase tracking-wider">{kpi.label}</div>
                <div className="text-xl font-semibold text-[#191919] mt-1">{kpi.value}</div>
                {kpi.change && (
                  <div className={`text-[11px] font-medium mt-1 flex items-center gap-1 ${
                    kpi.positive === true ? 'text-[#0F7B6C]'
                    : kpi.positive === false ? 'text-[#E03E3E]'
                    : 'text-[#787774]'
                  }`}>
                    <TrendingUp className={`w-3 h-3 ${kpi.positive === false ? 'rotate-180' : ''}`} />
                    {kpi.change}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <KPISkeleton generating={generating} />
        )}
      </section>

      {/* AI Insights */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-medium text-[#787774] uppercase tracking-wider">AI Insights</h3>
          {insights && !generating && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => parsed && generateInsights(parsed)}
              className="text-[10px] text-[#B8A070] font-medium hover:underline"
            >
              Regenerate
            </motion.button>
          )}
          {insightError && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => parsed && generateInsights(parsed)}
              className="text-[10px] text-[#B8A070] font-medium hover:underline"
            >
              Retry
            </motion.button>
          )}
        </div>

        {insightError ? (
          <div className="px-4 py-3 bg-[#E03E3E]/5 border border-[#E03E3E]/15 rounded-xl">
            <p className="text-xs text-[#E03E3E]">{insightError}</p>
          </div>
        ) : generating ? (
          <InsightSkeleton generating />
        ) : !insights ? (
          <motion.button
            whileHover={{ scale: 1.01, borderColor: '#B8A070' }}
            whileTap={{ scale: 0.99 }}
            onClick={() => parsed && generateInsights(parsed)}
            disabled={!parsed}
            className="w-full px-4 py-3 rounded-xl border border-dashed border-[#B8A070]/35 bg-white text-left flex items-center gap-3 transition-colors disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 text-[#B8A070] flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-[#191919]">Generate insights with Claude</div>
              <div className="text-[10px] text-[#787774] mt-0.5">
                Sends a sample of this dataset to Claude for KPI suggestions, trend callouts, and quality flags.
              </div>
            </div>
          </motion.button>
        ) : (
          <div className="space-y-2">
            {insights.insights.map((insight, i) => {
              const Icon = INSIGHT_ICONS[insight.type] || TrendingUp
              const color = INSIGHT_COLORS[insight.type] || '#787774'
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...SPRING_SMOOTH, delay: i * 0.08 }}
                  className="px-4 py-3 bg-white border border-[#E9E9E7] rounded-xl"
                >
                  <div className="flex items-start gap-3">
                    <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[#787774] leading-relaxed">{insight.text}</p>
                      {insight.question && onAskAbout && (
                        <motion.button
                          whileHover={{ scale: 1.02, x: 2 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => onAskAbout(insight.question)}
                          className="mt-2 flex items-center gap-1.5 text-[10px] font-medium text-[#B8A070] hover:text-[#a0906a] transition-colors"
                        >
                          <ArrowUpRight className="w-3 h-3" />
                          Ask about this
                        </motion.button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </section>

      {/* Distributions */}
      {insights?.distributions?.length > 0 && (
        <section>
          <h3 className="text-xs font-medium text-[#787774] uppercase tracking-wider mb-3">Distributions</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {insights.distributions.map((dist, i) => (
              <DistributionCard key={i} title={dist.title} items={dist.items} />
            ))}
          </div>
        </section>
      )}

      {/* Data Quality */}
      {insights?.quality && (
        <section>
          <h3 className="text-xs font-medium text-[#787774] uppercase tracking-wider mb-3">Data Quality</h3>
          <div className="px-4 py-3 bg-white border border-[#E9E9E7] rounded-xl">
            <div className="grid grid-cols-3 gap-4">
              <QualityItem
                label="Completeness"
                value={`${insights.quality.completeness?.toFixed(1) ?? '-'}%`}
                color={insights.quality.completeness >= 95 ? '#0F7B6C' : insights.quality.completeness >= 80 ? '#D9730D' : '#E03E3E'}
              />
              <QualityItem
                label="Duplicates"
                value={insights.quality.duplicates === 0 ? '0' : String(insights.quality.duplicates)}
                color={insights.quality.duplicates === 0 ? '#0F7B6C' : '#D9730D'}
              />
              <QualityItem
                label="Date Range"
                value={insights.quality.dateRange || '-'}
                color="#191919"
              />
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────

function DistributionCard({ title, items }) {
  const DIST_COLORS = ['#B8A070', '#0F7B6C', '#D9730D', '#787774', '#E03E3E']
  return (
    <div className="px-4 py-3.5 bg-white border border-[#E9E9E7] rounded-xl">
      <div className="text-[11px] font-medium text-[#191919] mb-3">{title}</div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={item.label} className="flex items-center gap-2">
            <span className="text-[10px] text-[#787774] w-16 truncate">{item.label}</span>
            <div className="flex-1 h-2 bg-[#F1F1EF] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(item.value, 100)}%` }}
                transition={{ ...SPRING_GENTLE, delay: 0.2 + i * 0.05 }}
                className="h-full rounded-full"
                style={{ backgroundColor: DIST_COLORS[i % DIST_COLORS.length] }}
              />
            </div>
            <span className="text-[10px] font-medium text-[#191919] w-8 text-right tabular-nums">
              {item.value?.toFixed(0) ?? 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function QualityItem({ label, value, color }) {
  return (
    <div>
      <div className="text-[10px] text-[#787774]">{label}</div>
      <div className="text-sm font-semibold mt-0.5" style={{ color }}>{value}</div>
    </div>
  )
}

// ─── Skeleton states ──────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="grid grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="px-4 py-3.5 bg-white border border-[#E9E9E7] rounded-xl h-20 animate-pulse bg-[#F1F1EF]" />
        ))}
      </div>
    </div>
  )
}

function KPISkeleton({ generating }) {
  return (
    <div className="grid grid-cols-4 gap-3">
      {[...Array(4)].map((_, i) => (
        <motion.div
          key={i}
          animate={generating ? { opacity: [0.5, 1, 0.5] } : { opacity: 0.5 }}
          transition={{ duration: 1.5, repeat: generating ? Infinity : 0, delay: i * 0.1 }}
          className="px-4 py-3.5 bg-[#F1F1EF] rounded-xl h-20"
        />
      ))}
    </div>
  )
}

function InsightSkeleton({ generating }) {
  return (
    <div className="space-y-2">
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          animate={generating ? { opacity: [0.4, 0.8, 0.4] } : { opacity: 0.4 }}
          transition={{ duration: 1.5, repeat: generating ? Infinity : 0, delay: i * 0.2 }}
          className="px-4 py-3 bg-[#F1F1EF] rounded-xl h-16"
        />
      ))}
      {generating && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 px-1 pt-1"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#B8A070]" />
          </motion.div>
          <span className="text-[11px] text-[#787774]">Generating insights…</span>
        </motion.div>
      )}
    </div>
  )
}
