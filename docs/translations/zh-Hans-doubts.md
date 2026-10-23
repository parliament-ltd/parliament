# zh-Hans doubts

Lines drafted but not sure of. Each gives the id, the English, the draft, and why.

## Words people type

1. **backup.typeReplace**
   - EN: Type replace to go on
   - ZH: 输入 replace 以继续
   - Why: "replace" is written into the message, not passed in as a placeholder, so the code probably checks for the English word. I kept it in English. If the code checks a translated word, this should be 输入“替换”以继续.

2. **erase.word**
   - EN: delete (the word typed to arm Delete everything)
   - ZH: 删除
   - Why: Chinese has no lower-case word. 删除 is natural, but it is typed through an input method, and the field must accept the composed text. The alternative is to keep `delete`, which any keyboard types directly. erase.typeWord shows it as 输入“{word}”以继续 either way.

3. **enter.nameEmpty, enter.headingEmpty, enter.saveName, enter.frameworkNeeds** (examples), and **frameworkPicker.noneYet** (slots)
   - EN: name:"Barn owls", heading:"Causes", save:"Owls this week", new:framework "brief" "keep each answer short"; and new:framework "name" "what it asks"
   - ZH: the examples kept character for character in English; the two slot names in noneYet translated: new:framework "名称" "要求"
   - Why: rule 2 keeps commands and their examples in ASCII, so the examples stay. But a Chinese reader would type Chinese arguments (name:"仓鸮"), and "name" and "what it asks" are descriptions of slots, not words to type, so I translated those two. Worth deciding whether example arguments may be Chinese.

## Meaning I had to guess

4. **blockAbout.review**
   - EN: The chat drawn together from the highlights, notes, favourites and pins you choose.
   - ZH: 把你选出的高亮、笔记、收藏和摘录汇集起来，重新呈现这个对话。
   - Why: I read "pins" as the older word for quotes (backup.fileHolds counts quotes under `pins`), so 摘录. If it means pinned items, it should be 置顶内容.

5. **collection.pickFoot**
   - EN: A click writes add: or rm: in the bar. The numbers set the order by source; add:218 holds one note, keyword or quote.
   - ZH: 点击会在输入栏中写入 add: 或 rm:。按来源排列时，顺序由编号决定；add:218 只收入一条笔记、关键词或摘录。
   - Why: I read the second sentence as: in source order, numbers decide the order; adding a single number like 218 adds just that one item rather than a whole chat. Not sure.

6. **enter.bySeveral**
   - EN: One prompt to several comes with branches. Choose one for now
   - ZH: 同一条提示词发给多个回答者，要等分支功能推出。目前请选一个
   - Why: read as "sending to several arrives with the branches feature", matching picker.oneAtATime. If it means "each answer becomes a branch", the line should say so.

7. **enter.nameNoTitle**
   - EN: {num} is its own words, so it takes no name
   - ZH: {num} 本身就是一段文字，因此不需要名称
   - Why: read as "a note or quote is its own text, so it has no separate title".

8. **settings.thinkingOff**
   - EN: Off: models answer straight away, which is many times faster on a computer.
   - ZH: 关闭：模型直接回答，在本机运行时要快很多倍。
   - Why: read "on a computer" as "when the model runs on this computer". Literal 在电脑上 would read oddly next to hosted models.

9. **framework.challenge**
   - EN: Challenge artifacts
   - ZH: 质疑所给材料
   - Why: "artifacts" read from its description ("question what it is given"). Claude's own word for artifacts in Chinese varies (工件, 成果), so I described the meaning instead.

10. **enter.dateBad**
    - EN: {verb} takes 7d, 3w, a month, or a date like 2026-09-01
    - ZH: {verb} 可接 7d、3w、某个月份，或 2026-09-01 这样的日期
    - Why: I do not know what form "a month" takes (2026-09? september?). If it is a typed word, it stays English and should be shown.

## Assumptions about what the code inserts

11. **Quotation marks around user-named things** (enter.collectionAdd, enter.collectionForget, enter.openSaved, enter.saveKeep, enter.nameRoom, enter.tagAdd, enter.retag, enter.headingAfter, enter.setRoom and others)
    - EN: Enter puts {nums} in {name}
    - ZH: 按 Enter 将 {nums} 放入“{name}”
    - Why: in Chinese, a bare name mid-sentence is hard to read, so I put collection, room, saved-search and heading names and tags in “”. If the code already quotes these values, they will show twice.

12. **enter.noteIn, enter.noteInQuoting**
    - EN: Enter writes a note in {name}
    - ZH: 按 Enter 在“{name}”中写一条笔记
    - Why: assumed {name} is a collection's name. If it can be a chat number, the quotes are wrong there.

13. **Spacing around Chinese-valued placeholders** ({board}, {boards}, {language}, {section}, {month}, {first}/{second} as board names)
    - EN: Enter closes {board}. Nothing is lost
    - ZH: 按 Enter 关闭{board}。不会丢失任何内容
    - Why: no spaces, on the assumption these arrive as Chinese words (合集, 瑞典语, 十月). If {language} arrives as an endonym such as svenska, or {month} as a number, a space is missing.

14. **keys.ownKey**
    - EN: is where to make one for Parliament alone, with its own spending limit, and to revoke one that leaks.
    - ZH: 可用于为 Parliament 单独创建密钥并设定专属的消费上限，密钥泄露时也可以在那里将其吊销。
    - Why: this follows the link “{provider} 的密钥页面” in one sentence. If the code puts a space between the link and this text, a stray space falls between two Chinese characters.

## Choices worth a second look

15. **keysData.optOut**
    - EN: … in its admin panel, Privacy, then Anonymous improvement data. …
    - ZH: … 在其管理后台依次进入 Privacy 和 Anonymous improvement data。…
    - Why: the provider's console is not in Chinese, so its menu names stay as they appear there.

16. **welcome.now**
    - EN: Now, let’s {command} ({command} is focus:)
    - ZH: 现在，来试试 {command}
    - Why: the English plays on "let's focus". The pun does not carry; this is a plain invitation.

17. **enter.nextStep**
    - EN: next: {command}
    - ZH: 下一步：{command}
    - Why: "next" is not a Parliament verb, so I read it as a label and translated it. check.mjs flags it as a command; if the Enter line is meant to show `next:` verbatim, it should stay.

18. **replyPicker.title**
    - EN: Reply to
    - ZH: 回复对象
    - Why: the picker chooses which reply or replies the next prompt carries on from. 回复对象 is a short heading, but 接续哪条回复 would be plainer if space allows.

19. **layout.single-column-with-sheet** (and the "sheet that slides up" in its description and templateAbout.pocket-chat)
    - EN: One column and a sheet
    - ZH: 单栏加底部抽屉
    - Why: mobile "bottom sheet" has no settled Chinese name; 底部抽屉 and 底部弹层 are both used. 面板 was avoided because it means board here.

## Privacy copy (chunk 14)

20. **settings.leaveApp** (settled)
    - EN: … It never receives your chats or keys.
    - ZH: … 它从不会收到你的对话或密钥。
    - Why: was 绝不. Changed to 从不, the plainer equal for a statement of fact about the web host, after the coordinator left it to my judgement. Promises elsewhere keep 绝不 (绝不包含你的密钥).

21. **settings.leavesFoot** (settled)
    - EN: … A new one appears there, and in the security policy the site publishes, before it can be used.
    - ZH: … 新的服务商或来源会先出现在那里，以及本网站公布的安全策略中，然后才能使用。
    - Why: the English now names the security policy (the Content-Security-Policy, the list of hosts the page may connect to), so 安全策略 replaces the earlier 已公布的政策. Left open: 内容安全策略 is the standard term for CSP if the exact name is wanted.

22. **settings.private3Head**
    - EN: Your work stays here
    - ZH: 你的内容留在这里
    - Why: "work" as 内容 (what you made); 你的工作成果 is closer but long for a lead-in.
