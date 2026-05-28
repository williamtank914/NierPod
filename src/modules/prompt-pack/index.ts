import type { FutureModuleBoundary } from "../../shared/domain";

export const promptPackModuleBoundary: FutureModuleBoundary = {
  name: "Prompt Pack workflow",
  phase: "phase-1-placeholder",
  status: "not-implemented",
  extendsFrom: "src/modules/prompt-pack/index.ts",
  responsibility:
    "Own manual Prompt Pack assembly, copy workflow, and paste-back entry points in Phase 1."
};
