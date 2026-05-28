# Project lifecycle and task timeline

Status: ready-for-agent
Type: AFK

## Parent

`.scratch/nierpod-phase-1/PRD.md`

## What to build

实现 Project 的创建、编辑、归档和基础 Task timeline。用户可以在 workspace 中创建 Project，维护 title、goal、success criteria、status 和 deadline，并在 Project 视图中看到该 Project 的 Task 时间线入口。Project 的权威信息和 Task order 必须写入 Markdown，并能在应用重启后恢复。

这个 slice 先打通 Project 作为顶层规划对象的完整路径：UI 操作、领域模型、Markdown 读写、Journal 事件的必要挂点和重启恢复。Task 在本 slice 中只需要支持创建基础 title 并出现在 timeline 中，详细字段和编辑器由后续 slice 完成。

## Acceptance criteria

- [ ] 用户可以创建 Project，并填写 title、goal、success criteria、status 和可选 deadline。
- [ ] 用户可以编辑 Project title、goal、success criteria、status 和 deadline。
- [ ] 用户可以 archive Project，归档后不再作为 active Project 展示。
- [ ] Project 数据持久化为人类可读 Markdown。
- [ ] 用户可以在 Project 中创建基础 Task title，并在 Project timeline 中看到该 Task。
- [ ] Project 的 Task order 由 Project Markdown 持久化，应用重启后保持一致。
- [ ] 有测试覆盖 Project Markdown round-trip、Project 创建/编辑/归档、基础 Task timeline 恢复。

## Blocked by

- `.scratch/nierpod-phase-1/issues/01-workspace-lifecycle-markdown-source.md`

