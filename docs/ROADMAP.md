# 路线图

日期：2026-05-28
状态：持续维护的 roadmap

## North Star

NierPod 要成为一个本地优先的个人 memory 和执行系统。

名字灵感来自《NIER: Automata》游戏中的辅助机械 Pod。NierPod 的产品愿景不是成为普通笔记软件，而是成为一个长期陪伴、持续同步、持续辅助用户推进重要 Project 的个人智能工作台。

它应该帮助用户：

- 捕获 projects、tasks、notes、links 和 outputs
- 在很多 Project 之间保持清晰的每日 focus
- 用普通文件保存长期个人 memory
- 给 LLM 提供高质量上下文，避免手动重组信息
- 最终允许 LLM 在用户审阅下安全地建议和应用结构化修改

## Phase 1：本地优先 + 手动 LLM Workflow

Phase 1 验证核心产品闭环：

```text
capture -> plan -> execute -> record -> produce artifacts -> summarize memory -> focus today
```

Phase 1 特征：

- desktop local-first app
- Markdown source of truth
- rebuildable SQLite index
- Project 和 Task model
- Today Focus
- Inbox
- Prompt Pack，而不是内置 LLM API
- 手动 paste-back LLM outputs
- 用户审阅后更新 memory
- 无 cloud dependency

精确范围见 `docs/MVP_SCOPE.md`。

## Phase 2：集成智能能力

Phase 2 在 Phase 1 证明文件模型和用户工作流后，加入内置智能能力。

### LLM API 集成

- OpenAI API support
- 必要时支持 Anthropic API
- model selection
- API key management
- streaming responses
- request history
- retry and error handling
- per-workspace privacy controls

### 结构化 Patch Preview

LLM 输出应该变成结构化 proposal，而不是原始文本。

能力包括：

- create Task proposal
- update Task fields
- add Acceptance Criteria
- add Todos
- add Progress note
- create Artifact draft
- update `memory.md`
- update Today Focus recommendation

文件写入前必须由用户审阅 proposed changes。

### 自动 Memory Drafting

增加一等 Generate Memory 功能：

- 收集 Project state
- 总结 journal 和 progress
- 识别 completed tasks 和 artifacts
- 生成 memory draft
- 展示与当前 `memory.md` 的 diff
- 要求用户 approve
- 归档旧 memory snapshot

### LLM-Based Today Focus

用 LLM reasoning 增强规则型 Today Focus：

- 解释为什么某个 task 今天重要
- 识别 overdue 或 neglected work
- 建议现实的 daily plan
- 发现需要 unblock 的 blocked tasks
- 提醒 approaching due dates
- 建议推迟低价值任务

规则型引擎仍然保留为 fallback。

### Prompt Pack 演进

即使接入 API 后，也保留 Prompt Pack 作为可检查层。

用户应该能够：

- 查看将发送哪些上下文
- 手动 copy prompt
- 使用内置模型运行
- 保存 prompt 和 response
- 对比不同模型输出

### Semantic Search

基础搜索稳定后，再增加 embeddings。

能力包括：

- semantic task search
- similar past decisions
- related artifacts
- memory-aware retrieval
- Project-level context assembly

### Project Health

围绕 Project 状态增加智能判断：

- stale Project detection
- missing success criteria detection
- blocked-task clustering
- risk summaries
- next-action suggestions
- task scope warnings

## Phase 3：更深入的本地 Agent

Phase 3 探索更 agentic 的能力，同时继续保护用户对 memory 的控制权。

### Agentic Task Maintenance

可能能力：

- monitor stale tasks
- propose task splits
- propose archival
- update task summaries
- detect duplicate tasks
- suggest dependency cleanup

除非用户显式开启可信自动化，否则所有写入仍然应该经过 review。

### Codex 和 Claude Context Export

让 NierPod memory 可以直接服务 coding agents。

能力包括：

- export Project context pack for Codex
- export memory pack for Claude
- include task status、decisions、artifacts、constraints
- generate repo-local planning docs
- keep external agent prompts reproducible

### Git 集成

潜在 Git 功能：

- initialize Git repo for workspace
- show file diffs
- commit memory snapshots
- commit daily journal changes
- backup to remote
- conflict helper

Git 应保持可选。

### Calendar 和 Reminder 集成

潜在能力：

- calendar import
- due date reminders
- daily review reminder
- weekly planning review
- overdue task notifications

### 多设备同步

Sync 不属于 Phase 1。

未来选项：

- user-managed Git sync
- iCloud/Dropbox folder sync
- app-managed encrypted sync
- SaaS sync layer

无论哪种同步方式，都必须保留用户对本地 Markdown 的所有权。

### 更丰富的编辑器

等 Markdown model 稳定后，再评估更丰富的编辑能力。

可能改进：

- Markdown shortcuts
- split editor/preview
- table editor
- slash commands
- block-like interactions backed by Markdown
- backlinks

避免让私有 JSON 成为真相源。

## 暂不考虑的方向

除非后续重新决策，否则以下不是当前方向：

- 替代团队项目管理工具
- 做 Notion clone
- 先做通用知识库
- cloud-first SaaS 作为主架构
- 无审阅的 fully autonomous agent edits
- 私有 opaque document format

## 规划规则

Phase 1 完成后，Phase 2 规划应该从这份 roadmap 和真实 7 天使用记录出发，而不是重新空白讨论。

Phase 1 结束后的关键问题：

- Markdown source of truth 是否可靠？
- 三栏工作台是否减少了任务发散？
- Today Focus 选择的工作是否有用？
- Prompt Pack 是否产生了真正有价值的 LLM 答案？
- 手动 memory 更新是否太重？
- 哪些 workflow 重复到值得接 API？
- 是否有任何文件格式决策阻碍后续自动化？
