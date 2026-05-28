import type { FutureModuleBoundary } from "../../shared/domain";

export const workspaceModuleBoundary: FutureModuleBoundary = {
  name: "Workspace management",
  phase: "phase-1-placeholder",
  status: "not-implemented",
  extendsFrom: "src/modules/workspace/index.ts",
  responsibility:
    "Own workspace selection, scanning, and local-first file access orchestration in Phase 1."
};
