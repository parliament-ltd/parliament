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
