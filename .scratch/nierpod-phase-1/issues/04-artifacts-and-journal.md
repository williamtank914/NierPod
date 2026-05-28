# Artifacts and Journal

Status: ready-for-agent
Type: AFK

## Parent

`.scratch/nierpod-phase-1/PRD.md`

## What to build

实现 Task 产出和 Project 历史记录。用户可以为 Task 添加本地 Markdown artifact 或 URL artifact，在 Task detail 中看到关联 artifacts；应用通过 manifest 持久化 artifact records。与此同时，关键 Project 和 Task 事件自动追加到 Journal，并允许用户查看和编辑 Journal。

这个 slice 让 NierPod 从任务编辑器升级为可记录执行历史和产出结果的工作台。Artifact 和 Journal 都需要保持人类可读、可重建，并为后续 Prompt Pack、Memory 和 Search 提供可靠上下文。

## Acceptance criteria

- [ ] 用户可以给 Task 添加本地 Markdown artifact。
- [ ] 用户可以给 Task 添加 URL artifact。
- [ ] Artifact 可以关联到 Task，并在 Task detail 中展示。
- [ ] Artifact records 通过 manifest 持久化，应用重启后可恢复。
- [ ] Project created、Project archived、Task created、Task status changed、Task priority changed、Task completed、Artifact added、Acceptance Criteria changed 等关键事件会追加到 Journal。
- [ ] 用户可以查看并编辑 Journal。
- [ ] Journal 保持人类可读 Markdown 时间线。
- [ ] 有测试覆盖 artifact manifest round-trip、Task artifact 关联、Journal 自动事件追加和用户编辑保留。

## Blocked by

- `.scratch/nierpod-phase-1/issues/03-task-detail-editor.md`

