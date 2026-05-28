import type { FutureModuleBoundary } from "../../shared/domain";

export const journalModuleBoundary: FutureModuleBoundary = {
  name: "Journal",
  phase: "phase-1-placeholder",
  status: "not-implemented",
  extendsFrom: "src/modules/journal/index.ts",
  responsibility:
    "Own append-oriented Project and Task event history behavior in Phase 1."
};
