# Workspace lifecycle and Markdown source of truth

Status: ready-for-agent
Type: AFK

## Parent

`.scratch/nierpod-phase-1/PRD.md`

## What to build

实现 NierPod 的 workspace 生命周期，让用户可以选择或创建一个普通本地文件夹作为 workspace，并让应用从该文件夹中的 Markdown 文件重建基础状态。这个 slice 需要贯穿桌面入口、IPC 边界、workspace 存储、基础 UI 状态和验证检查，确认 Markdown 是真相源，应用设置不写入用户数据 workspace。

完成后，用户可以打开应用，选择或创建 workspace，看到当前 workspace 状态；重启应用后，应用可以从本地 Markdown workspace 恢复基础状态，而不是依赖不可重建的缓存。

## Acceptance criteria

- [ ] 用户可以从 UI 选择已有本地文件夹作为 workspace。
- [ ] 用户可以从 UI 创建新的 workspace，并生成 Phase 1 所需的基础 Markdown workspace 结构。
- [ ] 应用设置存储在 workspace 之外，不污染用户数据 workspace。
- [ ] workspace 中的核心文件保持人类可读 Markdown。
- [ ] 应用重启后可以从 workspace 文件重建基础状态。
- [ ] renderer 只能通过受控 IPC/bridge 调用 workspace 能力，不直接访问本地文件系统。
- [ ] 有测试或 smoke check 覆盖创建 workspace、打开 workspace、重启恢复和设置隔离。

## Blocked by

- Phase 0 工程骨架完成。

