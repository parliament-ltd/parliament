import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useLingui } from '@lingui/react'
import { COPY } from '../copy'
import { fieldReducer, initialField, fieldValue } from '../shell/field'
import { barKey, isTextField } from '../shell/keys'
import { stepRecall } from '../lib/commandHistory'
import { restingMode } from '../shell/arrangement'
import { readField } from '../commands/parse'
import { complete } from '../commands/registry'
import { preview, promptPreview } from './preview'
import { roomLabel } from './say'
import Field from './Field'
import EnterLine from './EnterLine'
import Reference from './Reference'
import Inspect from './Inspect'
import Letter from './Letter'
import Compare from './Compare'
import KeyPanel from './KeyPanel'
import BackupPanel from './BackupPanel'
import LanguagePicker from './LanguagePicker'
import AnswerPicker from './AnswerPicker'
import ReplyPicker from './ReplyPicker'
import FrameworkPicker from './FrameworkPicker'
import { step as stepBranch } from '../stores/branchView'
import { useVoiceInput } from '../hooks/useVoiceInput'
import { formatSize } from '../lib/fileUpload'

// One bar: the field, its Enter line and the ? reference, pointed at one
// board. There is only ever one (C280, replacing C6's bar in every window):
// on the page, or in its own window when the bar itself is popped. Popped
// boards have none; its keys are listened for in every window, so / and
// Cmd/Ctrl+K reach it from anywhere.
//
// While a reply on a board is being edited, the field folds into a circle
// (C108). Hovering opens it without taking focus, after 140ms of intent, and
// it folds again 600ms after the pointer leaves if nothing was typed; a
// click or Cmd/Ctrl+K opens it; Escape folds it and puts the caret back in
// the reply. Timers run on the clock of the window the bar is in.
//
// The bar plans; the shell runs. onRun gets the planned arrangement, or the
// screen alm: or sym: goes to, and returns a promise of a notice for the
// Enter line (say, a window the browser would not open), or null.
//
// A prompt goes to the room the screen shows (stage 4). `prompt` is what
// the shell knows about where it would go: the room, whether there is a
// key, the names and the price. The Enter line says who receives it and
// what it costs before Enter; onPrompt sends it, and answers at once
// whether it went ({ refused } or { done }), then once it is answered
// (done resolves to a notice, or null).

// Search narrows the board the bar points at as it is typed (C132 (a)):
// Records and the Collection, each keeping its own (C144 (h)). `searches`
// holds each one's search: the field shows the one of the board it points
// at, and follows when it is set from elsewhere (clear:filters, a saved
// search opened). What is typed goes back through onSearch(board, text).
// `searchCounts` says what each search leaves, for the Enter line.
const SEARCHABLE = new Set(['almanac', 'collection', 'settings', 'library'])

export default function Bar({ arrangement, board, doc, lines, screens, prompt, onRun, onPrompt, onFocusBoard, className, autoFocus = false, onTop = true, write = null, said = null, onMode, welcome = null, inspect = null, onInspectClose, compare = null, onCompareClose, keyPanel = null, onKeyFocus, onKeySaved, onKeysClose, backupPanel = null, onBackupDone, picker = null, onPicker = null, onPickAnswerer, onPickerClose, frameworkPicker = null, onFrameworkPicker = null, onToggleFramework, onFrameworkPickerClose, languagePicker = null, onPickLanguage, onLanguagePickerClose, onSearch, searches = {}, searchCounts = {}, featureActs = null, onLine = null, map = false, onMapClose, note = null, letter = null, onLetterClose, alsoDocs = null }) {
  const { i18n } = useLingui()
  const target = useMemo(() => ({ ...arrangement, addressed: board }), [arrangement, board])
  const resting = restingMode(target)
  const [field, dispatch] = useReducer(fieldReducer, resting, initialField)
  const [reference, setReference] = useState(null) // { topic } while ? is open
  const [notice, setNotice] = useState(null) // a key of COPY.enter, or { message, values }
  const walk = useRef({ lines: [], index: -1, draft: '' })
  const input = useRef(null)
  const reply = useRef(null) // the reply being edited, to return the caret to
  const hover = useRef(0)
  const win = doc?.defaultView ?? window

  useEffect(() => { dispatch({ type: 'surface', resting }) }, [resting])

  // A command written into the field from outside, as a welcome step's when
  // clicked (stage 5): it waits for Enter.
  useEffect(() => {
    if (!write) return
    if (write.focus !== false) input.current?.focus()
    // The bar turned to a prompt, as the Collection's Prompt act does (C145 (h)).
    // With words, a prompt to edit and send: a prompt and its reply joined (C214 (b)).
    if (write.mode === 'prompt') {
      dispatch(write.value ? { type: 'draft', value: write.value, focus: write.focus !== false } : { type: 'ran', to: 'prompt' })
      // The caret goes to the end, so what is typed next follows the words.
      if (write.value && write.focus !== false) setTimeout(() => { const el = input.current; if (el) el.setSelectionRange(el.value.length, el.value.length) }, 0)
      return
    }
    dispatch({ type: 'input', value: write.value })
    // An act that wants words writes "" for them: the caret goes between (C145 (d)).
    const at = write.value.indexOf('""')
    if (at >= 0) setTimeout(() => input.current?.setSelectionRange(at + 1, at + 1), 0)
  }, [write])
  // What the last command did gives way to what the written one would do.
  const [wrote, setWrote] = useState(write)
  if (wrote !== write) {
    setWrote(write)
    setNotice(null)
  }
  // What a click elsewhere did, said here (a × on the Plan board, C199).
  const [heard, setHeard] = useState(said)
  if (heard !== said) {
    setHeard(said)
    if (said?.says) setNotice(said.says)
  }
  // A delete undo cannot take back waits for a second Enter on the same
  // line (C199): the line the first Enter armed.
  const [armed, setArmed] = useState(null)

  // The field's mode, for the welcome page's first step.
  useEffect(() => { onMode?.(field.mode) }, [field.mode, onMode])

  // The search of the board the bar points at (C144 (h)).
  const searched = field.text.search
  const own = SEARCHABLE.has(board) ? searches[board] ?? '' : null
  const sent = useRef(own)
  const pointedAt = useRef(board)
  useEffect(() => {
    if (pointedAt.current !== board) {
      // Pointed at another board: the field shows that board's search.
      pointedAt.current = board
      sent.current = own ?? ''
      if (own != null && searched !== own) dispatch({ type: 'setSearch', value: own })
      return
    }
    if (own == null) return
    if (own !== sent.current) {
      // Set from elsewhere: emptied, or a saved search's words.
      sent.current = own
      if (searched !== own) dispatch({ type: 'setSearch', value: own })
      return
    }
    if (searched !== sent.current) {
      // Typed here.
      sent.current = searched
      onSearch?.(board, searched)
    }
  }, [board, own, searched, onSearch])
  useEffect(() => { if (autoFocus) input.current?.focus() }, [autoFocus])

  // `/` outside text fields, and Cmd/Ctrl+K from anywhere: in this document,
  // and in every other window of the page, since this bar is the one point of
  // control (C280). From another window it brings its own forward, where the
  // browser lets it.
  useEffect(() => {
    const docs = [doc, ...(alsoDocs ?? [])].filter(Boolean)
    if (!docs.length) return undefined
    function onKey(e) {
      const here = e.currentTarget
      const active = here.activeElement
      const inBar = active === input.current
      const what = barKey(e, { inTextField: !inBar && isTextField(active), inBar })
      if (what === 'focus' || what === 'open') {
        e.preventDefault()
        if (here !== doc) { try { doc.defaultView?.focus() } catch { /* the browser decides */ } }
        input.current?.focus()
        dispatch({ type: 'open' })
      }
    }
    for (const d of docs) d.addEventListener('keydown', onKey)
    return () => { for (const d of docs) d.removeEventListener('keydown', onKey) }
  }, [doc, alsoDocs])

  // Editing a reply on a board folds the field; leaving it opens the field.
  useEffect(() => {
    if (!doc) return undefined
    const onBoard = (el) => isTextField(el) && el !== input.current && Boolean(el.closest?.('.ch-stage'))
    function onFocusIn(e) {
      if (onBoard(e.target)) { reply.current = e.target; dispatch({ type: 'editReply' }) }
    }
    function onFocusOut(e) {
      if (e.target !== reply.current) return
      const to = e.relatedTarget
      if (to === input.current || onBoard(to) || to?.closest?.('.ch-field')) return
      dispatch({ type: 'doneEditing' })
    }
    doc.addEventListener('focusin', onFocusIn)
    doc.addEventListener('focusout', onFocusOut)
    return () => { doc.removeEventListener('focusin', onFocusIn); doc.removeEventListener('focusout', onFocusOut) }
  }, [doc])

  // Hover opens the folded field after 140ms of intent, and lets it fold
  // again 600ms after the pointer leaves.
  const hoverAfter = (ms, type) => {
    win.clearTimeout(hover.current)
    hover.current = win.setTimeout(() => dispatch({ type }), ms)
  }
  useEffect(() => () => win.clearTimeout(hover.current), [win])
  const folded = field.minimised

  const value = fieldValue(field)
  const view = useMemo(() => preview(value, { mode: field.mode, arrangement: target, screens }), [value, field.mode, target, screens])
  const prompting = field.mode === 'prompt'
  const promptView = useMemo(() => (prompting ? promptPreview(field.text.prompt, prompt) : null), [prompting, field.text.prompt, prompt])
  const planned = prompting ? promptView.says : (view.says.message === 'popCommand' && !onTop ? { ...view.says, also: 'popOrdinary' } : view.says)
  const says = notice ? (typeof notice === 'string' ? { message: notice } : notice) : planned
  // What the command typed would do, for the screens map (C259 (b)).
  useEffect(() => { onLine?.(field.mode === 'command' ? { next: view.next ?? null, act: view.act ?? null } : null) }, [field.mode, view, onLine])

  // Who answers a prompt here, inside the prompt field: the chat's choice
  // or the default (stage 7; C150). A click shows who else can.
  // With the Plan board addressed, a prompt is a step planned (C198): no one answers it.
  // With Reflection addressed, it is talk about the chat, not a prompt to it (C235 (f)).
  let marginalia = null
  if (prompt && !prompt.plan && !prompt.reflection && prompt.room !== undefined && prompt.keyed != null) {
    const who = prompt.answerer ?? (prompt.keyed ? { group: 'model', name: prompt.model } : { group: 'source', name: prompt.source })
    const to = prompt.toLabel
    // Among a prompt's branches, where it goes (C174): "to 201a · Sonnet 5.5".
    marginalia = to && !(prompt.many?.length > 1 && !prompt.toMany)
      ? (to.all ? i18n._(COPY.field.toAll, { count: to.count }) : to.count > 1 ? i18n._(COPY.field.toSome, { nums: to.chats.join(', ') }) : i18n._(COPY.field.toOne, { address: to.chats[0], name: to.name }))
      // Several ticked: "answered from multiple" for sources, "by" when a model is among them (29 October).
      : prompt.many?.length > 1
        ? i18n._(prompt.many.every((w) => w.group === 'source') ? COPY.field.answeredFromMany : COPY.field.answeredByMany)
        : who.group === 'source'
          ? i18n._(COPY.field.answeredFrom, { source: who.name })
          : i18n._(COPY.field.answeredBy, { model: who.name })
  }
  // The frameworks on this chat: "framework: none", or the first and how many more (C164).
  const names = prompt?.frameworkNames ?? []
  // Features of input, in the field's marginalia (stage 13, piece 6; C248):
  // web search held for the next prompt, voice on this device only (C70),
  // and attaching files. Each only where the room offers it.
  const feats = prompt?.features ?? null
  const voice = useVoiceInput({
    lang: typeof navigator === 'undefined' ? 'en-US' : navigator.language || 'en-US',
    onTranscript: (said, isFinal) => {
      if (!isFinal || !said || field.mode !== 'prompt') return
      const now = field.text.prompt ?? ''
      dispatch({ type: 'input', value: now ? `${now.replace(/s+$/, '')} ${said}` : said })
    },
  })
  const features = []
  if (marginalia && feats && featureActs) {
    if (feats.offered?.webSearch && feats.canSearch) features.push({ key: 'web', words: i18n._(COPY.field.webSearch), on: feats.web, title: i18n._(COPY.field.webHelp), onClick: featureActs.onWeb })
    if (feats.offered?.voice) {
      if (voice.isSupported) {
        features.push({ key: 'voice', words: i18n._(voice.isListening ? COPY.field.listening : COPY.field.voice), on: voice.isListening, title: i18n._(voice.status === 'available' ? COPY.field.voiceHelp : COPY.field.voiceDownload), onClick: () => (voice.isListening ? voice.stop() : voice.start()) })
      } else if (voice.status !== 'checking') {
        features.push({ key: 'voice', words: i18n._(COPY.field.voiceOff), off: true, title: i18n._(COPY.field.voiceOffHelp) })
      }
    }
    if (feats.offered?.files) features.push({ key: 'attach', words: i18n._(COPY.field.attach), on: (feats.files?.length ?? 0) > 0, title: i18n._(COPY.field.attachHelp), onClick: featureActs.onAttach })
  }
  const heldFiles = marginalia && feats?.files?.length ? feats.files : []
  const frameworksMarg = marginalia
    ? (names.length ? i18n._(COPY.field.frameworkSome, { first: names[0], more: names.length - 1 }) : i18n._(COPY.field.frameworkNone))
    : null
  const room = prompt && !prompt.plan && !prompt.reflection && prompt.room !== undefined
    ? { chat: prompt.chat ?? null, name: prompt.room ? roomLabel(i18n, prompt.roomName ?? null) : null, fresh: Boolean(prompt.about), trying: prompt.trying?.name ?? null }
    : undefined

  async function send() {
    if (!promptView?.ready || !onPrompt) return
    const out = await onPrompt(field.text.prompt.trim(), prompt)
    if (out?.refused) { setNotice(out.refused); return }
    dispatch({ type: 'sent' })
    const failed = await out?.done
    if (failed) setNotice(failed)
  }

  async function enter() {
    if (prompting) { await send(); return }
    if (field.mode !== 'command') return
    const { answer, next, go, act } = view
    if (answer.state === 'help') {
      setReference({ topic: answer.values?.verb ? answer.values.verb.replace(/:$/, '') : null })
      dispatch({ type: 'ran' })
      return
    }
    if (answer.fill) { dispatch({ type: 'input', value: answer.fill }); return }
    if (!next && !go && !act) return
    if (act?.confirm && armed !== value) {
      setArmed(value)
      setNotice({ message: 'deleteAgain', values: { count: act.nums?.length ?? 1 } })
      return
    }
    setArmed(null)
    const body = readField(value, field.mode).body
    const out = await onRun(next, body, go, act)
    if (out && !out.done) { setNotice(out); return }
    setReference(null)
    walk.current = { lines, index: -1, draft: '' }
    dispatch({ type: 'ran', to: view.after ?? null })
    // Done, with something to say: copy: and undo: say what they did.
    if (out?.says) setNotice(out.says)
    // Something that finishes later says so then: a summary written (C145 (g)).
    if (out?.later) out.later.then((n) => { if (n) setNotice(n) }, () => {})
  }

  function onKeyDown(e) {
    if (e.nativeEvent.isComposing) return
    if (e.key === 'Enter') { e.preventDefault(); enter(); return }
    if (e.key === 'Escape') {
      e.preventDefault()
      if (reference) { setReference(null); return }
      if (inspect) { onInspectClose?.(); return }
      if (compare) { onCompareClose?.(); return }
      if (letter) { onLetterClose?.(); return }
      if (keyPanel) { onKeysClose?.(); return }
      if (backupPanel) { onBackupDone?.(null); return }
      if (picker) { onPickerClose?.(); return }
      if (frameworkPicker) { onFrameworkPickerClose?.(); return }
      if (languagePicker) { onLanguagePickerClose?.(); return }
      if (map) { onMapClose?.(); return }
      // The field's rule first, then the caret: moving the caret blurs the
      // field, which would otherwise come before the Escape.
      dispatch({ type: 'escape' })
      if (field.mode === field.resting) {
        // In the resting mode, back to what you were doing: the reply, if
        // one was being edited, with the field folded again.
        if (field.editingReply && reply.current?.isConnected) reply.current.focus()
        else input.current?.blur()
      }
      return
    }
    // The slider of branches on screen: ⌥← ⌥→ from the field, ← → when it is
    // empty (slider v9; C173). Mirrored where the page reads right to left.
    if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      const empty = !fieldValue(field).replace(/^(p>|>)/, '').trim()
      if (e.altKey || empty) {
        const rtl = (e.currentTarget?.closest?.('[dir]')?.getAttribute('dir') ?? document.documentElement.dir) === 'rtl'
        const dir = (e.key === 'ArrowRight' ? 1 : -1) * (rtl ? -1 : 1)
        // The tabs in the room a prompt goes to (C175 (a)).
        if (stepBranch(dir, prompt?.room ?? null)) { e.preventDefault(); return }
      }
    }
    if (field.mode !== 'command') return
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault()
      walk.current = stepRecall({ ...walk.current, lines }, e.key === 'ArrowUp' ? 'up' : 'down', field.text.command)
      dispatch({ type: 'recall', value: walk.current.value })
      return
    }
    if (e.key === 'Tab') {
      const [first] = complete(field.text.command, board)
      if (first) { e.preventDefault(); dispatch({ type: 'recall', value: first }) }
    }
  }

  function pick(form) {
    dispatch({ type: 'input', value: `>${form}` })
    setReference(null)
    input.current?.focus()
  }

  return (
    <div className={className}>
      <div className="ch-dock-in">
        <div className="ch-frow">
        <Field
          ref={input}
          state={field}
          folded={folded}
          win={win}
          marginalia={marginalia}
          onMarginalia={onPicker}
          marginaliaOpen={Boolean(picker)}
          frameworks={frameworksMarg}
          features={features}
          onFrameworks={onFrameworkPicker}
          frameworksOpen={Boolean(frameworkPicker)}
          ink={prompt?.room !== undefined ? prompt?.ink ?? null : null}
          inkKey={prompt?.room ?? null}
          onOpen={() => { dispatch({ type: 'open' }); input.current?.focus() }}
          onHover={() => { if (field.minimised || field.peek) hoverAfter(140, 'hover') }}
          onLeave={() => { if (field.minimised || field.peek) hoverAfter(600, 'leave') }}
          onInput={(v) => {
            walk.current = { lines, index: -1, draft: '' }
            setNotice(null)
            setArmed(null) // any typing asks for both Enters again (C199)
            // The key panel closes when the line turns to another command.
            if (keyPanel && !/^>\s*api:/i.test(v)) onKeysClose?.()
            dispatch({ type: 'input', value: v })
          }}
          onKeyDown={onKeyDown}
          onFocus={() => { dispatch({ type: 'focus' }); onFocusBoard?.(board) }}
          onBlur={() => dispatch({ type: 'blur' })}
        />
        </div>
        {heldFiles.length > 0 && !folded && (
          <div className="ch-fheld ch-marg" aria-label={i18n._(COPY.field.held)}>
            <span>{i18n._(COPY.field.held)}</span>
            {heldFiles.map((f) => (
              <span key={f.id} className="ch-fchip" dir="auto">
                {f.name} <span className="sz">{formatSize(f.size)}</span>
                <button type="button" aria-label={i18n._(COPY.field.fileDrop, { name: f.name })} onMouseDown={(e) => e.preventDefault()} onClick={() => featureActs?.onDropFile(f.id)}>×</button>
              </span>
            ))}
          </div>
        )}
        <EnterLine hidden={folded} mode={field.mode} resting={field.resting} empty={!field.text[field.mode]} says={says} told={Boolean(notice)} addressed={board} room={room} welcome={welcome} search={SEARCHABLE.has(board) ? searchCounts[board] ?? null : null} />
        {/* Extra screen detected (C259 (g)): once, under the field. */}
        {note && !folded && (
          <p className="ch-snote ch-marg">
            {i18n._(COPY.screensMap.extra)}
            <span className="sep" aria-hidden="true">·</span>
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={note.onGo}>{i18n._(COPY.screensMap.extraGo)}</button>
          </p>
        )}
        {!reference && inspect && <Inspect row={inspect} />}
        {!reference && !inspect && compare && <Compare a={compare.a} b={compare.b} />}
        {!reference && !inspect && !compare && letter && <Letter letter={letter} read={letter.read ?? []} onPick={pick} />}
        {!reference && !inspect && !compare && !keyPanel && !backupPanel && !picker && frameworkPicker && (
          <FrameworkPicker items={frameworkPicker.items} onToggle={onToggleFramework} />
        )}
        {!reference && !inspect && !compare && !keyPanel && !backupPanel && picker && (
          picker.kind === 'reply'
            ? <ReplyPicker members={picker.members} targets={picker.targets} line={picker.line} onToggle={picker.onToggle} onAll={picker.onAll} />
            : <AnswerPicker rows={picker.rows} now={picker.now} picked={picker.picked} reference={picker.reference} onPick={onPickAnswerer} order={picker.order} conds={picker.conds} onOrder={picker.onOrder} onCond={picker.onCond} forStep={picker.forStep ?? null} />
        )}
        {!reference && !inspect && !compare && !keyPanel && !backupPanel && !picker && !frameworkPicker && languagePicker && (
          <LanguagePicker items={languagePicker.items} now={languagePicker.now} onPick={onPickLanguage} />
        )}
        {!reference && !inspect && !compare && !keyPanel && backupPanel && (
          <BackupPanel
            mode={backupPanel.mode} file={backupPanel.file}
            onClose={() => { onBackupDone?.(null); input.current?.focus() }}
            onDone={(says) => { onBackupDone?.(says); input.current?.focus() }}
          />
        )}
        {!reference && !inspect && !compare && keyPanel && (
          <KeyPanel
            keys={keyPanel.keys}
            noKey={keyPanel.noKey}
            focus={keyPanel.focus}
            holdOnly={keyPanel.holdOnly}
            region={keyPanel.region ?? null}
            local={keyPanel.local ?? null}
            onRegion={keyPanel.onRegion ?? null}
            onFocus={(id) => onKeyFocus?.(id)}
            onSaved={(id, fresh) => { onKeySaved?.(id, fresh); input.current?.focus() }}
            onClose={() => { onKeysClose?.(); input.current?.focus() }}
          />
        )}
      </div>
      {/* The ? reference: as wide as the stage, not the bar (C279 (f)). */}
      {reference && <Reference board={board} topic={reference.topic} onPick={pick} />}
    </div>
  )
}
