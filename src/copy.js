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
    almanac: /*i18n*/ { id: 'board.almanac', message: 'Records', comment: 'The table of everything you have made, by number (C131)' },
    collection: /*i18n*/ { id: 'board.collection', message: 'Collection', comment: 'Cards of highlights, terms, quotes and notes' },
    library: /*i18n*/ { id: 'board.library', message: 'Library', comment: 'Rooms, layouts, blocks, themes and resources' },
    docket: /*i18n*/ { id: 'board.docket', message: 'Plan', comment: 'Prompts set out in branches and steps, to run (C131)' },
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
    term: /*i18n*/ { id: 'kind.term', message: 'Keyword', comment: 'A word or phrase lit wherever it appears in a chat (C131)' },
    quote: /*i18n*/ { id: 'kind.quote', message: 'Quote', comment: 'A passage kept beside the chat, never sent' },
    docket: /*i18n*/ { id: 'kind.docket', message: 'Plan' },
    edit: /*i18n*/ { id: 'kind.edit', message: 'Edit' },
    ask: /*i18n*/ { id: 'kind.ask', message: 'Ask' },
    suggestion: /*i18n*/ { id: 'kind.suggestion', message: 'Suggestion' },
  },

  // Counts, with plurals that work in every language.
  counts: {
    chats: /*i18n*/ { id: 'count.chats', message: '{count, plural, one {# chat} other {# chats}}' },
    dockets: /*i18n*/ { id: 'count.dockets', message: '{count, plural, one {# plan} other {# plans}}' },
    steps: /*i18n*/ { id: 'count.steps', message: '{count, plural, one {# step} other {# steps}}' },
    branches: /*i18n*/ { id: 'count.branches', message: '{count, plural, one {# branch} other {# branches}}' },
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
    closeRoom: /*i18n*/ { id: 'enter.closeRoom', message: 'Enter closes this room. Nothing is lost' },
    // width: (C126). {percent}, {low} and {high} are shares of the width, written as the reader's language writes a percentage.
    widthIt: /*i18n*/ { id: 'enter.widthIt', message: 'Enter gives it {percent} of the width', comment: 'It is the board the bar points at, named just before this line' },
    widthSet: /*i18n*/ { id: 'enter.widthSet', message: 'Enter gives {board} {percent} of the width' },
    widthThere: /*i18n*/ { id: 'enter.widthThere', message: 'That is its width already' },
    widthAlone: /*i18n*/ { id: 'enter.widthAlone', message: 'A board on its own has the whole width' },
    widthRange: /*i18n*/ { id: 'enter.widthRange', message: 'A board takes from {low} to {high} of the width' },
    widthPopped: /*i18n*/ { id: 'enter.widthPopped', message: 'A board in its own window takes the width of its window' },
    widthMost: /*i18n*/ { id: 'enter.widthMost', message: 'Beside the others it can have at most {percent} of the width' },
    widthLeast: /*i18n*/ { id: 'enter.widthLeast', message: 'It needs at least {percent} of the width' },
    widthStacked: /*i18n*/ { id: 'enter.widthStacked', message: 'In a window this narrow the boards are stacked, each the whole width' },
    widthEven: /*i18n*/ { id: 'enter.widthEven', message: 'Enter puts every board back to its usual width' },
    widthEvenAlready: /*i18n*/ { id: 'enter.widthEvenAlready', message: 'Every board has its usual width already' },
    closeWelcome: /*i18n*/ { id: 'enter.closeWelcome', message: 'Enter closes the welcome page. tour: brings it back' },
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
    // tour: and tour:off (A20).
    goWelcome: /*i18n*/ { id: 'enter.goWelcome', message: 'Enter brings the welcome page and its steps beside what is here' },
    tourOn: /*i18n*/ { id: 'enter.tourOn', message: 'Enter shows the steps again' },
    tourHere: /*i18n*/ { id: 'enter.tourHere', message: 'The steps are here already' },
    tourOff: /*i18n*/ { id: 'enter.tourOff', message: 'Enter puts the steps away. tour: brings them back' },
    tourOffAlready: /*i18n*/ { id: 'enter.tourOffAlready', message: 'The steps are put away already' },
    // On the welcome page (W §2, §6): the one line at rest, and the next
    // step's command leading the command line's.
    toBegin: /*i18n*/ { id: 'enter.toBegin', message: '{leader} to begin', comment: '{leader} is >, the command leader' },
    nextStep: /*i18n*/ { id: 'enter.nextStep', message: 'next: {command}', comment: 'The next welcome step\'s command, which stays English' },
    toCommand: /*i18n*/ { id: 'enter.toCommand', message: '{leader} for the command line', comment: 'In prompt mode on the welcome page (C119)' },
    // Search and filters on Records (stage 6, piece 1; C132). {verb} and
    // {filters} are commands, which stay English; {day} is a date the bar
    // writes as the reader's language does; {name} is the person's words.
    searchShows: /*i18n*/ { id: 'enter.searchShows', message: '{count, plural, =0 {No row matches} one {# row matches} other {# rows match}}' },
    searchRecords: /*i18n*/ { id: 'enter.searchRecords', message: 'Search works on {board} for now', comment: 'In search mode on a board search does not reach yet; {board} is Records' },
    filterShows: /*i18n*/ { id: 'enter.filterShows', message: '{count, plural, =0 {Enter shows no rows} one {Enter shows # row} other {Enter shows # rows}}' },
    filterSince: /*i18n*/ { id: 'enter.filterSince', message: 'made since {day}' },
    filterUntil: /*i18n*/ { id: 'enter.filterUntil', message: 'made until the end of {day}' },
    filterCostUnknown: /*i18n*/ {
      id: 'enter.filterCostUnknown',
      message: '{count, plural, one {# with no cost recorded is left out} other {# with no cost recorded are left out}}',
      comment: 'C132 (h): a cost is worked out from recorded tokens, never guessed',
    },
    fromWhat: /*i18n*/ { id: 'enter.fromWhat', message: 'Nothing comes from {num}. from: takes a chat, a plan, a branch or a run' },
    inNone: /*i18n*/ { id: 'enter.inNone', message: 'No room or collection is called {name}' },
    inNoRoom: /*i18n*/ { id: 'enter.inNoRoom', message: 'No room is called {name}' },
    inNoCollection: /*i18n*/ { id: 'enter.inNoCollection', message: 'No collection is called {name}' },
    inWhich: /*i18n*/ { id: 'enter.inWhich', message: '{name} is a room and a collection. Add room or collection after it', comment: 'room and collection stay English: they are words of the command' },
    costBad: /*i18n*/ { id: 'enter.costBad', message: 'cost: takes an amount, like >0.50, <1 or 0.18' },
    dateBad: /*i18n*/ { id: 'enter.dateBad', message: '{verb} takes 7d, 3w, a month, or a date like 2026-09-01' },
    clearFilters: /*i18n*/ { id: 'enter.clearFilters', message: 'Enter clears the search and every filter' },
    clearSearch: /*i18n*/ { id: 'enter.clearSearch', message: 'Enter clears the search' },
    clearSort: /*i18n*/ { id: 'enter.clearSort', message: 'Enter puts the usual order back' },
    clearFilter: /*i18n*/ { id: 'enter.clearFilter', message: 'Enter removes {filters}' },
    clearNothing: /*i18n*/ { id: 'enter.clearNothing', message: 'No search or filter is in force' },
    clearNoSearch: /*i18n*/ { id: 'enter.clearNoSearch', message: 'Nothing is searched for' },
    clearNoSort: /*i18n*/ { id: 'enter.clearNoSort', message: 'The table is in its usual order' },
    clearNoFilter: /*i18n*/ { id: 'enter.clearNoFilter', message: 'No {verb} filter is in force' },
    // Bringing boards into the space: records:, room:, tour: (C95, C125, C131).
    // One space (C125): an arrangement's boards brought beside what is here.
    bringBoards: /*i18n*/ { id: 'enter.bringBoards', message: 'Enter brings {boards} beside what is here', comment: '{boards} lists board names' },
    bringHere: /*i18n*/ { id: 'enter.bringHere', message: 'Everything it brings is here already' },
    goRoom: /*i18n*/ { id: 'enter.goRoom', message: 'Enter brings the last room beside what is here' },
    showRoom: /*i18n*/ { id: 'enter.showRoom', message: 'Enter shows the last room here' },
    roomHere: /*i18n*/ { id: 'enter.roomHere', message: 'The last room is here already' },
    goNewRoom: /*i18n*/ { id: 'enter.goNewRoom', message: 'Enter opens an empty room beside what is here. Its first prompt starts it' },
    newRoomHere: /*i18n*/ { id: 'enter.newRoomHere', message: 'This room is empty. Its first prompt starts it' },
    // A prompt (stage 4; C83). {provider} and {source} are names from the
    // list of providers and sources; {cost} is an amount the bar formats.
    targetChat: /*i18n*/ { id: 'enter.targetChat', message: '→ {chat}', comment: "The head of the Enter line in a room: the chat's number" },
    targetChatIn: /*i18n*/ { id: 'enter.targetChatIn', message: '→ {chat} in {room}', comment: "{chat} is the chat's number, {room} the room's name (bar reference: → 201a in unnamed room)" },
    // name: for the room (C40).
    nameRoom: /*i18n*/ { id: 'enter.nameRoom', message: 'Enter names this room: {name}', comment: '{name} is the person\'s own words' },
    nameSame: /*i18n*/ { id: 'enter.nameSame', message: 'This room has that name already' },
    // open: and inspect: by number (stage 5, piece 3). {num} is a number as typed.
    numNone: /*i18n*/ { id: 'enter.numNone', message: 'Nothing here has the number {num}' },
    openChat: /*i18n*/ { id: 'enter.openChat', message: 'Enter opens {num} in a room beside what is here' },
    openChatHere: /*i18n*/ { id: 'enter.openChatHere', message: 'Enter shows {num} in the room here' },
    openChatThere: /*i18n*/ { id: 'enter.openChatThere', message: '{num} is in the room here already' },
    openDocket: /*i18n*/ { id: 'enter.openDocket', message: 'Enter opens its first branch, {num}, in a room beside what is here' },
    openDocketHere: /*i18n*/ { id: 'enter.openDocketHere', message: 'Enter shows its first branch, {num}, in the room here' },
    openNotYet: /*i18n*/ { id: 'enter.openNotYet', message: 'Opening this comes later. inspect:{num} shows it now' },
    inspectOne: /*i18n*/ { id: 'enter.inspectOne', message: 'Enter shows {num} in detail, here' },
    // focus: and focus:off, the first form (W §7; stage 5, piece 6). {boards} is a list of board names.
    focusClosing: /*i18n*/ { id: 'enter.focusClosing', message: 'Enter clears the screen to the chat, closing {boards}. Nothing is lost, and focus:off brings them back' },
    focusAlone: /*i18n*/ { id: 'enter.focusAlone', message: 'Enter leaves the chat alone here, with the bar under it' },
    focusAlready: /*i18n*/ { id: 'enter.focusAlready', message: 'The chat is in focus already. focus:off brings back what was here' },
    focusNothing: /*i18n*/ { id: 'enter.focusNothing', message: 'Nothing to focus on yet. p> starts a chat' },
    focusOff: /*i18n*/ { id: 'enter.focusOff', message: 'Enter brings back {boards}' },
    focusOffSame: /*i18n*/ { id: 'enter.focusOffSame', message: 'Enter brings the screen back as it was' },
    focusOffNot: /*i18n*/ { id: 'enter.focusOffNot', message: 'Nothing is in focus' },
    // api: (stage 5, piece 5; settings spec §6). {provider} is a name from the list of providers; {ending} a key's last four characters.
    apiList: /*i18n*/ { id: 'enter.apiList', message: 'Enter shows your keys, here under the field' },
    apiAdd: /*i18n*/ { id: 'enter.apiAdd', message: 'Enter opens the {provider} key field. Never type a key here' },
    apiReplace: /*i18n*/ { id: 'enter.apiReplace', message: '{provider} has a key ending {ending}. Enter opens it for replacing' },
    apiNew: /*i18n*/ { id: 'enter.apiNew', message: 'Enter opens the {provider} key field, the first without a key' },
    apiAllKeyed: /*i18n*/ { id: 'enter.apiAllKeyed', message: 'Every provider has a key. {words} replaces one' },
    apiNoKey: /*i18n*/ { id: 'enter.apiNoKey', message: '{provider} needs no key' },
    apiUnknown: /*i18n*/ { id: 'enter.apiUnknown', message: 'No provider is called {word}. Try {words}' },
    promptKey: /*i18n*/ { id: 'enter.promptKey', message: 'This looks like a key, which would be sent with the prompt. Delete it, and api: opens the key field' },
    nameEmpty: /*i18n*/ { id: 'enter.nameEmpty', message: 'A name needs some words, like name:"Barn owls"' },
    nameLong: /*i18n*/ { id: 'enter.nameLong', message: 'A room\'s name is at most {max} characters' },
    nameNoChat: /*i18n*/ { id: 'enter.nameNoChat', message: 'This room has no chat yet. Its first prompt starts it, and then name: names it' },
    nameFailed: /*i18n*/ { id: 'enter.nameFailed', message: 'The name was not kept. Try again' },
    aloneNow: /*i18n*/ { id: 'enter.aloneNow', message: '{verb} runs on a line of its own for now' },
    targetNewRoom: /*i18n*/ { id: 'enter.targetNewRoom', message: '→ a new room' },
    promptNoRoom: /*i18n*/ { id: 'enter.promptNoRoom', message: 'Prompts go to a room. room: opens one' },
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

  // The welcome page (stage 5; welcome spec, welcome v9). The letter is v9's,
  // for Stefan to edit here (C122). The signature's dash is drawn by the
  // page: the one em dash, a deliberate exception (W §3).
  welcome: {
    heading: /*i18n*/ { id: 'welcome.heading', message: 'Welcome' },
    headingTo: /*i18n*/ { id: 'welcome.headingTo', message: 'to Parliament', comment: 'The heading finishes its sentence when the steps are done: Welcome / to Parliament' },
    steps: /*i18n*/ { id: 'welcome.steps', message: 'Eight things to try', comment: 'The name of the list of steps, read by screen readers' },
    stepCommand: /*i18n*/ { id: 'welcome.step.command', message: 'Open the command line' },
    stepBar: /*i18n*/ { id: 'welcome.step.bar', message: 'Move the bar to the bottom' },
    stepAsk: /*i18n*/ { id: 'welcome.step.ask', message: 'Ask something' },
    stepAskHow: /*i18n*/ { id: 'welcome.step.askHow', message: '{command} and a question', comment: '{command} is p>, which stays English' },
    stepAlmanac: /*i18n*/ { id: 'welcome.step.almanac', message: 'See what you have made' },
    stepName: /*i18n*/ { id: 'welcome.step.name', message: 'Name the room' },
    stepPop: /*i18n*/ { id: 'welcome.step.pop', message: 'Move it to another monitor' },
    stepLibrary: /*i18n*/ { id: 'welcome.step.library', message: 'Browse tools to add and customize' },
    stepKey: /*i18n*/ { id: 'welcome.step.key', message: 'Add an AI API key' },
    letter1: /*i18n*/ { id: 'welcome.letter.1', message: 'Parliament is a place to work with AI on your own terms. It is early, and still being built.' },
    letter2: /*i18n*/ {
      id: 'welcome.letter.2',
      message: 'It runs in your browser, with no servers and no accounts. Your chats and keys stay on this computer, and each request goes straight to the provider you pick, to a model running on your own machine, or just Wikipedia. There are no ads.',
    },
    letter3: /*i18n*/ {
      id: 'welcome.letter.3',
      message: 'With the goal of rethinking how we interact with AI, it is yours to shape. Rooms are built from blocks, layouts and themes. You create the space, you choose how to interact.',
    },
    letter4: /*i18n*/ {
      id: 'welcome.letter.4',
      message: 'Most AI apps are built for passive consumption. You ask something, you receive a response. Here you steer from a command line: branch chats, highlight, add and combine notes across chats, plan a run of prompts, and more. Let\'s take back control.',
    },
    signature: /*i18n*/ { id: 'welcome.signature', message: 'So Lov', comment: 'The letter is signed with this name after a dash' },
    // The ending (W §7): the letter gives way to one line. {command} is focus:, drawn as a link that writes it in the bar.
    now: /*i18n*/ { id: 'welcome.now', message: 'Now, let’s {command}', comment: '{command} is focus:, which stays English' },
    // On narrow or touch-only screens only (W §12.4).
    small: /*i18n*/ { id: 'welcome.small', message: 'built for a computer for now; the phone comes later' },
    // Where the browser has not agreed to keep Parliament's data (C94). Names no browser.
    keepNot: /*i18n*/ { id: 'welcome.keepNot', message: 'This browser has not agreed to keep what you make here, so it may clear it to save space, or each time it closes. To keep it, let this site keep its data in the browser’s settings, and back up now and then.' },
    keepAsk: /*i18n*/ { id: 'welcome.keepAsk', message: 'ask the browser again' },
    keepBackup: /*i18n*/ { id: 'welcome.keepBackup', message: 'back up in {board}', comment: '{board} is Settings, from COPY.boards' },
    keepAsking: /*i18n*/ { id: 'welcome.keepAsking', message: 'asking' },
    footMade: /*i18n*/ { id: 'welcome.foot.made', message: 'Created with Claude Code' },
    footLicence: /*i18n*/ { id: 'welcome.foot.licence', message: 'MIT licensed. Source published at launch', comment: 'Until the repository is public (C71, C123)' },
    footBuilders: /*i18n*/ { id: 'welcome.foot.builders', message: 'Looking for other builders' },
  },

  // The built-in rooms' names, shown until a room's owner names it (C90).
  // Keyed by template.
  templates: {
    'writing-studio@1.0': /*i18n*/ { id: 'template.writingStudio', message: 'Writing studio' },
    'data-workspace@1.0': /*i18n*/ { id: 'template.dataWorkspace', message: 'Data workspace' },
    'drafting-desk@1.0': /*i18n*/ { id: 'template.draftingDesk', message: 'Drafting desk' },
    'pocket-chat@1.0': /*i18n*/ { id: 'template.pocketChat', message: 'Pocket chat' },
    'quiet-room@1.0': /*i18n*/ { id: 'template.quietRoom', message: 'Quiet room' },
    'kingfisher@1.0': /*i18n*/ { id: 'template.kingfisher', message: 'Kingfisher' },
    'starling@1.0': /*i18n*/ { id: 'template.starling', message: 'Starling' },
  },

  // A room on the shell (stage 4).
  room: {
    unnamed: /*i18n*/ { id: 'room.unnamed', message: 'unnamed room', comment: 'A room with no name of its own (bar reference)' },
    newTitle: /*i18n*/ { id: 'room.newTitle', message: 'New room' },
    empty: /*i18n*/ { id: 'room.empty', message: 'An empty room. Its first prompt, written in the bar, starts its chat.' },
    notFound: /*i18n*/ { id: 'room.notFound', message: 'This chat could not be found. It may have been removed.' },
    unavailable: /*i18n*/ { id: 'room.unavailable', message: 'This room could not be drawn. Its chat is kept as it was.' },
  },

  // The Almanac (stage 5, piece 3; Almanac v30): the table of everything
  // made, by number.
  almanac: {
    colType: /*i18n*/ { id: 'almanac.colType', message: 'Type' },
    colId: /*i18n*/ { id: 'almanac.colId', message: 'ID', comment: 'The number every row is addressed by' },
    colTitle: /*i18n*/ { id: 'almanac.colTitle', message: 'Title' },
    colRoom: /*i18n*/ { id: 'almanac.colRoom', message: 'Room' },
    colTags: /*i18n*/ { id: 'almanac.colTags', message: 'Tags' },
    colCreated: /*i18n*/ { id: 'almanac.colCreated', message: 'Created' },
    colActive: /*i18n*/ { id: 'almanac.colActive', message: 'Last active' },
    empty: /*i18n*/ { id: 'almanac.empty', message: 'Nothing made yet. p> starts your first chat, and it appears here.' },
    pinned: /*i18n*/ { id: 'almanac.pinned', message: 'pinned', comment: 'Marginalia under a pinned row' },
    untitled: /*i18n*/ { id: 'almanac.untitled', message: 'Untitled' },
    rowHelp: /*i18n*/ { id: 'almanac.rowHelp', message: 'Writes open:{num} in the bar', comment: 'What clicking a row does; open: stays English' },
    loading: /*i18n*/ { id: 'almanac.loading', message: 'Reading what you have made' },
    // The search and filters in force, one line at the top (stage 6, piece 1; C132).
    filtersLabel: /*i18n*/ { id: 'almanac.filtersLabel', message: 'The search and filters in force' },
    searchFor: /*i18n*/ { id: 'almanac.searchFor', message: '“{text}”', comment: 'What is searched for, in the quotation marks the language uses' },
    removes: /*i18n*/ { id: 'almanac.removes', message: 'Removes it, as {command} does', comment: '{command} stays English' },
    shown: /*i18n*/ { id: 'almanac.shown', message: '{count, plural, =0 {no rows} one {# row} other {# rows}}' },
    noneMatch: /*i18n*/ { id: 'almanac.noneMatch', message: 'Nothing matches. clear:filters shows everything again.', comment: 'clear:filters stays English' },
  },

  // Collections by the words people read (C139). A collection's own name is
  // the person's words; Favorites is built in.
  collections: {
    favorites: /*i18n*/ { id: 'collection.favorites', message: 'Favorites', comment: 'The collection favourites became (C20)' },
    untitled: /*i18n*/ { id: 'collection.untitled', message: 'Untitled collection' },
  },

  // The Library (stage 5, piece 4; Lab v7): the catalogue, read-only.
  library: {
    shelves: /*i18n*/ { id: 'library.shelves', message: 'Shelves' },
    shelfAll: /*i18n*/ { id: 'library.shelfAll', message: 'All' },
    shelfRooms: /*i18n*/ { id: 'library.shelfRooms', message: 'Rooms' },
    shelfBoards: /*i18n*/ { id: 'library.shelfBoards', message: 'Boards' },
    shelfLayouts: /*i18n*/ { id: 'library.shelfLayouts', message: 'Layouts' },
    shelfBlocks: /*i18n*/ { id: 'library.shelfBlocks', message: 'Blocks' },
    shelfThemes: /*i18n*/ { id: 'library.shelfThemes', message: 'Themes' },
    shelfResources: /*i18n*/ { id: 'library.shelfResources', message: 'Resources' },
    groupMine: /*i18n*/ { id: 'library.groupMine', message: 'Your rooms' },
    groupTemplates: /*i18n*/ { id: 'library.groupTemplates', message: 'Room templates' },
    pillMine: /*i18n*/ { id: 'library.pillMine', message: 'yours' },
    pillTemplate: /*i18n*/ { id: 'library.pillTemplate', message: 'template' },
    pillSoon: /*i18n*/ { id: 'library.pillSoon', message: 'coming soon' },
    blocks: /*i18n*/ { id: 'library.blocks', message: '{count, plural, one {# block} other {# blocks}}' },
    places: /*i18n*/ { id: 'library.places', message: '{count, plural, one {# place for blocks} other {# places for blocks}}' },
    inRoom: /*i18n*/ { id: 'library.inRoom', message: 'goes in a room' },
    onScreen: /*i18n*/ { id: 'library.onScreen', message: 'goes on the screen, beside rooms' },
    themeFact: /*i18n*/ { id: 'library.themeFact', message: 'colour and type for the inside of a room' },
    open: /*i18n*/ { id: 'library.open', message: 'open', comment: 'Marginalia on a board: writes open:<board> in the bar' },
    openHelp: /*i18n*/ { id: 'library.openHelp', message: 'Writes open:{board} in the bar', comment: 'open: and the board stay English' },
    featureWebSearch: /*i18n*/ { id: 'library.featureWebSearch', message: 'web search' },
    featureVoice: /*i18n*/ { id: 'library.featureVoice', message: 'voice input' },
    featureAttach: /*i18n*/ { id: 'library.featureAttach', message: 'file attach' },
    aboutAlmanac: /*i18n*/ { id: 'library.aboutAlmanac', message: 'Everything you have made, in one table, by number.' },
    aboutCollection: /*i18n*/ { id: 'library.aboutCollection', message: 'Things set side by side to compare, ask about, or apply.' },
    aboutLibrary: /*i18n*/ { id: 'library.aboutLibrary', message: 'Rooms, layouts, blocks, themes and resources. The board you are reading now.' },
    aboutDocket: /*i18n*/ { id: 'library.aboutDocket', message: 'Prompts set out in branches and steps, to run together.' },
    aboutReflection: /*i18n*/ { id: 'library.aboutReflection', message: 'Reads a chat and its markings back to you.' },
    aboutSettings: /*i18n*/ { id: 'library.aboutSettings', message: 'Keys, languages, your data, and how things behave.' },
    shown: /*i18n*/ { id: 'library.shown', message: '{shown} of {all}', comment: 'How many items show while one shelf is chosen' },
    emptyShelf: /*i18n*/ { id: 'library.emptyShelf', message: 'Nothing on this shelf yet.' },
    loading: /*i18n*/ { id: 'library.loading', message: 'Reading the shelves' },
  },

  // The key panel api: opens under the bar (stage 5, piece 5; settings spec
  // §6; Settings v1). {provider} is a name from the list of providers;
  // {ending} a key's last four characters.
  keys: {
    label: /*i18n*/ { id: 'keys.label', message: 'Your keys' },
    heading: /*i18n*/ { id: 'keys.heading', message: 'API keys' },
    promise: /*i18n*/ { id: 'keys.promise', message: 'Encrypted in this browser. Each goes only to its own provider.' },
    needs: /*i18n*/ { id: 'keys.needs', message: 'needs a key' },
    ends: /*i18n*/ { id: 'keys.ends', message: 'key ends {ending}' },
    endsHeld: /*i18n*/ { id: 'keys.endsHeld', message: 'key ends {ending}, for this tab only' },
    replace: /*i18n*/ { id: 'keys.replace', message: 'replace' },
    add: /*i18n*/ { id: 'keys.add', message: 'add one' },
    fieldLabel: /*i18n*/ { id: 'keys.fieldLabel', message: '{provider} key' },
    placeholder: /*i18n*/ { id: 'keys.placeholder', message: 'paste a key' },
    placeholderNew: /*i18n*/ { id: 'keys.placeholderNew', message: 'paste the new key' },
    save: /*i18n*/ { id: 'keys.save', message: 'Save' },
    checking: /*i18n*/ { id: 'keys.checking', message: 'Checking' },
    checkThenKeep: /*i18n*/ { id: 'keys.checkThenKeep', message: 'Save checks it with {provider} first, with one short request, then keeps it encrypted in this browser.' },
    checkThenHold: /*i18n*/ { id: 'keys.checkThenHold', message: 'Save checks it with {provider} first, with one short request, then holds it for this tab only.' },
    problemEmpty: /*i18n*/ { id: 'keys.problemEmpty', message: 'Paste the key first.' },
    problemInvalid: /*i18n*/ { id: 'keys.problemInvalid', message: '{provider} did not accept this key. Check it, and paste it again.' },
    problemBilling: /*i18n*/ { id: 'keys.problemBilling', message: '{provider} knows this key, but its account may be out of credit.' },
    problemUnreached: /*i18n*/ { id: 'keys.problemUnreached', message: 'The check did not reach {provider}. Nothing was kept.' },
    keysPage: /*i18n*/ { id: 'keys.keysPage', message: '{provider}\'s key page', comment: 'A link to the page where the provider makes and revokes keys' },
    ownKey: /*i18n*/ { id: 'keys.ownKey', message: 'is where to make one for Parliament alone, with its own spending limit, and to revoke one that leaks.', comment: 'Follows the link to the key page, in one sentence' },
    noKeyNeeded: /*i18n*/ { id: 'keys.noKeyNeeded', message: '{count, plural, one {{names} needs no key.} other {{names} need no key.}}' },
    foot: /*i18n*/ { id: 'keys.foot', message: 'Escape goes back to the bar. If a key leaks, revoke it at its provider, and paste a new one here.' },
  },

  // The catalogue's words (C131, the plain-language pass): what the Library
  // calls each block, layout and theme, and what it says about each, keyed
  // by the name in its manifest. The manifests keep their own English for
  // the code; these are what people read, and what is translated.
  blocks: {
    'messages': /*i18n*/ { id: 'block.messages', message: "Messages" },
    'input': /*i18n*/ { id: 'block.input', message: "Input" },
    'toc': /*i18n*/ { id: 'block.toc', message: "Table of contents" },
    'highlights': /*i18n*/ { id: 'block.highlights', message: "Keywords" },
    'notes': /*i18n*/ { id: 'block.notes', message: "Notes" },
    'branches': /*i18n*/ { id: 'block.branches', message: "Branches" },
    'context': /*i18n*/ { id: 'block.context', message: "Context health" },
    'collab-mode': /*i18n*/ { id: 'block.collab-mode', message: "Frameworks" },
    'review': /*i18n*/ { id: 'block.review', message: "Review" },
    'file-shelf': /*i18n*/ { id: 'block.file-shelf', message: "File shelf" },
    'chart-canvas': /*i18n*/ { id: 'block.chart-canvas', message: "Chart canvas" },
    'table-canvas': /*i18n*/ { id: 'block.table-canvas', message: "Table canvas" },
    'summary-dashboard': /*i18n*/ { id: 'block.summary-dashboard', message: "Summary dashboard" },
    'column-inspector': /*i18n*/ { id: 'block.column-inspector', message: "Column inspector" },
    'document-canvas': /*i18n*/ { id: 'block.document-canvas', message: "Document canvas" },
    'claude-comments': /*i18n*/ { id: 'block.claude-comments', message: "Comments" },
    'ripple-analysis': /*i18n*/ { id: 'block.ripple-analysis', message: "Ripple analysis" },
  },
  blocksAbout: {
    'messages': /*i18n*/ { id: 'blockAbout.messages', message: "The conversation, each message with its own actions." },
    'input': /*i18n*/ { id: 'blockAbout.input', message: "The message box, with send and stop, attachments, and web search." },
    'toc': /*i18n*/ { id: 'blockAbout.toc', message: "The conversation’s headings, to jump to any point in it." },
    'highlights': /*i18n*/ { id: 'blockAbout.highlights', message: "Words and phrases lit wherever they appear in the chat, each in its colour. A click jumps between them." },
    'notes': /*i18n*/ { id: 'blockAbout.notes', message: "Notes on the chat, or on one message. They are never sent." },
    'branches': /*i18n*/ { id: 'blockAbout.branches', message: "The ways a chat has forked, with where each began, and a place to start a new one." },
    'context': /*i18n*/ { id: 'blockAbout.context', message: "How much of the model’s context the chat has used, with a warning as it nears the limit." },
    'collab-mode': /*i18n*/ { id: 'blockAbout.collab-mode', message: "Standing instructions that shape how replies come back, sent with each prompt." },
    'review': /*i18n*/ { id: 'blockAbout.review', message: "The chat drawn together from the highlights, notes, favourites and pins you choose." },
    'file-shelf': /*i18n*/ { id: 'blockAbout.file-shelf', message: "Data files in this room, such as spreadsheets, and which of them the model may read." },
    'chart-canvas': /*i18n*/ { id: 'blockAbout.chart-canvas', message: "Charts drawn from the data you have open: bars, lines, areas, scatter and pie." },
    'table-canvas': /*i18n*/ { id: 'blockAbout.table-canvas', message: "The data you have open, as a table to sort and page through." },
    'summary-dashboard': /*i18n*/ { id: 'blockAbout.summary-dashboard', message: "Headline figures, gaps in the data, and insights you ask for, about the data you have open." },
    'column-inspector': /*i18n*/ { id: 'blockAbout.column-inspector', message: "Each column of your data: its type, its empty cells, and sample values." },
    'document-canvas': /*i18n*/ { id: 'blockAbout.document-canvas', message: "A page to write on, with tracked changes and a menu on /. Submitting the draft starts a new branch and keeps this version." },
    'claude-comments': /*i18n*/ { id: 'blockAbout.claude-comments', message: "A thread of comments for each paragraph, in the margin. Select text to comment; the model answers when you submit the draft." },
    'ripple-analysis': /*i18n*/ { id: 'blockAbout.ripple-analysis', message: "Finds where one part of a draft no longer agrees with another, here and in other chats, when you submit it." },
  },
  layouts: {
    'three-panel': /*i18n*/ { id: 'layout.three-panel', message: "Three panels" },
    'canvas-centric': /*i18n*/ { id: 'layout.canvas-centric', message: "Canvas in the middle" },
    'document-centric': /*i18n*/ { id: 'layout.document-centric', message: "Document in the middle" },
    'single-column-with-sheet': /*i18n*/ { id: 'layout.single-column-with-sheet', message: "One column and a sheet" },
    'reading-pane': /*i18n*/ { id: 'layout.reading-pane', message: "Reading pane" },
    'split-view': /*i18n*/ { id: 'layout.split-view', message: "Split view" },
  },
  layoutsAbout: {
    'three-panel': /*i18n*/ { id: 'layoutAbout.three-panel', message: "Two side panels with the conversation between them. For work where a lot stays in view." },
    'canvas-centric': /*i18n*/ { id: 'layoutAbout.canvas-centric', message: "Charts, tables or a dashboard in the middle, with a side panel and the chat. For working with data and files." },
    'document-centric': /*i18n*/ { id: 'layoutAbout.document-centric', message: "A document you edit, with notes in its margin. For writing and editing." },
    'single-column-with-sheet': /*i18n*/ { id: 'layoutAbout.single-column-with-sheet', message: "One column, with a sheet that slides up for the rest. Made for phones and touch." },
    'reading-pane': /*i18n*/ { id: 'layoutAbout.reading-pane', message: "A wide reading area with a panel for notes beside it. For reading closely." },
    'split-view': /*i18n*/ { id: 'layoutAbout.split-view', message: "Two panes side by side, to compare two chats or pair a chat with a document." },
  },
  themes: {
    'parliament': /*i18n*/ { id: 'theme.parliament', message: "Parliament" },
    'cool-bright': /*i18n*/ { id: 'theme.cool-bright', message: "Cool bright" },
    'deep-calm': /*i18n*/ { id: 'theme.deep-calm', message: "Deep calm" },
    'soft-violet': /*i18n*/ { id: 'theme.soft-violet', message: "Soft violet" },
    'fresh-teal': /*i18n*/ { id: 'theme.fresh-teal', message: "Fresh teal" },
    'amber-glow': /*i18n*/ { id: 'theme.amber-glow', message: "Amber glow" },
  },
  themesAbout: {
    'parliament': /*i18n*/ { id: 'themeAbout.parliament', message: "Warm white with dusty gold accents. Parliament's own." },
    'cool-bright': /*i18n*/ { id: 'themeAbout.cool-bright', message: "Cool whites with a vivid blue accent. Crisp, and high in contrast." },
    'deep-calm': /*i18n*/ { id: 'themeAbout.deep-calm', message: "Dark and quiet: calm slate with a sage blue accent." },
    'soft-violet': /*i18n*/ { id: 'themeAbout.soft-violet', message: "Pale lavender with a violet accent. Gentle." },
    'fresh-teal': /*i18n*/ { id: 'themeAbout.fresh-teal', message: "Pale teal with a bright teal accent. Light and open." },
    'amber-glow': /*i18n*/ { id: 'themeAbout.amber-glow', message: "Warm cream with a rich amber accent." },
  },
  templatesAbout: {
    'writing-studio@1.0': /*i18n*/ { id: 'templateAbout.writing-studio@1.0', message: "A chat with notes, keywords and branches close at hand. For long writing that goes back and forth." },
    'data-workspace@1.0': /*i18n*/ { id: 'templateAbout.data-workspace@1.0', message: "Charts and tables beside a chat for analysis. Bring in a spreadsheet and ask what is in it." },
    'drafting-desk@1.0': /*i18n*/ { id: 'templateAbout.drafting-desk@1.0', message: "Write documents with tracked changes and comments in the margin, and find where a draft no longer agrees with itself." },
    'pocket-chat@1.0': /*i18n*/ { id: 'templateAbout.pocket-chat@1.0', message: "A focused chat for phones, with keywords, branches and review in a sheet that slides up." },
    'quiet-room@1.0': /*i18n*/ { id: 'templateAbout.quiet-room@1.0', message: "Just a chat, with nothing else in the way. For when the work is the conversation." },
    'kingfisher@1.0': /*i18n*/ { id: 'templateAbout.kingfisher@1.0', message: "A wide reading surface for long documents and research, with room for notes down the side. For reading more than chatting." },
    'starling@1.0': /*i18n*/ { id: 'templateAbout.starling@1.0', message: "Two equal panes side by side: two chats, or a chat and a document." },
  },

  // inspect: one thing in detail, under the bar (stage 5, piece 3; v30's peek).
  inspect: {
    created: /*i18n*/ { id: 'inspect.created', message: 'created {day}' },
    active: /*i18n*/ { id: 'inspect.active', message: 'last active {ago}' },
    openChat: /*i18n*/ { id: 'inspect.openChat', message: 'open:{num} brings it beside what is here. Escape closes this' },
    close: /*i18n*/ { id: 'inspect.close', message: 'Escape closes this' },
    label: /*i18n*/ { id: 'inspect.label', message: '{num} in detail' },
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
    // The edge between two columns (C126). {first} and {second} are what stands on either side.
    edge: /*i18n*/ { id: 'shell.edge', message: 'Width between {first} and {second}', comment: 'Read aloud for the stretchable edge between two boards' },
    edgeHelp: /*i18n*/ { id: 'shell.edgeHelp', message: 'Drag to share the width. A double click puts both back' },
    edgeRoom: /*i18n*/ { id: 'shell.edgeRoom', message: 'the room', comment: 'A room, named mid-sentence beside an edge' },
    edgeWelcome: /*i18n*/ { id: 'shell.edgeWelcome', message: 'the welcome page', comment: 'The welcome card, named mid-sentence beside an edge' },
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
