# Today Focus with daily overrides

Status: ready-for-agent
Type: AFK

## Parent

`.scratch/nierpod-phase-1/PRD.md`

## What to build

实现 Today Focus 作为应用第一工作面。Today Focus 跨 Project 聚合 active Tasks，包含 `ready`、`in_progress`、`blocked`，并按 due date、priority、status、recency 和 Project task order 排序。每个 focus item 必须展示 Project context，blocked Task 必须保持可见。

同时实现每日 override：pin、snooze、hide。Override 只影响当天 focus 展示，不修改 Task 的长期 priority 或 Project task order。

## Acceptance criteria

- [ ] 应用第一屏或主要入口展示 Today Focus。
- [ ] Today Focus 跨 Project 聚合 `ready`、`in_progress`、`blocked` Tasks。
- [ ] `done`、`archived` 和 archived Project 中的 Tasks 不作为 active focus 展示。
- [ ] 排序规则考虑 due today/overdue、priority、status、recent activity 和 Project task order。
- [ ] 每个 Task 展示所属 Project context。
- [ ] Blocked Task 保持可见，并有清晰 blocked 表达。
- [ ] 用户可以 pin、snooze、hide Today Focus item。
- [ ] Today Focus override 不修改 Task priority 和 Project task order。
- [ ] 有测试覆盖候选过滤、排序、blocked 可见性、pin/snooze/hide 和重启恢复。

## Blocked by

- `.scratch/nierpod-phase-1/issues/02-project-lifecycle-task-timeline.md`
- `.scratch/nierpod-phase-1/issues/03-task-detail-editor.md`

