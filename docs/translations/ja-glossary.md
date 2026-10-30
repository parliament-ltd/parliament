# Japanese (ja) glossary

## Conventions

- Spacing: no space between Japanese and Latin text or numbers (APIキー, Enterで, チャット201, 30日間). One exception: a command, or a placeholder that holds command text ({command}, {verb}, {verbs}, {example}, {words}, {word}, {near}, {instead}, {line}, {leader}, {filters}), has a half-width space on each side where it meets Japanese letters, so it is plain where what you type ends (open:201 で表示). No space next to full-width punctuation (、。：「」).
- Long vowel mark: Apple's practice, dropped at the end of longer -er/-or words: コンピュータ, ブラウザ, プロバイダ, フィルタ, サーバ, インスペクタ. Short words keep it: キー, バー, エラー. "Monitor" is ディスプレイ, as Apple has it.
- Window is ウインドウ (Apple's spelling).
- Quotation marks: 「…」, nested 『…』. Commands keep their ASCII quotes (open:"{name}").
- Sentences in です・ます. Buttons, labels, headings and command descriptions as short noun phrases or plain verbs (保存, 閉じる, 提案を受け入れる).
- Final 。 follows the English: where the English line ends without a full stop (most Enter lines and hints), the Japanese ends without 。; where it has one, 。.
- Counters: 件 for most things (チャット3件, メモ2件), 枚 for cards, 行 for table rows, 文字 for characters, 語 for words, ステップ for steps, トークン for tokens, 回 for calls and searches.
- Plurals collapse to other. Where the English one and other cases differ in more than number (for example "in that order" or "in turn" only with several), the difference is kept with =1 {…}, since Japanese plural rules never pick one. Used in: enter.frameworkSet, enter.frameworkSetNext, enter.promptFrameworks, enter.sequence, enter.untagAll.
- US is 米国, EU stays EU.
- The 14 "command warnings" check.mjs reports for ja are all English prose that happens to start with a verb word ("to a model: …", "the backup: what goes in", "this room: {name}"); none is a command. They are listed in checker-false-positives.txt.
- "Enter does X" lines: Enterで、Xします.
- User words placed in a sentence (headings, saved search names) take という where the sentence needs a seam: {heading}という見出し.

## Terms

- chat → チャット
- plan (docket) → プラン. Short and the usual UI word; 計画 reads as an abstract intention.
- branch (201a) → ブランチ. 分岐 reads as the act of forking; ブランチ names the lettered thing you open and address. The act stays 分岐する where English says "branch from".
- room → ルーム. 部屋 would be literal; ルーム is the UI word (as in Zoom's ブレイクアウトルーム).
- board → ボード
- the bar → バー. Read alone, in context, the way アドレスバー and 検索バー are; no qualifier, since the bar is search, command and prompt at once.
- prompt → プロンプト
- reply → 返答. What a model writes back in a chat.
- answer → 回答 (verb 答える). What a model or a source gives to a question: 情報源からの回答, 最初の回答. Kept apart from 返答 because the English keeps the two apart.
- marking → マーキング. The study word for marking passages; マーク alone is too vague, and 倍率 already takes the cost "marks".
- note → メモ. As Apple's Notes (メモ).
- keyword (term) → キーワード
- highlight → ハイライト
- quote → 引用. "Cited" sources become 参照した情報源, to keep 引用 for quotes.
- favourite → お気に入り
- collection → コレクション
- card → カード (counted 枚)
- model → モデル
- provider → プロバイダ
- source (Wikipedia and the like) → 情報源. ソース is ambiguous (source code, sauce); 情報源 is plain.
- key (API key) → キー; the heading and first mention APIキー.
- helper → 補助モデル. ヘルパー is understood but vague; 補助モデル says it is a model and what it is for.
- backup / back up → バックアップ / バックアップする
- restore, bring back → 復元 / 復元する. The English "bring back" wording becomes the standard Japanese word.
- undo / take back → 取り消し / 取り消す (Apple's word for Undo).
- the Enter line → Enter行. Kept as a name, built like the English; "the line under the bar" stays バーの下の行 where the English says that.
- the privacy filter → プライバシーフィルタ
- placeholder (what the privacy filter swaps in) → 仮の文字列. プレースホルダ is jargon.
- framework (a stance a reply is written under) → 方針. フレームワーク reads as software or business-school frameworks; 方針 is the standing approach a reply follows. The command stays framework:.
- marks (×15, cost against a reference model) → 倍率
- spending → 利用額
- erase (for good) → 消去 (完全に消去); delete → 削除. Kept apart as the English keeps them apart. Superseded on 24 October: see "delete" under Plans and running (chunks 16 to 19).
- forget (a saved search, collection, framework) → 削除, with what stays said next to it.
- archive → アーカイブ
- pin → ピン留め
- export → 書き出し; import → 読み込み
- its own window (pop:) → 別ウインドウ
- beside what is here → 今の画面の横に
- in a room of its own → 専用のルームで
- carry on (a branch) → 続ける; the label "carried on" → 継続中
- point the bar at → バーの対象にする; "the bar points here" → バーの対象
- the last room → 最後に使ったルーム; the last board (the only one left) → 最後のボード
- not built yet → まだ準備中
- your order (in a collection) → 自分の並び順
- this computer / your machine → このコンピュータ / お使いのコンピュータ
- thinking → 思考
- call (one model call) → 呼び出し
- run (of a plan) → 実行; step → ステップ
- arrangement → 配置
- Records (the Almanac) → 記録
- Collection → コレクション
- Library → ライブラリ
- Plan (the Docket board) → プラン
- Reflection → 振り返り
- Settings → 設定
- Lab → ラボ
- Canvas → キャンバス
- Blocks → ブロック
- the welcome page → ようこそページ
- shelf → 棚
- tracked changes → 変更履歴
- marked as data → データとして明示

## Lock Parliament (chunk 15)

- lock (the feature, the row in Settings) → ロック; lock it → ロックする
- passphrase → パスフレーズ
- recovery code → 復旧コード. Chosen over リカバリーコード to match Apple's 復旧キー and 復旧用連絡先, and it is shorter.
- passkey → パスキー, as Apple and Google write it
- unlock → ロックを解除 (button), ロックの解除 (noun), as Apple has it
- lock now → 今すぐロック
- idle → 無操作. The label "Locks when idle for" is ロックまでの無操作時間, so a bare duration reads with it: 15分, 1時間, 8時間, タブを閉じるまで.
- password manager → パスワードマネージャ (Apple's long-vowel practice)
- encrypt / decrypt → 暗号化 / 復号
- "nothing can open it" → 開く手段は何もありません; "there is no server to reset it" → リセットできるサーバがない

## Plans and running (chunks 16 to 19, 24 October)

- delete (`delete:`, the one word for removing since C199) → 削除; for good → 完全に削除; deleted (a label) → 削除済み. The lines that said 消去 (erased) now say 削除. 消去 stays only where a browser clears its own data (settings.keptNo, welcome.keepNot, lock.lost, backup.replaceAbout).
- Enter, then Enter again → Enter、もう一度Enter; Enter again → もう一度Enter
- a run, by its number → 実行{run} (実行2), built as ステップ{index} and プラン{num} are, so it reads as a name and sits close to open:run 2. Counted 件 (実行#件), as GitHub's Japanese counts workflow runs; 回 would say it happened, and a run can exist before it starts. run {run} of {runs} → 実行{run}（全{runs}件）.
- Where the verb 実行する would meet the name in one clause, the run goes in brackets after: Enterで、201aの3ステップを順番に実行します（実行1）.
- an earlier run, kept as it was → 以前の実行（当時のまま）
- the Plan board in a sentence ("on the {board} board") → {board}ボード (プランボード). Note: chunk 11's verb.plan has プランのボード.
- to plan (a step) → 計画する; plan again → 計画し直す; planned → 計画済み. The noun stays プラン.
- started (a step) → 開始済み; its prompt is fixed → プロンプトは変更できません
- condition → 条件; met → 満たす; did not run → 実行されず (label), 実行されませんでした (sentence)
- the four conditions: once the step before finishes → 前のステップが終わったら; if it fails → 前のステップが失敗したら; if nothing is found → 何も見つからなければ; whatever happens → 結果にかかわらず. "The one before" (the picker, the slider) → 前のもの, not 1つ前, since a condition reads the last one before it that ran (C201 (b)).
- runs (a condition's label) → 〜実行 (何も見つからなければ実行)
- hold / held → 保留にする / 保留中; let go (hold:off) → 保留を解除
- waiting → 待機中; running → 実行中; done → 完了; stopped → 停止 (as branches.stopped)
- paused → 中断. 一時停止 reads as a pause chosen on purpose; a paused step was stopped, failed, stalled or lost its tab, and run: carries it on.
- one after another → 順番に; All at once → すべて同時に; Order (the choice between them) → 順序
- side by side (branches in a run) → 並行して; (two runs, diff:) → 並べる; what differs, marked → 違うところに印
- stop, halt → 止める; what is done stays done and paid for → 済んだものはそのまま残り、その分の料金はかかります
- as the branch (a step's answerer) → ブランチと同じ; who answers → 答えるもの
- with no chat until it runs → 実行するまでチャットはありません
- step list (the block) → ステップ一覧
- slider → スライダ (Apple's long-vowel practice)
- costly run → 高額な実行; warn before → 前に警告
- hard limits → 利用上限, the word keys.ownKey uses for a provider's spending limit; monthly limit → 月の上限
- a chat on its own (not part of a plan of several) → 単独のチャット

## Editing, the Lab and the rest (30 October 2026)

The 658 lines added since 24 October, drafted for the Japanese beta.

- Spacing: {said}, {where} and {value} hold what was typed, so they take the half-width spaces {word} takes ({said} というルームはありません). A placeholder inside a command is command text too (undo:{num} で取り消せます).
- edit (a change made in place, a card) → 編集, counted 件 (編集#件); edit {num} → 編集{num}
- ask (an instruction tied to words in a reply, ask:) → 依頼; the box it is written in, and its ASK label → 依頼欄, 依頼; asked of {name} → {name}に依頼. 質問 would say a question, and most asks are requests ("make it shorter"); 依頼 also keeps it apart from questions to sources.
- drop (an ask still waiting) → 取り下げる
- suggestion → 提案; accept → 受け入れる; reject, turn down → 却下する; accepted / rejected → 受け入れ済み / 却下済み; settle → 確定する
- tell, told (edits and notes given to a model with a prompt) → 伝える; told once → 1回だけ伝える. A tell: note stays メモ, as verb.tell has it.
- hold back (an edit) → 保留にする; held back → 保留中; let it go → 保留を解除, as the plan words have it
- strike, struck → 取り消し線を引く, 取り消し線 (as compare.legend); the struck words → 取り消し線の言葉
- markup / clean (the two ways a reply or the Collection shows edits) → 変更表示 / 清書; marked up → 変更表示. 清書 is the plain word for a clean copy. Note: the older verb.markup says 書式付き / 書式なし (with and without formatting), which reads markup as formatting; see the doubts.
- Ripple → Ripple, kept as a name: the English writes it as a name (Ripple checks, Ripple's suggestion) and the command is ripple:. The older block "Ripple analysis" stays 波及分析.
- sweep (a framework's pass over a reply, sweep:) → 照合; to sweep → 照合する, as verb.sweep's 照らし合わせる
- the key store, the key vault → キー保管庫
- slot (in a layout) → 枠, as verb.place; a layout's places → 場所; the rails → 左レール, 右レール, 右下のレール; the input dock → 入力ドック; the margin → 余白
- Built for (a device) → 対象; built for a phone → スマートフォン向け; computer → コンピュータ
- Sends to: anyone / this computer only → 送信先：制限なし / このコンピュータのみ
- focus (focus:, a saved set of boards) → 集中表示, as the existing focus lines
- calm (calm:) → 控えめ; calm the screen → 画面を控えめにする, as verb.calm
- display (a physical screen, display 2) → ディスプレイ; screen (what is shown) → 画面; your screens → お使いのディスプレイ
- in its own window here → ここで別ウインドウに
- letter (from the maker of Parliament) → 手紙; letter {n} → 手紙{n}; not read yet → 未読
- in beta → ベータ版; coming soon → 近日公開, as library.pillSoon
- the guide (new:room guided) → ガイド
- the Blocks board → ブロックボード, built as プランボード
- synthesis → 総括, as verb.reflect; Prompts for reflection → 振り返りの問いかけ; a proposal → ひとつの案 (提案 is the suggestion)
- review (the review bar) → レビュー
- voice → 音声 (the feature 音声入力); listening → 聞き取り中; attach → 添付; web search → ウェブ検索
- "{a} of {b}" for a position (1 of 3) → {a}/{b}
- Example words in commands follow the 23 October ruling: names shown in Japanese are written in Japanese, since the commands match them (edit:"執筆スタジオ", layout:"3パネル", arrange:save "レビュー用デスク", tell:"1ページ以内にまとめて"). Typed words the code reads stay English: on, off, desktop, mobile, right, left, extra, middle, bottom, up, down, pushback, tried, set:input files on.
- Toggle labels with a command word ("calm: on", "ripple: off", "focus: on") keep the command and translate the state: calm: オン, ripple: オフ, as field.frameworkNone has framework: なし.
- Start (the card with the bar, shown before anything is open) → スタート; one room as a board in a sentence → ルーム
