# Task detail editor

Status: ready-for-agent
Type: AFK

## Parent

`.scratch/nierpod-phase-1/PRD.md`

## What to build

实现 Task detail 的核心编辑体验。用户可以在 Project timeline 中选择 Task，在 detail pane 中编辑 status、priority、lane、due date、dependencies、Context、Todos、Progress 和 Acceptance Criteria。Task status 必须是显式字段，不能从 checklist 自动推断；只有显式 status change 才能标记 Task done。

这个 slice 需要打通 Task Markdown 解析/序列化、结构化控件、Markdown section editor、Todos checklist UI、重启恢复和完成动作验证。完成后，一个 Task 已经可以作为真实执行单元使用。

## Acceptance criteria

- [ ] 用户可以选择 Task 并打开 Task detail。
- [ ] 用户可以编辑 Task title、status、priority、lane、due date 和 dependencies。
- [ ] 用户可以编辑 Context、Progress 和 Acceptance Criteria Markdown section。
- [ ] 用户可以通过 checklist UI 编辑 Todos，并同步回 Markdown。
- [ ] checklist 全部勾选不会自动把 Task 标记为 done。
- [ ] 只有显式 status change 可以将 Task 标记为 done。
- [ ] Task 文件使用稳定 id，身份不依赖标题、文件名或排序。
- [ ] 应用重启后 Task detail 的结构化字段和 Markdown sections 可恢复。
- [ ] 有测试覆盖 Task Markdown round-trip、显式完成规则、Todos 同步和结构化字段编辑。

## Blocked by

- `.scratch/nierpod-phase-1/issues/02-project-lifecycle-task-timeline.md`

