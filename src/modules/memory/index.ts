import type { FutureModuleBoundary } from "../../shared/domain";

export const memoryModuleBoundary: FutureModuleBoundary = {
  name: "Memory",
  phase: "phase-1-placeholder",
  status: "not-implemented",
  extendsFrom: "src/modules/memory/index.ts",
  responsibility:
    "Own LLM-consumable Memory viewing, replacement, and archival boundaries in Phase 1."
};
