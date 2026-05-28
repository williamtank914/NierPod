# Phase 0 验收记录

日期：2026-05-28
状态：Phase 0 验收基线

## 命令验证

Phase 0 的基础验证命令如下：

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm build
pnpm typecheck
pnpm lint
```

这些命令分别覆盖：

- `pnpm install --frozen-lockfile`：确认 lockfile 可复现安装。
- `pnpm test`：运行 Phase 0 baseline、IPC boundary、renderer workbench 和 future module scaffold 测试。
- `pnpm build`：构建 Electron main、preload 和 React renderer。
- `pnpm typecheck`：检查 main、preload、renderer、shared contract、module scaffold 和测试类型。
- `pnpm lint`：执行基础代码质量检查。

## 桌面启动 smoke check

启动命令：

```bash
pnpm dev
```

桌面窗口验收点：

- 窗口标题为 `NierPod`。
- 首屏是 `NierPod workbench`，不是 landing page。
- 左侧显示 `Today Focus`、`Inbox`、`Projects`、`Memory`、`Prompt Pack`。
- 中间显示 `Task timeline`。
- 右侧显示 `Task detail`、`Acceptance Criteria` 和 `Artifacts`。
- `Workspace` 入口是 disabled placeholder，并显示 Phase 0 不会创建或修改 workspace 文件。
- renderer 显示 preload bridge 返回的 Phase 0 文件访问说明。

## Phase 0 边界

Phase 0 不实现真实 Project、Task、Markdown workspace、SQLite index、Prompt Pack、Journal、Memory 或 Artifacts 业务。当前代码只建立可运行桌面壳、三层 Electron boundary、三栏 workbench 空状态和 Phase 1 模块落点。
