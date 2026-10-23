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
