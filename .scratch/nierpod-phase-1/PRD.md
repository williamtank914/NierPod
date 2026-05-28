# NierPod Phase 1 PRD

Status: ready-for-agent
Date: 2026-05-28

## Problem Statement

用户现在需要一个可以真实日用的个人 Project Workspace，用来管理 NierPod 自身开发和其他实际项目。现有散乱笔记、todo list、LLM 对话、链接、结果文件和长期记忆之间缺少统一的执行系统，导致用户每天需要重新拼装上下文、判断优先级、追踪任务进展和整理 LLM 输入。

用户的问题不是单纯缺少一个笔记软件，而是缺少一个本地优先、文件可控、长期可维护的个人 memory 和执行系统。这个系统必须让 Project、Task、Today Focus、Memory、Prompt Pack、Journal、Artifacts 组成稳定闭环，使用户可以连续 7 天真实管理自己的工作，而不会因为数据结构不清、流程缺失、索引不可重建或存储不可靠退回散乱笔记。

## Solution

NierPod Phase 1 提供一个本地优先的桌面应用。用户选择或创建一个普通本地文件夹作为 workspace，应用以 Markdown 文件作为真相源，用可重建的本地索引提供搜索、聚合和快速导航。应用第一屏是 Today Focus，跨 Project 聚合当前真正需要关注的 active Tasks；每个 Project 有明确目标、成功标准、状态和线性 Task 时间线；每个 Task 有结构化字段、Markdown 工作区、Todos、Progress、Artifacts 和 Acceptance Criteria。

Phase 1 不内置 LLM API，而是提供 Prompt Pack workflow：应用按用户意图组装高质量上下文，生成结构化 Markdown prompt，用户复制到外部 LLM，再把输出粘贴回 NierPod。LLM 输出默认不是事实，可以被保存为 LLM note、手动应用到 Task 或 Project、经用户确认后更新 Memory 或 Journal。

Phase 1 的核心闭环是：

```text
capture -> plan -> execute -> record -> produce artifacts -> summarize memory -> focus today
```

## User Stories

1. 作为 NierPod 用户，我想要创建一个本地 workspace，以便把 Project、Task、Memory 和 artifacts 保存在自己可控的文件夹里。
2. 作为 NierPod 用户，我想要重新打开已有 workspace，以便继续使用之前的 Project 状态和执行上下文。
3. 作为 NierPod 用户，我想要应用设置存储在 workspace 之外，以便 workspace 文件夹保持可迁移、可同步、可检查。
4. 作为 NierPod 用户，我想要 Markdown 文件作为真相源，以便我可以用普通编辑器、grep、Git 和 LLM 直接理解数据。
5. 作为 NierPod 用户，我想要应用启动时从 Markdown 重建状态，以便索引或缓存损坏时不会丢失核心数据。
6. 作为 Project owner，我想要创建 Project，以便为一组长期目标建立清晰容器。
7. 作为 Project owner，我想要编辑 Project title，以便项目名称能随着理解变化而更新。
8. 作为 Project owner，我想要编辑 Project goal，以便每个 Project 都有明确目标。
9. 作为 Project owner，我想要编辑 Project success criteria，以便判断 Project 何时完成。
10. 作为 Project owner，我想要编辑 Project status，以便区分 active、archived 等状态。
11. 作为 Project owner，我想要给 Project 设置 deadline，以便 Today Focus 和计划判断可以参考时间约束。
12. 作为 Project owner，我想要 archive Project，以便隐藏不再推进的工作但保留历史。
13. 作为 Project owner，我想要看到 Project 的 Task timeline，以便理解当前执行顺序和上下文。
14. 作为 Project owner，我想要拖拽排序 Project 内的 Tasks，以便按真实执行路线调整计划。
15. 作为 Project owner，我想要 Project 的 Task ordering 被持久化，以便重启应用后仍能保持同一条执行线。
16. 作为 Task executor，我想要在 Project 中创建 Task，以便把 Project goal 拆成可执行工作。
17. 作为 Task executor，我想要编辑 Task title，以便任务名称能准确表达当前工作。
18. 作为 Task executor，我想要编辑 Task status，以便清楚表达任务处于 backlog、ready、in_progress、blocked、done 或 archived。
19. 作为 Task executor，我想要只能通过显式 status change 标记 Task done，以便 checklist 完成不会误判整个任务完成。
20. 作为 Task executor，我想要编辑 Task priority，以便表达 p0、p1、p2、p3 的重要性差异。
21. 作为 Task executor，我想要编辑 Task lane，以便区分 main、parallel 和 optional 工作。
22. 作为 Task executor，我想要编辑 Task due date，以便时间敏感任务可以被 Today Focus 优先展示。
23. 作为 Task executor，我想要编辑 Task dependencies，以便知道当前任务依赖哪些前置工作。
24. 作为 Task executor，我想要 blocked Task 保持可见，以便阻塞不会从工作视野里消失。
25. 作为 Task executor，我想要在 Task detail 里维护 Context，以便保存执行任务所需的背景和约束。
26. 作为 Task executor，我想要在 Task detail 里维护 Todos，以便把一个 Task 内部拆成轻量 checklist。
27. 作为 Task executor，我想要在 Task detail 里记录 Progress，以便保留推进过程和中间判断。
28. 作为 Task executor，我想要在 Task detail 里维护 Acceptance Criteria，以便清楚知道任务完成需要满足什么条件。
29. 作为 Task executor，我想要 Task notes 支持 Markdown editor 和 preview，以便兼顾可读写和格式检查。
30. 作为 Task executor，我想要结构化字段使用控件编辑，以便状态、优先级、lane、due date 和 dependencies 不容易写错。
31. 作为 Task executor，我想要 Todos 使用 checklist UI，以便编辑体验比纯文本更高效。
32. 作为 Task executor，我想要 Task detail 中有 artifacts 结果面板，以便任务产出和执行上下文在同一处查看。
33. 作为 Artifact producer，我想要添加本地 Markdown artifact，以便把 PRD、设计稿、分析记录等结果纳入 Project。
34. 作为 Artifact producer，我想要添加 URL artifact，以便把外部链接和参考资料纳入 Task 上下文。
35. 作为 Artifact producer，我想要将 artifact 关联到 Task，以便知道每个产出服务于哪项工作。
36. 作为 Artifact producer，我想要 artifact records 被 manifest 持久化，以便应用能稳定索引和展示产出。
37. 作为 daily planner，我想要第一屏看到 Today Focus，以便打开应用后直接知道今天该推进什么。
38. 作为 daily planner，我想要 Today Focus 跨 Project 聚合 active Tasks，以便不用逐个 Project 查找当前工作。
39. 作为 daily planner，我想要 Today Focus 展示 Task 所属 Project context，以便快速判断任务背景。
40. 作为 daily planner，我想要 Today Focus 按 due date、priority、status、recency 和 task order 排序，以便列表符合实际工作优先级。
41. 作为 daily planner，我想要 pin Today Focus item，以便把今天一定要处理的任务固定在视野里。
42. 作为 daily planner，我想要 snooze Today Focus item，以便暂时推迟不适合今天处理的任务。
43. 作为 daily planner，我想要 hide Today Focus item，以便清理当天不需要关注但长期优先级不变的任务。
44. 作为 daily planner，我想要 Today Focus override 与 Task priority 分离，以便临时日程调整不会污染长期优先级。
45. 作为 quick capture 用户，我想要快速写入 Inbox item，以便捕获未归类想法、链接和任务苗头。
46. 作为 quick capture 用户，我想要 Inbox 存储为人类可读 Markdown，以便不依赖应用也能查看捕获内容。
47. 作为 quick capture 用户，我想要把 Inbox item 转成 Project，以便一个想法可以升级为长期目标。
48. 作为 quick capture 用户，我想要把 Inbox item 转成某个 Project 的 Task，以便捕获内容可以进入执行时间线。
49. 作为 quick capture 用户，我想要把 Inbox item 附加到已有 Task Context，以便补充信息不会丢失。
50. 作为 quick capture 用户，我想要 archive 或 delete Inbox item，以便 Inbox 可以持续清理。
51. 作为 LLM 用户，我想要选择 Prompt Pack intent，以便按 Plan this project、Break down this task、Review risks 等明确工作流生成 prompt。
52. 作为 LLM 用户，我想要看到 prompt 会包含哪些上下文，以便复制前知道自己将发送什么信息。
53. 作为 LLM 用户，我想要生成结构化 Markdown prompt，以便外部 LLM 能获得高质量上下文。
54. 作为 LLM 用户，我想要一键 copy prompt，以便把 prompt 粘贴到 Claude、Codex 或其他 LLM。
55. 作为 LLM 用户，我想要 paste-back 区域，以便把外部 LLM 的结果带回 NierPod。
56. 作为 LLM 用户，我想要保存 LLM 输出，以便保留建议、分析和推理记录。
57. 作为 LLM 用户，我想要 LLM 输出默认不是事实，以便未确认建议不会污染 Project、Task 或 Memory。
58. 作为 LLM 用户，我想要根据意图把输出保存到 LLM notes、Memory draft 或手动 apply flow，以便不同类型输出进入正确处理路径。
59. 作为 Memory keeper，我想要查看当前 Memory，以便知道 LLM 会消费哪些长期摘要。
60. 作为 Memory keeper，我想要生成 memory prompt pack，以便用外部 LLM 汇总 Project 状态和 Journal。
61. 作为 Memory keeper，我想要粘贴 LLM 生成的 memory draft，以便把外部总结带回应用。
62. 作为 Memory keeper，我想要替换 Memory 前进行确认，以便避免误覆盖长期上下文。
63. 作为 Memory keeper，我想要旧 Memory 被归档，以便可以追溯长期上下文如何变化。
64. 作为 Project historian，我想要关键 Project 和 Task 事件自动追加到 Journal，以便形成可读时间线。
65. 作为 Project historian，我想要编辑 Journal，以便补充人工判断和背景说明。
66. 作为 Project historian，我想要 Journal 保持人类可读，以便它能被自己、Git diff 和 LLM 理解。
67. 作为 search 用户，我想要全文搜索 Projects，以便快速找回目标、状态和背景。
68. 作为 search 用户，我想要全文搜索 Tasks，以便找回 Context、Todos、Progress、Artifacts 和 Acceptance Criteria。
69. 作为 search 用户，我想要搜索 Inbox、artifacts 和 saved LLM notes，以便所有核心信息都可发现。
70. 作为 search 用户，我想要索引可以从 Markdown 重建，以便搜索能力不成为新的真相源。
71. 作为外部编辑用户，我想要应用启动时扫描 workspace，以便外部改动能被识别。
72. 作为外部编辑用户，我想要运行时文件监听，以便应用在打开期间也能感知磁盘变化。
73. 作为外部编辑用户，我想要外部修改与未保存 App 编辑冲突时收到提示，以便应用不会静默覆盖我的文件。
74. 作为外部编辑用户，我想要冲突时可以 reload from disk、keep current draft 或 save as conflict copy，以便按具体情况处理。
75. 作为隐私敏感用户，我想要 Phase 1 没有 cloud dependency，以便核心工作不依赖远程服务。
76. 作为 NierPod 开发者，我想要用 NierPod 管理 NierPod 自己的开发，以便通过 dogfood 验证它是否真的可日用。
77. 作为 NierPod 开发者，我想要连续 7 天真实使用验证，以便 MVP 判断基于实际执行体验而不是功能清单。
78. 作为未来智能能力用户，我想要 Phase 1 保留可检查 Prompt Pack 层，以便 Phase 2 接入 LLM API 后仍能审阅上下文和输出。
79. 作为未来 agent workflow 用户，我想要所有写入在 Phase 1 都显式可控，以便后续结构化 proposal 和 review 能建立在可靠文件模型上。
80. 作为长期用户，我想要 NierPod 像个人工作台而不是 landing page 或自由文档画布，以便每天打开后能直接推进重要工作。

## Implementation Decisions

- Phase 1 采用桌面本地优先形态，使用 Electron app shell、React、TypeScript、Vite 和本地文件系统能力承载 UI 与 workspace 操作。
- Markdown 文件是真相源。SQLite、内存状态、搜索索引和 UI 缓存都是派生状态，必须可以从 workspace 文件重建。
- Workspace Manager 负责选择、创建、打开 workspace，并隔离应用级设置与 workspace 内容。应用设置不写入用户数据 workspace。
- Workspace Store 是核心深模块，负责读写 Project、Task、Inbox、Journal、Memory、Artifact manifest 和 saved LLM notes。它对上层暴露稳定领域操作，而不是让 UI 直接拼接文件内容。
- Markdown Codec 是核心深模块，负责解析和序列化 Project 与 Task Markdown，包括 frontmatter、固定 section、任务顺序、Todos、Artifacts 引用和 Acceptance Criteria。它需要保证写回后文件仍然人类可读、grep-friendly、Git-friendly 和 LLM-friendly。
- Domain Model 使用 Project 作为顶层规划对象。`Pod` 不作为内部对象、目录名或文件名，只保留在产品名 NierPod 中。
- Project 必须包含稳定 id、title、goal、success criteria、status、可选 deadline 和权威 Task order list。
- Task 使用稳定 id，身份不依赖标题、文件名或排序。文件名可以面向人类可读，引用和依赖使用稳定 id。
- Phase 1 只支持 Project -> Task 一层任务模型。Task 内部 checklist item 不是一等子任务。
- Task status 是显式字段，不从 checklist 自动推断。允许状态为 `backlog`、`ready`、`in_progress`、`blocked`、`done`、`archived`。
- Priority 与 Task order 分离。Priority 表达重要性，Task order 表达 Project 内纵向执行顺序。
- Lane 与 dependencies 提供轻量并行关系表达。Phase 1 不实现完整 DAG、甘特图或严格调度器。
- Project Service 负责 Project 创建、编辑、归档、Task order 更新和 timeline 查询，并通过 Journal Service 记录关键事件。
- Task Service 负责 Task 创建、字段编辑、section 编辑、Todos 同步、status change、dependency 管理和完成动作，并确保完成动作只能由显式 status change 触发。
- Artifact Registry 负责本地 Markdown artifact 和 URL artifact 的添加、关联、展示、索引和 manifest 持久化。
- Today Focus Engine 是核心深模块，输入 Projects、Tasks、Today overrides 和最近活动信息，输出跨 Project 的 focus list。候选范围为 active Tasks，排序考虑 due date、priority、status、recency 和 Project task order。
- Today Override Store 负责 pin、snooze、hide 等每日 override。Override 不修改 Task priority，也不改变长期 Project 计划。
- Inbox Workflow 负责快速捕获，并支持将 Inbox item 转成 Project、转成 Task、附加到 Task Context、archive 或 delete。
- Prompt Pack Builder 是核心深模块，按 intent 组装上下文并生成结构化 Markdown prompt。默认上下文是当前 Task 加紧凑 Project 上下文、dependency summaries、recent progress snippets 和 Memory；Whole-Project analysis 必须由用户显式触发。
- Prompt Output Intake 负责 paste-back 结果处理。LLM 输出默认不是事实，只能被 discard、保存为 LLM note、进入手动 apply flow，或经用户确认后写入 Journal/Memory。
- Memory Workflow 负责展示当前 Memory、生成 memory prompt、接收 memory draft、替换前确认、归档旧 Memory。
- Journal Service 负责自动追加关键事件，同时允许用户编辑 Journal。自动事件包括 Project created/archived、Task created、Task status changed、Task priority changed、Task completed、Artifact added、LLM suggestion saved、Acceptance Criteria changed。
- Search Indexer 使用可重建的本地全文索引。索引覆盖 Project、Task、Inbox、Artifacts 和 saved LLM notes；索引不拥有业务真相。
- File Watcher 和 Conflict Manager 负责启动扫描、运行时监听、外部修改检测和冲突提示。打开文件存在未保存 App 编辑时，不允许静默覆盖磁盘变化。
- UI 信息架构采用三栏工作台：顶栏放 workspace、search、Prompt Pack；左栏放 Today Focus、Inbox、Projects；中栏放 Task timeline；右栏放 Task detail 与 artifacts。
- Task detail UI 使用结构化控件编辑字段，Markdown editor/preview 编辑 notes，checklist UI 编辑 Todos，artifact panel 展示结果产出。
- Phase 1 不内置 OpenAI、Anthropic 或其他 LLM API 调用。所有 LLM 工作流通过 Prompt Pack、copy、paste-back 和用户确认完成。
- Phase 1 输出必须优先满足 7 天 dogfood 使用，而不是追求完整项目管理工具能力。

## Testing Decisions

- 好的测试应该验证外部行为和数据契约，不测试实现细节。重点是给定一组 workspace 文件和用户动作，系统能否产生正确的领域状态、Markdown 写回、索引结果、Prompt Pack、Journal 事件和冲突处理结果。
- Workspace Store 需要用 fixture workspace 测试读取、创建、更新、重启重建和派生索引重建，验证 Markdown 真相源不会被缓存状态替代。
- Markdown Codec 需要重点测试 Project 和 Task 的 round-trip：读取后写回不丢字段、不破坏固定 section、不错误重排 task order、不把 checklist 完成误判为 Task done。
- Domain Model 和 Task Service 需要测试 status、priority、lane、dependencies、due date、显式完成动作和 archive 行为。
- Today Focus Engine 需要表格化测试候选过滤、排序规则、blocked 可见性、pin/snooze/hide override，以及 override 不修改 Task priority。
- Inbox Workflow 需要测试快速捕获、转 Project、转 Task、附加到 Task Context、archive 和 delete 后的文件状态。
- Artifact Registry 需要测试本地 Markdown artifact、URL artifact、Task 关联、manifest 更新、搜索索引覆盖和 Task detail 展示所需数据。
- Prompt Pack Builder 需要 snapshot 或 golden-file 测试，验证不同 intent 包含正确上下文、排除未请求的 whole-project analysis，并输出结构化 Markdown prompt。
- Prompt Output Intake 和 Memory Workflow 需要测试 LLM 输出不会自动成为事实，替换 Memory 前必须确认，并且旧 Memory 会被归档。
- Journal Service 需要测试关键事件自动追加，同时保持 Journal 可人工编辑、可读和可重建。
- Search Indexer 需要测试从 Markdown 重建索引、增量更新、跨 Project/Task/Inbox/artifact/LLM note 搜索，以及索引损坏后的恢复。
- File Watcher 和 Conflict Manager 需要测试外部修改检测、未保存编辑冲突、reload from disk、keep current draft、save as conflict copy。
- UI 层测试应覆盖核心 workflow，而不是组件内部状态：创建 workspace、创建 Project、创建 Task、编辑 Task detail、排序、完成任务、Today Focus override、Inbox 转换、Prompt Pack copy/paste-back、Memory 更新确认。
- 当前仓库处于 docs-first 阶段，尚无既有测试先例。Phase 1 实现时应先建立围绕深模块的单元测试和少量端到端 workflow 测试，再扩展 UI 回归测试。
- MVP 验证必须包含 NierPod 自身作为第一个 dogfood Project，并记录连续 7 天使用中是否出现数据丢失、流程断点、外部修改覆盖或索引无法重建问题。

## Out of Scope

- 内置 OpenAI/Anthropic API 调用。
- streaming LLM chat UI。
- 自动 LLM memory generation。
- 自动 LLM Today Focus reasoning。
- agentic task editing。
- 结构化 LLM patch preview/apply。
- 完整 WYSIWYG 或 block editor。
- 嵌套任务树。
- 完整依赖图。
- 甘特图。
- 日历集成。
- 通知。
- cloud sync。
- 多设备同步。
- 协作。
- 认证。
- 内置 Git commit/push UI。
- 移动端 App。
- SaaS Web App。
- semantic search 或 embeddings。
- 替代团队项目管理工具。
- Notion clone。
- 先做通用知识库。
- cloud-first SaaS 主架构。
- 无审阅的 fully autonomous agent edits。
- 私有 opaque document format。

## Further Notes

- Phase 1 的完成标准不是功能清单全部存在，而是用户可以连续 7 天用 NierPod 管理 NierPod 自身开发，且不会因为数据结构、流程缺失或存储不可靠退回散乱笔记。
- Phase 1 结束后，Phase 2 规划应从真实使用记录出发，重点判断 Markdown source of truth 是否可靠、三栏工作台是否减少任务发散、Today Focus 是否有用、Prompt Pack 是否真的提升 LLM 输出质量、手动 Memory 更新是否过重。
- Phase 2 可以在 Phase 1 的文件模型和工作流被证明后接入 LLM API、结构化 Patch Preview、自动 Memory Drafting、LLM-Based Today Focus、Semantic Search 和 Project Health。
- Phase 3 可以探索更深入的本地 agent，但所有写入默认仍应通过用户 review，继续保护用户对 Memory 和文件真相源的控制权。
