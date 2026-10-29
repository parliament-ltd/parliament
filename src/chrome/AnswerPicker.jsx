import { useLingui } from '@lingui/react'
import { COPY } from '../copy'
import { MenuPanel, MenuColumns, MenuGroup, MenuRow, MenuFacts } from './Menu'
import { answerGroups, answerFacts, footOf } from './menus'

// Who can answer (refactor-plan.md, stage 7, piece 1; A14, C148, C149).
// Opened by "answered by" in the prompt field, or by a bare by:, under the
// field. Drawn as the ? reference is (29 October; Menu.jsx): each
// provider's models under its name from the list of providers, models on
// this computer, and sources, which answer with no tokens, marked by the
// kind of question each answers (branch slider v9).
//
// Each row: a numbered box and the name; beside them, what it is good for,
// and its facts: its cost mark (a multiple of the reference model's price
// per token, said once at the foot) and what its provider does with what it
// is sent. The one answering here has its box numbered 1; ticking another
// sends the next prompt to each, in the order ticked (stage 8). A model
// whose provider has no key here is fainter, the heading says so, and a
// click writes api: for it. A row not built yet is marked later and does
// nothing.

const GROUP_TITLES = {
  later: COPY.picker.laterGroup,
  local: COPY.picker.local,
  source: COPY.picker.sources,
}

/**
 * @param {{ rows: { model: object[], local: object[], source: object[] }, now: { id: string },
 *   picked?: string[]|null, reference: string|null, onPick: (row: object) => void,
 *   order?: 'together'|'sequence', conds?: Array<string|null>, onOrder?: (order: string) => void, onCond?: (id: string) => void,
 *   forStep?: object|null, onClose?: () => void }} props
 *   rows: answerers.answererRows; now: who answers here (answerers.answererFor);
 *   picked: several ticked for the next prompt, in order (stage 8; C172 (c));
 *   order and conds: all at once, or one after another with when each after
 *   the first runs, aligned with picked (branch slider v9; C201);
 *   forStep: choosing for one step of a plan (C202)
 */
export default function AnswerPicker({ rows, now, picked = null, reference, onPick, onSwitch = null, order: sending = 'together', conds = [], onOrder = null, onCond = null, forStep = null, onClose = null }) {
  // The ticked boxes, in order: each shows its place, the order of the tabs.
  const order = picked?.length ? picked : [now?.id].filter(Boolean)
  const { i18n } = useLingui()
  const about = (r) => {
    const line = COPY.pickerAbout[r.about ?? r.id]
    return line ? i18n._(line) : null
  }
  const facts = (r) => answerFacts(r).map((f) => (f.mark ? f.mark : { text: i18n._(COPY.picker[f.copy], f.values), warn: f.warn }))
  // One after another: under each ticked after the first, when it runs; a click changes it.
  const chained = Boolean(picked?.length > 1 && sending === 'sequence' && onCond)
  const when = (r, at) => (chained && at > 0
    ? (
      <button key={`${r.id}-when`} type="button" className="ch-ref-row ch-menu-when" title={i18n._(COPY.picker.condHelp, { name: r.name })} onMouseDown={(e) => e.preventDefault()} onClick={() => onCond(r.id)}>
        <span className="ch-menu-lab" aria-hidden="true" />
        <span className="gloss">{`${at + 1}. `}{i18n._(COPY.picker.cond, { cond: conds[at] ?? 'finished' })}</span>
      </button>
    )
    : null)
  const row = (r) => {
    const at = order.indexOf(r.id)
    const help = r.later ? null : r.needsKey || r.unchecked ? `api:${r.provider}` : `by:${r.id}`
    return [
      <MenuRow key={r.id} on={at >= 0} mark={at >= 0 ? String(at + 1) : ''} faint={r.needsKey} later={r.later} title={help ?? undefined} label={r.name} onClick={(e) => (!onSwitch || forStep || e.shiftKey || e.target?.closest?.('.ch-menu-box') ? onPick(r) : onSwitch(r))}>
        {about(r)}
        <MenuFacts items={facts(r)} />
        {r.perDay && !r.later && <span className="ch-menu-facts">{i18n._(COPY.picker.perDay, { count: r.perDay })}</span>}
      </MenuRow>,
      when(r, at),
    ]
  }
  const groups = answerGroups(rows).map((g) => {
    const title = g.name ?? i18n._(GROUP_TITLES[g.group])
    // A provider with no key here says so once, and a click writes api: for it.
    const aside = g.needsKey
      ? <button type="button" className="ch-menu-aside" title={`api:${g.provider}`} onMouseDown={(e) => e.preventDefault()} onClick={() => onPick(g.rows[0])}>{i18n._(COPY.picker.addKey)}</button>
      : g.group === 'source' ? <span className="ch-menu-aside">{i18n._(COPY.picker.noTokens)}</span> : null
    return (
      <MenuGroup key={g.key} title={title} aside={aside}>
        {g.rows.flatMap((r) => [
          // Sources under quiet labels by the kind of question they answer.
          r.kindStarts && <div key={`${r.id}-kind`} className="ch-menu-sub">{i18n._(COPY.pickerKinds[r.kind])}</div>,
          ...row(r),
        ])}
      </MenuGroup>
    )
  })
  // With several ticked: all at once, or one after another (branch slider v9; C201).
  const orderGroup = picked?.length > 1 && onOrder
    ? (
      <MenuGroup title={i18n._(COPY.picker.order)}>
        {[['together', COPY.picker.together, COPY.picker.togetherHelp], ['sequence', COPY.picker.sequence, COPY.picker.sequenceHelp]].map(([key, name, help]) => (
          <MenuRow key={key} round on={sending === key} label={i18n._(name)} onClick={() => onOrder(key)}>{i18n._(help)}</MenuRow>
        ))}
      </MenuGroup>
    )
    : null
  const marks = reference ? i18n._(COPY.picker.marks, { reference }) : null
  const close = i18n._(COPY.shell.referenceClose)
  return (
    <MenuPanel
      className="ch-menu"
      title={forStep ? i18n._(COPY.picker.forStep, { index: forStep.index, address: forStep.address }) : i18n._(COPY.picker.title)}
      foot={forStep ? footOf(marks, i18n._(COPY.picker.keysStep), close) : footOf(marks, i18n._(COPY.picker.several), i18n._(COPY.picker.keys), close)}
      onClose={onClose}
    >
      <MenuColumns>
        {/* Choosing for one step of a plan (C202): one choice, or the branch's own. */}
        {forStep && (
          <MenuGroup>
            <MenuRow on={!forStep.model} label={i18n._(COPY.picker.asBranch, { name: forStep.branchName ?? '' })} onClick={() => onPick({ id: null })} />
          </MenuGroup>
        )}
        {groups}
        {orderGroup}
      </MenuColumns>
    </MenuPanel>
  )
}
