import type { FutureModuleBoundary } from "../../shared/domain";

export const projectDomainBoundary: FutureModuleBoundary = {
  name: "Project domain",
  phase: "phase-1-placeholder",
  status: "not-implemented",
  extendsFrom: "src/domain/project/index.ts",
  responsibility:
    "Own Project identity, metadata, lifecycle, success criteria, and task ordering rules in Phase 1."
};
