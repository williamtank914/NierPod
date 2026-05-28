# 产品决策

日期：2026-05-28
状态：作为 Phase 1 规划基准

## 产品形态

NierPod 是一个本地优先的个人 Project Workspace，结合 notebook、todo list、项目规划和 LLM 可消费的长期 memory。

顶层对象统一命名为 Project。`Pod` 只属于产品名 NierPod 的品牌语义，不作为工程内部对象、目录名或 Markdown 文件名。一个 Project 必须有明确目标、成功标准和状态。Phase 1 不把没有结束态的长期领域或 Area 作为一等对象。

NierPod 的名字灵感来自《NIER: Automata》游戏中的辅助机械 Pod。在游戏里，Pod 是一种长期陪伴角色的智能辅助系统。NierPod 想做的也是类似的事情：持续陪伴、持续同步、持续辅助用户推进真正重要的事情。

NierPod 不是普通笔记软件。它应该帮助用户：

- 管理长期 Project 与任务时间线
- 聚合 Today Focus，告诉用户现在真正该做什么
- 保存可被 LLM 消费的长期 Memory
- 持续理解用户的目标、上下文与进展

核心模型是：

- 纵轴：一个 Project 被拆成线性的任务时间线
- 横轴：每个 Task 包含上下文、todos、进展、完成状态和结果产出
- 全局层：Today Focus 跨 Project 聚合当前应该关注的 Task
- memory 层：Markdown 文件保存长期个人 memory，并可被 LLM 消费

## 应用形态

Phase 1 是桌面本地优先应用，UI 按 Web App 方式实现。

已选技术栈：

- Electron
- React
- TypeScript
- Vite
- SQLite index cache
- Markdown files as source of truth

Phase 1 选择 Electron，因为这个产品依赖本地文件系统访问、文件监听、索引、Git-friendly 文件，以及未来和本地工具集成。等产品形态稳定后，可以再评估 Tauri。

## 真相源

Markdown 文件是真相源。App 索引、SQLite 表和缓存都是派生状态，必须可以从 Markdown workspace 重建。

用户选择一个普通文件夹作为 workspace，例如 `~/Documents/NierPod`。App 私有目录只放设置、缓存和派生索引。

Phase 1 必须保证文件格式：

- 人类可读
- Git-friendly
- grep-friendly
- LLM-friendly

## Workspace 结构

每个 Project 使用一个文件夹，而不是一个单独 Markdown 文件。

```text
workspace/
  inbox.md
  today.md
  projects/
    my-project/
      project.md
      journal.md
      memory.md
      memory/
        2026-05-28.md
      tasks/
        2026-05-28-define-mvp.md
      artifacts/
        artifact-manifest.json
        prd-v1.md
      llm/
        2026-05-28-plan-mvp.md
```

`project.md` 负责 Project 级元信息、目标、成功标准、状态和权威任务顺序。

`tasks/*.md` 负责 Task 级元信息和分区任务内容。

`journal.md` 是追加式历史记录。

`memory.md` 是当前给 LLM 消费的压缩摘要。

`memory/*.md` 保存历史 memory 快照。

`llm/*.md` 保存 LLM 建议和分析。这些内容还不是事实，也不是已确认决策。

## Project 模型

一个 Project 必须包含：

- 稳定 id
- title
- goal
- success criteria
- status
- 可选 deadline
- task order list

Task 排序属于 `project.md`，不属于每个 Task 文件。拖拽排序时，尽量只更新 Project 的任务列表。

任务顺序示例：

```markdown
## Tasks

- task_01JZEXAMPLE001: tasks/2026-05-28-define-mvp.md
- task_01JZEXAMPLE002: tasks/2026-05-29-build-editor.md
```

## Task 模型

Phase 1 只支持一层任务：Project -> Task。

不支持无限嵌套任务树。Task 文件内部可以有 checklist，但 checklist item 不是一等子任务。

每个 Task 使用稳定 ID。ID 不依赖标题、文件名或排序。

推荐规则：

- Task id：`task_` 加 ULID 或短 UUID
- 文件名：日期加人类可读 slug
- 引用使用 ID 作为稳定身份
- path 只是当前位置，不是身份

每个 Task 文件有固定 section：

```markdown
---
id: task_01JZEXAMPLE001
title: Define MVP
status: in_progress
priority: p1
lane: main
depends_on: []
due: 2026-06-01
---

# Context

# Todos

- [ ] Example todo

# Progress

# Artifacts

# Acceptance Criteria
```

UI 映射方式：

- 左侧：Context、Todos、Progress、Acceptance Criteria
- 右侧：Artifacts

## Task 状态

Task 完成状态不能只从 checklist 推断。`status` 必须是显式字段。

Phase 1 允许的状态：

- `backlog`
- `ready`
- `in_progress`
- `blocked`
- `done`
- `archived`

## 优先级和排序

排序和优先级是两个独立概念。

Task order 是 `project.md` 里的纵向顺序。

Priority 是离散的重要性信号：

- `p0`：今天或当前必须处理
- `p1`：重要
- `p2`：正常
- `p3`：低优先级

UI 中优先级颜色应该克制，但要能快速扫视。

## 并行任务

Phase 1 不实现完整 DAG、甘特图或依赖图。

并行关系用轻量字段表达：

```yaml
lane: main | parallel | optional
depends_on:
  - task_01JZEXAMPLE001
```

`depends_on` 用于提示、blocked 状态判断和 LLM 上下文理解。Phase 1 不把它作为严格调度器。

## Artifacts

本地文件和 URL 都是一等 artifact。

Artifacts 通过 manifest 管理：

```text
artifacts/
  artifact-manifest.json
  prd-v1.md
```

manifest entry 示例：

```json
{
  "id": "artifact_01JZEXAMPLE001",
  "title": "PRD v1",
  "type": "markdown",
  "path": "prd-v1.md",
  "url": null,
  "task_id": "task_01JZEXAMPLE001",
  "created_at": "2026-05-28T12:00:00+08:00"
}
```

## Today Focus

App 第一屏应该是 Today Focus，而不是空的 Project 列表。

Today Focus 跨 Project 聚合 Task。Project 只作为上下文展示，不作为主要 focus item。

Phase 1 候选规则：

```text
status in [ready, in_progress, blocked]
and not archived
```

Phase 1 排序规则：

```text
1. due today or overdue
2. priority p0 -> p1 -> p2 -> p3
3. in_progress before ready
4. recently active Project
5. Project task order
```

Blocked task 必须保持可见，并有清晰的 blocked 表达。

Today Focus 支持手动的每日 override：

- pin
- snooze
- hide

这些 override 不能修改 Task 的长期 priority。

## Inbox

Phase 1 包含全局 Inbox，用于快速捕获。

`inbox.md` 存储未归类的想法、链接和任务苗头。Inbox item 之后可以转成：

- 新 Project
- 某个 Project 的 Task
- 某个 Task 的 Context
- 归档或删除项

## Journal 和 Memory

`journal.md` 是追加式历史，也允许用户编辑补充。

App 应该自动追加关键事件：

- Project created or archived
- Task created
- Task status changed
- Task priority changed
- Task completed
- Artifact added
- LLM suggestion saved
- Acceptance Criteria changed

`memory.md` 是当前给 LLM 使用的压缩摘要。

Phase 1 不通过内置 LLM 自动生成 memory，而是提供引导式 prompt workflow，帮助用户用外部 LLM 生成 memory draft，审阅后再保存。

覆盖 `memory.md` 前，旧版本应该保留到 `memory/`。

## LLM 工作流

Phase 1 不集成实时 LLM API。

Phase 1 提供 Prompt Pack workflow。用户先选择意图，App 组装合适上下文，用户复制 prompt 到 Claude、Codex 或其他 LLM，再把结果粘贴回 NierPod。

初始支持的意图：

- Plan this project
- Break down this task
- Review risks
- Define acceptance criteria
- Summarize memory
- Suggest today focus

默认上下文策略是当前 Task 加紧凑 Project 上下文：

- current Task full Markdown
- Project goal、success criteria、status
- compact task outline
- dependency task summaries
- recent progress snippets
- `memory.md`

Whole-Project analysis 必须由用户显式触发，不作为默认行为。

LLM 输出默认不是事实。它可以被：

- discard
- save as `llm/*.md`
- 手动 apply 到 Task 或 Project
- 用户确认后 append 到 `journal.md`

## 编辑器策略

Phase 1 使用 Markdown 编辑加结构化表单控件。

status、priority、due date、lane、dependencies 等结构化字段使用 UI 控件。Markdown section 使用文本编辑器和 preview。Todos 使用 checklist UI，并同步到 Markdown。

Phase 1 不实现完整 Notion-like WYSIWYG 或 block editor。

## 搜索和索引

Phase 1 包含基础全文搜索。

搜索范围：

- Project title 和 goal
- Task title、status、priority
- Task Context、Todos、Progress、Artifacts、Acceptance Criteria
- Inbox
- saved LLM notes

SQLite FTS 是优先的派生索引方案。

## 外部文件修改

Phase 1 支持外部 Markdown 编辑，但不做自动冲突合并。

规则：

- App 启动时扫描 workspace 并重建索引
- 运行时监听文件并增量更新索引
- 如果打开中的文件有未保存 App 编辑，同时磁盘文件外部变化，则提示用户
- 冲突选项：reload from disk、keep current draft、save as conflict copy
- 不能静默覆盖外部修改

## Git

Git 不是 Phase 1 产品功能。

App 仍应产生 Git-friendly 文件：

- 可读 Markdown
- 稳定 ID
- 小范围局部写入
- 尽量减少整文件重写

未来版本可以增加 Git backup、commit helper 或 memory sync。

## UI 信息架构

Phase 1 使用三栏工作台布局：

```text
Top bar: workspace, search, prompt pack
Left: Today Focus, Inbox, Projects
Middle: Task timeline
Right: Task detail with work notes and artifacts
```

产品应该像一个专注的个人工作台，而不是 landing page 或自由文档画布。
