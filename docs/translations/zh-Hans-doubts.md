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

3. **enter.nameEmpty, enter.headingEmpty, enter.saveName, enter.frameworkNeeds** (examples), and **frameworkPicker.noneYet** (slots) (settled)
   - EN: name:"Barn owls", heading:"Causes", save:"Owls this week", new:framework "brief" "keep each answer short"; and new:framework "name" "what it asks"
   - ZH: name:"仓鸮", heading:"原因", save:"本周的猫头鹰", new:framework "简短" "每个回答都要简短"; and new:framework "名称" "要求"
   - Why: settled by Stefan's ruling. The words inside the quotes are the person's own text, so they are translated. The verb, the command's form and the ASCII double quotes stay exactly as the bar reads them. Unquoted example values that the checker reads as part of the command, such as -tag:research in enter.noMinus, stay as typed.

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

## The lock (chunk 15)

23. **lock.idleLabel, lock.idleTab**
    - EN: Locks when idle for / 15 minutes, 1 hour, 8 hours, until the tab closes
    - ZH: 闲置多久后锁定 / 15 分钟、1 小时、8 小时、直到关闭标签页
    - Why: a question-form label lets a bare duration answer it, as Chinese settings do (自动锁定：5 分钟). The last choice answers it less neatly. 关闭标签页前不锁定 would be plainer, but it states the meaning ("does not lock while the tab is open") rather than the English words, so I kept the literal one.

24. **lock.wrong**
    - EN: That does not open it.
    - ZH: 输入的内容无法解锁。
    - Why: "that" can be a passphrase or a recovery code, so it is 输入的内容 (what was typed) instead of naming one.

25. **lock.step3Title**
    - EN: A passkey, if you like
    - ZH: 通行密钥（可选）
    - Why: "if you like" as 可选 (optional), the usual short form for an optional setup step. 如果你愿意，可添加通行密钥 is the literal version, but it is long for a step title.

## Stage 10 words, drafted 24 October 2026

26. **enter.planHoldOn, enter.planHoldOff, enter.runHeld, enter.planStepHeld, plan.held** (hold:)
    - EN: Enter holds {nums} in run {run}. Their steps wait until hold:off / {address} is held. hold:off {address} lets it go
    - ZH: 按 Enter 在第 {run} 次运行中搁置 {nums}。它们的步骤会一直等待，直到用 hold:off 取消 / {address} 已搁置。hold:off {address} 可取消搁置
    - Why: "held" needs a word apart from paused (已暂停) and waiting (等待中). 搁置 (set aside) is plain; 挂起 is the programmers' word, and 暂缓 suggests a delay with an end. plan.held counts branches (those whose open steps all wait), so it says so: # 个分支已搁置.

27. **picker.sequence, picker.together, and the older enter.byMany**
    - EN: One after another / All at once; and enter.byMany "… answer your next prompt here, in that order, each a branch of its own"
    - ZH: 依次进行 / 同时进行; enter.byMany (drafted 23 October): 按 Enter 让 {answering} 依次回答……
    - Why: 依次 now means one after another (enter.byManyThen, enter.promptManyOrder, enter.runHead). enter.byMany is the all-at-once line, and its 依次 for "in that order" can now be misread as the other mode. Suggest changing it to 按此顺序 (not done: chunk 03 is not mine to change).

28. **enter.runHead, enter.runHeadMany, enter.runHeadNew**
    - EN: Enter runs # steps of {nums}, in run {run}, one after another
    - ZH: 按 Enter 在第 {run} 次运行中依次执行 {nums} 的 # 个步骤
    - Why: with 运行 for both the noun and the verb, the line would read 在第 2 次运行中运行. Steps are 执行 in these three lines only; everywhere else a step or branch 运行s.

29. **blocks.stepsPinned**
    - EN: plan {num}, pinned
    - ZH: 计划 {num}，固定显示
    - Why: here "pinned" means the step list shows one plan by its number instead of following the room's chat. The glossary's pin (置顶) is a list's top place, so it would mislead.

30. **picker.asBranch, plan.asBranch**
    - EN: As the branch, now {name} / as the branch
    - ZH: 跟随分支，目前为 {name} / 跟随分支
    - Why: read as "let the branch decide", so the step follows if the branch's answerer changes. 与分支相同 (the same as the branch) is the literal reading, but it hides that it follows.

31. **enter.deleteEverything**
    - EN: Delete everything is a button at the foot of {board}. Enter opens it there
    - ZH: “删除全部内容”是{board}底部的一个按钮。按 Enter 打开{board}并转到那里
    - Why: the code opens Settings at its data section, where the button is; it does not press the button. "Opens it there" is said as opening the board and going to that place, so no one reads it as starting the deletion.

32. **enter.diffOn, plan.beside**
    - EN: Enter sets run {other} beside run {run}, marking in ink what differs
    - ZH: 按 Enter 将第 {other} 次运行放到第 {run} 次运行旁边，并用墨色标出差异
    - Why: "ink" is the design's text colour. 墨色 is literal and fine for a reader who knows the page; 深色 (dark) is plainer if the colour name means nothing here.

33. **settings.monthSpentRuns**
    - EN: {cost} spent in {month}: # runs of plans and # chats on their own. …
    - ZH: {month}共花费 {cost}：# 次计划运行，另有 # 个单独的对话。…
    - Why: the "and" became ，另有 (and besides), because the second count begins with a digit in one case and with 没有 in the other, and a single spacing after 和 cannot suit both.

34. **picker.togetherHelp**
    - EN: One reply from each, in a slider, in the numbered order.
    - ZH: 每个回答者各给一条回复，按编号顺序排列，可左右切换查看。
    - Why: the branch slider has no settled Chinese name (轮播 is the web word for a carousel), so it is described by what it does.

35. **enter.stopAll, enter.stopBranch, enter.stopPlan**
    - EN: What is done stays done and paid for
    - ZH: 已完成的部分会保留，并照常计费
    - Why: "paid for" read as "is charged as usual", matching chat.stoppedNotice (已用的 token 照常计费). The English may also mean "you have paid for it, so it is yours".

36. **enter.runCostly, settings.warnHelp**
    - EN: more than the {warn} you asked to be warned at / Above this, …
    - ZH: 超过了你设定的提醒金额 {warn} / 超过此金额时，…
    - Why: translated as written. C203 and enter.setWarn ("{cost} or more") say it warns at or above the amount; if the English is changed to say so, these become 达到或超过.

37. **enter.deleteApart**
    - EN: Delete what has not been sent on a line of its own
    - ZH: 尚未发送的内容请单独用一行删除
    - Why: read, from C199 (b), as "give delete: of unsent things a line of its own, without sent things beside them". The English can also be read as "delete what has not been sent on its own line".
