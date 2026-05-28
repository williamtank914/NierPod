import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { JSDOM } from "jsdom";
import { createElement } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  type RenderResult
} from "@testing-library/react";
import { App } from "../src/renderer/src/App";
import type {
  Project,
  Task,
  ArtifactRecord,
  ArtifactType,
  InboxItem,
  MemoryDocument,
  MemoryDraft,
  TaskStatus,
  PromptPack,
  TodayFocusItem,
  TodayFocusOverrideAction,
  WorkspaceSnapshot,
  WorkspaceState
} from "../src/shared/domain";
import type { NierPodBridge } from "../src/shared/ipc";

const emptyWorkspaceState: WorkspaceState = {
  phase: "phase-1",
  settings: {
    storage: "app-user-data",
    settingsFilePath: "/tmp/nierpod-user-data/nierpod-settings.json"
  },
  current: null,
  message:
    "No workspace selected. Select an existing folder or create a new Markdown workspace."
};

const openedWorkspace: WorkspaceSnapshot = {
  rootPath: "/tmp/nierpod-workspace",
  folderName: "nierpod-workspace",
  title: "Dogfood Workspace",
  source: "markdown",
  requiredFiles: [
    "README.md",
    "projects/README.md",
    "inbox.md",
    "memory.md",
    "journal.md",
    "artifacts/manifest.md",
    "llm-notes/README.md"
  ],
  markdownFiles: [
    {
      relativePath: "README.md",
      title: "Dogfood Workspace",
      kind: "workspace",
      required: true
    },
    {
      relativePath: "projects/README.md",
      title: "Projects",
      kind: "projects",
      required: true
    },
    {
      relativePath: "inbox.md",
      title: "Inbox",
      kind: "inbox",
      required: true
    },
    {
      relativePath: "memory.md",
      title: "Memory",
      kind: "memory",
      required: true
    },
    {
      relativePath: "journal.md",
      title: "Journal",
      kind: "journal",
      required: true
    },
    {
      relativePath: "artifacts/manifest.md",
      title: "Artifact Manifest",
      kind: "artifact-manifest",
      required: true
    },
    {
      relativePath: "llm-notes/README.md",
      title: "LLM Notes",
      kind: "llm-notes",
      required: true
    }
  ],
  projectCount: 0,
  projects: [],
  activeProjects: []
};

function installDom() {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/"
  });

  globalThis.window = dom.window as unknown as Window & typeof globalThis;
  globalThis.document = dom.window.document;
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.Node = dom.window.Node;
  globalThis.Event = dom.window.Event;
  globalThis.InputEvent = dom.window.InputEvent;
  globalThis.KeyboardEvent = dom.window.KeyboardEvent;
  Object.defineProperty(globalThis, "navigator", {
    value: dom.window.navigator,
    configurable: true
  });
  Object.defineProperty(dom.window.navigator, "clipboard", {
    value: {
      lastText: "",
      writeText(text: string) {
        this.lastText = text;
        return Promise.resolve();
      }
    },
    configurable: true
  });
}

function installBridge(initialState: WorkspaceState = emptyWorkspaceState) {
  let currentState = initialState;
  let projectCounter = 0;
  let taskCounter = 0;
  let artifactCounter = 0;
  let inboxCounter = 0;
  let inboxItems: InboxItem[] = [];
  let memorySource = "# Memory\n\n## Current Summary\n\nRenderer memory baseline.\n";
  const todayFocusOverrides = new Map<string, TodayFocusOverrideAction>();
  const journalByProjectId = new Map<string, string>();
  const stateAfterOpen: WorkspaceState = {
    ...emptyWorkspaceState,
    current: openedWorkspace,
    message: 'Workspace "Dogfood Workspace" was rebuilt from Markdown.'
  };

  function setCurrentWorkspace(nextWorkspace: WorkspaceSnapshot) {
    currentState = {
      ...emptyWorkspaceState,
      current: nextWorkspace,
      message: 'Workspace "Dogfood Workspace" was rebuilt from Markdown.'
    };
  }

  function currentWorkspace() {
    if (!currentState.current) {
      throw new Error("Workspace is not loaded.");
    }

    return currentState.current;
  }

  function replaceProject(project: Project) {
    const workspace = currentWorkspace();
    const projects = workspace.projects.map((candidate) =>
      candidate.id === project.id ? project : candidate
    );

    setCurrentWorkspace({
      ...workspace,
      projects,
      activeProjects: projects.filter(
        (candidate) => candidate.status === "active"
      ),
      projectCount: projects.length
    });
  }

  function readTodayFocus(): TodayFocusItem[] {
    const workspace = currentWorkspace();

    return workspace.activeProjects
      .flatMap((project) =>
        project.tasks
          .filter((task) =>
            ["ready", "in_progress", "blocked"].includes(task.status)
          )
          .map((task) => ({
            task,
            project,
            override: todayFocusOverrides.get(task.id) ?? null
          }))
      )
      .filter((item) => item.override !== "hide" && item.override !== "snooze")
      .sort((left, right) => {
        const overrideRank =
          (left.override === "pin" ? 0 : 1) -
          (right.override === "pin" ? 0 : 1);

        return (
          overrideRank ||
          left.project.title.localeCompare(right.project.title) ||
          left.task.title.localeCompare(right.task.title)
        );
      });
  }

  function readInboxMutationResult(ids: {
    itemId?: string;
    projectId?: string;
    taskId?: string;
  }) {
    return {
      state: currentState,
      inboxItems,
      ...ids
    };
  }

  function replaceInboxItem(item: InboxItem) {
    inboxItems = inboxItems.map((candidate) =>
      candidate.id === item.id ? item : candidate
    );
  }

  function requireOpenInboxItem(itemId: string): InboxItem {
    const item = inboxItems.find((candidate) => candidate.id === itemId);

    if (!item || item.status !== "open") {
      throw new Error("Open Inbox item missing in test bridge.");
    }

    return item;
  }

  const bridge: NierPodBridge = {
    appName: "NierPod",
    phase: "phase-1",
    workspace: {
      describeAccess: async () => ({
        ok: true,
        data: {
          phase: "phase-1",
          canReadFiles: true,
          canWriteFiles: true,
          message:
            "Workspace files are available only through allowlisted main-process IPC. Markdown files in the selected workspace are the source of truth."
        }
      }),
      getCurrent: async () => ({
        ok: true,
        data: currentState
      }),
      selectExisting: async () => {
        currentState = stateAfterOpen;
        return {
          ok: true,
          data: {
            canceled: false,
            state: currentState
          }
        };
      },
      createNew: async () => {
        currentState = stateAfterOpen;
        return {
          ok: true,
          data: {
            canceled: false,
            state: currentState
          }
        };
      },
      createProject: async (input) => {
        const workspace = currentWorkspace();
        projectCounter += 1;
        const project: Project = {
          id: `project-${projectCounter}`,
          title: input.title,
          goal: input.goal,
          successCriteria: input.successCriteria,
          status: input.status,
          deadline: input.deadline ?? null,
          taskOrder: [],
          tasks: [],
          markdownPath: `${workspace.rootPath}/projects/project-${projectCounter}/project.md`
        };
        journalByProjectId.set(
          project.id,
          `# Journal

## Events
- 2026-05-28T00:00:00.000Z - Project created: ${project.title} (${project.id})
`
        );
        const projects = [...workspace.projects, project];

        setCurrentWorkspace({
          ...workspace,
          projects,
          activeProjects: projects.filter(
            (candidate) => candidate.status === "active"
          ),
          projectCount: projects.length
        });

        return {
          ok: true,
          data: {
            state: currentState,
            projectId: project.id
          }
        };
      },
      updateProject: async (projectId, input) => {
        const project = currentWorkspace().projects.find(
          (candidate) => candidate.id === projectId
        );

        if (!project) {
          throw new Error("Project missing in test bridge.");
        }

        replaceProject({
          ...project,
          ...input,
          deadline: input.deadline ?? null
        });

        return {
          ok: true,
          data: {
            state: currentState,
            projectId
          }
        };
      },
      archiveProject: async (projectId) => {
        const project = currentWorkspace().projects.find(
          (candidate) => candidate.id === projectId
        );

        if (!project) {
          throw new Error("Project missing in test bridge.");
        }

        replaceProject({
          ...project,
          status: "archived"
        });

        return {
          ok: true,
          data: {
            state: currentState,
            projectId
          }
        };
      },
      createTask: async (projectId, input) => {
        const project = currentWorkspace().projects.find(
          (candidate) => candidate.id === projectId
        );

        if (!project) {
          throw new Error("Project missing in test bridge.");
        }

        taskCounter += 1;
        const task: Task = {
          id: `task-${taskCounter}`,
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
          artifacts: [],
          acceptanceCriteria: "",
          markdownPath: `${project.markdownPath}/../tasks/task-${taskCounter}.md`
        };
        const updatedProject: Project = {
          ...project,
          taskOrder: [...project.taskOrder, task.id],
          tasks: [...project.tasks, task]
        };

        replaceProject(updatedProject);

        return {
          ok: true,
          data: {
            state: currentState,
            projectId,
            taskId: task.id
          }
        };
      },
      updateTask: async (projectId, taskId, input) => {
        const project = currentWorkspace().projects.find(
          (candidate) => candidate.id === projectId
        );

        if (!project) {
          throw new Error("Project missing in test bridge.");
        }

        const updatedProject: Project = {
          ...project,
          tasks: project.tasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  title: input.title ?? task.title,
                  status: input.status ?? task.status,
                  priority: input.priority ?? task.priority,
                  lane: input.lane ?? task.lane,
                  dueDate:
                    input.dueDate === undefined ? task.dueDate : input.dueDate,
                  dependencies: input.dependencies ?? task.dependencies,
                  context: input.context ?? task.context,
                  todos:
                    input.todos?.map((todo, index) => ({
                      id: `todo-${index + 1}`,
                      text: todo.text,
                      completed: todo.completed
                    })) ?? task.todos,
                  progress: input.progress ?? task.progress,
                  acceptanceCriteria:
                    input.acceptanceCriteria ?? task.acceptanceCriteria
                }
              : task
          )
        };

        replaceProject(updatedProject);

        return {
          ok: true,
          data: {
            state: currentState,
            projectId,
            taskId
          }
        };
      },
      addTaskArtifact: async (projectId, taskId, input) => {
        const project = currentWorkspace().projects.find(
          (candidate) => candidate.id === projectId
        );

        if (!project) {
          throw new Error("Project missing in test bridge.");
        }

        artifactCounter += 1;

        const artifactType = input.type satisfies ArtifactType;
        const artifact: ArtifactRecord = {
          id: `artifact-${artifactCounter}`,
          title: input.title,
          type: artifactType,
          path:
            artifactType === "markdown"
              ? `${input.title.toLowerCase().replaceAll(" ", "-")}.md`
              : null,
          url: artifactType === "url" ? input.url ?? null : null,
          taskId,
          createdAt: "2026-05-28T00:00:00.000Z"
        };
        const updatedProject: Project = {
          ...project,
          tasks: project.tasks.map((task) =>
            task.id === taskId
              ? { ...task, artifacts: [...task.artifacts, artifact] }
              : task
          )
        };

        replaceProject(updatedProject);
        journalByProjectId.set(
          projectId,
          `${journalByProjectId.get(projectId)?.trimEnd() ?? "# Journal\n\n## Events"}
- 2026-05-28T00:00:00.000Z - Artifact added: ${artifact.title} (${artifact.id})
`
        );

        return {
          ok: true,
          data: {
            state: currentState,
            projectId,
            taskId,
            artifactId: artifact.id
          }
        };
      },
      readProjectJournal: async (projectId) => ({
        ok: true,
        data: {
          source: journalByProjectId.get(projectId) ?? "# Journal\n\n## Events\n"
        }
      }),
      updateProjectJournal: async (projectId, source) => {
        journalByProjectId.set(projectId, source);

        return {
          ok: true,
          data: {
            state: currentState,
            projectId
          }
        };
      },
      buildPromptPack: async (input) => {
        const workspace = currentWorkspace();
        const project =
          workspace.projects.find((candidate) => candidate.id === input.projectId) ??
          workspace.activeProjects[0] ??
          null;
        const task =
          project?.tasks.find((candidate) => candidate.id === input.taskId) ??
          null;
        const label =
          input.intent === "break_down_task"
            ? "Break down this task"
            : input.intent === "summarize_memory"
              ? "Summarize memory"
              : "Plan this project";
        const prompt: PromptPack = {
          intent: input.intent,
          title: label,
          contextSummary: [
            task ? `Current Task: ${task.title}` : null,
            project ? `Project Context: ${project.title}` : null,
            "Memory: memory.md"
          ].filter((entry): entry is string => entry !== null),
          promptMarkdown: `# Prompt Pack: ${label}

## Context Included

${task ? `- Current Task: ${task.title}\n` : ""}${project ? `- Project Context: ${project.title}\n` : ""}- Memory: memory.md

## Memory

${memorySource}

## Request

Keep output advisory.
`,
          wholeProjectAnalysisIncluded: input.includeWholeProjectAnalysis === true
        };

        return {
          ok: true,
          data: prompt
        };
      },
      savePromptOutputAsLlmNote: async (draft) => {
        const note = {
          id: "llm-note-1",
          intent: draft.intent,
          title: draft.intent === "break_down_task" ? "Break down this task" : "Prompt Pack",
          relativePath: "llm-notes/2026-05-28-break-down-this-task-note.md",
          projectId: draft.projectId ?? null,
          taskId: draft.taskId ?? null,
          createdAt: "2026-05-28T00:00:00.000Z"
        };

        if (note.projectId) {
          journalByProjectId.set(
            note.projectId,
            `${journalByProjectId.get(note.projectId)?.trimEnd() ?? "# Journal\n\n## Events"}
- 2026-05-28T00:00:00.000Z - LLM suggestion saved: ${note.title} (${note.id})
`
          );
        }

        return {
          ok: true,
          data: {
            state: currentState,
            note
          }
        };
      },
      readMemory: async () => {
        const memory: MemoryDocument = {
          relativePath: "memory.md",
          source: memorySource
        };

        return {
          ok: true,
          data: memory
        };
      },
      replaceMemory: async (draft: MemoryDraft) => {
        memorySource = draft.draftMarkdown;

        return {
          ok: true,
          data: {
            state: currentState,
            current: {
              relativePath: "memory.md",
              source: memorySource
            },
            archiveRelativePath: "memory/2026-05-28T00-00-00Z.md"
          }
        };
      },
      getTodayFocus: async () => ({
        ok: true,
        data: readTodayFocus()
      }),
      setTodayFocusOverride: async (taskId, action) => {
        todayFocusOverrides.set(taskId, action);

        return {
          ok: true,
          data: readTodayFocus()
        };
      },
      getInboxItems: async () => ({
        ok: true,
        data: inboxItems
      }),
      captureInboxItem: async (input) => {
        inboxCounter += 1;
        const item: InboxItem = {
          id: `inbox-${inboxCounter}`,
          text: input.text.trim(),
          status: "open",
          targetProjectId: null,
          targetTaskId: null,
          createdAt: "2026-05-28T00:00:00.000Z"
        };

        inboxItems = [...inboxItems, item];

        return {
          ok: true,
          data: readInboxMutationResult({ itemId: item.id })
        };
      },
      convertInboxItemToProject: async (itemId) => {
        const item = requireOpenInboxItem(itemId);
        const workspace = currentWorkspace();

        projectCounter += 1;

        const project: Project = {
          id: `project-${projectCounter}`,
          title: item.text,
          goal: `Captured from Inbox: ${item.text}`,
          successCriteria: "",
          status: "active",
          deadline: null,
          taskOrder: [],
          tasks: [],
          markdownPath: `${workspace.rootPath}/projects/project-${projectCounter}/project.md`
        };
        const projects = [...workspace.projects, project];

        replaceInboxItem({
          ...item,
          status: "converted_to_project",
          targetProjectId: project.id
        });
        setCurrentWorkspace({
          ...workspace,
          projects,
          activeProjects: projects,
          projectCount: projects.length
        });

        return {
          ok: true,
          data: readInboxMutationResult({
            itemId,
            projectId: project.id
          })
        };
      },
      convertInboxItemToTask: async (itemId, projectId) => {
        const item = requireOpenInboxItem(itemId);
        const project = currentWorkspace().projects.find(
          (candidate) => candidate.id === projectId
        );

        if (!project) {
          throw new Error("Project missing in test bridge.");
        }

        taskCounter += 1;

        const task: Task = {
          id: `task-${taskCounter}`,
          projectId,
          title: item.text,
          status: "backlog",
          priority: "p2",
          lane: "main",
          dueDate: null,
          dependencies: [],
          context: "",
          todos: [],
          progress: "",
          artifacts: [],
          acceptanceCriteria: "",
          markdownPath: `${project.markdownPath}/../tasks/task-${taskCounter}.md`
        };

        replaceProject({
          ...project,
          taskOrder: [...project.taskOrder, task.id],
          tasks: [...project.tasks, task]
        });
        replaceInboxItem({
          ...item,
          status: "converted_to_task",
          targetProjectId: projectId,
          targetTaskId: task.id
        });

        return {
          ok: true,
          data: readInboxMutationResult({
            itemId,
            projectId,
            taskId: task.id
          })
        };
      },
      attachInboxItemToTaskContext: async (itemId, projectId, taskId) => {
        const item = requireOpenInboxItem(itemId);
        const project = currentWorkspace().projects.find(
          (candidate) => candidate.id === projectId
        );

        if (!project) {
          throw new Error("Project missing in test bridge.");
        }

        replaceProject({
          ...project,
          tasks: project.tasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  context: task.context.trim()
                    ? `${task.context.trimEnd()}\n\nInbox Context:\n- ${item.text}`
                    : `Inbox Context:\n- ${item.text}`
                }
              : task
          )
        });
        replaceInboxItem({
          ...item,
          status: "attached_to_task",
          targetProjectId: projectId,
          targetTaskId: taskId
        });

        return {
          ok: true,
          data: readInboxMutationResult({ itemId, projectId, taskId })
        };
      },
      archiveInboxItem: async (itemId) => {
        const item = requireOpenInboxItem(itemId);

        replaceInboxItem({
          ...item,
          status: "archived"
        });

        return {
          ok: true,
          data: readInboxMutationResult({ itemId })
        };
      },
      deleteInboxItem: async (itemId) => {
        inboxItems = inboxItems.filter((item) => item.id !== itemId);

        return {
          ok: true,
          data: readInboxMutationResult({ itemId })
        };
      }
    }
  };

  Object.defineProperty(window, "nierpod", {
    value: bridge,
    configurable: true
  });
}

beforeEach(() => {
  installDom();
  installBridge();
});

afterEach(() => {
  cleanup();
});

async function changeField(
  view: RenderResult,
  label: string,
  value: string
): Promise<void> {
  await act(async () => {
    const field = view.getByLabelText(label) as
      | HTMLInputElement
      | HTMLTextAreaElement
      | HTMLSelectElement;
    const valueSetter = Object.getOwnPropertyDescriptor(
      field.constructor.prototype,
      "value"
    )?.set;

    valueSetter?.call(field, value);
    fireEvent.input(field, {
      target: { value }
    });
    fireEvent.change(field, {
      target: { value }
    });
  });
}

async function clickButton(view: RenderResult, name: string): Promise<void> {
  await act(async () => {
    fireEvent.click(view.getByRole("button", { name }));
  });
}

test("NierPod starts on a three-column workbench empty state", async () => {
  const view = render(createElement(App));

  view.getByRole("main", { name: "NierPod workbench" });
  view.getByRole("navigation", { name: "Workspace navigation" });
  view.getByRole("region", { name: "Task timeline" });
  view.getByRole("complementary", { name: "Task detail and artifacts" });

  for (const label of [
    "Today Focus",
    "Inbox",
    "Projects",
    "Workspace Status",
    "Markdown Files",
    "Memory",
    "Prompt Pack"
  ]) {
    assert.ok(view.getAllByText(label).length > 0, label);
  }

  view.getByRole("button", { name: "Open Folder" });
  view.getByRole("button", { name: "Create Workspace" });
  await view.findByText(/No workspace selected/);
  await view.findByText(/allowlisted main-process IPC/);
});

test("workspace actions load Markdown-backed workspace state through the bridge", async () => {
  const view = render(createElement(App));

  await view.findByText(/No workspace selected/);

  await act(async () => {
    fireEvent.click(view.getByRole("button", { name: "Create Workspace" }));
  });

  assert.ok((await view.findAllByText("Dogfood Workspace")).length > 0);
  view.getByText("/tmp/nierpod-workspace");
  view.getByText("7 files");
  view.getByText("README.md");
  view.getByText(/0 Project Markdown files found/);
  view.getByText(/App settings are stored outside the workspace/);
});

test("renderer creates Project and Task through the workspace bridge", async () => {
  const view = render(createElement(App));

  await view.findByText(/No workspace selected/);

  await act(async () => {
    fireEvent.click(view.getByRole("button", { name: "Create Workspace" }));
  });

  await changeField(view, "Project title", "NierPod");
  await changeField(view, "Project goal", "Ship Phase 1");
  await changeField(view, "Success criteria", "- Task timeline is visible.");
  await clickButton(view, "Create Project");

  await view.findByRole("button", { name: "NierPod" });
  await changeField(view, "Task title", "Build task detail editor");
  await clickButton(view, "Create Task");

  await view.findByRole("button", { name: "Build task detail editor" });
});

test("renderer edits Task detail without inferring done from checklist", async () => {
  const view = render(createElement(App));

  await view.findByText(/No workspace selected/);

  await act(async () => {
    fireEvent.click(view.getByRole("button", { name: "Create Workspace" }));
  });

  await changeField(view, "Project title", "NierPod");
  await changeField(view, "Project goal", "Ship Phase 1");
  await changeField(view, "Success criteria", "- Task detail is editable.");
  await clickButton(view, "Create Project");
  await changeField(view, "Task title", "Build task detail editor");
  await clickButton(view, "Create Task");

  await act(async () => {
    fireEvent.click(
      await view.findByRole("button", { name: "Build task detail editor" })
    );
  });

  await changeField(view, "Task status", "in_progress" satisfies TaskStatus);
  await changeField(view, "Priority", "p0");
  await changeField(view, "Lane", "parallel");
  await changeField(view, "Context", "Use the workspace bridge.");
  await changeField(view, "New todo", "Wire detail fields");
  await clickButton(view, "Add Todo");

  await act(async () => {
    fireEvent.click(view.getByRole("checkbox", { name: "Wire detail fields" }));
  });

  await act(async () => {
    fireEvent.click(view.getByRole("button", { name: "Save Task" }));
  });

  assert.equal(
    (view.getByLabelText("Task status") as HTMLSelectElement).value,
    "in_progress"
  );

  await changeField(view, "Task status", "done" satisfies TaskStatus);
  await clickButton(view, "Save Task");

  assert.equal(
    (view.getByLabelText("Task status") as HTMLSelectElement).value,
    "done"
  );
});

test("renderer adds Task artifacts and edits Project Journal through the bridge", async () => {
  const view = render(createElement(App));

  await view.findByText(/No workspace selected/);

  await act(async () => {
    fireEvent.click(view.getByRole("button", { name: "Create Workspace" }));
  });

  await changeField(view, "Project title", "NierPod");
  await changeField(view, "Project goal", "Ship Phase 1");
  await changeField(view, "Success criteria", "- Artifacts are visible.");
  await clickButton(view, "Create Project");
  await changeField(view, "Task title", "Artifacts and Journal");
  await clickButton(view, "Create Task");

  await act(async () => {
    fireEvent.click(
      await view.findByRole("button", { name: "Artifacts and Journal" })
    );
  });

  await changeField(view, "Artifact title", "PRD v1");
  await changeField(view, "Markdown artifact content", "# PRD v1\n\nDone.");
  await clickButton(view, "Add Artifact");

  await view.findByText("PRD v1");

  await changeField(view, "Artifact type", "url");
  await changeField(view, "Artifact title", "Demo link");
  await changeField(view, "Artifact URL", "https://example.com/demo");
  await clickButton(view, "Add Artifact");

  await view.findByText("Demo link");
  view.getByText("https://example.com/demo");

  const journalField = (await view.findByLabelText(
    "Project Journal"
  )) as HTMLTextAreaElement;

  assert.match(journalField.value, /Project created: NierPod/);

  await changeField(
    view,
    "Project Journal",
    "# Journal\n\n## Events\n\nManual journal note."
  );
  await clickButton(view, "Save Journal");

  assert.match(
    (view.getByLabelText("Project Journal") as HTMLTextAreaElement).value,
    /Manual journal note/
  );
});

test("renderer shows Today Focus with Project context and daily overrides", async () => {
  const view = render(createElement(App));

  await view.findByText(/No workspace selected/);

  await act(async () => {
    fireEvent.click(view.getByRole("button", { name: "Create Workspace" }));
  });

  await changeField(view, "Project title", "NierPod");
  await changeField(view, "Project goal", "Ship Phase 1");
  await changeField(view, "Success criteria", "- Today Focus is visible.");
  await clickButton(view, "Create Project");
  await changeField(view, "Task title", "Resolve dependency");
  await clickButton(view, "Create Task");

  await act(async () => {
    fireEvent.click(await view.findByRole("button", { name: "Resolve dependency" }));
  });

  await changeField(view, "Task status", "blocked" satisfies TaskStatus);
  await clickButton(view, "Save Task");

  await view.findByRole("heading", { name: "Today Focus" });
  assert.ok(view.getAllByText("Resolve dependency").length >= 2);
  assert.ok(view.getAllByText("NierPod").length > 0);
  assert.ok(view.getAllByText("blocked").length >= 2);

  await clickButton(view, "Pin Resolve dependency");
  view.getByText("pinned today");

  await clickButton(view, "Hide Resolve dependency");

  assert.equal(
    view.queryByRole("button", { name: "Pin Resolve dependency" }),
    null
  );
});

test("renderer captures Inbox items and converts them into visible workspace targets", async () => {
  const view = render(createElement(App));

  await view.findByText(/No workspace selected/);

  await act(async () => {
    fireEvent.click(view.getByRole("button", { name: "Create Workspace" }));
  });

  await changeField(view, "Inbox capture", "Plan memory workflow");
  await clickButton(view, "Capture Inbox Item");
  await view.findByText("Plan memory workflow");

  await clickButton(view, "Convert to Project Plan memory workflow");
  await view.findByRole("button", { name: "Plan memory workflow" });
  await view.findByText("converted_to_project");

  await changeField(view, "Inbox capture", "Write converted Task");
  await clickButton(view, "Capture Inbox Item");
  await clickButton(view, "Convert to Task Write converted Task");
  await view.findByRole("button", { name: "Write converted Task" });
  await view.findByText("converted_to_task");

  await act(async () => {
    fireEvent.click(
      await view.findByRole("button", { name: "Write converted Task" })
    );
  });

  await changeField(view, "Inbox capture", "Add pasted notes to context");
  await clickButton(view, "Capture Inbox Item");
  await clickButton(view, "Attach to Task Context Add pasted notes to context");

  assert.match(
    (view.getByLabelText("Context") as HTMLTextAreaElement).value,
    /Add pasted notes to context/
  );
  await view.findByText("attached_to_task");

  await changeField(view, "Inbox capture", "Archive this capture");
  await clickButton(view, "Capture Inbox Item");
  await clickButton(view, "Archive Archive this capture");
  assert.ok((await view.findAllByText("archived")).length > 0);

  await changeField(view, "Inbox capture", "Delete this capture");
  await clickButton(view, "Capture Inbox Item");
  await clickButton(view, "Delete Delete this capture");

  assert.equal(view.queryByText("Delete this capture"), null);
});

test("renderer runs Prompt Pack copy and paste-back without treating LLM output as fact", async () => {
  const view = render(createElement(App));

  await view.findByText(/No workspace selected/);

  await act(async () => {
    fireEvent.click(view.getByRole("button", { name: "Create Workspace" }));
  });

  await changeField(view, "Project title", "NierPod");
  await changeField(view, "Project goal", "Ship Phase 1");
  await changeField(view, "Success criteria", "- Prompt Pack is usable.");
  await clickButton(view, "Create Project");
  await changeField(view, "Task title", "Build Prompt Pack workflow");
  await clickButton(view, "Create Task");

  await changeField(view, "Prompt Pack intent", "break_down_task");
  await clickButton(view, "Generate Prompt Pack");

  await view.findByText("Context Included");
  await view.findByText("Current Task: Build Prompt Pack workflow");
  await clickButton(view, "Copy Prompt");
  await view.findByText("Prompt copied.");

  await changeField(
    view,
    "LLM output paste-back",
    "## Suggested next steps\n\n- Keep this advisory."
  );
  await clickButton(view, "Stage LLM Output");

  await view.findByText("Fact Status: not_fact");
  view.getByRole("button", { name: "Discard LLM Output" });
  view.getByRole("button", { name: "Manual Apply" });

  await clickButton(view, "Save as LLM Note");
  await view.findByText(/LLM note saved/);
});

test("renderer runs Memory summary prompt and confirmed replacement workflow", async () => {
  const view = render(createElement(App));

  await view.findByText(/No workspace selected/);

  await act(async () => {
    fireEvent.click(view.getByRole("button", { name: "Create Workspace" }));
  });

  await view.findByText("Renderer memory baseline.");
  await clickButton(view, "Generate Memory Prompt");
  await view.findByText("Prompt Pack: Summarize memory");

  await changeField(
    view,
    "Memory draft",
    "# Memory\n\n## Current Summary\n\nRenderer memory replacement.\n"
  );
  await clickButton(view, "Stage Memory Draft");
  await view.findByText("Confirm before replacing memory.md.");

  await clickButton(view, "Cancel Memory Replacement");
  await view.findByText("Memory replacement canceled.");
  await view.findByText("Renderer memory baseline.");

  await changeField(
    view,
    "Memory draft",
    "# Memory\n\n## Current Summary\n\nRenderer memory replacement.\n"
  );
  await clickButton(view, "Stage Memory Draft");
  await clickButton(view, "Replace Memory");

  await view.findByText("Renderer memory replacement.");
  await view.findByText(/Archived previous Memory to memory\//);
});
