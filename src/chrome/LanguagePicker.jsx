import { useLingui } from '@lingui/react'
import { COPY } from '../copy'
import { ownNameOf, nameOf } from '../lib/languages'

// The languages' picker (ruled 16 October; LPN §2.2; stage 9, piece 4;
// C184). Opened by a bare language: or the globe, under the field. Each
// language by its own name, never a flag, with its name in the page's
// language beside it. A click runs language: as Enter would, so someone who
// cannot read the page can still pick theirs, and undo: has it.

/**
 * @param {{ items: Array<{ tag: string, draft: boolean }>, now: string, onPick: (tag: string) => void }} props
 *   now: the page's language
 */
export default function LanguagePicker({ items, now, onPick }) {
  const { i18n } = useLingui()
  return (
    <div className="ch-answers">
      <div className="ch-ans-group" role="group" aria-label={i18n._(COPY.languagePicker.title)}>
        <div className="ch-ans-title"><span>{i18n._(COPY.languagePicker.title)}</span></div>
        {items.map((l, i) => {
          const on = l.tag === now
          const here = nameOf(l.tag, i18n.locale)
          const own = ownNameOf(l.tag)
          return (
            <button
              key={l.tag}
              type="button"
              className={`ch-ans${on ? ' on' : ''}`}
              aria-pressed={on}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onPick(l.tag)}
            >
              <span className="box" aria-hidden="true">{i + 1}</span>
              <span className="ch-ans-body">
                <span className="ch-ans-top">
                  <span className="nm" lang={l.tag}>{own}</span>
                  {l.draft && <span className="ch-marg">{i18n._(COPY.languagePicker.draft)}</span>}
                </span>
                {here !== own && <span className="ch-ans-about">{here}</span>}
              </span>
            </button>
          )
        })}
      </div>
      <p className="ch-marg ch-ans-foot">{i18n._(COPY.languagePicker.foot)}</p>
    </div>
  )
}
