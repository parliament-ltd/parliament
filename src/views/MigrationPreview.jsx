import { useState } from 'react'
import { parseBackupFile, decryptBackup, contentsToFlatStores } from '../lib/backup'
import { initDB } from '../lib/db'
import { planV6Migration } from '../lib/migrations/v6Plan'

// Dry run of the one-time data upgrade (refactor-plan.md, stage 2). Dev only,
// at /dev/migration. Reads a .parliament backup, or this browser's data, runs
// the migration plan in memory, and shows what it would do. Writes nothing.
//
// Styled inline with the mockups' values until the shell lands shared tokens.

const C = {
  paper: '#FCFCFA', surface: '#FFFFFF', subtle: '#FAF9F5', ink: '#191919', ink2: '#5F5E59', ink3: '#6F6E69',
  border: '#E9E9E7', border2: '#F1F1EF', wash: 'rgba(25,25,25,.045)',
  sans: '-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif',
  serif: '"Iowan Old Style","Palatino Linotype",Palatino,Georgia,"Times New Roman",serif',
  mono: 'ui-monospace,SFMono-Regular,"SF Mono",Menlo,monospace',
}

const STATUS_STYLE = {
  done: { background: 'rgba(25,25,25,.075)', color: C.ink2 },
  paused: { border: '.5px dashed rgba(25,25,25,.30)', color: C.ink3 },
  waiting: { border: '.5px dashed rgba(25,25,25,.30)', color: C.ink2 },
  running: { background: C.ink, color: C.paper },
}

// What a branch with no steps is, in the Steps column.
const NO_STEPS = { document: 'a document', empty: 'empty', replies: 'replies only' }

// Lists longer than this show their first entries and a count of the rest.
const LIST_LIMIT = 60

async function readThisBrowser() {
  const db = await initDB()
  return {
    conversations: await db.getAll('conversations'),
    messages: await db.getAll('messages'),
    notes: await db.getAll('notes'),
    highlights: await db.getAll('highlights'),
    favorites: await db.getAll('favorites'),
    pins: await db.getAll('pins'),
    settings: await db.getAll('settings'),
    modes: await db.getAll('modes'),
    sbrd_documents: await db.getAll('sbrd_documents'),
  }
}

export default function MigrationPreview() {
  const [file, setFile] = useState(null)
  const [password, setPassword] = useState('')
  const [source, setSource] = useState('')
  const [report, setReport] = useState(null)
  const [error, setError] = useState('')
  const [working, setWorking] = useState(false)

  const run = async (label, loadSnap) => {
    setWorking(true)
    setError('')
    setReport(null)
    try {
      const snap = await loadSnap()
      setReport(planV6Migration(snap).report)
      setSource(label)
    } catch (e) {
      setError(e?.message || 'Could not read that.')
    } finally {
      setWorking(false)
    }
  }

  const readFile = async (f, pw) => {
    const parsed = await parseBackupFile(f)
    const contents = await decryptBackup(parsed, pw)
    return contentsToFlatStores(contents)
  }
  const fromFile = () => run(file.name, () => readFile(file, password || null))
  // An invented backup that reaches every part of the plan, read the same way
  // as a real file. Loaded only when asked for, and only in development.
  const fromSample = () => run('the sample backup (invented data)', async () => {
    const { default: text } = await import('../lib/__fixtures__/sample-v5.json?raw')
    return readFile(new File([text], 'sample-v5.parliament'), null)
  })

  const btn = {
    font: `500 13px ${C.sans}`, padding: '7px 13px', borderRadius: 8, cursor: 'pointer',
    color: C.ink, background: C.surface, border: `1px solid ${C.ink3}`,
  }

  return (
    <div style={{ minHeight: '100vh', background: C.paper, color: C.ink, font: `400 14px ${C.sans}`, padding: '40px 16px 80px' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        <h1 style={{ font: `500 20px ${C.sans}`, margin: 0 }}>Upgrade dry run</h1>
        <p style={{ margin: '6px 0 0', font: `italic 400 13px ${C.serif}`, color: C.ink2, maxWidth: 720, lineHeight: 1.6 }}>
          What the one-time upgrade would do to your data. This page only reads: nothing is written, here or
          anywhere else. Read a backup file, or the data already in this browser.
        </p>

        <Card>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'end' }}>
            <label style={{ font: `500 12px ${C.sans}`, color: C.ink2 }}>
              Backup file
              <input type="file" accept=".parliament,.json,.apb" onChange={(e) => setFile(e.target.files?.[0] || null)}
                style={{ display: 'block', marginTop: 6, font: `400 13px ${C.sans}` }} />
            </label>
            <label style={{ font: `500 12px ${C.sans}`, color: C.ink2 }}>
              Password, if encrypted
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off"
                data-1p-ignore data-lpignore="true"
                style={{ display: 'block', marginTop: 6, padding: '6px 9px', font: `400 13px ${C.sans}`, border: `1px solid ${C.border}`, borderRadius: 6 }} />
            </label>
            <button type="button" style={btn} disabled={!file || working} onClick={fromFile}>Read the backup</button>
            <span style={{ font: `italic 400 13px ${C.serif}`, color: C.ink3 }}>or</span>
            <button type="button" style={btn} disabled={working} onClick={() => run("this browser's data", readThisBrowser)}>
              Read this browser&apos;s data
            </button>
            <span style={{ font: `italic 400 13px ${C.serif}`, color: C.ink3 }}>or</span>
            <button type="button" style={btn} disabled={working} onClick={fromSample}>Read the sample</button>
          </div>
          {error && <p style={{ margin: '12px 0 0', color: C.ink }}>{error}</p>}
          {working && <p style={{ margin: '12px 0 0', font: `italic 400 13px ${C.serif}`, color: C.ink2 }}>Reading…</p>}
        </Card>

        {report && <Report report={report} source={source} />}
      </div>
    </div>
  )
}

function Card({ children, style }) {
  return (
    <div style={{ background: C.surface, borderRadius: 16, padding: '18px 20px', marginTop: 20, boxShadow: '0 1px 2px rgba(40,36,28,.035)', ...style }}>
      {children}
    </div>
  )
}

function H2({ children }) {
  return <h2 style={{ font: `500 15px ${C.sans}`, margin: '0 0 6px' }}>{children}</h2>
}

function Explain({ children }) {
  return <p style={{ margin: '0 0 12px', font: `italic 400 13px ${C.serif}`, color: C.ink2, maxWidth: 760, lineHeight: 1.6 }}>{children}</p>
}

function Report({ report, source }) {
  const c = report.counts
  // [count, said of one, said of several]
  const facts = [
    [c.chats, 'chat', 'chats'],
    [c.dockets, 'docket (plan) made', 'dockets (plans) made'],
    [c.multiBranchDockets, 'with more than one branch', 'with more than one branch'],
    [c.steps, 'step, from your prompts', 'steps, from your prompts (a branch repeats those before its fork)'],
    [c.notes, 'note, numbered', 'notes, numbered'],
    [c.terms, 'highlight, now called a term', 'highlights, now called terms'],
    [c.quotes, 'pinned reference, now a quote', 'pinned references, now quotes'],
    [c.favoritesToCollection, 'favourite, into the Favorites collection', 'favourites, into the Favorites collection'],
    [c.scratchpadToNote, 'scratchpad, into a note', 'scratchpad, into a note'],
    [c.collabs, 'persona, into a collab (switched off)', 'personas, into collabs (switched off)'],
    [c.chatsWithModelTags, 'chat whose tags are marked as the model\'s', 'chats whose tags are marked as the model\'s'],
  ]
  return (
    <>
      <Card>
        <H2>Summary</H2>
        <Explain>From {source}.</Explain>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: '8px 24px' }}>
          {facts.map(([n, one, many]) => (
            <div key={many}><span style={{ font: `500 16px ${C.sans}` }}>{n}</span> <span style={{ color: C.ink2 }}>{n === 1 ? one : many}</span></div>
          ))}
        </div>
        <p style={{ margin: '14px 0 0', color: C.ink2, lineHeight: 1.6 }}>
          {c.lastNum >= c.firstNum
            ? <>Everything gets a number from one counter, in the order it was made: <Mono>{c.firstNum}</Mono> to <Mono>{c.lastNum}</Mono>. </>
            : 'Nothing to number yet. '}
          The next new item takes <Mono>{c.nextNum}</Mono>.
          {c.keyMoves ? ' Your saved key moves to a store of its own; its value is never shown or written anywhere else.' : ''}
        </p>
      </Card>

      {report.warnings.length > 0 && (
        <Card>
          <H2>Worth knowing</H2>
          <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
            {report.warnings.map((w) => <li key={w}>{w}</li>)}
          </ul>
        </Card>
      )}

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '18px 20px 6px' }}>
          <H2>Dockets</H2>
          <Explain>
            A docket is a plan that holds a chat and its branches. Every chat joins one. A chat with its branches becomes
            one docket, with the first chat as branch a and each branch taking the next letter. Any other chat becomes a
            docket of its own. Your prompts become the docket&apos;s steps. Nothing in the chats themselves changes.
          </Explain>
        </div>
        {report.dockets.length === 0 && (
          <p style={{ margin: 0, padding: '0 20px 18px', color: C.ink2 }}>No chats, so no dockets.</p>
        )}
        <div style={{ overflowX: 'auto', display: report.dockets.length ? undefined : 'none' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', font: `400 13px ${C.sans}` }}>
            <thead>
              <tr style={{ background: C.subtle, color: C.ink2, textAlign: 'left' }}>
                {['Address', 'Branch', 'Chat', 'Room', 'Steps', 'State', 'Branched from'].map((h) => (
                  <th key={h} style={{ padding: '8px 12px', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.dockets.map((d) => (
                <DocketRows key={d.num} d={d} />
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {report.favorites.length > 0 && (
        <Card>
          <H2>Favourites, in the Favorites collection</H2>
          <Explain>Each favourite becomes an item in one collection, in the order you made them. The messages are not copied or changed.</Explain>
          <Limited items={report.favorites} render={(f, i) => (
            <Line key={i}>
              <span style={{ color: C.ink2 }}>{f.excerpt}</span>{' '}
              <Marg>in chat {f.chatNum}, {f.chatTitle}</Marg>
            </Line>
          )} />
        </Card>
      )}

      {report.terms.length > 0 && (
        <Card>
          <H2>Terms (today&apos;s highlights)</H2>
          <Explain>
            Today a highlight lights a word or phrase wherever it appears in a chat. That is now called a term. Each keeps
            its word and colour and gains a number. A highlight will mean one passage you mark from now on.
          </Explain>
          <Limited items={report.terms} render={(t) => (
            <Line key={t.num}><Mono>{t.num}</Mono> {t.text} <Marg>in chat {t.chatNum}</Marg></Line>
          )} />
        </Card>
      )}

      {report.quotes.length > 0 && (
        <Card>
          <H2>Quotes (today&apos;s pinned references)</H2>
          <Explain>A message pinned into another chat for reference becomes a quote: kept for you, never sent to the model. Nothing about it changes except a number.</Explain>
          <Limited items={report.quotes} render={(q) => (
            <Line key={q.num}><Mono>{q.num}</Mono> <span style={{ color: C.ink2 }}>{q.excerpt}</span> <Marg>in chat {q.inChatNum}, from chat {q.fromChatNum}</Marg></Line>
          )} />
        </Card>
      )}

      {report.collabs.length > 0 && (
        <Card>
          <H2>Your personas, becoming collabs</H2>
          <Explain>
            Saved personas become standing instructions of your own. They come across switched off: until now ticking one
            never changed what the model was sent, so nothing should start behaving differently by itself.
          </Explain>
          {report.collabs.map((p, i) => (
            <Line key={i}><span style={{ fontWeight: 500 }}>{p.name ?? <Marg>untitled</Marg>}</span> <span style={{ color: C.ink2 }}>{p.excerpt}</span></Line>
          ))}
        </Card>
      )}

      {report.newNotes.length > 0 && (
        <Card>
          <H2>New notes</H2>
          {report.newNotes.map((n) => (
            <Line key={n.num}><Mono>{n.num}</Mono> <span style={{ color: C.ink2 }}>{n.excerpt}</span> <Marg>from the {n.from}</Marg></Line>
          ))}
        </Card>
      )}
    </>
  )
}

function Limited({ items, render }) {
  const shown = items.slice(0, LIST_LIMIT)
  return (
    <>
      {shown.map(render)}
      {items.length > shown.length && <Line><Marg>and {items.length - shown.length} more</Marg></Line>}
    </>
  )
}

function Line({ children }) {
  return <div style={{ padding: '6px 0', borderTop: `.5px solid ${C.border2}` }}>{children}</div>
}

function Marg({ children }) {
  return <span style={{ font: `italic 400 12px ${C.serif}`, color: C.ink3 }}>{children}</span>
}

function DocketRows({ d }) {
  return (
    <>
      <tr style={{ borderTop: `.5px solid ${C.border}` }}>
        <td style={{ padding: '10px 12px 4px' }}><Mono>{d.num}</Mono></td>
        <td colSpan={6} style={{ padding: '10px 12px 4px', fontWeight: 500 }}>{d.title ?? <Marg>untitled</Marg>}</td>
      </tr>
      {d.branches.map((b) => (
        <tr key={b.address} style={{ color: C.ink }}>
          <td style={{ padding: '3px 12px 3px 24px' }}><Mono>{b.address}</Mono></td>
          <td style={{ padding: '3px 12px' }}>{b.name ?? <Marg>untitled</Marg>}</td>
          <td style={{ padding: '3px 12px' }}><Mono>{b.chatNum}</Mono></td>
          <td style={{ padding: '3px 12px', font: `italic 400 12px ${C.serif}`, color: C.ink2 }}>
            {b.roomName || (b.room ? 'a room missing from the data' : 'no room')}
          </td>
          <td style={{ padding: '3px 12px' }}>
            {b.noSteps ? <Marg>{NO_STEPS[b.noSteps]}</Marg> : b.steps}
            {b.paused ? <span style={{ color: C.ink3 }}>{`, ${b.paused} without a full reply`}</span> : null}
          </td>
          <td style={{ padding: '3px 12px' }}>{b.status === 'ready' ? null : <Chip status={b.status} />}</td>
          <td style={{ padding: '3px 12px', font: `italic 400 12px ${C.serif}`, color: C.ink2 }}>
            {b.forkedFrom
              ? `chat ${b.forkedFrom.chatNum}${b.forkedFrom.step ? `, after prompt ${b.forkedFrom.step}` : ''}`
              : b.parentGone ? 'a chat since deleted' : ''}
          </td>
        </tr>
      ))}
    </>
  )
}

// Status pill as the docket mockup draws it. Ready is silent.
function Chip({ status }) {
  return (
    <span style={{ display: 'inline-flex', font: `500 10px ${C.sans}`, padding: '2px 7px', borderRadius: 9, ...STATUS_STYLE[status] }}>
      {status}
    </span>
  )
}

function Mono({ children }) {
  return <span style={{ font: `400 12px ${C.mono}`, color: C.ink3 }}>{children}</span>
}
