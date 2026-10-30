# Doubts in the Finnish draft

Each: id, the English, the draft, and why I was unsure.

1. **backup.typeReplace**
   English: Type replace to go on
   Draft: Jatka kirjoittamalla sana replace
   Why: the typed word sits in the sentence with no id of its own, while Delete everything has erase.word (drafted "poista"). I kept "replace" in case the code compares against the English word. If the word can be translated, it should become "korvaa" here and in the code.
   Settled since: chunk 13 gives the word its own id (backup.replaceWord, "korvaa") and backup.typeReplace now reads "Jatka kirjoittamalla {word}".

2. **Example values inside commands** (enter.nameEmpty, enter.headingEmpty, enter.saveName, enter.frameworkNeeds, frameworkPicker.noneYet)
   English: name:"Barn owls", heading:"Causes", save:"Owls this week", new:framework "brief" "keep each answer short", new:framework "name" "what it asks"
   Draft: name:"Tornipöllöt", heading:"Syyt", save:"Pöllöt tällä viikolla", new:framework "lyhyt" "pidä jokainen vastaus lyhyenä", new:framework "nimi" "mitä se pyytää"
   Why: the verbs stay English, but the quoted words are the person's own text, so I translated them. A strict reading of "keep commands character for character" would keep them English.

3. **enter.noteIn, enter.noteInQuoting, enter.summarize, enter.summarizeCheap, enter.summarizeUnpriced**
   English: Enter writes a note in {name}; Enter writes a summary of {nums} in {name}, dated today…
   Draft: Enter kirjoittaa muistiinpanon kokoelmaan {name}; Enter kirjoittaa kokoelmaan {name} tämän päivän päiväyksellä yhteenvedon…
   Why: Finnish needs a head noun before {name}, and I assumed {name} is a collection's name. If it can also be a chat or a board, "kokoelmaan" should become the neutral "kohteeseen".

4. **Lines with {language} after a head noun** (chat.askedAs, chat.translatedBy, enter.translate, enter.languageSet, enter.promptQueryTranslated, enter.promptQueryUntranslated, enter.promptEdition and others)
   English: Translated into {language}; It reads {language} best
   Draft: Käännetty kielelle {language}; Se lukee parhaiten kieltä {language}
   Why: Finnish would say "suomeksi", which a placeholder cannot do, so "kielelle/kielellä/kieltä {language}" carries the case, as Google's Finnish interface does. It reads well with a lower-case Finnish name ("kielelle suomi") or a native name ("kielelle svenska"). If the names arrive capitalised or in English, it looks odd. Worth checking on screen.

5. **framework.about.alts, .challenge, .pushback, .reasoning, .uncertain**
   English: Give two or three ways, not one. / Disagree when it thinks you are wrong.
   Draft: Antaa kaksi tai kolme vaihtoehtoa, ei yhtä. / Sanoo vastaan, kun se uskoo sinun olevan väärässä.
   Why: the English calls the model "it" and the reader "you", so I read these as descriptions for the person and wrote them in the third person. If the same strings are also sent to the model as its instruction, they should be imperatives addressed to the model.

6. **keys.keysPage + keys.ownKey**
   English: [{provider}'s key page] is where to make one for Parliament alone, with its own spending limit, and to revoke one that leaks.
   Draft: [Palvelun {provider} avainsivu] on paikka, jossa voit luoda pelkästään Parliamentille oman avaimen omalla kulurajallaan ja mitätöidä vuotaneen avaimen.
   Why: the link and the sentence are separate strings joined on screen. I kept the link in the nominative so it also works on its own; the sentence only works if the link comes first, as in English.

7. **template.kingfisher, template.starling**
   English: Kingfisher, Starling
   Draft: Kuningaskalastaja, Kottarainen
   Why: I treated the bird names as interface words, like the other template names. If they are meant as fixed product names, they should stay English.

8. **welcome.now**
   English: Now, let’s {command}   ({command} is focus:)
   Draft: Nyt keskitytään: {command}
   Why: this keeps the pun ("keskittyä" is to focus), but only while {command} is focus:. If the command changes, use the neutral "Seuraavaksi: {command}".

9. **collection.by, collection.date, collection.source, collection.yours**
   English: by / date / source / your order
   Draft: lajittelu / päiväys / lähde / oma järjestys
   Why: the fragments are joined on screen and I could not see how. "lajittelu" (sorting) works as a label before the options; it would not work as a word inside a sentence.

10. **keysData.longer**
    English: {names} is kept 30 days or more, read by its safety systems.
    Draft: Mallille {names} lähetetty säilytetään vähintään 30 päivää, ja sen turvajärjestelmät lukevat sen.
    Why: the English is elliptical (what you send to {names}), and Finnish has to name it. I assumed {names} are model names, as in keysData.trainsAll. If they are provider names, "Mallille" should become "Palveluun".

11. **settings.monthSpent**
    English: {cost} spent in {month}, across # chats…
    Draft: Käytetty {cost} ({month}), # keskustelussa…
    Why: "in October" needs the inessive (lokakuussa), which a placeholder cannot take, so the month sits in brackets. It is clear but a little stiff; a "{month}: …" heading form would be better if the month always starts the line.

12. **enter.targetChatIn**
    English: → {chat} in {room}   (bar reference: → 201a in unnamed room)
    Draft: → {chat}, {room}
    Why: "huoneessa {room}" would read "huoneessa nimetön huone" for an unnamed room, so I dropped the word for "in". It relies on the room name reading as a room.

13. **settings.leavePrompt, settings.leaveTitle, settings.private1** (chunk 14, privacy copy)
    English: …named on the line under the field.
    Draft: …nimetty palkin alla olevalla rivillä.
    Why: the privacy copy says "field" where the rest of the interface says "the bar". The field is the bar, so I kept the glossary's "palkki" so readers meet one name for one thing. If "field" was chosen on purpose for newcomers, "kentän alla oleva rivi" would follow the English word for word.
    Settled since: the English now says "the line under the bar" too.

14. **settings.leavesFoot** (chunk 14, privacy copy)
    English: A new one appears there and in the published policy before it can be used.
    Draft: Uusi näkyy siellä ja julkaistussa tietosuojakäytännössä ennen kuin sitä voi käyttää.
    Why: Finnish "käytäntö" on its own reads as "practice", so I wrote "tietosuojakäytäntö" (privacy policy). That names which policy, which the English leaves to context. If the published policy is not the privacy policy, "julkaistussa käytännössä" is the literal form.
    Settled since: the English now says "the security policy the site publishes" (the site's Content-Security-Policy, the hosts the page may connect to). Draft: "sivuston julkaisemassa suojauskäytännössä". "Suojauskäytäntö" follows the Finnish name for Content Security Policy ("sisällön suojauskäytäntö"); "tietoturvakäytäntö" would read as an organisation's IT security rules.

15. **lock.idleLabel with lock.idleTab** (chunk 15, Lock Parliament)
    English: Locks when idle for / 15 minutes, 1 hour, 8 hours, until the tab closes
    Draft: Lukittuu, kun käyttämättä on kulunut / 15 minuuttia, 1 tunti, 8 tuntia, kunnes välilehti suljetaan
    Why: the three durations read as one sentence after the label ("…on kulunut 1 tunti"). The fourth choice does not, any more than it does in English. That is fine if the choices sit in a menu under the label, but not if the label and the chosen value are ever printed as one line.

## Checker warnings: all prose, not commands

`node check.mjs fi` reports 14 command warnings. In each, the English uses a verb as an ordinary word before a colon, and the Finnish sentence rightly does not contain it. Every real command in these entries is kept as typed.

- blockAbout.chart-canvas, open: ("the data you have open: bars…")
- chat.instructionLike, enter.checkFound, enter.checkFree (twice), enter.helperSource, enter.includeFlagged, model: ("instructions to a model: …")
- enter.backupOpen, backup: ("Enter opens the backup: what goes in…")
- enter.languageBrowser, again: ("follow your browser again: {language}")
- enter.nameRoom, room: ("Enter names this room: {name}")
- enter.replyOff, language: ("stops asking for a language: models answer…")
- enter.setRoomList, library: ("a room from the library: {names}"; the real set:room is kept)
- keys.localWhy, device: ("apps on your device: allow it…")
- verb.framework, reply: ("shape every reply: standing instructions…")

## Stage 10 words, drafted 24 October 2026

16. **picker.togetherHelp**
    English: One reply from each, in a slider, in the numbered order.
    Draft: Yksi vastaus kultakin, selattavina välilehtinä numerojärjestyksessä.
    Why: Finnish has no settled word for a slider of replies ("liukusäädin" is a control for setting a value), so I described what it is: tabs you move between, as the earlier drafts call the reply tabs "välilehdet". If "slider" is meant as a name, a word for it should be chosen once and used everywhere.

17. **Hold** (enter.planHoldOn, enter.planHoldOff, enter.planHoldAlready, enter.planHoldNot, enter.planHoldEmpty, enter.planStepHeld, enter.runHeld, plan.held)
    English: Enter holds {nums} in run {run}. Their steps wait until hold:off / Held already: {nums} / {count} held
    Draft: Enter asettaa pitoon ajossa {run}: {nums}. Niiden vaiheet odottavat komentoon hold:off asti / Jo pidossa: {nums} / # pidossa
    Why: "pito" and "pidossa" come from a phone call on hold, which is the closest everyday sense. It is less common outside phones, and plan.ended says "verkko pidätti vastauksen" (the network held the reply) from the same root for something else. If it reads oddly, "odotustilassa" is the plainer choice, though it sits close to the waiting status (odottaa).

18. **A step that runs** (picker.cond, plan.condition, picker.condHelp, plan.conditionHelp, picker.sequenceHelp, enter.promptManyOrder, enter.byManyThen)
    English: runs if the one before fails / When {name} runs. A click changes it
    Draft: ajetaan, jos edellinen epäonnistuu / Milloin {name} ajetaan. Napsautus vaihtaa sen
    Why: the passive of ajaa keeps one verb for run everywhere, but "Milloin {name} ajetaan" makes a model's name the thing that is run. "käynnistyy" (starts) reads more naturally in these lines and could replace "ajetaan" wherever a step or an answerer runs on its own.

19. **enter.runHead**
    English: Enter runs # steps of {nums}, in run {run}, one after another
    Draft: Enter ajaa # vaihetta haarasta {nums} peräkkäin ajossa {run}
    Why: "haarasta" (from the branch) is singular, which is right because the code sends one branch here and uses enter.runHeadMany for more. If {nums} can ever hold several, it needs the colon form ("…ajossa {run}: {nums}").

20. **enter.runCost, enter.runCostAll**
    English: At least {tokens, number} tokens to send, {cost}
    Draft: Lähetetään vähintään {tokens, number} tokenia, hinta vähintään {cost}
    Why: in Finnish "vähintään" does not carry across the comma, so "hinta {cost}" would read as the exact price. I repeated it before the cost, as enter.runCostly says ("At least {cost} to send"). The Cheap lines keep "hinta alle {cost}".

21. **settings.limitsLabel, settings.limitsHelp**
    English: Hard limits / For a cap that actually stops spending, set a monthly limit with each provider.
    Draft: Ehdottomat rajat / Jos haluat katon, joka todella pysäyttää kulutuksen, aseta kuukausiraja kunkin palveluntarjoajan omilla sivuilla.
    Why: "Ehdottomat rajat" (absolute limits) keeps the contrast with the warning, which stops nothing; "Kulukatot" (spending caps) is shorter and more everyday. "with each provider" became "on each provider's own pages", since the row's links go there.

22. **enter.diffOn**
    English: Enter sets run {other} beside run {run}, marking in ink what differs
    Draft: Enter asettaa ajon {other} ajon {run} rinnalle ja merkitsee erot musteella
    Why: "ink" is the interface's dark text colour. "musteella" is literal and natural Finnish, but a reader may not connect it with a colour on screen. "tummalla" (in dark) is the alternative.

23. **settings.monthSpentRuns**
    English: {cost} spent in {month}: # runs of plans and # chats on their own.
    Draft: Käytetty {cost} ({month}): # suunnitelma-ajoa ja # erillistä keskustelua.
    Why: "suunnitelma-ajo" is a new compound, used because "3 suunnitelman ajoa" can read as "runs of 3 plans". The "and" moved inside the chat count's cases, because the zero case needs "eikä yhtään erillistä keskustelua" (Finnish cannot say "ja ei"). The month stays in brackets, as in doubt 11.

24. **enter.runTo**
    English: They go to {answering}
    Draft: Vastaajat: {answering}
    Why: the code joins the names with "and", and a Finnish case ending cannot attach to the list, so it follows a plural label and a colon, as the glossary does for lists. With one answerer the plural label reads a little oddly.

25. **settings.warnOff**
    English: Off
    Draft: Pois
    Why: the choice beside $0.50, $1 and $5. "Pois" matches the earlier "Pois:" in the Settings help; "Ei käytössä" or "Ei varoitusta" is clearer if the choice is ever shown on its own.

The checker gives 4 command warnings for chunks 16 to 19 (branches.unmet, enter.manyUnmet twice, enter.runUndo). Each is prose ("did not run: its condition…", "stops at a run: what it writes stays"), not the command run:. Every real command in these entries is kept as typed.

## Lines drafted 30 October 2026

The 658 lines added since 24 October. The checker passes all of them; its 5 command warnings (enter.focusWhich, enter.layoutMany, enter.themeMany, enter.promptWebGo, guide.why.for) are prose ("by name:", "Which layout:", "search the web:"), not commands.

26. **Ripple as a name** (enter.promptRipple and the lines after it, enter.ripple*, enter.settleSugRipple, collection.legendRustIs, chat.sugRipple, room.rippleOn, room.rippleOff)
    English: Ripple checks {nums}: 2 calls to {name}, about {cost} / Ripple’s suggestion
    Draft: Ripple tarkistaa haarat {nums}: 2 kutsua malliin {name}, hinta noin {cost} / Ripplen ehdotus
    Why: the English writes Ripple with a capital, as a name, so it stays one, like Parliament. The block drafted on 23 October as block.ripple-analysis is "Vaikutusanalyysi". If the block and the feature are the same thing, one of the two should change.

27. **sweep** (enter.sweep*, chat.sugSweep, collection.legendSweepIs, enter.settleSugSweep, reflection.sweepAs)
    English: Enter sweeps {address}’s last reply as {name} / sweep 245
    Draft: Enter käy läpi haaran {address} viimeisimmän vastauksen kehyksellä {name} / läpikäynti 245
    Why: "läpikäynti" (going through) is plain and clear; "seulonta" (sifting) keeps more of the image but is less obvious. As a marker before a number it is long next to "ripple 244" and "kysymys 241".

28. **markup and clean** (enter.markup*, room.markupWord, room.cleanWord, collection.markupWord, collection.cleanWord)
    English: Enter shows replies marked up: struck words and yours in blue, editable
    Draft: Enter näyttää vastaukset muutosmerkein: yliviivatut sanat ja omasi sinisellä, muokattavina
    Why: "merkinnät" would be the usual word, but the glossary keeps it for markings. The existing verb.markup ("Näytä vastaukset muotoiltuina tai pelkkänä tekstinä") reads as formatting, not edit marks; it should become "Näytä vastaukset muutosmerkein tai puhtaina".
    Settled since: verb.markup now reads "Näytä vastaukset muutosmerkein tai puhtaina".

29. **enter.settleSugDone**
    English: Suggestion {num} was {state} already   ({state} is accepted or rejected)
    Draft: Ehdotus {num} on jo käsitelty ({state})
    Why: the code passes the stored state (src/lib/editVerbs.js), so {state} arrives in English in every language. The draft puts it in brackets, where an English word hurts least. A select in the English ({state, select, accepted {…} other {…}}) would let each language say it.
    Settled since: the English is now that select, and the draft follows it: "{state, select, accepted {Ehdotus {num} on jo hyväksytty} other {Ehdotus {num} on jo hylätty}}".

30. **enter.promptEditsToReader**
    English: Your 2 edits and 1 ask go to {name} at the same time…
    Draft: Samaan aikaan mallille {name} menee 2 muokkaustasi ja 1 kysymyksesi…
    Why: with the verb first, Finnish takes the singular for one and for many, so the {total} plural says "menee" in both cases. It is kept so the structure matches the English.

31. **Block settings on the Blocks board** (blocksBoard.*)
    English: New branches carry: the whole history / a summary; Shown as: ambient / compact / a meter; Follows: this chat / a pinned plan
    Draft: Uusiin haaroihin: koko historia / yhteenveto; Esitystapa: huomaamaton / tiivis / mittari; Seurattava: tämä keskustelu / kiinnitetty suunnitelma
    Why: the choice words also show alone on the block's row, so they are nominative and the labels are reworded around them. "huomaamaton" (unobtrusive) is a guess at what the ambient display is.

32. **blocksBoard.rm**
    English: rm
    Draft: rm
    Why: the button writes rm: in the bar, and "rm" means nothing but the command, so it stays. Its neighbours (lisää, siirrä ylös, siirrä alas) are translated; "poista" would match them.

33. **Slot names** (slot.*)
    English: the left rail / the lower right rail / the input dock / the outline
    Draft: vasen sivupalsta / oikea alempi sivupalsta / syöttöalue / jäsennys
    Why: "sivupalkki" is the usual Finnish word for a rail, but palkki is the bar. The names follow "paikkaan" and "paikasta" ("Enter siirtää lohkon Muistiinpanot paikasta vasen sivupalsta paikkaan marginaali"), which reads correctly but stiffly.

34. **{head} in Reflection** (enter.reflect*, reflection.from, reflection.reflectAbout, reflection.talkHow)
    English: Enter reflects on {head}: one call to {model}
    Draft: Enter pohtii kohdetta {head}: yksi kutsu malliin {model}
    Why: {head} is a chat's number or, for a plan, the plan's number, so the generic "kohde" carries the case. If it is always one of the two, "keskustelua {head}" would be warmer.

35. **enter.reflectUnder**
    English: Under {names}
    Draft: Kehyksin: {names}
    Why: say.js joins {names} with "or", so two frameworks read "Kehyksin: A tai B" (in English "Under A or B"). It may be meant as an "and" list.

36. **Told to {name}** (chat.toldOnly, collection.changeSent, collection.sugTold, enter.promptEditsOnly)
    English: Your edits, told to {name}
    Draft: Muokkauksesi, kerrottu mallille {name}
    Why: "mallille" assumes {name} is always a model, which the code suggests (a source reads none of the edits). If a source can be named here, "vastaajalle" is the neutral word.

37. **enter.rippleDone**
    English: Ripple: 3 suggestions, in {nums}
    Draft: Ripple: 3 ehdotusta haaroissa {nums}
    Why: {nums} lists the branches where suggestions landed; when all three land in one branch, the plural "haaroissa 201b" reads a little off.

38. **Example names inside commands** (enter.editWhich, enter.duplicateWhich, enter.labNoRoom, enter.blocksNoLayout, canvas.empty, canvas.noLayout, blocksBoard.empty, enter.arrangeSaveName, enter.tellEmpty)
    English: edit:"Writing studio", layout:"Three panels", arrange:save "review desk"
    Draft: edit:"Kirjoitusstudio", layout:"Kolme paneelia", arrange:save "arviointipöytä"
    Why: as ruled on 23 October. Rooms and layouts are matched by the names the page shows, which are the Finnish ones, so these work as typed.

39. **guide.o.talking**
    English: Talking things through
    Draft: Asioiden puiminen
    Why: "puida" (to thresh out) is idiomatic for talking something through; "Keskustelu asioista" is plainer if it reads as too colloquial.

40. **chat.askLabel**
    English: ASK
    Draft: KYSYMYS
    Why: written in capitals as the English is, in case the page does not set the case itself.

41. **Older lines whose English has changed since they were drafted** (not touched in this round)
    enter.help, enter.popDisplay, keys.checkThenKeep, keys.promise, languagePicker.foot, leader.help, settings.aboutWhat, settings.leaveApp, settings.private2, settings.private2Head, verb.close, verb.duplicate, verb.name, verb.strikethrough, welcome.letter.1 to welcome.letter.4, welcome.signature, welcome.small, welcome.step.ask, welcome.step.pop, welcome.steps.
    Why: the Finnish still translates the earlier English. Most are small (enter.help still says "täällä toimivat"), but welcome.letter.1 to 4 translate a different letter, welcome.steps still says eight things, welcome.signature says "So Lov" where the English now says "Stef", the key vault lines still say keys are encrypted on this device, and verb.strikethrough lacks the undo: the English now names. They need redrafting before Finnish ships.
    Settled since: all 23 are redrafted from the English as it now reads (second round below). enter.popDisplay needed no change: "näyttö" already covers both screen and display.

## Second round, 30 October 2026

The 23 lines above (doubt 41), enter.settleSugDone as a select, verb.markup, and 7 new lines (board.oneRoom, board.start, enter.closeNoRoom, enter.openBoardAlone, welcome.start.room, welcome.start.open, welcome.start.tour). The checker passes all of them; its one note (verb.name, "pointed at:") is prose.

42. **The welcome letter** (welcome.letter.1 to welcome.letter.4, welcome.signature)
    English: Perhaps that's too bold of me... I'd still classify myself as a "designer". ... the pace feels like drinking from a fire hose.
    Draft: Ehkä se on liian rohkeasti sanottu... pitäisin itseäni silti ”suunnittelijana”. ... tahti tuntuu siltä kuin joisi paloletkusta.
    Why: the letter is Stefan's own voice, so the draft keeps its first person, its fragments ("Osallistua enemmän itse työhön ja keskusteluun.", "Sovelluksen, jossa…") and its trailing dots. "Juoda paloletkusta" is understood but is a borrowed image; "tahti on hengästyttävä" is the native way to say it. Finnish people in tech often say "designer" for designer; "suunnittelija" is the plain word. The reader is "sinä" ("pitää sinut ajan tasalla"), as everywhere else on the page. The letter is signed Stef, as in English.

43. **settings.aboutWhat and welcome.letter.1**
    English: Parliament is an attempt to rethink how we interact with AI.
    Draft: Parliament on yritys ajatella uudelleen, miten toimimme tekoälyn kanssa.
    Why: the comment says the sentence is the letter's own, so both lines carry the same Finnish. "miettiä uudelleen" would be a little warmer for the letter, but then the two would differ.

44. **verb.strikethrough**
    English: Strike the selected words in a reply. Its number with undo: takes it back
    Draft: Yliviivaa vastauksesta valitut sanat. undo: ja muokkauksen numero kumoaa sen
    Why: "its number" is the number the strike gets as an edit (enter.strikeNumbered), so the draft names it "muokkauksen numero", as enter.undoNotEdit says "undo: ja numero".

45. **welcome.start.open**
    English: {command} lists what you have made, and open: with its number opens one again
    Draft: {command} luettelee, mitä olet tehnyt, ja open: ja kohteen numero avaa sen uudelleen
    Why: "kohde" is the glossary's word for a numbered thing of unknown kind. The line is long for the start card; "open: ja numero avaa sen uudelleen" is the short form if it wraps.

46. **welcome.steps**
    English: Things to try
    Draft: Kokeiltavia asioita
    Why: read only by screen readers. The earlier draft counted the steps ("Kahdeksan…"), which the English no longer does.
