# Workspace lifecycle and Markdown source of truth

Status: ready-for-human
Type: AFK

## Parent

`.scratch/nierpod-phase-1/PRD.md`

## What to build

实现 NierPod 的 workspace 生命周期，让用户可以选择或创建一个普通本地文件夹作为 workspace，并让应用从该文件夹中的 Markdown 文件重建基础状态。这个 slice 需要贯穿桌面入口、IPC 边界、workspace 存储、基础 UI 状态和验证检查，确认 Markdown 是真相源，应用设置不写入用户数据 workspace。

完成后，用户可以打开应用，选择或创建 workspace，看到当前 workspace 状态；重启应用后，应用可以从本地 Markdown workspace 恢复基础状态，而不是依赖不可重建的缓存。

## Acceptance criteria

- [x] 用户可以从 UI 选择已有本地文件夹作为 workspace。
- [x] 用户可以从 UI 创建新的 workspace，并生成 Phase 1 所需的基础 Markdown workspace 结构。
- [x] 应用设置存储在 workspace 之外，不污染用户数据 workspace。
- [x] workspace 中的核心文件保持人类可读 Markdown。
- [x] 应用重启后可以从 workspace 文件重建基础状态。
- [x] renderer 只能通过受控 IPC/bridge 调用 workspace 能力，不直接访问本地文件系统。
- [x] 有测试或 smoke check 覆盖创建 workspace、打开 workspace、重启恢复和设置隔离。

## Implementation notes

- `src/modules/workspace/` 现在负责创建基础 Markdown 结构、扫描 workspace Markdown、保存最近 workspace 路径到 Electron `userData` 下的 `nierpod-settings.json`，并提供重启恢复入口。
- `src/shared/ipc.ts`、`src/main/index.ts`、`src/preload/index.ts` 和 `src/renderer/src/App.tsx` 已接入 allowlisted workspace IPC/bridge，renderer 不直接访问本地文件系统。
- `tests/workspace-lifecycle.test.ts` 覆盖创建 workspace、打开 workspace、从设置重启恢复、workspace 内不写入 app 设置。
- 验证已通过：`pnpm test`、`pnpm typecheck`、`pnpm lint`、`pnpm build`。

## Blocked by

- Phase 0 工程骨架完成。
