import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { futureModuleBoundaries } from "../src/modules";

test("Phase 1 module boundaries advertise implemented and placeholder modules", () => {
  const modulesByName = new Map(
    futureModuleBoundaries.map((moduleBoundary) => [
      moduleBoundary.name,
      moduleBoundary
    ])
  );

  const expectedModuleStates = new Map([
    ["Workspace management", { phase: "phase-1", status: "implemented" }],
    [
      "Project domain",
      { phase: "phase-1-placeholder", status: "not-implemented" }
    ],
    ["Task domain", { phase: "phase-1-placeholder", status: "not-implemented" }],
    [
      "Markdown parser",
      { phase: "phase-1", status: "implemented" }
    ],
    ["Search index", { phase: "phase-1-placeholder", status: "not-implemented" }],
    [
      "Prompt Pack workflow",
      { phase: "phase-1-placeholder", status: "not-implemented" }
    ],
    ["Journal", { phase: "phase-1", status: "implemented" }],
    ["Memory", { phase: "phase-1-placeholder", status: "not-implemented" }],
    [
      "Artifact registry",
      { phase: "phase-1", status: "implemented" }
    ]
  ]);

  for (const [name, expected] of expectedModuleStates) {
    const moduleBoundary = modulesByName.get(name);

    assert.ok(moduleBoundary, `${name} boundary is missing`);
    assert.equal(moduleBoundary.phase, expected.phase);
    assert.equal(moduleBoundary.status, expected.status);
    assert.match(moduleBoundary.extendsFrom, /^src\//);
  }
});

test("Phase 0 handoff docs cover verification commands and Phase 1 module entry points", async () => {
  const verification = await readFile(
    new URL("../docs/PHASE_0_VERIFICATION.md", import.meta.url),
    "utf8"
  );
  const moduleMap = await readFile(
    new URL("../docs/PHASE_1_MODULE_MAP.md", import.meta.url),
    "utf8"
  );

  for (const command of [
    "pnpm install --frozen-lockfile",
    "pnpm dev",
    "pnpm build",
    "pnpm typecheck",
    "pnpm lint",
    "pnpm test"
  ]) {
    assert.match(verification, new RegExp(command.replaceAll(" ", "\\s+")));
  }

  assert.match(verification, /NierPod workbench/);
  assert.match(verification, /Task timeline/);
  assert.match(verification, /Task detail/);

  for (const path of [
    "src/modules/workspace/",
    "src/domain/project/",
    "src/domain/task/",
    "src/modules/markdown/",
    "src/modules/search/",
    "src/modules/prompt-pack/",
    "src/modules/journal/",
    "src/modules/memory/",
    "src/modules/artifacts/",
    "src/shared/domain.ts",
    "src/shared/ipc.ts"
  ]) {
    assert.match(moduleMap, new RegExp(path.replaceAll("/", "\\/")));
  }
});
