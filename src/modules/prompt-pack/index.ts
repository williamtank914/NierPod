import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { appendJournalEvent, appendProjectJournalEvent } from "../journal";
import { readWorkspaceModel } from "../workspace";
import type {
  FutureModuleBoundary,
  Project,
  PromptOutputDraft,
  PromptOutputDraftInput,
  PromptPack,
  PromptPackBuildInput,
  PromptPackIntent,
  PromptPackIntentDefinition,
  SavedLlmNote,
  Task,
  WorkspaceModel
} from "../../shared/domain";

export const promptPackModuleBoundary: FutureModuleBoundary = {
  name: "Prompt Pack workflow",
  phase: "phase-1",
  status: "implemented",
  extendsFrom: "src/modules/prompt-pack/index.ts",
  responsibility:
    "Own manual Prompt Pack assembly, copy workflow, and paste-back entry points in Phase 1."
};

export const promptPackIntents: PromptPackIntentDefinition[] = [
  {
    intent: "plan_project",
    label: "Plan this project",
    requiresProject: true,
    requiresTask: false
  },
  {
    intent: "break_down_task",
    label: "Break down this task",
    requiresProject: true,
    requiresTask: true
  },
  {
    intent: "review_risks",
    label: "Review risks",
    requiresProject: true,
    requiresTask: true
  },
  {
    intent: "define_acceptance_criteria",
    label: "Define acceptance criteria",
    requiresProject: true,
    requiresTask: true
  },
  {
    intent: "summarize_memory",
    label: "Summarize memory",
    requiresProject: false,
    requiresTask: false
  },
  {
    intent: "suggest_today_focus",
    label: "Suggest today focus",
    requiresProject: false,
    requiresTask: false
  }
];

export async function buildPromptPack(
  workspacePath: string,
  input: PromptPackBuildInput
): Promise<PromptPack> {
  const model = await readWorkspaceModel(workspacePath);
  const intent = readIntent(input.intent);
  const selection = readSelection(model, input);
  assertSelectionSupportsIntent(intent, selection);
  const memorySource = await readMemorySource(workspacePath);
  const dependencyTasks = selection.task
    ? selection.task.dependencies
        .map((taskId) => findTask(model, taskId))
        .filter((task): task is Task => task !== null)
    : [];
  const recentProgressTasks = readRecentProgressTasks(selection, dependencyTasks);
  const contextSummary = [
    selection.task ? `Current Task: ${selection.task.title}` : null,
    selection.project ? `Project Context: ${selection.project.title}` : null,
    selection.task
      ? `Dependency Summaries: ${dependencyTasks.length} ${
          dependencyTasks.length === 1 ? "dependency" : "dependencies"
        }`
      : null,
    `Recent Progress Snippets: ${recentProgressTasks.length} ${
      recentProgressTasks.length === 1 ? "snippet" : "snippets"
    }`,
    "Memory: memory.md"
  ].filter((entry): entry is string => entry !== null);
  const wholeProjectAnalysisIncluded =
    input.includeWholeProjectAnalysis === true && selection.project !== null;

  return {
    intent: intent.intent,
    title: intent.label,
    contextSummary,
    promptMarkdown: [
      `# Prompt Pack: ${intent.label}`,
      "",
      "## Intent",
      intentRequest(intent.intent),
      "",
      "## Context Included",
      ...contextSummary.map((entry) => `- ${entry}`),
      "",
      renderTaskSection(selection.task),
      renderProjectSection(selection.project),
      renderDependencySection(dependencyTasks),
      renderProgressSection(recentProgressTasks),
      renderMemorySection(memorySource),
      wholeProjectAnalysisIncluded
        ? renderWholeProjectSection(selection.project)
        : null,
      "## Request",
      intentRequest(intent.intent)
    ]
      .filter((section): section is string => section !== null)
      .join("\n")
      .trimEnd()
      .concat("\n"),
    wholeProjectAnalysisIncluded
  };
}

export function createPromptOutputDraft(
  input: PromptOutputDraftInput
): PromptOutputDraft {
  return {
    intent: input.intent,
    projectId: input.projectId ?? null,
    taskId: input.taskId ?? null,
    promptMarkdown: input.promptMarkdown,
    outputMarkdown: input.outputMarkdown,
    factStatus: "not_fact",
    availableActions: ["discard", "save_llm_note", "manual_apply"]
  };
}

export async function savePromptOutputAsLlmNote(
  workspacePath: string,
  draft: PromptOutputDraft
): Promise<SavedLlmNote> {
  const intent = readIntent(draft.intent);
  const rootPath = resolve(workspacePath);
  const createdAt = new Date().toISOString();
  const noteId = `llm-note-${randomUUID()}`;
  const noteSuffix = noteId.slice(
    "llm-note-".length,
    "llm-note-".length + 8
  );
  const relativePath = `llm-notes/${formatTimestampForPath(
    createdAt
  )}-${slugify(intent.label)}-note-${noteSuffix}.md`;
  const note: SavedLlmNote = {
    id: noteId,
    intent: draft.intent,
    title: intent.label,
    relativePath,
    projectId: draft.projectId ?? null,
    taskId: draft.taskId ?? null,
    createdAt
  };
  const notePath = join(rootPath, relativePath);

  await mkdir(dirname(notePath), { recursive: true });
  await writeFile(notePath, serializeLlmNote(note, draft), "utf8");
  await appendJournalEvent(rootPath, {
    summary: `LLM suggestion saved: ${intent.label} (${note.id})`
  });
  await appendSelectedProjectJournalEvent(rootPath, draft, {
    summary: `LLM suggestion saved: ${intent.label} (${note.id})`
  });

  return note;
}

function readIntent(intent: PromptPackIntent): PromptPackIntentDefinition {
  const definition = promptPackIntents.find(
    (candidate) => candidate.intent === intent
  );

  if (!definition) {
    throw new Error(`Unsupported Prompt Pack intent: ${intent}`);
  }

  return definition;
}

function readSelection(
  model: WorkspaceModel,
  input: PromptPackBuildInput
): { project: Project | null; task: Task | null } {
  const selectedTask = input.taskId ? findTask(model, input.taskId) : null;
  const projectId = input.projectId ?? selectedTask?.projectId ?? null;
  const selectedProject = projectId
    ? model.projects.find((project) => project.id === projectId) ?? null
    : model.activeProjects[0] ?? model.projects[0] ?? null;

  if (input.projectId && !selectedProject) {
    throw new Error(`Project was not found: ${input.projectId}`);
  }

  if (input.taskId && !selectedTask) {
    throw new Error(`Task was not found: ${input.taskId}`);
  }

  return {
    project: selectedProject,
    task: selectedTask
  };
}

function assertSelectionSupportsIntent(
  intent: PromptPackIntentDefinition,
  selection: { project: Project | null; task: Task | null }
): void {
  if (intent.requiresProject && !selection.project) {
    throw new Error(`${intent.label} requires a selected Project.`);
  }

  if (intent.requiresTask && !selection.task) {
    throw new Error(`${intent.label} requires a selected Task.`);
  }
}

function findTask(model: WorkspaceModel, taskId: string): Task | null {
  for (const project of model.projects) {
    const task = project.tasks.find((candidate) => candidate.id === taskId);

    if (task) {
      return task;
    }
  }

  return null;
}

async function readMemorySource(workspacePath: string): Promise<string> {
  try {
    return await readFile(join(resolve(workspacePath), "memory.md"), "utf8");
  } catch {
    return "# Memory\n\n## Current Summary\n\nNo memory has been recorded yet.\n";
  }
}

function readRecentProgressTasks(
  selection: { project: Project | null; task: Task | null },
  dependencyTasks: Task[]
): Task[] {
  const tasks = selection.task
    ? [selection.task, ...dependencyTasks]
    : selection.project?.tasks ?? [];
  const seen = new Set<string>();

  return tasks.filter((task) => {
    if (!task.progress.trim() || seen.has(task.id)) {
      return false;
    }

    seen.add(task.id);
    return true;
  });
}

function renderTaskSection(task: Task | null): string | null {
  if (!task) {
    return null;
  }

  return `## Current Task

- ID: ${task.id}
- Title: ${task.title}
- Status: ${task.status}
- Priority: ${task.priority}
- Lane: ${task.lane}
- Due: ${task.dueDate ?? "none"}
- Dependencies: ${task.dependencies.length > 0 ? task.dependencies.join(", ") : "none"}

### Context

${task.context || "No Task context recorded."}

### Acceptance Criteria

${task.acceptanceCriteria || "No acceptance criteria recorded."}
`;
}

function renderProjectSection(project: Project | null): string | null {
  if (!project) {
    return null;
  }

  return `## Project Context

- ID: ${project.id}
- Title: ${project.title}
- Status: ${project.status}
- Deadline: ${project.deadline ?? "none"}

### Goal

${project.goal || "No Project goal recorded."}

### Success Criteria

${project.successCriteria || "No success criteria recorded."}
`;
}

function renderDependencySection(tasks: Task[]): string {
  if (tasks.length === 0) {
    return `## Dependency Summaries

No Task dependencies selected for this prompt.
`;
  }

  return `## Dependency Summaries

${tasks
  .map(
    (task) => `### ${task.title}

- ID: ${task.id}
- Status: ${task.status}
- Progress: ${task.progress || "No progress recorded."}`
  )
  .join("\n\n")}
`;
}

function renderProgressSection(tasks: Task[]): string {
  if (tasks.length === 0) {
    return `## Recent Progress Snippets

No recent progress snippets are available in the selected context.
`;
  }

  return `## Recent Progress Snippets

${tasks
  .map((task) => `- ${task.title}: ${task.progress.trim()}`)
  .join("\n")}
`;
}

function renderMemorySection(memorySource: string): string {
  return `## Memory

${memorySource.trim() || "# Memory\n\nNo memory has been recorded yet."}
`;
}

function renderWholeProjectSection(project: Project | null): string | null {
  if (!project) {
    return null;
  }

  return `## Whole-Project Analysis

${project.tasks
  .map(
    (task, index) => `${index + 1}. ${task.title}
   - ID: ${task.id}
   - Status: ${task.status}
   - Priority: ${task.priority}
   - Context: ${task.context || "No context recorded."}
   - Progress: ${task.progress || "No progress recorded."}`
  )
  .join("\n")}
`;
}

function intentRequest(intent: PromptPackIntent): string {
  switch (intent) {
    case "plan_project":
      return "Create a practical Project plan from the reviewed context. Treat missing context as unknown, not as permission to invent facts.";
    case "break_down_task":
      return "Break the current Task into concrete next steps, open questions, and acceptance checks. Do not modify project facts.";
    case "review_risks":
      return "Review execution risks, blockers, and assumptions in the selected context. Separate evidence from speculation.";
    case "define_acceptance_criteria":
      return "Draft clear acceptance criteria for the current Task using only the provided context.";
    case "summarize_memory":
      return "Summarize the durable Memory that should be carried forward. Output a human-readable Markdown draft for review.";
    case "suggest_today_focus":
      return "Suggest a Today Focus ordering from the provided Project and Task context. Keep the output advisory.";
  }
}

async function appendSelectedProjectJournalEvent(
  workspacePath: string,
  draft: PromptOutputDraft,
  event: { summary: string }
): Promise<void> {
  if (!draft.projectId) {
    return;
  }

  const model = await readWorkspaceModel(workspacePath);
  const project = model.projects.find(
    (candidate) => candidate.id === draft.projectId
  );

  if (!project) {
    return;
  }

  await appendProjectJournalEvent(dirname(project.markdownPath), event);
}

function serializeLlmNote(
  note: SavedLlmNote,
  draft: PromptOutputDraft
): string {
  return `# LLM Note: ${note.title}

## Metadata

- ID: ${note.id}
- Intent: ${note.intent}
- Project ID: ${note.projectId ?? "none"}
- Task ID: ${note.taskId ?? "none"}
- Created At: ${note.createdAt}
- Fact Status: ${draft.factStatus}

## Prompt

${draft.promptMarkdown.trim()}

## LLM Output

${draft.outputMarkdown.trim() || "No LLM output was pasted."}
`;
}

function formatTimestampForPath(timestamp: string): string {
  return timestamp.replace(/\.\d{3}Z$/, "Z").replace(/[^0-9TZ]+/g, "-");
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "prompt-pack";
}
