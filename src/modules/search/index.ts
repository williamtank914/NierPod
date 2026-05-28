import type { FutureModuleBoundary } from "../../shared/domain";

export const searchModuleBoundary: FutureModuleBoundary = {
  name: "Search index",
  phase: "phase-1-placeholder",
  status: "not-implemented",
  extendsFrom: "src/modules/search/index.ts",
  responsibility:
    "Own rebuildable SQLite or equivalent local search index behavior in Phase 1."
};
