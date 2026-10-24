// steps@1.0, live: the step list (refactor-plan.md, stage 10, piece 5; AB
// §3 "The docket"; Lab v7; C202). A plan's steps inside a room: the steps
// of the branch the room's chat is, in its run or in every run, or a plan
// pinned by its number. The whole plan is a board of its own; a click on its
// number writes open: into the bar for Enter.
//
// It reads the plan through usePlanOf, never the database itself, and shows
// words as text only. It changes nothing.

import { useMemo } from 'react'
import { useLingui } from '@lingui/react'
import { COPY } from '../../copy'
import { useRoomChat } from '../../stores/useRoomChat'
import { useConversations } from '../../stores/ConversationContext'
import { usePlanOf } from '../../stores/usePlanOf'

const STATUS = { done: COPY.plan.statusDone, running: COPY.plan.statusRunning, waiting: COPY.plan.statusWaiting, paused: COPY.plan.statusPaused }
const MOST = 90

const short = (t) => {
  const s = String(t ?? '').replace(/\s+/g, ' ').trim()
  return [...s].length > MOST ? `${[...s].slice(0, MOST - 1).join('')}…` : s
}
const write = (value) => window.dispatchEvent(new CustomEvent('parliament-write', { detail: { value } }))

export default function StepsRender({ config = {} } = {}) {
  const { i18n } = useLingui()
  const { activeConversationId: chatId, messages } = useRoomChat()
  const { conversations } = useConversations()
  const chat = useMemo(() => conversations.find((c) => c.id === chatId) ?? null, [conversations, chatId])
  const pinnedNum = config.follow === 'a pinned plan' && Number.isInteger(Number(config.plan)) && Number(config.plan) > 0 ? Number(config.plan) : null
  const plan = usePlanOf(pinnedNum ? null : chat?.docketId ?? null, pinnedNum)
  const allRuns = config.show === 'all runs'
  // A sent step's words, where this room holds its chat.
  const said = useMemo(() => new Map((messages ?? []).filter((m) => m.role === 'user').map((m) => [m.id, typeof m.content === 'string' ? m.content : ''])), [messages])

  if (!plan) {
    return (
      <div className="ch-sl">
        <p className="ch-marg">{pinnedNum ? i18n._(COPY.blocks.stepsNoPlan, { num: pinnedNum }) : i18n._(COPY.blocks.stepsNoChat)}</p>
      </div>
    )
  }
  const num = plan.docket.num
  const latest = plan.runs.reduce((n, r) => Math.max(n, r.n), 1)
  const letters = pinnedNum ? plan.docket.order ?? [] : [chat?.branch].filter(Boolean)
  const shownRun = pinnedNum ? latest : chat?.run || 1
  const runs = (allRuns ? [...plan.runs].sort((a, b) => a.n - b.n) : plan.runs.filter((r) => r.n === shownRun))
  const name = (letter) => plan.docket.branches?.find((b) => b.letter === letter)?.name || ''

  return (
    <div className="ch-sl">
      <p className="ch-marg ch-sl-head">
        {pinnedNum ? i18n._(COPY.blocks.stepsPinned, { num }) : i18n._(COPY.blocks.stepsFollowing, { address: `${num}${letters[0] ?? ''}` })}
      </p>
      {runs.map((run) => (
        <section key={run.n} className="ch-sl-run">
          {(allRuns || pinnedNum) && <p className="ch-sl-runhead">{i18n._(COPY.plan.runHead, { run: run.n })}</p>}
          {letters.filter((l) => run.branches?.[l]).map((letter) => (
            <div key={letter}>
              {pinnedNum && <p className="ch-sl-branch"><span className="ch-sl-addr">{`${num}${letter}`}</span> <span dir="auto">{name(letter)}</span></p>}
              <ol className="ch-sl-list">
                {(run.branches[letter].steps ?? []).map((s, i) => {
                  const words = s.prompt ?? (s.messageId ? said.get(s.messageId) : null)
                  return (
                    <li key={s.id ?? s.messageId ?? i} className={`ch-sl-step${s.status === 'waiting' ? ' waiting' : ''}`}>
                      <span className="ch-sl-ord">{i + 1}</span>
                      <span className="ch-sl-text" dir="auto">{words != null ? short(words) || i18n._(COPY.blocks.stepsEmpty) : i18n._(COPY.blocks.stepsSent)}</span>
                      {STATUS[s.status] && <span className={`ch-pl-st ${s.status}`}>{i18n._(STATUS[s.status])}</span>}
                    </li>
                  )
                })}
              </ol>
            </div>
          ))}
        </section>
      ))}
      <p className="ch-marg ch-sl-foot">
        <button type="button" onClick={() => write(`>open:${num}`)}>{`open:${num}`}</button>
        <span> {i18n._(COPY.blocks.stepsWhole)}</span>
      </p>
    </div>
  )
}
