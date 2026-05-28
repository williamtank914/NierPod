# Prompt Pack workflow

Status: ready-for-human
Type: AFK

## Parent

`.scratch/nierpod-phase-1/PRD.md`

## What to build

实现 Phase 1 的手动 LLM workflow。用户可以选择 Prompt Pack intent，包括 Plan this project、Break down this task、Review risks、Define acceptance criteria、Summarize memory 和 Suggest today focus。应用展示将包含的上下文，生成结构化 Markdown prompt，提供 copy action，并提供 paste-back 区域接收外部 LLM 输出。

LLM 输出默认不是事实。用户可以 discard、保存为 LLM note，或进入手动 apply flow 的入口。保存的 LLM notes 应纳入 workspace 文件结构，并触发必要的 Journal 记录。

## Acceptance criteria

- [x] 用户可以选择所有 Phase 1 初始 Prompt Pack intent。
- [x] 每个 flow 都展示将包含的上下文说明。
- [x] Prompt Pack 生成结构化 Markdown prompt。
- [x] 默认上下文包含当前 Task、紧凑 Project 上下文、dependency summaries、recent progress snippets 和 Memory 入口。
- [x] Whole-Project analysis 必须由用户显式触发，不作为默认行为。
- [x] 用户可以 copy prompt。
- [x] 用户可以 paste back 外部 LLM 输出。
- [x] LLM 输出默认不会自动修改 Project、Task、Journal 或 Memory。
- [x] 用户可以 discard 或保存 LLM 输出为 LLM note。
- [x] 保存 LLM note 后可在 workspace 中恢复，并追加相应 Journal 事件。
- [x] 有测试覆盖不同 intent 的 prompt 内容、上下文边界、copy/paste-back 状态和 LLM 输出非事实规则。

## Blocked by

- `.scratch/nierpod-phase-1/issues/02-project-lifecycle-task-timeline.md`
- `.scratch/nierpod-phase-1/issues/03-task-detail-editor.md`
- `.scratch/nierpod-phase-1/issues/04-artifacts-and-journal.md`
- `.scratch/nierpod-phase-1/issues/05-today-focus-overrides.md`

## Comments

### 2026-05-28 implementation

- 已实现 `src/modules/prompt-pack/` 的 Phase 1 Prompt Pack builder，支持 6 个初始 intent、默认 Task/Project/dependency/progress/Memory 上下文，以及显式 `includeWholeProjectAnalysis`。
- 已实现 paste-back draft：LLM 输出默认 `not_fact`，只有保存为 LLM note 时才写入 `llm-notes/` 并追加 Journal。
- 已通过 IPC/preload 接入 renderer，右侧工作台支持选择 intent、预览上下文、生成结构化 Markdown prompt、copy prompt、粘贴外部 LLM 输出、discard、保存 LLM note 和手动 apply 入口。

## Verification

- `pnpm exec tsx --test tests/prompt-pack-workflow.test.ts`
- `pnpm exec tsx --test tests/ipc-contract.test.ts`
