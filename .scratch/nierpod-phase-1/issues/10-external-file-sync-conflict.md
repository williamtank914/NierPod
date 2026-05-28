# External file sync and conflict handling

Status: ready-for-human
Type: AFK

## Parent

`.scratch/nierpod-phase-1/PRD.md`

## What to build

实现外部 Markdown 修改检测和冲突处理。应用启动时扫描 workspace，运行时监听文件变化；当外部编辑修改 Project、Task、Inbox、Journal、Memory、Artifact 或 LLM note 时，应用更新派生状态。如果用户在应用内有未保存编辑，同时磁盘文件发生外部变化，应用不能静默覆盖，必须提示用户选择处理方式。

这个 slice 保护 Markdown source of truth 的可靠性，让用户可以继续用外部编辑器和 Git 管理文件，而不会被应用缓存或自动保存破坏。

## Acceptance criteria

- [x] 应用启动时扫描 workspace 并从文件重建当前状态。
- [x] 应用运行时监听 workspace 文件变化。
- [x] 外部修改 Project/Task/Inbox/Journal/Memory/artifact/LLM note 后，应用派生状态会更新。
- [x] 如果打开文件存在未保存 App 编辑且磁盘发生外部变化，应用显示冲突提示。
- [x] 冲突提示支持 reload from disk、keep current draft 和 save as conflict copy。
- [x] 应用不会静默覆盖外部修改。
- [x] conflict copy 保持人类可读，并能被用户找到。
- [x] 有测试或 smoke check 覆盖外部修改、未保存编辑冲突、三种冲突处理路径和数据不丢失。

## Implementation notes

- `src/modules/sync/` 实现 workspace 文件快照、变更 diff、冲突解决和 runtime watcher。
- main 进程在当前 workspace 可用时启动文件监听，通过受控 preload event 通知 renderer；`.nierpod` 派生索引文件被忽略，避免搜索索引刷新触发无意义事件。
- renderer 在当前 Task detail 有未保存 draft 且对应 Task Markdown 发生磁盘变化时显示冲突提示。
- `Reload from Disk` 会重新读取 Markdown workspace；`Keep Current Draft` 保留当前表单 draft；`Save Conflict Copy` 写入 `conflicts/` 下的人类可读 Markdown copy，不覆盖原文件。

## Verification

- `pnpm exec tsx --test tests/external-file-sync-conflict.test.ts`
- `pnpm exec tsx --test tests/renderer-workbench.test.ts`
- `pnpm exec tsx --test tests/ipc-contract.test.ts`
- `pnpm typecheck`
- `pnpm lint`

## Blocked by

- `.scratch/nierpod-phase-1/issues/01-workspace-lifecycle-markdown-source.md`
- `.scratch/nierpod-phase-1/issues/02-project-lifecycle-task-timeline.md`
- `.scratch/nierpod-phase-1/issues/03-task-detail-editor.md`
