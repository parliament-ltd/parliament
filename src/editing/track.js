// Every change to a reply becomes an edit (stage 11, piece 1; C205, C210).
//
// ProseMirror turns whatever the browser did (a key, a word composed with an
// input method, a phone keyboard's correction, a paste, a cut) into a
// transaction. Each transaction passes through track() before it lands, and
// the editing spec's rules are applied there (editing spec, "Editing replies"):
//   - deleting the model's words strikes them; they stay in the reply
//   - typed words are the person's, marked "added", with an edit id
//   - typing over a selection strikes it and puts the words straight after
//     it, the two halves one edit with one id
//   - deleting the person's own added words removes them
//   - a split, a join or a change of block type is formatting, not an edit
// Because the rules sit on the transaction, not on keys, the same rules hold
// for every way of typing.

import { Mapping, ReplaceStep } from 'prosemirror-transform'
import { Selection, TextSelection } from 'prosemirror-state'
import { Fragment, Slice } from 'prosemirror-model'
import { STRUCK, ADDED, isEditMark } from './schema'

/** Meta: a change that is not an edit (structure, formatting, undo from a card). */
export const SKIP = 'editSkip'
/**
 * Meta: what a key meant, when a key made the change: 'backspace', 'delete',
 * 'range' (the cursor goes before what was struck) or 'range-end' (after it).
 */
export const INTENT = 'editIntent'
/** Meta: set on a change track() refused, with the reason. */
export const REFUSED = 'editRefused'

/**
 * Edit ids for a reply on screen: short random ids, since an edit takes its
 * number from the shared counter only when it is saved (C212 (b), (c)). Block
 * ids likewise, so a block keeps its id across saves and restores.
 */
export function createEditIds() {
  const make = () => crypto.randomUUID().replace(/-/g, '').slice(0, 10)
  let next = make()
  return {
    peek: () => next,
    commit(id) { if (id === next) next = make() },
    block: () => `b${make()}`,
  }
}

/** Edit ids counted up from a number, and block ids: for tests and the spike. */
export function createIds(start = 240) {
  let next = start
  let blocks = 0
  return {
    peek: () => next,
    commit(id) { if (id >= next) next = id + 1 },
    block: () => `n${++blocks}`,
  }
}

const editOf = (marks) => {
  for (const m of marks) if (isEditMark(m)) return { kind: m.type === STRUCK ? 'struck' : 'added', id: m.attrs.edit }
  return null
}

/** The edit touching a position in a line: the text just before it, else just after. */
export function editAt(doc, pos, prefer = 'before') {
  const $pos = doc.resolve(pos)
  if (!$pos.parent.inlineContent) return null
  const before = $pos.nodeBefore && editOf($pos.nodeBefore.marks)
  const after = $pos.nodeAfter && editOf($pos.nodeAfter.marks)
  return prefer === 'before' ? (before?.id ?? after?.id ?? null) : (after?.id ?? before?.id ?? null)
}

// What a range holds: the model's words (to strike), the person's own (to
// remove), struck words (kept as they are) and whole blocks (to strike).
function describe(doc, from, to) {
  const original = []
  const added = []
  const atoms = []
  let struck = 0
  doc.nodesBetween(from, to, (node, pos) => {
    if (node.isInline) {
      const a = Math.max(pos, from)
      const b = Math.min(pos + node.nodeSize, to)
      if (a >= b) return false
      const e = editOf(node.marks)
      if (e?.kind === 'added') added.push({ from: a, to: b, id: e.id })
      else if (e?.kind === 'struck') struck += 1
      else original.push({ from: a, to: b })
      return false
    }
    if (node.isAtom) {
      if (pos >= from && pos + node.nodeSize <= to) {
        if (node.attrs.struck == null) atoms.push({ pos, node })
        else struck += 1
      }
      return false
    }
    return true
  })
  return { original, added, atoms, struck }
}

function hasInline(fragment) {
  let found = false
  fragment.descendants((n) => {
    if (n.isInline) found = true
    return !found
  })
  return found
}

// The new words, marked as the person's under one id. Marks a line cannot
// hold (bold in a code block) are left off.
function markFragment(fragment, id, parentType) {
  const nodes = []
  fragment.forEach((node) => {
    if (node.isInline) {
      const kept = node.marks.filter((m) => !isEditMark(m) && (!parentType || parentType.allowsMarkType(m.type)))
      nodes.push(node.mark(ADDED.create({ edit: id }).addToSet(kept)))
    } else {
      nodes.push(node.copy(markFragment(node.content, id, node.type)))
    }
  })
  return Fragment.from(nodes)
}

function markSlice(slice, id, $at) {
  const parentType = slice.openStart === 0 ? $at.parent.type : null
  return new Slice(markFragment(slice.content, id, parentType), slice.openStart, slice.openEnd)
}

// Whether every new word already carries this edit's mark (the usual case:
// the cursor's marks put it there as the person typed), so the change can
// land exactly as the browser made it.
function alreadyMarked(fragment, id) {
  let ok = true
  fragment.descendants((n) => {
    if (n.isInline) {
      const e = editOf(n.marks)
      if (!(e?.kind === 'added' && e.id === id)) ok = false
    }
    return ok
  })
  return ok
}

// A word the browser swaps in one go (autocorrect, a keyboard's suggestion, a
// composed word committed) arrives as the smallest difference: "short" to
// "ghost" comes as "shor" to "ghos", keeping the t. Such a swap of the
// model's words is widened to whole words, so the strike reads as the person
// meant it. Only in scripts that put spaces between words: Japanese and
// Chinese have no spaces to stop at.
const WORD = /[\p{Script=Latin}\p{Script=Greek}\p{Script=Cyrillic}\p{N}'’]/u
function toWholeWords(doc, step) {
  const { from, to, slice } = step
  if (from === to || slice.openStart || slice.openEnd || !slice.content.childCount) return step
  let onlyText = true
  slice.content.forEach((n) => { if (!n.isText) onlyText = false })
  if (!onlyText) return step
  const $from = doc.resolve(from)
  const $to = doc.resolve(to)
  if ($from.parent !== $to.parent || !$from.parent.isTextblock) return step
  let model = false
  doc.nodesBetween(from, to, (n) => { if (n.isText && !n.marks.some(isEditMark)) model = true })
  if (!model) return step
  const parent = $from.parent
  const start = $from.start()
  const plain = (pos) => {
    const { node } = parent.childAfter(pos - start)
    return node?.isText && !node.marks.some(isEditMark) ? doc.textBetween(pos, pos + 1) : ''
  }
  let wf = from
  let wt = to
  while (wf > start && WORD.test(plain(wf - 1))) wf -= 1
  while (wt < $from.end() && WORD.test(plain(wt))) wt += 1
  if (wf === from && wt === to) return step
  const content = parent.content.cut(wf - start, from - start).append(slice.content).append(parent.content.cut(to - start, wt - start))
  return new ReplaceStep(wf, wt, new Slice(content, 0, 0))
}

// Typing over a selection that crosses blocks, the browser joins the blocks
// itself and reports the change as everything up to the end of the joined
// line, so the model's words after the selection would be struck and come
// back as the person's. Such a step is cut down to what actually differs.
// Only a step whose new words end in an open or closed line of their own is
// touched; typing in a line already arrives as small as it can be.
// floor: where the selection ended, when known; the cut never reaches inside it.
function narrow(doc, step, floor = step.from) {
  const { from, to, slice } = step
  if (!slice.openStart || slice.openEnd > 1) return step
  const last = slice.content.lastChild
  if (!last?.isTextblock) return step
  // The line the change ends in, in the reply, and where its replaced part starts.
  const $to = doc.resolve(to)
  let block
  let end
  if (slice.openEnd === 1 && $to.depth === 1 && $to.parent.isTextblock) {
    block = $to.parent
    end = to
  } else if (slice.openEnd === 0 && $to.depth === 0 && $to.nodeBefore?.isTextblock) {
    block = $to.nodeBefore
    end = to - 1
  } else return step
  const contentStart = slice.openEnd === 1 ? $to.start() : to - block.nodeSize + 1
  const oldStart = Math.max(contentStart, from)
  if (oldStart >= end) return step
  const old = block.content.cut(oldStart - contentStart, end - contentStart)
  // The same words at the end of both, kept as they are.
  const diff = old.findDiffEnd(last.content)
  let newTo = oldStart + (diff ? diff.a : 0)
  let keepB = diff ? diff.b : last.content.size - old.size
  // Words matching on both sides of the selection's end: what was typed stays typed.
  const lowest = Math.max(from, Math.min(floor, to))
  if (newTo < lowest) { keepB += lowest - newTo; newTo = lowest }
  if (keepB >= last.content.size || keepB < 0) return step
  const lastCut = last.copy(last.content.cut(0, keepB))
  let cutSlice = new Slice(slice.content.replaceChild(slice.content.childCount - 1, lastCut), slice.openStart, 1)
  if (cutSlice.content.childCount === 1 && cutSlice.openStart === 1) cutSlice = new Slice(lastCut.content, 0, 0)
  try {
    const cut = new ReplaceStep(from, newTo, cutSlice)
    return cut.apply(doc).failed ? step : cut
  } catch { return step }
}

// One step of the browser's change, applied to `out` under the rules.
// Returns where the cursor should go, or null to leave it to the mapping, and
// whether the step landed unchanged.
function applyStep(out, given, ctx) {
  const doc = out.doc
  const step = toWholeWords(doc, narrow(doc, given, ctx.floor))
  const { from, to, slice } = step
  const d = describe(doc, from, to)
  const text = hasInline(slice.content)
  const keeps = d.original.length + d.atoms.length + d.struck

  // Only the person's own words change (or the structure does): the step
  // stands, and only the new words' edit is settled.
  if (!keeps) {
    if (!text) {
      out.step(step)
      return { same: true, cursor: null }
    }
    const id = d.added[0]?.id ?? editAt(doc, from) ?? ctx.ids.peek()
    ctx.ids.commit(id)
    if (alreadyMarked(slice.content, id)) {
      out.step(step)
      return { same: true, cursor: null }
    }
    out.step(new ReplaceStep(from, to, markSlice(slice, id, doc.resolve(from))))
    return { same: false, cursor: null }
  }

  // Something of the model's would go: it is struck instead, and stays.
  const first = out.steps.length
  let strikeId = null
  if (d.original.length || d.atoms.length) {
    const near = ctx.intent === 'backspace' ? editAt(doc, to, 'after') ?? editAt(doc, from)
      : ctx.intent === 'delete' ? editAt(doc, from) ?? editAt(doc, to, 'after')
        : null
    strikeId = near ?? ctx.ids.peek()
    ctx.ids.commit(strikeId)
    for (const r of d.original) out.addMark(r.from, r.to, STRUCK.create({ edit: strikeId }))
    for (const a of d.atoms) out.setNodeMarkup(a.pos, null, { ...a.node.attrs, struck: strikeId })
  }
  // The person's own words in the range simply go (right to left, so the
  // positions to their left stay true).
  for (const r of [...d.added].reverse()) out.delete(r.from, r.to)
  const map = new Mapping(out.mapping.maps.slice(first))

  if (text) {
    // The new words go straight after what was struck, as one edit with it.
    const at = map.map(to, 1)
    const id = strikeId ?? d.added[0]?.id ?? editAt(out.doc, at) ?? ctx.ids.peek()
    ctx.ids.commit(id)
    const before = out.steps.length
    out.replace(at, at, markSlice(slice, id, out.doc.resolve(at)))
    const after = new Mapping(out.mapping.maps.slice(before))
    return { same: false, cursor: after.map(at, 1) }
  }
  if (ctx.intent === 'delete' || ctx.intent === 'range-end') return { same: false, cursor: map.map(to, 1) }
  return { same: false, cursor: map.map(from, -1) }
}

/**
 * The browser's change, under the editing rules.
 * @param {import('prosemirror-state').EditorState} state the state the change was made on
 * @param {import('prosemirror-state').Transaction} tr the change
 * @param {{ ids: ReturnType<typeof createIds>, onError?: (e: Error) => void }} opts
 * @returns {import('prosemirror-state').Transaction}
 */
export function track(state, tr, { ids, onError } = {}) {
  if (!tr.docChanged || tr.getMeta(SKIP)) return tr
  try {
    const out = state.tr
    let toOut = new Mapping()
    let cursor = null
    let allSame = true
    const sel = state.selection
    tr.steps.forEach((step, i) => {
      const mapped = step.map(toOut)
      const before = out.steps.length
      if (mapped instanceof ReplaceStep) {
        // What a key meant, or else what the browser's change looks like.
        let intent = tr.getMeta(INTENT)
        if (!intent && i === 0) {
          if (!sel.empty) intent = 'range'
          else if (mapped.slice.size === 0 && mapped.to === sel.from) intent = 'backspace'
          else if (mapped.slice.size === 0 && mapped.from === sel.from) intent = 'delete'
        }
        const r = applyStep(out, mapped, { ids, intent, floor: i === 0 && !sel.empty ? sel.to : undefined })
        if (!r.same) allSame = false
        cursor = tr.steps.length === 1 ? r.cursor : null
      } else if (mapped) {
        out.step(mapped)
      }
      const m = new Mapping()
      m.appendMap(step.getMap().invert())
      m.appendMapping(toOut)
      for (let k = before; k < out.steps.length; k++) m.appendMap(out.steps[k].getMap())
      toOut = m
    })
    if (allSame) return tr
    if (cursor != null) {
      const $c = out.doc.resolve(Math.max(0, Math.min(cursor, out.doc.content.size)))
      out.setSelection($c.parent.inlineContent ? TextSelection.create(out.doc, $c.pos) : Selection.near($c))
    }
    else {
      try { out.setSelection(tr.selection.map(out.doc, toOut)) } catch { /* the default selection stands */ }
    }
    for (const key of ['composition', 'uiEvent', 'paste', 'pointer']) {
      const v = tr.getMeta(key)
      if (v !== undefined) out.setMeta(key, v)
    }
    if (tr.scrolledIntoView) out.scrollIntoView()
    return out
  } catch (e) {
    onError?.(e)
    return state.tr.setMeta(REFUSED, String(e?.message ?? e))
  }
}

/**
 * Marks for the next word typed at the cursor: the line's own marks, and the
 * person's mark with the id the word would take. Set before an input method
 * starts composing, so the composed word is drawn in place from its first
 * character (ProseMirror wraps the cursor in stored marks at compositionstart).
 */
export function cursorMarks(state, ids) {
  const sel = state.selection
  if (!(sel instanceof TextSelection) || !sel.empty) return null
  const $pos = sel.$from
  if (!$pos.parent.inlineContent) return null
  const marks = $pos.marks()
  if (marks.some((m) => m.type === ADDED)) return null
  const id = editAt(state.doc, $pos.pos) ?? ids.peek()
  const kept = marks.filter((m) => !isEditMark(m) && $pos.parent.type.allowsMarkType(m.type))
  return ADDED.create({ edit: id }).addToSet(kept)
}

/** Undo from an edit's card: its words go, what it struck comes back exactly. */
export function undoEdit(state, id) {
  const tr = state.tr.setMeta(SKIP, true)
  const added = []
  state.doc.descendants((node, pos) => {
    if (node.isInline) {
      for (const m of node.marks) {
        if (m.type === ADDED && m.attrs.edit === id) added.push({ from: pos, to: pos + node.nodeSize })
        if (m.type === STRUCK && m.attrs.edit === id) tr.removeMark(pos, pos + node.nodeSize, m)
      }
      return false
    }
    if (node.isAtom && node.attrs.struck === id) tr.setNodeMarkup(pos, null, { ...node.attrs, struck: null })
    return true
  })
  for (const r of added.reverse()) tr.delete(r.from, r.to)
  return tr
}

const KIND_NAME = { paragraph: 'paragraph', heading: 'heading', list_item: 'list item', quote: 'quote', code_block: 'code block', divider: 'divider', table: 'table', chart: 'chart' }

/**
 * Every edit in a reply, in reading order, each with where it sits: the
 * block's id and the offsets inside it (editing spec, technical point 2).
 */
export function collectEdits(doc) {
  const edits = new Map()
  const part = (id, block, index, kind) => {
    if (!edits.has(id)) edits.set(id, { id, parts: [], struck: '', added: '', first: Infinity, last: 0 })
    const e = edits.get(id)
    let p = e.parts.find((x) => x.block === block)
    if (!p) e.parts.push(p = { block, index, kind, from: Infinity, to: 0, struck: '', added: '' })
    return { e, p }
  }
  doc.forEach((block, offset, index) => {
    const kind = KIND_NAME[block.type.name] ?? block.type.name
    if (block.isAtom) {
      if (block.attrs.struck != null) {
        const { e, p } = part(block.attrs.struck, block.attrs.id, index, kind)
        p.from = 0
        p.to = 1
        p.struck += `[the whole ${kind}]`
        e.struck += `[the whole ${kind}]`
        e.first = Math.min(e.first, offset)
        e.last = Math.max(e.last, offset + block.nodeSize)
      }
      return
    }
    block.forEach((child, at) => {
      const ed = editOf(child.marks)
      if (!ed) return
      const { e, p } = part(ed.id, block.attrs.id, index, kind)
      const words = child.isText ? child.text : '\n'
      p.from = Math.min(p.from, at)
      p.to = Math.max(p.to, at + child.nodeSize)
      p[ed.kind] += words
      e[ed.kind] += words
      e.first = Math.min(e.first, offset + 1 + at)
      e.last = Math.max(e.last, offset + 1 + at + child.nodeSize)
    })
  })
  return [...edits.values()].sort((a, b) => a.first - b.first)
}

// The model's own words just before a place in a block, for context.
function context(doc, edit) {
  const p = edit.parts[0]
  const block = doc.child(p.index)
  if (!block.isTextblock) return ''
  let before = ''
  block.forEach((child, at) => {
    if (at >= p.from || !child.isText) return
    if (editOf(child.marks)?.kind === 'added') return
    before += child.text.slice(0, Math.max(0, p.from - at))
  })
  const words = before.trim().split(/\s+/).filter(Boolean)
  return words.slice(-6).join(' ')
}

/**
 * What the model would be told with the next prompt: each edit once, as text
 * only, never its formatting (editing spec, technical point 4).
 */
export function noteForModel(doc, edits, { what = 'your last reply' } = {}) {
  if (!edits.length) return ''
  const lines = edits.map((e) => {
    const p = e.parts[0]
    const where = `${p.kind} ${p.index + 1}`
    const struck = e.struck.replace(/\s+/g, ' ').trim()
    const added = e.added.replace(/\s+/g, ' ').trim()
    if (struck && added) return `- In ${where}: "${struck}" was struck, and "${added}" written in its place.`
    if (struck) return `- In ${where}: "${struck}" was struck.`
    const ctx = context(doc, e)
    return `- In ${where}: "${added}" was added${ctx ? ` after "${ctx}"` : ''}.`
  })
  return [`The person edited ${what}. Each change, told once:`, ...lines].join('\n')
}
