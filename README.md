# NierPod

NierPod 是本地优先的个人 Project Workspace。当前仓库处于 Phase 0：只交付可运行的 Electron + React + TypeScript + Vite 工程底座，不实现 Project、Task、Markdown workspace、SQLite index 或 Prompt Pack 业务能力。

## 环境

- Node.js 20+
- pnpm 10.33.3

本仓库使用 `pnpm`，版本已通过 `packageManager` 固定。`pnpm-workspace.yaml` 允许 `electron` 和 `esbuild` 在安装期间执行必要的 build script，确保 `pnpm dev` 可以启动本地 Electron binary。

## 安装

```bash
pnpm install
```

## 启动桌面应用

```bash
pnpm dev
```

启动后应该看到一个标题为 `NierPod` 的 Electron 窗口，并渲染最小 renderer 入口。

## 验证命令

```bash
pnpm test
pnpm build
pnpm typecheck
pnpm lint
```

- `pnpm test`：运行 Phase 0 baseline 行为测试。
- `pnpm build`：构建 main、preload 和 renderer 代码。
- `pnpm typecheck`：检查 TypeScript 类型。
- `pnpm lint`：执行基础 ESLint 质量检查。

## 当前边界

Phase 0 只建立桌面应用骨架：

- `src/main/` 管理 Electron app 生命周期和窗口创建。
- `src/preload/` 暴露最小 preload bridge。
- `src/renderer/` 渲染 React UI 入口。

真实 workspace 选择、文件读写、Project/Task 模型和三栏工作台空状态会在后续 Phase 0 issues 中继续实现。
