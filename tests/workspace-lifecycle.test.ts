import assert from "node:assert/strict";
import { mkdir, mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  createWorkspace,
  getCurrentWorkspaceState,
  getRequiredWorkspaceMarkdownFiles,
  getWorkspaceSettingsPath,
  openWorkspace,
  readWorkspaceSettings,
  workspaceSettingsFilename
} from "../src/modules/workspace";

async function createTempRoot() {
  return mkdtemp(join(tmpdir(), "nierpod-workspace-test-"));
}

async function collectRelativeFiles(rootPath: string): Promise<string[]> {
  const files: string[] = [];

  async function visit(directory: string, prefix = ""): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      const absolutePath = join(directory, entry.name);

      if (entry.isDirectory()) {
        await visit(absolutePath, relativePath);
        continue;
      }

      files.push(relativePath);
    }
  }

  await visit(rootPath);
  return files.sort();
}

test("creating a workspace writes the Phase 1 Markdown source structure", async () => {
  const tempRoot = await createTempRoot();
  const settingsDirectory = join(tempRoot, "app-user-data");
  const workspacePath = join(tempRoot, "dogfood");

  const state = await createWorkspace(workspacePath, { settingsDirectory });

  assert.equal(state.phase, "phase-1");
  assert.equal(state.current?.rootPath, workspacePath);
  assert.equal(state.current?.source, "markdown");
  assert.deepEqual(
    state.current?.requiredFiles,
    getRequiredWorkspaceMarkdownFiles()
  );

  const workspaceFiles = await collectRelativeFiles(workspacePath);
  assert.deepEqual(workspaceFiles, getRequiredWorkspaceMarkdownFiles().sort());

  for (const relativePath of workspaceFiles) {
    assert.match(relativePath, /\.md$/);
    assert.match(await readFile(join(workspacePath, relativePath), "utf8"), /^# /m);
  }
});

test("opening a workspace rebuilds state from Markdown and stores settings outside it", async () => {
  const tempRoot = await createTempRoot();
  const settingsDirectory = join(tempRoot, "app-user-data");
  const workspacePath = join(tempRoot, "portable-workspace");

  await createWorkspace(workspacePath, { settingsDirectory });
  await mkdir(join(workspacePath, "projects", "project-nierpod"), {
    recursive: true
  });
  await writeFile(
    join(workspacePath, "projects", "project-nierpod", "project.md"),
    `---
id: project-nierpod
title: NierPod
status: active
deadline:
task_order:
---
# NierPod

## Goal

Dogfood the local-first workspace.

## Success Criteria

- Workspace state is rebuilt from Project Markdown.

## Task Order
`,
    "utf8"
  );

  const reopened = await openWorkspace(workspacePath, { settingsDirectory });

  assert.equal(reopened.current?.title, "portable-workspace");
  assert.equal(reopened.current?.projectCount, 1);
  assert.ok(
    reopened.current?.markdownFiles.some(
      (markdownFile) =>
        markdownFile.relativePath === "projects/project-nierpod/project.md" &&
        markdownFile.title === "NierPod"
    )
  );

  const settings = await readWorkspaceSettings(settingsDirectory);
  assert.equal(settings.lastWorkspacePath, workspacePath);
  assert.equal(
    getWorkspaceSettingsPath(settingsDirectory),
    join(settingsDirectory, workspaceSettingsFilename)
  );

  const workspaceFiles = await collectRelativeFiles(workspacePath);
  assert.equal(workspaceFiles.includes(workspaceSettingsFilename), false);
  assert.ok(
    workspaceFiles.every((relativePath) => relativePath.endsWith(".md")),
    "workspace content remains human-readable Markdown in this slice"
  );
});

test("app restart restores the last workspace from Markdown settings", async () => {
  const tempRoot = await createTempRoot();
  const settingsDirectory = join(tempRoot, "app-user-data");
  const workspacePath = join(tempRoot, "restart-workspace");

  await createWorkspace(workspacePath, { settingsDirectory });
  await writeFile(
    join(workspacePath, "inbox.md"),
    `# Inbox

- [ ] Restore this item after restart.
`,
    "utf8"
  );

  const restored = await getCurrentWorkspaceState({ settingsDirectory });

  assert.equal(restored.current?.rootPath, workspacePath);
  assert.equal(restored.current?.title, "restart-workspace");
  assert.ok(
    restored.current?.markdownFiles.some(
      (markdownFile) =>
        markdownFile.relativePath === "inbox.md" &&
        markdownFile.title === "Inbox"
    )
  );
  assert.match(restored.message, /rebuilt from Markdown/);
});
