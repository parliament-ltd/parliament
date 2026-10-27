// Charts edited inside (stage 11, piece 6; C222 (f), ruled 26 October).
//
// A chart in a reply is its title, a line of text, and the numbers behind
// it, a table edited like any table: a row for each label, a column for each
// series, the header row naming the series. Its kind (bar, line, area, pie)
// is chosen from /. The drawing is made from the numbers as they read now:
// struck words leave it, the person's join it. What the model gave stays on
// the chart, unchanged (`data`), beside what the person made of it.

import { schema } from './schema'

export const KINDS = Object.freeze(['bar', 'line', 'area', 'pie'])

/** What the model gave, read as a chart's data, or null. Text only, numbers only. */
export function readChartData(data) {
  let parsed
  try {
    parsed = typeof data === 'string' ? JSON.parse(data) : data
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object') return null
  const labels = Array.isArray(parsed.labels) ? parsed.labels.map((l) => String(l ?? '')) : []
  const datasets = (Array.isArray(parsed.datasets) ? parsed.datasets : [])
    .filter((d) => d && typeof d === 'object' && Array.isArray(d.values))
    .map((d, i) => ({ label: typeof d.label === 'string' && d.label ? d.label : `Series ${i + 1}`, values: d.values.map((v) => (typeof v === 'number' && Number.isFinite(v) ? v : null)) }))
  return {
    type: KINDS.includes(parsed.type) ? parsed.type : 'bar',
    title: typeof parsed.title === 'string' ? parsed.title : '',
    labels,
    datasets,
  }
}

const text = (s) => (s ? schema.text(String(s)) : null)
const numberText = (v) => (v == null ? '' : String(v))

/**
 * A chart's title and table, made from what the model gave.
 * @param {string} data the chart's own text
 * @param {() => string} nextId ids for the title and each cell
 * @returns {{ title: import('prosemirror-model').Node, table: import('prosemirror-model').Node, kind: string }}
 */
export function chartParts(data, nextId) {
  const d = readChartData(data) ?? { type: 'bar', title: '', labels: [], datasets: [] }
  const cell = (words, header = false) => schema.nodes.table_cell.create({ id: nextId(), header }, text(words))
  const head = schema.nodes.table_row.create(null, [cell('', true), ...(d.datasets.length ? d.datasets : [{ label: 'Value' }]).map((s) => cell(s.label, true))])
  const rows = d.labels.map((label, i) => schema.nodes.table_row.create(null, [
    cell(label),
    ...(d.datasets.length ? d.datasets : [{ values: [] }]).map((s) => cell(numberText(s.values[i]))),
  ]))
  return {
    title: schema.nodes.chart_title.create({ id: nextId() }, text(d.title)),
    table: schema.nodes.table.create({ id: nextId() }, [head, ...rows]),
    kind: d.type,
  }
}

/** A chart node made from what the model gave. */
export function chartFrom(data, attrs, nextId) {
  const parts = chartParts(data, nextId)
  return schema.nodes.chart.create({ ...attrs, data: String(data ?? ''), kind: parts.kind }, [parts.title, parts.table])
}

// A line's words as they read now: struck words left out.
function wordsNow(node) {
  let out = ''
  node?.forEach((child) => {
    if (child.isText && !child.marks.some((m) => m.type.name === 'struck' || m.type.name === 'answer')) out += child.text
  })
  return out.replace(/\s+/g, ' ').trim()
}

/** A number as a person writes one: 120, -3.5, 1,200, 3,5. null if it is not one. */
export function readNumber(words) {
  const t = String(words ?? '').replace(/[\s_]/g, '')
  if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(t)) return Number(t.replace(/,/g, ''))
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t)
  if (/^-?\d+,\d+$/.test(t)) return Number(t.replace(',', '.'))
  return null
}

/**
 * What the drawing shows: the chart's numbers as they read now. A row or
 * column struck whole is left out; a row whose value is missing or not a
 * number is left out too, and named in `left`.
 * @returns {{ data: { type: string, title: string, labels: string[], datasets: Array<{ label: string, values: number[] }> }, left: string[] }}
 */
export function chartNow(node) {
  const title = node.firstChild
  const table = node.lastChild
  const kind = KINDS.includes(node.attrs.kind) ? node.attrs.kind : 'bar'
  const empty = { data: { type: kind, title: wordsNow(title), labels: [], datasets: [] }, left: [] }
  if (!table || table.type !== schema.nodes.table || !table.childCount) return empty
  const head = table.firstChild
  const series = []
  head.forEach((c, _at, j) => { if (j > 0 && c.attrs.struck == null) series.push({ j, label: wordsNow(c) || `Series ${j}` }) })
  const labels = []
  const values = series.map(() => [])
  const left = []
  for (let r = 1; r < table.childCount; r++) {
    const row = table.child(r)
    const first = row.firstChild
    if (!first || first.attrs.struck != null) continue
    const label = wordsNow(first)
    const nums = series.map((s) => {
      const c = row.maybeChild(s.j)
      return c && c.attrs.struck == null ? readNumber(wordsNow(c)) : null
    })
    if (nums.some((n) => n == null)) {
      left.push(label || `row ${r}`)
      continue
    }
    labels.push(label)
    nums.forEach((n, k) => values[k].push(n))
  }
  return {
    data: { type: kind, title: wordsNow(title), labels, datasets: series.map((s, k) => ({ label: s.label, values: values[k] })) },
    left,
  }
}
