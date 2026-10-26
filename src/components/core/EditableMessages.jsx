import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { EditorState } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import { Mark } from 'prosemirror-model'
import '../../editing/editing.css'
import { schema } from '../../editing/schema'
import { replyFromMarkdown, promptFromText } from '../../editing/fromMarkdown'
import { fromBlocks, toBlocks, wordsOf } from '../../editing/blocks'
import { editsIn } from '../../editing/edits'
import { track, createEditIds, cursorMarks, REFUSED, SKIP, INTENT } from '../../editing/track'
import { editingPlugins, announcePlugin } from '../../editing/keys'
import { shownPlugin, shownKey } from '../../editing/shown'
import { chartView } from '../../editing/chartView'
import { withoutAnswers } from '../../editing/answers'
import { stripAttachedFileBlocks } from '../../lib/fileUpload'
import { useBlockMenu } from './useBlockMenu'
import { useAskBox } from './useAskBox'
import { asksIn } from '../../editing/edits'
import { asksPlugin, asksKey, settleAsk } from '../../editing/asks'
import MessageCard from './MessageCard'

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

const SAVE_AFTER_MS = 500
// Joined by typing over both cards: the bar is filled once the typing pauses.
const JOIN_AFTER_MS = 800

// The section, prompt or reply, a position is in.
function sectionAt($pos) {
  for (let d = $pos.depth; d > 0; d--) if ($pos.node(d).type === schema.nodes.section) return { node: $pos.node(d), pos: $pos.before(d) }
  return null
}
const inReply = (state) => sectionAt(state.selection.$from)?.node.attrs.part !== 'prompt'
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
const ASK_WORDS = { label: 'ASK', placeholder: 'Ask in your own words: make it shorter, or add the year it opened', ask: 'ask', accept: 'accept', undo: 'undo' }
const NO_ASKS = new Map()
// askInfo: each ask's number and state, by its id; onSettleAsk(messageId, askId, how)
// when one is accepted or undone; askWords: the ASK box's and markers' words (C218).
export default function EditableMessages({ sections, terms = [], quotedTitle, clean = false, onSave, words, closedEdits = NO_CLOSED, askInfo = NO_ASKS, onSettleAsk, askWords = ASK_WORDS }) {
  // Edits already told to a model: typing beside one starts a new edit (C216 (i)).
  const closedRef = useRef(closedEdits)
  useEffect(() => { closedRef.current = closedEdits }, [closedEdits])
  const host = useRef(null)
  const view = useRef(null)
  const idsRef = useRef(null)
  const savedKeys = useRef({})
  const timer = useRef(0)
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
  const askBox = useAskBox(view, (askId, question) => { questions.current.set(askId, question) }, askWords, inReply)
  const askOptions = askBox.options
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
    if (!v) return
    v.state.doc.forEach((sec) => {
      if (sec.type !== schema.nodes.section) return
      const id = sec.attrs.message
      const blocks = toBlocks(sec)
      const key = JSON.stringify(blocks)
      // Saved only when a card's stored form changes.
      if (savedKeys.current[id] === key) return
      savedKeys.current[id] = key
      const asks = new Map([...asksIn(sec)].map(([askId, a]) => [askId, { ...a, question: questions.current.get(askId) }]))
      Promise.resolve(onSaveRef.current?.(id, { blocks, edits: editsIn(sec), asks, part: sec.attrs.part })).catch((err) => {
        savedKeys.current[id] = null
        setSaid(`Not saved: ${String(err?.message ?? err)}`)
      })
    })
  }, [])

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

  // The editor, made again only when its cards change (a reply arriving
  // under a prompt): its own saves must not draw it again.
  useEffect(() => {
    const ids = createEditIds()
    ids.setClosed((edit) => closedRef.current.has(edit))
    idsRef.current = ids
    const made = sectionsRef.current.map((s) => {
      const m = s.message
      const inner = fromBlocks(m.blocks, ids.block)
        ?? (s.part === 'prompt' ? promptFromText(stripAttachedFileBlocks(m.content), ids.block)
          // A source's answer is plain text, never read as Markdown (stage 4).
          : s.plain ? promptFromText(m.content, ids.block)
            : replyFromMarkdown(withoutAnswers(m.content), ids.block, { anchors: `msg-${m.id}` }))
      return schema.nodes.section.create({ part: s.part, message: m.id }, inner.content)
    })
    const doc = schema.nodes.doc.create(null, made)
    savedKeys.current = {}
    doc.forEach((sec) => { savedKeys.current[sec.attrs.message] = JSON.stringify(toBlocks(sec)) })
    const plugins = [
      ...editingPlugins({ ids, blocks: inReply, onNote: (text) => setSaid(text), onJoin: () => join(), ...menuOptions, ...askOptions }),
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
      announcePlugin(() => true),
      shownPlugin({ quotedTitle: (num) => quotedTitle?.(num) ?? '' }),
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
    const v = new EditorView(host.current, {
      state: EditorState.create({ doc, plugins }),
      editable: () => !cleanRef.current,
      nodeViews: { section: sectionView, chart: (node) => chartView(node) },
      attributes: () => ({ class: `p-pair${cleanRef.current ? ' clean' : ''}`, 'aria-label': wordsRef.current?.label ?? '', spellcheck: 'true', role: 'textbox', 'aria-multiline': 'true' }),
      dispatchTransaction(tr) {
        const before = v.state
        const joining = crosses(before.selection) && tr.docChanged && !tr.getMeta(SKIP)
        const out = track(before, tr, { ids, onError: (e) => console.error('[editing] a change was refused', e) })
        if (out.getMeta(REFUSED)) setSaid('That change could not be made here.')
        let next = before.apply(out)
        if (!v.composing) {
          const marks = cursorMarks(next, ids)
          if (marks && !(next.storedMarks && Mark.sameSet(next.storedMarks, marks))) next = next.apply(next.tr.setStoredMarks(marks))
        }
        v.updateState(next)
        if (tr.docChanged) {
          setSaid('')
          clearTimeout(timer.current)
          timer.current = setTimeout(save, SAVE_AFTER_MS)
        }
        // Struck or typed over from the prompt into the reply: joined (C214
        // (a)). By a key, at once, to the bar; by typing, when it pauses.
        if (joining) {
          if (tr.getMeta(INTENT)) join(true)
          else joinSoon()
        } else if (joinTimer.current && tr.docChanged) joinSoon()
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
    return () => {
      if (timer.current) save()
      clearTimeout(joinTimer.current)
      v.destroy()
      view.current = null
    }
    // Made again only when its cards change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionsKey])

  // A card changed from outside (an ask's answer placed in it, C218): the
  // editor drawn again from what is stored, so it shows and no save writes
  // over it.
  const outside = JSON.stringify(sections.map((s) => s.message.blocks ?? null))
  useEffect(() => {
    const v = view.current
    if (!v) return
    const changed = sectionsRef.current.some((s) => s.message.blocks != null && JSON.stringify(s.message.blocks) !== savedKeys.current[s.message.id])
    if (!changed) return
    const ids = idsRef.current
    const made = []
    v.state.doc.forEach((sec) => {
      const s = sectionsRef.current.find((x) => x.message.id === sec.attrs.message)
      const fresh = s?.message.blocks != null ? fromBlocks(s.message.blocks, ids.block) : null
      made.push(fresh ? schema.nodes.section.create(sec.attrs, fresh.content) : sec)
      if (s?.message.blocks != null) savedKeys.current[sec.attrs.message] = JSON.stringify(s.message.blocks)
    })
    v.updateState(EditorState.create({ doc: schema.nodes.doc.create(null, made), plugins: v.state.plugins }))
  }, [outside])

  // Each ask's number and state, for its marker.
  useEffect(() => { view.current?.dispatch(view.current.state.tr.setMeta(asksKey, askInfo)) }, [askInfo, sectionsKey])

  // Highlights and quotes, each card's its own, drawn again only when they change.
  const shownWas = useRef('')
  const shown = {
    terms,
    sections: Object.fromEntries(sections.map((s) => [s.message.id, {
      quotes: s.quotes ?? [],
      whole: s.part === 'prompt' ? stripAttachedFileBlocks(s.message.content) : s.message.content,
    }])),
  }
  const shownKeyNow = JSON.stringify(shown)
  useEffect(() => {
    if (shownKeyNow === shownWas.current || !view.current) return
    shownWas.current = shownKeyNow
    view.current.dispatch(view.current.state.tr.setMeta(shownKey, JSON.parse(shownKeyNow)))
  }, [shownKeyNow, sectionsKey])

  // markup · clean: the result only, read-only while it is shown.
  useEffect(() => {
    cleanRef.current = clean
    view.current?.setProps({ editable: () => !clean })
    if (clean) closeMenu()
  }, [clean, closeMenu])

  return (
    <div className="p-pair-host">
      <div ref={host} />
      {sections.map((s) => {
        const h = hosts[s.message.id]
        return h ? createPortal(<MessageCard {...s.card} hostContent={h.contentDOM} editedLine={s.editedLine ?? null} />, h.dom, s.message.id) : null
      })}
      {said && <p className="p-edit-said" role="status">{said}</p>}
      {blockMenu.element}
      {askBox.element}
    </div>
  )
}
