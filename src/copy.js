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
    canvas: /*i18n*/ { id: 'board.canvas', message: 'Canvas', comment: 'The room being built, in the middle of the Lab' },
    blocks: /*i18n*/ { id: 'board.blocks', message: 'Blocks', comment: 'The pieces a room is built from, beside the Canvas in the Lab' },
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
    // What the arrangement's verbs say before Enter (arrangement.js). {board},
    // {first} and {second} are board names from COPY.boards.
    openAddressed: /*i18n*/ { id: 'enter.openAddressed', message: 'The bar is pointed at {board} already' },
    openHere: /*i18n*/ { id: 'enter.openHere', message: '{board} is here. Enter points the bar at it' },
    openPopped: /*i18n*/ { id: 'enter.openPopped', message: '{board} is in its own window. Enter brings it forward' },
    openBoard: /*i18n*/ { id: 'enter.openBoard', message: 'Enter opens {board} on the right' },
    closeNotHere: /*i18n*/ { id: 'enter.closeNotHere', message: '{board} is not open' },
    closeFixed: /*i18n*/ { id: 'enter.closeFixed', message: '{board} stays open here' },
    closeLast: /*i18n*/ { id: 'enter.closeLast', message: 'The last board stays open' },
    closeBoard: /*i18n*/ { id: 'enter.closeBoard', message: 'Enter closes {board}. Nothing is lost' },
    moveIsPopped: /*i18n*/ { id: 'enter.moveIsPopped', message: '{board} is in its own window. pop:back brings it back first' },
    moveThere: /*i18n*/ {
      id: 'enter.moveThere',
      message: '{place, select, left {{board} is on the left already} right {{board} is on the right already} other {{board} is in the middle already}}',
    },
    moveBoard: /*i18n*/ {
      id: 'enter.moveBoard',
      message: '{place, select, left {Enter moves {board} to the left} right {Enter moves {board} to the right} other {Enter moves {board} to the middle}}',
    },
    swapSame: /*i18n*/ { id: 'enter.swapSame', message: 'swap: takes two different boards' },
    swapBoards: /*i18n*/ { id: 'enter.swapBoards', message: 'Enter swaps {first} and {second}' },
    popAlready: /*i18n*/ { id: 'enter.popAlready', message: '{board} is in its own window already' },
    popLast: /*i18n*/ { id: 'enter.popLast', message: 'The last board stays on the page' },
    popBoard: /*i18n*/ { id: 'enter.popBoard', message: 'Enter puts {board} in its own window' },
    popDisplay: /*i18n*/ { id: 'enter.popDisplay', message: 'Enter puts {board} in its own window on screen {display}' },
    popNotPopped: /*i18n*/ { id: 'enter.popNotPopped', message: '{board} is not in its own window' },
    popNothing: /*i18n*/ { id: 'enter.popNothing', message: 'No board is in its own window' },
    popBackOne: /*i18n*/ { id: 'enter.popBackOne', message: 'Enter brings {board} back to the page' },
    popBackAll: /*i18n*/ { id: 'enter.popBackAll', message: '{count, plural, one {Enter brings # window back to the page} other {Enter brings # windows back to the page}}' },
    popSideThere: /*i18n*/ {
      id: 'enter.popSideThere',
      message: '{side, select, left {The window of {board} is on the left already} other {The window of {board} is on the right already}}',
    },
    popSide: /*i18n*/ {
      id: 'enter.popSide',
      message: '{side, select, left {Enter places the window of {board} on the left} other {Enter places the window of {board} on the right}}',
    },
    popCommand: /*i18n*/ { id: 'enter.popCommand', message: 'Enter puts the bar in its own window' },
    popBackCommand: /*i18n*/ { id: 'enter.popBackCommand', message: 'Enter brings the bar back to the page' },
    barPoppedAlready: /*i18n*/ { id: 'enter.barPoppedAlready', message: 'The bar is in its own window already' },
    barNotPopped: /*i18n*/ { id: 'enter.barNotPopped', message: 'The bar is on the page already' },
    barThere: /*i18n*/ {
      id: 'enter.barThere',
      message: '{place, select, top {The bar is at the top already} bottom {The bar is at the bottom already} left {The bar is on the left already} right {The bar is on the right already} other {The bar is in the centre already}}',
    },
    barMove: /*i18n*/ {
      id: 'enter.barMove',
      message: '{place, select, top {Enter moves the bar to the top} bottom {Enter moves the bar to the bottom} left {Enter moves the bar to the left} right {Enter moves the bar to the right} other {Enter moves the bar to the centre}}',
    },
    resetAlready: /*i18n*/ { id: 'enter.resetAlready', message: 'This screen is as shipped' },
    resetArrangement: /*i18n*/ {
      id: 'enter.resetArrangement',
      message: '{count, plural, =0 {Enter puts this screen back as shipped} one {Enter puts this screen back as shipped and closes # window} other {Enter puts this screen back as shipped and closes # windows}}',
    },
    popBlocked: /*i18n*/ { id: 'enter.popBlocked', message: 'The browser did not open the window. Allow pop-ups for this site, then try again' },
    popOrdinary: /*i18n*/ { id: 'enter.popOrdinary', message: 'It opens as an ordinary window, since this browser cannot keep one on top', comment: 'Added to the Enter line for pop: where the always-on-top window is missing (C94)' },
    key: /*i18n*/ { id: 'enter.key', message: 'No keys in the command line, for security. Delete it, and api: opens the key field' },
    leaveSearch: /*i18n*/ { id: 'enter.leaveSearch', message: 'Escape goes back to search' },
    leavePrompt: /*i18n*/ { id: 'enter.leavePrompt', message: 'Escape goes back to the prompt' },
    target: /*i18n*/ { id: 'enter.target', message: '→ {board}', comment: 'The head of the Enter line: where the command goes' },
    restingCommand: /*i18n*/ { id: 'enter.restingCommand', message: 'type > for the command line', comment: 'The Enter line in search mode, before anything is typed' },
    restingPrompt: /*i18n*/ { id: 'enter.restingPrompt', message: 'p> for a prompt' },
    restingHelp: /*i18n*/ { id: 'enter.restingHelp', message: '? every command' },
    searchLater: /*i18n*/ { id: 'enter.searchLater', message: 'Search is not built yet' },
    // Going to another screen: alm: and sym: (C95, C102).
    goAlmanac: /*i18n*/ { id: 'enter.goAlmanac', message: 'Enter goes to {board}', comment: '{board} is the Almanac, from COPY.boards' },
    almHere: /*i18n*/ { id: 'enter.almHere', message: 'You are on {board} already' },
    goRoom: /*i18n*/ { id: 'enter.goRoom', message: 'Enter goes back to the last room' },
    roomHere: /*i18n*/ { id: 'enter.roomHere', message: 'This is the last room already' },
    goNewRoom: /*i18n*/ { id: 'enter.goNewRoom', message: 'Enter opens an empty room. Its first prompt starts it' },
    newRoomHere: /*i18n*/ { id: 'enter.newRoomHere', message: 'This room is empty. Its first prompt starts it' },
    aloneSwitch: /*i18n*/ { id: 'enter.aloneSwitch', message: '{verb} goes to another screen, so it runs on a line of its own' },
    // A prompt (stage 4; C83). {provider} and {source} are names from the
    // list of providers and sources; {cost} is an amount the bar formats.
    targetChat: /*i18n*/ { id: 'enter.targetChat', message: '→ {chat}', comment: "The head of the Enter line in a room: the chat's number" },
    targetNewRoom: /*i18n*/ { id: 'enter.targetNewRoom', message: '→ a new room' },
    promptNoRoom: /*i18n*/ { id: 'enter.promptNoRoom', message: 'Prompts go to a room. sym: opens one' },
    promptBusy: /*i18n*/ { id: 'enter.promptBusy', message: 'A reply is still arriving here. Send once it is done' },
    promptChecking: /*i18n*/ { id: 'enter.promptChecking', message: 'Looking for a key on this device' },
    promptSource: /*i18n*/ { id: 'enter.promptSource', message: 'Enter asks {source}, which needs no key and costs nothing' },
    promptSend: /*i18n*/ {
      id: 'enter.promptSend',
      message: '{tokens, plural, one {Enter sends to {provider}, about # token, {cost} to send} other {Enter sends to {provider}, about # tokens, {cost} to send}}',
      comment: 'A local estimate: nothing is sent to count (C83)',
    },
    promptSendCheap: /*i18n*/ {
      id: 'enter.promptSendCheap',
      message: '{tokens, plural, one {Enter sends to {provider}, about # token, under {cost} to send} other {Enter sends to {provider}, about # tokens, under {cost} to send}}',
      comment: '{cost} is the smallest amount shown, a cent',
    },
    promptSendUnpriced: /*i18n*/ {
      id: 'enter.promptSendUnpriced',
      message: '{tokens, plural, one {Enter sends to {provider}, about # token} other {Enter sends to {provider}, about # tokens}}',
    },
    promptDescribe: /*i18n*/ {
      id: 'enter.promptDescribe',
      message: 'After the answer, one short request for its title, summary and tags, {cost}',
      comment: 'C62: named before Enter; a switch in Settings turns it off. {cost} is an amount',
    },
    promptDescribeCheap: /*i18n*/ { id: 'enter.promptDescribeCheap', message: 'After the answer, one short request for its title, summary and tags, under {cost}' },
    promptDescribeUnpriced: /*i18n*/ { id: 'enter.promptDescribeUnpriced', message: 'After the answer, one short request for its title, summary and tags' },
    promptSourcesOut: /*i18n*/ {
      id: 'enter.promptSourcesOut',
      message: '{count, plural, one {# answer from {sources} stays out} other {# answers from {sources} stay out}}',
      comment: 'C115: answers from sources are not sent to a model unless the person acts on them. {sources} lists their names',
    },
    promptHiddenOut: /*i18n*/ {
      id: 'enter.promptHiddenOut',
      message: '{count, plural, one {# hidden message stays out} other {# hidden messages stay out}}',
      comment: 'Hidden messages, and messages being deleted, are not sent (stage 4)',
    },
    promptChanged: /*i18n*/ { id: 'enter.promptChanged', message: 'Where prompts go has changed. Read this line again before you send' },
    sourceUnreachable: /*i18n*/ { id: 'enter.sourceUnreachable', message: '{source} could not be reached. Check the connection, then try again' },
    sourceRefused: /*i18n*/ { id: 'enter.sourceRefused', message: '{source} did not answer. Try again in a moment' },
    keyRefused: /*i18n*/ { id: 'enter.keyRefused', message: 'The key was refused. Update it in {board}, then send again', comment: '{board} is Settings, from COPY.boards' },
    tooMany: /*i18n*/ { id: 'enter.tooMany', message: 'Too many requests for now. Wait a moment, then send again' },
    promptFailed: /*i18n*/ { id: 'enter.promptFailed', message: 'The prompt did not go through. Try again' },
    // C114: a reply that stalled, and the offer to send it again.
    promptStalled: /*i18n*/ { id: 'enter.promptStalled', message: 'The reply stalled, as happens on networks that hold streamed replies' },
    promptResend: /*i18n*/ {
      id: 'enter.promptResend',
      message: '{tokens, plural, one {Enter sends it again without streaming, about # token, {cost} to send} other {Enter sends it again without streaming, about # tokens, {cost} to send}}',
      comment: 'Sent only on Enter, never automatically (C114)',
    },
    promptResendCheap: /*i18n*/ {
      id: 'enter.promptResendCheap',
      message: '{tokens, plural, one {Enter sends it again without streaming, about # token, under {cost} to send} other {Enter sends it again without streaming, about # tokens, under {cost} to send}}',
    },
    promptResendUnpriced: /*i18n*/ {
      id: 'enter.promptResendUnpriced',
      message: '{tokens, plural, one {Enter sends it again without streaming, about # token} other {Enter sends it again without streaming, about # tokens}}',
    },
    replyCut: /*i18n*/ { id: 'enter.replyCut', message: 'The reply broke off part way. What arrived is kept and marked as cut off' },
  },

  // Marginalia inside the prompt field: who answers a prompt here (bar
  // reference; stage 4). {source} and {model} are names from the lists.
  field: {
    answeredFrom: /*i18n*/ { id: 'field.answeredFrom', message: 'answered from {source}' },
    answeredBy: /*i18n*/ { id: 'field.answeredBy', message: 'answered by {model}' },
  },

  // A room on the shell (stage 4).
  room: {
    newTitle: /*i18n*/ { id: 'room.newTitle', message: 'New room' },
    empty: /*i18n*/ { id: 'room.empty', message: 'An empty room. Its first prompt, written in the bar, starts its chat.' },
    notFound: /*i18n*/ { id: 'room.notFound', message: 'This chat could not be found. It may have been removed.' },
    unavailable: /*i18n*/ { id: 'room.unavailable', message: 'This room could not be drawn. Its chat is kept as it was.' },
  },

  // The hint line: the keys that open the field where focus is (P2). {key}
  // is the shortcut as this computer writes it: ⌘K or Ctrl+K.
  hints: {
    slashOrK: /*i18n*/ { id: 'hint.slashOrK', message: 'press / or {key}' },
    kOnly: /*i18n*/ { id: 'hint.kOnly', message: 'press {key}' },
    minimised: /*i18n*/ { id: 'hint.minimised', message: 'Minimised. Search, command or prompt', comment: 'The name of the folded field, read by screen readers' },
  },

  // The new shell (stage 3), while its boards are still placeholders.
  shell: {
    field: /*i18n*/ { id: 'shell.field', message: 'Search, command or prompt', comment: 'The name of the field, read by screen readers' },
    strip: /*i18n*/ { id: 'shell.strip', message: 'Boards', comment: 'The name of the board strip, read by screen readers' },
    boardLater: /*i18n*/ { id: 'shell.boardLater', message: 'This board is drawn in a later stage.' },
    sampleReply: /*i18n*/ { id: 'shell.sampleReply', message: 'A stand-in reply until rooms arrive. Click into this line to edit it, and the bar folds into a circle.', comment: 'Editable text on a placeholder board; nothing typed here is kept' },
    addressed: /*i18n*/ { id: 'shell.addressed', message: 'the bar points here', comment: 'Marginalia on the board the navy rule is on' },
    referenceClose: /*i18n*/ { id: 'shell.referenceClose', message: 'Escape closes this' },
    referenceName: /*i18n*/ { id: 'shell.referenceName', message: 'Every command', comment: 'The name of the ? reference, read by screen readers' },
    windowTitle: /*i18n*/ { id: 'shell.windowTitle', message: '{board} · Parliament', comment: "A popped window's title: a board name only, never anything someone wrote" },
    barWindow: /*i18n*/ { id: 'shell.barWindow', message: 'Parliament', comment: "The popped bar's window title" },
    barAway: /*i18n*/ { id: 'shell.barAway', message: 'The bar is in its own window. pop:back command brings it back.' },
  },

  // A reply being written when its chat is left (C109).
  chat: {
    stoppedOnReply: /*i18n*/ { id: 'chat.stoppedOnReply', message: 'Stopped when you left the chat. What arrived is kept.' },
    // A reply cut off (stage 4), marked so it is never taken for a whole answer.
    cutLimit: /*i18n*/ { id: 'chat.cutLimit', message: 'Cut off: the reply reached the length allowed for one reply. What arrived is kept.' },
    cutError: /*i18n*/ { id: 'chat.cutError', message: 'Cut off by an error part way through. What arrived is kept.' },
    cutErrorEmpty: /*i18n*/ { id: 'chat.cutErrorEmpty', message: 'Stopped before any of it arrived.' },
    stoppedNotice: /*i18n*/ {
      id: 'chat.stoppedNotice',
      message: 'The reply in {chat} stopped when you left it. What arrived is kept, and the tokens it used are charged.',
      comment: "{chat} is the chat's number, or its title in quotation marks",
    },
    stoppedNoticeEmpty: /*i18n*/ { id: 'chat.stoppedNoticeEmpty', message: 'The reply in {chat} stopped when you left it, before any of it arrived.' },
    close: /*i18n*/ { id: 'chat.close', message: 'Close' },
    // An answer from a source (stage 4). {source} is its name, from the list.
    answeredFrom: /*i18n*/ { id: 'chat.answeredFrom', message: 'Answered from {source}' },
    sourceRevision: /*i18n*/ { id: 'chat.sourceRevision', message: 'revision {revision}' },
    sourceNothing: /*i18n*/ { id: 'chat.sourceNothing', message: 'Nothing found on {source} for that. Try other words.' },
    // C62: the one request after a chat's first answer.
    describeSetting: /*i18n*/ { id: 'chat.describeSetting', message: 'Name a new chat after its first answer' },
    describeSettingHelp: /*i18n*/ {
      id: 'chat.describeSettingHelp',
      message: 'On: after a chat\'s first answer, one short request asks the model for its title, a one-line summary and tags. The line under the bar names it before you send. Off: a chat is titled with the first words of its prompt, and nothing more is sent.',
    },
    finishSetting: /*i18n*/ { id: 'chat.finishSetting', message: 'Finish replies after I leave a chat' },
    finishSettingHelp: /*i18n*/ {
      id: 'chat.finishSettingHelp',
      message: 'Off: when you leave a chat while a reply is being written, the reply stops and what arrived is kept. On: it finishes in the background and is saved to its chat.',
    },
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
