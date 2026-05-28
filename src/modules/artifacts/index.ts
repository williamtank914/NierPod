import type { FutureModuleBoundary } from "../../shared/domain";

export const artifactModuleBoundary: FutureModuleBoundary = {
  name: "Artifact registry",
  phase: "phase-1-placeholder",
  status: "not-implemented",
  extendsFrom: "src/modules/artifacts/index.ts",
  responsibility:
    "Own local Markdown and URL artifact records, manifest boundaries, and Task associations in Phase 1."
};
