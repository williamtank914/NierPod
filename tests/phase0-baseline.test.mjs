import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { test } from "node:test";

const repoRoot = new URL("../", import.meta.url);

async function readJson(pathname) {
  return JSON.parse(await readFile(new URL(pathname, repoRoot), "utf8"));
}

test("Phase 0 exposes a stable developer command surface", async () => {
  const packageJson = await readJson("package.json");

  assert.match(packageJson.packageManager, /^pnpm@\d+\.\d+\.\d+$/);
  assert.equal(typeof packageJson.scripts.dev, "string");
  assert.equal(typeof packageJson.scripts.build, "string");
  assert.equal(typeof packageJson.scripts.typecheck, "string");
  assert.equal(typeof packageJson.scripts.lint, "string");

  await access(new URL("pnpm-lock.yaml", repoRoot));
});

test("Phase 0 developer notes document install, launch, and verification commands", async () => {
  const readme = await readFile(new URL("README.md", repoRoot), "utf8");

  assert.match(readme, /pnpm install/);
  assert.match(readme, /pnpm dev/);
  assert.match(readme, /pnpm build/);
  assert.match(readme, /pnpm typecheck/);
  assert.match(readme, /pnpm lint/);
});
