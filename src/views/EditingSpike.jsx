import { useEffect, useRef, useState } from 'react'
import { EditorState, Selection, TextSelection } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import { Mark } from 'prosemirror-model'
import '../styles/tokens.css'
import '../spike/editing/editing-spike.css'
import { replyFromMarkdown, promptFromText } from '../spike/editing/fromMarkdown'
import { track, createIds, cursorMarks, undoEdit, collectEdits, noteForModel, REFUSED } from '../spike/editing/track'
import { editingPlugins, BLOCK_CHOICES, setBlock } from '../spike/editing/keys'
import { BRANCHES, EVERY_KIND, longReply } from '../spike/editing/samples'

// Throwaway spike for stage 11 (refactor-plan.md; conflicts.md C205): can a
// reply and a prompt be edited in place on ProseMirror, with the editing
// spec's rules, in every way a person types? Not part of the product.
// Reached at /dev/editing in development, and in a production build only when
// it is built with VITE_PROTOTYPES=1, so it can be tried under the real
// security headers with `vite preview`. Nothing here is stored or sent: the
// replies live in this page's memory and go when it closes. Its words are
// written here, not in the copy table, as a prototype's are.

const PROSEMIRROR = 'prosemirror-model 1.25.12, -state 1.4.4, -view 1.42.6, -transform 1.12.2, -keymap 1.2.3'
const CHECKS_KEY = 'parliament-editing-spike-checks'

const CHECKLIST = [
  { key: 'ime-ja', q: 'Japanese, with the input method', how: 'Add Japanese under Windows Settings, Time and language, Language and region, then switch with Windows+Space. In 201a, type a few words, convert with Space and confirm with Enter: the line must not split, and the words come out blue. Start another word and cancel it with Escape.' },
  { key: 'ime-zh', q: 'Chinese, with the input method', how: 'The same with Chinese (Simplified), Microsoft Pinyin.' },
  { key: 'ime-over', q: 'Composing over a selection', how: 'Select "eleven years" in 201a and type Japanese or Chinese over it: those words struck, the new ones straight after, one edit card.' },
  { key: 'narrator', q: 'Narrator', how: 'Ctrl+Windows+Enter turns it on (and off). Put the cursor on a line with a struck word and an added one and read it (Caps Lock+Down reads on): does it say which is removed and which is added? Try with "say marks" on and off.' },
  { key: 'select', q: 'Selection across blocks', how: 'Select from the middle of one paragraph into the next and press Backspace: both parts struck, one card. Then type over another such selection.' },
  { key: 'paste', q: 'Paste', how: 'Copy formatted text from a web page or a document and paste it: plain text only, blue. Paste over a selection: the selection struck.' },
  { key: 'undo', q: 'Undo', how: 'Ctrl+Z does nothing in the reply and says why. Undo on a card brings the words back exactly.' },
  { key: 'spell', q: 'Spelling correction', how: 'Type a misspelt word, right-click it and pick the suggestion: it stays your word, one edit.' },
  { key: 'blocks', q: 'Enter, Backspace and /', how: 'In "every kind of block": Enter in the middle of a line, Backspace at a heading\'s start (it turns plain), / at a line\'s start (the menu), a checklist box, a table struck with Backspace after selecting it.' },
  { key: 'long', q: 'A long reply', how: 'Open "long reply": type, strike and press Enter in the middle. It should keep up; the last change\'s time is under the log.' },
  { key: 'gecko', q: 'Zen or LibreWolf', how: 'Open this page in Zen or LibreWolf (Firefox\'s engine) and try striking, typing over, Enter, paste and an input method.' },
  { key: 'android', q: 'Android', how: 'Not tried: no phone at hand (C205 (h)). Written down as untried.' },
]

const RESULTS = [['pass', 'works'], ['fail', 'fails'], ['odd', 'works, oddly'], ['skip', 'not tried']]

// Edits of a document, kept per document so a page redraw does not recount.
const editsCache = new WeakMap()
function editsOf(doc) {
  if (!editsCache.has(doc)) editsCache.set(doc, collectEdits(doc))
  return editsCache.get(doc)
}

function readChecks() {
  try { return JSON.parse(localStorage.getItem(CHECKS_KEY) ?? '{}') } catch { return {} }
}

// What the editors call back into on the page (one spike page at a time).
const page = {}

// Everything the editors share, made once: the id counter, the plugins and
// each sample's prompt and reply.
function createWorld() {
  const ids = createIds(240)
  const samples = [...BRANCHES, EVERY_KIND, longReply(5000)]
  const plugins = (blocks) => editingPlugins({
    ids, blocks,
    log: (line) => page.log?.(`${blocks ? 'reply' : 'prompt'}: ${line}`),
    onSlash: blocks ? (view) => page.openMenu?.(view) ?? false : undefined,
    onUndoKey: () => page.toast?.('Undo is on each edit’s card: the browser’s own undo does not know struck words.'),
    menuKey: blocks ? (event) => page.menuKey?.(event) ?? false : undefined,
    menuText: blocks ? (text) => page.menuText?.(text) ?? false : undefined,
  })
  const replyPlugins = plugins(true)
  const promptPlugins = plugins(false)
  const store = Object.fromEntries(samples.map((s) => [s.key, {
    sample: s,
    reply: EditorState.create({ doc: replyFromMarkdown(s.reply, ids.block), plugins: replyPlugins }),
    prompt: EditorState.create({ doc: promptFromText(s.prompt, ids.block), plugins: promptPlugins }),
    held: new Set(),
    sent: new Map(),
  }]))
  return { ids, samples, store }
}

export default function EditingSpike() {
  const [world] = useState(() => createWorld())
  const { ids, samples, store } = world
  const [current, setCurrent] = useState('201a')
  const currentRef = useRef(current)
  const [, setTick] = useState(0)
  const [menu, setMenu] = useState(null)
  const menuRef = useRef(null)
  const [toast, setToast] = useState('')
  const [log, setLog] = useState([])
  const logLines = useRef([])
  const frame = useRef(0)
  const [facts, setFacts] = useState(null)
  const [error, setError] = useState(null)
  const [clean, setClean] = useState(false)
  const cleanRef = useRef(false)
  const [announce, setAnnounce] = useState(true)
  const [checks, setChecks] = useState(readChecks)
  const [copied, setCopied] = useState(null)
  const replyEl = useRef(null)
  const promptEl = useRef(null)
  const views = useRef({})

  // The / menu.
  const choices = (filter) => BLOCK_CHOICES.filter((c) => c.label.toLowerCase().includes(filter.toLowerCase()))
  const pick = (choice) => {
    const v = views.current.reply
    v.dispatch(setBlock(v.state, choice, ids))
    menuRef.current = null
    setMenu(null)
    v.focus()
  }

  // What the editors call back into, kept current after every drawing.
  useEffect(() => {
    currentRef.current = current
    cleanRef.current = clean
    menuRef.current = menu
    // The log, redrawn at most every 60 ms so typing is never held up by it
    // (a timer, not an animation frame, which stops in a background tab).
    page.log = (line) => {
      const t = new Date()
      logLines.current = [...logLines.current.slice(-59), `${String(t.getSeconds()).padStart(2, '0')}.${String(t.getMilliseconds()).padStart(3, '0')} ${line}`]
      if (!frame.current) frame.current = setTimeout(() => { frame.current = 0; setLog(logLines.current) }, 60)
    }
    page.openMenu = (view) => {
      const c = view.coordsAtPos(view.state.selection.from)
      const next = { filter: '', index: 0, x: c.left, y: c.bottom + 6 }
      menuRef.current = next
      setMenu(next)
      return true
    }
    page.menuText = (text) => {
      const m = menuRef.current
      if (!m) return false
      const next = { ...m, filter: m.filter + text, index: 0 }
      menuRef.current = next
      setMenu(next)
      return true
    }
    page.menuKey = (e) => {
      const m = menuRef.current
      if (!m) return false
      const list = choices(m.filter)
      const set = (next) => { menuRef.current = next; setMenu(next) }
      if (e.key === 'Escape') set(null)
      else if (e.key === 'ArrowDown') set({ ...m, index: (m.index + 1) % Math.max(1, list.length) })
      else if (e.key === 'ArrowUp') set({ ...m, index: (m.index - 1 + Math.max(1, list.length)) % Math.max(1, list.length) })
      else if (e.key === 'Enter') { if (list[m.index]) pick(list[m.index]); else set(null) }
      else if (e.key === 'Backspace') set(m.filter ? { ...m, filter: m.filter.slice(0, -1), index: 0 } : null)
      else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) set({ ...m, filter: m.filter + e.key, index: 0 })
      else return false
      return true
    }
  })

  useEffect(() => {
    page.toast = (text) => setToast(text)
    const make = (el, which) => {
      const view = new EditorView(el, {
        state: store[currentRef.current][which],
        editable: () => !cleanRef.current,
        attributes: { 'aria-label': which === 'reply' ? 'The reply. Every word can be edited' : 'Your prompt. Every word can be edited', spellcheck: 'true', role: 'textbox', 'aria-multiline': 'true' },
        dispatchTransaction(tr) {
          const t0 = performance.now()
          const before = view.state
          const out = track(before, tr, { ids, onError: (e) => setError(String(e?.message ?? e)) })
          if (out.getMeta(REFUSED)) page.log(`refused: ${out.getMeta(REFUSED)}`)
          let next = before.apply(out)
          // Before an input method starts, the cursor carries the person's
          // mark, so a composed word is theirs from its first character.
          if (!view.composing) {
            const marks = cursorMarks(next, ids)
            if (marks && !(next.storedMarks && Mark.sameSet(next.storedMarks, marks))) next = next.apply(next.tr.setStoredMarks(marks))
          }
          view.updateState(next)
          store[currentRef.current][which] = next
          if (tr.docChanged) {
            setToast('')
            setFacts({ ms: performance.now() - t0, which, composing: view.composing, rewritten: out !== tr })
            setTick((t) => t + 1)
          }
        },
      })
      return view
    }
    const made = { reply: make(replyEl.current, 'reply'), prompt: make(promptEl.current, 'prompt') }
    views.current = made
    return () => {
      made.reply.destroy()
      made.prompt.destroy()
    }
  }, [ids, store])

  useEffect(() => {
    for (const v of Object.values(views.current)) v.setProps({ editable: () => !clean })
  }, [clean])

  useEffect(() => {
    try { localStorage.setItem(CHECKS_KEY, JSON.stringify(checks)) } catch { /* a convenience only */ }
  }, [checks])

  const switchTo = (key) => {
    setCurrent(key)
    currentRef.current = key
    views.current.reply.updateState(store[key].reply)
    views.current.prompt.updateState(store[key].prompt)
    menuRef.current = null
    setMenu(null)
    setToast('')
  }

  const entry = store[current]
  const s = entry.sample
  const replyEdits = editsOf(entry.reply.doc)
  const promptEdits = editsOf(entry.prompt.doc)
  const waiting = (list) => list.filter((e) => !entry.held.has(e.id) && !entry.sent.has(e.id))
  const goReply = waiting(replyEdits)
  const goPrompt = waiting(promptEdits)
  const going = goReply.length + goPrompt.length
  const held = [...replyEdits, ...promptEdits].filter((e) => entry.held.has(e.id)).length
  const reader = s.keyless ? 'Sonnet 4.6' : s.source
  const note = [
    goPrompt.length ? noteForModel(entry.prompt.doc, goPrompt, { what: `their prompt in ${s.key}` }) : '',
    goReply.length ? noteForModel(entry.reply.doc, goReply, { what: s.keyless ? `the ${s.source} text in ${s.key}` : `your reply in ${s.key}` }) : '',
  ].filter(Boolean).join('\n\n')

  const find = (e, which) => {
    const v = views.current[which]
    const doc = v.state.doc
    const from = Math.min(e.first, doc.content.size)
    const to = Math.min(e.last, doc.content.size)
    let sel
    try { sel = TextSelection.between(doc.resolve(from), doc.resolve(to)) } catch { sel = Selection.near(doc.resolve(from)) }
    v.dispatch(v.state.tr.setSelection(sel).scrollIntoView())
    v.focus()
  }
  const undo = (e, which) => {
    const v = views.current[which]
    v.dispatch(undoEdit(v.state, e.id))
    entry.held.delete(e.id)
    entry.sent.delete(e.id)
    setTick((t) => t + 1)
  }
  const hold = (e) => {
    if (entry.held.has(e.id)) entry.held.delete(e.id)
    else entry.held.add(e.id)
    setTick((t) => t + 1)
  }
  const send = () => {
    for (const e of [...goReply, ...goPrompt]) entry.sent.set(e.id, reader)
    setToast(`Marked as sent to ${reader}. In the spike nothing leaves the page: the note on the right is what would go, once.`)
    setTick((t) => t + 1)
  }

  const copyResults = async () => {
    const lines = CHECKLIST.map((c) => {
      const r = checks[c.key] ?? {}
      const word = RESULTS.find(([k]) => k === r.result)?.[1] ?? 'not tried'
      return `- ${c.q}: ${word}${r.note ? `. ${r.note}` : ''}`
    })
    const text = [`Editing spike, ${new Date().toISOString().slice(0, 10)}, ${navigator.userAgent}`, ...lines].join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopied('Copied. Paste it into the chat.')
    } catch {
      setCopied(text)
    }
  }

  const card = (e, which) => {
    const isHeld = entry.held.has(e.id)
    const sentTo = entry.sent.get(e.id)
    const where = which === 'prompt' ? `your prompt in ${s.key}` : s.key
    return (
      <div key={`${which}-${e.id}`} className={`es-card${isHeld ? ' held' : ''}`}>
        <div className="es-marg">edit {e.id} · {where}{sentTo ? ` · sent to ${sentTo}` : isHeld ? ' · held back, yours' : ''}</div>
        <div className="ed">
          {e.struck && <del>{e.struck}</del>}
          {e.struck && e.added && <span className="arrow" aria-hidden="true">→</span>}
          {e.added && <ins>{e.added}</ins>}
        </div>
        <div className="es-marg">{e.parts.map((p) => `${p.kind} ${p.index + 1} (block ${p.block}), ${p.from} to ${p.to}`).join('; ')}</div>
        <div className="acts">
          <button type="button" className="es-link" onClick={() => find(e, which)}>find</button>
          {!sentTo && <button type="button" className="es-link" onClick={() => hold(e)}>{isHeld ? 'let it go' : 'hold back'}</button>}
          <button type="button" className="es-link" onClick={() => undo(e, which)}>undo</button>
        </div>
      </div>
    )
  }

  const tabCount = (key) => {
    const x = store[key]
    return [...editsOf(x.reply.doc), ...editsOf(x.prompt.doc)].filter((e) => !x.held.has(e.id) && !x.sent.has(e.id)).length
  }
  const doc = entry.reply.doc
  const menuList = menu ? choices(menu.filter) : []

  return (
    <div className={`es${clean ? ' clean' : ''}${announce ? ' announce' : ''}`}>
      <header className="es-head">
        <h1>Editing in place: the spike</h1>
        <p>Stage 11 (C205). A reply and its prompt, edited in place on ProseMirror ({PROSEMIRROR}). Nothing here is stored or sent: the replies live in this page and go when it closes. Delete strikes; typing adds your words in blue; typing over a selection does both, as one edit.</p>
      </header>
      <div className="es-grid">
        <main>
          <div className="es-room">
            <div className="es-roomhead">
              <b>Writing studio</b>
              <span className="es-marg">Murano story · plan 201</span>
              <span style={{ flex: 1 }} />
              <button type="button" className="es-link" onClick={() => setClean((c) => !c)}>{clean ? 'clean · show markup' : 'markup · show clean'}</button>
            </div>
            <nav className="es-tabs" aria-label="Branches and samples">
              {samples.map((x, i) => {
                const n = tabCount(x.key)
                const label = x.key === 'blocks' ? 'every kind of block' : x.key === 'long' ? `long reply, ${x.words.toLocaleString()} words` : x.key
                return (
                  <button key={x.key} type="button" className={`es-tab${x.key === current ? ' on' : ''}${i === BRANCHES.length ? ' sep' : ''}`} aria-current={x.key === current ? 'true' : undefined} onClick={() => switchTo(x.key)}>
                    {label}{BRANCHES.some((b) => b.key === x.key) && <span className="src">{x.source}</span>}{n > 0 && <span className="cnt">{n}</span>}
                  </button>
                )
              })}
            </nav>
            <div className="es-body">
              {s.keyless && <p className="es-said">{s.source} supplies the text. Mark it, edit it: those go to {reader}, never to {s.source}.</p>}
              <div className="es-prompt"><div ref={promptEl} /></div>
              <p className="es-under es-marg">
                {promptEdits.length > 0
                  ? <>your prompt in {s.key}, edited; the other branches keep theirs · <button type="button" className="es-link" onClick={() => setToast('Asking again makes a new branch from the edited wording, 201d. Not built in the spike.')}>ask again as 201d</button></>
                  : <>your prompt in {s.key}</>}
              </p>
              <div className="es-reply"><div ref={replyEl} /></div>
            </div>
            <div className="es-line">
              <span className="es-marg">
                {going
                  ? <><span className="cnt">{going} {going === 1 ? 'edit goes' : 'edits go'}</span> with your next prompt to {s.key}{s.keyless ? ` · ${reader} reads them, ${s.source} none` : ''}</>
                  : 'Nothing waits to go with your next prompt'}
                {held > 0 && ` · ${held} held back`}
              </span>
              <span style={{ flex: 1 }} />
              <button type="button" className="es-send" onClick={send} disabled={!going}>Send with the next prompt</button>
            </div>
            <div className="es-toast es-marg" role="status">{toast}</div>
          </div>
          <div className="es-toggles">
            <label><input type="checkbox" checked={announce} onChange={(e) => setAnnounce(e.target.checked)} /> say marks to a screen reader (“removed:”, “added:”)</label>
          </div>
        </main>

        <aside className="es-side">
          <section className="es-panel" aria-labelledby="es-edits">
            <h2 id="es-edits">Edits in {s.key} <span className="es-marg">{promptEdits.length + replyEdits.length || 'none yet'}</span></h2>
            {promptEdits.map((e) => card(e, 'prompt'))}
            {replyEdits.map((e) => card(e, 'reply'))}
            {!promptEdits.length && !replyEdits.length && <p className="es-marg">Delete a word in the reply, or type over one.</p>}
          </section>

          <section className="es-panel" aria-labelledby="es-note">
            <h2 id="es-note">What {reader} would be told <span className="es-marg">once, as text</span></h2>
            {note ? <pre className="es-note">{note}</pre> : <p className="es-marg">Nothing yet.</p>}
          </section>

          <section className="es-panel" aria-labelledby="es-checks">
            <h2 id="es-checks">Your part of the checklist <span className="es-marg">kept in this browser</span></h2>
            {CHECKLIST.map((c) => {
              const r = checks[c.key] ?? {}
              return (
                <div key={c.key} className="es-check">
                  <div className="q">{c.q}</div>
                  <div className="how">{c.how}</div>
                  <div className="pick" role="radiogroup" aria-label={c.q}>
                    {RESULTS.map(([k, w]) => (
                      <button key={k} type="button" role="radio" aria-checked={r.result === k} className={r.result === k ? 'on' : ''} onClick={() => setChecks((all) => ({ ...all, [c.key]: { ...all[c.key], result: k } }))}>{w}</button>
                    ))}
                  </div>
                  <textarea aria-label={`Notes: ${c.q}`} placeholder="What happened" value={r.note ?? ''} onChange={(e) => setChecks((all) => ({ ...all, [c.key]: { ...all[c.key], note: e.target.value } }))} />
                </div>
              )
            })}
            <div className="acts" style={{ marginTop: 8 }}>
              <button type="button" className="es-send" onClick={copyResults}>Copy the results</button>
            </div>
            {copied && <pre className="es-note" style={{ marginTop: 8 }}>{copied}</pre>}
          </section>

          <section className="es-panel" aria-labelledby="es-log">
            <h2 id="es-log">What the browser reports <span className="es-marg">keys, input, composing</span></h2>
            <ul className="es-log">{log.map((l, i) => <li key={i}>{l}</li>)}</ul>
            <div className="es-facts" style={{ marginTop: 8 }}>
              {facts && <span>last change {facts.ms.toFixed(1)} ms ({facts.which}{facts.rewritten ? ', rewritten as an edit' : ', as typed'})</span>}
              <span>{doc.childCount} blocks, {doc.textContent.length.toLocaleString()} characters</span>
              {facts && <span>composing: {facts.composing ? 'yes' : 'no'}</span>}
            </div>
            {error && <p className="es-err" role="alert">Refused a change: {error}</p>}
          </section>
        </aside>
      </div>

      {menu && (
        <div className="es-menu" role="menu" aria-label="Turn this line into" style={{ left: menu.x, top: menu.y }}>
          <div className="f">/{menu.filter}</div>
          {menuList.map((c, i) => (
            <button key={c.key} type="button" role="menuitem" className={i === menu.index ? 'on' : ''} onMouseDown={(e) => e.preventDefault()} onClick={() => pick(c)}>{c.label}</button>
          ))}
          {!menuList.length && <div className="f">nothing matches</div>}
          <div className="foot es-marg">Formatting is yours; it is never sent to the model.</div>
        </div>
      )}
    </div>
  )
}
