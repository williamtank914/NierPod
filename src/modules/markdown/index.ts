import type {
  FutureModuleBoundary,
  Project,
  ProjectInput,
  ProjectStatus,
  Task,
  TaskInput,
  TaskLane,
  TaskPriority,
  TaskStatus
} from "../../shared/domain";

export const markdownModuleBoundary: FutureModuleBoundary = {
  name: "Markdown parser",
  phase: "phase-1",
  status: "implemented",
  extendsFrom: "src/modules/markdown/index.ts",
  responsibility:
    "Own Markdown parsing and serialization for workspace source-of-truth files in Phase 1."
};

export function serializeProjectMarkdown(project: Project): string {
  const frontmatter = [
    "---",
    `id: ${project.id}`,
    `title: ${project.title}`,
    `status: ${project.status}`,
    `deadline: ${project.deadline ?? ""}`,
    `task_order: ${project.taskOrder.join(", ")}`,
    "---"
  ].join("\n");

  return `${frontmatter}
# ${project.title}

## Goal

${project.goal}

## Success Criteria

${project.successCriteria}

## Task Order

${project.taskOrder.map((taskId) => `- ${taskId}`).join("\n")}
`;
}

export function serializeTaskMarkdown(task: Task): string {
  const frontmatter = [
    "---",
    `id: ${task.id}`,
    `project_id: ${task.projectId}`,
    `title: ${task.title}`,
    `status: ${task.status}`,
    `priority: ${task.priority}`,
    `lane: ${task.lane}`,
    `due_date: ${task.dueDate ?? ""}`,
    `dependencies: ${task.dependencies.join(", ")}`,
    "---"
  ].join("\n");

  return `${frontmatter}
# ${task.title}

## Context

${task.context}

## Todos

${task.todos
  .map((todo) => `- [${todo.completed ? "x" : " "}] ${todo.text}`)
  .join("\n")}

## Progress

${task.progress}

## Acceptance Criteria

${task.acceptanceCriteria}
`;
}

export function parseProjectMarkdown(
  source: string,
  markdownPath: string
): Project {
  const frontmatter = readFrontmatter(source);
  const title = frontmatter.title ?? readMarkdownTitle(source) ?? "Untitled Project";
  const status = readProjectStatus(frontmatter.status);
  const deadline = frontmatter.deadline?.trim() || null;
  const taskOrder = readListValue(frontmatter.task_order);

  return {
    id: requireFrontmatterValue(frontmatter, "id", markdownPath),
    title,
    goal: readMarkdownSection(source, "Goal"),
    successCriteria: readMarkdownSection(source, "Success Criteria"),
    status,
    deadline,
    taskOrder,
    tasks: [],
    markdownPath
  };
}

export function parseTaskMarkdown(source: string, markdownPath: string): Task {
  const frontmatter = readFrontmatter(source);
  const title = frontmatter.title ?? readMarkdownTitle(source) ?? "Untitled Task";

  return {
    id: requireFrontmatterValue(frontmatter, "id", markdownPath),
    projectId: requireFrontmatterValue(frontmatter, "project_id", markdownPath),
    title,
    status: readTaskStatus(frontmatter.status),
    priority: readTaskPriority(frontmatter.priority),
    lane: readTaskLane(frontmatter.lane),
    dueDate: frontmatter.due_date?.trim() || null,
    dependencies: readListValue(frontmatter.dependencies),
    context: readMarkdownSection(source, "Context"),
    todos: readTodos(readMarkdownSection(source, "Todos")),
    progress: readMarkdownSection(source, "Progress"),
    acceptanceCriteria: readMarkdownSection(source, "Acceptance Criteria"),
    markdownPath
  };
}

export function createProjectFromInput(
  id: string,
  markdownPath: string,
  input: ProjectInput
): Project {
  return {
    id,
    title: input.title,
    goal: input.goal,
    successCriteria: input.successCriteria,
    status: input.status,
    deadline: input.deadline?.trim() || null,
    taskOrder: [],
    tasks: [],
    markdownPath
  };
}

export function createTaskFromInput(
  id: string,
  projectId: string,
  markdownPath: string,
  input: TaskInput
): Task {
  return {
    id,
    projectId,
    title: input.title,
    status: "backlog",
    priority: "p2",
    lane: "main",
    dueDate: null,
    dependencies: [],
    context: "",
    todos: [],
    progress: "",
    acceptanceCriteria: "",
    markdownPath
  };
}

function readFrontmatter(source: string): Record<string, string> {
  const match = /^---\n([\s\S]*?)\n---/.exec(source);

  if (!match) {
    return {};
  }

  const values: Record<string, string> = {};

  for (const line of match[1].split("\n")) {
    const separatorIndex = line.indexOf(":");

    if (separatorIndex === -1) {
      continue;
    }

    values[line.slice(0, separatorIndex).trim()] = line
      .slice(separatorIndex + 1)
      .trim();
  }

  return values;
}

function readMarkdownTitle(source: string): string | null {
  const match = /^#\s+(.+?)\s*$/m.exec(source);
  return match?.[1] ?? null;
}

function readMarkdownSection(source: string, heading: string): string {
  const lines = source.split("\n");
  const headingIndex = lines.findIndex((line) => line.trim() === `## ${heading}`);

  if (headingIndex === -1) {
    return "";
  }

  let startIndex = headingIndex + 1;

  if (lines[startIndex]?.trim() === "") {
    startIndex += 1;
  }

  const nextHeadingOffset = lines
    .slice(startIndex)
    .findIndex((line) => line.startsWith("## "));
  const endIndex =
    nextHeadingOffset === -1 ? lines.length : startIndex + nextHeadingOffset;

  return lines.slice(startIndex, endIndex).join("\n").trim();
}

function readListValue(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function readProjectStatus(value: string | undefined): ProjectStatus {
  return value === "archived" ? "archived" : "active";
}

function readTaskStatus(value: string | undefined): TaskStatus {
  if (
    value === "ready" ||
    value === "in_progress" ||
    value === "blocked" ||
    value === "done" ||
    value === "archived"
  ) {
    return value;
  }

  return "backlog";
}

function readTaskPriority(value: string | undefined): TaskPriority {
  if (value === "p0" || value === "p1" || value === "p3") {
    return value;
  }

  return "p2";
}

function readTaskLane(value: string | undefined): TaskLane {
  if (value === "parallel" || value === "optional") {
    return value;
  }

  return "main";
}

function readTodos(source: string) {
  return source
    .split("\n")
    .map((line) => /^- \[([ xX])\]\s+(.+?)\s*$/.exec(line))
    .filter((match): match is RegExpExecArray => match !== null)
    .map((match, index) => ({
      id: `todo-${index + 1}`,
      text: match[2],
      completed: match[1].toLowerCase() === "x"
    }));
}

function requireFrontmatterValue(
  frontmatter: Record<string, string>,
  key: string,
  markdownPath: string
): string {
  const value = frontmatter[key]?.trim();

  if (!value) {
    throw new Error(`Project Markdown is missing ${key}: ${markdownPath}`);
  }

  return value;
}
