// Stage 11 spike (C205): a reply's Markdown, as stored today, read into the
// blocks of schema.js. The stored text is never changed: the editable form is
// made from it, and the model goes on reading the original (editing spec,
// "When edits reach the model"; refactor-plan.md stage 2).
//
// unified and remark-parse arrive with react-markdown, which the app already
// uses to draw replies; a real build would name them as its own dependencies.

import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import { schema, safeHref } from './schema'

const parser = unified().use(remarkParse).use(remarkGfm)

// Every text the model wrote, flattened: for table cells and anything with no
// place of its own.
function plain(node) {
  if (node.type === 'text' || node.type === 'inlineCode' || node.type === 'code' || node.type === 'html') return node.value ?? ''
  if (node.type === 'break') return ' '
  if (node.type === 'image') return node.alt ? `[${node.alt}]` : ''
  return (node.children ?? []).map(plain).join('')
}

function inline(nodes, marks = []) {
  const out = []
  for (const n of nodes ?? []) {
    if (n.type === 'text' || n.type === 'html') {
      if (n.value) out.push(schema.text(n.value, marks))
    } else if (n.type === 'inlineCode') {
      if (n.value) out.push(schema.text(n.value, [...marks, schema.marks.code.create()]))
    } else if (n.type === 'strong') {
      out.push(...inline(n.children, [...marks, schema.marks.bold.create()]))
    } else if (n.type === 'emphasis') {
      out.push(...inline(n.children, [...marks, schema.marks.italic.create()]))
    } else if (n.type === 'link') {
      const href = safeHref(n.url)
      out.push(...inline(n.children, href ? [...marks, schema.marks.link.create({ href })] : marks))
    } else if (n.type === 'break') {
      out.push(schema.nodes.hard_break.create(null, null, marks))
    } else {
      // Strikethrough the model wrote (~~ ~~), images, footnotes: their words, plainly.
      const text = plain(n)
      if (text) out.push(schema.text(text, marks))
    }
  }
  return out
}

function chartFrom(code, attrs) {
  try {
    const spec = JSON.parse(code)
    const data = Array.isArray(spec.data) ? spec.data : []
    const key = spec.yKey ?? 'value'
    const label = spec.xKey ?? 'label'
    return schema.nodes.chart.create({ ...attrs, title: String(spec.title ?? 'Chart'), bars: data.slice(0, 24).map((d) => ({ label: String(d[label] ?? ''), value: Number(d[key]) || 0 })) })
  } catch {
    return null
  }
}

/**
 * The blocks of a reply.
 * @param {string} markdown the reply as stored
 * @param {() => string} nextBlockId gives each block its id
 */
export function replyFromMarkdown(markdown, nextBlockId) {
  const tree = parser.parse(String(markdown ?? ''))
  const blocks = []
  const attrs = () => ({ id: nextBlockId() })
  const walk = (node, inQuote = false) => {
    switch (node.type) {
      case 'heading':
        blocks.push(schema.nodes.heading.create({ ...attrs(), level: Math.min(3, node.depth) }, inline(node.children)))
        break
      case 'paragraph':
        blocks.push((inQuote ? schema.nodes.quote : schema.nodes.paragraph).create(attrs(), inline(node.children)))
        break
      case 'blockquote':
        for (const c of node.children) walk(c, true)
        break
      case 'list':
        for (const item of node.children) {
          const kind = item.checked != null ? 'check' : node.ordered ? 'number' : 'bullet'
          item.children.forEach((c, i) => {
            if (i === 0 && c.type === 'paragraph') blocks.push(schema.nodes.list_item.create({ ...attrs(), kind, checked: Boolean(item.checked) }, inline(c.children)))
            else walk(c, inQuote)
          })
        }
        break
      case 'code': {
        const chart = node.lang === 'chart' ? chartFrom(node.value, attrs()) : null
        blocks.push(chart ?? schema.nodes.code_block.create(attrs(), node.value ? schema.text(node.value) : null))
        break
      }
      case 'thematicBreak':
        blocks.push(schema.nodes.divider.create(attrs()))
        break
      case 'table':
        blocks.push(schema.nodes.table.create({ ...attrs(), rows: node.children.map((row) => row.children.map(plain)) }))
        break
      default: {
        const text = plain(node)
        if (text) blocks.push(schema.nodes.paragraph.create(attrs(), schema.text(text)))
      }
    }
  }
  for (const node of tree.children) walk(node)
  if (!blocks.length) blocks.push(schema.nodes.paragraph.create(attrs()))
  return schema.nodes.doc.create(null, blocks)
}

/** A prompt: its lines as paragraphs, no formatting read into it. */
export function promptFromText(text, nextBlockId) {
  const lines = String(text ?? '').split('\n')
  return schema.nodes.doc.create(null, lines.map((line) => schema.nodes.paragraph.create({ id: nextBlockId() }, line ? schema.text(line) : null)))
}
