# MVP 范围

日期：2026-05-28
状态：Phase 1 范围

## MVP 目标

构建一个本地优先的桌面应用，让用户可以真实日用，用它管理 NierPod 自己的开发和其他实际项目。

MVP 的完成标准不是功能列表勾完，而是用户可以连续 7 天真实使用，不因为数据结构、流程缺失或存储不可靠而退回散乱笔记。

## 范围内

### 桌面壳

- Electron app shell
- React + TypeScript + Vite UI
- 本地 workspace 选择或创建
- App 设置存储在用户数据 workspace 之外

### 文件型 Workspace

- Markdown 文件是真相源
- Project folder structure under `projects/`
- `inbox.md`
- `today.md` 或等价 daily state file
- Project 文件：`project.md`、`journal.md`、`memory.md`
- Task 文件位于 `tasks/`
- artifact manifest 位于 `artifacts/artifact-manifest.json`
- 保存的 LLM 输出位于 `llm/`

### Project 管理

- 创建 Project
- 编辑 Project title、goal、success criteria、status、deadline
- archive Project
- 展示 Project task timeline
- 在 `project.md` 中持久化 task ordering

### Task 管理

- 创建 Task
- 编辑 Task title
- 编辑 status：`backlog`、`ready`、`in_progress`、`blocked`、`done`、`archived`
- 编辑 priority：`p0`、`p1`、`p2`、`p3`
- 编辑 lane：`main`、`parallel`、`optional`
- 编辑 due date
- 编辑 dependencies
- 在 Project 内拖拽任务排序
- 只能通过显式 status change 标记 task done

### Task Detail

每个 Task 支持：

- Context
- Todos
- Progress
- Artifacts
- Acceptance Criteria

Phase 1 UI 应该把这些组织成高效的 task detail pane：

- 字段使用结构化控件
- notes 使用 Markdown editor 和 preview
- Todos 使用 checklist UI
- Artifacts 使用结果面板

### Artifacts

- 添加本地 Markdown artifact
- 添加 URL artifact
- 将 artifact 关联到 Task
- 在 Task detail 中展示 artifacts
- 在 manifest 中持久化 artifact records

### Today Focus

- 跨 Project 聚合 active Tasks
- 包含 `ready`、`in_progress`、`blocked`
- 按 due date、priority、status、recency、task order 排序
- 为每个 Task 展示 Project context
- 支持 pin
- 支持 snooze
- 支持 hide
- Today Focus override 与 Task priority 分离

### Inbox

- 快速捕获未归类 item
- 存储在 `inbox.md`
- 将 Inbox item 转成 Project
- 将 Inbox item 转成 Task
- 将 Inbox item 附加到已有 Task Context
- archive 或 delete Inbox item

### Prompt Pack Workflows

Phase 1 不直接调用 LLM API。

必须提供引导式 prompt pack flow，支持：

- Plan this project
- Break down this task
- Review risks
- Define acceptance criteria
- Summarize memory
- Suggest today focus

每个 flow 必须：

- 说明会包含什么上下文
- 生成结构化 Markdown prompt
- 提供 copy action
- 提供 paste-back 区域
- 根据意图把输出保存到 `llm/*.md`、`memory.md` 或进入手动 apply flow

Prompt workflow 必须像一个明确的 LLM 工作流产品，而不是简单原始文本拼接。

### Journal

- 自动将关键 Project 和 Task 事件追加到 `journal.md`
- 允许用户编辑 journal
- 保持人类可读的时间线

### Memory

- 展示当前 `memory.md`
- 生成 memory prompt pack
- 允许用户粘贴 LLM 生成的 memory draft
- 替换 `memory.md` 前需要用户确认
- 将旧 memory 归档到 `memory/`

### Search

- 基础全文搜索
- 搜索 Projects、Tasks、Inbox、artifacts、saved LLM notes
- 使用可重建的 SQLite FTS index 或等价本地索引

### 外部文件同步

- 启动时扫描 workspace
- 从文件重建派生索引
- 运行时监听文件
- 检测外部修改
- 打开的文件有未保存 App 编辑时，不能静默覆盖
- 必要时支持 conflict copy

### Roadmap 文档

仓库必须包含 `docs/ROADMAP.md`，并在 Phase 1 开发期间持续保留 Phase 2/3 的规划上下文。

## 范围外

Phase 1 不包含：

- 内置 OpenAI/Anthropic API 调用
- streaming LLM chat UI
- 自动 LLM memory generation
- 自动 LLM Today Focus reasoning
- agentic task editing
- 结构化 LLM patch preview/apply
- 完整 WYSIWYG 或 block editor
- 嵌套任务树
- 完整依赖图
- 甘特图
- 日历集成
- 通知
- cloud sync
- 多设备同步
- 协作
- 认证
- 内置 Git commit/push UI
- 移动端 App
- SaaS Web App
- semantic search 或 embeddings

## MVP 完成标准

只有以下条件都成立，MVP 才算完成：

- 用户可以创建 workspace
- 用户可以创建带 goal 和 success criteria 的 Project
- 用户可以创建、编辑、排序和完成 Tasks
- Task 文件保持可读 Markdown
- Project task order 持久化在 `project.md`
- App 重启后可以从 Markdown 重建可用状态
- Today Focus 展示跨 Project 的 active work
- Inbox 支持快速捕获和转换
- Prompt Pack 可以引导 task planning 和 memory summary workflow
- journal 自动记录关键事件
- memory 可以手动生成和更新
- 搜索覆盖核心内容
- 外部 Markdown 修改可以被检测
- 正常使用期间没有关键数据丢失
- NierPod 可以连续 7 天管理自身开发

## MVP 验证项目

第一个真实管理的 Project 应该是 NierPod 本身。

这个 dogfood Project 应该包含：

- build app shell
- implement workspace storage
- implement Project and Task model
- implement task timeline
- implement Task detail editor
- implement Today Focus
- implement Inbox
- implement Prompt Pack workflows
- implement journal and memory flows
- implement search
- run seven-day daily use validation
