# Future module scaffold and Phase 0 verification

Status: ready-for-human
Type: AFK

## Parent

`.scratch/nierpod-phase-0/PRD.md`

## What to build

为 Phase 1 准备清晰的模块落点，并收束 Phase 0 验收。创建后续 Workspace、Project、Task、Markdown parser、SQLite index、Prompt Pack、Journal、Memory 和 Artifacts 的模块位置或占位导出，让后续业务实现可以沿着既定边界增长，而不需要重组工程结构。

同时补齐 Phase 0 的验证说明或 smoke check，确认开发者可以安装依赖、运行桌面应用、看到三栏工作台、执行 build/typecheck/lint，并理解 Phase 1 应该从哪些模块继续。

## Acceptance criteria

- [x] 有明确的 Workspace management 模块落点。
- [x] 有明确的 Project 和 Task domain logic 模块落点。
- [x] 有明确的 Markdown parser/serializer 模块落点。
- [x] 有明确的 SQLite index/Search 模块落点。
- [x] 有明确的 Prompt Pack workflow 模块落点。
- [x] 有明确的 Journal、Memory 和 Artifact registry 模块落点。
- [x] 共享 domain/IPC 类型位置清晰，不依赖 renderer 组件或 main runtime。
- [x] 占位模块不实现 Phase 1 业务规则，不创建假业务行为。
- [x] 文档说明 Phase 1 agent 应该从哪些模块扩展。
- [x] Phase 0 验收记录覆盖 install、dev、build、typecheck、lint 和桌面启动 smoke check。

## Blocked by

- `.scratch/nierpod-phase-0/issues/01-repo-baseline-runnable-electron-app.md`
- `.scratch/nierpod-phase-0/issues/02-typed-main-preload-renderer-boundary.md`
- `.scratch/nierpod-phase-0/issues/03-nierpod-workbench-empty-state.md`

## Comments

- 2026-05-28：完成 Phase 0 issue 04。新增 `src/shared/domain.ts`、`src/modules/index.ts` 和 Workspace、Project、Task、Markdown、Search、Prompt Pack、Journal、Memory、Artifacts 的 Phase 1 placeholder module boundaries；这些模块只导出边界元信息，不实现 Phase 1 业务规则。新增 `docs/PHASE_0_VERIFICATION.md` 和 `docs/PHASE_1_MODULE_MAP.md`，记录 install/dev/build/typecheck/lint/test 和桌面启动 smoke check，并说明 Phase 1 agent 的模块扩展入口。新增 `tests/future-module-scaffold.test.ts` 覆盖模块落点和文档验收。验证通过：`pnpm install --frozen-lockfile`、`pnpm test`、`pnpm build`、`pnpm typecheck`、`pnpm lint`，并通过 `pnpm dev` smoke check。
