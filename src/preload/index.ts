import { contextBridge, ipcRenderer } from "electron";
import {
  workspaceIpcChannel,
  type IpcResponse,
  type NierPodBridge,
  type ProjectJournalResult,
  type WorkspaceAccessDescription,
  type WorkspaceActionResult,
  type WorkspaceMutationResult,
  type WorkspaceOperation
} from "../shared/ipc";
import type {
  ArtifactInput,
  ProjectInput,
  TaskInput,
  TaskUpdateInput,
  WorkspaceState
} from "../shared/domain";

const invokeWorkspace = <TData>(
  operation: WorkspaceOperation,
  payload: Record<string, unknown> = {}
) =>
  ipcRenderer.invoke(workspaceIpcChannel, {
    operation,
    ...payload
  }) as Promise<IpcResponse<TData>>;

const bridge: NierPodBridge = {
  appName: "NierPod",
  phase: "phase-1",
  workspace: {
    describeAccess: () =>
      invokeWorkspace<WorkspaceAccessDescription>("workspace.describeAccess"),
    getCurrent: () => invokeWorkspace<WorkspaceState>("workspace.getCurrent"),
    selectExisting: () =>
      invokeWorkspace<WorkspaceActionResult>("workspace.selectExisting"),
    createNew: () => invokeWorkspace<WorkspaceActionResult>("workspace.createNew"),
    createProject: (input: ProjectInput) =>
      invokeWorkspace<WorkspaceMutationResult>("workspace.createProject", {
        input
      }),
    updateProject: (projectId: string, input: ProjectInput) =>
      invokeWorkspace<WorkspaceMutationResult>("workspace.updateProject", {
        projectId,
        input
      }),
    archiveProject: (projectId: string) =>
      invokeWorkspace<WorkspaceMutationResult>("workspace.archiveProject", {
        projectId
      }),
    createTask: (projectId: string, input: TaskInput) =>
      invokeWorkspace<WorkspaceMutationResult>("workspace.createTask", {
        projectId,
        input
      }),
    updateTask: (projectId: string, taskId: string, input: TaskUpdateInput) =>
      invokeWorkspace<WorkspaceMutationResult>("workspace.updateTask", {
        projectId,
        taskId,
        input
      }),
    addTaskArtifact: (
      projectId: string,
      taskId: string,
      input: ArtifactInput
    ) =>
      invokeWorkspace<WorkspaceMutationResult>("workspace.addTaskArtifact", {
        projectId,
        taskId,
        input
      }),
    readProjectJournal: (projectId: string) =>
      invokeWorkspace<ProjectJournalResult>("workspace.readProjectJournal", {
        projectId
      }),
    updateProjectJournal: (projectId: string, source: string) =>
      invokeWorkspace<WorkspaceMutationResult>("workspace.updateProjectJournal", {
        projectId,
        source
      })
  }
};

contextBridge.exposeInMainWorld("nierpod", bridge);
