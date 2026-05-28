# Repo baseline and runnable Electron app

Status: ready-for-human
Type: AFK

## Parent

`.scratch/nierpod-phase-0/PRD.md`

## What to build

建立 NierPod 的最小可运行工程底座。初始化 Git 仓库和项目级 ignore 规则，选择并锁定包管理方式，搭建 Electron + React + TypeScript + Vite 应用，让开发者可以安装依赖、启动桌面窗口、执行构建、类型检查和 lint。

这个 slice 的完成标准是：仓库从 docs-first 状态进入可编码状态，开发者可以用一组稳定 scripts 验证 Electron 桌面壳、renderer 入口和基础工具链都能工作。

## Acceptance criteria

- [x] 仓库已初始化为 Git repository。
- [x] `.gitignore` 覆盖 dependencies、build outputs、packaged app outputs、logs、本地运行文件、OS metadata 和 editor noise。
- [x] 已选择包管理方式并提交对应 lockfile。
- [x] Electron + React + TypeScript + Vite 项目可以安装依赖。
- [x] `dev` script 可以启动 NierPod 桌面窗口。
- [x] `build` script 可以完成应用代码构建。
- [x] `typecheck` script 可以检查 TypeScript 类型。
- [x] `lint` script 可以执行基础代码质量检查。
- [x] 桌面窗口打开后能渲染一个最小 renderer 入口。
- [x] 有 README 或等价开发说明记录安装、启动和验证命令。

## Blocked by

None - can start immediately

## Comments

- 2026-05-28：完成 Phase 0 issue 01。初始化 Git、`pnpm` lockfile、Electron + React + TypeScript + Vite 工程、main/preload/renderer 入口、基础 ESLint/TypeScript 配置、README 和 baseline 测试。验证通过：`pnpm install --frozen-lockfile`、`pnpm test`、`pnpm build`、`pnpm typecheck`、`pnpm lint`，并通过 `pnpm dev` 打开标题为 `NierPod` 的桌面窗口。
