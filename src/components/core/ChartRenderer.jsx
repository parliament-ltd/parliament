/**
 * ChartRenderer — renders bar/line/area/pie charts from structured JSON data.
 * No external dependencies; uses React + SVG.
 *
 * Expected data shape (matches CREATE_CHART_TOOL input_schema):
 * {
 *   type: 'bar' | 'line' | 'area' | 'pie',
 *   title?: string,
 *   labels: string[],
 *   datasets: Array<{ label?: string, values: number[] }>
 * }
 */

const COLORS = ['#4A7AE5', '#7C6CD4', '#22C55E', '#E5A620', '#EF4444', '#06B6D4', '#F97316']

const PAD = { top: 24, right: 20, bottom: 44, left: 50 }
const W = 480
const H = 220
const CW = W - PAD.left - PAD.right
const CH = H - PAD.top - PAD.bottom

function yTicks(maxVal, count = 4) {
  const step = maxVal / count
  return Array.from({ length: count + 1 }, (_, i) => ({
    val: step * i,
    y: CH - (step * i / maxVal) * CH,
  }))
}

function shorten(str, max = 10) {
  return str.length > max ? str.slice(0, max) + '…' : str
}

/* ── Bar chart ───────────────────────────────────────────── */

function BarChart({ labels, datasets }) {
  const allVals = datasets.flatMap(d => d.values)
  const maxVal = Math.max(...allVals, 1)
  const ticks = yTicks(maxVal)
  const groupW = CW / labels.length
  const nSeries = datasets.length
  const barW = Math.max(4, (groupW / nSeries) * 0.72)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
      <g transform={`translate(${PAD.left},${PAD.top})`}>
        {ticks.map(({ val, y }) => (
          <g key={val}>
            <line x1={0} y1={y} x2={CW} y2={y} stroke="#F0F0F0" strokeWidth={1} />
            <text x={-8} y={y + 4} textAnchor="end" fontSize={10} fill="#9CA7B8">{Math.round(val)}</text>
          </g>
        ))}
        {datasets.map((ds, di) =>
          ds.values.map((val, li) => {
            const bh = Math.max(1, (val / maxVal) * CH)
            const x = li * groupW + (groupW - nSeries * barW) / 2 + di * barW
            return (
              <rect
                key={`${di}-${li}`}
                x={x} y={CH - bh} width={barW} height={bh}
                fill={COLORS[di % COLORS.length]} rx={2} opacity={0.85}
              />
            )
          })
        )}
        {labels.map((lbl, i) => (
          <text key={i} x={i * groupW + groupW / 2} y={CH + 16}
            textAnchor="middle" fontSize={10} fill="#6B7C93">
            {shorten(lbl)}
          </text>
        ))}
      </g>
    </svg>
  )
}

/* ── Line / Area chart ───────────────────────────────────── */

function LineChart({ labels, datasets, filled = false }) {
  const allVals = datasets.flatMap(d => d.values)
  const maxVal = Math.max(...allVals, 1)
  const ticks = yTicks(maxVal)
  const stepX = CW / Math.max(labels.length - 1, 1)

  const points = (values) =>
    values.map((v, i) => [i * stepX, CH - (v / maxVal) * CH])

  const toPolyline = (pts) => pts.map(p => p.join(',')).join(' ')

  const toAreaPath = (pts) =>
    `M${pts[0][0]},${CH} ` +
    pts.map(p => `L${p[0]},${p[1]}`).join(' ') +
    ` L${pts[pts.length - 1][0]},${CH} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
      <defs>
        {datasets.map((_, di) => (
          <linearGradient key={di} id={`ag${di}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS[di % COLORS.length]} stopOpacity={0.3} />
            <stop offset="100%" stopColor={COLORS[di % COLORS.length]} stopOpacity={0.03} />
          </linearGradient>
        ))}
      </defs>
      <g transform={`translate(${PAD.left},${PAD.top})`}>
        {ticks.map(({ val, y }) => (
          <g key={val}>
            <line x1={0} y1={y} x2={CW} y2={y} stroke="#F0F0F0" strokeWidth={1} />
            <text x={-8} y={y + 4} textAnchor="end" fontSize={10} fill="#9CA7B8">{Math.round(val)}</text>
          </g>
        ))}
        {datasets.map((ds, di) => {
          const pts = points(ds.values)
          const color = COLORS[di % COLORS.length]
          return (
            <g key={di}>
              {filled && (
                <path d={toAreaPath(pts)} fill={`url(#ag${di})`} />
              )}
              <polyline
                points={toPolyline(pts)}
                fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round"
              />
              {pts.map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r={3} fill={color} />
              ))}
            </g>
          )
        })}
        {labels.map((lbl, i) => (
          <text key={i} x={i * stepX} y={CH + 16}
            textAnchor={i === 0 ? 'start' : i === labels.length - 1 ? 'end' : 'middle'}
            fontSize={10} fill="#6B7C93">
            {shorten(lbl)}
          </text>
        ))}
      </g>
    </svg>
  )
}

/* ── Pie chart ───────────────────────────────────────────── */

function PieChart({ labels, datasets }) {
  const values = datasets[0]?.values ?? []
  const total = values.reduce((s, v) => s + v, 0) || 1
  const cx = W / 2
  const cy = H / 2
  const r = Math.min(W, H) / 2 - 24

  let cumAngle = -Math.PI / 2
  const slices = values.map((v, i) => {
    const angle = (v / total) * 2 * Math.PI
    const start = cumAngle
    cumAngle += angle
    const mid = start + angle / 2
    const x1 = cx + r * Math.cos(start)
    const y1 = cy + r * Math.sin(start)
    const x2 = cx + r * Math.cos(cumAngle)
    const y2 = cy + r * Math.sin(cumAngle)
    const large = angle > Math.PI ? 1 : 0
    const lx = cx + (r + 20) * Math.cos(mid)
    const ly = cy + (r + 20) * Math.sin(mid)
    return { x1, y1, x2, y2, large, lx, ly, mid, color: COLORS[i % COLORS.length], label: labels[i], pct: Math.round((v / total) * 100) }
  })

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
      {slices.map((s, i) => (
        <g key={i}>
          <path
            d={`M${cx},${cy} L${s.x1},${s.y1} A${r},${r} 0 ${s.large},1 ${s.x2},${s.y2} Z`}
            fill={s.color} opacity={0.85} stroke="white" strokeWidth={1.5}
          />
          {s.pct > 4 && (
            <text x={s.lx} y={s.ly} textAnchor="middle" fontSize={10} fill="#6B7C93" dominantBaseline="middle">
              {shorten(s.label, 8)} {s.pct}%
            </text>
          )}
        </g>
      ))}
    </svg>
  )
}

/* ── Main component ──────────────────────────────────────── */

export default function ChartRenderer({ data }) {
  let parsed
  try {
    parsed = typeof data === 'string' ? JSON.parse(data) : data
  } catch {
    return <p className="text-xs text-[#EF4444]">Invalid chart data</p>
  }

  const { type, title, labels = [], datasets = [] } = parsed
  if (!datasets.length || !labels.length) {
    return <p className="text-xs text-[#6B7C93]">No chart data</p>
  }

  return (
    <div className="my-3 rounded-xl border border-[#EBEBEB] bg-white overflow-hidden">
      {title && (
        <p className="px-4 pt-3 pb-1 text-xs font-semibold text-[#1E2532]">{title}</p>
      )}
      <div className="px-2 pb-2">
        {type === 'bar'  && <BarChart  labels={labels} datasets={datasets} />}
        {type === 'line' && <LineChart labels={labels} datasets={datasets} />}
        {type === 'area' && <LineChart labels={labels} datasets={datasets} filled />}
        {type === 'pie'  && <PieChart  labels={labels} datasets={datasets} />}
      </div>
      {datasets.length > 1 && (
        <div className="flex flex-wrap gap-3 px-4 pb-3">
          {datasets.map((ds, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              <span className="text-[11px] text-[#6B7C93]">{ds.label || `Series ${i + 1}`}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
