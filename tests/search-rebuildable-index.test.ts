import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  addTaskArtifact,
  captureInboxItem,
  createProject,
  createTask,
  createWorkspace,
  updateTask
} from "../src/modules/workspace";
import {
  buildPromptPack,
  createPromptOutputDraft,
  savePromptOutputAsLlmNote
} from "../src/modules/prompt-pack";
import {
  getSearchIndexPath,
  rebuildSearchIndex,
  searchWorkspace
} from "../src/modules/search";

async function createWorkspaceFixture() {
  const tempRoot = await mkdtemp(join(tmpdir(), "nierpod-search-test-"));
  const settingsDirectory = join(tempRoot, "app-user-data");
  const workspacePath = join(tempRoot, "workspace");

  await createWorkspace(workspacePath, { settingsDirectory });

  return {
    workspacePath
  };
}

test("Search index rebuilds from Markdown across Projects, Tasks, Inbox, artifacts, and LLM notes", async () => {
  const { workspacePath } = await createWorkspaceFixture();
  const project = await createProject(workspacePath, {
    title: "NierPod Search",
    goal: "Find task evidence from Markdown source.",
    successCriteria: "- Search result jump target is clear.",
    status: "active",
    deadline: "2026-06-30"
  });
  const task = await createTask(workspacePath, project.id, {
    title: "Build rebuildable index"
  });

  await updateTask(workspacePath, project.id, task.id, {
    status: "ready",
    priority: "p0",
    context: "Index external Markdown edits without losing source truth.",
    todos: [{ text: "Search task checklist needle", completed: false }],
    progress: "Search should include recent progress snippets.",
    acceptanceCriteria: "- Search result jump target is clear."
  });
  const artifact = await addTaskArtifact(workspacePath, project.id, task.id, {
    type: "markdown",
    title: "Search QA Report",
    markdownContent: "The rebuildable index recovery evidence lives here."
  });

  await captureInboxItem(workspacePath, {
    text: "Search inbox capture needle"
  });

  const pack = await buildPromptPack(workspacePath, {
    intent: "review_risks",
    projectId: project.id,
    taskId: task.id
  });
  const draft = createPromptOutputDraft({
    intent: "review_risks",
    projectId: project.id,
    taskId: task.id,
    promptMarkdown: pack.promptMarkdown,
    outputMarkdown: "The saved LLM note search needle is advisory."
  });

  await savePromptOutputAsLlmNote(workspacePath, draft);

  const summary = await rebuildSearchIndex(workspacePath);

  assert.equal(summary.relativePath, ".nierpod/search-index.json");
  assert.ok(summary.entryCount >= 5);

  const projectResults = await searchWorkspace(workspacePath, {
    query: "Find task evidence"
  });
  const projectResult = projectResults.find(
    (result) =>
      result.target.kind === "project" &&
      result.target.projectId === project.id
  );

  assert.equal(projectResult?.target.kind, "project");

  const taskResults = await searchWorkspace(workspacePath, {
    query: "Search task checklist needle"
  });

  assert.equal(taskResults[0]?.target.kind, "task");
  assert.equal(taskResults[0]?.target.taskId, task.id);

  const artifactResults = await searchWorkspace(workspacePath, {
    query: "rebuildable index recovery evidence"
  });

  assert.equal(artifactResults[0]?.target.kind, "artifact");
  assert.equal(artifactResults[0]?.target.projectId, project.id);
  assert.equal(artifactResults[0]?.target.taskId, task.id);
  assert.equal(artifactResults[0]?.target.artifactId, artifact.id);

  const inboxResults = await searchWorkspace(workspacePath, {
    query: "Search inbox capture needle"
  });

  assert.equal(inboxResults[0]?.target.kind, "inbox");

  const noteResults = await searchWorkspace(workspacePath, {
    query: "saved LLM note search needle"
  });

  assert.equal(noteResults[0]?.target.kind, "llm-note");
  assert.equal(noteResults[0]?.target.projectId, project.id);
  assert.equal(noteResults[0]?.target.taskId, task.id);
});

test("Search index updates after Markdown changes and recovers from damaged derived state", async () => {
  const { workspacePath } = await createWorkspaceFixture();
  const project = await createProject(workspacePath, {
    title: "Index recovery",
    goal: "Recover from damaged derived state.",
    successCriteria: "- Markdown remains the source of truth.",
    status: "active",
    deadline: null
  });
  const task = await createTask(workspacePath, project.id, {
    title: "Update search after edit"
  });

  await updateTask(workspacePath, project.id, task.id, {
    context: "Original searchable context."
  });
  await rebuildSearchIndex(workspacePath);
  await updateTask(workspacePath, project.id, task.id, {
    context: "Fresh searchable context after external-style edit."
  });
  await writeFile(getSearchIndexPath(workspacePath), "{ damaged", "utf8");

  const results = await searchWorkspace(workspacePath, {
    query: "Fresh searchable context"
  });
  const rebuiltIndex = JSON.parse(
    await readFile(getSearchIndexPath(workspacePath), "utf8")
  ) as { version?: unknown; entries?: unknown[] };

  assert.equal(results[0]?.target.kind, "task");
  assert.equal(results[0]?.target.taskId, task.id);
  assert.equal(rebuiltIndex.version, 1);
  assert.ok(Array.isArray(rebuiltIndex.entries));
});
