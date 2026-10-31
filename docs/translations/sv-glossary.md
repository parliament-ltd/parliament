# Swedish glossary (sv draft)

One line per term: English → Swedish, with the reason where it was a hard choice.

## Places and things on screen
- the bar → fältet. Swedish interfaces render "bar" as "-fält" (sökfältet, adressfältet, aktivitetsfältet); "listen" or "raden" read wrong. Used everywhere: "Skriver open:201 i fältet", "Fältet är fritt under tiden".
- key field → nyckelrutan. Kept apart from "fältet" so "Keys go in their own field, never the bar" reads "Nycklar skrivs i en egen ruta, aldrig i fältet". "ruta" is used only for input boxes (nyckelruta, meddelanderuta).
- the Enter line → Enter-raden; the line under the bar → raden under fältet.
- the command line → kommandoraden.
- board → tavla (tavlan, tavlor). As in Swedish kanban tools; "panel" is taken by the layouts' panels.
- board names, also as {board} values → definite forms used as names, capitalised: Records → Registret, Collection → Samlingen, Library → Biblioteket, Plan → Planen, Lab → Labbet, Reflection → Reflektionen, Rooms → Rummen, Blocks → Blocken, Canvas → Arbetsytan, Welcome page → Välkomstsidan. Settings → Inställningar (the established Swedish name, never "Inställningarna"). Definite forms read naturally both as a heading and mid-sentence ("Enter stänger Samlingen"), so no placeholder ever needs an ending; the capital tells the board apart from a collection.
- Records → Registret. A numbered table of everything made; "Arkivet" would clash with archive (in:archive).
- room → rum (rummet, rum); a room of its own → ett eget rum; unnamed room → namnlöst rum.
- arrangement → uppställning.
- layout → layout; template → mall; theme → tema; block → block; shelf → hylla.
- canvas (in block names) → -yta (Diagramyta, Dokumentyta, Tabellyta); the Lab's Canvas board → Arbetsytan.
- pane / panel → panel (Läspanel, Tre paneler, sidopanel).
- window → fönster; pop out → lägga i ett eget fönster; pop back → ta tillbaka till sidan.
- beside what is here / on screen → bredvid det som visas.
- point the bar at → rikta fältet mot; the bar is pointed at → fältet pekar på.

## Chats and what is in them
- chat → chatt (chattar).
- plan (older word docket) → plan (planer).
- branch → gren (grenar); branch from → grena från; fork → grena sig.
- carry on (a branch) → fortsätta ("Chatten fortsätter från 201a").
- line (that a chat carries on) → linje.
- prompt → prompt (prompten, promptar).
- reply and answer → svar, both. Swedish has one word; context separates a model's reply from a source's answer.
- ask (again) → fråga (igen); kind "Ask" → Fråga.
- marking (notes, keywords, quotes, favourites together) → markering (markeringar).
- highlight (one passage marked where it sits) → markering as well. Reading apps in Swedish call highlights "markeringar", and "överstrykning" also means crossing out. Hard choice: the same word covers the collective and one kind (see doubts).
- note → anteckning; keyword → nyckelord; quote → citat (verb: citera); favourite → favorit; collection → samling.
- tag → tagg (verb tagga: "taggar 207 med …"); pin → fästa; unpin → lossa; pinned → fäst.
- card → kort; row → rad; step → steg; run → körning; heading → rubrik.
- saved search → sparad sökning; forget (a saved search, a collection) → glömma.
- framework → ramverk (ramverket, ramverk). Hard choice: "hållning" (stance) or "riktlinje" (guideline) are softer, but "ramverk" matches framework: and reads as a set of guiding principles. Built in → Inbyggda; yours → Dina.
- thinking → tänka / tänkandet; shown as it goes → synligt medan det pågår.

## Models, providers, sources
- model → modell; provider → leverantör; source → källa (källor).
- key → nyckel; API key → API-nyckel.
- helper → hjälpreda. "Hjälpmodell" would make "The helper is a model" circular, and "assistent" sounds like a chat assistant.
- call (to a model) → anrop; one model call → ett modellanrop.
- token → token, plural tokens (as Swedish tech writing uses it).
- cost marks (×15) → kostnadsmärken. Not "markeringar", which is taken.
- preview (model) → förhandsversion.
- on this computer / on your machine → på den här datorn / på din dator.
- Ollama → treated as neuter ("det"), as a program: "Körs det?".
- trained on → tränas på; opt out → avböja.

## Data, safety, removal
- backup → säkerhetskopia; back up → säkerhetskopiera.
- restore / bring back (a backup) → återställ. Used only for backups.
- reset / as shipped → ställa tillbaka som från början. Kept apart from "återställ" so restore and reset never share a word.
- undo / take back → ångra; Undo as the function → Ångra.
- erase, delete → radera; remove → ta bort; archive → arkivera; for good → för gott.
- the privacy filter → integritetsfiltret; placeholder → platshållare; swap → byta ut.
- marked as data → märkt som data; instructions to a model → instruktioner till en modell; read like → ser ut som.
- encrypted → krypterad; password → lösenord.
- browser → webbläsare; tab → flik; device → enhet; site → webbplats.
- the browser has agreed to keep it → webbläsaren har lovat att behålla det.

## Lock Parliament
- the lock → låset; lock (verb) → låsa; locked → låst; Lock now → Lås nu.
- unlock → låsa upp; Unlock (button) → Lås upp.
- passphrase → lösenfras (lösenfrasen, lösenfraser). The usual Swedish word, distinct from lösenord (the password on a backup).
- recovery code → återställningskod. The word Swedish account screens use; "reservkod" (Google's word for backup codes) is the alternative. Here "återställa" means recovering access ("ingen server som kan återställa det"), not restoring a backup; putting the screen back as shipped stays "ställa tillbaka".
- passkey → inloggningsnyckel (inloggningsnycklar). Apple's Swedish word, always written in full so it is never read as "nyckel", which is an API key.
- password manager → lösenordshanterare.
- idle → inaktivitet: "Låses efter inaktivitet i" followed by 15 minuter, 1 timme, 8 timmar, tills fliken stängs.
- set up (the lock) → ställa in; turn off → stänga av; encrypt / decrypt → kryptera / dekryptera.
- nothing can open it → ingenting kan öppna det; there is no server to reset it → det finns ingen server som kan återställa det.

## Plans and running (stage 10, drafted 24 October 2026)
- on the {board} board → på tavlan {board} ("Enter öppnar plan 201 på tavlan Planen"). Elsewhere a board in a sentence is just "i {board}", but these lines say "plan {num}" next to the board's name, and "plan 201 i Planen" blurs the two; the apposition keeps {board} in base form.
- run {n} of plan {num} → körning {n} av plan {num}; run 1 of 2 → körning 1 av 2; step {i} of {address} → steg {i} i {address} (a branch holds its steps, so "i", not "av").
- make (a plan, a run: new:) → skapa, as verb.new; with nothing in it → utan innehåll.
- condition → villkor; met → uppfyllt ("om dess villkor är uppfyllt"); was not met → uppfylldes inte; did not run → kördes inte.
- the one before (a model or source) → den föregående; the step before → föregående steg. finishes → är klar (klart for a step); fails → misslyckas; if nothing is found → om inget hittas; whatever happens → vad som än händer.
- one after another → en efter en, for models and branches; for steps → ett i taget ("ett steg i taget" is the idiom). Picker labels: One after another → En efter en; All at once → Alla samtidigt (as "samtidigt" in enter.byMost); Order → Ordning.
- hold (hold:) → hålla kvar; held → hålls kvar; let go → släppa. Matches verb.hold ("Håll kvar en gren") and the held answers of include: ("svaret som hålls kvar"); the passive "hålls kvar" needs no agreement with a placeholder ("Hålls redan kvar: {nums}", "2 hålls kvar"). "på vänt" was the alternative.
- statuses → klart, pausat, körs, väntar. Neuter, since most sit beside a step (steg) and the neuter also reads as the impersonal "det är klart" beside a branch. In sentences, "paused" is the past tense: "{nums} pausade".
- stop, halt (stop:) → stoppa; stopped (why a step paused) → stoppat. The older "avbrutet" (branches.stopped) stays for a reply cut off by leaving.
- what is done stays done and paid for → det som är gjort förblir gjort och betalt.
- fixed (a started step's prompt) → ligger fast. Not "låst", which is the lock's word.
- an earlier run, kept as it was → en tidigare körning, bevarad som den var.
- as the branch (who answers a step) → samma som grenen. "som grenen" alone reads as "like the branch".
- step list (the block) → Steglista.
- a second Enter → ett andra tryck på Enter; Enter again (arming a delete) → Enter en gång till; Enter, then Enter again → Enter och sedan Enter igen.
- spending → kostnader, as the Settings section "Kostnader"; a chat on its own → fristående chatt (as "fristående anteckning").
- warn before a costly run → varna före en dyr körning; costly → dyr.
- hard limits → Hårda gränser; a monthly limit → en månadsgräns; a cap → ett tak. "kostnadsgräns" is taken by keys.ownKey for a key's own limit.
- marked in ink (what differs) → markerat med bläck. Ink is the page's dark colour; see doubts.

## Conventions
- Commands, their keyword arguments (all, room, collection, search, the sort and type words, the Settings section names) and leaders stay English, character for character.
- Free-text example values inside commands are translated (name:"Tornugglor", heading:"Orsaker", save:"Ugglor i veckan"); see doubts.
- Keys stay as written: Enter, Escape, Tab. "Enter …" opens most Enter-line sentences: "Enter öppnar …".
- Quotation marks ”…”; decimal comma in prose (1,1 gånger priset); typed values keep their ASCII form (>0.50).
- Placeholders always stand in base form; adjectives that would agree with a {board} or {name} are avoided ("{board} visas inte", not "är inte öppen").

## Editing, the Lab and screens (drafted 30 October 2026)
- edit (a card: words struck or typed in a reply or prompt) → redigering (redigeringar), as kind.edit. "Struck as edit 242" → "Genomstruket som redigering 242".
- ask (an instruction tied to a passage) → fråga (frågor), as kind.ask; its marker "ask 241" → "fråga 241"; the ask box → frågerutan; the box's label ASK → FRÅGA.
- suggestion → förslag; accept → godta (godtaget for a suggestion, godtagen for an ask); reject, turn down → avvisa (avvisat); settle (accept: or reject:) → avgöra.
- sweep → granskning; to sweep → granska, as verb.sweep; "sweep 201a as Editor" → "granska 201a enligt Editor", as chat.writtenUnder ("Skrivet enligt"). The marker "sweep 245" → "granskning 245".
- review (the review bar over suggestions) → genomgång. Kept apart from granska, which is the sweep.
- Ripple → Ripple, kept as a name, since its command is ripple: and the English capitalises it; its marker stays "ripple 244"; Ripple's suggestion → Ripples förslag, or förslag från Ripple. Its state is "på" or "av", so it needs no gender.
- tell, told (to a model) → meddela, meddelad ("meddelad till {name}"). Told once → en enda gång; never "med en gång", which means at once. The Enter line's "With it, told once:" → "Följer med, en enda gång:".
- hold back (an edit) → hålla kvar, as for plans and verb.hold; "held back: stays yours" → "hålls kvar: stannar hos dig"; let it go → släpp den.
- strike, struck → stryka igenom, genomstruken (genomstruket), as compare.legend and verb.strikethrough.
- select (words in a reply) → markera, as Swedish editors say it. Context keeps it apart from a highlight (markering); see doubts.
- passage → textavsnitt, as enter.jumpOpen.
- drop (an ask, web search) → ta bort.
- markup · clean → ändringar · renskrivet. "Markering" is Word's word for markup, but it is taken by highlights; "renskrivet" is the clean copy. "Shows replies marked up" → "visar svaren med ändringarna"; "clean" → "renskrivna".
- calm → lugn, lugna ("Enter lugnar skärmen"); focus → fokus (neuter: "det fokuset", "ett fokus").
- The marginalia "calm: off", "focus: on", "ripple: off" keep the command word and translate the state: "calm: av", "focus: på", "ripple: av", as field.frameworkNone ("framework: inget").
- display (a screen by number) → skärm ("Skärm 2"), as enter.popDisplay; popped windows → tavlor i egna fönster.
- a room's slots → platser, as verb.place; each by its definite form, so a sentence needs no ending: vänsterspalten, högerspalten, nedre högerspalten, konversationen, inmatningsytan, arbetsytan, chattpanelen, inspektören, dispositionen, dokumentet, marginalen, bladet. A narrow room's left and right columns → vänster kolumn, höger kolumn.
- built for computer, phone → byggt för dator, mobil; "a phone", "a computer" in the Library's details → en mobil, en dator.
- the guide (the Lab's six questions) → guiden.
- the key store (the key vault, when it does not open) → nyckelförrådet.
- letter (from the maker of Parliament) → brev ("Brev 2", "inte läst än").
- in beta → i beta; coming soon → kommer snart, as library.pillSoon.
- Command menu (a board) → Kommandomenyn, a definite form like the other boards.
- percent written by a block → "{n} %" with a no-break space, as Swedish writes a percentage and as {share, number, percent} already prints it.
- Example names inside commands follow the reader's language, since the Lab matches the names it shows: edit:"Skrivstudio", duplicate:"Skrivstudio", layout:"Tre paneler", tell:"Håll det under en sida", arrange:save "granskningsbord". Names the code fixes stay English: the tag tried, and every keyword argument (desktop, mobile, on, off, right, left, middle, bottom, up, down, search, collection, framework, arrangement, pushback).
- the key vault → nyckelvalvet (Parliaments nyckelvalv, valvet); keys are kept there → förvaras. The error lines' "key store" stays nyckelförrådet, as the English has two words (see doubts).
- the start card (before anything is open) → Start; one room as a board in a sentence → Rummet.
- the welcome letter is Stefan's own voice: first person, informal, "du", signed "Stef".

## Windows of several boards (31 October 2026, C283)
- together in a window of their own (pop: with a list) → tillsammans i ett eget fönster; they share a window → dela ett fönster ("{boards} delar redan ett fönster").
- the window on display {n} (one already there) → fönstret på skärm {n}; move: into it → flytta in i fönstret.
- beside {other} → bredvid {other}; put beside → lägga bredvid. The keyword beside stays English in commands.
- so it opens here (a note after the Enter line) → så fönstret öppnas här. It names the window, so no den or det has to agree with a board.
- full screen / leave full screen (the link in a window's corner) → helskärm / avsluta helskärm, lower case like the English.
- Hints for a keyword (beside, display) are built as compare: is: "tar …, som" and the command.
