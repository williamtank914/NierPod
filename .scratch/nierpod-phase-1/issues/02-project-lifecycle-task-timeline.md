# Project lifecycle and task timeline

Status: ready-for-human
Type: AFK

## Parent

`.scratch/nierpod-phase-1/PRD.md`

## What to build

实现 Project 的创建、编辑、归档和基础 Task timeline。用户可以在 workspace 中创建 Project，维护 title、goal、success criteria、status 和 deadline，并在 Project 视图中看到该 Project 的 Task 时间线入口。Project 的权威信息和 Task order 必须写入 Markdown，并能在应用重启后恢复。

这个 slice 先打通 Project 作为顶层规划对象的完整路径：UI 操作、领域模型、Markdown 读写、Journal 事件的必要挂点和重启恢复。Task 在本 slice 中只需要支持创建基础 title 并出现在 timeline 中，详细字段和编辑器由后续 slice 完成。

## Acceptance criteria

- [x] 用户可以创建 Project，并填写 title、goal、success criteria、status 和可选 deadline。
- [x] 用户可以编辑 Project title、goal、success criteria、status 和 deadline。
- [x] 用户可以 archive Project，归档后不再作为 active Project 展示。
- [x] Project 数据持久化为人类可读 Markdown。
- [x] 用户可以在 Project 中创建基础 Task title，并在 Project timeline 中看到该 Task。
- [x] Project 的 Task order 由 Project Markdown 持久化，应用重启后保持一致。
- [x] 有测试覆盖 Project Markdown round-trip、Project 创建/编辑/归档、基础 Task timeline 恢复。

## Implementation notes

- `src/modules/workspace/` 增加 Project 创建、编辑、归档、Task 创建和 workspace model 重建接口。
- `src/modules/markdown/` 增加 Project Markdown 解析/序列化，Project frontmatter 保存稳定 id、status、deadline 和 task order。
- renderer 三栏 workbench 增加 New Project 表单、Project 列表、New Task 表单和 timeline task 入口。
- `src/modules/journal/` 追加 Project/Task lifecycle 的人类可读事件 hook。

## Verification

- `pnpm exec tsx --test tests/project-task-lifecycle.test.ts`
- `pnpm exec tsx --test tests/renderer-workbench.test.ts`

## Blocked by

- `.scratch/nierpod-phase-1/issues/01-workspace-lifecycle-markdown-source.md`
