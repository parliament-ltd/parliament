import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { EditorState, Selection, TextSelection } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import { Mark } from 'prosemirror-model'
import '../../editing/editing.css'
import { schema } from '../../editing/schema'
import { replyFromMarkdown, promptFromText } from '../../editing/fromMarkdown'
import { fromBlocks, toBlocks, wordsOf } from '../../editing/blocks'
import { editsIn } from '../../editing/edits'
import { track, createEditIds, cursorMarks, REFUSED, SKIP, INTENT } from '../../editing/track'
import { editingPlugins, announcePlugin } from '../../editing/keys'
import { shownPlugin, shownKey, lightsOf } from '../../editing/shown'
import { chartView } from '../../editing/chartView'
import { withoutAnswers } from '../../editing/answers'
import { stripAttachedFileBlocks } from '../../lib/fileUpload'
import { useBlockMenu } from './useBlockMenu'
import { useAskBox } from './useAskBox'
import { useCommentBox } from './useCommentBox'
import { commentsPlugin, commentsKey, anchorsOf } from '../../editing/comments'
import { asksIn } from '../../editing/edits'
import { asksPlugin, asksKey, settleAsk } from '../../editing/asks'
import { suggestionsPlugin, suggestionsKey, settleSuggestion, suggestionsIn } from '../../editing/suggestions'
import { heldPlugin, heldKey } from '../../editing/held'
import { titlesPlugin } from '../../editing/titles'
import MessageCard from './MessageCard'
import { isReleased, onRelease } from '../../editing/across'
import { takeFocus, wantsFocus } from '../../editing/writeFocus'
import { partsOf, sameParts, touchedParts, acrossParts, wholeParts, PARTS } from '../../editing/parts'

// A prompt and its reply, edited in place as one (stage 11, piece 2; the
// editing spec, "Editing prompts"; C214, ruled 26 October). One editor draws
// both cards, so a selection can run from the prompt into the reply; each
// card's buttons, notes and lines stay the card's own (MessageCard), around
// the card's part of the text.
//
// In the prompt, edits work as in a reply (struck, blue, one record each),
// but lines do not change kind: Enter and / do nothing there. In the reply,
// everything a reply on its own does.
//
// The two stay apart, with the gap between their cards. Crossing it joins
// them (C214 (a)): Backspace at the reply's start, Delete at the prompt's
// end, or a selection over both struck or typed over. Joining changes
// nothing in the chat: the words of both still standing go to the bar as the
// next prompt to this branch, to edit and send with Enter (C214 (b)).
//
// A prompt with no finished reply under it, or with the tabs of several
// branches under it, is edited here on its own, as one card.
//
// Each card's text is saved beside what was written, as blocks with a record
// for each edit, half a second after a change and on leaving (C212).
//
// While a selection is dragged across cards, out of this editor or into it,
// the editor lets go and is not one (editing/across.js; C280 (d)).

const SAVE_AFTER_MS = 500
// Joined by typing over both cards: the bar is filled once the typing pauses.
const JOIN_AFTER_MS = 800

// The section, prompt or reply, a position is in.
function sectionAt($pos) {
  for (let d = $pos.depth; d > 0; d--) if ($pos.node(d).type === schema.nodes.section) return { node: $pos.node(d), pos: $pos.before(d) }
  return null
}
const inReply = (state) => sectionAt(state.selection.$from)?.node.attrs.part !== 'prompt'
// A part's node: a section of its message's text, or, for a part that is not
// written in (C311, step 4), a fixed one its card is drawn in.
function nodeOf(s, ids) {
  const m = s.message
  if (s.part === 'fixed') return schema.nodes.fixed.create({ message: m.id })
  const inner = fromBlocks(m.blocks, ids.block)
    ?? (s.part === 'prompt' ? promptFromText(stripAttachedFileBlocks(m.content), ids.block)
      // A source's answer is plain text, never read as Markdown (stage 4).
      : s.plain ? promptFromText(m.content, ids.block)
        : replyFromMarkdown(withoutAnswers(m.content), ids.block, { anchors: `msg-${m.id}` }))
  return schema.nodes.section.create({ part: s.part, message: m.id }, inner.content)
}
const keyOfNode = (node) => `${node.type === schema.nodes.fixed ? 'fixed' : node.attrs.part}:${node.attrs.message}`

// Whether a selection runs from one card into the other.
function crosses(sel) {
  if (sel.empty) return false
  const a = sectionAt(sel.$from)
  const b = sectionAt(sel.$to)
  return Boolean(a && b && a.pos !== b.pos)
}

/**
 * @param {{
 *   sections: Array<{ part: 'prompt'|'reply', message: object, plain?: boolean, card: object, quotes?: Array<{ num: number, text: string }>, editedLine?: import('react').ReactNode }>,
 *   terms?: Array<{ text: string, bg: string }>,
 *   quotedTitle?: (num: number) => string,
 *   clean?: boolean,
 *   onSave: (messageId: string, saved: { blocks: object[], edits: Map<string, object>, part: string }) => Promise<unknown>,
 *   words: { joined: string, label: string },
 * }} props
 */
const NO_CLOSED = new Set()
const SUG_WORDS = { ripple: 'ripple', sweep: 'sweep', accept: 'accept', reject: 'reject' }
const ASK_WORDS = { label: 'ASK', placeholder: 'Ask in your own words: make it shorter, or add the year it opened', ask: 'ask', accept: 'accept', undo: 'undo' }
const NO_ASKS = new Map()
const NO_TITLE_WORDS = { ask: '', help: () => '' }
const COMMENT_WORDS = { label: 'COMMENT', placeholder: '', keys: 'Ctrl+Alt+M', more: 'more', less: 'less', title: () => '', pick: '', block: '' }
// askInfo: each ask's number and state, by its id; onSettleAsk(messageId, askId, how)
// when one is accepted or undone; askWords: the ASK box's and markers' words (C218).
// sugInfo: each suggestion's number, by its id; onSettleSuggestion(messageId,
// suggestionId, how) when one is accepted or rejected in place (C229).
// titleWords: the "ask" after a line of a source's answer that is the title
// of a page it links to, and what it says it does, for a title (C287).
// onComment({ messageId, passage, nth, text }): a comment kept on words by
// Ctrl+Alt+M (C301 (c)); commentWords: its box's and the text's words.
// untracked: your own text no model has read, in Editing: what you type is
// simply the text, not an edit (C301 (f)). true for every part, or the id of
// the one message it holds for, the other parts tracked as ever (C311).
// joins: a prompt and its reply struck or typed over together fill the bar
// (C214 (a), (b)). Off since the room became one text (C311, ruled 18
// November): a change across parts is made in each part, and the bar is left.
// onDeleteParts(messageIds): a prompt or reply selected whole and deleted
// with two presses leaves the chat as a message does (C311, step 3);
// words.deleteAgain(count, part) says so after the first press.
export default function EditableMessages({ sections, terms = [], quotedTitle, clean = false, untracked = false, joins = false, onDeleteParts = null, onSave, words, closedEdits = NO_CLOSED, heldEdits = NO_CLOSED, askInfo = NO_ASKS, onSettleAsk, askWords = ASK_WORDS, sugInfo = NO_ASKS, onSettleSuggestion, sugWords = SUG_WORDS, titleWords = NO_TITLE_WORDS, onComment, commentWords = COMMENT_WORDS }) {
  const untrackedRef = useRef(untracked)
  useEffect(() => { untrackedRef.current = untracked }, [untracked])
  const plainIn = (message) => untrackedRef.current === true || (untrackedRef.current != null && untrackedRef.current !== false && untrackedRef.current === message)
  const joinsRef = useRef(joins)
  useEffect(() => { joinsRef.current = joins }, [joins])
  const onDeletePartsRef = useRef(onDeleteParts)
  useEffect(() => { onDeletePartsRef.current = onDeleteParts }, [onDeleteParts])
  // The whole parts a first Backspace or Delete named, waiting for the second.
  const armed = useRef(null)
  // Edits already told to a model: typing beside one starts a new edit (C216 (i)).
  const closedRef = useRef(closedEdits)
  useEffect(() => { closedRef.current = closedEdits }, [closedEdits])
  const host = useRef(null)
  const view = useRef(null)
  const idsRef = useRef(null)
  const savedKeys = useRef({})
  const timer = useRef(0)
  // A comment's or a highlight's words as they are now, stored a moment
  // after typing stops (C304): by a window event, its id with its words,
  // within this page.
  const movedTimer = useRef(0)
  const tellMoved = () => {
    const v = view.current
    if (!v) return
    let shown = {}
    try { shown = JSON.parse(commentsRef.current).sections ?? {} } catch { shown = {} }
    const moves = []
    for (const a of anchorsOf(v.state)) {
      const c = (shown[a.message] ?? []).find((x) => String(x.num ?? x.id) === a.key)
      if (c && (c.passage !== a.passage || (c.nth ?? 0) !== a.nth)) moves.push({ id: c.id, passage: a.passage, nth: a.nth })
    }
    if (moves.length) window.dispatchEvent(new CustomEvent('parliament-comments-moved', { detail: { moves } }))
    let lit = {}
    try { lit = JSON.parse(shownRef.current).sections ?? {} } catch { lit = {} }
    const lightMoves = []
    for (const a of lightsOf(v.state)) {
      const h = (lit[a.message]?.highlights ?? []).find((x) => x.id === a.key)
      if (h && (h.text !== a.text || (h.nth ?? 0) !== a.nth)) lightMoves.push({ id: h.id, text: a.text, nth: a.nth })
    }
    if (lightMoves.length) window.dispatchEvent(new CustomEvent('parliament-highlights-moved', { detail: { moves: lightMoves } }))
  }
  const onSaveRef = useRef(onSave)
  const cleanRef = useRef(clean)
  const wordsRef = useRef(words)
  const sectionsRef = useRef(sections)
  const [hosts, setHosts] = useState({})
  const [said, setSaid] = useState('')
  // Asks kept here and not yet saved: their questions, by id (C218).
  const questions = useRef(new Map())
  const onSettleRef = useRef(onSettleAsk)
  useEffect(() => { onSettleRef.current = onSettleAsk }, [onSettleAsk])
  const onSettleSugRef = useRef(onSettleSuggestion)
  useEffect(() => { onSettleSugRef.current = onSettleSuggestion }, [onSettleSuggestion])
  const askBox = useAskBox(view, (askId, question) => { questions.current.set(askId, question) }, askWords, inReply)
  const askOptions = askBox.options
  // Comments on words (C301 (c)): their words read when drawn, so a change of language shows.
  const commentWordsRef = useRef(commentWords)
  const commentsWas = useRef('')
  useEffect(() => { commentWordsRef.current = commentWords })
  const commentBox = useCommentBox(view, (c) => onComment?.(c), commentWords, (line) => setSaid(line), { pick: commentWords.pick, block: commentWords.block })
  const commentOptions = commentBox.options
  const blockMenu = useBlockMenu(view, idsRef)
  const menuOptions = blockMenu.options
  const closeMenu = blockMenu.close

  useEffect(() => {
    onSaveRef.current = onSave
    wordsRef.current = words
    sectionsRef.current = sections
  })

  const save = useCallback(() => {
    clearTimeout(timer.current)
    timer.current = 0
    const v = view.current
    if (!v) return undefined
    const going = []
    v.state.doc.forEach((sec) => {
      if (sec.type !== schema.nodes.section) return
      const id = sec.attrs.message
      const blocks = toBlocks(sec)
      const key = JSON.stringify(blocks)
      // Saved only when a card's stored form changes.
      if (savedKeys.current[id] === key) return
      savedKeys.current[id] = key
      const asks = new Map([...asksIn(sec)].map(([askId, a]) => [askId, { ...a, question: questions.current.get(askId) }]))
      going.push(Promise.resolve(onSaveRef.current?.(id, { blocks, edits: editsIn(sec), asks, suggestions: suggestionsIn(sec), part: sec.attrs.part })).catch((err) => {
        savedKeys.current[id] = null
        setSaid(`Not saved: ${String(err?.message ?? err)}`)
      }))
    })
    return Promise.all(going)
  }, [])

  // Ctrl+Enter in the text (C301 (a), (f)): saved first, then the bar does
  // what its Enter would, once what was saved has reached the line.
  const sendFromText = useCallback(() => {
    clearTimeout(timer.current)
    timer.current = 0
    Promise.resolve(save()).finally(() => setTimeout(() => window.dispatchEvent(new CustomEvent('parliament-send-from-text')), 150))
  }, [save])

  // The words of both still standing, to the bar as the next prompt (C214 (b)).
  // focus: the bar takes the cursor, after Backspace or Delete. Joined by
  // typing, it does not: the bar is filled when the typing pauses, and the
  // cursor stays where the person is typing.
  const joinTimer = useRef(0)
  const join = useCallback((focus = true) => {
    clearTimeout(joinTimer.current)
    joinTimer.current = 0
    const v = view.current
    if (!v) return
    const parts = []
    v.state.doc.forEach((sec) => { if (sec.type === schema.nodes.section) parts.push(wordsOf(toBlocks(sec))) })
    // The bar holds one line: lines and paragraphs meet with a space.
    const value = parts.filter(Boolean).join('\n\n').replace(/\s*\n+\s*/g, ' ').trim()
    if (!value) return
    // from: the messages joined, whose edits go into this prompt (C216 (h)).
    const from = []
    v.state.doc.forEach((sec) => { if (sec.type === schema.nodes.section && sec.attrs.message) from.push(sec.attrs.message) })
    window.dispatchEvent(new CustomEvent('parliament-prompt-draft', { detail: { value, focus, from } }))
    setSaid(wordsRef.current?.joined ?? '')
  }, [])
  const joinSoon = useCallback(() => {
    clearTimeout(joinTimer.current)
    joinTimer.current = setTimeout(() => join(false), JOIN_AFTER_MS)
  }, [join])

  const sectionsKey = sections.map((s) => `${s.part}:${s.message.id}`).join('|')
  // The parts the editor was last built or kept for.
  const builtKey = useRef('')

  // The editor, made again only when its cards change (a reply arriving
  // under a prompt): its own saves must not draw it again.
  useEffect(() => {
    const ids = createEditIds()
    ids.setClosed((edit) => closedRef.current.has(edit))
    idsRef.current = ids
    const made = sectionsRef.current.map((s) => nodeOf(s, ids))
    const doc = schema.nodes.doc.create(null, made)
    builtKey.current = sectionsKey
    // A new editor has no comments yet: given them again below.
    commentsWas.current = ''
    savedKeys.current = {}
    doc.forEach((sec) => { if (sec.type === schema.nodes.section) savedKeys.current[sec.attrs.message] = JSON.stringify(toBlocks(sec)) })
    const plugins = [
      ...editingPlugins({ ids, blocks: inReply, onNote: (text) => setSaid(text), onJoin: () => { if (joinsRef.current) join() }, onSend: () => sendFromText(), ...menuOptions, ...askOptions, ...commentOptions }),
      // Comments on words, after their passage (C301 (c)).
      commentsPlugin({ words: {
        get more() { return commentWordsRef.current.more },
        get less() { return commentWordsRef.current.less },
        label: (num) => commentWordsRef.current.title(num),
      } }),
      // Edits held back, dashed (C301 (b)).
      heldPlugin(),
      // Accept or undo an answered ask, in place; its message is the card it is in (C218).
      asksPlugin({
        words: askWords,
        onSettle: (askId, how) => {
          const v = view.current
          if (!v) return
          let messageId = null
          v.state.doc.forEach((sec) => { if (asksIn(sec).has(askId)) messageId = sec.attrs.message })
          v.dispatch(settleAsk(v.state, askId, how))
          if (messageId) onSettleRef.current?.(messageId, askId, how)
        },
      }),
      // Accept or reject a suggestion, in place (C229 (e)): Ripple's becomes
      // an edit of yours, by the editing rules, as the transactions go through them.
      suggestionsPlugin({
        words: sugWords,
        onSettle: (sugId, how) => {
          const v = view.current
          if (!v) return
          let messageId = null
          v.state.doc.forEach((sec) => { if (suggestionsIn(sec).has(sugId)) messageId = sec.attrs.message })
          for (const make of settleSuggestion(v.state, sugId, how)) v.dispatch(make(v.state))
          if (messageId) onSettleSugRef.current?.(messageId, sugId, how)
        },
      }),
      announcePlugin(() => true),
      shownPlugin({ quotedTitle: (num) => quotedTitle?.(num) ?? '' }),
      // A line of a source's answer that is the title of a page it links
      // to: "ask" after it writes the title into the bar (C287).
      titlesPlugin({
        words: titleWords,
        titles: () => ({ sections: Object.fromEntries(sectionsRef.current.filter((s) => s.plain && Array.isArray(s.message.source?.links)).map((s) => [s.message.id, s.message.source.links])) }),
      }),
    ]
    const sectionView = (node) => {
      const dom = document.createElement('div')
      dom.className = `p-section p-${node.attrs.part}`
      const contentDOM = document.createElement('div')
      contentDOM.className = 'pm-section-content p-text'
      contentDOM.setAttribute('dir', 'auto')
      dom.appendChild(contentDOM)
      const id = node.attrs.message
      setHosts((h) => ({ ...h, [id]: { dom, contentDOM } }))
      return {
        dom,
        contentDOM,
        update: (next) => next.type === node.type && next.attrs.message === id && next.attrs.part === node.attrs.part,
        // The card around the text is React's, not the editor's.
        ignoreMutation: (m) => !contentDOM.contains(m.target),
        stopEvent: (e) => !(e.target instanceof Node && contentDOM.contains(e.target)),
        destroy: () => setHosts((h) => {
          if (h[id]?.dom !== dom) return h
          const rest = { ...h }
          delete rest[id]
          return rest
        }),
      }
    }
    // A fixed part (C311, step 4): its card, drawn by React, and nothing to write in.
    const fixedView = (node) => {
      const dom = document.createElement('div')
      dom.className = 'p-section p-fixed'
      dom.contentEditable = 'false'
      const id = node.attrs.message
      setHosts((h) => ({ ...h, [id]: { dom, contentDOM: null } }))
      return {
        dom,
        update: (next) => next.type === node.type && next.attrs.message === id,
        ignoreMutation: () => true,
        stopEvent: () => true,
        selectNode: () => dom.classList.add('picked'),
        deselectNode: () => dom.classList.remove('picked'),
        destroy: () => setHosts((h) => {
          if (h[id]?.dom !== dom) return h
          const rest = { ...h }
          delete rest[id]
          return rest
        }),
      }
    }
    const v = new EditorView(host.current, {
      state: EditorState.create({ doc, plugins }),
      editable: () => !cleanRef.current && !isReleased(),
      nodeViews: { section: sectionView, fixed: fixedView, chart: (node) => chartView(node) },
      attributes: () => ({ class: `p-pair${cleanRef.current ? ' clean' : ''}`, 'aria-label': wordsRef.current?.label ?? '', spellcheck: 'true', role: 'textbox', 'aria-multiline': 'true' }),
      dispatchTransaction(tr) {
        const before = v.state
        // A change across parts (C311): made in each part, never across the
        // edge between two, so no part is joined to another or lost. Where a
        // part is your own text no model has read, its words go; elsewhere
        // the editing rules strike them, as within one part.
        if (tr.docChanged && !tr.getMeta(PARTS) && !tr.getMeta(SKIP) && crosses(before.selection) && !joinsRef.current) {
          const steps = acrossParts(before, tr, plainIn)
          if (steps) {
            for (const make of steps) v.dispatch(make(v.state))
            return
          }
        }
        // Your own text before any model read it, in Editing: simply the text (C301 (f)).
        const touched = tr.docChanged ? touchedParts(tr) : []
        if (touched.length && touched.every(plainIn)) tr.setMeta(SKIP, true)
        const joining = joinsRef.current && crosses(before.selection) && tr.docChanged && !tr.getMeta(SKIP)
        const out = track(before, tr, { ids, onError: (e) => console.error('[editing] a change was refused', e) })
        if (out.getMeta(REFUSED)) setSaid('That change could not be made here.')
        let next = before.apply(out)
        // No change removes a part or joins two (C311, step 1): refused whole.
        if (out.docChanged && !sameParts(before.doc, next.doc)) {
          setSaid('That change could not be made here.')
          return
        }
        if (!v.composing && !plainIn(partsOf(next.doc).find((x) => x.from <= next.selection.from && next.selection.from <= x.to)?.message ?? null)) {
          const marks = cursorMarks(next, ids)
          if (marks && !(next.storedMarks && Mark.sameSet(next.storedMarks, marks))) next = next.apply(next.tr.setStoredMarks(marks))
        }
        v.updateState(next)
        if (tr.docChanged) {
          setSaid('')
          clearTimeout(timer.current)
          timer.current = setTimeout(save, SAVE_AFTER_MS)
          // Comments whose words changed keep them: told to be stored (C304).
          clearTimeout(movedTimer.current)
          movedTimer.current = setTimeout(tellMoved, SAVE_AFTER_MS)
        }
        // Struck or typed over from the prompt into the reply: joined (C214
        // (a)). By a key, at once, to the bar; by typing, when it pauses.
        if (joining) {
          if (tr.getMeta(INTENT)) join(true)
          else joinSoon()
        } else if (joinTimer.current && tr.docChanged) joinSoon()
      },
      // A prompt or reply selected whole (C311, step 3): the first Backspace
      // or Delete says what will go, the second takes it out of the chat,
      // with the chat's own offer to bring it back. Any other key keeps it.
      // Words selected beside it, in other parts, change as within any part.
      handleKeyDown: (view, event) => {
        const deletes = event.key === 'Backspace' || event.key === 'Delete'
        const whole = deletes && onDeletePartsRef.current && !cleanRef.current ? wholeParts(view.state) : []
        if (!whole.length) { armed.current = null; return false }
        const { from, to } = view.state.selection
        const key = whole.map((p) => p.message).join('|') + ':' + from + ':' + to
        event.preventDefault()
        if (armed.current !== key) {
          armed.current = key
          setSaid(wordsRef.current?.deleteAgain?.(whole.length, whole[0].part) ?? '')
          return true
        }
        armed.current = null
        const going = new Set(whole.map((p) => p.message))
        const beside = acrossParts(view.state, view.state.tr.delete(from, to), plainIn, going)
        for (const make of beside ?? []) view.dispatch(make(view.state))
        setSaid('')
        onDeletePartsRef.current([...going])
        return true
      },
      handleDOMEvents: {
        blur: () => {
          if (timer.current) save()
          if (joinTimer.current) join(false)
          return false
        },
        // Typing over a selection from one card into the other is the
        // editor's to make, never the browser's: across the cards the
        // browser would remove what lies between them, buttons and all.
        // Struck, typed after, and joined (C214 (a)).
        beforeinput: (view, event) => {
          if (!crosses(view.state.selection)) return false
          if (event.inputType === 'insertText' || event.inputType === 'insertReplacementText') {
            event.preventDefault()
            if (event.data) view.dispatch(view.state.tr.insertText(event.data))
            return true
          }
          return false
        },
      },
    })
    view.current = v
    // Your text, just made from the empty room (C301 (f)): the caret at its
    // end, and what was typed while its chat was being made.
    const carriedFor = sectionsRef.current.map((s) => s.message.id).find((id) => wantsFocus(id))
    if (carriedFor) {
      setTimeout(() => {
        // Taken only by the editor still drawn: in development React draws twice.
        if (view.current !== v) return
        const carried = takeFocus(carriedFor)
        if (!carried) return
        v.focus()
        v.dispatch(v.state.tr.setSelection(Selection.atEnd(v.state.doc)))
        carried.typed.split('\n').forEach((words, i) => {
          if (i) v.dispatch(v.state.tr.split(v.state.selection.from, 1, [{ type: schema.nodes.paragraph, attrs: { id: ids.block() } }]).setMeta(SKIP, true))
          if (words) v.dispatch(v.state.tr.insertText(words))
        })
      }, 0)
    }
    return () => {
      if (timer.current) save()
      clearTimeout(joinTimer.current)
      v.destroy()
      view.current = null
    }
    // Made once: as its parts change it is kept, below (C311, step 4).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Its parts changed (a prompt sent, a reply arriving or finished, one
  // deleted): the editor is kept, with the caret and what is being typed.
  // Parts still there keep their text as it stands, saved or not; new ones
  // are made from their messages. Undo starts again from here, as it did
  // when the editor was made again.
  useEffect(() => {
    const v = view.current
    if (!v || builtKey.current === sectionsKey) return
    builtKey.current = sectionsKey
    if (timer.current) save()
    const ids = idsRef.current
    const old = new Map()
    v.state.doc.forEach((node, offset) => old.set(keyOfNode(node), { node, offset }))
    const made = sectionsRef.current.map((s) => old.get(`${s.part}:${s.message.id}`)?.node ?? nodeOf(s, ids))
    const doc = schema.nodes.doc.create(null, made)
    const starts = new Map()
    doc.forEach((node, offset) => starts.set(keyOfNode(node), offset))
    // The caret, in the part it was in.
    const moved = (pos) => {
      for (const [key, was] of old) {
        if (pos > was.offset && pos < was.offset + was.node.nodeSize && was.node.type === schema.nodes.section) return starts.has(key) ? starts.get(key) + (pos - was.offset) : null
      }
      return null
    }
    let selection
    const a = moved(v.state.selection.anchor)
    const h = moved(v.state.selection.head)
    if (a != null && h != null) {
      try { selection = TextSelection.create(doc, a, h) } catch { selection = undefined }
    }
    doc.forEach((sec) => {
      if (sec.type === schema.nodes.section && savedKeys.current[sec.attrs.message] == null) savedKeys.current[sec.attrs.message] = JSON.stringify(toBlocks(sec))
    })
    // Marks drawn from outside are given again, to the new state.
    commentsWas.current = ''
    shownWas.current = ''
    armed.current = null
    v.updateState(EditorState.create({ doc, plugins: v.state.plugins, ...(selection ? { selection } : {}) }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionsKey])

  // A card changed from outside (an ask's answer placed in it, C218): the
  // editor drawn again from what is stored, so it shows and no save writes
  // over it.
  const outside = JSON.stringify(sections.map((s) => s.message.blocks ?? null))
  useEffect(() => {
    const v = view.current
    if (!v) return
    const changed = sectionsRef.current.some((s) => s.part !== 'fixed' && s.message.blocks != null && JSON.stringify(s.message.blocks) !== savedKeys.current[s.message.id])
    if (!changed) return
    const ids = idsRef.current
    const made = []
    v.state.doc.forEach((sec) => {
      if (sec.type !== schema.nodes.section) { made.push(sec); return }
      const s = sectionsRef.current.find((x) => x.message.id === sec.attrs.message)
      const fresh = s?.message.blocks != null ? fromBlocks(s.message.blocks, ids.block) : null
      made.push(fresh ? schema.nodes.section.create(sec.attrs, fresh.content) : sec)
      if (s?.message.blocks != null) savedKeys.current[sec.attrs.message] = JSON.stringify(s.message.blocks)
    })
    v.updateState(EditorState.create({ doc: schema.nodes.doc.create(null, made), plugins: v.state.plugins }))
  }, [outside])

  // Each ask's number and state, for its marker.
  useEffect(() => { view.current?.dispatch(view.current.state.tr.setMeta(asksKey, askInfo)) }, [askInfo, sectionsKey])
  // Each suggestion's number, for its marker (C229).
  useEffect(() => { view.current?.dispatch(view.current.state.tr.setMeta(suggestionsKey, sugInfo)) }, [sugInfo, sectionsKey])
  useEffect(() => { view.current?.dispatch(view.current.state.tr.setMeta(heldKey, heldEdits)) }, [heldEdits, sectionsKey])

  // Highlights and quotes, each card's its own, drawn again only when they change.
  const shownWas = useRef('')
  const shown = {
    terms,
    sections: Object.fromEntries(sections.map((s) => [s.message.id, {
      quotes: s.quotes ?? [],
      highlights: s.highlights ?? [],
      whole: s.part === 'prompt' ? stripAttachedFileBlocks(s.message.content) : s.message.content,
    }])),
  }
  const shownKeyNow = JSON.stringify(shown)
  const shownRef = useRef(shownKeyNow)
  useEffect(() => { shownRef.current = shownKeyNow })
  useEffect(() => {
    if (shownKeyNow === shownWas.current || !view.current) return
    shownWas.current = shownKeyNow
    view.current.dispatch(view.current.state.tr.setMeta(shownKey, JSON.parse(shownKeyNow)))
  }, [shownKeyNow, sectionsKey])

  // Each card's comments on words, drawn again only when they change (C301 (c)).
  const commentsNow = JSON.stringify({ sections: Object.fromEntries(sections.map((s) => [s.message.id, s.comments ?? []])) })
  const commentsRef = useRef(commentsNow)
  useEffect(() => { commentsRef.current = commentsNow })
  useEffect(() => {
    if (commentsNow === commentsWas.current || !view.current) return
    commentsWas.current = commentsNow
    view.current.dispatch(view.current.state.tr.setMeta(commentsKey, JSON.parse(commentsNow)))
  }, [commentsNow, sectionsKey])

  // markup · clean: the result only, read-only while it is shown.
  useEffect(() => {
    cleanRef.current = clean
    view.current?.setProps({ editable: () => !clean && !isReleased() })
    if (clean) closeMenu()
  }, [clean, closeMenu])

  // A selection dragged across cards: not an editor while it lasts (C280 (d)).
  useEffect(() => onRelease(() => view.current?.setProps({ editable: () => !cleanRef.current && !isReleased() })), [])

  return (
    <div className="p-pair-host">
      <div ref={host} />
      {sections.map((s) => {
        const h = hosts[s.message.id]
        if (!h) return null
        // A fixed part draws its own card whole; a written one, the card around its text.
        return s.part === 'fixed'
          ? createPortal(<MessageCard {...s.card} />, h.dom, s.message.id)
          : createPortal(<MessageCard {...s.card} hostContent={h.contentDOM} editedLine={s.editedLine ?? null} />, h.dom, s.message.id)
      })}
      {said && <p className="p-edit-said" role="status">{said}</p>}
      {blockMenu.element}
      {askBox.element}
      {commentBox.element}
    </div>
  )
}
