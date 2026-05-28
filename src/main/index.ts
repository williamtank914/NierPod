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
  archiveInboxItem,
  attachInboxItemToTaskContext,
  captureInboxItem,
  archiveProject,
  convertInboxItemToProject,
  convertInboxItemToTask,
  createProject,
  createTask,
  createWorkspace,
  deleteInboxItem,
  getCurrentWorkspaceState,
  openWorkspace,
  readInboxItems,
  readProjectJournal,
  readWorkspaceSettings,
  updateProject,
  updateProjectJournal,
  updateTask
} from "../modules/workspace";
import {
  buildPromptPack,
  savePromptOutputAsLlmNote
} from "../modules/prompt-pack";
import {
  readCurrentMemory,
  replaceMemoryWithDraft
} from "../modules/memory";
import { rebuildSearchIndex, searchWorkspace } from "../modules/search";
import { saveConflictCopy, watchWorkspaceFiles } from "../modules/sync";
import {
  createWorkspaceAccessDescription,
  createWorkspaceOperationNotAllowedResponse,
  isAllowedWorkspaceOperation,
  workspaceExternalFileChangeChannel,
  workspaceIpcChannel,
  type IpcResponse,
  type InboxMutationResult,
  type MemoryReplacementIpcResult,
  type ProjectJournalResult,
  type PromptOutputSaveResult,
  type UnknownWorkspaceIpcRequest,
  type WorkspaceAccessDescription,
  type WorkspaceActionResult,
  type WorkspaceMutationResult
} from "../shared/ipc";
import {
  readTodayFocusItems,
  setTodayFocusOverride
} from "../modules/today-focus";
import type {
  ArtifactInput,
  ConflictCopyInput,
  ConflictCopyResult,
  InboxItem,
  InboxItemInput,
  MemoryDocument,
  MemoryDraft,
  ProjectInput,
  PromptOutputDraft,
  PromptPack,
  PromptPackBuildInput,
  SearchQueryInput,
  SearchResult,
  TaskInput,
  TaskUpdateInput,
  TodayFocusItem,
  TodayFocusOverrideAction,
  WorkspaceExternalFileChange,
  WorkspaceState
} from "../shared/domain";

const rendererDevServerUrl = process.env.ELECTRON_RENDERER_URL;
let stopWorkspaceWatcher: (() => void) | null = null;
let watchedWorkspacePath: string | null = null;

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
    | InboxMutationResult
    | ProjectJournalResult
    | PromptPack
    | PromptOutputSaveResult
    | MemoryDocument
    | MemoryReplacementIpcResult
    | SearchResult[]
    | ConflictCopyResult
    | TodayFocusItem[]
    | InboxItem[]
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
          data: await readCurrentWorkspaceState(settingsDirectory)
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
      case "workspace.buildPromptPack":
        return {
          ok: true,
          data: await buildPromptPackForCurrentWorkspace(
            settingsDirectory,
            request.input as PromptPackBuildInput
          )
        };
      case "workspace.savePromptOutputAsLlmNote":
        return {
          ok: true,
          data: await savePromptOutputAsLlmNoteForCurrentWorkspace(
            settingsDirectory,
            request.draft as PromptOutputDraft
          )
        };
      case "workspace.readMemory":
        return {
          ok: true,
          data: await readMemoryForCurrentWorkspace(settingsDirectory)
        };
      case "workspace.replaceMemory":
        return {
          ok: true,
          data: await replaceMemoryForCurrentWorkspace(
            settingsDirectory,
            request.draft as MemoryDraft
          )
        };
      case "workspace.search":
        return {
          ok: true,
          data: await searchCurrentWorkspace(
            settingsDirectory,
            request.input as SearchQueryInput
          )
        };
      case "workspace.saveConflictCopy":
        return {
          ok: true,
          data: await saveConflictCopyForCurrentWorkspace(
            settingsDirectory,
            request.input as ConflictCopyInput
          )
        };
      case "workspace.getTodayFocus":
        return {
          ok: true,
          data: await readTodayFocusForCurrentWorkspace(settingsDirectory)
        };
      case "workspace.setTodayFocusOverride":
        return {
          ok: true,
          data: await setTodayFocusOverrideForCurrentWorkspace(
            settingsDirectory,
            readRequestString(request.taskId, "taskId"),
            readTodayFocusOverrideAction(request.action)
          )
        };
      case "workspace.getInboxItems":
        return {
          ok: true,
          data: await readInboxItemsForCurrentWorkspace(settingsDirectory)
        };
      case "workspace.captureInboxItem":
        return {
          ok: true,
          data: await captureInboxItemForCurrentWorkspace(
            settingsDirectory,
            request.input as InboxItemInput
          )
        };
      case "workspace.convertInboxItemToProject":
        return {
          ok: true,
          data: await convertInboxItemToProjectForCurrentWorkspace(
            settingsDirectory,
            readRequestString(request.itemId, "itemId")
          )
        };
      case "workspace.convertInboxItemToTask":
        return {
          ok: true,
          data: await convertInboxItemToTaskForCurrentWorkspace(
            settingsDirectory,
            readRequestString(request.itemId, "itemId"),
            readRequestString(request.projectId, "projectId")
          )
        };
      case "workspace.attachInboxItemToTaskContext":
        return {
          ok: true,
          data: await attachInboxItemToTaskContextForCurrentWorkspace(
            settingsDirectory,
            readRequestString(request.itemId, "itemId"),
            readRequestString(request.projectId, "projectId"),
            readRequestString(request.taskId, "taskId")
          )
        };
      case "workspace.archiveInboxItem":
        return {
          ok: true,
          data: await archiveInboxItemForCurrentWorkspace(
            settingsDirectory,
            readRequestString(request.itemId, "itemId")
          )
        };
      case "workspace.deleteInboxItem":
        return {
          ok: true,
          data: await deleteInboxItemForCurrentWorkspace(
            settingsDirectory,
            readRequestString(request.itemId, "itemId")
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

async function readCurrentWorkspaceState(
  settingsDirectory: string
): Promise<WorkspaceState> {
  const state = await getCurrentWorkspaceState({ settingsDirectory });

  await rebuildSearchIndexForState(state);

  return state;
}

async function openWorkspaceAndRefreshSearchIndex(
  workspacePath: string,
  settingsDirectory: string
): Promise<WorkspaceState> {
  const state = await openWorkspace(workspacePath, { settingsDirectory });

  await rebuildSearchIndexForState(state);

  return state;
}

async function createWorkspaceAndRefreshSearchIndex(
  workspacePath: string,
  settingsDirectory: string
): Promise<WorkspaceState> {
  const state = await createWorkspace(workspacePath, { settingsDirectory });

  await rebuildSearchIndexForState(state);

  return state;
}

async function rebuildSearchIndexForState(state: WorkspaceState): Promise<void> {
  if (!state.current) {
    stopWatchingWorkspaceFiles();
    return;
  }

  watchWorkspaceFilesForRenderer(state.current.rootPath);

  try {
    await rebuildSearchIndex(state.current.rootPath);
  } catch {
    // Search is derived state. Workspace Markdown remains the source of truth.
  }
}

async function saveConflictCopyForCurrentWorkspace(
  settingsDirectory: string,
  input: ConflictCopyInput
): Promise<ConflictCopyResult> {
  return saveConflictCopy(await requireCurrentWorkspacePath(settingsDirectory), input);
}

async function searchCurrentWorkspace(
  settingsDirectory: string,
  input: SearchQueryInput
): Promise<SearchResult[]> {
  return searchWorkspace(await requireCurrentWorkspacePath(settingsDirectory), input);
}

function watchWorkspaceFilesForRenderer(workspacePath: string): void {
  if (watchedWorkspacePath === workspacePath) {
    return;
  }

  stopWatchingWorkspaceFiles();
  watchedWorkspacePath = workspacePath;
  stopWorkspaceWatcher = watchWorkspaceFiles(workspacePath, (change) => {
    sendExternalFileChange(change);
  });
}

function stopWatchingWorkspaceFiles(): void {
  stopWorkspaceWatcher?.();
  stopWorkspaceWatcher = null;
  watchedWorkspacePath = null;
}

function sendExternalFileChange(change: WorkspaceExternalFileChange): void {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(workspaceExternalFileChangeChannel, change);
  }
}

async function buildPromptPackForCurrentWorkspace(
  settingsDirectory: string,
  input: PromptPackBuildInput
): Promise<PromptPack> {
  return buildPromptPack(await requireCurrentWorkspacePath(settingsDirectory), input);
}

async function savePromptOutputAsLlmNoteForCurrentWorkspace(
  settingsDirectory: string,
  draft: PromptOutputDraft
): Promise<PromptOutputSaveResult> {
  const workspacePath = await requireCurrentWorkspacePath(settingsDirectory);
  const note = await savePromptOutputAsLlmNote(workspacePath, draft);

  return {
    state: await readCurrentWorkspaceState(settingsDirectory),
    note
  };
}

async function readMemoryForCurrentWorkspace(
  settingsDirectory: string
): Promise<MemoryDocument> {
  return readCurrentMemory(await requireCurrentWorkspacePath(settingsDirectory));
}

async function replaceMemoryForCurrentWorkspace(
  settingsDirectory: string,
  draft: MemoryDraft
): Promise<MemoryReplacementIpcResult> {
  const workspacePath = await requireCurrentWorkspacePath(settingsDirectory);
  const result = await replaceMemoryWithDraft(workspacePath, draft);

  return {
    ...result,
    state: await readCurrentWorkspaceState(settingsDirectory)
  };
}

async function readTodayFocusForCurrentWorkspace(
  settingsDirectory: string
): Promise<TodayFocusItem[]> {
  return readTodayFocusItems(await requireCurrentWorkspacePath(settingsDirectory));
}

async function setTodayFocusOverrideForCurrentWorkspace(
  settingsDirectory: string,
  taskId: string,
  action: TodayFocusOverrideAction
): Promise<TodayFocusItem[]> {
  const workspacePath = await requireCurrentWorkspacePath(settingsDirectory);

  await setTodayFocusOverride(workspacePath, taskId, action);

  return readTodayFocusItems(workspacePath);
}

async function readInboxItemsForCurrentWorkspace(
  settingsDirectory: string
): Promise<InboxItem[]> {
  return readInboxItems(await requireCurrentWorkspacePath(settingsDirectory));
}

async function captureInboxItemForCurrentWorkspace(
  settingsDirectory: string,
  input: InboxItemInput
): Promise<InboxMutationResult> {
  const workspacePath = await requireCurrentWorkspacePath(settingsDirectory);
  const item = await captureInboxItem(workspacePath, input);

  return createInboxMutationResult(settingsDirectory, workspacePath, {
    itemId: item.id
  });
}

async function convertInboxItemToProjectForCurrentWorkspace(
  settingsDirectory: string,
  itemId: string
): Promise<InboxMutationResult> {
  const workspacePath = await requireCurrentWorkspacePath(settingsDirectory);
  const project = await convertInboxItemToProject(workspacePath, itemId);

  return createInboxMutationResult(settingsDirectory, workspacePath, {
    itemId,
    projectId: project.id
  });
}

async function convertInboxItemToTaskForCurrentWorkspace(
  settingsDirectory: string,
  itemId: string,
  projectId: string
): Promise<InboxMutationResult> {
  const workspacePath = await requireCurrentWorkspacePath(settingsDirectory);
  const task = await convertInboxItemToTask(workspacePath, itemId, projectId);

  return createInboxMutationResult(settingsDirectory, workspacePath, {
    itemId,
    projectId,
    taskId: task.id
  });
}

async function attachInboxItemToTaskContextForCurrentWorkspace(
  settingsDirectory: string,
  itemId: string,
  projectId: string,
  taskId: string
): Promise<InboxMutationResult> {
  const workspacePath = await requireCurrentWorkspacePath(settingsDirectory);

  await attachInboxItemToTaskContext(workspacePath, itemId, projectId, taskId);

  return createInboxMutationResult(settingsDirectory, workspacePath, {
    itemId,
    projectId,
    taskId
  });
}

async function archiveInboxItemForCurrentWorkspace(
  settingsDirectory: string,
  itemId: string
): Promise<InboxMutationResult> {
  const workspacePath = await requireCurrentWorkspacePath(settingsDirectory);

  await archiveInboxItem(workspacePath, itemId);

  return createInboxMutationResult(settingsDirectory, workspacePath, {
    itemId
  });
}

async function deleteInboxItemForCurrentWorkspace(
  settingsDirectory: string,
  itemId: string
): Promise<InboxMutationResult> {
  const workspacePath = await requireCurrentWorkspacePath(settingsDirectory);

  await deleteInboxItem(workspacePath, itemId);

  return createInboxMutationResult(settingsDirectory, workspacePath, {
    itemId
  });
}

async function createInboxMutationResult(
  settingsDirectory: string,
  workspacePath: string,
  ids: { itemId?: string; projectId?: string; taskId?: string }
): Promise<InboxMutationResult> {
  return {
    state: await readCurrentWorkspaceState(settingsDirectory),
    inboxItems: await readInboxItems(workspacePath),
    itemId: ids.itemId,
    projectId: ids.projectId,
    taskId: ids.taskId
  };
}

async function createProjectForCurrentWorkspace(
  settingsDirectory: string,
  input: ProjectInput
): Promise<WorkspaceMutationResult> {
  const workspacePath = await requireCurrentWorkspacePath(settingsDirectory);
  const project = await createProject(workspacePath, input);

  return {
    state: await readCurrentWorkspaceState(settingsDirectory),
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
    state: await readCurrentWorkspaceState(settingsDirectory),
    projectId
  };
}

async function archiveProjectForCurrentWorkspace(
  settingsDirectory: string,
  projectId: string
): Promise<WorkspaceMutationResult> {
  await archiveProject(await requireCurrentWorkspacePath(settingsDirectory), projectId);

  return {
    state: await readCurrentWorkspaceState(settingsDirectory),
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
    state: await readCurrentWorkspaceState(settingsDirectory),
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
    state: await readCurrentWorkspaceState(settingsDirectory),
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
    state: await readCurrentWorkspaceState(settingsDirectory),
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
    state: await readCurrentWorkspaceState(settingsDirectory),
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

function readTodayFocusOverrideAction(
  value: unknown
): TodayFocusOverrideAction {
  if (value === "pin" || value === "snooze" || value === "hide") {
    return value;
  }

  throw new Error("Workspace request has an invalid Today Focus override action.");
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
      state: await readCurrentWorkspaceState(settingsDirectory)
    };
  }

  return {
    canceled: false,
    state: await openWorkspaceAndRefreshSearchIndex(
      result.filePaths[0],
      settingsDirectory
    )
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
      state: await readCurrentWorkspaceState(settingsDirectory)
    };
  }

  return {
    canceled: false,
    state: await createWorkspaceAndRefreshSearchIndex(
      result.filePaths[0],
      settingsDirectory
    )
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
