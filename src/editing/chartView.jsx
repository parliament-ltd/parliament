import { createRoot } from 'react-dom/client'
import ChartRenderer from '../components/core/ChartRenderer'

// A chart in a reply edited in place, drawn by the chart renderer every reply
// uses, from the chart's own text. One block for now (C58): struck whole, or
// not at all; the editor never reaches inside it.
export function chartView(node) {
  const figure = document.createElement('figure')
  figure.className = 'pm-chart'
  figure.setAttribute('data-block', node.attrs.id ?? '')
  figure.contentEditable = 'false'
  const root = createRoot(figure)
  root.render(<ChartRenderer data={String(node.attrs.data ?? '')} />)
  let dom = figure
  if (node.attrs.struck != null) {
    dom = document.createElement('del')
    dom.className = 'pm-blk'
    dom.setAttribute('data-edit', String(node.attrs.struck))
    dom.append(figure)
  }
  return {
    dom,
    // The chart's own drawing is not the editor's to read.
    ignoreMutation: () => true,
    update: (next) => next.type === node.type && next.attrs.data === node.attrs.data && next.attrs.struck === node.attrs.struck,
    // Unmounted after the editor's own update, never during React's.
    destroy: () => { setTimeout(() => root.unmount(), 0) },
  }
}
