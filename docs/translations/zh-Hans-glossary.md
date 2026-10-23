# zh-Hans glossary

One line per term: English → Chinese, with the reason where it was a hard choice.

## Things you make
- chat → 对话 (not 聊天: 对话 is the usual word in mainland AI apps, and reads as work, not small talk)
- conversation → 对话 (or 对话内容 where it means the text of one)
- message → 消息
- plan (formerly docket) → 计划
- step (of a plan) → 步骤
- run (n., one running of a plan branch) → 运行, counted 一次运行
- branch (201a, 201b) → 分支
- marking (the collective word for notes, keywords, quotes and favourites) → 标记
- note → 笔记 (not 备注, which reads as a field annotation; these are notes people write and keep)
- keyword (kind.term) → 关键词
- highlight (one passage marked where it sits) → 高亮
- quote (n., a passage kept beside the chat, never sent) → 摘录 (hard choice: 引用 means citing, and is kept for the verb "quoting" in "a note quoting 218" → 引用 218. 摘录 is an excerpt you keep, which is what a quote is here)
- pins (older word for quotes, in blockAbout.review and backup counts) → 摘录
- favourite → 收藏; the Favorites collection → 收藏
- collection → 合集 (hard choice: 合集 is how mainland apps name a user-made group of items; 集合 reads as maths, 收藏夹 would clash with favourites)
- card → 卡片
- tag → 标签
- heading (in a collection) → 标题
- summary → 摘要; summarize → 总结 (button) / 写摘要 (in sentences)

## Places on screen
- board → 面板 (hard choice: 看板 suggests kanban, 板块 a section of a page. 面板 is the plain word for a pane of the screen. Reserved for boards; panels inside a room are 栏 or 区)
- the bar (the one field: search, command or prompt) → 输入栏 (hard choice: 命令栏 would name only one of its three readings and clash with 命令行. The Input block is 输入区 to keep the two apart)
- the command line (the > reading of the bar) → 命令行
- the Enter line (the line under the bar saying what Enter will do) → Enter 提示行; "this line" → 这一行 / 此行
- room → 房间 (hard choice: literal, but it keeps the metaphor of the Lab building rooms and of room templates such as 静室. 空间 is overused, 工作室 clashes with Writing studio)
- arrangement → 排布 (kept apart from layout)
- layout → 布局; window layouts → 窗口布局
- block → 模块
- theme → 主题
- template → 模板
- own window (pop:) → 独立窗口
- Records (board.almanac) → 记录
- Collection (board) → 合集
- Library → 资源库 (hard choice: Apple's mainland word for Library; 图书馆 is too literal, 库 too bare). shelf → 书架, keeping the library metaphor
- Plan (board.docket) → 计划
- Reflection → 反思 (the board reads your chat and markings back to you; 回顾 is taken by the Review block)
- Review (block) → 回顾
- Settings → 设置
- Welcome page → 欢迎页
- Lab → 工坊 (hard choice: 实验室 in mainland UIs signals "experimental features"; 工坊 is a workshop, where rooms are built)
- Canvas → 画布
- Rooms (board.room, the list) → 房间

## Asking and answering
- prompt → 提示词 (the usual mainland word among AI users)
- reply → 回复; answer → 回答 (the English keeps them apart, so the Chinese does too)
- who answers → 回答者 / 由谁回答
- model → 模型
- provider → 服务商 (chosen over 提供方; the usual phrase is 模型服务商)
- source (Wikipedia, Hacker News, OpenAlex) → 来源; answer from a source → 来源的回答; material from a source → 来源材料
- key (an API key) → 密钥; the heading API keys → API 密钥; key field → 密钥输入框
- helper (the small model that reads, translates and summarizes) → 辅助模型 (hard choice: 助手 would read as the main AI assistant)
- framework (a stance a reply is written under; standing instructions) → 框架 (hard choice: literal. 准则 or 风格 read more naturally beside built-ins like 反驳我, but 框架 keeps the product's own word; worth a reviewer's look)
- thinking (a model thinking first) → 思考
- context (what a model reads at once) → 上下文
- token → token (kept in Latin letters, counted 个 token; 词元 is the official coinage but few apps use it yet)
- call (a request to a model) → 调用; No call → 不调用模型
- cost → 费用; free → 免费; under {cost} → 不到 {cost}
- marks (cost multipliers like ×15) → 倍数 (kept apart from 标记, the markings)
- preview (a model before general availability) → 预览版
- the privacy filter → 隐私过滤 (no 器: a feature, not a device); placeholder → 占位符
- instructions to a model → 给模型的指令; never followed → 绝不执行
- marked as data → 标注为数据 (标注, not 标记, so it never reads as a marking)

## Keeping and removing
- backup / back up → 备份
- restore / bring back (a backup) → 恢复
- undo / take back → 撤销
- erase (for good) → 永久删除; erased (marginalia) → 已删除
- delete → 删除
- archive → 归档
- pin → 置顶
- forget (a saved search, collection, framework) → 移除
- saved search → 保存的搜索
- filter → 筛选条件; in force → 生效

## Places and devices
- this computer / on your machine → 本机 (Nothing leaves it → 内容不会离开本机)
- this browser → 此浏览器; this tab → 此标签页; this device → 本设备

## Conventions
- "Enter does X" lines → 按 Enter X; "Escape does X" → 按 Escape X. Key names stay as written.
- Spacing: one half-width space between Chinese and Latin letters or numbers, also around placeholders whose values are numbers, addresses, model, provider and source names, commands, file names, costs and token counts. No space around placeholders whose values are Chinese words (board names, language names, settings sections, the privacy filter's findings, months). Dates and relative times get a space before them, since they begin with a digit.
- User-named things (collection, room, saved search and heading names, tags) are put in Chinese quotation marks “{name}” so any value reads as a name mid-sentence. Where the English already quotes, the quotes are kept as they are.
- Lists of command words or names keep 、 between Chinese items. Plurals collapse to the other case, keeping any =0 case. Chinese plural rules never pick `one`, so where the singular needs different words (此框架 / 这些框架), the case is written `=1` instead of `one`: enter.frameworkSet, enter.frameworkSetNext, enter.frameworkShow, enter.includeOff, enter.promptFrameworks, enter.promptIncluded, enter.sequence, enter.untagAll.
- The privacy filter's counts (privacy.card and the like) always begin with a number (# 个电子邮件地址), so {found} gets a space before it or follows a colon.
- Commands, including their example arguments (name:"Barn owls", heading:"Causes"), stay character for character in ASCII.
