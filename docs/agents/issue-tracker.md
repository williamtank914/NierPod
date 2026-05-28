# Issue Tracker：本地 Markdown

本仓库的 Issues 和 PRDs 使用 Markdown 文件管理，统一存放在 `.scratch/` 下。

## 约定

- 每个 feature 使用一个目录：`.scratch/<feature-slug>/`
- PRD 文件为：`.scratch/<feature-slug>/PRD.md`
- 实施 issue 文件为：`.scratch/<feature-slug>/issues/<NN>-<slug>.md`，从 `01` 开始编号
- triage 状态记录在 issue 文件顶部附近的 `Status:` 行
- 评论和对话历史追加到文件底部的 `## Comments` 章节

## 当 Skill 要求 "Publish To The Issue Tracker"

在 `.scratch/<feature-slug>/` 下创建新文件；如果目录不存在，先创建目录。

## 当 Skill 要求 "Fetch The Relevant Ticket"

读取引用路径对应的文件。用户通常会直接提供路径或 issue 编号。
