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

## Conventions
- Commands, their keyword arguments (all, room, collection, search, the sort and type words, the Settings section names) and leaders stay English, character for character.
- Free-text example values inside commands are translated (name:"Tornugglor", heading:"Orsaker", save:"Ugglor i veckan"); see doubts.
- Keys stay as written: Enter, Escape, Tab. "Enter …" opens most Enter-line sentences: "Enter öppnar …".
- Quotation marks ”…”; decimal comma in prose (1,1 gånger priset); typed values keep their ASCII form (>0.50).
- Placeholders always stand in base form; adjectives that would agree with a {board} or {name} are avoided ("{board} visas inte", not "är inte öppen").
