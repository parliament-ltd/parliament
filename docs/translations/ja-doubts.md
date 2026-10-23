# Japanese (ja) draft: doubts

Each: id, the English, my draft, why I was unsure.

1. backup.typeReplace
   - en: Type replace to go on
   - ja: 続けるには replace と入力してください
   - The word to type has no message of its own, so I assumed the code checks the English word and kept "replace" in ASCII. If the field accepts a translated word, 置き換え would read better.

2. erase.word
   - en: delete
   - ja: delete
   - Kept in ASCII. A Japanese word (削除) has to be typed through the input method, and the Enter that confirms the conversion could reach the field before the word is complete unless it ignores composition. The note's "one lower-case word" also suggests Latin letters. If the field handles composition, 削除 is the natural word.

3. enter.nextStep
   - en: next: {command}
   - ja: 次：{command}
   - Read "next:" as a label and translated it; only {command} stays English. If "next:" is meant to look like a command, it should stay as typed.

4. Settled (Stefan's ruling): example words inside commands are the person's own text and go into Japanese; the verbs, the command's form and the ASCII quotes stay exact.
   - enter.nameEmpty: name:"メンフクロウ"
   - enter.headingEmpty: heading:"原因"
   - enter.saveName: save:"今週のフクロウ"
   - enter.frameworkNeeds: new:framework "簡潔" "回答はどれも短くまとめる"
   - frameworkPicker.noneYet: new:framework "名前" "指示の内容" (the bracketed gloss is gone, no longer needed)
   - Left as is: enter.noMinus keeps -tag:research. The tag is the person's word too, but it is not in quotes and sits inside the command as typed, so the ruling does not cover it.

5. field.frameworkNone
   - en: framework: none
   - ja: framework: なし
   - Treated "none" as a display word. If it is the command's own argument (framework:none), it should stay English.

6. keys.ownKey
   - en: is where to make one for Parliament alone, with its own spending limit, and to revoke one that leaks.
   - ja: で、Parliament専用のキーを利用上限付きで作ったり、漏れたキーを無効にしたりできます。
   - Starts with the particle で because it follows the link ({provider}のキーのページ) in one sentence. If the page puts a space between the link and this text, or a different order, the sentence breaks.

7. enter.savedStale
   - en: so the saved search {name} cannot open as it is. forget: removes it
   - ja: そのため、保存した検索{name}はこのままでは開けません。forget: で削除できます
   - Follows another message that gives the reason. Reads well if the reason ends a sentence before it; less well if they are joined with a comma.

8. blockAbout.review
   - en: The chat drawn together from the highlights, notes, favourites and pins you choose.
   - ja: 選んだハイライト、メモ、お気に入り、ピンからまとめ直したチャット。
   - Unsure what "pins" are here. Backup counts call quotes "pins"; if that is meant, ピン should be 引用.

9. template.kingfisher, template.starling (and the theme names)
   - en: Kingfisher / Starling; Amber glow, Cool bright, Deep calm, Fresh teal, Soft violet
   - ja: カワセミ / ムクドリ; 琥珀のあかり, 冴えた白, 深い静けさ, 爽やかな青緑, やわらかなすみれ色
   - Translated as words. If they are names to keep, like Parliament, they should stay Kingfisher and Starling (or キングフィッシャー, スターリング).

10. framework.challenge
    - en: Challenge artifacts
    - ja: 前提を疑う
    - "Artifacts" (what it is given) is not rendered word for word; the about line says "question what it is given". 渡されたものを疑う is the literal alternative.

11. enter.dateBad
    - en: {verb} takes 7d, 3w, a month, or a date like 2026-09-01
    - ja: {verb} には 7d や 3w のような期間、月、または 2026-09-01 のような日付を指定します
    - I do not know what form "a month" takes (2026-09, or a month's name), so 月 stays vague. An example would help.

12. collection.by
    - en: by
    - ja: 並べ替え
    - Assumed it labels the sort choice before date / source / your order.

13. replyPicker.title
    - en: Reply to
    - ja: 続ける返答
    - 返信先 is the stock Japanese for "Reply to", but 返信 would bring a third word for reply; 続ける返答 keeps the glossary. Worth seeing on screen.

14. enter.openBranch, enter.openBranchHere
    - en: No call, and it keeps its letter
    - ja: モデルは呼び出さず、末尾の文字も変わりません
    - "Its letter" is the a in 201a; 末尾の文字 is the plainest I found, but may not be obvious.

15. enter.compare, compare.counts
    - en: Enter sets {a} and {b} side by side, word by word / # words out, # words in
    - ja: 語ごとに比較します / #語削除、#語追加
    - Japanese is written without spaces between words. If the comparison splits on spaces, a Japanese note compares as a few long "words", and the counts will look odd. The wording is fine; the behaviour may need a look.

## Chunk 14 (Settings, About: privacy copy)

16. Settled: the English now says "the line under the bar" in settings.private1, settings.leavePrompt and settings.leaveTitle; the Japanese uses バーの下の行, as everywhere else.

17. Settled: settings.private3 keeps 私たち.

18. Settled: settings.private2 now says keys are never put in a backup (バックアップに入れられることは決してありません), and encryption only protects a key on disk.

## Chunk 15 (Lock Parliament)

19. lock.idleLabel, lock.idleTab
    - en: Locks when idle for / 15 minutes, 1 hour, 8 hours, until the tab closes
    - ja: ロックまでの無操作時間 / 15分, 1時間, 8時間, タブを閉じるまで
    - The label is a noun phrase ("idle time before it locks") so the bare durations read with it. タブを閉じるまで then reads as literally as the English does. If it should say plainly that there is no idle lock, しない（タブを閉じるまで） is clearer, but it says more than the English.

20. lock.step4Help
    - en: … nothing can open it: there is no server to reset it.
    - ja: …開く手段は何もありません。リセットできるサーバがないためです。
    - The colon becomes a sentence giving the reason (ためです), which is how a Japanese reader takes the colon. Neither claim is stronger or weaker; if the causal link is more than intended, 。リセットできるサーバはありません。 keeps them side by side.
