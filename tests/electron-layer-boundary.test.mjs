import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";

const repoRoot = new URL("../", import.meta.url);

async function readProjectFile(pathname) {
  return readFile(new URL(pathname, repoRoot), "utf8");
}

async function collectFiles(directory, extensionPattern) {
  const absoluteDirectory = new URL(directory, repoRoot);
  const entries = await readdir(absoluteDirectory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(`${relativePath}/`, extensionPattern)));
      continue;
    }

    if (extensionPattern.test(entry.name)) {
      files.push(relativePath);
    }
  }

  return files;
}

test("main process registers the allowlisted file capability IPC handler", async () => {
  const mainSource = await readProjectFile("src/main/index.ts");

  assert.match(mainSource, /ipcMain\.handle\(\s*fileIpcChannel/);
  assert.match(mainSource, /resolveFileCapabilityRequest/);
});

test("preload exposes a typed NierPod bridge instead of Electron primitives", async () => {
  const preloadSource = await readProjectFile("src/preload/index.ts");

  assert.match(preloadSource, /contextBridge\.exposeInMainWorld\("nierpod"/);
  assert.match(preloadSource, /workspace/);
  assert.match(preloadSource, /ipcRenderer\.invoke\(fileIpcChannel/);
  assert.doesNotMatch(preloadSource, /exposeInMainWorld\("electron"/);
  assert.doesNotMatch(preloadSource, /exposeInMainWorld\("ipcRenderer"/);
});

test("renderer source does not import Node fs or Electron APIs directly", async () => {
  const rendererFiles = await collectFiles("src/renderer/", /\.(ts|tsx)$/);
  const forbiddenImportPattern =
    /from\s+["'](?:node:fs|fs|node:path|path|electron)["']|require\(["'](?:node:fs|fs|node:path|path|electron)["']\)/;

  for (const file of rendererFiles) {
    const source = await readProjectFile(file);
    assert.doesNotMatch(source, forbiddenImportPattern, file);
  }
});
