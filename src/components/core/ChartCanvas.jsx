import { useState, useEffect, useMemo } from 'react'
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  ScatterChart, Scatter, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts'
import { motion } from 'framer-motion'
import { useFileShelf, SERIES_COLORS } from '../../stores/FileShelfContext'
import { useSettings } from '../../stores/SettingsContext'

/**
 * ChartCanvas — renders the active chart from real parsed file data.
 *
 * Auto-detects:
 *   - X axis: first date or string column
 *   - Y axes: first 1–3 numeric columns (each gets a series/bar)
 *
 * Users can switch chart type via the toolbar. The component re-derives
 * axes from the active file's data on every fileId change.
 */
export default function ChartCanvas({ fileId, chartType, filters }) {
  const { getParsedData, files, activeFileId } = useFileShelf()
  const activeFile = files.find(f => f.id === activeFileId) || null
  const { settings } = useSettings()
  const isDark = settings.theme === 'dark'
  const chartBg = isDark ? '#0D0B07' : '#fff'
  const chartBorder = isDark ? '#1C1914' : '#E9E9E7'
  const chartGridColor = isDark ? '#1C1914' : '#F1F1EF'
  const chartTextColor = isDark ? '#6B6963' : '#787774'
  const chartTextColor2 = isDark ? '#9B9A97' : '#787774'
  const [parsed, setParsed] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!fileId) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data blocks are reworked in stage 13
    setLoading(true)
    getParsedData(fileId).then(data => {
      setParsed(data)
      setLoading(false)
    })
  }, [fileId, getParsedData])

  const { chartData, xKey, yKeys, title } = useMemo(() => {
    if (!parsed) return { chartData: [], xKey: null, yKeys: [], title: '' }
    const { headers, rows, columnTypes } = parsed

    // Pick x-axis: first date or string column
    const xKey = headers.find(h => columnTypes[h] === 'date' || columnTypes[h] === 'string') || headers[0]

    // Pick y-axes: first 3 numeric columns (excluding x-axis)
    const yKeys = headers
      .filter(h => h !== xKey && columnTypes[h] === 'number')
      .slice(0, 3)

    // Apply filters
    let filtered = rows
    for (const f of (filters || [])) {
      filtered = filtered.filter(row => {
        if (f.op === 'in') return f.values.includes(String(row[f.column]))
        if (f.op === '=') return String(row[f.column]) === String(f.values)
        return true
      })
    }

    // Aggregate: group by xKey, sum yKeys (up to 100 data points for chart readability)
    const grouped = new Map()
    for (const row of filtered) {
      const xVal = row[xKey] ?? '-'
      if (!grouped.has(xVal)) {
        const entry = { [xKey]: xVal }
        for (const y of yKeys) entry[y] = 0
        grouped.set(xVal, entry)
      }
      const entry = grouped.get(xVal)
      for (const y of yKeys) {
        const v = parseFloat(row[y])
        if (!isNaN(v)) entry[y] += v
      }
    }

    let chartData = Array.from(grouped.values()).slice(0, 80)

    // Format x labels for readability (truncate long strings)
    chartData = chartData.map(d => ({
      ...d,
      [xKey]: String(d[xKey]).length > 12 ? String(d[xKey]).slice(0, 12) + '…' : d[xKey],
    }))

    const title = activeFile
      ? `${yKeys[0] ? yKeys[0].replace(/_/g, ' ') : 'Values'} by ${xKey.replace(/_/g, ' ')}`
      : ''

    return { chartData, xKey, yKeys, title }
  }, [parsed, filters, activeFile])

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-xs text-[#787774]"
        >
          Loading chart…
        </motion.div>
      </div>
    )
  }

  if (!parsed || chartData.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm text-[#787774]">No numeric data to chart in this file.</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-[#191919] capitalize">{title}</h2>
        <p className="text-xs text-[#787774] mt-0.5">
          {activeFile?.name} · {chartData.length} data points
          {filters?.length > 0 && ` · ${filters.length} filter${filters.length > 1 ? 's' : ''} applied`}
        </p>
      </div>

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'pie' ? (
            <PieChart>
              <Pie
                data={chartData}
                dataKey={yKeys[0]}
                nameKey={xKey}
                cx="50%"
                cy="50%"
                outerRadius="70%"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {chartData.map((_, index) => (
                  <Cell key={index} fill={SERIES_COLORS[index % SERIES_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: chartBg, border: `1px solid ${chartBorder}`, borderRadius: 8, color: chartTextColor2 }}
                wrapperStyle={{ fontSize: 11, color: chartTextColor2 }}
                formatter={(value) => [typeof value === 'number' ? value.toLocaleString() : value]}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: chartTextColor2 }} />
            </PieChart>
          ) : chartType === 'scatter' ? (
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
              <XAxis dataKey={xKey} tick={{ fontSize: 10, fill: chartTextColor }} />
              <YAxis dataKey={yKeys[0]} tick={{ fontSize: 10, fill: chartTextColor }} />
              <Tooltip
                contentStyle={{ background: chartBg, border: `1px solid ${chartBorder}`, borderRadius: 8, color: chartTextColor2 }}
                wrapperStyle={{ fontSize: 11, color: chartTextColor2 }}
              />
              <Scatter data={chartData} fill={SERIES_COLORS[0]} />
            </ScatterChart>
          ) : chartType === 'line' ? (
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
              <XAxis dataKey={xKey} tick={{ fontSize: 10, fill: chartTextColor }} />
              <YAxis tick={{ fontSize: 10, fill: chartTextColor }} />
              <Tooltip
                contentStyle={{ background: chartBg, border: `1px solid ${chartBorder}`, borderRadius: 8, color: chartTextColor2 }}
                wrapperStyle={{ fontSize: 11, color: chartTextColor2 }}
                formatter={(value) => [typeof value === 'number' ? value.toLocaleString() : value]}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: chartTextColor2 }} />
              {yKeys.map((key, i) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={SERIES_COLORS[i]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: SERIES_COLORS[i] }}
                />
              ))}
            </LineChart>
          ) : chartType === 'area' ? (
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
              <XAxis dataKey={xKey} tick={{ fontSize: 10, fill: chartTextColor }} />
              <YAxis tick={{ fontSize: 10, fill: chartTextColor }} />
              <Tooltip
                contentStyle={{ background: chartBg, border: `1px solid ${chartBorder}`, borderRadius: 8, color: chartTextColor2 }}
                wrapperStyle={{ fontSize: 11, color: chartTextColor2 }}
                formatter={(value) => [typeof value === 'number' ? value.toLocaleString() : value]}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: chartTextColor2 }} />
              {yKeys.map((key, i) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={SERIES_COLORS[i]}
                  fill={`${SERIES_COLORS[i]}20`}
                  strokeWidth={2}
                />
              ))}
            </AreaChart>
          ) : (
            /* Default: Bar */
            <BarChart data={chartData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
              <XAxis dataKey={xKey} tick={{ fontSize: 10, fill: chartTextColor }} />
              <YAxis tick={{ fontSize: 10, fill: chartTextColor }} />
              <Tooltip
                contentStyle={{ background: chartBg, border: `1px solid ${chartBorder}`, borderRadius: 8, color: chartTextColor2 }}
                wrapperStyle={{ fontSize: 11, color: chartTextColor2 }}
                formatter={(value) => [typeof value === 'number' ? value.toLocaleString() : value]}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: chartTextColor2 }} />
              {yKeys.map((key, i) => (
                <Bar key={key} dataKey={key} fill={SERIES_COLORS[i]} radius={[3, 3, 0, 0]} />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  )
}
