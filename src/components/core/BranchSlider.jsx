import { tellsOf } from '../../editing/told'
import { useEffect, useSyncExternalStore } from 'react'
import { useLingui } from '@lingui/react'
import { COPY } from '../../copy'
import MessageCard from './MessageCard'
import { useIsStreaming, useStreamText, useStreamMessageId } from '../../stores/chatHooks'
import { subscribe as onViewChange, viewedIn, setViewed, onScreen } from '../../stores/branchView'
import { stepFrom } from '../../lib/branchGroups'

// The replies to one prompt sent to several, as tabs in a slider
// (refactor-plan.md, stage 8, piece 2; branch slider v9; C173).
//
// One tab per branch, in the order chosen: its letter, who answered, and
// whether it is still writing, stopped, or carried on. Arrows either side
// step through them, as do ⌥← ⌥→ in the bar, or ← → when the bar is empty
// (branchView.js). Under each reply, its two ways on, both commands, which a
// click writes into the bar: open:203b, its own room with its history, and
// open:203b summary, a new branch from a summary of it.
//
// The line the room carries on is drawn with the room's own message cards;
// the other branches with plain cards fed from their own chats and streams,
// so each writes into its own tab without redrawing the others.

const write = (value) => window.dispatchEvent(new CustomEvent('parliament-write', { detail: { value } }))

// "context 41% → 7%" beside open:203b summary (slider v9; C175), from
// whole percentages; below one, "under 1%".
function contextWords(i18n, c) {
  if (c.share < 1) return i18n._(COPY.branches.contextSmall, { share: 0.01 })
  const share = Math.round(c.share) / 100
  return c.after < 1 ? i18n._(COPY.branches.contextUnder, { share, low: 0.01 }) : i18n._(COPY.branches.context, { share, low: Math.round(c.after) / 100 })
}

function useViewed(groupId) {
  return useSyncExternalStore(onViewChange, () => viewedIn(groupId), () => viewedIn(groupId))
}

function Tab({ tab, info, on, carried, onPick }) {
  const { i18n } = useLingui()
  const writing = useIsStreaming(tab.chatId)
  const last = tab.reply[tab.reply.length - 1]
  const stopped = !writing && last?.incomplete
  // One after another (C202): its turn has not come, or it did not run.
  const waits = tab.waiting ? (tab.waiting.ended === 'unmet' ? COPY.branches.didNotRun : COPY.branches.waiting) : null
  const state = waits ?? (writing ? COPY.branches.writing : stopped ? COPY.branches.stopped : carried ? COPY.branches.carried : null)
  return (
    <button
      type="button"
      role="tab"
      aria-selected={on}
      className={`ch-btab${on ? ' on' : ''}`}
      onClick={onPick}
    >
      <span className="ch-btab-id">{info.letter ?? '·'}</span>
      <span dir="auto">{info.name}</span>
      {state && <span className="ch-btab-st">{i18n._(state)}</span>}
      {/* Edits waiting to go with the branch's next prompt, in the person's blue (C216 (j)). */}
      {info.waiting > 0 && <span className="ch-btab-wait" title={i18n._(COPY.chat.editsWaitingTab, { count: info.waiting })}>{info.waiting}</span>}
    </button>
  )
}

// One message of a branch the room does not carry on, with its stream.
function SiblingMessage({ chatId, msg, index, number }) {
  const { i18n } = useLingui()
  const writing = useIsStreaming(chatId)
  const streamId = useStreamMessageId(chatId)
  const live = useStreamText(chatId)
  const isLive = writing && msg.id === streamId
  return (
    <MessageCard
      id={msg.id}
      type={msg.role === 'user' ? 'user' : 'assistant'}
      content={isLive ? live : msg.content}
      number={number}
      index={index}
      isGhostText={Boolean(msg.incomplete) && !isLive}
      stoppedNote={msg.incomplete && !isLive && msg.stopReason ? i18n._(COPY.branches.stoppedNote) : null}
      source={msg.source ?? null}
      frameworks={msg.role === 'assistant' ? msg.frameworks ?? null : null}
      translation={msg.role === 'assistant' ? msg.translation ?? null : null}
      citations={msg.role === 'assistant' ? msg.citations ?? null : null}
      asked={msg.role === 'user' ? msg.asked ?? null : null}
      included={msg.role === 'user' ? msg.included ?? null : null}
      tells={msg.role === 'user' ? tellsOf(msg.told) : null}
      thinking={msg.role === 'assistant' && msg.thinking ? { text: msg.thinking, ms: msg.thinkingMs ?? null } : null}
    />
  )
}

/**
 * @param {{ item: { groupId: string, mode: 'below'|'tabs', tabs: object[] }, line: string,
 *   infoOf: (chatId: string, tab: object) => { letter: string|null, name: string, address: string|null },
 *   renderLine: (msg: object, idx: number) => import('react').ReactNode, numberOf: (chatId: string, msg: object) => number }} props
 *   renderLine draws a message of the line, or the tabs of a later prompt in it
 */
export default function BranchSlider({ item, line, infoOf, renderLine, numberOf }) {
  const { i18n } = useLingui()
  const chats = item.tabs.map((t) => t.chatId)
  const chatsKey = chats.join('|')
  // What the bar needs to send to these branches (piece 3; C174): the line,
  // whether it alone is carried on, and each branch's letter, address and name.
  const carriedLine = item.mode === 'below' && Boolean(item.tabs.find((t) => t.line)?.continued)
  const membersKey = JSON.stringify(item.tabs.map((t) => ({ chatId: t.chatId, ...infoOf(t.chatId, t) })))
  useEffect(() => onScreen(item.groupId, chatsKey.split('|'), { line, carried: carriedLine, members: JSON.parse(membersKey) }), [item.groupId, chatsKey, line, carriedLine, membersKey])
  const viewed = useViewed(item.groupId)
  const now = chats.includes(viewed) ? viewed : chats.includes(line) ? line : chats[0]
  const at = chats.indexOf(now)
  const tab = item.tabs[at]
  const info = infoOf(tab.chatId, tab)
  const lineTab = item.tabs.find((t) => t.line)
  // Carried on alone, below the tabs: the line. Its tab says so.
  const carriedHere = item.mode === 'below' && lineTab?.continued
  const go = (dir) => { const next = stepFrom(chats, now, dir); if (next) setViewed(item.groupId, next) }
  // In its own tab, the line's thread may hold tabs of a later prompt (C177).
  const messages = item.mode === 'tabs' ? [...tab.reply, ...(tab.line && tab.nested ? tab.nested : tab.after)] : tab.reply
  const lineInfo = lineTab ? infoOf(lineTab.chatId, lineTab) : null

  return (
    <section className="ch-branches" aria-label={i18n._(COPY.branches.label, { count: chats.length })}>
      <div className="ch-btabs" role="tablist">
        {item.tabs.map((t) => (
          <Tab key={t.chatId} tab={t} info={infoOf(t.chatId, t)} on={t.chatId === now} carried={carriedHere && t.line} onPick={() => setViewed(item.groupId, t.chatId)} />
        ))}
      </div>
      <div className="ch-bslider">
        <button type="button" className="ch-barrow" aria-label={i18n._(COPY.branches.previous)} disabled={at <= 0} onClick={() => go(-1)}>‹</button>
        <div className="ch-bslide" role="tabpanel">
          {!tab.loaded && <p className="ch-marg">{i18n._(COPY.branches.loading)}</p>}
          {tab.loaded && tab.waiting && (
            <p className="ch-bwait">{tab.waiting.ended === 'unmet' ? i18n._(COPY.branches.unmet) : i18n._(COPY.branches.waitingRuns, { cond: tab.waiting.condition })}</p>
          )}
          {tab.loaded && messages.map((m, i) => (tab.line ? renderLine(m, i) : <SiblingMessage key={m.id} chatId={tab.chatId} msg={m} index={i} number={numberOf(tab.chatId, m)} />))}
          {tab.loaded && (
            <p className="ch-marg ch-bmarg">
              {/* The chat carries on from another branch: this one carries on in a room of its own (slider v9). */}
              {carriedHere && !tab.line && lineInfo?.address && (
                <><span>{i18n._(COPY.branches.carriesOn, { address: lineInfo.address })}</span><span aria-hidden="true"> · </span></>
              )}
              {info.address && (
                <>
                  <button type="button" onClick={() => write(`>open:${info.address}`)}>open:{info.address}</button>
                  <span> {i18n._(COPY.branches.withHistory)}</span>
                  <span aria-hidden="true"> · </span>
                  <button type="button" onClick={() => write(`>open:${info.address} summary`)}>open:{info.address} summary</button>
                  {info.context && <span> {contextWords(i18n, info.context)}</span>}
                </>
              )}
            </p>
          )}
        </div>
        <button type="button" className="ch-barrow" aria-label={i18n._(COPY.branches.next)} disabled={at >= chats.length - 1} onClick={() => go(1)}>›</button>
      </div>
    </section>
  )
}
