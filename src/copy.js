// The copy table: the words of the new chrome, in one place (refactor-plan.md,
// stage 3; C87). It is also the translation catalogue: `npm run i18n`
// collects every entry marked /*i18n*/ into src/locales/, where translators
// work, and compiles it for the app.
//
// Each entry keeps a fixed id, so rewording never breaks a translation or a
// link. Wording follows the copy rules: sentence case, no em dashes, no
// provider named in a sentence. Plurals use ICU, which works in every
// language ("one" and "other" in English, more in others).
//
// The plain-language pass on names before the welcome page (A6) happens here:
// changing a board's name is one line.
//
// Read an entry with i18n._(COPY.boards.almanac), or with useLingui() in a
// component. Commands stay English (LPN §5); only what they say is
// translated.

export const COPY = {
  // The bar's three modes (bar reference).
  modes: {
    search: /*i18n*/ { id: 'mode.search', message: 'Search', comment: "The bar's search mode" },
    command: /*i18n*/ { id: 'mode.command', message: 'Command', comment: "The bar's command mode" },
    prompt: /*i18n*/ { id: 'mode.prompt', message: 'Prompt', comment: "The bar's prompt mode" },
  },

  // The boards. Names to be looked at again before the welcome page (A6).
  boards: {
    almanac: /*i18n*/ { id: 'board.almanac', message: 'Almanac', comment: 'The table of everything you have made' },
    collection: /*i18n*/ { id: 'board.collection', message: 'Collection', comment: 'Cards of highlights, terms, quotes and notes' },
    library: /*i18n*/ { id: 'board.library', message: 'Library', comment: 'Rooms, layouts, blocks, themes and resources' },
    docket: /*i18n*/ { id: 'board.docket', message: 'Docket', comment: 'A plan of branches and steps' },
    reflection: /*i18n*/ { id: 'board.reflection', message: 'Reflection', comment: 'Reads a chat and its markings' },
    settings: /*i18n*/ { id: 'board.settings', message: 'Settings' },
    lab: /*i18n*/ { id: 'board.lab', message: 'Lab', comment: 'Where rooms are built' },
    room: /*i18n*/ { id: 'board.room', message: 'Rooms', comment: 'Every room, in a list of where a command works' },
    welcome: /*i18n*/ { id: 'board.welcome', message: 'Welcome page' },
  },

  // The kinds that take a number (C17, C56, A19).
  kinds: {
    chat: /*i18n*/ { id: 'kind.chat', message: 'Chat' },
    note: /*i18n*/ { id: 'kind.note', message: 'Note' },
    highlight: /*i18n*/ { id: 'kind.highlight', message: 'Highlight', comment: 'One passage marked where it sits' },
    term: /*i18n*/ { id: 'kind.term', message: 'Term', comment: 'A word or phrase lit wherever it appears' },
    quote: /*i18n*/ { id: 'kind.quote', message: 'Quote', comment: 'A passage kept beside the chat, never sent' },
    docket: /*i18n*/ { id: 'kind.docket', message: 'Docket' },
    edit: /*i18n*/ { id: 'kind.edit', message: 'Edit' },
    ask: /*i18n*/ { id: 'kind.ask', message: 'Ask' },
    suggestion: /*i18n*/ { id: 'kind.suggestion', message: 'Suggestion' },
  },

  // Counts, with plurals that work in every language.
  counts: {
    chats: /*i18n*/ { id: 'count.chats', message: '{count, plural, one {# chat} other {# chats}}' },
    dockets: /*i18n*/ { id: 'count.dockets', message: '{count, plural, one {# docket} other {# dockets}}' },
    steps: /*i18n*/ { id: 'count.steps', message: '{count, plural, one {# step} other {# steps}}' },
  },

  // The Enter line: one row under the field saying what Enter will do before
  // you press it (bar reference, "The field"). {verb}, {now} and {near} are
  // commands with their colon, which stay English; {boards} and {words} are
  // lists the bar joins in the reader's language.
  enter: {
    empty: /*i18n*/ { id: 'enter.empty', message: 'Type a command, or ? for every command' },
    help: /*i18n*/ { id: 'enter.help', message: 'Enter shows every command that works here' },
    helpVerb: /*i18n*/ { id: 'enter.helpVerb', message: 'Enter shows how {verb} works' },
    unknownHelp: /*i18n*/ { id: 'enter.unknownHelp', message: 'No command called {verb}. Enter shows every command' },
    notCommand: /*i18n*/ { id: 'enter.notCommand', message: 'A command starts with a verb and a colon, like open:201' },
    unknown: /*i18n*/ { id: 'enter.unknown', message: 'No command called {verb}. Type ? for every command' },
    didYouMean: /*i18n*/ { id: 'enter.didYouMean', message: 'No command called {verb}. Did you mean {near}?' },
    renamed: /*i18n*/ { id: 'enter.renamed', message: 'That verb is now {now}. Enter writes it in', comment: 'Enter puts the new verb in the field; it does not run it' },
    erase: /*i18n*/ { id: 'enter.erase', message: 'To remove something for good, use erase:. Enter writes it in', comment: 'The answer to delete:, ruled 15 October' },
    retired: /*i18n*/ { id: 'enter.retired', message: '{verb} is no longer a command' },
    retiredInstead: /*i18n*/ { id: 'enter.retiredInstead', message: '{verb} is no longer a command. Use {instead}' },
    noMinus: /*i18n*/ { id: 'enter.noMinus', message: 'Only a filter takes a minus, like -tag:research' },
    elsewhere: /*i18n*/ { id: 'enter.elsewhere', message: '{verb} works on {boards}' },
    takesWords: /*i18n*/ { id: 'enter.takesWords', message: '{verb} takes {words}', comment: '{words} is a list joined with "or"' },
    takesExample: /*i18n*/ { id: 'enter.takesExample', message: '{verb} does not take that. For example: {example}' },
    later: /*i18n*/ { id: 'enter.later', message: '{verb} is not built yet', comment: 'While the new shell is behind its flag' },
    ready: /*i18n*/ { id: 'enter.ready', message: 'Enter runs {verb}' },
    sequence: /*i18n*/ {
      id: 'enter.sequence',
      message: '{count, plural, one {Enter runs # command: {verbs}} other {Enter runs # commands in turn: {verbs}}}',
      comment: '{verbs} lists the commands in the order they run; one that fails stops the rest',
    },
    aloneSpends: /*i18n*/ { id: 'enter.aloneSpends', message: '{verb} runs on a line of its own, so its Enter line can name who receives it and what it costs' },
    aloneErase: /*i18n*/ { id: 'enter.aloneErase', message: '{verb} runs on a line of its own, so it is plain what goes for good' },
    filters: /*i18n*/ { id: 'enter.filters', message: '{count, plural, one {Enter applies # filter} other {Enter applies # filters}}' },
    key: /*i18n*/ { id: 'enter.key', message: 'No keys in the command line, for security. Delete it, and api: opens the key field' },
    leaveSearch: /*i18n*/ { id: 'enter.leaveSearch', message: 'Esc for search' },
    leavePrompt: /*i18n*/ { id: 'enter.leavePrompt', message: 'Esc for prompt' },
  },

  // The hint line: the keys that open the field where focus is (P2). {key}
  // is the shortcut as this computer writes it: ⌘K or Ctrl+K.
  hints: {
    slashOrK: /*i18n*/ { id: 'hint.slashOrK', message: 'press / or {key}' },
    kOnly: /*i18n*/ { id: 'hint.kOnly', message: 'press {key}' },
    minimised: /*i18n*/ { id: 'hint.minimised', message: 'Minimised. Search, command or prompt', comment: 'The name of the folded field, read by screen readers' },
  },

  // Keeping the data (C94): the browser is not named.
  storage: {
    kept: /*i18n*/ { id: 'storage.kept', message: "This browser keeps Parliament's data until you delete it." },
    notKept: /*i18n*/ {
      id: 'storage.notKept',
      message: "This browser has not agreed to keep Parliament's data. Some browsers delete a site's data when they close or run short of space. To keep it, allow this site to keep its cookies and site data in your browser's privacy settings, and keep a backup.",
    },
    ask: /*i18n*/ { id: 'storage.ask', message: 'Ask it to keep the data' },
    backup: /*i18n*/ { id: 'storage.backup', message: 'Save a backup' },
  },
}
