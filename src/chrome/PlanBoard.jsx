import { Fragment, useEffect, useLayoutEffect, useRef } from 'react'
import { useLingui } from '@lingui/react'
import { COPY } from '../copy'

// The Plan board (refactor-plan.md, stage 10, piece 2; Docket v12; C196
// (a); C198): one plan at one run. Its head names the plan and the run; then
// each branch, keeping its letter wherever it is moved, with its steps under
// it. Ready is silent: a status shows only when there is something to know.
//
// A step that has not started is written on the board, and kept as typed;
// one that has started is fixed, and shows the words that were sent. Only
// the plan's last run changes; an older run is a record of what ran. One pip
// per run, on each step, shows whether that run reached it, and a click
// shows that run.
//
// Picking a branch (its name) is where new:step, hold: and a prompt go.
// Anything that changes the plan is written into the bar, for Enter.
// nameOf(model id): a model's name, as the list of providers has it.

const STATUS_WORDS = {
  done: COPY.plan.statusDone, running: COPY.plan.statusRunning, waiting: COPY.plan.statusWaiting, paused: COPY.plan.statusPaused,
}
// Commands, which stay English.
const NEW_STEP = (address) => `>new:step ${address}`
const NEW_BRANCH = '>new:branch'
const OPEN = (num) => `>open:${num}`

const PLUS = (
  <svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true"><path d="M6 1.5v9M1.5 6h9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
)

function Status({ status }) {
  const { i18n } = useLingui()
  const words = STATUS_WORDS[status]
  if (!words) return null
  return (
    <span className={`ch-pl-st ${status}`}>
      {status === 'running' && <span className="ch-pl-dot" aria-hidden="true" />}
      {i18n._(words)}
    </span>
  )
}

const Sep = () => <span className="ch-pl-sep" aria-hidden="true">·</span>
const grow = (t) => { t.style.height = 'auto'; t.style.height = `${t.scrollHeight}px` }

// A step not yet started, written in place. What is typed is kept a moment
// after typing stops, and on leaving the field; words changed elsewhere (in
// another tab) show here unless this field is being written in.
function StepText({ step, address, onText, onFocus }) {
  const { i18n } = useLingui()
  const el = useRef(null)
  const timer = useRef(null)
  const draft = useRef(step.text)
  const kept = useRef(step.text)
  useLayoutEffect(() => {
    const t = el.current
    if (!t) return
    if (t.ownerDocument.activeElement !== t && t.value !== step.text) {
      t.value = step.text
      draft.current = step.text
      kept.current = step.text
    }
    grow(t)
  })
  const keep = () => {
    clearTimeout(timer.current)
    timer.current = null
    if (draft.current !== kept.current) {
      kept.current = draft.current
      onText(draft.current)
    }
  }
  const keepNow = useRef(keep)
  useEffect(() => { keepNow.current = keep })
  useEffect(() => () => { if (timer.current) keepNow.current() }, [])
  // A narrower or wider board wraps the words again: the field follows.
  useEffect(() => {
    const t = el.current
    const View = t?.ownerDocument.defaultView
    if (!t || !View?.ResizeObserver) return undefined
    let width = t.clientWidth
    const watch = new View.ResizeObserver(() => {
      if (t.clientWidth === width) return
      width = t.clientWidth
      grow(t)
    })
    watch.observe(t)
    return () => watch.disconnect()
  }, [])
  return (
    <textarea
      ref={el} className="ch-pl-text" rows={1} defaultValue={step.text} dir="auto"
      placeholder={i18n._(COPY.plan.write)} aria-label={i18n._(COPY.plan.step, { index: step.index, address })}
      onFocus={onFocus}
      onInput={(e) => {
        grow(e.target)
        draft.current = e.target.value
        clearTimeout(timer.current)
        timer.current = setTimeout(keep, 700)
      }}
      onBlur={keep}
    />
  )
}

function Branch({ plan, branch, nameOf, onWrite, onPick, onText, onRun }) {
  const { i18n } = useLingui()
  const changes = plan.n === plan.latest
  const picked = plan.selected === branch.letter
  const pips = plan.runNums.length > 1
  return (
    <>
      <div className={`ch-pl-line branch${branch.status === 'waiting' ? ' waiting' : ''}${picked ? ' sel' : ''}`}>
        <div className="ch-pl-gut"><span className="ch-pl-addr">{branch.address}</span></div>
        <div className="ch-pl-main">
          <button type="button" className="ch-pl-pick" aria-pressed={picked} onClick={() => onPick(branch.letter)}>
            {branch.name || i18n._(COPY.plan.untitledBranch)}
          </button>
          <div className="ch-marg ch-pl-marg">
            <span>{i18n._(COPY.plan.steps, { count: branch.steps.length })}</span>
            {branch.firstRun > 1 && <><Sep /><span>{i18n._(COPY.plan.newInRun, { run: branch.firstRun })}</span></>}
            {branch.room && <><Sep /><span>{branch.room}</span></>}
            <Sep />
            {branch.chatNum != null
              ? <button type="button" title={i18n._(COPY.plan.chatHelp, { num: branch.chatNum })} onClick={() => onWrite(OPEN(branch.chatNum))}>{i18n._(COPY.plan.chat, { num: branch.chatNum })}</button>
              : <span>{i18n._(COPY.plan.noChat)}</span>}
          </div>
        </div>
        <div><Status status={branch.status} /></div>
      </div>
      {branch.steps.map((s) => {
        const open = changes && s.planned && (s.status === 'ready' || s.status === 'waiting')
        return (
          <div key={s.id} className={`ch-pl-line step${s.status === 'waiting' ? ' waiting' : ''}`}>
            <div className="ch-pl-gut">
              <span className="ch-pl-ord">{s.index}</span>
              {pips && (
                <span className="ch-pl-pips">
                  {s.reached.map((r) => (
                    <button
                      key={r.n} type="button" className={`ch-pl-pip${r.yes ? ' has' : ''}${r.n === plan.n ? ' now' : ''}`}
                      title={i18n._(COPY.plan.pip, { run: r.n, reached: r.yes ? 'yes' : 'no' })} aria-label={i18n._(COPY.plan.pipHelp, { run: r.n })}
                      aria-current={r.n === plan.n ? 'true' : undefined} onClick={() => onRun(r.n)}
                    />
                  ))}
                </span>
              )}
            </div>
            <div className="ch-pl-main">
              {open
                ? <StepText step={s} address={branch.address} onText={(text) => onText(branch.letter, s.stepId, text)} onFocus={() => { if (!picked) onPick(branch.letter) }} />
                : <div className="ch-pl-text ro" dir="auto" title={s.planned ? undefined : i18n._(COPY.plan.fixed, { run: plan.n })}>{s.text}</div>}
              <div className="ch-marg ch-pl-marg">
                <span>{s.model ? nameOf(s.model) : i18n._(COPY.plan.asBranch)}</span>
              </div>
            </div>
            <div><Status status={s.status} /></div>
          </div>
        )
      })}
      {changes && (
        <button type="button" className="ch-pl-add" onClick={() => onWrite(NEW_STEP(branch.address))}>
          <span className="ch-pl-plus">{PLUS}</span>
          <span className="ch-marg">{i18n._(COPY.plan.addStep, { address: branch.address })}</span>
        </button>
      )}
    </>
  )
}

export default function PlanBoard({ plan, loading = false, addressed, nameOf = (id) => id, onAddress, onWrite, onPick, onText, onRun }) {
  const { i18n } = useLingui()
  return (
    <article
      className={`ch-card ch-plan${addressed ? ' addressed' : ''}`}
      aria-current={addressed ? 'true' : undefined}
      onMouseDown={() => onAddress('docket')}
    >
      <header className="ch-chead">
        <h2>{i18n._(COPY.boards.docket)}</h2>
        {addressed && <span className="ch-marg">{i18n._(COPY.shell.addressed)}</span>}
      </header>
      <div className="ch-cbody">
        {!plan && !loading && (
          <div className="ch-pl-none">
            <p>{i18n._(COPY.plan.none)}</p>
            <p className="ch-marg">{i18n._(COPY.plan.noneHow)}</p>
          </div>
        )}
        {plan && (
          <>
            <div className="ch-pl-head">
              <span className="ch-pl-addr big" aria-label={i18n._(COPY.plan.label, { num: plan.num })}>{plan.num}</span>
              <h3 className="ch-pl-title" dir="auto">{plan.title || i18n._(COPY.plan.untitled)}</h3>
            </div>
            <div className="ch-marg ch-pl-marg ch-pl-dmarg">
              <span>{i18n._(COPY.plan.runOf, { run: plan.n, runs: plan.latest })}</span>
              <Sep /><span>{i18n._(COPY.plan.counts, { branches: plan.counts.branches, steps: plan.counts.steps })}</span>
              {plan.counts.held > 0 && <><Sep /><span>{i18n._(COPY.plan.held, { count: plan.counts.held })}</span></>}
              {plan.n !== plan.latest && (
                <>
                  <Sep /><span>{i18n._(COPY.plan.record)}</span>
                  <Sep /><button type="button" onClick={() => onRun(plan.latest)}>{i18n._(COPY.plan.latest, { run: plan.latest })}</button>
                </>
              )}
            </div>
            <div className="ch-pl-doc">
              {plan.branches.map((b) => (
                <Fragment key={b.letter}>
                  <Branch plan={plan} branch={b} nameOf={nameOf} onWrite={onWrite} onPick={onPick} onText={onText} onRun={onRun} />
                </Fragment>
              ))}
              {plan.n === plan.latest && (
                <button type="button" className="ch-pl-add ch-pl-addbranch" onClick={() => onWrite(NEW_BRANCH)}>
                  <span className="ch-pl-plus">{PLUS}</span>
                  <span className="ch-marg">{i18n._(COPY.plan.addBranch)}</span>
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </article>
  )
}
