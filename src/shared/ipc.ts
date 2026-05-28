export const fileIpcChannel = "nierpod:file-capability" as const;

export const fileCapabilityOperations = ["workspace.describeAccess"] as const;

export type FileCapabilityOperation = (typeof fileCapabilityOperations)[number];

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
  phase: "phase-0";
  canReadFiles: false;
  canWriteFiles: false;
  message: string;
};

export type FileCapabilityRequest = {
  operation: FileCapabilityOperation;
};

export type UnknownFileCapabilityRequest = {
  operation?: unknown;
  [key: string]: unknown;
};

export type NierPodBridge = {
  appName: "NierPod";
  phase: "phase-0";
  workspace: {
    describeAccess: () => Promise<IpcResponse<WorkspaceAccessDescription>>;
  };
};

export function isAllowedFileOperation(
  operation: unknown
): operation is FileCapabilityOperation {
  return fileCapabilityOperations.includes(operation as FileCapabilityOperation);
}

export function resolveFileCapabilityRequest(
  request: UnknownFileCapabilityRequest
): IpcResponse<WorkspaceAccessDescription> {
  if (!isAllowedFileOperation(request.operation)) {
    return {
      ok: false,
      error: {
        code: "operation_not_allowed",
        message:
          "This file operation is not available in Phase 0. Workspace file access must go through an allowlisted main-process capability.",
        details: {
          operation: request.operation ?? null
        }
      }
    };
  }

  return {
    ok: true,
    data: {
      phase: "phase-0",
      canReadFiles: false,
      canWriteFiles: false,
      message:
        "Workspace file access is defined as a main-process IPC boundary, but Phase 0 does not read or write workspace files."
    }
  };
}
