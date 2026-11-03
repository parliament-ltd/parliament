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

## Stage 10 words, drafted 24 October 2026

21. plan.runHead, settings.runRow, enter.planRunOpen and every "run {run}"
    - en: Run {run} / run {run} of {runs} / Enter shows run {run} of plan {num}
    - ja: 実行{run} / 実行{run}（全{runs}件） / Enterで、プラン{num}の実行{run}を表示します
    - Built as a name, like ステップ{index}, so it sits close to open:run 2. {run}回目の実行 reads more naturally in a sentence, but less like a name, and says it happened, when a run can exist before it starts. 実行 is also the verb, so where both meet the run goes in brackets: Enterで、201aの3ステップを順番に実行します（実行1）.

22. plan.statusPaused, plan.ended (other), enter.runPaused, enter.runPausedOnly
    - en: paused / {nums} paused; the {board} board says why
    - ja: 中断 / {nums}は中断しています。理由は{board}ボードに表示されます
    - 中断 (broken off, can be resumed) rather than 一時停止, which reads as a pause chosen on purpose. A paused step was stopped, failed, stalled or lost its tab.

23. enter.diffOn, plan.beside, verb.diff
    - en: Enter sets run {other} beside run {run}, marking in ink what differs
    - ja: Enterで、実行{run}の横に実行{other}を並べ、違うところに印を付けます
    - "In ink" is left out: インクの色で and 墨色で both read oddly. If the colour should be said, 違うところを濃い色で示します.

24. picker.cond, picker.sequenceHelp, enter.manyWhen, branches.waitingRuns
    - en: runs if the one before fails / once the one before finishes
    - ja: 前のものが失敗したら実行 / 前のものが終わったら
    - 前のもの rather than 1つ前. 1つ前 is crisper in a numbered list, but says "the one just before", and a condition reads the last one before it that ran (C201 (b)).

25. picker.cond, plan.condition (always)
    - en: runs whatever happens
    - ja: 結果にかかわらず実行
    - "Whatever the step before ended with". 常に実行 is shorter but says more than is true: nothing runs after a stop.

26. settings.warnHelp, enter.runCostly, enter.setWarn
    - en: Above this, … / more than the {warn} you asked to be warned at / when it is {cost} or more
    - ja: これを超えると、… / 警告するよう指定した{warn}を超えています / {cost}以上のときは
    - Each follows its own English, and the English disagrees: two say "above", one says "or more", and the warning comes at or above the amount (C203 (c)). If the English is made one, the Japanese should be 以上 in all three.

27. settings.limitsLabel
    - en: Hard limits
    - ja: 利用上限
    - The word keys.ownKey already uses for a provider's spending limit. "Hard" is not rendered on its own; the help line says the cap stops spending. 強制的な上限 if it needs saying in the label.

28. blocks.stepsWhole
    - en: shows the whole plan
    - ja: でプラン全体を表示します
    - Starts with the particle で because the code puts it after the open:201 button and a space. Like doubt 6: the sentence is split across two entries and breaks if the order changes.

29. enter.eraseItems
    - en: Enter, then Enter again, deletes {erasing} for good
    - ja: Enter、もう一度Enterで、{erasing}を完全に削除します
    - Mirrors the English. Enterを2回押すと is plainer, but loses the pause between the two, where the line changes to "Enter again …".

30. plan.ended
    - en: stopped / it failed / the network held the reply / its tab closed / its condition was not met / paused
    - ja: 停止 / 失敗 / ネットワークが返答を溜めた / タブが閉じた / 条件を満たさなかった / 中断
    - Nouns and short clauses in one list, as the English has. 溜めた follows enter.promptStalled (溜めてしまうネットワーク).

31. picker.order
    - en: Order
    - ja: 順序
    - Heads the choice between すべて同時に and 順番に. "All at once" is not an order, so 送り方 ("how it is sent") may read better.

32. enter.openPlan and every "on the {board} board"
    - en: Enter opens plan {num} on the {board} board
    - ja: Enterで、プラン{num}を{board}ボードで開きます
    - {board}ボード reads as the board's name (プランボード). Chunk 11's verb.plan has プランのボード; one of the two should change to match, and I would change verb.plan.

33. enter.runSkipped
    - en: {count} empty steps are skipped
    - ja: 空の#ステップは飛ばします
    - The ステップ counter after an adjective is a little stiff; 空のステップ#件 reads more easily but breaks the glossary's counter for steps.

## The beta's words, drafted 30 October 2026

The 658 lines added since 24 October (the Lab, editing in place, asks, Ripple and sweeps, arrangements and screens, letters, This browser). Each: id, the English, my draft, why I was unsure.

34. chat.askLabel, chat.askMarker, collection.tabAsk and every "ask"
    - en: ASK / ask 241 / Asks
    - ja: 依頼 / 依頼 241 / 依頼
    - An ask is mostly a request ("make it shorter"), so 依頼 rather than 質問. It reads a little formal beside the casual English; 質問 is the other choice if asks are meant to feel like questions.

35. chat.sugRipple, enter.promptRipple and every "Ripple"
    - en: Ripple checks {nums}: … / ripple 244
    - ja: Rippleが{nums}を確認します：… / Ripple 244
    - Kept as a name, since the English treats it as one and the command is ripple:. If it should be translated, 波及チェック, which matches the older block 波及分析.

36. chat.sugSweep, enter.sweepGo and every "sweep"
    - en: sweep 245 / Enter sweeps {address}’s last reply as {name}
    - ja: 照合 245 / Enterで、{address}の最新の返答を{name}で照合します
    - 照合 (checking against a rule) follows verb.sweep's 照らし合わせる. スイープ was the alternative, but says nothing to most readers.

37. collection.markupWord, room.markupWord, collection.cleanWord, room.cleanWord, enter.markupOn and the rest
    - en: markup · clean
    - ja: 変更表示・清書
    - 清書 is the plain word for a clean copy; 変更表示 says the changes are shown. The older verb.markup has 返答を書式付きで表示する、または書式なしで表示する (with or without formatting), which read markup as formatting. Settled: verb.markup is now 返答を変更表示か清書で表示する.

38. Settled: enter.settleSugDone
    - en: {state, select, accepted {Suggestion {num} was accepted already} other {Suggestion {num} was rejected already}}
    - ja: {state, select, accepted {提案{num}はすでに受け入れ済みです} other {提案{num}はすでに却下済みです}}
    - The English became a select (the code passed {state} as an English word), and the Japanese now has its cases exactly.

39. chat.askMarker, chat.sugRipple, chat.sugSweep (how the code joins them)
    - The marker is built in code as the word, a space and the number, then ": accept · undo" (editing/asks.js, editing/suggestions.js), so Japanese shows 依頼 241: 受け入れる · 取り消す, with ASCII spacing and colon. One message with placeholders would let Japanese write 依頼241：受け入れる・取り消す.

40. canvas.anyone, library.dAnyone, enter.localSame
    - en: Sends to: anyone
    - ja: 送信先：制限なし
    - "Anyone" is any model or source. 誰にでも reads as people, so 制限なし (no limit). Worth a look on screen.

41. blocksBoard.rm
    - en: rm
    - ja: rm
    - Kept: it is the command word, and the button writes rm:. Its neighbours (下へ移動, 上へ移動) are translated, so it stands out; 取り出す if the button should read as words.

42. blocksBoard.ofOne, guide.step, collection.reviewOf
    - en: {count} of 1 / {n} of {total} / {at} of {count}
    - ja: {count}/1 / {n}/{total} / {at}/{count}
    - Positions and counts in narrow places as a slash, the usual Japanese UI form. 3件中1件目 is the long form.

43. welcome.closing
    - en: All the best,
    - ja: それでは、また
    - A warm, plain close, without the English comma. どうぞよろしく is the other choice.

44. guide.o.essay, guide.o.thinking, guide.o.dataDesk, guide.o.desk
    - en: Essay room / Thinking room / Data desk / At a desk
    - ja: エッセイルーム / 思索ルーム / データデスク / デスクで
    - The three names become the room's name (name:"…"), so they are names to live with. 思索 rather than 思考, which the glossary gives to a model's thinking.

45. enter.arrangeSaveName
    - en: Name it: arrange:save "review desk"
    - ja: 名前を付けてください：arrange:save "レビュー用デスク"
    - The example name is translated under the 23 October ruling.

46. branchesBlock.full
    - en: Context {percent}% full:
    - ja: コンテキスト使用率{percent}%：
    - Followed by the two buttons to carry on; 使用率 (how much is used) reads more naturally than a word for "full".

47. settings.browserHtml, settings.browserHtmlNot
    - en: A check on turning text into HTML
    - ja: テキストをHTMLにするときの検査
    - 検査 rather than 確認, which check: and the key check already use.

48. enter.rippleMissed
    - en: # more could not be placed: their words were not found once, unmarked
    - ja: ほかの#件は配置できませんでした：その言葉が、印のない部分にちょうど1回は見つからなかったためです
    - I read "not found once, unmarked" as: the words did not occur exactly once in unmarked text. If it means something else, the Japanese is wrong.

49. welcome.letter.5
    - en: Right now, Parliament is built for laptops, and hopefully phones soon too.
    - ja: 今のところ、Parliamentはノートパソコン向けに作られています。近いうちにスマートフォンにも対応できればと思っています。
    - Translated as written. Letters 1 to 4 were redrafted to match it (see 50).

50. Settled: the existing lines whose English changed after they were drafted, applied on 30 October and checked against the English as it is now. The letter keeps Stefan's own informal voice (んです, ね, かな) inside です・ます, and is signed Stef. As applied:
    - welcome.letter.1: Parliamentは、AIとの付き合い方を考え直してみる試みです。仕事にも会話にも、もっと自分から加われるように。その行方を、ひと握りの企業に決めてほしくなかったんです。そう、これをClaudeで作っているという皮肉にも、ちゃんと気づいています。
    - welcome.letter.2: 私もAIが怖いんです。すごいものだけど、どう受け止めればいいのか分からない。それでも、ただ座って何もしないのは嫌でした。だから何か月もチャットしたり読んだりしたあとで、オフラインでも使えるアプリを形にしようとしてきました。まずAIを使わずに情報源を検索できるアプリ。自分から関わることで、力を得られるようにと願うアプリ。ちょっと大それた話かもしれませんね……Rubyでウェブアプリをいくつか書いたことはあるけれど、自分ではやっぱり「デザイナー」だと思っています。作るのは大変です。とくに、学びながら進めていて、そのペースが消火ホースから水を飲むように感じられるときは。コードは公開していて、Claude Codeのセキュリティチェックも通しました。第三者によるセキュリティチェックも、これからもっと受けるつもりです。できるだけ近況をお知らせしますね。コードをもっと身近なものにする方法をずっと考えていて……いっそ小説にしてみようかな。
    - welcome.letter.3: では、Parliamentって何でしょう？Parliamentでは、ルームを作れます。1つのAIモデルとも、いくつものモデルとも、モデルなしでもチャットできる場所です。ルームは編集したり入れ替えたりできるブロックでできていて、レイアウトもテーマも配置も、自分で作れます。
    - welcome.letter.4: すべてはボードの上にあります。どのボードも別ウインドウに出して、別のディスプレイに移せます。だから、作業の場はあなたのものです。
    - welcome.signature: Stef
    - welcome.small: コンピュータ向け。スマートフォンはこれから
    - welcome.steps: 試してみること
    - welcome.step.pop: ボードを別ウインドウに出す
    - welcome.step.ask: 質問する
    - settings.aboutWhat: Parliamentは、AIとの関わり方を考え直す試みです。MITライセンス。ソースコードはリリース時に公開します。
    - settings.private2Head: キーはParliamentのキー保管庫に保管されます
    - settings.private2: 各キーは、Parliamentのキー保管庫（keys.parliament.ltdにある独立した小さなページ）が暗号化して保管し、それぞれのプロバイダにだけ送られ、バックアップに入れられることは決してありません。Parliamentのページで動くコードはキーを読めず、保管庫の一覧にあるプロバイダへ送るよう、保管庫に頼むことしかできません。Parliamentはほかの場所からコードを読み込みません。
    - settings.leaveApp: ブラウザは、Netlifyがホストするparliament.ltdとkeys.parliament.ltdから、Parliamentのファイルを取得します。ほかのウェブホストと同じく、ホストにはIPアドレスとブラウザの種類が見えます。チャットやキーをホストが受け取ることは決してありません。
    - keys.promise: キー保管庫が、このブラウザに暗号化して保管します。各キーは、それぞれのプロバイダにだけ送られます。
    - keys.checkThenKeep: 保存すると、まず短いリクエストを1回送って{provider}で確認し、キー保管庫がこのブラウザに暗号化して保管します。
    - verb.close: ボードを画面から外す、または手紙を閉じる。何も失われません
    - verb.duplicate: 自分のルームかテンプレートを複製し、複製をラボで開く
    - verb.name: バーの対象に名前を付ける：ルーム、コレクション、チャット。名前を2つ指定すると、保存した配置の名前を変えます
    - verb.strikethrough: 返答で選択した言葉に取り消し線を引く。undo: とその番号で取り消せます
    - enter.help: Enterで、すべてのコマンドを表示します
    - leader.help: すべてのコマンド、または1つのコマンドの使い方
    - languagePicker.foot: 返答と検索はページの言語に従います。reply: で返答だけ別の言語にできます。
    - enter.popDisplay: the English now says display; the Japanese already did, so it is unchanged.
    - Least sure: welcome.letter.2. "Drinking from a fire hose" is kept as an image (消火ホースから水を飲むよう), which Japanese readers in tech know but others may find odd; 息つく暇もない is the plain Japanese idea. "Make the code accessible" became 身近なものにする (bring it close to people), reading accessible as approachable, not as accessibility.

51. board.start, and room.home from 30 October
    - en: Start / Go to Parliament's start
    - ja: スタート / Parliamentの最初の画面へ
    - The start card is named スタート, as a board name beside 記録 and ライブラリ. room.home, drafted before the card had a name, says 最初の画面; if it means the card, Parliamentのスタートへ would match.

52. welcome.start.room, welcome.start.open, welcome.start.tour
    - en: {command} and a question opens a room / {command} lists what you have made, and open: with its number opens one again / {command} brings the steps back
    - ja: {command} と質問を入力すると、ルームが開きます / {command} で作ったものの一覧を表示し、open: と番号でもう一度開けます / {command} でステップを再び表示できます
    - Written as the welcome steps' "How" lines are ({command} と質問を入力). The second is long for a card line; 作ったものの一覧。open: と番号で再び開けます is the shorter form.

## Step 9, drafted 30 October 2026 (C282)

- `welcome.step.highlight` and `welcome.step.highlightHow` were drafted by the lead session, not the language drafter, from the glossary's words for note, highlight and Collection. Worth a read with the rest.

## Windows of several boards, drafted 31 October 2026 (C283)

53. enter.besideWhich, enter.popDisplayWhich
    - en: beside takes one board or number: pop:library beside records / display takes its number, last: pop:records 202 collection display 2
    - ja: beside には pop:library beside records のように、ボードか番号を1つ指定します / display は pop:records 202 collection display 2 のように、番号を付けて最後に書きます
    - Built as enter.compareTwo and enter.costBad are (the example inside the sentence, with のように), not after a colon. "last" became 最後に書きます; if the hint need only say what display takes, 番号を付けます alone is shorter.

54. enter.popTogether, enter.popTogetherDisplay
    - en: Enter opens {boards} together in a window of their own / … together in a window on display {display}
    - ja: Enterで{boards}を1つの別ウインドウにまとめて出します / Enterで{boards}を、ディスプレイ{display}の1つのウインドウにまとめて出します
    - 1つの…にまとめて makes plain that the boards share one window, not one each. The display line says ウインドウ, not 別ウインドウ, since the English drops "of their own" there.

55. welcome.step.nameHow
    - en: {command}, the room’s number then its name
    - ja: {command}、ルームの番号、続けて名前
    - Built as welcome.step.commandHow ({keys}、続けて {command}). Most "How" lines end in を入力 ({command} と質問を入力); {command}、ルームの番号に続けて名前を入力 is the fuller form if this reads too bare.

56. verb.pop
    - en: Put one or more boards, or the bar, in a window of their own, place it, or bring it back
    - ja: 1つまたは複数のボードか、バーを別ウインドウに出す、配置する、またはページに戻す
    - The comma after か keeps "the bar" apart from "one or more". ボード（複数可）かバーを… is the shorter UI form.

## Spread and saving at the end of a line, drafted 1 November 2026 (C284)

57. enter.spreadOver
    - en: {count, plural, one {Enter puts # board on this screen} other {Enter spreads # boards across {screens} screens, in the order named, the first on this one}}
    - ja: {count, plural, =1 {Enterで#個のボードをこのディスプレイに置きます} other {Enterで、#個のボードを指定した順に{screens}台のディスプレイへ振り分けます。先頭のものはこのディスプレイに置きます}}
    - "The first" is 先頭のもの, so it holds for one board or a group of them. Long for the Enter line; 先頭はこのディスプレイ is the shorter second sentence.

58. enter.spreadNothing
    - en: Nothing is open to spread
    - ja: 振り分けるものが何も開いていません
    - A little roundabout. 開いているボードがないため、振り分けられません is plainer, but gives a reason the English does not.

59. verb.spread
    - en: Spread the boards across your screens, in equal groups in the order named, the first on this one
    - ja: ボードを指定した順に同じ数ずつ、お使いのディスプレイに振り分ける。先頭のグループはこのディスプレイに
    - 同じ数ずつ for "in equal groups": when the boards do not divide evenly the groups differ by one, which it overstates as the English does. The second sentence ends without a verb, as a menu line can.

60. verb.open, verb.arrange
    - en: …; several at once, and spread across your screens / … arrange:save can end a line of layout commands, as open:202 203 records spread arrange:save "morning"
    - ja: …。複数を一度に開いて、お使いのディスプレイに振り分けることもできます / …。arrange:save は open:202 203 records spread arrange:save "朝" のように、レイアウトのコマンドを並べた行の最後にも書けます
    - Both are long for the command menu. The added sentence takes ます, as verb.stop's second sentence does; the example is built with のように, as enter.popDisplayWhich is.

61. enter.thenSave, enter.thenReplace
    - en: Then keeps it all as {name} / …, in place of the one saved by that name
    - ja: そのあと、全体を{name}として保存します / そのあと、同じ名前で保存されている配置に代えて、全体を{name}として保存します
    - 全体 for "it all": everything the line makes, windows included. The second follows enter.arrangeReplace.

## Words of 2 November 2026 (C286)

- `welcome.start.commands`, `welcome.start.history`: "the command bar" is コマンドバー, against the glossary's bare バー, since the English adds "command" here. 今使えるもの for "what's live" is vague; 今使えるコマンド would be plainer if that is what it means.
- `verb.copy`, `verb.tagadd`, `verb.quote`: "the reply you are in" is 今いる返答, as verb.inspect has 今いる場所. It may read oddly; クリックした返答 says how a reply comes to be "in hand" (enter.messageLast), but more than the English does.
- `enter.quoteKept`, `enter.quoteAlready`, `enter.tagMessageDone`, `enter.tagMessageAlready`: a bare "as {num}" reads poorly in Japanese, so the number is named 引用{num}, and the tag lines say the tag goes on the quote (引用{num}に{tag}タグを付けました) rather than "tagged, as".
- `enter.quoteMessageInto`: "in {into}" is チャット{into}. If {into} can be a branch (201a), チャット201a is a little off.
- `line.filters`, `line.spreadSave`: essay and morning stay English, since the example line beside them (tag:essay, arrange:save "morning") is not translated. If those examples are ever translated (as verb.arrange's 朝 is), these must follow.
- `enter.barWindowMove`: "where the browser allows it" sits after the select as （ブラウザが許可する場合）, because the select comes first and cannot move.
- `enter.deletedMessage`, `enter.deleteMessageUndo`: "the chat offers to bring it back" is チャットで元に戻せます, as the undo lines have it, not 復元 (kept for backups).
- `field.toBegin`: {leader} を入力して開始 is a terse hint; {leader} を入力して始めましょう would match the welcome page's warmer tone.
- `settings.browserCompare`: すべてのブラウザの比較（サイト上） is a noun phrase for a link; サイトで、すべてのブラウザを比較 is the alternative.

### New terms

- "hides markup and the details on boards" (calm:, reworded) → 変更表示とボードの詳細を隠す; "until you come near them" → 近づくまで. The command's name stays 控えめ.
- {part, select, prompt {…} other {…}} → プロンプト / 返答; "that begins “{opening}”" → 「{opening}」で始まる.
- "the command bar" → コマンドバー (welcome page only).
- "Lines of several commands" → 複数のコマンドを並べた行, as レイアウトのコマンドを並べた行.
- "your second screen" → 2台目のディスプレイ.
- the bar's window → バーのウインドウ; top, bottom, left, right, centre of its screen → ディスプレイの上端, 下端, 左端, 右端, 中央.

## Words of 2 November 2026, second batch (C287)

- `chat.titleAsk`: "ask" here asks the page title as a prompt, so it is 尋ねる (as verb.again's もう一度尋ねる), not 依頼, which the glossary keeps for ask:.
- `welcome.advanced.space`: スペース for "Space" (shaping the screen). 画面 is plainer and matches the glossary's screen, but drops the English's wider sense.
- `welcome.further`: または、さらに先へ is a little bare as a link. または、もっと試してみる says what the click gives.
- `enter.installDismissed`: "install: asks again when the browser offers it" is install: でもう一度確認できます (ブラウザが提示できるときに). It turns "asks again" into "you can ask again".
- `enter.installNotOffered`: "add it to the dock" is Dockに追加, the wording Safari uses in Japanese. The dock is a Mac thing, so other systems' readers may wonder.
- `line.layout`, `line.items`, `line.records`: review and essay stay English, because the example line beside them is not translated, as in the first batch. "Put a third away" (archive:) is しまう, as verb.archive has it. アーカイブする would match the command.
- `collection.shown`, `enter.filterShowsCards`, `enter.exportCardsOut`, `enter.exportCollection`, `enter.inspectHighlights`: `one` collapses to `other` and `=0` is kept, as collection.count has it. inspect's one case ("the highlight") reads as ハイライト1件.
- `welcome.step.passage`: 箇所をハイライトする follows the glossary's passage → 箇所, but it reads a little abstract on its own. 文章の一部をハイライトする is the alternative.
- `inspect.listFoot`: "for one" is その項目への jump:, so it holds for any list, not only highlights.

### New terms

- install (install:) → インストール; as an app → アプリとして; the browser offers it → ブラウザが提示する; installed → インストールしました.
- pinned (a collection, a label) → ピン留め済み; at the top of the collections → コレクションの先頭に.
- the second list (tour:advanced) → 2つ目の一覧, as verb.tour; More things to try → さらに試してみること.
- cards shown → 表示中のカード, カード#枚を表示中.
- ask (the link after a page title) → 尋ねる.
- tick (in a menu) → チェックを入れる; the menu of who answers → 答えるものを選ぶメニュー.

## compare: with branches, drafted 2 November 2026 (C289)

- `enter.compareMixed`: 両方から1つずつは指定できません for "not one of each" (you cannot take one from each group). It only reads right because the sentence before names the two groups (メモ、ハイライト、引用から2つ / チャットかブランチから2つ). チャットかブランチ uses か, not 、, so the second group does not run into the first list.
- `welcome.step.compareHow`: {example} のように、{command} にブランチを2つ指定する. The example comes first because Japanese puts "like X" before the verb. The other How lines start with the command, so this one starts differently. The alternative is {command} にブランチを2つ指定する（例：{example}）.
- `enter.compareKinds`: dropped the old line's 今のところ because the new English no longer says "for now". この5つ counts the five kinds, as the old line said この3つ.
- `enter.compareReplies`: no 、 after Enterで, to match its sibling `enter.compare`, though the glossary's pattern is Enterで、Xします.
- 語ごとに (word by word, as `enter.compare` has it): the open question in the README matters more now. Replies are long Japanese text with no spaces, so if the comparison splits on spaces, a Japanese reply compares as a few very long "words".
