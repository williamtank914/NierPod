# External file sync and conflict handling

Status: ready-for-agent
Type: AFK

## Parent

`.scratch/nierpod-phase-1/PRD.md`

## What to build

实现外部 Markdown 修改检测和冲突处理。应用启动时扫描 workspace，运行时监听文件变化；当外部编辑修改 Project、Task、Inbox、Journal、Memory、Artifact 或 LLM note 时，应用更新派生状态。如果用户在应用内有未保存编辑，同时磁盘文件发生外部变化，应用不能静默覆盖，必须提示用户选择处理方式。

这个 slice 保护 Markdown source of truth 的可靠性，让用户可以继续用外部编辑器和 Git 管理文件，而不会被应用缓存或自动保存破坏。

## Acceptance criteria

- [ ] 应用启动时扫描 workspace 并从文件重建当前状态。
- [ ] 应用运行时监听 workspace 文件变化。
- [ ] 外部修改 Project/Task/Inbox/Journal/Memory/artifact/LLM note 后，应用派生状态会更新。
- [ ] 如果打开文件存在未保存 App 编辑且磁盘发生外部变化，应用显示冲突提示。
- [ ] 冲突提示支持 reload from disk、keep current draft 和 save as conflict copy。
- [ ] 应用不会静默覆盖外部修改。
- [ ] conflict copy 保持人类可读，并能被用户找到。
- [ ] 有测试或 smoke check 覆盖外部修改、未保存编辑冲突、三种冲突处理路径和数据不丢失。

## Blocked by

- `.scratch/nierpod-phase-1/issues/01-workspace-lifecycle-markdown-source.md`
- `.scratch/nierpod-phase-1/issues/02-project-lifecycle-task-timeline.md`
- `.scratch/nierpod-phase-1/issues/03-task-detail-editor.md`

