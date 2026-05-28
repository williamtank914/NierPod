# Domain Docs

本仓库使用 single-context domain documentation 布局。

## 探查前先读这些文档

- 仓库根目录的 `CONTEXT.md`，如果存在
- `docs/adr/`，读取与当前改动区域相关的 ADR
- `docs/PRODUCT_DECISIONS.md`，用于理解产品和架构决策
- `docs/MVP_SCOPE.md`，用于理解 Phase 1 范围边界
- `docs/ROADMAP.md`，用于理解 Phase 2 和 Phase 3 方向

如果 `CONTEXT.md` 或 `docs/adr/` 还不存在，静默继续即可。等领域术语或架构决策需要专门沉淀时，再创建这些文件。

## 文件结构

```text
/
├── AGENTS.md
├── CONTEXT.md
├── docs/
│   ├── PRODUCT_DECISIONS.md
│   ├── MVP_SCOPE.md
│   ├── ROADMAP.md
│   ├── agents/
│   └── adr/
└── src/
```

## 使用项目词汇

当输出中提到 NierPod 领域概念时，使用现有文档已经确定的词汇：

- `Project` 是顶层规划对象
- `Task` 是 Project 内唯一一层任务对象
- `Today Focus` 是跨 Project 的每日 focus 界面
- `Memory` 是可被 LLM 消费的长期摘要
- `Prompt Pack` 是 Phase 1 的手动 LLM workflow

不要把 `Pod` 用作内部模型、目录名或文件名。`Pod` 只属于产品名和品牌灵感。

## Markdown 输出语言

后续在本仓库创建或修改 Markdown 文档时，默认使用中文。代码标识、文件名、字段名、枚举值、命令、API 名称和已有英文产品术语可以保留英文，避免实现歧义。

## 标记 ADR 冲突

如果某个提案与现有 ADR 冲突，需要明确指出，不要静默覆盖既有决策。
