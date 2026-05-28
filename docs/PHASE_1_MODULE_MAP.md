# Phase 1 模块地图

日期：2026-05-28
状态：Phase 0 handoff

本文件说明 Phase 1 agent 应该从哪些模块扩展。当前模块只提供占位边界，不实现 Phase 1 业务规则，不创建假 Project、假 Task 或假 workspace 数据。

## 共享类型

- `src/shared/domain.ts`：Phase 1 模块边界和后续 domain 类型的共享位置。不能依赖 renderer 组件或 main process runtime。
- `src/shared/ipc.ts`：IPC channel、request/response、success/error variants 和 preload bridge 类型。main、preload、renderer 和测试共享这里的 IPC contract。

## 模块入口

- `src/modules/workspace/`：Workspace management。后续实现 workspace 选择、扫描、本地文件访问编排和文件 watcher 接入。
- `src/domain/project/`：Project domain。后续实现 Project identity、metadata、lifecycle、success criteria 和 task order 规则。
- `src/domain/task/`：Task domain。后续实现 Task identity、status、priority、lane、dependencies 和 detail sections 规则。
- `src/modules/markdown/`：Markdown parser/serializer。后续实现 workspace Markdown source-of-truth 的解析和序列化。
- `src/modules/search/`：SQLite index/Search。后续实现可重建的 SQLite FTS 或等价本地索引。
- `src/modules/prompt-pack/`：Prompt Pack workflow。后续实现手动 LLM prompt pack 生成、copy 和 paste-back flow。
- `src/modules/journal/`：Journal。后续实现 Project 和 Task 关键事件的追加式历史记录。
- `src/modules/memory/`：Memory。后续实现 LLM 可消费摘要的展示、替换确认和历史归档。
- `src/modules/artifacts/`：Artifact registry。后续实现本地 Markdown artifact、URL artifact、manifest 和 Task 关联。

## 扩展原则

- renderer 不能直接访问 Node.js `fs` 或任意 Electron API。
- 文件能力必须通过 main process allowlisted IPC handler 暴露。
- Markdown 文件是真相源；SQLite、缓存和索引都是可重建派生状态。
- 新业务应先在对应 domain/module 中形成可测试 public interface，再接入 UI。
