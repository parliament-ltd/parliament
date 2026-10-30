// The verbs: one entry per verb, in one array (refactor-plan.md §4; docket
// spec §6: "the examples and glosses live in one array"). The Enter line,
// completion, `?` and the reference are generated from it (registry.js).
//
// Each entry:
//   verb         the word before the colon, lower case
//   group        its group in the reference (GROUPS)
//   example      one command as someone would type it
//   forms        more examples for the reference, when one is not enough
//   takes        the forms it accepts, each a list of slots (registry.js
//                says what a slot is); [] is the verb alone
//   rest         the verb keeps the rest of the line as text
//   minus        a filter that takes a leading minus: -tag:research
//   on           'everywhere', or the boards it works on
//   spends       it sends something to a provider or source, so its Enter
//                line names every recipient and the cost before Enter, and
//                it runs on a line of its own (C99)
//   destructive  it can remove for good what has been sent (delete: only;
//                C199), so it runs on a line of its own (C99)
//   undoable     undo: can take it back
//   click        what a click on it in the reference or in marginalia does:
//                'apply' runs it at once (it only changes the screen, or is
//                small and reversible); 'fill' writes it into the field and
//                waits for Enter (it moves, removes, spends or cannot be
//                undone). AB §5, Lab v7, collection board v3
//   retiredArgs  old arguments, answered with what to use now
//   stage        the stage of refactor-plan.md that builds it
//   gloss        one line for `?` and the reference, from the copy catalogue
//
// Commands stay English (LPN §5); glosses are translated, and follow the
// copy rules: sentence case, no em dashes, no provider named.
//
// Sources, newest first where they disagree: the rulings in conflicts.md
// (C39 to C48, C73, C80; 11, 12, 15 and 16 October), the plan's section 3
// (A1 to A23) and table 5a (P1 to P10), bar-and-commands-decisions.md (its
// inventory), the editing-in-place spec, settings spec §5 to §7, docket spec
// §5, arrangements spec §4 to §7, and for exact syntax the verb arrays of the
// Almanac v30, Docket v12, Lab v7 and welcome v9 mockups. Points they leave
// open are in conflicts.md, C95 to C100.

// Boards a command can name (boards.js has them all). Rooms are boards too,
// opened by number or name. The Lab is an arrangement, not a board (AB §4),
// so only open: takes its name.
// The words for boards (C131): Records is the Almanac's board, Plan the
// docket's (boards.js maps them to the boards' ids).
export const BOARD_NAMES = Object.freeze(['records', 'collection', 'library', 'plan', 'reflection', 'settings', 'commandmenu', 'canvas', 'blocks'])
// The boards, and room: the room the bar points at, or the one last used
// (arrangement.js, currentRoom). For the verbs that act on a board on
// screen (30 October); open: and new: make rooms their own way.
const ON_SCREEN = Object.freeze([...BOARD_NAMES, 'room'])
const TABLES = ['almanac', 'collection']
const EDITING = ['room', 'docket', 'reflection', 'collection']
const BUILDING = ['lab', 'room']
// The kinds as people name them (C131: a term is a keyword, a docket a plan).
const KINDS = ['chat', 'note', 'highlight', 'keyword', 'quote', 'plan', 'edit', 'ask', 'suggestion']
const FRAMEWORKS = ['challenge', 'reasoning', 'pushback', 'alts', 'uncertain']

export const GROUPS = Object.freeze([
  { key: 'go', title: /*i18n*/ { id: 'group.go', message: 'Go to' } },
  { key: 'start', title: /*i18n*/ { id: 'group.start', message: 'Start' } },
  { key: 'run', title: /*i18n*/ { id: 'group.run', message: 'Run' } },
  { key: 'filters', title: /*i18n*/ { id: 'group.filters', message: 'Filters', comment: 'Several filters can share one line' } },
  { key: 'collection', title: /*i18n*/ { id: 'group.collection', message: 'Collection' } },
  { key: 'tags', title: /*i18n*/ { id: 'group.tags', message: 'Tags' } },
  { key: 'items', title: /*i18n*/ { id: 'group.items', message: 'Items' } },
  { key: 'editing', title: /*i18n*/ { id: 'group.editing', message: 'Editing' } },
  { key: 'layout', title: /*i18n*/ { id: 'group.layout', message: 'Layout' } },
  { key: 'building', title: /*i18n*/ { id: 'group.building', message: 'Building rooms' } },
  { key: 'settings', title: /*i18n*/ { id: 'group.settings', message: 'Settings and data' } },
])

// The leaders and help lead the reference (bar reference, "The field").
export const LEADERS = Object.freeze({
  title: /*i18n*/ { id: 'group.leaders', message: 'The bar' },
  rows: [
    { example: '>', gloss: /*i18n*/ { id: 'leader.command', message: 'Type a command. The > stays in the field' } },
    { example: 'p>', forms: ['p>', 'prompt>'], gloss: /*i18n*/ { id: 'leader.prompt', message: 'Write a prompt. Nothing is sent before Enter' } },
    { example: 's>', forms: ['s>', 'search>'], gloss: /*i18n*/ { id: 'leader.search', message: 'Search' } },
    { example: '?', forms: ['?', 'help', '?open'], gloss: /*i18n*/ { id: 'leader.help', message: 'Every command, or how one works' } },
  ],
})

const v = (entry) => Object.freeze({ forms: null, rest: false, minus: false, on: 'everywhere', spends: false, destructive: false, undoable: false, click: 'fill', retiredArgs: null, ...entry })

export const VERBS = Object.freeze([
  // Go to
  v({ verb: 'records', group: 'go', example: 'records:', takes: [[]], stage: 5, click: 'apply',
    gloss: /*i18n*/ { id: 'verb.records', message: 'Bring Records and the Collection beside what is on screen' } }),
  v({ verb: 'plan', group: 'go', example: 'plan:', takes: [[]], stage: 5, click: 'apply',
    gloss: /*i18n*/ { id: 'verb.plan', message: 'Bring the Plan board beside what is on screen' } }),
  v({ verb: 'library', group: 'go', example: 'library:', forms: ['library:', 'library:themes'], takes: [[], ['word']], stage: 5, click: 'apply',
    gloss: /*i18n*/ { id: 'verb.library', message: 'Bring the Library beside what is on screen, or one shelf of it' } }),
  // settings: is open:settings, and settings:data open:settings data
  // (arrangements spec §5; C95 left it for its stage; C181; C279).
  v({ verb: 'settings', group: 'go', example: 'settings:', forms: ['settings:', 'settings:data'], takes: [[], ['word']], stage: 9, click: 'apply',
    gloss: /*i18n*/ { id: 'verb.settings', message: 'Bring Settings beside what is on screen, or one section of it' } }),
  v({ verb: 'lab', group: 'go', example: 'lab:', takes: [[]], stage: 13, click: 'apply',
    gloss: /*i18n*/ { id: 'verb.lab', message: 'Go to the Lab, where rooms are built' } }),
  v({ verb: 'room', group: 'go', example: 'room:', takes: [[], ['text']], stage: 4, click: 'apply',
    gloss: /*i18n*/ { id: 'verb.room', message: 'Bring the last room beside what is on screen, or a room by name' } }),
  v({ verb: 'jump', group: 'go', example: 'jump:242', takes: [['address']], stage: 6, click: 'apply',
    gloss: /*i18n*/ { id: 'verb.jump', message: 'Scroll to a number on this board' } }),
  v({ verb: 'tour', group: 'go', example: 'tour:', forms: ['tour:', 'tour:off', 'tour:advanced'], takes: [[], [['off', 'advanced']]], stage: 5, click: 'apply',
    gloss: /*i18n*/ { id: 'verb.tour', message: 'Show the welcome steps, put them away, or show the second list' } }),
  // letter: (C279 (c); welcome spec §14): the newest letter, one by its
  // number, or the list. Nothing announces it; it is found here, in ?.
  v({ verb: 'letter', group: 'go', example: 'letter:', forms: ['letter:', 'letter:1', 'letter:all'], takes: [[], [['all']], ['number']], stage: 15, click: 'apply',
    gloss: /*i18n*/ { id: 'verb.letter', message: 'Read the newest letter from the maker of Parliament, one by its number, or the list of them' } }),
  v({ verb: 'resources', group: 'go', example: 'resources:', takes: [[]], stage: 5, click: 'apply',
    gloss: /*i18n*/ { id: 'verb.resources', message: 'Open the guides and references, with every command in full' } }),

  // Start
  v({ verb: 'new', group: 'start', example: 'new:chat',
    forms: ['new:chat', 'new:plan', 'new:plan "Grant application"', 'new:room', 'new:room guided', 'new:collection', 'new:framework "Editor" "Make each sentence shorter"', 'new:branch 207', 'new:branch 201a 2', 'new:branch "Shorter"', 'new:step', 'new:step 201b "Who built it?"', 'new:run', 'new:block'],
    // new:framework "Name" "What it asks": a framework of your own (C164).
    // new:branch 201a 2: a fork after step 2 of 201a (C178).
    // new:step 201b "…", new:plan "…" and new:branch "…" (C198): an address
    // is read before text, which an address would also fill.
    takes: [[['chat', 'plan', 'room', 'collection', 'framework', 'branch', 'step', 'run', 'block']], [['room'], ['guided']], [['branch'], 'address'], [['branch'], 'address', 'number'], [['branch'], 'text'], [['framework'], 'text', 'text'],
      [['step'], 'address'], [['step'], 'text'], [['step'], 'address', 'text'], [['plan'], 'text']],
    stage: 6, undoable: true,
    gloss: /*i18n*/ { id: 'verb.new', message: 'Make a chat, plan, room, collection, framework, branch, step, run or block' } }),
  v({ verb: 'open', group: 'start', example: 'open:207',
    forms: ['open:207', 'open:201a', 'open:201a summary', 'open:run 1', 'open:"Writing Studio"', 'open:library', 'open:records', 'open:settings keys'],
    // open:records brings the Records board alone, where records: brings
    // Records and the Collection together (C124, C125, C131).
    takes: [[[...BOARD_NAMES, 'lab'], { opt: 'word' }], [['run'], 'number'], ['address', { opt: ['summary'] }], ['text'], ['text', ['search', 'collection']]], stage: 3, click: 'apply',
    gloss: /*i18n*/ { id: 'verb.open', message: 'Open a board, or anything by its number or name' } }),
  // close:204 closes the room showing chat 204; close:welcome the welcome card (C146 (c)).
  v({ verb: 'close', group: 'start', example: 'close:records', forms: ['close:records', 'close:204', 'close:room', 'close:welcome'], takes: [[], [[...ON_SCREEN, 'welcome', 'tour', 'letter']], ['address']], stage: 3, undoable: true, click: 'apply',
    gloss: /*i18n*/ { id: 'verb.close', message: 'Take a board off the screen, or close the letter. Nothing is lost' } }),

  // Run
  v({ verb: 'run', group: 'run', example: 'run:201b', takes: [[], ['address']], on: ['docket', 'almanac'], stage: 10, spends: true,
    gloss: /*i18n*/ { id: 'verb.run', message: 'Run one branch. The Enter line says which run and what it costs' } }),
  v({ verb: 'stop', group: 'run', example: 'stop:201b', forms: ['stop:', 'stop:201b', 'stop:all'], takes: [[], ['address'], [['all']]], stage: 10, click: 'apply',
    gloss: /*i18n*/ { id: 'verb.stop', message: 'Halt a run, or every run in every window' } }),
  v({ verb: 'diff', group: 'run', example: 'diff:', forms: ['diff:', 'diff:1', 'diff:off'], takes: [[], [['off']], ['number']], on: ['docket'], stage: 10, click: 'apply',
    gloss: /*i18n*/ { id: 'verb.diff', message: 'Set two runs of a plan side by side, and mark what differs' } }),
  v({ verb: 'again', group: 'run', example: 'again:201a', takes: [[], ['address']], stage: 8, spends: true,
    gloss: /*i18n*/ { id: 'verb.again', message: 'Ask again from the edited prompt, as a new branch' } }),

  // Filters: they narrow the table, and several can share a line.
  v({ verb: 'type', group: 'filters', example: 'type:chat', forms: ['type:chat', 'type:note,chat', 'type:edit'], takes: [[{ list: KINDS }]], minus: true, on: TABLES, stage: 6, click: 'apply',
    gloss: /*i18n*/ { id: 'verb.type', message: 'Show some kinds of thing' } }),
  v({ verb: 'tag', group: 'filters', example: 'tag:research', forms: ['tag:research', '-tag:research', 'tag:essay,research'], takes: [[{ list: 'text' }]], minus: true, on: TABLES, stage: 6, click: 'apply',
    gloss: /*i18n*/ { id: 'verb.tag', message: 'Show what carries a tag. A minus leaves it out' } }),
  v({ verb: 'model', group: 'filters', example: 'model:opus', forms: ['model:opus', 'model:wikipedia'], takes: [[{ list: 'text' }]], minus: true, on: TABLES, stage: 6, click: 'apply',
    gloss: /*i18n*/ { id: 'verb.model', message: 'Show what a model or a source answered' } }),
  v({ verb: 'from', group: 'filters', example: 'from:201b', forms: ['from:203', 'from:201b', 'from:run 3'], takes: [['addresses'], [['run'], 'number']], minus: true, on: TABLES, stage: 6, click: 'apply',
    gloss: /*i18n*/ { id: 'verb.from', message: 'Show what came from a chat, a plan, a branch or a run' } }),
  // in: takes a collection or a room by name: the room filter folded into
  // it when room: became the room's own verb (C131). Where a room and a
  // collection share the name, a word after it says which (C132 (f)).
  v({ verb: 'in', group: 'filters', example: 'in:"Q2 evidence"', forms: ['in:"Q2 evidence"', 'in:"Code Lab"', 'in:"Code Lab" room'],
    takes: [[{ list: 'text' }, { opt: ['room', 'collection'] }]], minus: true, on: TABLES, stage: 6, click: 'apply',
    gloss: /*i18n*/ { id: 'verb.in', message: 'Show what is in a collection, or was made in a room' } }),
  v({ verb: 'has', group: 'filters', example: 'has:keyword', forms: ['has:note', 'has:keyword', 'has:quote', 'has:highlight'],
    takes: [[{ list: ['note', 'keyword', 'quote', 'highlight'] }]], minus: true, on: TABLES, stage: 6, click: 'apply',
    gloss: /*i18n*/ { id: 'verb.has', message: 'Show what holds notes, keywords, quotes or highlights' } }),
  v({ verb: 'cost', group: 'filters', example: 'cost:>0.50', takes: [['text']], on: TABLES, stage: 6, click: 'apply',
    gloss: /*i18n*/ { id: 'verb.cost', message: 'Show plans by what they cost' } }),
  v({ verb: 'since', group: 'filters', example: 'since:7d', forms: ['since:7d', 'since:3w', 'since:september', 'since:09/01/26'], takes: [['text']], on: TABLES, stage: 6, click: 'apply',
    gloss: /*i18n*/ { id: 'verb.since', message: 'Show what was made since a date' } }),
  v({ verb: 'until', group: 'filters', example: 'until:09/10/26', takes: [['text']], on: TABLES, stage: 6, click: 'apply',
    gloss: /*i18n*/ { id: 'verb.until', message: 'Show what was made until a date' } }),
  // On the Collection, sort: also takes yours and source (C144 (e)).
  v({ verb: 'sort', group: 'filters', example: 'sort:active', forms: ['sort:active', 'sort:oldest', 'sort:yours'], takes: [[['created', 'active', 'oldest', 'newest', 'yours', 'source']]], on: TABLES, stage: 6, click: 'apply',
    gloss: /*i18n*/ { id: 'verb.sort', message: 'Order the table' } }),
  v({ verb: 'save', group: 'filters', example: 'save:"Water tower"', takes: [['text']], on: ['almanac'], stage: 6, undoable: true,
    gloss: /*i18n*/ { id: 'verb.save', message: 'Keep this search under a name' } }),

  // Collection
  v({ verb: 'add', group: 'collection', example: 'add:207, 216', forms: ['add:207, 216', 'add:highlights, notes'],
    takes: [['addresses'], [{ list: 'text' }]], on: [...TABLES, 'lab'], stage: 6, undoable: true,
    retiredArgs: { key: 'api:' },
    gloss: /*i18n*/ { id: 'verb.add', message: 'Put things into the collection, or blocks into a room' } }),
  v({ verb: 'rm', group: 'collection', example: 'rm:207', forms: ['rm:207', 'rm:notes'], takes: [['addresses'], [{ list: 'text' }]], on: [...TABLES, 'lab'], stage: 6, undoable: true,
    gloss: /*i18n*/ { id: 'verb.rm', message: 'Take things out of the collection, or blocks out of a room' } }),
  // clear:tag removes one kind of filter, as a click on it at the top of
  // Records does (C132 (c)).
  v({ verb: 'clear', group: 'collection', example: 'clear:', forms: ['clear:', 'clear:filters', 'clear:tag', 'clear:search'],
    takes: [[], [['filters', 'search', 'sort', 'type', 'tag', 'in', 'has', 'from', 'model', 'cost', 'since', 'until']]], on: TABLES, stage: 6, undoable: true,
    gloss: /*i18n*/ { id: 'verb.clear', message: 'Empty the collection, remove every filter, or one kind of filter' } }),
  v({ verb: 'compare', group: 'collection', example: 'compare:201a 201b', forms: ['compare:201a 201b', 'compare:201, 207'],
    takes: [[], [{ many: 'addresses' }]], on: [...TABLES, 'library', 'room'], stage: 6, click: 'apply',
    gloss: /*i18n*/ { id: 'verb.compare', message: 'Set two or more side by side. Nothing is sent' } }),
  v({ verb: 'name', group: 'collection', example: 'name:"Q2 evidence"', forms: ['name:"Q2 evidence"', 'name:207 "New title"', 'name:"Review desk" "Two screens"'],
    takes: [['text'], ['address', 'text'], ['text', 'text']], stage: 4, undoable: true,
    gloss: /*i18n*/ { id: 'verb.name', message: 'Name what the bar is pointed at: a room, a collection or a chat. With two names, rename a saved arrangement' } }),
  v({ verb: 'duplicate', group: 'building', example: 'duplicate:"Writing studio"', forms: ['duplicate:"Writing studio"', 'duplicate:"Writing studio" template', 'duplicate:'], takes: [[], ['text', { opt: ['template'] }]], stage: 13, undoable: true,
    gloss: /*i18n*/ { id: 'verb.duplicate', message: 'Copy a room, yours or a template, and open the copy in the Lab' } }),
  v({ verb: 'heading', group: 'collection', example: 'heading:"Sources"', forms: ['heading:"Sources"', 'heading:"Sources" before 215'], takes: [['text'], ['text', ['before', 'after'], 'address']], on: ['collection'], stage: 6, undoable: true,
    gloss: /*i18n*/ { id: 'verb.heading', message: 'Add a heading to a collection in your own order' } }),
  v({ verb: 'summarize', group: 'collection', example: 'summarize:207, 216', takes: [[], ['addresses']], on: TABLES, stage: 6, spends: true, undoable: true,
    gloss: /*i18n*/ { id: 'verb.summarize', message: 'Write a dated summary of some cards as a note. One model call' } }),
  v({ verb: 'rewrite', group: 'collection', example: 'rewrite:234', takes: [['address']], on: ['collection'], stage: 6, spends: true, undoable: true,
    gloss: /*i18n*/ { id: 'verb.rewrite', message: 'Write a new dated summary beside the old one' } }),
  v({ verb: 'forget', group: 'collection', example: 'forget:"Surprised me"', forms: ['forget:"Surprised me"', 'forget:"Q2" collection', 'forget:"Editor" framework', 'forget:"Review desk" arrangement'], takes: [['text'], ['text', ['search', 'collection', 'framework', 'arrangement']]], stage: 6, undoable: true,
    gloss: /*i18n*/ { id: 'verb.forget', message: 'Remove a saved search, collection, framework of yours or arrangement' } }),

  // Tags
  v({ verb: 'tagadd', group: 'tags', example: 'tagadd:essay 207, 216', takes: [['text', { opt: 'addresses' }]], on: TABLES, stage: 6, undoable: true,
    gloss: /*i18n*/ { id: 'verb.tagadd', message: 'Tag things, or what is selected' } }),
  v({ verb: 'retag', group: 'tags', example: 'retag:essay to "Long form"', takes: [['text', ['to'], 'text']], on: TABLES, stage: 6, undoable: true,
    gloss: /*i18n*/ { id: 'verb.retag', message: 'Rename a tag everywhere' } }),
  v({ verb: 'untag', group: 'tags', example: 'untag:essay 207', takes: [['text', { opt: 'addresses' }]], on: TABLES, stage: 6, undoable: true,
    gloss: /*i18n*/ { id: 'verb.untag', message: 'Remove a tag from some things, or from everything' } }),

  // Items: one thing at a time.
  v({ verb: 'inspect', group: 'items', example: 'inspect:207', forms: ['inspect:207', 'inspect:highlights'], takes: [['address'], ['text']], stage: 5, click: 'apply',
    gloss: /*i18n*/ { id: 'verb.inspect', message: 'Look at one thing in detail, where you are' } }),
  v({ verb: 'pin', group: 'items', example: 'pin:207', forms: ['pin:207', 'pin:201b', 'pin:"Rail candidates"'], takes: [['addresses'], ['text']], stage: 6, undoable: true, click: 'apply',
    gloss: /*i18n*/ { id: 'verb.pin', message: 'Keep something at the top of its list' } }),
  v({ verb: 'archive', group: 'items', example: 'archive:209', forms: ['archive:209', 'archive:off 209'], takes: [['addresses'], [['off'], 'addresses']], stage: 6, undoable: true, click: 'apply',
    gloss: /*i18n*/ { id: 'verb.archive', message: 'Put something away without deleting it' } }),
  v({ verb: 'copy', group: 'items', example: 'copy:207', takes: [['address']], stage: 6, click: 'apply',
    gloss: /*i18n*/ { id: 'verb.copy', message: 'Copy something as Markdown' } }),
  v({ verb: 'export', group: 'items', example: 'export:md 201', forms: ['export:md 201', 'export:jsonl 207, 216', 'export:md records'],
    takes: [[], [['md', 'jsonl'], { opt: 'addresses' }], [['md', 'jsonl'], ['records']]], on: TABLES, stage: 6,
    gloss: /*i18n*/ { id: 'verb.export', message: 'Download as Markdown or JSONL to read elsewhere. It cannot be restored' } }),
  v({ verb: 'note', group: 'items', example: 'note:203 "Try it without the ending"', forms: ['note:203 "Try it without the ending"', 'note:"Check the dates"'],
    rest: true, takes: [['text']], stage: 6, undoable: true,
    gloss: /*i18n*/ { id: 'verb.note', message: 'Write a note for people. It is never sent' } }),
  // delete: (C199): the one word for removing. What has been sent goes for
  // good after a second Enter (C137); what has not (a planned step, a branch
  // that never ran, a plan with no chat) goes on one Enter, and undo: brings
  // it back. Alone, it points to Delete everything in Settings.
  v({ verb: 'delete', group: 'items', example: 'delete:207', forms: ['delete:207', 'delete:207, 216', 'delete:201c', 'delete:201c all', 'delete:201a 2'],
    takes: [[], [['everything']], ['addresses', { opt: ['all'] }], ['address', 'number']], stage: 6, destructive: true,
    gloss: /*i18n*/ { id: 'verb.delete', message: 'Delete something by its number. What has been sent goes for good, after a second Enter' } }),
  v({ verb: 'undo', group: 'items', example: 'undo:', forms: ['undo:', 'undo:242'], takes: [[], ['address']], stage: 6, click: 'apply',
    gloss: /*i18n*/ { id: 'verb.undo', message: 'Take back the last command, or one edit. It stops at a run' } }),

  // Editing in place
  v({ verb: 'tell', group: 'editing', example: 'tell:"Keep it under a page"', rest: true, takes: [['text']], on: ['room'], stage: 11, undoable: true,
    gloss: /*i18n*/ { id: 'verb.tell', message: 'Write a note the model reads with your next prompt' } }),
  // ask: (C218 (a), option 2): Ctrl+Shift+K in a reply does the same.
  v({ verb: 'ask', group: 'editing', example: 'ask:"Add the year it opened"', forms: ['ask:', 'ask:"Add the year it opened"'], rest: true, takes: [[], ['text']], on: EDITING, stage: 11,
    gloss: /*i18n*/ { id: 'verb.ask', message: 'Ask about the selected words in a reply, in your own words. It goes with your next prompt' } }),
  // strikethrough: (C225 (c)): Ctrl+Shift+X in a reply does the same. The
  // strike is made in the reply, not by the bar, so undo: alone does not
  // take it back; undo: with its number does, and Ctrl+Z in the reply.
  v({ verb: 'strikethrough', group: 'editing', example: 'strikethrough:', takes: [[]], on: EDITING, stage: 11,
    gloss: /*i18n*/ { id: 'verb.strikethrough', message: 'Strike the selected words in a reply. Its number with undo: takes it back' } }),
  // Where the next prompt goes among a prompt's branches (stage 8; C174);
  // several with commas: to:201a, 201c.
  v({ verb: 'to', group: 'editing', example: 'to:201a', forms: ['to:201a', 'to:201a, 201c', 'to:all'], takes: [['addresses'], [['all']]], stage: 8, undoable: true, click: 'apply',
    gloss: /*i18n*/ { id: 'verb.to', message: 'Send the next prompt to one branch, or to all' } }),
  v({ verb: 'accept', group: 'editing', example: 'accept:244', forms: ['accept:244', 'accept:all'], takes: [['addresses'], [['all']]], on: EDITING, stage: 11, undoable: true, click: 'apply',
    gloss: /*i18n*/ { id: 'verb.accept', message: 'Accept a suggestion' } }),
  v({ verb: 'reject', group: 'editing', example: 'reject:244', forms: ['reject:244', 'reject:all'], takes: [['addresses'], [['all']]], on: EDITING, stage: 11, undoable: true, click: 'apply',
    gloss: /*i18n*/ { id: 'verb.reject', message: 'Turn down a suggestion' } }),
  v({ verb: 'hold', group: 'editing', example: 'hold:242', forms: ['hold:242', 'hold:201c', 'hold:off 242'], takes: [['addresses'], [['off'], { opt: 'addresses' }]], on: EDITING, stage: 10, undoable: true, click: 'apply',
    gloss: /*i18n*/ { id: 'verb.hold', message: 'Keep a branch or an edit from going until you say' } }),
  v({ verb: 'markup', group: 'editing', example: 'markup:off', forms: ['markup:on', 'markup:off'], takes: [[['on', 'off'], { opt: ['col'] }]], on: EDITING, stage: 11, undoable: true, click: 'apply',
    gloss: /*i18n*/ { id: 'verb.markup', message: 'Show replies marked up, or clean' } }),
  // Who answers in the chat the room shows (C149): a model or a source.
  // Works from any board, as a prompt does. Several at once is branches.
  // A name of several words needs no quotes: by:mistral small.
  v({ verb: 'by', group: 'editing', example: 'by:haiku', forms: ['by:', 'by:haiku', 'by:mistral small', 'by:wikipedia'], takes: [[], [{ many: { list: 'text' } }]], stage: 7, undoable: true, click: 'apply',
    gloss: /*i18n*/ { id: 'verb.by', message: 'Choose who answers in this chat: a model, or a source with no tokens' } }),
  // Whether models that can think do so before answering (C165).
  v({ verb: 'thinking', group: 'editing', example: 'thinking:off', forms: ['thinking:', 'thinking:on', 'thinking:off'], takes: [[], [['on', 'off']]], stage: 7, undoable: true, click: 'apply',
    gloss: /*i18n*/ { id: 'verb.thinking', message: 'Let models that can think do so before answering, shown as they go, or not' } }),
  v({ verb: 'framework', group: 'editing', example: 'framework:pushback', forms: ['framework:pushback', 'framework:pushback, uncertain', 'framework:off'],
    // Alone, it shows them; names of several words need no quotes (C164).
    takes: [[], [{ list: [...FRAMEWORKS, 'off'] }], [{ many: { list: 'text' } }]], stage: 7, undoable: true, click: 'apply',
    gloss: /*i18n*/ { id: 'verb.framework', message: 'Choose the frameworks that shape every reply: standing instructions sent with each prompt' } }),
  // The model that reads text from sources (the editing spec's helper:):
  // today it translates (C166 (d)). Works from any board, as by: does.
  v({ verb: 'helper', group: 'editing', example: 'helper:haiku', forms: ['helper:', 'helper:haiku', 'helper:off'], takes: [[], [{ many: 'text' }]], stage: 7, undoable: true, click: 'apply',
    gloss: /*i18n*/ { id: 'verb.helper', message: 'Choose the model that reads text from sources, and translates it' } }),
  // The language replies come in (stage 7, piece 6; C166): a code or a
  // name, in English or in the language itself. off asks for none.
  v({ verb: 'reply', group: 'editing', example: 'reply:swedish', forms: ['reply:', 'reply:sv', 'reply:swedish', 'reply:svenska', 'reply:off'], takes: [[], [{ many: 'text' }]], stage: 7, undoable: true, click: 'apply',
    gloss: /*i18n*/ { id: 'verb.reply', message: 'Choose the language replies come in, by its code or its name' } }),
  // The privacy filter for fixed formats (security notes §4.1; C167):
  // email addresses, phone numbers, bank and card numbers swapped for
  // placeholders before a prompt goes to a model off this computer.
  // names: people's names too, found by a model on this computer (S3; C169).
  v({ verb: 'privacy', group: 'editing', example: 'privacy:on', forms: ['privacy:', 'privacy:on', 'privacy:names', 'privacy:off'], takes: [[], [['on', 'off', 'names']]], stage: 7, undoable: true, click: 'apply',
    gloss: /*i18n*/ { id: 'verb.privacy', message: 'Swap email addresses, phone numbers, and bank and card numbers for placeholders before a prompt goes, names too, or not' } }),
  // The injection check (security notes §1.4, §1.5; S3; C169): words in the
  // last answer from a source that read like instructions to a model; a
  // closer look by a model on this computer, when one is connected.
  v({ verb: 'check', group: 'editing', example: 'check:', takes: [[]], stage: 7, click: 'fill',
    gloss: /*i18n*/ { id: 'verb.check', message: 'Check the last answer from a source for words that try to instruct a model' } }),
  // An answer from a source brought into the next prompt, on purpose (stage
  // 8; C115, C176): alone, the room's last; by address, a branch's on screen.
  // Features of input, held for the next prompt only (stage 13, piece 6; C248).
  v({ verb: 'web', group: 'editing', example: 'web:', forms: ['web:', 'web:off'], takes: [[], [['on', 'off']]], stage: 13, click: 'fill',
    gloss: /*i18n*/ { id: 'verb.web', message: 'Let the model search the web for your next prompt only' } }),
  v({ verb: 'attach', group: 'editing', example: 'attach:', takes: [[]], stage: 13,
    gloss: /*i18n*/ { id: 'verb.attach', message: 'Attach files to your next prompt' } }),
  v({ verb: 'include', group: 'editing', example: 'include:201b', forms: ['include:', 'include:201b', 'include:201b, 201c', 'include:off'], takes: [[], ['addresses'], [['off']]], stage: 8, click: 'fill',
    gloss: /*i18n*/ { id: 'verb.include', message: 'Bring an answer from a source into your next prompt, sent as material marked as data' } }),
  // Translating (C84, C85, C166): alone, the last answer from a source,
  // into your language; on and off, whether a question to a source that
  // reads only English is translated before it goes.
  v({ verb: 'translate', group: 'editing', example: 'translate:', forms: ['translate:', 'translate:on', 'translate:off'], takes: [[], [['on', 'off']]], stage: 7, spends: true, click: 'fill',
    gloss: /*i18n*/ { id: 'verb.translate', message: 'Translate the last answer from a source into your language. On or off: translate what you ask sources that read only English' } }),
  v({ verb: 'ripple', group: 'editing', example: 'ripple:on', forms: ['ripple:on', 'ripple:off'], takes: [[['on', 'off']]], on: ['room'], stage: 12, spends: true, undoable: true,
    gloss: /*i18n*/ { id: 'verb.ripple', message: 'Carry edits across branches as suggestions. Each check is a model call' } }),
  v({ verb: 'sweep', group: 'editing', example: 'sweep:201a editor', takes: [[], ['address', { opt: 'word' }]], on: ['room', 'reflection'], stage: 12, spends: true,
    gloss: /*i18n*/ { id: 'verb.sweep', message: "Check a reply or branch against a framework's rule, one suggestion per sentence" } }),
  v({ verb: 'reflect', group: 'editing', example: 'reflect:', takes: [[]], on: ['reflection'], stage: 12, spends: true,
    gloss: /*i18n*/ { id: 'verb.reflect', message: 'Ask for a synthesis of a chat and its markings, with questions' } }),

  // Layout
  v({ verb: 'bar', group: 'layout', example: 'bar:bottom', forms: ['bar:top', 'bar:bottom', 'bar:left', 'bar:center', 'bar:right'],
    takes: [[['top', 'bottom', 'left', 'center', 'right']]], stage: 3, undoable: true, click: 'apply',
    retiredArgs: { hide: 'focus: · calm:', show: 'focus:off · calm:off', foot: 'bar:bottom', pop: 'pop:command' },
    gloss: /*i18n*/ { id: 'verb.bar', message: 'Move the bar on the page' } }),
  v({ verb: 'pop', group: 'layout', example: 'pop:records',
    forms: ['pop:records', 'pop:201b', 'pop:settings keys', 'pop:library display 2', 'pop:command', 'pop:back', 'pop:back library', 'pop:left'],
    takes: [[ON_SCREEN, ['display'], 'number'], [ON_SCREEN, { opt: 'word' }], ['address'], [['command']], [['back'], { opt: [...ON_SCREEN, 'command'] }], [['left', 'right']]],
    stage: 3, undoable: true, click: 'apply',
    gloss: /*i18n*/ { id: 'verb.pop', message: 'Put a board or the bar in its own window, place it, or bring it back' } }),
  v({ verb: 'move', group: 'layout', example: 'move:library left', forms: ['move:library left', 'move:201c after 201a'],
    takes: [[ON_SCREEN, ['left', 'right', 'middle']], ['address', ['after', 'before'], 'address']], stage: 3, undoable: true, click: 'apply',
    gloss: /*i18n*/ { id: 'verb.move', message: 'Move a board to the left, right or middle, or a branch in its plan' } }),
  v({ verb: 'swap', group: 'layout', example: 'swap:records collection', takes: [[ON_SCREEN, ON_SCREEN]], stage: 3, undoable: true, click: 'apply',
    gloss: /*i18n*/ { id: 'verb.swap', message: 'Swap two boards' } }),
  v({ verb: 'reset', group: 'layout', example: 'reset:', takes: [[]], stage: 3, undoable: true,
    gloss: /*i18n*/ { id: 'verb.reset', message: 'Put the boards back as shipped and close the windows' } }),
  v({ verb: 'width', group: 'layout', example: 'width:60%', forms: ['width:60%', 'width:library 30%', 'width:204 40%', 'width:even'],
    takes: [['percent'], [ON_SCREEN, 'percent'], ['address', 'percent'], [['even']]], stage: 5, undoable: true, click: 'apply',
    gloss: /*i18n*/ { id: 'verb.width', message: 'Choose how much of the width a board takes, or put every width back' } }),
  v({ verb: 'cols', group: 'layout', example: 'cols:-room +created', forms: ['cols:-room +created', 'cols:'], takes: [[], [{ many: 'word' }]], on: ['almanac'], stage: 6, undoable: true, click: 'apply',
    gloss: /*i18n*/ { id: 'verb.cols', message: 'Hide or show columns of the table' } }),
  v({ verb: 'focus', group: 'layout', example: 'focus:', forms: ['focus:', 'focus:sym col', 'focus:save', 'focus:off'], takes: [[], [['save', 'off']], [{ many: 'word' }]], stage: 5, undoable: true, click: 'apply',
    gloss: /*i18n*/ { id: 'verb.focus', message: 'Clear the screen to your chosen boards, keep that set, or come back' } }),
  v({ verb: 'calm', group: 'layout', example: 'calm:', forms: ['calm:', 'calm:off'], takes: [[], [['off']]], stage: 14, undoable: true, click: 'apply',
    gloss: /*i18n*/ { id: 'verb.calm', message: 'Show less detail until you come near it, or all of it again' } }),
  v({ verb: 'arrange', group: 'layout', example: 'arrange:"Review desk"', forms: ['arrange:', 'arrange:"Review desk"', 'arrange:save "Review desk"', 'arrange:"Review desk" 207'],
    takes: [[], [['save'], 'text'], ['text', { opt: 'address' }]], stage: 14, undoable: true,
    gloss: /*i18n*/ { id: 'verb.arrange', message: 'Switch to or save a whole arrangement, windows included' } }),

  // Building rooms (the Lab, v7)
  v({ verb: 'edit', group: 'building', example: 'edit:"Reading room"', takes: [[], ['text']], stage: 13,
    gloss: /*i18n*/ { id: 'verb.edit', message: 'Open a room in the Lab to change it' } }),
  v({ verb: 'done', group: 'building', example: 'done:', takes: [[]], on: BUILDING, stage: 13, click: 'apply',
    gloss: /*i18n*/ { id: 'verb.done', message: 'Leave the Lab with your changes' } }),
  v({ verb: 'place', group: 'building', example: 'place:notes right', forms: ['place:notes right', 'place:notes up'],
    takes: [[{ list: 'text' }, { opt: ['left', 'right', 'extra', 'middle', 'bottom', 'panel', 'margin', 'sheet', 'outline', 'canvas', 'document', 'inspector', 'up', 'down'] }], [{ many: 'word' }]], on: BUILDING, stage: 13, undoable: true,
    gloss: /*i18n*/ { id: 'verb.place', message: 'Put a block in a slot of the room, or move it' } }),
  v({ verb: 'layout', group: 'building', example: 'layout:"Three-panel"', takes: [['text']], on: BUILDING, stage: 13, undoable: true,
    gloss: /*i18n*/ { id: 'verb.layout', message: 'Choose the shape of a room' } }),
  v({ verb: 'theme', group: 'building', example: 'theme:"Deep Calm"', takes: [['text']], on: BUILDING, stage: 13, undoable: true,
    gloss: /*i18n*/ { id: 'verb.theme', message: "Choose a room's colours and type" } }),
  v({ verb: 'device', group: 'building', example: 'device:desktop', forms: ['device:desktop', 'device:mobile'], takes: [[['desktop', 'mobile']]], on: BUILDING, stage: 13, undoable: true, click: 'apply',
    gloss: /*i18n*/ { id: 'verb.device', message: 'Say what the room is built for' } }),
  v({ verb: 'local', group: 'building', example: 'local:on', forms: ['local:on', 'local:off'], takes: [[['on', 'off']]], on: BUILDING, stage: 13, undoable: true, click: 'apply',
    gloss: /*i18n*/ { id: 'verb.local', message: 'Say whether a room sends only to models on this computer' } }),
  v({ verb: 'set', group: 'building', example: 'set:notes order oldest', forms: ['set:notes order oldest', 'set:contents most 50', 'set:input web on', 'set:default haiku'],
    takes: [[], ['word', { many: 'text' }]], on: [...BUILDING, 'settings'], stage: 9, undoable: true, click: 'apply',
    gloss: /*i18n*/ { id: 'verb.set', message: 'Change a setting of a block or of Parliament. The Enter line states the change in full' } }),

  // Settings and data
  v({ verb: 'api', group: 'settings', example: 'api:', forms: ['api:', 'api:mistral', 'api:new'], takes: [[], [['new']], ['word']], stage: 5, click: 'apply',
    gloss: /*i18n*/ { id: 'verb.api', message: 'Add or replace a key, in its own field. Never type a key here' } }),
  v({ verb: 'backup', group: 'settings', example: 'backup:', takes: [[]], stage: 9,
    gloss: /*i18n*/ { id: 'verb.backup', message: 'Download a backup of everything but your keys' } }),
  v({ verb: 'restore', group: 'settings', example: 'restore:', takes: [[]], stage: 9,
    gloss: /*i18n*/ { id: 'verb.restore', message: 'Bring a backup back' } }),
  v({ verb: 'import', group: 'settings', example: 'import:', takes: [[]], stage: 9,
    gloss: /*i18n*/ { id: 'verb.import', message: 'Open a file made elsewhere. It says what the file is before anything happens' } }),
  v({ verb: 'language', group: 'settings', example: 'language:ja', forms: ['language:', 'language:ja', 'language:japanese', 'language:日本語', 'language:browser'], takes: [[], [{ many: 'text' }]], stage: 9, undoable: true, click: 'apply',
    gloss: /*i18n*/ { id: 'verb.language', message: 'Change the language, by its code or its name' } }),
])

// Verbs that are now another word. Typing one answers "That verb is now …",
// and Enter writes the new verb into the field with what followed it; it
// never runs anything. `message` overrides the sentence.
export const RENAMED = Object.freeze({
  rename: { to: 'name' }, // C40
  peek: { to: 'inspect' }, // C41
  read: { to: 'inspect' }, // C41
  hide: { to: 'close' }, // C42
  show: { to: 'open' }, // C42
  go: { to: 'jump' }, // bar decisions, 7 October
  dup: { to: 'duplicate' }, // bar decisions; no alias (C60)
  strike: { to: 'strikethrough' }, // bar decisions
  view: { to: 'markup' }, // bar decisions
  scheme: { to: 'theme' }, // arrangements spec §4
  alm: { to: 'records' }, // C131
  sym: { to: 'room' }, // C131
  collab: { to: 'framework' }, // C131
  section: { to: 'heading' }, // C80, A18
  co: { to: 'add' }, // P9
  docs: { to: 'resources' }, // P8
  refresh: { to: 'reset' }, // one word per act (C97)
  source: { to: 'from' }, // one word per act (C97)
  erase: { to: 'delete' }, // C199, replacing the ruling of 15 October
  drop: { to: 'delete' }, // C199, replacing the bar decisions' drop: (7 October)
})

// Verbs that are gone, with what to use instead, or null. What to use is a
// command, so it stays English.
export const RETIRED = Object.freeze({
  strain: null, // A5, C48
  invoke: null, // V2, out of scope
  analyze: null, // V2, out of scope
  c: 'new:chat · open:', // replaced 23 September
  d: 'new:docket · open:', // replaced 23 September
  p: 'p>', // rejected 23 September
  split: 'open:', // rejected: open: adds a card
})

// Words kept free for later uses (A1: key:, for sharing; A20: list:, for
// something like a bulleted list). They answer as unknown and are never
// steered to another verb.
export const KEPT_FREE = Object.freeze(['key', 'list'])
