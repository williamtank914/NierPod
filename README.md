# NierPod

NierPod 是本地优先的个人 Project Workspace。当前仓库已进入 Phase 1：Electron + React + TypeScript + Vite 工程底座可运行，并实现了 workspace 生命周期、Project lifecycle、基础 Task timeline 和 Task detail 编辑 slice。用户可以通过受控 IPC 选择或创建本地文件夹作为 workspace，应用从该文件夹中的 Markdown 文件重建 Project/Task 状态，app 设置存储在 workspace 外部。

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

- `pnpm test`：运行 baseline、IPC boundary、renderer workbench、workspace lifecycle 和 Project/Task Markdown lifecycle 测试。
- `pnpm build`：构建 main、preload 和 renderer 代码。
- `pnpm typecheck`：检查 TypeScript 类型。
- `pnpm lint`：执行基础 ESLint 质量检查。

## 当前边界

已实现：

- `src/main/` 管理 Electron app 生命周期和窗口创建。
- `src/preload/` 暴露 typed NierPod bridge，不暴露 Electron primitive。
- `src/renderer/` 渲染三栏 workbench、Project 创建/编辑入口、Task timeline 和 Task detail 编辑器。
- `src/modules/workspace/` 创建基础 Markdown workspace、打开已有 workspace、扫描 Markdown 文件、读写 Project/Task Markdown，并把最近 workspace 路径保存到 Electron `userData` 下的 app 设置。
- `src/modules/markdown/` 解析和序列化 Project/Task Markdown。
- `src/modules/journal/` 追加 Project/Task lifecycle 的人类可读事件 hook。

仍未实现：

- Project/Task 更深的独立 domain module 抽取。
- SQLite/search 可重建索引。
- Prompt Pack、Memory、Artifacts 的完整 workflow，以及 Journal 的完整事件浏览和筛选体验。
