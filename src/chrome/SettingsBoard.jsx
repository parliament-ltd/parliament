import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useLingui } from '@lingui/react'
import { COPY } from '../copy'
import DeleteEverything from './DeleteEverything'
import { SECTIONS } from '../shell/boards'
import { getEntries, subscribe as onLog } from '../lib/networkLog'
import { gateway, networkByHost } from '../net'
import { money, longDay } from './say'

// Settings as a board (refactor-plan.md, stage 9, piece 1; settings spec
// §2 to §13; Settings v1; C181). One card, its sections stacked, a rail as
// the index. The navy rule sits on the section the bar points at and slides
// as the card scrolls (C31). Search, typed in the bar while it points here,
// narrows the card to the rows that match and hides sections with none.
//
// Every control runs its set: line, as if typed and entered: the same
// change, the same undo:. Marginalia writes a command into the bar for
// Enter. Keys are never typed here: api: opens their field under the bar.
// Only settings that do something are shown (settings spec §12; R28).

const TITLE = Object.fromEntries(SECTIONS.map((s) => [s.id, COPY.settings[`${s.id}Title`]]))
const DESC = Object.fromEntries(SECTIONS.map((s) => [s.id, COPY.settings[`${s.id}Desc`]]))

// Whether a row's words hold every word searched for, or the search names
// its section (settings spec §2: a word that names a section shows it all).
function matches(rowWords, query, sectionWords) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  if (sectionWords.includes(q)) return true
  return q.split(/\s+/).every((w) => rowWords.includes(w))
}

function Row({ shown = true, label, help, children, stack = false }) {
  if (!shown) return null
  return (
    <div className={`ch-srow${stack ? ' stack' : ''}`}>
      <div>
        <div className="ch-sl">{label}</div>
        {help && <div className="ch-sh">{help}</div>}
      </div>
      {children && <div className="ch-sctl">{children}</div>}
    </div>
  )
}

function Seg({ options, value, onPick, label }) {
  return (
    <div className="ch-seg" role="radiogroup" aria-label={label}>
      {options.map(([v, words]) => (
        <button key={String(v)} type="button" role="radio" aria-checked={value === v} className={value === v ? 'on' : ''} onMouseDown={(e) => e.preventDefault()} onClick={() => onPick(v)}>{words}</button>
      ))}
    </div>
  )
}

function Switch({ on, onFlip, label }) {
  return <button type="button" role="switch" aria-checked={on} aria-label={label} className={`ch-sw${on ? ' on' : ''}`} onMouseDown={(e) => e.preventDefault()} onClick={() => onFlip(!on)} />
}

function Marg({ line, onWrite, children }) {
  return <button type="button" className="ch-marg ch-smarg" onMouseDown={(e) => e.preventDefault()} onClick={() => onWrite(`>${line}`)}>{children ?? line}</button>
}

const KEY_STATE = { has: COPY.settings.keyHas, held: COPY.settings.keyHeld, none: COPY.settings.keyNone }
const LOCAL_STATE = { unchecked: COPY.settings.localUnchecked, checking: COPY.settings.localChecking, ok: COPY.settings.localFound, unreached: COPY.settings.localMissing, denied: COPY.settings.localBlocked }

/**
 * @param {{ addressed: boolean, onAddress: (board: string) => void, section: string|null, query: string,
 *   facts: object, onSet: (line: string) => void, onWrite: (line: string) => void, onCount?: (n: number) => void }} props
 *   facts: the settings now and what the sections show (Shell.jsx, settingsFacts)
 */
export default function SettingsBoard({ addressed, onAddress, section, query, facts, onSet, onWrite, onCount }) {
  const { i18n } = useLingui()
  const body = useRef(null)
  const [current, setCurrent] = useState(section ?? 'keys')
  const ruleEl = useRef(null)
  const v = facts.values
  const say = (d, values) => i18n._(d, values)
  // A section on screen, found by its mark, in effects and handlers only.
  const secNode = (id) => body.current?.querySelector(`[data-sec="${id}"]`) ?? null

  // The rows each section has, by the words that find them (settings spec §2).
  const WORDS = useMemo(() => rowWords(facts), [facts])
  const sectionWords = (id) => [id, ...(SECTIONS.find((x) => x.id === id)?.words ?? [])]
  const shows = (sec, key) => matches(`${key} ${WORDS[sec]?.[key] ?? ''}`.toLowerCase(), query, sectionWords(sec))
  const count = (sec) => Object.keys(WORDS[sec] ?? {}).filter((key) => shows(sec, key)).length
  const total = SECTIONS.reduce((n, x) => n + count(x.id), 0)
  useEffect(() => { onCount?.(total) }, [total, onCount])

  // open:settings keys lands on its section.
  useEffect(() => {
    const node = section ? secNode(section) : null
    if (!node) return
    // Scrolling there moves the rule with it (follow, below).
    body.current.scrollTo({ top: node.offsetTop - 8, behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }, [section])

  // The section the rule sits on: the last whose top has passed a third of
  // the way down; at the foot, the last (settings spec §3).
  const follow = () => {
    const el = body.current
    if (!el) return
    const line = el.scrollTop + el.clientHeight / 3
    let at = SECTIONS[0].id
    for (const x of SECTIONS) {
      const node = secNode(x.id)
      if (node && node.offsetParent && node.offsetTop <= line) at = x.id
    }
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 2) {
      const last = [...SECTIONS].reverse().find((x) => secNode(x.id)?.offsetParent)
      if (last) at = last.id
    }
    setCurrent(at)
  }
  // The rule is placed on its section straight from the drawn card.
  useLayoutEffect(() => {
    const el = ruleEl.current
    if (!el) return
    // While a search hides the section, the first one still shown.
    const here = secNode(current)
    const node = here?.offsetParent ? here : SECTIONS.map((x) => secNode(x.id)).find((n) => n?.offsetParent) ?? null
    el.style.display = node?.offsetParent ? '' : 'none'
    if (node?.offsetParent) { el.style.top = `${node.offsetTop}px`; el.style.height = `${node.offsetHeight}px` }
  })

  const rowProps = (sec, key) => ({ shown: shows(sec, key) })
  const visible = (sec) => !query.trim() || count(sec) > 0

  // ── The sections ──
  const keyGroups = facts.providers.map((p) => {
    const state = p.has ? (p.held ? 'held' : 'has') : 'none'
    const rows = facts.rows.model.filter((r) => r.provider === p.id)
    return { ...p, state, rows }
  })

  const network = useNetwork()

  return (
    <article className={`ch-card ch-settings${addressed ? ' addressed' : ''}`} aria-current={addressed ? 'true' : undefined} onMouseDown={() => onAddress('settings')}>
      <header className="ch-chead">
        <h2>{say(COPY.boards.settings)}</h2>
        {addressed && <span className="ch-marg">{say(COPY.shell.addressed)}</span>}
      </header>
      <div className="ch-set">
        <nav className="ch-set-rail" aria-label={say(COPY.settings.rail)}>
          {SECTIONS.map((s) => (
            <button
              key={s.id} type="button"
              className={`ch-set-ritem${current === s.id ? ' on' : ''}${visible(s.id) ? '' : ' dim'}`}
              onClick={() => onWrite(`>open:settings ${s.id}`)}
            >
              <span className="ch-set-rname">{say(TITLE[s.id])}<span className="ch-set-ralias">{s.id}</span></span>
              <span className="ch-marg ch-set-rdesc">{say(DESC[s.id])}</span>
            </button>
          ))}
        </nav>
        <div className="ch-set-body" ref={body} onScroll={follow}>
          {addressed && <span className="ch-set-rule" ref={ruleEl} aria-hidden="true" />}

          {/* API keys (settings spec §8) */}
          <section data-sec="keys" className={`ch-sec${visible('keys') ? '' : ' hidden'}`} aria-labelledby="sec-keys">
            <SecHead id="keys" title={say(TITLE.keys)} />
            {!query && <p className="ch-sec-lede">{say(COPY.settings.keysLede, { model: facts.reference ?? '' })}</p>}
            {keyGroups.map((g) => (
              <Row key={g.id} {...rowProps('keys', g.id)} label={g.name} stack
                help={<>
                  {say(KEY_STATE[g.state], { ending: g.ending ?? '' })}
                  {' · '}<Marg line={`api:${g.id}`} onWrite={onWrite}>{say(COPY.settings.apiFrom, { command: `api:${g.id}` })}</Marg>
                </>}
              >
                <div className="ch-mrows" role="radiogroup" aria-label={say(COPY.settings.defaultLabel)}>
                  {g.rows.map((r) => {
                    const on = v.defaultModel === r.id
                    return r.needsKey ? (
                      <div key={r.id} className="ch-mrow off"><span className="dot" /><span className="mn" dir="auto">{r.name}</span><Marg line={`api:${g.id}`} onWrite={onWrite}>{say(COPY.settings.addKey)}</Marg><span className="mk">{r.mark ?? ''}</span></div>
                    ) : (
                      <button key={r.id} type="button" role="radio" aria-checked={on} className={`ch-mrow${on ? ' on' : ''}`} onMouseDown={(e) => e.preventDefault()} onClick={() => onSet(`set:default "${r.name}"`)}>
                        <span className="dot" /><span className="mn" dir="auto">{r.name}</span><span className="ch-marg">{on ? say(COPY.settings.isDefault) : ''}</span><span className="mk">{r.mark ?? ''}</span>
                      </button>
                    )
                  })}
                </div>
              </Row>
            ))}
            {facts.local && (
              <Row {...rowProps('keys', 'local')} label={facts.local.name} stack
                help={<>{say(LOCAL_STATE[facts.local.status] ?? LOCAL_STATE.unchecked, { count: facts.local.models.length })}{' · '}<Marg line={`api:${facts.local.id}`} onWrite={onWrite}>{say(COPY.settings.apiFrom, { command: `api:${facts.local.id}` })}</Marg></>}
              >
                {facts.rows.local.filter((r) => !r.unchecked && !r.later).length > 0 && (
                  <div className="ch-mrows" role="radiogroup" aria-label={say(COPY.settings.defaultLabel)}>
                    {facts.rows.local.filter((r) => !r.unchecked && !r.later).map((r) => {
                      const on = v.defaultModel === r.id
                      return (
                        <button key={r.id} type="button" role="radio" aria-checked={on} className={`ch-mrow${on ? ' on' : ''}`} onMouseDown={(e) => e.preventDefault()} onClick={() => onSet(`set:default "${r.name}"`)}>
                          <span className="dot" /><span className="mn" dir="auto">{r.name}</span><span className="ch-marg">{on ? say(COPY.settings.isDefault) : ''}</span><span className="mk">{r.mark ?? ''}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </Row>
            )}
            <Row {...rowProps('keys', 'sources')} label={say(COPY.settings.sources)} help={say(COPY.settings.sourcesHelp)} stack>
              <div className="ch-mrows">
                {facts.rows.source.filter((r) => !r.later).map((r) => (
                  <div key={r.id} className="ch-mrow src"><span className="dot" /><span className="mn" dir="auto">{r.name}</span><span /><span className="mk">0</span></div>
                ))}
              </div>
            </Row>
            {facts.region && (
              <Row {...rowProps('keys', 'region')} label={say(COPY.settings.regionLabel, { provider: facts.region.provider })} help={say(COPY.settings.regionHelp)}>
                <Seg label={say(COPY.settings.regionLabel, { provider: facts.region.provider })} value={v.mistralRegion} onPick={(x) => onSet(`set:region ${x}`)} options={[['global', say(COPY.settings.regionGlobal)], ['eu', say(COPY.settings.regionEu)], ['us', say(COPY.settings.regionUs)]]} />
              </Row>
            )}
            <Row {...rowProps('keys', 'keeping')} label={say(COPY.settings.keepingLabel)} help={say(COPY.settings.keepingHelp)} stack>
              <div className="ch-picks" role="radiogroup" aria-label={say(COPY.settings.keepingLabel)}>
                {[['persistent', COPY.settings.keepRemember, COPY.settings.keepRememberHelp, 'remember'], ['memory', COPY.settings.keepForget, COPY.settings.keepForgetHelp, 'forget']].map(([val, l, h, word]) => (
                  <button key={val} type="button" role="radio" aria-checked={v.storageMode === val} className={`ch-pick${v.storageMode === val ? ' on' : ''}`} onMouseDown={(e) => e.preventDefault()} onClick={() => onSet(`set:keys ${word}`)}>
                    <span className="dot" /><span><span className="pl">{say(l)}</span><span className="ph">{say(h)}</span></span>
                  </button>
                ))}
              </div>
            </Row>
          </section>

          {/* Spending (settings spec §9) */}
          <section data-sec="spending" className={`ch-sec${visible('spending') ? '' : ' hidden'}`} aria-labelledby="sec-spending">
            <SecHead id="spending" title={say(TITLE.spending)} />
            {!query && <p className="ch-sec-lede">{say(COPY.settings.spendingLede)}</p>}
            <Row {...rowProps('spending', 'month')} label={say(COPY.settings.monthLabel)} stack
              help={<>
                <span className="ch-spent">{say(COPY.settings.monthSpent, { cost: money(i18n, facts.spending.total), month: facts.spending.monthName, count: facts.spending.chats })}</span>
                {facts.spending.unknown > 0 && <> {say(COPY.settings.monthUnknown, { count: facts.spending.unknown })}</>}
                {facts.spending.top.length > 0 && (
                  <span className="ch-runs">
                    {facts.spending.top.map((c) => (
                      <button key={c.num} type="button" className="ch-runrow" onMouseDown={(e) => e.preventDefault()} onClick={() => onWrite(`>open:${c.num}`)}>
                        <span className="ch-code">{c.num}</span><span className="rt" dir="auto">{c.title || say(COPY.settings.untitled)}</span><span className="rc">{money(i18n, c.cost)}</span>
                      </button>
                    ))}
                  </span>
                )}
              </>}
            />
          </section>

          {/* Context and defaults (settings spec §10) */}
          <section data-sec="context" className={`ch-sec${visible('context') ? '' : ' hidden'}`} aria-labelledby="sec-context">
            <SecHead id="context" title={say(TITLE.context)} />
            {!query && <p className="ch-sec-lede">{say(COPY.settings.contextLede)}</p>}
            <Row {...rowProps('context', 'title')} label={say(COPY.settings.titleLabel)} help={say(v.describeNewChats ? COPY.settings.titleOn : COPY.settings.titleOff)}>
              <Switch on={v.describeNewChats !== false} label={say(COPY.settings.titleLabel)} onFlip={(on) => onSet(`set:title ${on ? 'on' : 'off'}`)} />
            </Row>
            <Row {...rowProps('context', 'finish')} label={say(COPY.settings.finishLabel)} help={say(v.finishRepliesOnLeave ? COPY.settings.finishOn : COPY.settings.finishOff)}>
              <Switch on={Boolean(v.finishRepliesOnLeave)} label={say(COPY.settings.finishLabel)} onFlip={(on) => onSet(`set:finish ${on ? 'on' : 'off'}`)} />
            </Row>
            {facts.rooms.length > 0 && (
              <Row {...rowProps('context', 'room')} label={say(COPY.settings.roomLabel)} help={say(COPY.settings.roomHelp)}>
                <Seg label={say(COPY.settings.roomLabel)} value={v.newChatRoom ?? facts.rooms[0].id} onPick={(id) => onSet(`set:room "${facts.rooms.find((r) => r.id === id)?.name ?? ''}"`)} options={facts.rooms.map((r) => [r.id, r.name])} />
              </Row>
            )}
            <Row {...rowProps('context', 'thinking')} label={say(COPY.settings.thinkingLabel)} help={say(v.thinking ? COPY.settings.thinkingOn : COPY.settings.thinkingOff)}>
              <Marg line={v.thinking ? 'thinking:off' : 'thinking:on'} onWrite={onWrite} />
            </Row>
            <Row {...rowProps('context', 'reply')} label={say(COPY.settings.replyLabel)} help={facts.replyIn ? say(COPY.settings.replyIn, { language: facts.replyIn }) : say(COPY.settings.replyAny)}>
              <Marg line="reply:" onWrite={onWrite} />
            </Row>
            <Row {...rowProps('context', 'helper')} label={say(COPY.settings.helperLabel)} help={facts.helperName ? say(COPY.settings.helperIs, { name: facts.helperName }) : say(COPY.settings.helperNone)}>
              <Marg line="helper:" onWrite={onWrite} />
            </Row>
            <Row {...rowProps('context', 'privacy')} label={say(COPY.settings.privacyLabel)} help={say(COPY.settings[`privacy_${v.privacyFilter ?? 'off'}`] ?? COPY.settings.privacy_off)}>
              <Marg line={(v.privacyFilter ?? 'off') === 'off' ? 'privacy:on' : 'privacy:off'} onWrite={onWrite} />
            </Row>
            <Row {...rowProps('context', 'translate')} label={say(COPY.settings.translateLabel)} help={say(v.translateQueries ? COPY.settings.translateOn : COPY.settings.translateOff)}>
              <Marg line={v.translateQueries ? 'translate:off' : 'translate:on'} onWrite={onWrite} />
            </Row>
          </section>

          {/* Data and backups (settings spec §11) */}
          <section data-sec="data" className={`ch-sec${visible('data') ? '' : ' hidden'}`} aria-labelledby="sec-data">
            <SecHead id="data" title={say(TITLE.data)} />
            {!query && <p className="ch-sec-lede">{say(COPY.settings.dataLede)}</p>}
            <Row {...rowProps('data', 'backup')} label={say(COPY.settings.backupLabel)} help={say(COPY.settings.backupHelp, { version: facts.backupVersion })}>
              <span className="ch-set-margs"><Marg line="backup:" onWrite={onWrite} /><Marg line="restore:" onWrite={onWrite} /></span>
            </Row>
            <Row {...rowProps('data', 'reminder')} label={say(COPY.settings.reminderLabel)} help={say(COPY.settings.reminderHelp)}>
              <Seg label={say(COPY.settings.reminderLabel)} value={v.backupReminder ?? 'monthly'} onPick={(x) => onSet(`set:reminder ${x}`)} options={[['daily', say(COPY.settings.reminderDaily)], ['weekly', say(COPY.settings.reminderWeekly)], ['monthly', say(COPY.settings.reminderMonthly)], ['never', say(COPY.settings.reminderNever)]]} />
            </Row>
            <Row {...rowProps('data', 'storage')} label={say(COPY.settings.storageLabel)} stack
              help={<>
                {facts.storage.quota > 0 && <span className="ch-meter"><i style={{ width: `${Math.min(100, Math.max(1, (facts.storage.usage / facts.storage.quota) * 100))}%` }} /></span>}
                {say(COPY.settings.storageUsed, { used: bytes(i18n, facts.storage.usage), quota: bytes(i18n, facts.storage.quota) })}
                {' '}{say(COPY.settings.storageCounts, { chats: facts.counts.chats, plans: facts.counts.plans, markings: facts.counts.markings })}
                {' '}{say(facts.storage.kept === true ? COPY.settings.keptYes : facts.storage.kept === false ? COPY.settings.keptNo : COPY.settings.keptUnknown)}
              </>}
            />
            <Row {...rowProps('data', 'last')} label={say(COPY.settings.lastLabel)} help={facts.lastBackup ? say(COPY.settings.lastOn, { day: longDay(i18n, facts.lastBackup.slice(0, 10)) }) : say(COPY.settings.lastNever)} />
            {/* Delete everything: a button, never a command (C73; C183) */}
            {shows('data', 'danger') && (
              <DeleteEverything counts={facts.counts} keyNames={facts.providers.filter((p) => p.has).map((p) => p.name)} onWrite={onWrite} />
            )}
          </section>

          {/* Appearance (settings spec §12) */}
          <section data-sec="appearance" className={`ch-sec${visible('appearance') ? '' : ' hidden'}`} aria-labelledby="sec-appearance">
            <SecHead id="appearance" title={say(TITLE.appearance)} />
            <Row {...rowProps('appearance', 'text')} label={say(COPY.settings.textLabel)} help={say(COPY.settings.textHelp)}>
              <Seg label={say(COPY.settings.textLabel)} value={v.fontSize ?? 'default'} onPick={(x) => onSet(`set:text ${x}`)} options={[['compact', say(COPY.settings.textCompact)], ['default', say(COPY.settings.textDefault)], ['large', say(COPY.settings.textLarge)]]} />
            </Row>
          </section>

          {/* About (settings spec §13) */}
          <section data-sec="about" className={`ch-sec${visible('about') ? '' : ' hidden'}`} aria-labelledby="sec-about">
            <SecHead id="about" title={say(TITLE.about)} />
            <Row {...rowProps('about', 'parliament')} label={say(COPY.settings.aboutName)} help={say(COPY.settings.aboutLine)} />
            <Row {...rowProps('about', 'network')} label={say(COPY.settings.networkLabel)} stack
              help={<>
                {say(COPY.settings.networkHelp)}
                {network.length === 0
                  ? <span className="ch-net-empty">{say(COPY.settings.networkNone)}</span>
                  : (
                    <span className="ch-net">
                      {network.map((g) => (
                        <span key={g.host} className="ch-netrow">
                          <span className="h">{g.host}</span>
                          <span className="w ch-marg">{g.name ?? say(g.self ? COPY.settings.networkSelf : COPY.settings.networkUnknown)}</span>
                          <span className="n">{g.count}</span>
                        </span>
                      ))}
                    </span>
                  )}
              </>}
            />
          </section>
        </div>
      </div>
    </article>
  )
}

// A section's head: its title, and its alias, the word typed after
// open:settings, shown the way ids are (settings spec §2).
function SecHead({ id, title }) {
  return <div className="ch-sec-h"><h3 id={`sec-${id}`}>{title}</h3><span className="ch-alias">{id}</span></div>
}

// The words each row is found by, section by section, with only the rows
// the card draws: search narrows to these, and the bar counts them.
function rowWords(facts) {
  const keys = {}
  for (const p of facts.providers) keys[p.id] = `${p.name} key ${facts.rows.model.filter((r) => r.provider === p.id).map((r) => r.name).join(' ')}`
  if (facts.local) keys.local = `${facts.local.name} local computer ${facts.local.models.join(' ')}`
  keys.sources = `sources source no key ${facts.rows.source.map((r) => r.name).join(' ')}`
  if (facts.region) keys.region = `region where process eu us ${facts.region.provider}`
  keys.keeping = 'keeping keys remember save forget encrypt storage'
  const context = {
    title: 'title name request new chat first answer describe',
    finish: 'finish replies leave chat stop background',
    ...(facts.rooms.length ? { room: `room new chat plan docket start ${facts.rooms.map((r) => r.name).join(' ')}` } : {}),
    thinking: 'thinking think before answering models',
    reply: 'reply language replies answers',
    helper: 'helper translate summary small model reads sources',
    privacy: 'privacy filter email phone names placeholders',
    translate: 'translate questions sources english language',
  }
  return {
    keys,
    spending: { month: 'this month spent chats cost dollars' },
    context,
    data: {
      backup: 'backup restore export import parliament file format bring back',
      reminder: 'reminder backup daily weekly monthly never remind',
      storage: 'storage space used browser kept keep persist',
      last: 'last backup backed up date',
      danger: 'delete everything erase wipe remove all danger',
    },
    appearance: { text: 'text size font compact large zoom' },
    about: { parliament: 'parliament version about servers accounts', network: 'network activity requests log hosts' },
  }
}

// The page's requests, grouped by host and named by who called them.
function useNetwork() {
  const entries = useSyncExternalStore(onLog, getEntries, getEntries)
  const requests = useSyncExternalStore(gateway.subscribe, gateway.requests, gateway.requests)
  return useMemo(() => networkByHost(entries, requests), [entries, requests])
}

// Sizes the way the reader's language writes them: 112 kB, 1.5 GB.
function bytes(i18n, n) {
  const units = ['byte', 'kilobyte', 'megabyte', 'gigabyte']
  let v = Math.max(0, n || 0)
  let u = 0
  while (v >= 1000 && u < units.length - 1) { v /= 1000; u += 1 }
  try {
    return new Intl.NumberFormat(i18n.locale, { style: 'unit', unit: units[u], unitDisplay: 'short', maximumFractionDigits: v < 10 && u > 0 ? 1 : 0 }).format(v)
  } catch {
    return `${Math.round(v)} ${units[u]}`
  }
}
