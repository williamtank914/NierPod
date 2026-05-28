import type { FutureModuleBoundary } from "../../shared/domain";

export const markdownModuleBoundary: FutureModuleBoundary = {
  name: "Markdown parser",
  phase: "phase-1-placeholder",
  status: "not-implemented",
  extendsFrom: "src/modules/markdown/index.ts",
  responsibility:
    "Own Markdown parsing and serialization for workspace source-of-truth files in Phase 1."
};
