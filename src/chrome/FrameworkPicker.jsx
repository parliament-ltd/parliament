import { useLingui } from '@lingui/react'
import { COPY } from '../copy'

// The frameworks' picker (stage 7, piece 5; the editing spec's collab:
// picker, "in the answered-by picker's shape, grouped Built in and Yours,
// with numbered boxes"; C164). Opened by "framework:" in the prompt field or
// a bare framework:, under the field. A ticked box carries its place in the
// stack, which is the order the instructions go in. A click adds one at the
// end, or takes it off; it runs framework: as Enter would, so undo: has it.

/**
 * @param {{ items: Array<{ id: string, builtIn: boolean, name: string, about: string|null, at: number|null }>,
 *   onToggle: (id: string) => void }} props
 *   at: its place in this chat's stack, from 1, or null when off
 */
export default function FrameworkPicker({ items, onToggle }) {
  const { i18n } = useLingui()
  const row = (f) => (
    <button
      key={f.id}
      type="button"
      className={`ch-ans${f.at ? ' on' : ''}`}
      aria-pressed={Boolean(f.at)}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => onToggle(f.id)}
    >
      <span className="box" aria-hidden="true">{f.at ?? ''}</span>
      <span className="ch-ans-body">
        <span className="ch-ans-top"><span className="nm" dir="auto">{f.name}</span></span>
        {f.about && <span className="ch-ans-about" dir="auto">{f.about}</span>}
      </span>
    </button>
  )
  const builtIn = items.filter((f) => f.builtIn)
  const yours = items.filter((f) => !f.builtIn)
  return (
    <div className="ch-answers">
      <div className="ch-ans-group" role="group" aria-label={i18n._(COPY.frameworkPicker.builtIn)}>
        <div className="ch-ans-title"><span>{i18n._(COPY.frameworkPicker.builtIn)}</span></div>
        {builtIn.map(row)}
      </div>
      <div className="ch-ans-group" role="group" aria-label={i18n._(COPY.frameworkPicker.yours)}>
        <div className="ch-ans-title"><span>{i18n._(COPY.frameworkPicker.yours)}</span></div>
        {yours.length ? yours.map(row) : <p className="ch-marg ch-ans-foot">{i18n._(COPY.frameworkPicker.noneYet)}</p>}
      </div>
      <p className="ch-marg ch-ans-foot">{i18n._(COPY.frameworkPicker.foot)}</p>
    </div>
  )
}
