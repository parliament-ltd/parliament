# Writing a block

A room is built from blocks: the conversation, notes, keywords, branches, a
chart, a table of contents. Each block is a small piece of code in
`src/catalog/entries/`, listed in the catalogue (`src/catalog/index.js`), and
placed in a room's layout in the Lab.

Blocks arrive by pull request and ship in the catalogue after review. No one
else's code runs inside Parliament any other way: there is no plug-in loading
and no block from another site.

## What a block is

Two files: the entry (`notes.jsx`) and what it draws (`notes-render.jsx`). The
entry is a plain object:

```js
export default {
  name: 'notes',                 // lowercase, kebab
  version: '1.0',
  displayName: 'Notes',
  author: 'your-handle',
  description: 'Saved notes for the active conversation.',
  icon: 'StickyNote',            // a lucide-react icon name
  surfaces: ['room'],
  tier: 'reader',                // see below
  slotTargets: [{ slot: 'left-rail', primary: true }, { slot: 'right-rail', fallbackOk: true }],
  configSchema: {                // the settings the Blocks board shows
    sortOrder: { type: 'enum', options: ['newest', 'oldest'], default: 'newest', label: 'Note sort order' },
  },
  render: NotesRender,           // receives { config, hostAPI, componentId }
  previewRender: () => /* a small static picture for the Library */ null,
}
```

`src/catalog/validate.js` checks every entry when the catalogue loads, and its
tests run with `npm run check`.

## What a block may and may not do

- **It reads and writes through the app's stores** (the conversation, notes,
  markings), never the database directly.
- **It never makes a request itself.** No `fetch`, no provider, no key: a
  lint rule stops it. A block that needs a model asks through the gateway
  (`src/net`), and anything that costs is named on the Enter line before
  Enter.
- **It changes things by writing a command into the bar,** with the
  `parliament-write` event, for the person to read and press Enter: the
  branches block writes `open:225`, not opens it. A block never runs a
  command on its own.
- **Text from outside is data.** A block shows a reply, a source's answer or a
  file's contents as text, through the shared Markdown component where it is
  markdown; never as HTML, never as something to run.
- **Every setting does something.** A setting in `configSchema` that nothing
  reads is not shipped (R41).
- **It talks to other blocks in its room** only through `hostAPI`, the room's
  event bus, with the events listed in `src/lib/hostAPI.js`.
- **Its words** go in the copy table, in sentence case and without em dashes.

## Tiers

`tier` says how far a block reaches. A block whose model calls answer
something the person just did is `composer` or below. A block that would call
a model on its own needs consent first, and none ship today; the validator
warns on `agent` so a review catches it.

## Proposing one

Open an issue describing the block and the room it is for, then a pull request
with the two files, the catalogue entry, a test, and a picture of it in a
room. Review looks at the rules above first.
