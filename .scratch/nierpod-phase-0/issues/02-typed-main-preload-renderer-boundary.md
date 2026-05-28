# Typed main/preload/renderer boundary

Status: ready-for-human
Type: AFK

## Parent

`.scratch/nierpod-phase-0/PRD.md`

## What to build

建立 Electron 三层运行边界：main process 负责应用生命周期、窗口创建、开发/生产加载和 IPC handler 注册；preload 暴露小而类型化的 bridge；renderer 通过 bridge 调用桌面能力，不直接访问 Node.js 文件系统。

同时定义本地文件能力的 IPC 占位契约，包括 request/response 类型、错误形状和 allowlisted handler 结构。Phase 0 不实现真实 workspace 读写业务，但要把 Phase 1 接入本地文件系统的位置和安全假设固定下来。

## Acceptance criteria

- [x] main、preload、renderer 三层目录和入口职责清晰。
- [x] main process 负责 Electron app lifecycle、window creation 和 IPC handler registration。
- [x] preload 通过受控 bridge 暴露 API 给 renderer。
- [x] renderer 不能直接使用 Node.js `fs` 或任意 Electron API。
- [x] IPC channel 命名和 request/response 类型集中定义。
- [x] IPC response 包含可预测的 success/error variants。
- [x] 文件能力 IPC 以 allowlisted operation 形式存在，不能接受任意路径执行请求。
- [x] 有共享类型位置，供 main、preload、renderer 和后续测试复用。
- [x] 有测试、typecheck 或 smoke check 验证 bridge API 可调用且错误形状稳定。

## Blocked by

- `.scratch/nierpod-phase-0/issues/01-repo-baseline-runnable-electron-app.md`

## Comments

- 2026-05-28：完成 Phase 0 issue 02。新增 `src/shared/ipc.ts` 集中定义 IPC channel、request/response、success/error variants、allowlisted file operation 和 `NierPodBridge` 类型；main process 注册 `ipcMain.handle(fileIpcChannel, ...)`；preload 通过 `contextBridge.exposeInMainWorld("nierpod", ...)` 暴露受控 bridge；renderer 通过 `window.nierpod.workspace.describeAccess()` 获取 Phase 0 文件能力说明，不直接 import Node.js `fs` 或 Electron API。验证通过：`pnpm install --frozen-lockfile`、`pnpm test`、`pnpm build`、`pnpm typecheck`、`pnpm lint`，并通过 `pnpm dev` smoke check 确认桌面窗口显示 bridge 返回的 Phase 0 文件访问说明。
