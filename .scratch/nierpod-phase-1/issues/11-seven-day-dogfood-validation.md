# Seven-day NierPod dogfood validation

Status: ready-for-agent
Type: HITL

## Parent

`.scratch/nierpod-phase-1/PRD.md`

## What to build

用 NierPod 管理 NierPod 自身开发，完成连续 7 天真实使用验证。这个 issue 不新增大块业务功能，而是把 Phase 1 的完整闭环放到实际工作中验证：capture、plan、execute、record、produce artifacts、summarize memory、focus today。

验证过程中需要记录数据丢失、流程断点、Today Focus 是否有用、Prompt Pack 是否生成有价值上下文、Memory 更新是否过重、外部 Markdown 修改是否安全、搜索和重建索引是否可靠。验证结束后，输出 Phase 1 MVP 是否达标的结论和后续修正项。

## Acceptance criteria

- [ ] NierPod 自身作为真实 Project 被创建并持续使用。
- [ ] 连续 7 天使用 NierPod 管理真实开发工作。
- [ ] 使用过程中覆盖 Inbox、Project、Task、Task detail、Artifacts、Journal、Memory、Today Focus、Prompt Pack、Search 和外部文件修改。
- [ ] 记录所有关键数据丢失、冲突、流程断点和可用性问题。
- [ ] 验证 Markdown source of truth 能否支撑真实使用和重启恢复。
- [ ] 验证 Today Focus 是否帮助减少任务发散。
- [ ] 验证 Prompt Pack 和 Memory workflow 是否值得进入 Phase 2 智能能力规划。
- [ ] 输出一份验证总结，明确 Phase 1 MVP 是否达标，以及必须修复的问题。

## Blocked by

- `.scratch/nierpod-phase-1/issues/01-workspace-lifecycle-markdown-source.md`
- `.scratch/nierpod-phase-1/issues/02-project-lifecycle-task-timeline.md`
- `.scratch/nierpod-phase-1/issues/03-task-detail-editor.md`
- `.scratch/nierpod-phase-1/issues/04-artifacts-and-journal.md`
- `.scratch/nierpod-phase-1/issues/05-today-focus-overrides.md`
- `.scratch/nierpod-phase-1/issues/06-inbox-capture-conversion.md`
- `.scratch/nierpod-phase-1/issues/07-prompt-pack-workflow.md`
- `.scratch/nierpod-phase-1/issues/08-memory-workflow.md`
- `.scratch/nierpod-phase-1/issues/09-search-rebuildable-index.md`
- `.scratch/nierpod-phase-1/issues/10-external-file-sync-conflict.md`

