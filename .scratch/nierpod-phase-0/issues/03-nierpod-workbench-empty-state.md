# NierPod workbench empty state

Status: ready-for-human
Type: AFK

## Parent

`.scratch/nierpod-phase-0/PRD.md`

## What to build

实现 Phase 0 的 NierPod 三栏工作台空状态。界面应该展示产品的信息架构，而不是假装业务功能已经完成：左栏预留 Today Focus、Inbox、Projects；中栏预留 Task timeline；右栏预留 Task detail、notes、acceptance criteria 和 artifacts。界面还需要提供 workspace 选择入口占位，并清楚表达 Phase 0 不会真实创建或修改用户 workspace 数据。

完成后，打开 NierPod 桌面应用可以看到一个安静、工作导向、可继续扩展的本地优先个人工作台底座。

## Acceptance criteria

- [x] 应用启动后展示 NierPod 工作台，而不是 landing page。
- [x] UI 使用三栏布局：左侧 Today Focus/Inbox/Projects，中间 Task timeline，右侧 Task detail/artifacts。
- [x] Today Focus、Inbox、Projects、Task timeline、Task detail、Artifacts、Memory、Prompt Pack 等产品词汇与 docs 保持一致。
- [x] Workspace 选择入口以占位方式出现，并明确不会在 Phase 0 静默创建或修改用户文件。
- [x] UI 不展示假 Project、假 Task 或容易被误解为真实数据的内容。
- [x] 视觉风格克制、工作导向，适合作为后续 Phase 1 UI 基线。
- [x] renderer 通过已定义 bridge 获取必要的 app/bridge 状态，不绕过边界。
- [x] 有 smoke check 或 renderer 测试覆盖三栏 landmark 和 workspace 入口占位。

## Blocked by

- `.scratch/nierpod-phase-0/issues/01-repo-baseline-runnable-electron-app.md`
- `.scratch/nierpod-phase-0/issues/02-typed-main-preload-renderer-boundary.md`

## Comments

- 2026-05-28：完成 Phase 0 issue 03。renderer 首屏改为三栏 NierPod workbench：左侧 Workspace/Today Focus/Inbox/Projects/Memory/Prompt Pack，中间 Task timeline，右侧 Task detail/Notes/Acceptance Criteria/Artifacts/Memory/Prompt Pack。Workspace 入口是 disabled placeholder，并显示 Phase 0 不会创建或修改 workspace 文件；renderer 继续通过 `window.nierpod.workspace.describeAccess()` 获取 bridge 状态。新增 `tests/renderer-workbench.test.ts` 覆盖三栏 landmark、产品词汇和 workspace 占位入口。验证通过：`pnpm install --frozen-lockfile`、`pnpm test`、`pnpm build`、`pnpm typecheck`、`pnpm lint`，并通过 `pnpm dev` smoke check 确认桌面窗口渲染三栏工作台。
