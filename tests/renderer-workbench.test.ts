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
  TaskStatus,
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
}

function installBridge(initialState: WorkspaceState = emptyWorkspaceState) {
  let currentState = initialState;
  let projectCounter = 0;
  let taskCounter = 0;
  let artifactCounter = 0;
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
