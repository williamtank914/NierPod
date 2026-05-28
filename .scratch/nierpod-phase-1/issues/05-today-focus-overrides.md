# Today Focus with daily overrides

Status: ready-for-human
Type: AFK

## Parent

`.scratch/nierpod-phase-1/PRD.md`

## What to build

实现 Today Focus 作为应用第一工作面。Today Focus 跨 Project 聚合 active Tasks，包含 `ready`、`in_progress`、`blocked`，并按 due date、priority、status、recency 和 Project task order 排序。每个 focus item 必须展示 Project context，blocked Task 必须保持可见。

同时实现每日 override：pin、snooze、hide。Override 只影响当天 focus 展示，不修改 Task 的长期 priority 或 Project task order。

## Acceptance criteria

- [x] 应用第一屏或主要入口展示 Today Focus。
- [x] Today Focus 跨 Project 聚合 `ready`、`in_progress`、`blocked` Tasks。
- [x] `done`、`archived` 和 archived Project 中的 Tasks 不作为 active focus 展示。
- [x] 排序规则考虑 due today/overdue、priority、status、recent activity 和 Project task order。
- [x] 每个 Task 展示所属 Project context。
- [x] Blocked Task 保持可见，并有清晰 blocked 表达。
- [x] 用户可以 pin、snooze、hide Today Focus item。
- [x] Today Focus override 不修改 Task priority 和 Project task order。
- [x] 有测试覆盖候选过滤、排序、blocked 可见性、pin/snooze/hide 和重启恢复。

## Implementation notes

- `src/modules/today-focus/` 实现 Today Focus 候选过滤、排序和每日 override 持久化。Override 写入 workspace 根目录 `today.md`，只影响当天展示，不修改 Task Markdown 中的 `priority` 或 Project `task_order`。
- `src/shared/ipc.ts`、`src/preload/index.ts`、`src/main/index.ts` 新增 `workspace.getTodayFocus` 和 `workspace.setTodayFocusOverride`，renderer 仍只能通过 allowlisted bridge 访问本地文件能力。
- renderer 工作台主区域新增 Today Focus 面板，展示 Task title、Project context、status、priority、due date 和 `pinned today` 状态，并提供 pin、snooze、hide 操作。

## Verification

- `pnpm test`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`

## Blocked by

- `.scratch/nierpod-phase-1/issues/02-project-lifecycle-task-timeline.md`
- `.scratch/nierpod-phase-1/issues/03-task-detail-editor.md`
