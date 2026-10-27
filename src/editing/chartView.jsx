import { createRoot } from 'react-dom/client'
import ChartRenderer from '../components/core/ChartRenderer'
import { chartNow } from './charts'

// A chart in a reply edited in place (piece 6; C222 (f)): the drawing, made
// by the chart renderer every reply uses from the chart's numbers as they
// read now; then its title and its numbers, which the editor edits like any
// line and table. The drawing is redrawn after every change and is never
// the editor's to read. A row left out of the drawing is named under it.

const KIND_WORD = { bar: 'Bar chart', line: 'Line chart', area: 'Area chart', pie: 'Pie chart' }

export function chartView(node) {
  const figure = document.createElement('figure')
  figure.className = 'pm-chart'
  figure.setAttribute('data-block', node.attrs.id ?? '')
  const draw = document.createElement('div')
  draw.className = 'pm-chart-draw'
  draw.contentEditable = 'false'
  const said = document.createElement('p')
  said.className = 'pm-chart-said'
  said.contentEditable = 'false'
  const parts = document.createElement('div')
  parts.className = 'pm-chart-parts'
  figure.append(draw, said, parts)
  const root = createRoot(draw)
  let dom = figure
  if (node.attrs.struck != null) {
    dom = document.createElement('del')
    dom.className = 'pm-blk'
    dom.setAttribute('data-edit', String(node.attrs.struck))
    dom.append(figure)
  }
  let drawn = null
  const paint = (n) => {
    const now = chartNow(n)
    const text = JSON.stringify(now.data)
    if (text !== drawn) {
      drawn = text
      root.render(<ChartRenderer data={text} />)
    }
    // Text only, never markup.
    const kind = KIND_WORD[n.attrs.kind] ?? 'Chart'
    const left = now.left.length ? ` Left out of the drawing, as a value there is missing or not a number: ${now.left.join(', ')}.` : ''
    said.textContent = `${kind}${n.attrs.kindEdit != null ? ' (yours)' : ''}. The title and numbers below are edited like any text; / in a cell changes the kind.${left}`
  }
  paint(node)
  return {
    dom,
    contentDOM: parts,
    update: (next) => {
      if (next.type !== node.type || next.attrs.struck !== node.attrs.struck) return false
      node = next
      paint(next)
      return true
    },
    // The drawing and the line under it are the view's own.
    ignoreMutation: (m) => m.type !== 'selection' && (draw.contains(m.target) || said.contains(m.target)),
    stopEvent: (e) => draw.contains(e.target) || said.contains(e.target),
    // Unmounted after the editor's own update, never during React's.
    destroy: () => { setTimeout(() => root.unmount(), 0) },
  }
}
