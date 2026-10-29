import { useLingui } from '@lingui/react'
import { COPY } from '../copy'
import { money } from './say'

// The Reflection board (stage 12, piece 4; the editing spec, "Reflection";
// inline editing v5; C228, C235). It reads the chat in the room and its
// plan's other branches, and never writes to them: it is given what it
// shows, and its buttons only write a command into the bar, which waits for
// Enter. Marked so far and Session cost nothing; Reflect is one call; the
// talk about the chat is the bar's prompt while this board is addressed.
// What the helper wrote is shown as text.
//
// This file may import nothing that writes (lint rule and test, C235 (h)).

const KINDS = [['edit', 'markEdits'], ['ask', 'markAsks'], ['suggestion', 'markSuggestions'], ['term', 'markTerms'], ['quote', 'markQuotes'], ['note', 'markNotes']]

/**
 * @param {{ addressed: boolean, onAddress: (board: string) => void, onWrite: (text: string) => void,
 *   scope: object|null, marked: object|null, session: object|null, reflection: object|null,
 *   wordOf: (frameworkId: string) => string, nameOf: (frameworkId: string) => string }} props
 *   reflection: { result: { synthesis, questions, proposal }|null, model: string|null, busy: string|null, talk: Array<{ you, ai }> }
 *   wordOf: the word sweep: takes for a framework; nameOf: its name
 */
export default function ReflectionBoard({ addressed, onAddress, onWrite, scope, marked, session, reflection, wordOf, nameOf }) {
  const { i18n } = useLingui()
  const C = COPY.reflection
  const r = reflection ?? {}
  const result = r.result ?? null
  const head = scope?.head ?? ''
  const counts = KINDS.filter(([k]) => marked?.counts?.[k]).map(([k, word]) => i18n._(C[word], { count: marked.counts[k] }))
  return (
    <article
      className={`ch-card ch-reflection${addressed ? ' addressed' : ''}`}
      aria-current={addressed ? 'true' : undefined}
      onMouseDown={() => onAddress('reflection')}
    >
      <header className="ch-chead">
        <h2>{i18n._(COPY.boards.reflection)}</h2>
        {scope && <span className="ch-marg ch-aside">{i18n._(C.from, { head })}</span>}
        {scope && <span className="ch-marg ch-aside ch-sep" aria-hidden="true">·</span>}
        {scope && <span className="ch-marg ch-aside">{i18n._(C.readsOnly)}</span>}
      </header>
      <div className="ch-cbody ch-reflect">
        {!scope ? <p className="ch-marg">{i18n._(C.noRoom)}</p> : (
          <>
            <section className="ch-ref-sec">
              <h3>{i18n._(C.marked)} <span className="ch-marg">{i18n._(C.noCall)}</span></h3>
              <p dir="auto">{counts.length
                ? i18n._(C.markedIn, { list: new Intl.ListFormat(i18n.locale, { type: 'conjunction' }).format(counts), branches: new Intl.ListFormat(i18n.locale, { type: 'conjunction' }).format(marked.branches) })
                : i18n._(C.markedNothing)}</p>
            </section>
            <section className="ch-ref-sec">
              <h3>{i18n._(C.session)} <span className="ch-marg">{i18n._(C.noCall)}</span></h3>
              <p>{session
                ? i18n._(C.sessionIs, { messages: session.messages, tokens: session.tokens, cost: session.cost == null ? i18n._(C.costUnknown) : money(i18n, session.cost) })
                : i18n._(C.sessionReading)}</p>
            </section>
            {!result ? (
              <section className="ch-ref-sec">
                <button type="button" className="ch-act" disabled={Boolean(r.busy)} title={i18n._(C.writes, { command: 'reflect:' })} onClick={() => onWrite('>reflect:')}>
                  {i18n._(r.busy === 'reflect' ? C.reflecting : C.reflect)}
                </button>
                <p className="ch-marg">{i18n._(C.reflectAbout, { head })}</p>
              </section>
            ) : (
              <>
                <section className="ch-ref-sec">
                  <h3>{i18n._(C.synthesis)} {r.model && <span className="ch-marg">{i18n._(C.by, { name: r.model })}</span>}</h3>
                  <p dir="auto" className="ch-ref-text">{result.synthesis}</p>
                  <p className="ch-marg">
                    <button type="button" title={i18n._(C.writes, { command: 'note:' })} onClick={() => onWrite(`>note:"${result.synthesis.replace(/"/g, '”')}"`)}>{i18n._(C.keepNote)}</button>
                    <span aria-hidden="true">{' · '}</span>
                    <button type="button" disabled={Boolean(r.busy)} title={i18n._(C.writes, { command: 'reflect:' })} onClick={() => onWrite('>reflect:')}>{i18n._(C.again)}</button>
                  </p>
                </section>
                {result.questions.length > 0 && (
                  <section className="ch-ref-sec">
                    <h3>{i18n._(C.questions)}</h3>
                    {result.questions.map((q) => (
                      <button key={q} type="button" className="ch-ref-q" dir="auto" title={i18n._(C.questionHelp)} onClick={() => onWrite(`p>${q}`)}>{q}</button>
                    ))}
                  </section>
                )}
                {result.proposal && (
                  <section className="ch-ref-sec ch-ref-prop">
                    <h3>{i18n._(C.proposal)}</h3>
                    <p dir="auto">{result.proposal.why}</p>
                    <button type="button" className="ch-act" title={i18n._(C.writes, { command: `sweep:${result.proposal.branch} ${wordOf(result.proposal.framework)}` })} onClick={() => onWrite(`>sweep:${result.proposal.branch} ${wordOf(result.proposal.framework)}`)}>
                      {i18n._(C.sweepAs, { branch: result.proposal.branch, name: nameOf(result.proposal.framework) })}
                    </button>
                  </section>
                )}
              </>
            )}
            <section className="ch-ref-sec">
              <h3>{i18n._(C.talk)}</h3>
              {(r.talk ?? []).map((t, i) => (
                <div key={i} className="ch-ref-turn">
                  <p className="ch-ref-you" dir="auto">{t.you}</p>
                  {t.ai ? <p dir="auto" className="ch-ref-text">{t.ai}</p> : <p className="ch-marg">{i18n._(t.failed ? C.talkFailed : C.talkWaiting)}</p>}
                </div>
              ))}
              <p className="ch-marg">{i18n._(C.talkHow, { head })}</p>
            </section>
          </>
        )}
      </div>
    </article>
  )
}
