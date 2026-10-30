# Doubts in the Swedish draft

Each: id, the English, the draft, and why I was unsure.

1. **backup.typeReplace**
   English: Type replace to go on
   Draft: Skriv replace för att fortsätta
   Why: the typed word is in the sentence, with no id of its own (erase has erase.word, translated "radera"). I kept "replace" in case the code compares against the English word. If the word can be translated, it should become "ersätt" here and in the code.
   Settled: chunk 13 added backup.replaceWord, drafted "ersätt", and backup.typeReplace is now "Skriv {word} för att fortsätta".

2. **Example values inside commands** (enter.nameEmpty, enter.headingEmpty, enter.saveName, enter.frameworkNeeds, frameworkPicker.noneYet)
   English: name:"Barn owls", heading:"Causes", save:"Owls this week", new:framework "brief" "keep each answer short", new:framework "name" "what it asks"
   Draft: name:"Tornugglor", heading:"Orsaker", save:"Ugglor i veckan", new:framework "kort" "håll varje svar kort", new:framework "namn" "vad det ber om"
   Why: the verbs stay English, but the quoted words are the person's own text, so I translated them. A strict reading of "keep commands character for character" would keep them English.

3. **kind.highlight, collection.tabHighlight and the collective "marking"**
   English: Highlight / Highlights; markings
   Draft: Markering / Markeringar; markeringar
   Why: Swedish reading apps call highlights "markeringar", and that is also the natural collective word. So one word covers both the whole and one of its kinds. No single string uses both. The alternatives ("överstrykning", "färgmarkering") are worse.

4. **collection.by**
   English: by
   Draft: efter
   Why: I read it as a sort label beside "date", "source" and "your order" (sorted by). If it introduces an author ("by Opus"), it should be "av".

5. **enter.nextStep**
   English: next: {command}
   Draft: nästa: {command}
   Why: no next: command exists, so I read "next:" as a label in front of the step's command and translated it. If it is meant as a typed token, it should stay "next:".

6. **framework.challenge**
   English: Challenge artifacts
   Draft: Ifrågasätt underlaget
   Why: I read "artifacts" as what the model is given (documents, claims, drafts), per its description "Question what it is given". If it means something narrower, the word should change.

7. **verb.markup**
   English: Show replies marked up, or clean
   Draft: Visa svar med formatering, eller utan
   Why: I read "marked up" as formatting. If it means replies shown with their highlights, notes and keywords, it should be "Visa svar med markeringar, eller rena".

8. **blockAbout.review**
   English: …from the highlights, notes, favourites and pins you choose.
   Draft: …ur de markeringar, anteckningar, favoriter och citat du väljer.
   Why: I took "pins" to be the older word for quotes, as in backup.fileHolds, where {pins} counts quotes.

9. **keysData.optOut**
   English: …in its admin panel, Privacy, then Anonymous improvement data.
   Draft: …i administrationspanelen, under Privacy och sedan Anonymous improvement data.
   Why: kept the provider's own menu names in English, since that is what its panel shows. Worth checking whether the provider has a Swedish interface.

10. **library.pillMine**
    English: yours
    Draft: ditt
    Why: the pill must agree with what it sits on. "ditt" fits rum, block and tema; on a layout it would need "din". A neutral "eget" has the same problem.

11. **branches.carried**
    English: carried on
    Draft: fortsätts
    Why: a terse label below the tabs. I could not see where it sits; "fortsätter härifrån" may read better.

12. **enter.costBad**
    English: cost: takes an amount, like >0.50, <1 or 0.18
    Draft: cost: tar ett belopp, som >0.50, <1 eller 0.18
    Why: kept decimal points because these are typed values. Swedish prose would use a comma; if the parser accepts "0,50", the example could show that.

13. **enter.dateBad**
    English: {verb} takes 7d, 3w, a month, or a date like 2026-09-01
    Draft: {verb} tar 7d, 3w, en månad eller ett datum som 2026-09-01
    Why: if "a month" means a typed month name the parser reads in English ("september"), the example should show that form instead.

14. **welcome.now**
    English: Now, let’s {command}   ({command} is focus:)
    Draft: Nu kör vi {command}
    Why: the English pun ("let's focus") cannot carry over. "Nu kör vi" means "let's go" and also "now we run", which suits a command.

15. **template.kingfisher, template.starling**
    English: Kingfisher, Starling
    Draft: Kungsfiskare, Stare
    Why: translated the bird names, as the other templates are translated. If they are meant as fixed names, they should stay English.

16. **copy.exportedOn, backup.fileIs**
    English: Exported from Parliament on {day}. / …a Parliament backup from {day}.
    Draft: Exporterad från Parliament {day}. / …säkerhetskopia från Parliament, gjord {day}.
    Why: Swedish puts "den" before a date ("den 23 oktober"). I left it out so the line works whatever format {day} takes; if {day} is always a day and month, "den {day}" reads better.

17. **chat.writtenUnder**
    English: Written under {names}
    Draft: Skrivet enligt {names}
    Why: the inserted names are imperatives ("Visa resonemang", "Säg emot mig"). "Skrivet enligt Visa resonemang" reads a little oddly unless the names are set off on screen.

18. **settings.leaveApp**
    English: Your browser fetches Parliament’s files from parliament.ltd, hosted by Netlify. Like any web host it sees your IP address and browser type. It never receives your chats or keys.
    Draft: Din webbläsare hämtar Parliaments filer från parliament.ltd, som ligger hos Netlify. Som alla webbhotell ser Netlify din IP-adress och typ av webbläsare. Det får aldrig dina chattar eller nycklar.
    Why: the English "it" is the web host. Swedish needed a clear subject, so I named Netlify in the second sentence, and "Det" in the third refers back to it. The claim is unchanged, but please confirm that "it" means Netlify and not parliament.ltd in general.
    Settled: "it" is the web host, Netlify; the draft stands.

19. **settings.leavesFoot**
    English: …A new one appears there and in the published policy before it can be used.
    Draft: …En ny visas där och i den publicerade policyn innan den kan användas.
    Why: kept "policyn" as unspecific as the English. If it means the privacy policy, "integritetspolicyn" is the word a Swedish reader expects; I did not add it, since the English does not say so.
    Settled: the English now reads "the security policy the site publishes" (the Content-Security-Policy); the draft is now "i den säkerhetspolicy som webbplatsen publicerar".

20. **Passkey → inloggningsnyckel** (lock.addPasskey, lock.passkey, lock.step3Help and others)
    English: passkey
    Draft: inloggningsnyckel
    Why: it does not clash with "nyckel" (API key) and is Apple's Swedish word. But it is long, and it says "login" where Parliament means unlocking. The loanword "passkey" is also common in Swedish and shorter; if Stefan prefers it, it is a straight swap.

21. **Recovery code → återställningskod** (lock.codeLabel, lock.step2Title and others)
    English: recovery code; there is no server to reset it
    Draft: återställningskod; det finns ingen server som kan återställa det
    Why: the natural Swedish words, but they reuse "återställ", which elsewhere means restoring a backup. "reservkod" would keep the words apart; for "reset it", "nollställa" is possible but less natural.

22. **"shown once"** (lock.newCodeShown, lock.step2Help)
    English: The new recovery code, shown once. / it is shown once, here.
    Draft: …som visas en gång. / …den visas en gång, här.
    Why: natural Swedish would say "bara en gång", but that adds "only", which the English does not have. "visas en gång" is exact, and a little less emphatic to a Swedish ear.

23. **lock.idleLabel with lock.idleTab**
    English: Locks when idle for / until the tab closes
    Draft: Låses efter inaktivitet i / tills fliken stängs
    Why: the three time choices follow the label well ("Låses efter inaktivitet i 15 minuter"). "tills fliken stängs" fits as loosely as the English does; if the choices are read as one sentence, it may need its own wording.

## Stage 10 words, drafted 24 October 2026

24. **"on the {board} board"** (enter.openPlan, enter.planNone, enter.runPaused, settings.runRowHelp and seven others)
    English: Enter opens plan {num} on the {board} board
    Draft: Enter öppnar plan {num} på tavlan {board}
    Why: earlier lines put a board in a sentence as "i {board}" ("i Samlingen"). Here the English adds "board", and "plan 201 i Planen" sets plan and Planen side by side, so I followed the English with "på tavlan Planen". If "i {board}" reads better to you, it is a straight swap in every line.

25. **The statuses** (plan.statusDone, plan.statusPaused, plan.ended)
    English: done / paused / running / waiting; stopped
    Draft: klart / pausat / körs / väntar; stoppat
    Why: the same word sits beside a step (steg, neuter) and a branch (gren, common). The neuter fits the steps and reads as an impersonal "det är klart" beside a branch; "klar", "pausad" would suit the branch only. "körs" and "väntar" need no ending.

26. **hold: and held** (enter.planHoldOn, enter.planHoldAlready, enter.planHoldNot, plan.held, enter.runHeld)
    English: Enter holds {nums} in run {run}. / Held already: {nums} / {count} held
    Draft: Enter håller kvar {nums} i körning {run}. / Hålls redan kvar: {nums} / # hålls kvar
    Why: "hålla kvar" matches verb.hold from the first drafts, and the passive needs no agreement. "# hålls kvar" in the board's margin is a little wordy; "på vänt" ("2 på vänt", "Enter sätter 201c på vänt") is shorter and as clear, but would mean changing verb.hold too.

27. **enter.diffOn**
    English: Enter sets run {other} beside run {run}, marking in ink what differs
    Draft: Enter ställer körning {other} bredvid körning {run} och markerar skillnaderna med bläck
    Why: "med bläck" is literal. If "ink" names the page's colour rather than a manner, a Swedish reader may not catch it; "med mörk färg" or dropping the phrase are the alternatives.

28. **picker.togetherHelp**
    English: One reply from each, in a slider, in the numbered order.
    Draft: Ett svar från var och en, att bläddra mellan, i den numrerade ordningen.
    Why: no Swedish word for the slider was settled earlier; "karusell" is the web designer's word but reads oddly here. I described what it does instead.

29. **enter.runPausedOnly**
    English: {nums} paused, so run: alone leaves it. run:{example} carries on from where it stopped
    Draft: {nums} pausade, så run: ensamt låter den vara. run:{example} fortsätter där den stannade
    Why: "run: alone" has no settled wording; "ensamt" (agreeing with the command as neuter) is the shortest. "run: utan adress" would say what is meant, but adds a word the English does not use.

30. **"one after another"** (picker.sequence, enter.promptManyOrder, enter.runHead, enter.runHeadMany)
    English: One after another
    Draft: En efter en (models and branches); ett i taget (steps)
    Why: "en efter en" is the idiom for who answers, but "ett efter ett" for steps sounds stilted, so steps go "ett i taget". The picker label reads "En efter en" beside "Alla samtidigt".

31. **settings.limitsLabel**
    English: Hard limits
    Draft: Hårda gränser
    Why: literal and understood in a section called Kostnader. "Kostnadstak" or "Spärrgränser" are the alternatives; "kostnadsgräns" is already a key's own limit (keys.ownKey).

32. **enter.deleteEverything**
    English: Delete everything is a button at the foot of {board}. Enter opens it there
    Draft: ”Radera allt” är en knapp längst ned i {board}. Enter öppnar den där
    Why: without quotes "Radera allt är en knapp" reads as an imperative. The English has none; I followed keys.checkThenKeep, which quotes a button (”Spara”).

33. **enter.deleteApart**
    English: Delete what has not been sent on a line of its own
    Draft: Det som inte har skickats raderas på en egen rad
    Why: the English can be read as "what has not been sent on a line of its own". I made it a rule, not an instruction, so "på en egen rad" can only belong to the deleting.

34. **plan.asBranch, picker.asBranch**
    English: as the branch / As the branch, now {name}
    Draft: samma som grenen / Samma som grenen, nu {name}
    Why: "som grenen" alone reads as "like the branch". "samma som grenen" says the step takes the branch's own answerer.

35. **verb.delete**
    English: …What has been sent goes for good, after a second Enter
    Draft: …Det som har skickats försvinner för gott, efter ett andra tryck på Enter
    Why: "ett andra Enter" is how people say it, but which gender a key takes in Swedish is unsettled; "tryck på Enter" sidesteps it at the cost of three words.

## Words added since, drafted 30 October 2026

36. **enter.settleSugDone**
    English: Suggestion {num} was {state} already
    Draft: Förslag {num} är redan {state}
    Why: {state} arrives as the code's own word (accepted, rejected), not through the copy table, so Swedish shows "Förslag 244 är redan accepted". It needs a select in the English ({state, select, accepted {…} other {…}}) or two entries; the translation cannot fix it.
    Settled: the English is now a select; the draft is "{state, select, accepted {Förslag {num} har redan godtagits} other {Förslag {num} har redan avvisats}}".

37. **markup · clean** (room.markupWord, room.cleanWord, collection.markupWord, collection.cleanWord, enter.markupOn and five others)
    English: markup · clean; Enter shows replies marked up / clean
    Draft: ändringar · renskrivet; Enter visar svaren med ändringarna / renskrivna
    Why: Word's Swedish word for markup is "markering", which is taken by highlights. "ändringar" says what is shown, and "renskrivet" is the clean copy. This also settles doubt 7: the older verb.markup draft ("Visa svar med formatering, eller utan") reads wrong now, and should become "Visa svaren med ändringar, eller renskrivna". I left it, as an existing line.
    Settled: verb.markup is now "Visa svaren med ändringar, eller renskrivna".

38. **"told once"** (enter.promptEditsGo, enter.promptTellGo, enter.promptSweepsGo, chat.toldNote)
    English: With it, told once: 2 edits and 1 ask · Sonnet reads them
    Draft: Följer med, en enda gång: 2 redigeringar och 1 fråga · Sonnet läser dem
    Why: no Swedish phrase carries "told" as neatly. "meddelad" is used where the English says "told to {name}". "en gång" alone risks being read with "med" as "med en gång" (at once), so "en enda gång".

39. **Possessives with counts** (enter.promptEditsOnly, enter.promptEditsWait, enter.promptEditsOnlyReader)
    English: just your 2 edits and 1 ask, told to {name}
    Draft: bara 2 redigeringar och 1 fråga meddelas till {name}
    Why: Swedish "din" or "dina" must agree with the count, which the message splits across two plurals. I dropped "your" where there is no total to agree with. enter.promptEditsToReader has {total}, so it keeps "Din" or "Dina".

40. **reflection.proposal**
    English: A proposal
    Draft: Ett förslag
    Why: the natural word, but "förslag" is also a suggestion, and the same board counts "# förslag". "Ett uppslag" is taken by the picker's Reference ("Uppslag").

41. **select → markera** (enter.askKeep, enter.strikeGo, verb.ask and others)
    English: the words you selected in a reply
    Draft: orden du markerade i ett svar
    Why: "markera" is what Swedish editors call selecting text, and verb.strikethrough's draft already uses it. But a highlight is "markering". Where both meet, "välja" is the alternative for selecting.

42. **enter.rippleMissed**
    English: …could not be placed: its words were not found once, unmarked
    Draft: …dess ord hittades inte exakt en gång, så inget markerades
    Why: I read "not found once" as "not found exactly once" (the code places a suggestion only where its words occur once). If it means "not found at all", "exakt" should go.

43. **The slots** (slot.left-rail, slot.right-rail, slot.right-rail-extra, slot.input-dock)
    English: the left rail, the right rail, the lower right rail, the input dock
    Draft: vänsterspalten, högerspalten, nedre högerspalten, inmatningsytan
    Why: "rail" has no Swedish UI word; "spalt" is a side column, and the narrow room's buttons keep "kolumn". "dockan" would read as a doll, so the input dock is "inmatningsytan".

44. **Room names the guide offers** (guide.o.essay, guide.o.thinking, guide.o.dataDesk)
    English: Essay room, Thinking room, Data desk
    Draft: Essärum, Tankerum, Datapulpet
    Why: they become the room's name. "Datapulpet" follows the template "Skrivpulpet"; "Databord" would read as a data table.

45. **enter.arrangeSaveName**
    English: Name it: arrange:save "review desk"
    Draft: Ge den ett namn: arrange:save "granskningsbord"
    Why: a free example name, translated as the ruling says. "granska" is the sweep's verb elsewhere, but inside a name it should not mislead.

46. **enter.rippleNothing**
    English: Ripple carries edits to the other branches of a plan, and this chat has none yet
    Draft: …och den här chatten har inga än
    Why: "none" could be other branches or edits; the Swedish keeps the same ambiguity.

47. **The state after a kept command word** (shell.calmOff, shell.focusOn, room.rippleOff and the rest)
    English: calm: off, focus: on, ripple: off
    Draft: calm: av, focus: på, ripple: av
    Why: the comments keep only the command word English, and field.frameworkNone already reads "framework: inget". If these are meant as the typed form (calm:off), the state should stay English too.

48. **Existing lines whose English has changed since they were drafted** (not touched in this pass)
    Why: the brief was to fill only empty lines, so these still show the older meaning. Most noticeable: welcome.letter.1 to welcome.letter.4 (the old letter), welcome.signature ("So Lov", now "Stef"), welcome.steps ("Åtta saker att prova", now "Things to try"), welcome.step.pop (another screen, now its own window), the key vault lines (settings.private2, settings.private2Head, keys.promise, keys.checkThenKeep, settings.leaveApp, which now name keys.parliament.ltd), verb.duplicate, verb.close, verb.name, verb.strikethrough (its undo: is missing), enter.help and leader.help ("som fungerar här" is gone from the English), settings.aboutWhat, welcome.small. Smaller: enter.popDisplay, languagePicker.foot (a full stop), welcome.step.ask.
    Settled: all 23 redrafted from the English as it is now, on 30 October. enter.popDisplay already read right ("på skärm {display}") and is unchanged.

## The redrafted lines and the start card, 30 October 2026

49. **board.start**
    English: Start
    Draft: Start
    Why: boards are named in their definite forms, but "Starten" reads as the start of a race, and "Startkortet" is clumsy. "Start" is the established Swedish label, as "Inställningar" is the exception for Settings. board.oneRoom follows the rule: "Rummet".

50. **Key vault and key store** (keys.promise, keys.checkThenKeep, settings.private2, settings.private2Head; keys.vaultUnreached, enter.promptVaultUnreached)
    English: the key vault; the key store did not open
    Draft: nyckelvalvet; nyckelförrådet öppnades inte
    Why: the English uses two words for the one thing, so the Swedish does too. If they should read as one, "nyckelvalvet" can replace "nyckelförrådet" in the two error lines.

51. **The letter** (welcome.letter.1 to welcome.letter.4)
    English: an app that hopes to empower through active participation; drinking from a fire hose; make the code accessible… turn it into a novel
    Draft: en app som hoppas ge egenmakt genom aktivt deltagande; dricka ur en brandslang; göra koden mer lättillgänglig… göra en roman av den
    Why: kept in Stefan's own informal voice, signed "Stef". "egenmakt" is the Swedish word for empowerment, but it reads a little formal. The fire hose is a calque that Swedish tech people say, not a native idiom. "lättillgänglig" keeps the joke, since it means both easy to reach and easy to read.

52. **welcome.letter.4 and the workspace**
    English: so the workspace is yours
    Draft: så arbetsutrymmet är ditt
    Why: "arbetsytan" would be the natural word, but it is the Lab's Canvas board (Arbetsytan).

## Step 9, drafted 30 October 2026 (C282)

- `welcome.step.highlight` and `welcome.step.highlightHow` were drafted by the lead session, not the language drafter, from the glossary's words for note, highlight and Collection. Worth a read with the rest.
