import { contextBridge, ipcRenderer } from "electron";
import {
  fileIpcChannel,
  type NierPodBridge,
  type WorkspaceAccessDescription,
  type IpcResponse
} from "../shared/ipc";

const phase0Bridge: NierPodBridge = {
  appName: "NierPod",
  phase: "phase-0",
  workspace: {
    describeAccess: () =>
      ipcRenderer.invoke(fileIpcChannel, {
        operation: "workspace.describeAccess"
      }) as Promise<IpcResponse<WorkspaceAccessDescription>>
  }
};

contextBridge.exposeInMainWorld("nierpod", phase0Bridge);
