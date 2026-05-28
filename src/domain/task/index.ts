import type { FutureModuleBoundary } from "../../shared/domain";

export const taskDomainBoundary: FutureModuleBoundary = {
  name: "Task domain",
  phase: "phase-1-placeholder",
  status: "not-implemented",
  extendsFrom: "src/domain/task/index.ts",
  responsibility:
    "Own Task identity, status, priority, lane, dependencies, and detail section rules in Phase 1."
};
