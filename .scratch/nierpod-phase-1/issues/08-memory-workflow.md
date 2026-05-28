# Memory workflow

Status: ready-for-agent
Type: AFK

## Parent

`.scratch/nierpod-phase-1/PRD.md`

## What to build

实现可被 LLM 消费的 Memory 工作流。用户可以查看当前 Memory，通过 Prompt Pack 生成 memory summary prompt，把外部 LLM 生成的 memory draft 粘贴回 NierPod，并在确认后替换当前 Memory。替换前必须保存旧 Memory 到归档位置，避免长期上下文误覆盖。

这个 slice 不做自动 LLM memory generation，也不调用 LLM API；它只提供可审阅、可确认、可回滚思路的手动 Memory 更新路径。

## Acceptance criteria

- [ ] 用户可以查看当前 Memory。
- [ ] 用户可以从 Memory workflow 生成 memory summary prompt。
- [ ] 用户可以粘贴外部 LLM 生成的 memory draft。
- [ ] 替换当前 Memory 前必须显示确认步骤。
- [ ] 确认替换时，旧 Memory 会归档到历史 Memory。
- [ ] 取消替换时，当前 Memory 不变。
- [ ] Memory 文件和历史归档保持人类可读 Markdown。
- [ ] Memory 更新会追加必要 Journal 事件。
- [ ] 有测试覆盖 draft 粘贴、确认替换、取消替换、旧 Memory 归档和重启恢复。

## Blocked by

- `.scratch/nierpod-phase-1/issues/07-prompt-pack-workflow.md`

