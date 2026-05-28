# Inbox capture and conversion

Status: ready-for-human
Type: AFK

## Parent

`.scratch/nierpod-phase-1/PRD.md`

## What to build

实现全局 Inbox，从快速捕获到归类转换形成完整路径。用户可以快速写入未归类 item，Inbox 内容存储在 Markdown 中；随后可以将 Inbox item 转成新 Project、转成某个 Project 的 Task、附加到已有 Task Context，或者 archive/delete。

这个 slice 需要确保 Inbox 是捕获入口，而不是另一个孤立笔记区。转换后，源 Inbox item 的状态应清晰，目标 Project/Task/Context 应可立即在 UI 中看到，并能在重启后恢复。

## Acceptance criteria

- [x] 用户可以快速创建 Inbox item。
- [x] Inbox item 存储在人类可读 Markdown 中。
- [x] 用户可以将 Inbox item 转成新 Project。
- [x] 用户可以将 Inbox item 转成已有 Project 的 Task。
- [x] 用户可以将 Inbox item 附加到已有 Task Context。
- [x] 用户可以 archive 或 delete Inbox item。
- [x] 转换后目标 Project/Task/Context 在 UI 中可见，重启后可恢复。
- [x] 有测试覆盖捕获、转 Project、转 Task、附加 Context、archive/delete 和 Markdown 状态。

## Implementation notes

- `src/modules/inbox/` 实现 `inbox.md` 的 Markdown table 读写，记录 `open`、`converted_to_project`、`converted_to_task`、`attached_to_task`、`archived` 状态和目标 Project/Task id。
- `src/modules/workspace/` 新增 `captureInboxItem`、`convertInboxItemToProject`、`convertInboxItemToTask`、`attachInboxItemToTaskContext`、`archiveInboxItem`、`deleteInboxItem`，转换复用既有 Project/Task Markdown 写入路径。
- `src/shared/ipc.ts`、`src/preload/index.ts`、`src/main/index.ts` 新增 Inbox allowlisted bridge 操作，mutation 返回最新 workspace state 和 Inbox item 列表。
- renderer sidebar 新增全局 Inbox 面板，支持快速 capture、转 Project、转选中 Project 的 Task、附加到选中 Task Context、archive 和 delete；转换后自动选中目标 Project/Task。

## Verification

- `pnpm test`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`

## Blocked by

- `.scratch/nierpod-phase-1/issues/01-workspace-lifecycle-markdown-source.md`
- `.scratch/nierpod-phase-1/issues/02-project-lifecycle-task-timeline.md`
- `.scratch/nierpod-phase-1/issues/03-task-detail-editor.md`
