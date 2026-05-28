import {
  app,
  BrowserWindow,
  dialog,
  type OpenDialogOptions,
  type OpenDialogReturnValue,
  type IpcMainInvokeEvent,
  ipcMain
} from "electron";
import { join } from "node:path";
import {
  addTaskArtifact,
  archiveProject,
  createProject,
  createTask,
  createWorkspace,
  getCurrentWorkspaceState,
  openWorkspace,
  readProjectJournal,
  readWorkspaceSettings,
  updateProject,
  updateProjectJournal,
  updateTask
} from "../modules/workspace";
import {
  createWorkspaceAccessDescription,
  createWorkspaceOperationNotAllowedResponse,
  isAllowedWorkspaceOperation,
  workspaceIpcChannel,
  type IpcResponse,
  type ProjectJournalResult,
  type UnknownWorkspaceIpcRequest,
  type WorkspaceAccessDescription,
  type WorkspaceActionResult,
  type WorkspaceMutationResult
} from "../shared/ipc";
import type {
  ArtifactInput,
  ProjectInput,
  TaskInput,
  TaskUpdateInput,
  WorkspaceState
} from "../shared/domain";

const rendererDevServerUrl = process.env.ELECTRON_RENDERER_URL;

function createMainWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 960,
    minHeight: 640,
    title: "NierPod",
    backgroundColor: "#f4f5f0",
    show: false,
    webPreferences: {
      preload: join(__dirname, "../preload/index.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  if (rendererDevServerUrl) {
    void mainWindow.loadURL(rendererDevServerUrl);
    return;
  }

  void mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
}

function registerIpcHandlers(): void {
  ipcMain.handle(workspaceIpcChannel, resolveWorkspaceIpcRequest);
}

async function resolveWorkspaceIpcRequest(
  event: IpcMainInvokeEvent,
  request: UnknownWorkspaceIpcRequest
): Promise<
  IpcResponse<
    | WorkspaceAccessDescription
    | WorkspaceState
    | WorkspaceActionResult
    | WorkspaceMutationResult
    | ProjectJournalResult
  >
> {
  if (!isAllowedWorkspaceOperation(request.operation)) {
    return createWorkspaceOperationNotAllowedResponse(request);
  }

  try {
    const settingsDirectory = app.getPath("userData");

    switch (request.operation) {
      case "workspace.describeAccess":
        return {
          ok: true,
          data: createWorkspaceAccessDescription()
        };
      case "workspace.getCurrent":
        return {
          ok: true,
          data: await getCurrentWorkspaceState({ settingsDirectory })
        };
      case "workspace.selectExisting":
        return {
          ok: true,
          data: await selectExistingWorkspace(event, settingsDirectory)
        };
      case "workspace.createNew":
        return {
          ok: true,
          data: await createNewWorkspace(event, settingsDirectory)
        };
      case "workspace.createProject":
        return {
          ok: true,
          data: await createProjectForCurrentWorkspace(
            settingsDirectory,
            request.input as ProjectInput
          )
        };
      case "workspace.updateProject":
        return {
          ok: true,
          data: await updateProjectForCurrentWorkspace(
            settingsDirectory,
            readRequestString(request.projectId, "projectId"),
            request.input as ProjectInput
          )
        };
      case "workspace.archiveProject":
        return {
          ok: true,
          data: await archiveProjectForCurrentWorkspace(
            settingsDirectory,
            readRequestString(request.projectId, "projectId")
          )
        };
      case "workspace.createTask":
        return {
          ok: true,
          data: await createTaskForCurrentWorkspace(
            settingsDirectory,
            readRequestString(request.projectId, "projectId"),
            request.input as TaskInput
          )
        };
      case "workspace.updateTask":
        return {
          ok: true,
          data: await updateTaskForCurrentWorkspace(
            settingsDirectory,
            readRequestString(request.projectId, "projectId"),
            readRequestString(request.taskId, "taskId"),
            request.input as TaskUpdateInput
          )
        };
      case "workspace.addTaskArtifact":
        return {
          ok: true,
          data: await addTaskArtifactForCurrentWorkspace(
            settingsDirectory,
            readRequestString(request.projectId, "projectId"),
            readRequestString(request.taskId, "taskId"),
            request.input as ArtifactInput
          )
        };
      case "workspace.readProjectJournal":
        return {
          ok: true,
          data: await readProjectJournalForCurrentWorkspace(
            settingsDirectory,
            readRequestString(request.projectId, "projectId")
          )
        };
      case "workspace.updateProjectJournal":
        return {
          ok: true,
          data: await updateProjectJournalForCurrentWorkspace(
            settingsDirectory,
            readRequestString(request.projectId, "projectId"),
            readRequestText(request.source, "source")
          )
        };
    }
  } catch (error) {
    return {
      ok: false,
      error: {
        code: "internal_error",
        message:
          error instanceof Error
            ? error.message
            : "Workspace operation failed."
      }
    };
  }
}

async function createProjectForCurrentWorkspace(
  settingsDirectory: string,
  input: ProjectInput
): Promise<WorkspaceMutationResult> {
  const workspacePath = await requireCurrentWorkspacePath(settingsDirectory);
  const project = await createProject(workspacePath, input);

  return {
    state: await getCurrentWorkspaceState({ settingsDirectory }),
    projectId: project.id
  };
}

async function updateProjectForCurrentWorkspace(
  settingsDirectory: string,
  projectId: string,
  input: ProjectInput
): Promise<WorkspaceMutationResult> {
  await updateProject(await requireCurrentWorkspacePath(settingsDirectory), projectId, input);

  return {
    state: await getCurrentWorkspaceState({ settingsDirectory }),
    projectId
  };
}

async function archiveProjectForCurrentWorkspace(
  settingsDirectory: string,
  projectId: string
): Promise<WorkspaceMutationResult> {
  await archiveProject(await requireCurrentWorkspacePath(settingsDirectory), projectId);

  return {
    state: await getCurrentWorkspaceState({ settingsDirectory }),
    projectId
  };
}

async function createTaskForCurrentWorkspace(
  settingsDirectory: string,
  projectId: string,
  input: TaskInput
): Promise<WorkspaceMutationResult> {
  const task = await createTask(
    await requireCurrentWorkspacePath(settingsDirectory),
    projectId,
    input
  );

  return {
    state: await getCurrentWorkspaceState({ settingsDirectory }),
    projectId,
    taskId: task.id
  };
}

async function updateTaskForCurrentWorkspace(
  settingsDirectory: string,
  projectId: string,
  taskId: string,
  input: TaskUpdateInput
): Promise<WorkspaceMutationResult> {
  await updateTask(
    await requireCurrentWorkspacePath(settingsDirectory),
    projectId,
    taskId,
    input
  );

  return {
    state: await getCurrentWorkspaceState({ settingsDirectory }),
    projectId,
    taskId
  };
}

async function addTaskArtifactForCurrentWorkspace(
  settingsDirectory: string,
  projectId: string,
  taskId: string,
  input: ArtifactInput
): Promise<WorkspaceMutationResult> {
  const artifact = await addTaskArtifact(
    await requireCurrentWorkspacePath(settingsDirectory),
    projectId,
    taskId,
    input
  );

  return {
    state: await getCurrentWorkspaceState({ settingsDirectory }),
    projectId,
    taskId,
    artifactId: artifact.id
  };
}

async function readProjectJournalForCurrentWorkspace(
  settingsDirectory: string,
  projectId: string
): Promise<ProjectJournalResult> {
  return {
    source: await readProjectJournal(
      await requireCurrentWorkspacePath(settingsDirectory),
      projectId
    )
  };
}

async function updateProjectJournalForCurrentWorkspace(
  settingsDirectory: string,
  projectId: string,
  source: string
): Promise<WorkspaceMutationResult> {
  await updateProjectJournal(
    await requireCurrentWorkspacePath(settingsDirectory),
    projectId,
    source
  );

  return {
    state: await getCurrentWorkspaceState({ settingsDirectory }),
    projectId
  };
}

async function requireCurrentWorkspacePath(
  settingsDirectory: string
): Promise<string> {
  const settings = await readWorkspaceSettings(settingsDirectory);

  if (!settings.lastWorkspacePath) {
    throw new Error("Select or create a workspace before editing Projects.");
  }

  return settings.lastWorkspacePath;
}

function readRequestString(value: unknown, name: string): string {
  if (typeof value !== "string" || !value) {
    throw new Error(`Workspace request is missing ${name}.`);
  }

  return value;
}

function readRequestText(value: unknown, name: string): string {
  if (typeof value !== "string") {
    throw new Error(`Workspace request is missing ${name}.`);
  }

  return value;
}

async function selectExistingWorkspace(
  event: IpcMainInvokeEvent,
  settingsDirectory: string
): Promise<WorkspaceActionResult> {
  const result = await showWorkspaceDirectoryDialog(event, {
    title: "Open NierPod workspace",
    buttonLabel: "Open Workspace"
  });

  if (result.canceled || !result.filePaths[0]) {
    return {
      canceled: true,
      state: await getCurrentWorkspaceState({ settingsDirectory })
    };
  }

  return {
    canceled: false,
    state: await openWorkspace(result.filePaths[0], { settingsDirectory })
  };
}

async function createNewWorkspace(
  event: IpcMainInvokeEvent,
  settingsDirectory: string
): Promise<WorkspaceActionResult> {
  const result = await showWorkspaceDirectoryDialog(event, {
    title: "Create NierPod workspace",
    buttonLabel: "Create Workspace"
  });

  if (result.canceled || !result.filePaths[0]) {
    return {
      canceled: true,
      state: await getCurrentWorkspaceState({ settingsDirectory })
    };
  }

  return {
    canceled: false,
    state: await createWorkspace(result.filePaths[0], { settingsDirectory })
  };
}

async function showWorkspaceDirectoryDialog(
  event: IpcMainInvokeEvent,
  options: { title: string; buttonLabel: string }
): Promise<OpenDialogReturnValue> {
  const parentWindow = BrowserWindow.fromWebContents(event.sender);
  const dialogOptions: OpenDialogOptions = {
    title: options.title,
    buttonLabel: options.buttonLabel,
    properties: ["openDirectory", "createDirectory"]
  };

  return parentWindow
    ? dialog.showOpenDialog(parentWindow, dialogOptions)
    : dialog.showOpenDialog(dialogOptions);
}

void app.whenReady().then(() => {
  registerIpcHandlers();
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
