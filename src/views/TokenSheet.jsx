import { useState } from 'react'
import '../styles/tokens.css'

// The token sheet, drawn for Stefan's approval before any chrome is built
// (refactor-plan.md, stage 3; C51). Dev only, at /dev/tokens. Every value
// comes from src/styles/tokens.css; docs/spec/token-sheet.md has the sources.

const v = (name) => `var(--ch-${name})`

const COLOURS = [
  ['paper', '#FCFCFA', 'the page'],
  ['surface', '#FFFFFF', 'cards, the open field'],
  ['subtle', '#FAF9F5', 'table heads, quiet fills'],
  ['tray', '#F6F5F1', 'trays in the Collection'],
  ['ink', '#191919', 'text · 17.1'],
  ['ink-2', '#45433F', 'secondary text · 9.6'],
  ['ink-3', '#6B6964', 'ids, struck words · 5.3'],
  ['marg', 'ink at 62%', 'marginalia, the Enter line · 4.9'],
  ['soft', 'ink at 30%', 'dashed outlines; never text'],
  ['wash', 'ink at 4.5%', 'a selected row'],
  ['wash-2', 'ink at 7.5%', 'a done pill'],
  ['divider', 'ink at 8%', 'hairlines'],
  ['border', '#E9E9E7', 'card edges'],
  ['border-2', '#F1F1EF', 'inner hairlines'],
  ['you', '#2B5CB8', 'your words · 6.1'],
  ['ai', '#2E7458', "an ask's answer, a sweep · 5.4"],
  ['rust', '#94491F', 'Ripple · 6.3'],
  ['gold', '#C4A94D', 'the api: ignition only'],
  ['gold-deep', '#8B6A10', "the hexagon's edge on hover"],
]

const SIZES = [
  ['t-display', '22px', 'Welcome to Parliament', 'serif'],
  ['t-title', '18px', 'Parliament needs to update how your data is stored', 'sans'],
  ['t-lead', '15.5px', 'A heading inside a card', 'sans'],
  ['t-body', '14px', 'The field, rows and body text: When was the water tower built?', 'sans'],
  ['t-small', '12.5px', 'Secondary labels and table cells', 'sans'],
  ['t-marg', '11.5px', 'marginalia and the Enter line, never smaller', 'serif'],
  ['t-id', '10.5px', '201a · 207 · 242', 'mono'],
]

const DIFFERENCES = [
  ['ink-2', '#45433F (bar reference)', '#5F5E59 (editing spec), #787774 (older mockups)'],
  ['ink-3', '#6B6964 (bar reference)', '#6F6E69 (editing spec), #9B9A97 (older)'],
  ['marg', 'ink at 62% (bar, editing spec)', 'ink at 46% (welcome v9, Lab, Settings, Almanac): 3.0, too faint'],
  ['you', '#2B5CB8 (bar reference)', '#2F5DA8 (editing spec)'],
  ['rule', 'ink at 8% (bar reference)', 'ink at 12% (welcome v9)'],
  ['kind-high', '#B63674 (darkened to 4.7)', "#BE3878 (Almanac): 4.4, just short of 4.5"],
  ['kind-docket', '#0E728D (darkened to 4.7)', '#0E7490 (Almanac): 4.5 exactly'],
  ['serif', 'without Times New Roman (bar)', 'with it (editing spec)'],
]

function Section({ title, children, note }) {
  return (
    <section style={{ marginTop: 28 }}>
      <h2 style={{ font: `500 ${v('t-lead')} ${v('sans')}`, margin: '0 0 4px', color: v('ink') }}>{title}</h2>
      {note && <p style={{ margin: '0 0 12px', font: `italic 400 ${v('t-marg')} ${v('serif')}`, color: v('marg') }}>{note}</p>}
      {children}
    </section>
  )
}

function Card({ children, style }) {
  return <div style={{ background: v('surface'), borderRadius: v('r-card'), boxShadow: v('lift'), padding: 16, ...style }}>{children}</div>
}

function Field({ mode, text, marg }) {
  const command = mode === 'command'
  const fill = command ? `rgb(${'var(--ch-navy)'})` : mode === 'prompt' ? v('paper') : v('surface')
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, height: v('field-h'), padding: '0 14px', borderRadius: v('r-field'),
      background: fill, border: command ? 'none' : `1px solid ${v('border')}`,
      transition: `background ${v('dur-wipe')} ${v('ease')}`,
    }}>
      <span style={{
        font: `600 10.5px ${v('sans')}`, letterSpacing: '.06em', padding: '2px 7px', borderRadius: v('r-sm'),
        color: command ? v('surface') : v('ink-2'), background: command ? 'rgba(255,255,255,.12)' : v('wash'),
      }}>{mode.toUpperCase()}</span>
      <span style={{ flex: 1, font: `400 ${v('t-body')} ${v('sans')}`, color: command ? v('surface') : v('ink') }}>{text}</span>
      {marg && <span style={{ font: `italic 400 ${v('t-marg')} ${v('serif')}`, color: v('marg') }}>{marg}</span>}
    </div>
  )
}

export default function TokenSheet() {
  const [wiped, setWiped] = useState(false)
  return (
    <div style={{ minHeight: '100vh', background: v('paper'), color: v('ink'), font: `400 ${v('t-body')} ${v('sans')}`, padding: '36px 16px 80px' }}>
      <div style={{ maxWidth: 880, margin: '0 auto' }}>
        <h1 style={{ font: `500 ${v('t-title')} ${v('sans')}`, margin: 0 }}>Token sheet</h1>
        <p style={{ margin: '6px 0 0', font: `italic 400 13px ${v('serif')}`, color: v('ink-2'), lineHeight: 1.6, maxWidth: 680 }}>
          One set of colours, sizes, shapes and motion for the new chrome, for your approval before any of it is drawn.
          Taken from the newest mockup that defines each value: the bar reference first, then the editing spec. Ratios are
          contrast on the paper colour; small text needs 4.5. Rooms keep their own themes.
        </p>

        <Section title="Colours">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 10 }}>
            {COLOURS.map(([name, value, use]) => (
              <Card key={name} style={{ padding: 10 }}>
                <div style={{ height: 36, borderRadius: v('r-md'), background: v(name), border: `.5px solid ${v('border')}` }} />
                <div style={{ marginTop: 8, font: `400 ${v('t-id')} ${v('mono')}`, color: v('ink-3') }}>--ch-{name}</div>
                <div style={{ font: `500 ${v('t-small')} ${v('sans')}` }}>{value}</div>
                <div style={{ font: `italic 400 ${v('t-marg')} ${v('serif')}`, color: v('marg') }}>{use}</div>
              </Card>
            ))}
            <Card style={{ padding: 10 }}>
              <div style={{ height: 36, borderRadius: v('r-md'), background: 'rgb(var(--ch-navy))' }} />
              <div style={{ marginTop: 8, font: `400 ${v('t-id')} ${v('mono')}`, color: v('ink-3') }}>--ch-navy</div>
              <div style={{ font: `500 ${v('t-small')} ${v('sans')}` }}>rgb 22, 38, 70</div>
              <div style={{ font: `italic 400 ${v('t-marg')} ${v('serif')}`, color: v('marg') }}>command mode, the navy rule</div>
            </Card>
          </div>
        </Section>

        <Section title="Type" note="System sans for the interface, a serif for marginalia and letters, mono for ids.">
          <Card>
            {SIZES.map(([name, size, sample, family]) => (
              <div key={name} style={{ display: 'flex', alignItems: 'baseline', gap: 16, padding: '7px 0', borderTop: `.5px solid ${v('border-2')}` }}>
                <span style={{ width: 120, font: `400 ${v('t-id')} ${v('mono')}`, color: v('ink-3') }}>--ch-{name} · {size}</span>
                <span style={{ font: `${family === 'serif' ? 'italic ' : ''}400 ${v(name)} ${v(family)}`, color: name === 't-marg' ? v('marg') : v('ink') }}>{sample}</span>
              </div>
            ))}
          </Card>
        </Section>

        <Section title="The field" note="40px tall, 14px corners. Search on white, command on navy, prompt on paper. Click to see a fill wipe in.">
          <Card style={{ display: 'grid', gap: 12 }}>
            <Field mode="search" text="water tower" />
            <div onClick={() => setWiped((w) => !w)} style={{ cursor: 'pointer' }}>
              <Field mode={wiped ? 'command' : 'search'} text={wiped ? '> open:201a' : 'click me: the fill wipes in'} />
            </div>
            <Field mode="prompt" text="When was it built?" marg="collab: none · to 201a · all three" />
            <p style={{ margin: 0, font: `italic 400 ${v('t-marg')} ${v('serif')}`, color: v('marg') }}>
              → 201a · Enter sends the prompt to Wikipedia · Esc to leave
            </p>
          </Card>
        </Section>

        <Section title="Kinds and marks" note="Term, quote, edit, ask and suggestion labels have no mockup yet.">
          <Card style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            {[['chat', 'Chat'], ['note', 'Note'], ['high', 'Highlight'], ['docket', 'Docket']].map(([k, label]) => (
              <span key={k} style={{ font: `500 11px ${v('sans')}`, padding: '3px 8px', borderRadius: 9, color: v(`kind-${k}`), background: v(`kind-${k}-bg`) }}>{label}</span>
            ))}
            <span style={{ marginLeft: 12, textDecoration: 'underline solid', textDecorationColor: v('you'), color: v('you'), textUnderlineOffset: 3 }}>your words</span>
            <span style={{ textDecoration: 'underline dotted', textDecorationColor: v('ai'), color: v('ai'), textUnderlineOffset: 3 }}>an ask's answer</span>
            <span style={{ textDecoration: 'underline dashed', textDecorationColor: v('rust'), color: v('rust'), textUnderlineOffset: 3 }}>Ripple</span>
            <span style={{ background: v('mark-high'), padding: '0 2px' }}>a highlight</span>
          </Card>
        </Section>

        <Section title="Shape, focus and lift" note="Cards carry a faint lift, no borders or hatching. Keyboard focus is a 2px ink outline.">
          <Card style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
            {['r-sm', 'r-md', 'r-btn', 'r-field', 'r-card'].map((r) => (
              <div key={r} style={{ textAlign: 'center' }}>
                <div style={{ width: 56, height: 40, borderRadius: v(r), background: v('subtle'), border: `1px solid ${v('border')}` }} />
                <div style={{ font: `400 ${v('t-id')} ${v('mono')}`, color: v('ink-3'), marginTop: 4 }}>{r}</div>
              </div>
            ))}
            <button type="button" style={{ font: `500 13px ${v('sans')}`, padding: '8px 14px', borderRadius: v('r-btn'), border: `1px solid ${v('ink-3')}`, background: v('surface'), color: v('ink'), outline: v('focus'), outlineOffset: 2 }}>
              A focused button
            </button>
          </Card>
        </Section>

        <Section title="Where the mockups differ" note="What the sheet takes, and what it leaves.">
          <Card>
            {DIFFERENCES.map(([name, takes, leaves]) => (
              <div key={name} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 1fr', gap: 12, padding: '6px 0', borderTop: `.5px solid ${v('border-2')}`, font: `400 ${v('t-small')} ${v('sans')}` }}>
                <span style={{ font: `400 ${v('t-id')} ${v('mono')}`, color: v('ink-3') }}>{name}</span>
                <span>{takes}</span>
                <span style={{ color: v('ink-2') }}>{leaves}</span>
              </div>
            ))}
          </Card>
        </Section>

        <Section title="Left behind" note="From mockups older than the welcome and editing decisions.">
          <Card style={{ font: `400 ${v('t-small')} ${v('sans')}`, color: v('ink-2'), lineHeight: 1.6 }}>
            The page hatch and dotted borders (retired, W §2). Gold for selected and active states: gold-light, gold-muted and
            the gold tints (C50). Marginalia at 46% and the paler greys (the legibility table).
          </Card>
        </Section>
      </div>
    </div>
  )
}
