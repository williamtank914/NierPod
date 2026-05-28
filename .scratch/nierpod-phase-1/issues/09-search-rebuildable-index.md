# Search and rebuildable index

Status: ready-for-agent
Type: AFK

## Parent

`.scratch/nierpod-phase-1/PRD.md`

## What to build

实现基础全文搜索和可重建索引。用户可以搜索 Projects、Tasks、Inbox、artifacts 和 saved LLM notes。索引使用 SQLite FTS 或等价本地索引，但索引只是派生状态，必须可以从 Markdown workspace 重建。

这个 slice 需要贯穿 workspace 扫描、索引构建、增量更新、搜索 UI、结果跳转和索引恢复。完成后，用户可以用搜索找回核心内容，并且删除或损坏索引后仍能从 Markdown 重建。

## Acceptance criteria

- [ ] 搜索覆盖 Project title、goal 和核心 Project 元信息。
- [ ] 搜索覆盖 Task title、status、priority、Context、Todos、Progress、Artifacts 和 Acceptance Criteria。
- [ ] 搜索覆盖 Inbox、artifact records 和 saved LLM notes。
- [ ] 应用启动时可以从 Markdown workspace 建立或重建索引。
- [ ] 核心内容变化后索引可以更新。
- [ ] 搜索结果展示足够上下文，并能跳转到对应 Project、Task、Inbox item、artifact 或 LLM note。
- [ ] 索引删除或损坏后，不影响 Markdown 真相源，并可重建。
- [ ] 有测试覆盖重建索引、增量更新、跨类型搜索、结果跳转目标和索引恢复。

## Blocked by

- `.scratch/nierpod-phase-1/issues/01-workspace-lifecycle-markdown-source.md`
- `.scratch/nierpod-phase-1/issues/02-project-lifecycle-task-timeline.md`
- `.scratch/nierpod-phase-1/issues/03-task-detail-editor.md`
- `.scratch/nierpod-phase-1/issues/04-artifacts-and-journal.md`
- `.scratch/nierpod-phase-1/issues/06-inbox-capture-conversion.md`
- `.scratch/nierpod-phase-1/issues/07-prompt-pack-workflow.md`
- `.scratch/nierpod-phase-1/issues/08-memory-workflow.md`

