import { useRef, useState, useCallback, useMemo } from 'react'
import { BLOCK_CHOICES, setBlock } from '../../editing/keys'

// The / menu of a reply edited in place (stage 11; the editing spec, "Blocks
// and the / menu"): what a line, or the selected words, become. Shared by a
// reply on its own and a prompt with its reply. Its plugin options go to
// editingPlugins; its element is drawn beside the editor.

const choicesFor = (filter) => BLOCK_CHOICES.filter((c) => c.label.toLowerCase().includes(filter.toLowerCase()))

/**
 * @param {{ current: import('prosemirror-view').EditorView|null }} viewRef
 * @param {{ current: object|null }} idsRef the editor's ids, for new blocks
 */
export function useBlockMenu(viewRef, idsRef) {
  const [menu, setMenu] = useState(null)
  const menuRef = useRef(null)
  const set = useCallback((next) => { menuRef.current = next; setMenu(next) }, [])
  const turn = useCallback((choice) => {
    const v = viewRef.current
    if (v && choice) v.dispatch(setBlock(v.state, choice, idsRef.current))
  }, [viewRef, idsRef])

  const options = useMemo(() => ({
    onSlash: (v) => {
      const c = v.coordsAtPos(v.state.selection.from)
      set({ filter: '', index: 0, x: c.left, y: c.bottom + 6 })
      return true
    },
    menuText: (text) => {
      const m = menuRef.current
      if (!m) return false
      set({ ...m, filter: m.filter + text, index: 0 })
      return true
    },
    menuKey: (e) => {
      const m = menuRef.current
      if (!m) return false
      const list = choicesFor(m.filter)
      const n = Math.max(1, list.length)
      if (e.key === 'Escape') set(null)
      else if (e.key === 'ArrowDown') set({ ...m, index: (m.index + 1) % n })
      else if (e.key === 'ArrowUp') set({ ...m, index: (m.index - 1 + n) % n })
      else if (e.key === 'Enter') {
        set(null)
        turn(list[m.index])
      } else if (e.key === 'Backspace') set(m.filter ? { ...m, filter: m.filter.slice(0, -1), index: 0 } : null)
      else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) set({ ...m, filter: m.filter + e.key, index: 0 })
      else return false
      return true
    },
  }), [set, turn])

  const pick = (choice) => {
    set(null)
    turn(choice)
    viewRef.current?.focus()
  }
  const list = menu ? choicesFor(menu.filter) : []
  const element = menu && (
    <div className="p-edit-menu" role="menu" aria-label="Turn this line into" style={{ left: menu.x, top: menu.y }}>
      <div className="f">/{menu.filter}</div>
      {list.map((c, i) => (
        <button key={c.key} type="button" role="menuitem" className={i === menu.index ? 'on' : ''} onMouseDown={(e) => e.preventDefault()} onClick={() => pick(c)}>{c.label}</button>
      ))}
      {!list.length && <div className="f">nothing matches</div>}
      <div className="foot">Formatting is yours; it is never sent to the model.</div>
    </div>
  )
  const close = useCallback(() => set(null), [set])
  return { options, close, element }
}
