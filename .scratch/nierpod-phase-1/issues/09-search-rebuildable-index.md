# Search and rebuildable index

Status: ready-for-human
Type: AFK

## Parent

`.scratch/nierpod-phase-1/PRD.md`

## What to build

实现基础全文搜索和可重建索引。用户可以搜索 Projects、Tasks、Inbox、artifacts 和 saved LLM notes。索引使用 SQLite FTS 或等价本地索引，但索引只是派生状态，必须可以从 Markdown workspace 重建。

这个 slice 需要贯穿 workspace 扫描、索引构建、增量更新、搜索 UI、结果跳转和索引恢复。完成后，用户可以用搜索找回核心内容，并且删除或损坏索引后仍能从 Markdown 重建。

## Acceptance criteria

- [x] 搜索覆盖 Project title、goal 和核心 Project 元信息。
- [x] 搜索覆盖 Task title、status、priority、Context、Todos、Progress、Artifacts 和 Acceptance Criteria。
- [x] 搜索覆盖 Inbox、artifact records 和 saved LLM notes。
- [x] 应用启动时可以从 Markdown workspace 建立或重建索引。
- [x] 核心内容变化后索引可以更新。
- [x] 搜索结果展示足够上下文，并能跳转到对应 Project、Task、Inbox item、artifact 或 LLM note。
- [x] 索引删除或损坏后，不影响 Markdown 真相源，并可重建。
- [x] 有测试覆盖重建索引、增量更新、跨类型搜索、结果跳转目标和索引恢复。

## Implementation notes

- `src/modules/search/` 实现 rebuildable JSON 派生索引，写入 `.nierpod/search-index.json`；Markdown workspace 仍是真相源。
- 索引覆盖 Project、Task、Inbox、Task artifact 记录和 saved LLM notes，并为结果返回可跳转 target。
- main 进程在打开、创建、读取当前 workspace 和 mutation 返回路径刷新搜索索引；`workspace.search` 搜索时也会从 Markdown 重建，确保索引删除或损坏后可恢复。
- renderer 左栏新增 Workspace Search，展示结果 kind、路径和 preview，点击 Project/Task/artifact/LLM note 结果会切换到对应 Project/Task。

## Verification

- `pnpm exec tsx --test tests/search-rebuildable-index.test.ts`
- `pnpm exec tsx --test tests/ipc-contract.test.ts`
- `pnpm exec tsx --test tests/renderer-workbench.test.ts`
- `pnpm typecheck`

## Blocked by

- `.scratch/nierpod-phase-1/issues/01-workspace-lifecycle-markdown-source.md`
- `.scratch/nierpod-phase-1/issues/02-project-lifecycle-task-timeline.md`
- `.scratch/nierpod-phase-1/issues/03-task-detail-editor.md`
- `.scratch/nierpod-phase-1/issues/04-artifacts-and-journal.md`
- `.scratch/nierpod-phase-1/issues/06-inbox-capture-conversion.md`
- `.scratch/nierpod-phase-1/issues/07-prompt-pack-workflow.md`
- `.scratch/nierpod-phase-1/issues/08-memory-workflow.md`
