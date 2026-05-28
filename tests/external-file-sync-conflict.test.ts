import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, sep } from "node:path";
import { test } from "node:test";
import {
  createProject,
  createTask,
  createWorkspace,
  updateTask
} from "../src/modules/workspace";
import {
  createWorkspaceFileSnapshot,
  diffWorkspaceFileSnapshots,
  resolveFileConflict
} from "../src/modules/sync";

async function createWorkspaceFixture() {
  const tempRoot = await mkdtemp(join(tmpdir(), "nierpod-sync-test-"));
  const settingsDirectory = join(tempRoot, "app-user-data");
  const workspacePath = join(tempRoot, "workspace");

  await createWorkspace(workspacePath, { settingsDirectory });

  return {
    workspacePath
  };
}

function toWorkspaceRelativePath(rootPath: string, absolutePath: string): string {
  return relative(rootPath, absolutePath).split(sep).join("/");
}

test("External file sync detects Markdown changes and resolves conflicts without silently overwriting disk", async () => {
  const { workspacePath } = await createWorkspaceFixture();
  const project = await createProject(workspacePath, {
    title: "Conflict safety",
    goal: "Protect external Markdown edits.",
    successCriteria: "- Conflicts are explicit.",
    status: "active",
    deadline: null
  });
  const task = await createTask(workspacePath, project.id, {
    title: "Protect task draft"
  });

  await updateTask(workspacePath, project.id, task.id, {
    context: "Original saved context."
  });

  const before = await createWorkspaceFileSnapshot(workspacePath);
  const externalSource = (await readFile(task.markdownPath, "utf8")).replace(
    "Original saved context.",
    "External editor changed this context."
  );

  await writeFile(task.markdownPath, externalSource, "utf8");

  const after = await createWorkspaceFileSnapshot(workspacePath);
  const changes = diffWorkspaceFileSnapshots(before, after);
  const relativePath = toWorkspaceRelativePath(workspacePath, task.markdownPath);

  assert.ok(
    changes.some(
      (change) =>
        change.relativePath === relativePath && change.kind === "modified"
    )
  );

  const draftSource = "# Draft\n\nUnsaved App draft should not overwrite disk.\n";
  const reload = await resolveFileConflict(workspacePath, {
    relativePath,
    action: "reload_from_disk",
    draftSource
  });
  const keep = await resolveFileConflict(workspacePath, {
    relativePath,
    action: "keep_current_draft",
    draftSource
  });
  const copy = await resolveFileConflict(workspacePath, {
    relativePath,
    action: "save_as_conflict_copy",
    draftSource
  });

  assert.equal(reload.source, externalSource);
  assert.equal(keep.source, draftSource);
  assert.match(copy.relativePath, /^conflicts\/.+protect-task-draft.+\.md$/);
  assert.equal(
    await readFile(join(workspacePath, copy.relativePath), "utf8"),
    draftSource
  );
  assert.equal(await readFile(task.markdownPath, "utf8"), externalSource);
});
