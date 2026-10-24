import { useLingui } from '@lingui/react'
import { COPY } from '../copy'

// Who can answer (refactor-plan.md, stage 7, piece 1; A14, C148, C149).
// Opened by "answered by" in the prompt field, or by a bare by:, under the
// field like the key panel. Three groups as ruled: models, models on this
// machine, and sources, which answer with no tokens, grouped by the kind of
// question each answers (branch slider v9).
//
// Each row: a numbered box, the name, its cost mark (a multiple of the
// reference model's price per token, said once at the foot), and one line
// of what it is good for. The one answering here has its box numbered 1;
// several at once comes with branches (stage 8), so a click on another row
// chooses it in its place, as by: does. A model whose provider has no key
// here is greyed, and a click writes api: for it. A row not built yet is
// marked later and does nothing.

// What a provider does with what it is sent, on its rows only (security
// notes §3; C167): whether it trains on it, and how long it keeps it.
const TRAINING = { no: COPY.picker.trainNo, optOut: COPY.picker.trainOptOut, always: COPY.picker.trainAlways }
const KEPT = { upTo30: COPY.picker.keptUpTo30, days30: COPY.picker.kept30, atLeast30: COPY.picker.keptAtLeast30, device: COPY.picker.keptDevice }

const GROUP_TITLES = {
  model: COPY.picker.models,
  local: COPY.picker.local,
  source: COPY.picker.sources,
}

/**
 * @param {{ rows: { model: object[], local: object[], source: object[] }, now: { id: string },
 *   picked?: string[]|null, reference: string|null, onPick: (row: object) => void,
 *   order?: 'together'|'sequence', conds?: Array<string|null>, onOrder?: (order: string) => void, onCond?: (id: string) => void }} props
 *   rows: answerers.answererRows; now: who answers here (answerers.answererFor);
 *   picked: several ticked for the next prompt, in order (stage 8; C172 (c));
 *   order and conds: all at once, or one after another with when each after
 *   the first runs, aligned with picked (branch slider v9; C201)
 */
export default function AnswerPicker({ rows, now, picked = null, reference, onPick, order: sending = 'together', conds = [], onOrder = null, onCond = null, forStep = null }) {
  // The ticked boxes, in order: each shows its place, the order of the tabs.
  const order = picked?.length ? picked : [now?.id].filter(Boolean)
  const { i18n } = useLingui()
  const about = (r) => {
    const line = COPY.pickerAbout[r.about ?? r.id]
    return line ? i18n._(line) : null
  }
  // The cost mark stays on a model with no key, since it helps decide
  // whether to add one. A source has no cost; it says what language its
  // answers come in where that is not yours (LPN §6).
  const IN = { english: COPY.picker.englishOnly, mostlyEnglish: COPY.picker.mostlyEnglish }
  const mark = (r) => {
    if (r.later) return i18n._(COPY.picker.later)
    if (r.unchecked) return i18n._(COPY.picker.unchecked)
    if (r.group === 'source') return IN[r.answersIn] ? i18n._(IN[r.answersIn]) : null
    return r.mark
  }
  const data = (r) => {
    if (r.later || r.group === 'source') return null
    if (r.kept === 'device') return i18n._(KEPT.device)
    const parts = [TRAINING[r.training], KEPT[r.kept]].filter(Boolean).map((d) => i18n._(d))
    return parts.length ? parts.join(' · ') : null
  }
  // One after another: under each ticked after the first, when it runs; a click changes it.
  const chained = Boolean(picked?.length > 1 && sending === 'sequence' && onCond)
  const when = (r, at) => (chained && at > 0
    ? (
      <button key={`${r.id}-when`} type="button" className="ch-ans-when" title={i18n._(COPY.picker.condHelp, { name: r.name })} onMouseDown={(e) => e.preventDefault()} onClick={() => onCond(r.id)}>
        {`${at + 1}. `}{i18n._(COPY.picker.cond, { cond: conds[at] ?? 'finished' })}
      </button>
    )
    : null)
  const row = (r) => [rowOf(r), when(r, order.indexOf(r.id))]
  const rowOf = (r) => {
    const at = order.indexOf(r.id)
    const on = at >= 0
    const help = r.later ? null : r.needsKey || r.unchecked ? `api:${r.provider}` : `by:${r.id}`
    return (
      <button
        key={r.id}
        type="button"
        className={`ch-ans${on ? ' on' : ''}${r.later ? ' later' : ''}${r.needsKey ? ' keyless' : ''}`}
        aria-pressed={on}
        aria-disabled={r.later || undefined}
        title={help ?? undefined}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onPick(r)}
      >
        <span className="box" aria-hidden="true">{on ? String(at + 1) : ''}</span>
        <span className="ch-ans-body">
          <span className="ch-ans-top">
            <span className="nm" dir="auto">{r.name}</span>
            {r.maker && <span className="ch-marg">{i18n._(COPY.picker.madeBy, { maker: r.maker })}</span>}
            {r.preview && <span className="ch-marg">{i18n._(COPY.picker.preview)}</span>}
            {r.thinks && <span className="ch-marg">{i18n._(COPY.picker.thinks)}</span>}
            {r.needsKey && <span className="ch-marg">{i18n._(COPY.picker.addKey)}</span>}
            {mark(r) && <span className="mk">{mark(r)}</span>}
          </span>
          {about(r) && <span className="ch-ans-about">{about(r)}</span>}
          {data(r) && <span className={`ch-ans-about ch-ans-data${r.training === 'always' ? ' warn' : ''}`}>{data(r)}</span>}
          {r.perDay && !r.later && <span className="ch-ans-about">{i18n._(COPY.picker.perDay, { count: r.perDay })}</span>}
        </span>
      </button>
    )
  }
  const group = (key) => {
    const list = rows[key] ?? []
    if (!list.length) return null
    // Sources under quiet labels by the kind of question they answer.
    const body = key === 'source'
      ? list.map((r, i) => (
        <div key={r.id}>
          {r.kind && r.kind !== list[i - 1]?.kind && <div className="ch-ans-sub">{i18n._(COPY.pickerKinds[r.kind])}</div>}
          {row(r)}
        </div>
      ))
      : list.flatMap(row)
    return (
      <div key={key} className="ch-ans-group" role="group" aria-label={i18n._(GROUP_TITLES[key])}>
        <div className="ch-ans-title">
          <span>{i18n._(GROUP_TITLES[key])}</span>
          {key === 'source' && <span className="ch-marg">{i18n._(COPY.picker.noTokens)}</span>}
        </div>
        {body}
      </div>
    )
  }
  // With several ticked: all at once, or one after another (branch slider v9; C201).
  const orderGroup = picked?.length > 1 && onOrder
    ? (
      <div className="ch-ans-group" role="group" aria-label={i18n._(COPY.picker.order)}>
        <div className="ch-ans-title"><span>{i18n._(COPY.picker.order)}</span></div>
        {[['together', COPY.picker.together, COPY.picker.togetherHelp], ['sequence', COPY.picker.sequence, COPY.picker.sequenceHelp]].map(([key, name, help]) => (
          <button key={key} type="button" className={`ch-ans ch-ans-radio${sending === key ? ' on' : ''}`} aria-pressed={sending === key} onMouseDown={(e) => e.preventDefault()} onClick={() => onOrder(key)}>
            <span className="box" aria-hidden="true" />
            <span className="ch-ans-body">
              <span className="ch-ans-top"><span className="nm">{i18n._(name)}</span></span>
              <span className="ch-ans-about">{i18n._(help)}</span>
            </span>
          </button>
        ))}
      </div>
    )
    : null
  return (
    <div className="ch-answers">
      {/* Choosing for one step of a plan (C202): one choice, or the branch's own. */}
      {forStep && (
        <div className="ch-ans-group">
          <div className="ch-ans-title"><span>{i18n._(COPY.picker.forStep, { index: forStep.index, address: forStep.address })}</span></div>
          <button type="button" className={`ch-ans${forStep.model ? '' : ' on'}`} aria-pressed={!forStep.model} onMouseDown={(e) => e.preventDefault()} onClick={() => onPick({ id: null })}>
            <span className="box" aria-hidden="true" />
            <span className="ch-ans-body"><span className="ch-ans-top"><span className="nm">{i18n._(COPY.picker.asBranch, { name: forStep.branchName ?? '' })}</span></span></span>
          </button>
        </div>
      )}
      {group('model')}
      {group('local')}
      {group('source')}
      {orderGroup}
      <p className="ch-marg ch-ans-foot">
        {reference ? i18n._(COPY.picker.marks, { reference }) : null}
        {reference ? ' ' : null}
        {i18n._(COPY.picker.several)}
      </p>
    </div>
  )
}
