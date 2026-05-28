# NierPod Phase 0 PRD：工程骨架搭建

Status: ready-for-agent
Date: 2026-05-28

## Problem Statement

Phase 1 已经定义了 NierPod 的本地优先 Project Workspace MVP，但直接进入 Project、Task、Markdown parser、SQLite index 和 Prompt Pack 业务实现会把基础工程风险和业务风险混在一起。用户需要先得到一个可运行、可开发、可验证的 NierPod 桌面应用底座，让后续业务模块可以在明确的 Electron 分层、类型边界、目录边界和脚本约定上持续增长。

Phase 0 的问题不是交付业务功能，而是消除工程启动阶段的不确定性：仓库还没有 Git 基础、Electron + React + TypeScript + Vite 运行链路、main/preload/renderer 分层、IPC 边界、三栏工作台空状态、workspace 入口占位、后续深模块的位置和 dev/build/typecheck/lint 脚本。没有这些底座，Phase 1 的业务实现会更容易出现目录混乱、renderer 直接访问本地文件、IPC 契约漂移、UI 原型和桌面壳脱节、构建链路不可复现等问题。

## Solution

补充一个独立的 Phase 0：工程骨架搭建。Phase 0 交付一个能在本地启动的 NierPod 桌面应用，使用 Electron、React、TypeScript 和 Vite 建立桌面壳与前端 UI 的基础链路。应用打开后展示三栏工作台空状态，包含 Today Focus、Inbox、Projects、Task timeline、Task detail 和 workspace 选择入口占位，但不实现真实 Project / Task 业务。

Phase 0 同时建立工程边界：main process 管理窗口、应用生命周期和未来本地系统能力；preload 暴露受控、类型化、可演进的桥接 API；renderer 只通过桥接 API 访问桌面能力，不直接访问 Node.js 文件系统。Phase 0 还要准备后续 Workspace、Project、Task、Markdown parser、SQLite index、Prompt Pack、Journal、Memory、Artifact 等模块的位置，让 Phase 1 可以直接沿着这些边界实现业务。

Phase 0 完成后，仓库应该满足：

- 可以用 `dev` 启动桌面应用。
- 可以用 `build` 构建应用代码。
- 可以用 `typecheck` 验证 TypeScript 类型。
- 可以用 `lint` 验证基础代码质量。
- renderer 已展示可运行的 NierPod 三栏工作台空状态。
- main/preload/renderer 分层清晰。
- 本地文件读写 IPC 边界已定义，但只作为后续 workspace 能力的安全入口，不承载 Phase 1 业务逻辑。
- 后续 Phase 1 深模块有明确落点，但尚未实现业务功能。

## User Stories

1. As a NierPod developer, I want the repository initialized as a Git repository, so that future implementation can be tracked and reviewed incrementally.
2. As a NierPod developer, I want a project-level ignore policy for generated files, dependencies, build outputs, local app data, and editor noise, so that source control stays focused on meaningful source files.
3. As a NierPod developer, I want Electron initialized with React, TypeScript, and Vite, so that the desktop app can be developed with the chosen Phase 1 technology stack.
4. As a NierPod developer, I want a working development command, so that I can launch the desktop app locally during implementation.
5. As a NierPod developer, I want a working build command, so that the app code can be compiled reproducibly before business features are added.
6. As a NierPod developer, I want a working TypeScript check command, so that type regressions are caught early.
7. As a NierPod developer, I want a working lint command, so that the codebase starts with basic quality checks.
8. As a NierPod developer, I want main/preload/renderer separated, so that desktop lifecycle, bridge APIs, and UI code do not collapse into one layer.
9. As a NierPod developer, I want the main process to own app lifecycle and window creation, so that renderer code remains focused on user experience.
10. As a NierPod developer, I want the preload layer to expose a small typed API, so that future renderer calls to desktop capabilities are controlled and auditable.
11. As a NierPod developer, I want the renderer to avoid direct Node.js filesystem access, so that local file operations stay behind an explicit IPC boundary.
12. As a NierPod developer, I want IPC channels named and typed consistently, so that future workspace read/write operations do not become ad hoc message passing.
13. As a NierPod developer, I want an initial local file read/write boundary defined, so that Phase 1 workspace storage has a safe place to attach.
14. As a NierPod developer, I want IPC handlers to be allowlisted, so that renderer cannot request arbitrary filesystem operations.
15. As a NierPod developer, I want IPC errors to have a predictable shape, so that renderer can handle unavailable paths, denied access, invalid payloads, and unexpected failures consistently.
16. As a NierPod user, I want the app window to open successfully, so that I can see that NierPod has a real desktop shell.
17. As a NierPod user, I want the first visible screen to look like a workbench, so that the product direction is clear even before business data exists.
18. As a NierPod user, I want a three-column empty state UI, so that I can understand where Today Focus, Project timeline, and Task detail will live.
19. As a NierPod user, I want the left column to reserve space for Today Focus, Inbox, and Projects, so that the Phase 1 navigation model is visible from the start.
20. As a NierPod user, I want the middle column to reserve space for Task timeline, so that Project execution order has a clear home.
21. As a NierPod user, I want the right column to reserve space for Task detail and artifacts, so that Task work notes and results have a clear home.
22. As a NierPod user, I want a workspace selection entry placeholder, so that the app communicates that user-owned local folders will become the workspace source of truth.
23. As a NierPod user, I want the workspace entry to be visibly non-destructive in Phase 0, so that I do not assume real files are being created or modified yet.
24. As a NierPod developer, I want placeholder module locations for Workspace management, so that Phase 1 can implement workspace selection and scanning without reorganizing the app.
25. As a NierPod developer, I want placeholder module locations for Project and Task domain logic, so that business rules can be implemented outside UI components.
26. As a NierPod developer, I want placeholder module locations for Markdown parsing and serialization, so that Markdown source-of-truth behavior can become a deep testable module.
27. As a NierPod developer, I want placeholder module locations for SQLite index code, so that future search/index work does not leak into UI state.
28. As a NierPod developer, I want placeholder module locations for Prompt Pack workflows, so that Phase 1 LLM context assembly has a clear boundary.
29. As a NierPod developer, I want placeholder module locations for Journal, Memory, and Artifacts, so that Phase 1 can grow the full product model without reshaping the skeleton.
30. As a NierPod developer, I want shared domain types to have a clear home, so that main, preload, renderer, and tests can agree on contracts.
31. As a NierPod developer, I want app styling established for the workbench shell, so that future UI work extends a coherent visual baseline.
32. As a NierPod developer, I want the Phase 0 UI to avoid fake business data, so that placeholder state is not mistaken for implemented Project or Task behavior.
33. As a NierPod developer, I want the application name and product terminology to match the docs, so that Project、Task、Today Focus、Memory 和 Prompt Pack vocabulary stays consistent.
34. As a NierPod developer, I want the skeleton to make future tests straightforward, so that Phase 1 deep modules can be tested without booting the full Electron app.
35. As a NierPod developer, I want smoke verification for app startup and basic commands, so that Phase 0 can be accepted before business work begins.
36. As a future Phase 1 agent, I want the Phase 0 skeleton to define where to add business modules, so that implementation can start with focused slices instead of repo setup.
37. As a future Phase 1 agent, I want the IPC boundary already established, so that workspace file access can be implemented without changing renderer security assumptions.
38. As a future Phase 1 agent, I want the build and typecheck scripts to be stable, so that each business slice can be verified consistently.

## Implementation Decisions

- Phase 0 is a prerequisite engineering phase, not a business-feature phase. It should not implement Project creation, Task editing, Markdown workspace persistence, SQLite search, Prompt Pack generation, Journal, Memory, or Artifacts behavior.
- Initialize the repository as a Git repository if it is not already one. Include a practical ignore policy for dependencies, generated build output, local runtime files, packaged app output, logs, OS metadata, and editor noise.
- Use Electron, React, TypeScript, and Vite as the application foundation, matching the Phase 1 product decisions.
- Establish three runtime layers: main, preload, and renderer. Each layer should have a clear responsibility and should not depend on implementation details from the other layers.
- Main process owns Electron app lifecycle, browser window creation, development/production loading behavior, native dialogs, future file-system handlers, and IPC handler registration.
- Preload owns the bridge exposed to renderer. It should expose a small API surface with typed request and response shapes rather than leaking generic Electron or Node.js primitives.
- Renderer owns the NierPod UI shell. It should be implemented as a React app and should not use direct Node.js filesystem access.
- Define an initial local-file IPC boundary as a contract for future workspace storage. Phase 0 may include no-op, stub, or minimal safe handlers, but the boundary must communicate that file access is mediated by main process rules.
- IPC contracts should be designed around domain-safe operations rather than arbitrary path execution. Future workspace work should plug into these contracts or extend them deliberately.
- IPC response types should include success and error variants so renderer can handle denied access, invalid payloads, unavailable files, and internal failures without relying on thrown implementation details.
- Establish shared types for IPC contracts and future domain interfaces. Shared types should not import renderer components or main-process runtime code.
- Build a three-column workbench empty state UI. It should show the intended NierPod information architecture without pretending that business functionality exists.
- The left column should reserve Today Focus、Inbox 和 Projects navigation areas.
- The middle column should reserve Task timeline space.
- The right column should reserve Task detail, notes, acceptance criteria, and artifacts space.
- Add a workspace selection entry placeholder. It should make the local-first workspace direction visible without silently creating or mutating user files in Phase 0.
- Prepare module boundaries for Workspace management, Project and Task domain logic, Markdown parser/serializer, SQLite index, Prompt Pack builder, Journal, Memory, and Artifact registry.
- Treat Markdown parser, Today Focus engine, Prompt Pack builder, Workspace Store, Search Indexer, and IPC contract validation as future deep modules. Phase 0 should create places for them, not implement their business rules.
- Add `dev`, `build`, `typecheck`, and `lint` scripts. These scripts are part of the Phase 0 acceptance surface and must work on a clean install.
- Keep Phase 0 visual design quiet and work-focused. The screen should feel like a usable desktop workbench shell, not a marketing page.
- Do not introduce cloud, authentication, LLM API, Git UI, collaboration, calendar, notifications, or packaging/release distribution in Phase 0.
- If package manager choice is not already locked by the repository, choose one and commit the corresponding lockfile so future agents use a consistent install path.

## Testing Decisions

- Good Phase 0 tests and checks should verify external behavior of the skeleton: commands run, the Electron app starts, the renderer renders the expected shell, IPC contracts can be called safely, and layer boundaries prevent direct renderer filesystem access.
- `typecheck` is required and should cover main, preload, renderer, and shared contract code.
- `lint` is required and should cover source code across all layers.
- `build` is required and should compile the Electron/Vite app without relying on development-only globals.
- A startup smoke test or documented manual smoke check should verify that the desktop app opens and renders the NierPod workbench empty state.
- IPC boundary tests should validate successful and failure response shapes for placeholder file operations or stubs, focusing on the public contract rather than Electron internals.
- Renderer tests, if added in Phase 0, should verify the workbench shell landmarks and workspace entry placeholder, not styling implementation details.
- No Phase 0 test should assert Project, Task, Markdown parser, SQLite index, Prompt Pack, Journal, Memory, or Artifact business behavior, because those are intentionally deferred to Phase 1.
- Current repository is docs-first and has no established test harness. Phase 0 should choose a minimal test/check setup that does not make future deep-module testing harder.

## Out of Scope

- Creating, editing, archiving, or persisting Projects.
- Creating, editing, sorting, completing, or persisting Tasks.
- Real workspace creation, scanning, indexing, or conflict handling.
- Markdown parser or serializer implementation.
- SQLite schema, SQLite FTS, search indexing, or search UI behavior.
- Prompt Pack generation, copy workflow, paste-back handling, or saved LLM notes.
- Journal event writing.
- Memory viewing, generation, replacement, or archival.
- Artifact manifest creation, artifact association, or artifact panel behavior beyond placeholder UI.
- Today Focus ranking, overrides, or real task aggregation.
- External file watcher behavior.
- Cloud sync, authentication, collaboration, notifications, calendar integration, and mobile app.
- Built-in OpenAI/Anthropic API calls or streaming chat UI.
- Git commit/push UI, remote setup, release signing, installer packaging, auto-update, or distribution pipeline.
- Full visual design system beyond the workbench shell baseline.

## Further Notes

- Phase 0 should make Phase 1 smaller by separating foundation work from business workflow work. After Phase 0, a Phase 1 agent should be able to implement vertical slices against existing app layers and scripts.
- Phase 0 should be accepted only when a developer can install dependencies, run the dev app, see the three-column NierPod shell, and run build/typecheck/lint successfully.
- The Phase 0 skeleton should preserve the product vocabulary from the docs: Project is the top-level planning object, Task is the single task layer inside Project, Today Focus is the daily cross-Project focus surface, Memory is long-term LLM-consumable summary, and Prompt Pack is the manual Phase 1 LLM workflow.
- This PRD intentionally avoids specifying business file formats or database schema. Those belong to Phase 1 PRDs and implementation issues after the skeleton exists.
