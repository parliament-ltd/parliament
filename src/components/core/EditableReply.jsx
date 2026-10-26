import { useEffect, useRef, useState, useCallback } from 'react'
import { EditorState } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import { Mark } from 'prosemirror-model'
import '../../editing/editing.css'
import { replyFromMarkdown } from '../../editing/fromMarkdown'
import { fromBlocks, toBlocks } from '../../editing/blocks'
import { editsIn } from '../../editing/edits'
import { track, createEditIds, cursorMarks, REFUSED } from '../../editing/track'
import { editingPlugins, announcePlugin, BLOCK_CHOICES, setBlock } from '../../editing/keys'
import { shownPlugin, shownKey } from '../../editing/shown'
import { chartView } from '../../editing/chartView'

// A finished reply, edited in place (stage 11, piece 1; the editing spec,
// "Editing replies"; C210, C212). Deleting strikes the model's words, typing
// adds the person's in blue, typing over a selection does both as one edit;
// Enter, Backspace and / shape lines without making edits; paste is plain
// text; Ctrl+Z and Ctrl+Y use Parliament's own history.
//
// What the model wrote stays as it is in the message's content, which the
// model goes on reading. The editable form is saved beside it as `blocks`,
// with one record for each edit, the first time the reply is edited and then
// half a second after each change, and when the reply loses focus or leaves
// the screen. Nothing here sends anything.

const SAVE_AFTER_MS = 500

const choicesFor = (filter) => BLOCK_CHOICES.filter((c) => c.label.toLowerCase().includes(filter.toLowerCase()))

/**
 * @param {{
 *   id: string, content: string, blocks?: object[]|null,
 *   terms?: Array<{ text: string, bg: string }>, quotes?: Array<{ num: number, text: string }>,
 *   quotedTitle?: (num: number) => string,
 *   clean?: boolean,
 *   onSave: (saved: { blocks: object[], edits: Map<string, object> }) => Promise<unknown>,
 * }} props
 */
export default function EditableReply({ id, content, blocks = null, terms = [], quotes = [], quotedTitle, clean = false, onSave }) {
  const host = useRef(null)
  const view = useRef(null)
  const saved = useRef(null) // the stored form last saved, or the one first drawn, as text
  const timer = useRef(0)
  const onSaveRef = useRef(onSave)
  const cleanRef = useRef(clean)
  const menuRef = useRef(null)
  const idsRef = useRef(null)
  const [menu, setMenu] = useState(null)
  const [said, setSaid] = useState('')

  useEffect(() => { onSaveRef.current = onSave }, [onSave])

  const save = useCallback(() => {
    clearTimeout(timer.current)
    timer.current = 0
    const v = view.current
    if (!v) return
    // Saved only when the stored form changes: an empty line opened and
    // left, or a cursor moved, is nothing to keep.
    const doc = v.state.doc
    const blocksNow = toBlocks(doc)
    const key = JSON.stringify(blocksNow)
    if (key === saved.current) return
    saved.current = key
    Promise.resolve(onSaveRef.current?.({ blocks: blocksNow, edits: editsIn(doc) })).catch((err) => {
      // Kept on screen; the next change tries again.
      saved.current = null
      setSaid(`Not saved: ${String(err?.message ?? err)}`)
    })
  }, [])

  // The editor, made once for this message.
  useEffect(() => {
    const ids = createEditIds()
    idsRef.current = ids
    const doc = fromBlocks(blocks, ids.block) ?? replyFromMarkdown(content, ids.block, { anchors: `msg-${id}` })
    saved.current = JSON.stringify(toBlocks(doc))
    const setMenuBoth = (next) => { menuRef.current = next; setMenu(next) }
    const plugins = [
      ...editingPlugins({
        ids, blocks: true,
        onNote: (text) => setSaid(text),
        onSlash: (v) => {
          const c = v.coordsAtPos(v.state.selection.from)
          setMenuBoth({ filter: '', index: 0, x: c.left, y: c.bottom + 6 })
          return true
        },
        menuText: (text) => {
          const m = menuRef.current
          if (!m) return false
          setMenuBoth({ ...m, filter: m.filter + text, index: 0 })
          return true
        },
        menuKey: (e) => {
          const m = menuRef.current
          if (!m) return false
          const list = choicesFor(m.filter)
          const n = Math.max(1, list.length)
          if (e.key === 'Escape') setMenuBoth(null)
          else if (e.key === 'ArrowDown') setMenuBoth({ ...m, index: (m.index + 1) % n })
          else if (e.key === 'ArrowUp') setMenuBoth({ ...m, index: (m.index - 1 + n) % n })
          else if (e.key === 'Enter') {
            const choice = list[m.index]
            setMenuBoth(null)
            if (choice) view.current.dispatch(setBlock(view.current.state, choice, ids))
          } else if (e.key === 'Backspace') setMenuBoth(m.filter ? { ...m, filter: m.filter.slice(0, -1), index: 0 } : null)
          else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) setMenuBoth({ ...m, filter: m.filter + e.key, index: 0 })
          else return false
          return true
        },
      }),
      announcePlugin(() => true),
      shownPlugin({ quotedTitle: (num) => quotedTitle?.(num) ?? '' }),
    ]
    const v = new EditorView(host.current, {
      state: EditorState.create({ doc, plugins }),
      editable: () => !cleanRef.current,
      nodeViews: { chart: (node) => chartView(node) },
      attributes: { 'aria-label': 'The reply. Every word can be edited', spellcheck: 'true', role: 'textbox', 'aria-multiline': 'true', dir: 'auto' },
      dispatchTransaction(tr) {
        const before = v.state
        const out = track(before, tr, { ids, onError: (e) => console.error('[editing] a change was refused', e) })
        if (out.getMeta(REFUSED)) setSaid('That change could not be made here.')
        let next = before.apply(out)
        // Before an input method starts, the cursor carries the person's
        // mark, so a composed word is theirs from its first character.
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
      },
      handleDOMEvents: {
        blur: () => { if (timer.current) save(); return false },
      },
    })
    view.current = v
    return () => {
      if (timer.current) save()
      v.destroy()
      view.current = null
    }
    // Made once per message: its own saves must not draw it again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Highlights and quotes, drawn again only when they change: a card redraws
  // often, and a change sent to the editor then could move the cursor.
  const shownWas = useRef('')
  useEffect(() => {
    const key = JSON.stringify([terms, quotes, content])
    if (key === shownWas.current || !view.current) return
    shownWas.current = key
    view.current.dispatch(view.current.state.tr.setMeta(shownKey, { terms, quotes, whole: content }))
  }, [terms, quotes, content])

  // markup · clean: the result only, and read-only while it is shown.
  useEffect(() => {
    cleanRef.current = clean
    view.current?.setProps({ editable: () => !clean })
    if (clean) setMenu(null)
  }, [clean])

  const pick = (choice) => {
    const v = view.current
    menuRef.current = null
    setMenu(null)
    if (!v) return
    v.dispatch(setBlock(v.state, choice, idsRef.current))
    v.focus()
  }

  const list = menu ? choicesFor(menu.filter) : []
  return (
    <div className={`p-edit parliament-md text-[15px]${clean ? ' clean' : ''}`}>
      <div ref={host} />
      {said && <p className="p-edit-said" role="status">{said}</p>}
      {menu && (
        <div className="p-edit-menu" role="menu" aria-label="Turn this line into" style={{ left: menu.x, top: menu.y }}>
          <div className="f">/{menu.filter}</div>
          {list.map((c, i) => (
            <button key={c.key} type="button" role="menuitem" className={i === menu.index ? 'on' : ''} onMouseDown={(e) => e.preventDefault()} onClick={() => pick(c)}>{c.label}</button>
          ))}
          {!list.length && <div className="f">nothing matches</div>}
          <div className="foot">Formatting is yours; it is never sent to the model.</div>
        </div>
      )}
    </div>
  )
}
