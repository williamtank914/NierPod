import { randomUUID } from "node:crypto";
import {
  access,
  mkdir,
  readdir,
  readFile,
  stat,
  writeFile
} from "node:fs/promises";
import { basename, dirname, extname, join, relative, resolve, sep } from "node:path";
import {
  createProjectFromInput,
  createTaskFromInput,
  parseProjectMarkdown,
  parseTaskMarkdown,
  serializeProjectMarkdown,
  serializeTaskMarkdown
} from "../markdown";
import {
  appendJournalEvent,
  appendProjectJournalEvent,
  readProjectJournalSource,
  writeProjectJournalSource
} from "../journal";
import { addArtifactRecord, readArtifactRecords } from "../artifacts";
import type {
  ArtifactInput,
  ArtifactRecord,
  FutureModuleBoundary,
  Project,
  ProjectInput,
  Task,
  TaskInput,
  TaskUpdateInput,
  WorkspaceMarkdownFile,
  WorkspaceMarkdownKind,
  WorkspaceModel,
  WorkspaceSnapshot,
  WorkspaceState
} from "../../shared/domain";

export const workspaceModuleBoundary: FutureModuleBoundary = {
  name: "Workspace management",
  phase: "phase-1",
  status: "implemented",
  extendsFrom: "src/modules/workspace/index.ts",
  responsibility:
    "Own workspace selection, creation, Markdown source scanning, and app-settings isolation in Phase 1."
};

export const workspaceSettingsFilename = "nierpod-settings.json";

export type WorkspaceSettings = {
  version: 1;
  lastWorkspacePath: string | null;
};

export type WorkspaceManagerOptions = {
  settingsDirectory: string;
};

type RequiredMarkdownTemplate = {
  relativePath: string;
  kind: WorkspaceMarkdownKind;
  createContent: (workspaceTitle: string) => string;
};

const requiredMarkdownTemplates: RequiredMarkdownTemplate[] = [
  {
    relativePath: "README.md",
    kind: "workspace",
    createContent: (workspaceTitle) => `# ${workspaceTitle}

This folder is a NierPod workspace.

Markdown files are the source of truth. App settings are stored outside this folder.

## Structure

- \`projects/\`: Project and Task Markdown files.
- \`inbox.md\`: Quick capture.
- \`memory.md\`: Long-term workspace memory.
- \`journal.md\`: Human-readable event history.
- \`artifacts/manifest.md\`: Artifact records.
- \`llm-notes/\`: Saved LLM outputs that are not facts by default.
`
  },
  {
    relativePath: "projects/README.md",
    kind: "projects",
    createContent: () => `# Projects

Project Markdown files live here. Task ordering is stored in Project Markdown, not in app cache.
`
  },
  {
    relativePath: "inbox.md",
    kind: "inbox",
    createContent: () => `# Inbox

Use this file for quick capture before an item is assigned to a Project or Task.
`
  },
  {
    relativePath: "memory.md",
    kind: "memory",
    createContent: () => `# Memory

## Current Summary

No memory has been recorded yet.
`
  },
  {
    relativePath: "journal.md",
    kind: "journal",
    createContent: () => `# Journal

## Events

Workspace created.
`
  },
  {
    relativePath: "artifacts/manifest.md",
    kind: "artifact-manifest",
    createContent: () => `# Artifact Manifest

| ID | Type | Target | Location | Notes |
| --- | --- | --- | --- | --- |
`
  },
  {
    relativePath: "llm-notes/README.md",
    kind: "llm-notes",
    createContent: () => `# LLM Notes

Saved LLM outputs live here. They are not facts until the user applies them.
`
  }
];

const requiredMarkdownByPath = new Map(
  requiredMarkdownTemplates.map((template) => [
    template.relativePath,
    template.kind
  ])
);

export function getWorkspaceSettingsPath(settingsDirectory: string): string {
  return join(settingsDirectory, workspaceSettingsFilename);
}

export function getRequiredWorkspaceMarkdownFiles(): string[] {
  return requiredMarkdownTemplates.map((template) => template.relativePath);
}

export async function createWorkspace(
  workspacePath: string,
  options: WorkspaceManagerOptions
): Promise<WorkspaceState> {
  const rootPath = resolve(workspacePath);
  const title = basename(rootPath) || "NierPod Workspace";

  await mkdir(rootPath, { recursive: true });
  await assertDirectory(rootPath);
  await ensureBaseMarkdownStructure(rootPath, title);

  return openWorkspace(rootPath, options);
}

export async function createProject(
  workspacePath: string,
  input: ProjectInput
): Promise<Project> {
  const rootPath = resolve(workspacePath);
  await assertDirectory(rootPath);

  const projectId = `project-${randomUUID()}`;
  const markdownPath = join(rootPath, "projects", projectId, "project.md");
  const project = createProjectFromInput(projectId, markdownPath, input);

  await mkdir(dirname(markdownPath), { recursive: true });
  await writeFile(markdownPath, serializeProjectMarkdown(project), "utf8");
  await appendWorkspaceAndProjectJournalEvent(rootPath, project, {
    summary: `Project created: ${project.title} (${project.id})`
  });

  return project;
}

export async function updateProject(
  workspacePath: string,
  projectId: string,
  input: ProjectInput
): Promise<Project> {
  const project = await findProject(workspacePath, projectId);
  const updatedProject: Project = {
    ...project,
    title: input.title,
    goal: input.goal,
    successCriteria: input.successCriteria,
    status: input.status,
    deadline: input.deadline?.trim() || null
  };

  await writeFile(
    updatedProject.markdownPath,
    serializeProjectMarkdown(updatedProject),
    "utf8"
  );
  await appendWorkspaceAndProjectJournalEvent(workspacePath, updatedProject, {
    summary: `Project updated: ${updatedProject.title} (${updatedProject.id})`
  });

  return updatedProject;
}

export async function archiveProject(
  workspacePath: string,
  projectId: string
): Promise<Project> {
  const project = await findProject(workspacePath, projectId);

  const archivedProject = await updateProject(workspacePath, projectId, {
    title: project.title,
    goal: project.goal,
    successCriteria: project.successCriteria,
    status: "archived",
    deadline: project.deadline
  });

  await appendWorkspaceAndProjectJournalEvent(workspacePath, archivedProject, {
    summary: `Project archived: ${archivedProject.title} (${archivedProject.id})`
  });

  return archivedProject;
}

export async function createTask(
  workspacePath: string,
  projectId: string,
  input: TaskInput
): Promise<Task> {
  const project = await findProject(workspacePath, projectId);
  const taskId = `task-${randomUUID()}`;
  const taskPath = join(dirname(project.markdownPath), "tasks", `${taskId}.md`);
  const task = createTaskFromInput(taskId, project.id, taskPath, input);
  const updatedProject: Project = {
    ...project,
    taskOrder: [...project.taskOrder, task.id],
    tasks: [...project.tasks, task]
  };

  await mkdir(dirname(taskPath), { recursive: true });
  await writeFile(taskPath, serializeTaskMarkdown(task), "utf8");
  await writeFile(
    project.markdownPath,
    serializeProjectMarkdown(updatedProject),
    "utf8"
  );
  await appendWorkspaceAndProjectJournalEvent(workspacePath, updatedProject, {
    summary: `Task created: ${task.title} (${task.id})`
  });

  return task;
}

export async function updateTask(
  workspacePath: string,
  projectId: string,
  taskId: string,
  input: TaskUpdateInput
): Promise<Task> {
  const task = await findTask(workspacePath, projectId, taskId);
  const updatedTask: Task = {
    ...task,
    title: input.title ?? task.title,
    status: input.status ?? task.status,
    priority: input.priority ?? task.priority,
    lane: input.lane ?? task.lane,
    dueDate:
      input.dueDate === undefined ? task.dueDate : input.dueDate?.trim() || null,
    dependencies: input.dependencies ?? task.dependencies,
    context: input.context ?? task.context,
    todos:
      input.todos?.map((todo, index) => ({
        id: `todo-${index + 1}`,
        text: todo.text,
        completed: todo.completed
      })) ?? task.todos,
    progress: input.progress ?? task.progress,
    acceptanceCriteria: input.acceptanceCriteria ?? task.acceptanceCriteria
  };

  await writeFile(
    updatedTask.markdownPath,
    serializeTaskMarkdown(updatedTask),
    "utf8"
  );
  await appendTaskJournalEvents(workspacePath, task, updatedTask);

  return updatedTask;
}

export async function addTaskArtifact(
  workspacePath: string,
  projectId: string,
  taskId: string,
  input: ArtifactInput
): Promise<ArtifactRecord> {
  const project = await findProject(workspacePath, projectId);
  const task = project.tasks.find((candidate) => candidate.id === taskId);

  if (!task) {
    throw new Error(`Task was not found: ${taskId}`);
  }

  const artifact = await addArtifactRecord(dirname(project.markdownPath), task.id, input);
  await writeFile(
    task.markdownPath,
    serializeTaskMarkdown({
      ...task,
      artifacts: [...task.artifacts, artifact]
    }),
    "utf8"
  );

  await appendWorkspaceAndProjectJournalEvent(workspacePath, project, {
    summary: `Artifact added: ${artifact.title} (${artifact.id}) to ${task.title} (${task.id})`
  });

  return artifact;
}

export async function readProjectJournal(
  workspacePath: string,
  projectId: string
): Promise<string> {
  const project = await findProject(workspacePath, projectId);

  return readProjectJournalSource(dirname(project.markdownPath));
}

export async function updateProjectJournal(
  workspacePath: string,
  projectId: string,
  source: string
): Promise<void> {
  const project = await findProject(workspacePath, projectId);

  await writeProjectJournalSource(dirname(project.markdownPath), source);
}

async function appendWorkspaceAndProjectJournalEvent(
  workspacePath: string,
  project: Project,
  event: { summary: string }
): Promise<void> {
  await appendJournalEvent(workspacePath, event);
  await appendProjectJournalEvent(dirname(project.markdownPath), event);
}

async function appendTaskJournalEvents(
  workspacePath: string,
  previousTask: Task,
  updatedTask: Task
): Promise<void> {
  const projectDirectory = dirname(dirname(updatedTask.markdownPath));
  const summaries = [`Task updated: ${updatedTask.title} (${updatedTask.id})`];

  if (previousTask.status !== updatedTask.status) {
    summaries.push(
      updatedTask.status === "done"
        ? `Task completed: ${updatedTask.title} (${updatedTask.id})`
        : `Task status changed: ${updatedTask.title} (${updatedTask.id}) ${previousTask.status} -> ${updatedTask.status}`
    );
  }

  if (previousTask.priority !== updatedTask.priority) {
    summaries.push(
      `Task priority changed: ${updatedTask.title} (${updatedTask.id}) ${previousTask.priority} -> ${updatedTask.priority}`
    );
  }

  if (previousTask.acceptanceCriteria !== updatedTask.acceptanceCriteria) {
    summaries.push(
      `Acceptance Criteria changed: ${updatedTask.title} (${updatedTask.id})`
    );
  }

  for (const summary of summaries) {
    await appendJournalEvent(workspacePath, { summary });
    await appendProjectJournalEvent(projectDirectory, { summary });
  }
}

export async function readWorkspaceModel(
  workspacePath: string
): Promise<WorkspaceModel> {
  const rootPath = resolve(workspacePath);
  await assertDirectory(rootPath);
  const projects = await readProjects(rootPath);

  return {
    rootPath,
    projects,
    activeProjects: projects.filter((project) => project.status === "active")
  };
}

export async function openWorkspace(
  workspacePath: string,
  options: WorkspaceManagerOptions
): Promise<WorkspaceState> {
  const rootPath = resolve(workspacePath);
  await assertDirectory(rootPath);

  const current = await readWorkspaceSnapshot(rootPath);
  await writeWorkspaceSettings(options.settingsDirectory, {
    version: 1,
    lastWorkspacePath: rootPath
  });

  return createWorkspaceState(options.settingsDirectory, current);
}

export async function getCurrentWorkspaceState(
  options: WorkspaceManagerOptions
): Promise<WorkspaceState> {
  const settings = await readWorkspaceSettings(options.settingsDirectory);

  if (!settings.lastWorkspacePath) {
    return createWorkspaceState(options.settingsDirectory, null);
  }

  try {
    const current = await readWorkspaceSnapshot(settings.lastWorkspacePath);
    return createWorkspaceState(options.settingsDirectory, current);
  } catch {
    return {
      phase: "phase-1",
      settings: {
        storage: "app-user-data",
        settingsFilePath: getWorkspaceSettingsPath(options.settingsDirectory)
      },
      current: null,
      message:
        "The last workspace could not be reopened from Markdown. Select or create a workspace to continue."
    };
  }
}

export async function readWorkspaceSnapshot(
  workspacePath: string
): Promise<WorkspaceSnapshot> {
  const rootPath = resolve(workspacePath);
  await assertDirectory(rootPath);

  const markdownFiles = await collectMarkdownFiles(rootPath);
  const model = await readWorkspaceModel(rootPath);
  const folderName = basename(rootPath);
  const rootReadme = markdownFiles.find(
    (markdownFile) => markdownFile.relativePath === "README.md"
  );

  return {
    rootPath,
    folderName,
    title: rootReadme?.title ?? folderName,
    source: "markdown",
    requiredFiles: getRequiredWorkspaceMarkdownFiles(),
    markdownFiles,
    projectCount: model.projects.length,
    projects: model.projects,
    activeProjects: model.activeProjects
  };
}

export async function readWorkspaceSettings(
  settingsDirectory: string
): Promise<WorkspaceSettings> {
  const settingsPath = getWorkspaceSettingsPath(settingsDirectory);

  try {
    const rawSettings = JSON.parse(await readFile(settingsPath, "utf8")) as {
      version?: unknown;
      lastWorkspacePath?: unknown;
    };

    return {
      version: 1,
      lastWorkspacePath:
        typeof rawSettings.lastWorkspacePath === "string"
          ? rawSettings.lastWorkspacePath
          : null
    };
  } catch {
    return {
      version: 1,
      lastWorkspacePath: null
    };
  }
}

async function writeWorkspaceSettings(
  settingsDirectory: string,
  settings: WorkspaceSettings
): Promise<void> {
  await mkdir(settingsDirectory, { recursive: true });
  await writeFile(
    getWorkspaceSettingsPath(settingsDirectory),
    `${JSON.stringify(settings, null, 2)}\n`,
    "utf8"
  );
}

async function ensureBaseMarkdownStructure(
  rootPath: string,
  workspaceTitle: string
): Promise<void> {
  for (const template of requiredMarkdownTemplates) {
    const absolutePath = join(rootPath, template.relativePath);
    await mkdir(dirname(absolutePath), { recursive: true });

    if (await pathExists(absolutePath)) {
      continue;
    }

    await writeFile(
      absolutePath,
      template.createContent(workspaceTitle),
      "utf8"
    );
  }
}

async function collectMarkdownFiles(
  rootPath: string
): Promise<WorkspaceMarkdownFile[]> {
  const files: WorkspaceMarkdownFile[] = [];

  async function visit(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name === ".git" || entry.name === "node_modules") {
        continue;
      }

      const absolutePath = join(directory, entry.name);

      if (entry.isDirectory()) {
        await visit(absolutePath);
        continue;
      }

      if (!entry.isFile() || extname(entry.name).toLowerCase() !== ".md") {
        continue;
      }

      const relativePath = toWorkspaceRelativePath(rootPath, absolutePath);
      const source = await readFile(absolutePath, "utf8");
      const requiredKind = requiredMarkdownByPath.get(relativePath);

      files.push({
        relativePath,
        title: readMarkdownTitle(source) ?? titleFromFilename(entry.name),
        kind: requiredKind ?? "markdown",
        required: requiredKind !== undefined
      });
    }
  }

  await visit(rootPath);

  return files.sort((left, right) =>
    left.relativePath.localeCompare(right.relativePath)
  );
}

async function readProjects(rootPath: string): Promise<Project[]> {
  const projectsPath = join(rootPath, "projects");

  if (!(await pathExists(projectsPath))) {
    return [];
  }

  const entries = await readdir(projectsPath, { withFileTypes: true });
  const projects: Project[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const markdownPath = join(projectsPath, entry.name, "project.md");

    if (!(await pathExists(markdownPath))) {
      continue;
    }

    const project = parseProjectMarkdown(
      await readFile(markdownPath, "utf8"),
      markdownPath
    );

    projects.push({
      ...project,
      tasks: await readProjectTasks(project)
    });
  }

  return projects.sort((left, right) => left.title.localeCompare(right.title));
}

async function readProjectTasks(project: Project): Promise<Task[]> {
  const taskDirectory = join(dirname(project.markdownPath), "tasks");
  const projectArtifacts = await readArtifactRecords(dirname(project.markdownPath));

  if (!(await pathExists(taskDirectory))) {
    return [];
  }

  const entries = await readdir(taskDirectory, { withFileTypes: true });
  const tasks: Task[] = [];

  for (const entry of entries) {
    if (!entry.isFile() || extname(entry.name).toLowerCase() !== ".md") {
      continue;
    }

    const markdownPath = join(taskDirectory, entry.name);
    tasks.push(
      parseTaskMarkdown(await readFile(markdownPath, "utf8"), markdownPath)
    );
  }

  const artifactsByTaskId = groupArtifactsByTaskId(projectArtifacts);
  const tasksWithArtifacts = tasks.map((task) => ({
    ...task,
    artifacts: artifactsByTaskId.get(task.id) ?? []
  }));
  const tasksById = new Map(tasksWithArtifacts.map((task) => [task.id, task]));
  const orderedTasks = project.taskOrder
    .map((taskId) => tasksById.get(taskId))
    .filter((task): task is Task => task !== undefined);
  const unorderedTasks = tasksWithArtifacts
    .filter((task) => !project.taskOrder.includes(task.id))
    .sort((left, right) => left.title.localeCompare(right.title));

  return [...orderedTasks, ...unorderedTasks];
}

function groupArtifactsByTaskId(
  artifacts: ArtifactRecord[]
): Map<string, ArtifactRecord[]> {
  const artifactsByTaskId = new Map<string, ArtifactRecord[]>();

  for (const artifact of artifacts) {
    const taskArtifacts = artifactsByTaskId.get(artifact.taskId) ?? [];

    taskArtifacts.push(artifact);
    artifactsByTaskId.set(artifact.taskId, taskArtifacts);
  }

  return artifactsByTaskId;
}

async function findProject(
  workspacePath: string,
  projectId: string
): Promise<Project> {
  const model = await readWorkspaceModel(workspacePath);
  const project = model.projects.find((candidate) => candidate.id === projectId);

  if (!project) {
    throw new Error(`Project was not found: ${projectId}`);
  }

  return project;
}

async function findTask(
  workspacePath: string,
  projectId: string,
  taskId: string
): Promise<Task> {
  const project = await findProject(workspacePath, projectId);
  const task = project.tasks.find((candidate) => candidate.id === taskId);

  if (!task) {
    throw new Error(`Task was not found: ${taskId}`);
  }

  return task;
}

function createWorkspaceState(
  settingsDirectory: string,
  current: WorkspaceSnapshot | null
): WorkspaceState {
  return {
    phase: "phase-1",
    settings: {
      storage: "app-user-data",
      settingsFilePath: getWorkspaceSettingsPath(settingsDirectory)
    },
    current,
    message: current
      ? `Workspace "${current.title}" was rebuilt from Markdown.`
      : "No workspace selected. Select an existing folder or create a new Markdown workspace."
  };
}

async function assertDirectory(pathname: string): Promise<void> {
  const pathStat = await stat(pathname);

  if (!pathStat.isDirectory()) {
    throw new Error(`Workspace path is not a directory: ${pathname}`);
  }
}

async function pathExists(pathname: string): Promise<boolean> {
  try {
    await access(pathname);
    return true;
  } catch {
    return false;
  }
}

function toWorkspaceRelativePath(rootPath: string, absolutePath: string): string {
  return relative(rootPath, absolutePath).split(sep).join("/");
}

function readMarkdownTitle(source: string): string | null {
  const match = /^#\s+(.+?)\s*$/m.exec(source);
  return match?.[1] ?? null;
}

function titleFromFilename(filename: string): string {
  const name = filename.replace(/\.md$/i, "");
  return name
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}
