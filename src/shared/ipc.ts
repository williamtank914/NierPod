import type {
  ArtifactInput,
  InboxItem,
  InboxItemInput,
  MemoryDocument,
  MemoryDraft,
  MemoryReplacementResult,
  ProjectInput,
  PromptOutputDraft,
  PromptPack,
  PromptPackBuildInput,
  SavedLlmNote,
  TaskInput,
  TaskUpdateInput,
  TodayFocusItem,
  TodayFocusOverrideAction,
  WorkspaceState
} from "./domain";

export const workspaceIpcChannel = "nierpod:workspace" as const;

export const workspaceOperations = [
  "workspace.describeAccess",
  "workspace.getCurrent",
  "workspace.selectExisting",
  "workspace.createNew",
  "workspace.createProject",
  "workspace.updateProject",
  "workspace.archiveProject",
  "workspace.createTask",
  "workspace.updateTask",
  "workspace.addTaskArtifact",
  "workspace.readProjectJournal",
  "workspace.updateProjectJournal",
  "workspace.buildPromptPack",
  "workspace.savePromptOutputAsLlmNote",
  "workspace.readMemory",
  "workspace.replaceMemory",
  "workspace.getTodayFocus",
  "workspace.setTodayFocusOverride",
  "workspace.getInboxItems",
  "workspace.captureInboxItem",
  "workspace.convertInboxItemToProject",
  "workspace.convertInboxItemToTask",
  "workspace.attachInboxItemToTaskContext",
  "workspace.archiveInboxItem",
  "workspace.deleteInboxItem"
] as const;

export type WorkspaceOperation = (typeof workspaceOperations)[number];

export type IpcErrorCode =
  | "invalid_request"
  | "operation_not_allowed"
  | "internal_error";

export type IpcError = {
  code: IpcErrorCode;
  message: string;
  details?: Record<string, unknown>;
};

export type IpcSuccess<TData> = {
  ok: true;
  data: TData;
};

export type IpcFailure = {
  ok: false;
  error: IpcError;
};

export type IpcResponse<TData> = IpcSuccess<TData> | IpcFailure;

export type WorkspaceAccessDescription = {
  phase: "phase-1";
  canReadFiles: true;
  canWriteFiles: true;
  message: string;
};

export type WorkspaceActionResult = {
  canceled: boolean;
  state: WorkspaceState;
};

export type WorkspaceMutationResult = {
  state: WorkspaceState;
  projectId?: string;
  taskId?: string;
  artifactId?: string;
};

export type InboxMutationResult = WorkspaceMutationResult & {
  itemId?: string;
  inboxItems: InboxItem[];
};

export type ProjectJournalResult = {
  source: string;
};

export type PromptOutputSaveResult = {
  state: WorkspaceState;
  note: SavedLlmNote;
};

export type MemoryReplacementIpcResult = MemoryReplacementResult & {
  state: WorkspaceState;
};

export type WorkspaceIpcRequest = {
  operation: WorkspaceOperation;
};

export type UnknownWorkspaceIpcRequest = {
  operation?: unknown;
  [key: string]: unknown;
};

export type NierPodBridge = {
  appName: "NierPod";
  phase: "phase-1";
  workspace: {
    describeAccess: () => Promise<IpcResponse<WorkspaceAccessDescription>>;
    getCurrent: () => Promise<IpcResponse<WorkspaceState>>;
    selectExisting: () => Promise<IpcResponse<WorkspaceActionResult>>;
    createNew: () => Promise<IpcResponse<WorkspaceActionResult>>;
    createProject: (
      input: ProjectInput
    ) => Promise<IpcResponse<WorkspaceMutationResult>>;
    updateProject: (
      projectId: string,
      input: ProjectInput
    ) => Promise<IpcResponse<WorkspaceMutationResult>>;
    archiveProject: (
      projectId: string
    ) => Promise<IpcResponse<WorkspaceMutationResult>>;
    createTask: (
      projectId: string,
      input: TaskInput
    ) => Promise<IpcResponse<WorkspaceMutationResult>>;
    updateTask: (
      projectId: string,
      taskId: string,
      input: TaskUpdateInput
    ) => Promise<IpcResponse<WorkspaceMutationResult>>;
    addTaskArtifact: (
      projectId: string,
      taskId: string,
      input: ArtifactInput
    ) => Promise<IpcResponse<WorkspaceMutationResult>>;
    readProjectJournal: (
      projectId: string
    ) => Promise<IpcResponse<ProjectJournalResult>>;
    updateProjectJournal: (
      projectId: string,
      source: string
    ) => Promise<IpcResponse<WorkspaceMutationResult>>;
    buildPromptPack: (
      input: PromptPackBuildInput
    ) => Promise<IpcResponse<PromptPack>>;
    savePromptOutputAsLlmNote: (
      draft: PromptOutputDraft
    ) => Promise<IpcResponse<PromptOutputSaveResult>>;
    readMemory: () => Promise<IpcResponse<MemoryDocument>>;
    replaceMemory: (
      draft: MemoryDraft
    ) => Promise<IpcResponse<MemoryReplacementIpcResult>>;
    getTodayFocus: () => Promise<IpcResponse<TodayFocusItem[]>>;
    setTodayFocusOverride: (
      taskId: string,
      action: TodayFocusOverrideAction
    ) => Promise<IpcResponse<TodayFocusItem[]>>;
    getInboxItems: () => Promise<IpcResponse<InboxItem[]>>;
    captureInboxItem: (
      input: InboxItemInput
    ) => Promise<IpcResponse<InboxMutationResult>>;
    convertInboxItemToProject: (
      itemId: string
    ) => Promise<IpcResponse<InboxMutationResult>>;
    convertInboxItemToTask: (
      itemId: string,
      projectId: string
    ) => Promise<IpcResponse<InboxMutationResult>>;
    attachInboxItemToTaskContext: (
      itemId: string,
      projectId: string,
      taskId: string
    ) => Promise<IpcResponse<InboxMutationResult>>;
    archiveInboxItem: (
      itemId: string
    ) => Promise<IpcResponse<InboxMutationResult>>;
    deleteInboxItem: (
      itemId: string
    ) => Promise<IpcResponse<InboxMutationResult>>;
  };
};

export function isAllowedWorkspaceOperation(
  operation: unknown
): operation is WorkspaceOperation {
  return workspaceOperations.includes(operation as WorkspaceOperation);
}

export function createWorkspaceAccessDescription(): WorkspaceAccessDescription {
  return {
    phase: "phase-1",
    canReadFiles: true,
    canWriteFiles: true,
    message:
      "Workspace files are available only through allowlisted main-process IPC. Markdown files in the selected workspace are the source of truth."
  };
}

export function createWorkspaceOperationNotAllowedResponse(
  request: UnknownWorkspaceIpcRequest
): IpcFailure {
  return {
    ok: false,
    error: {
      code: "operation_not_allowed",
      message:
        "This workspace operation is not allowlisted. Renderer code must use the typed NierPod bridge instead of direct file-system access.",
      details: {
        operation: request.operation ?? null
      }
    }
  };
}
