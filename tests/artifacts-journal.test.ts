import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import {
  addTaskArtifact,
  createProject,
  createTask,
  createWorkspace,
  readProjectJournal,
  readWorkspaceModel,
  updateProjectJournal,
  updateTask
} from "../src/modules/workspace";

async function createWorkspaceFixture() {
  const tempRoot = await mkdtemp(join(tmpdir(), "nierpod-artifacts-test-"));
  const settingsDirectory = join(tempRoot, "app-user-data");
  const workspacePath = join(tempRoot, "workspace");

  await createWorkspace(workspacePath, { settingsDirectory });

  return {
    workspacePath
  };
}

test("Markdown artifact records round-trip through the Task association manifest", async () => {
  const { workspacePath } = await createWorkspaceFixture();
  const project = await createProject(workspacePath, {
    title: "NierPod",
    goal: "Ship Phase 1",
    successCriteria: "- Artifacts survive restart.",
    status: "active",
    deadline: null
  });
  const task = await createTask(workspacePath, project.id, {
    title: "Write artifact workflow"
  });

  const artifact = await addTaskArtifact(workspacePath, project.id, task.id, {
    type: "markdown",
    title: "PRD v1",
    markdownContent: "# PRD v1\n\nArtifact content."
  });

  assert.equal(artifact.type, "markdown");
  assert.equal(artifact.title, "PRD v1");
  assert.equal(artifact.taskId, task.id);
  assert.ok(artifact.path?.endsWith(".md"));
  assert.equal(artifact.url, null);

  const artifactDirectory = join(dirname(project.markdownPath), "artifacts");
  const manifest = JSON.parse(
    await readFile(join(artifactDirectory, "artifact-manifest.json"), "utf8")
  ) as {
    artifacts: Array<{
      id: string;
      title: string;
      type: string;
      path: string | null;
      url: string | null;
      task_id: string;
      created_at: string;
    }>;
  };

  assert.deepEqual(
    manifest.artifacts.map((entry) => ({
      id: entry.id,
      title: entry.title,
      type: entry.type,
      path: entry.path,
      url: entry.url,
      taskId: entry.task_id
    })),
    [
      {
        id: artifact.id,
        title: "PRD v1",
        type: "markdown",
        path: artifact.path,
        url: null,
        taskId: task.id
      }
    ]
  );
  assert.match(
    await readFile(join(artifactDirectory, artifact.path ?? ""), "utf8"),
    /Artifact content/
  );
  assert.match(await readFile(task.markdownPath, "utf8"), /## Artifacts/);
  assert.match(await readFile(task.markdownPath, "utf8"), /PRD v1/);

  const reloaded = await readWorkspaceModel(workspacePath);
  const reloadedTask = reloaded.projects[0]?.tasks.find(
    (candidate) => candidate.id === task.id
  );

  assert.deepEqual(
    reloadedTask?.artifacts.map((entry) => ({
      id: entry.id,
      title: entry.title,
      type: entry.type,
      path: entry.path,
      taskId: entry.taskId
    })),
    [
      {
        id: artifact.id,
        title: "PRD v1",
        type: "markdown",
        path: artifact.path,
        taskId: task.id
      }
    ]
  );
});

test("URL artifact records round-trip without creating local artifact files", async () => {
  const { workspacePath } = await createWorkspaceFixture();
  const project = await createProject(workspacePath, {
    title: "NierPod",
    goal: "Ship Phase 1",
    successCriteria: "- URL artifacts survive restart.",
    status: "active",
    deadline: null
  });
  const task = await createTask(workspacePath, project.id, {
    title: "Collect references"
  });

  const artifact = await addTaskArtifact(workspacePath, project.id, task.id, {
    type: "url",
    title: "Design reference",
    url: "https://example.com/reference"
  });

  assert.equal(artifact.type, "url");
  assert.equal(artifact.path, null);
  assert.equal(artifact.url, "https://example.com/reference");

  const reloaded = await readWorkspaceModel(workspacePath);
  const reloadedTask = reloaded.projects[0]?.tasks.find(
    (candidate) => candidate.id === task.id
  );

  assert.deepEqual(
    reloadedTask?.artifacts.map((entry) => ({
      title: entry.title,
      type: entry.type,
      path: entry.path,
      url: entry.url,
      taskId: entry.taskId
    })),
    [
      {
        title: "Design reference",
        type: "url",
        path: null,
        url: "https://example.com/reference",
        taskId: task.id
      }
    ]
  );
});

test("Project Journal appends granular Task and artifact events", async () => {
  const { workspacePath } = await createWorkspaceFixture();
  const project = await createProject(workspacePath, {
    title: "NierPod",
    goal: "Ship Phase 1",
    successCriteria: "- Journal captures meaningful changes.",
    status: "active",
    deadline: null
  });
  const task = await createTask(workspacePath, project.id, {
    title: "Record execution history"
  });

  await updateTask(workspacePath, project.id, task.id, {
    status: "in_progress"
  });
  await updateTask(workspacePath, project.id, task.id, {
    priority: "p0"
  });
  await updateTask(workspacePath, project.id, task.id, {
    acceptanceCriteria: "- Journal names acceptance criteria changes."
  });
  await updateTask(workspacePath, project.id, task.id, {
    status: "done"
  });
  await addTaskArtifact(workspacePath, project.id, task.id, {
    type: "url",
    title: "Final demo",
    url: "https://example.com/demo"
  });

  const journal = await readProjectJournal(workspacePath, project.id);

  assert.match(journal, /^# Journal/m);
  assert.match(journal, /Project created: NierPod \(project-/);
  assert.match(journal, /Task created: Record execution history \(task-/);
  assert.match(
    journal,
    /Task status changed: Record execution history \(task-.*\) backlog -> in_progress/
  );
  assert.match(
    journal,
    /Task priority changed: Record execution history \(task-.*\) p2 -> p0/
  );
  assert.match(
    journal,
    /Acceptance Criteria changed: Record execution history \(task-/
  );
  assert.match(journal, /Task completed: Record execution history \(task-/);
  assert.match(journal, /Artifact added: Final demo \(artifact-/);
});

test("Project Journal user edits are preserved when later events append", async () => {
  const { workspacePath } = await createWorkspaceFixture();
  const project = await createProject(workspacePath, {
    title: "NierPod",
    goal: "Ship Phase 1",
    successCriteria: "- Journal edits survive automatic appends.",
    status: "active",
    deadline: null
  });
  const task = await createTask(workspacePath, project.id, {
    title: "Keep a journal"
  });
  const currentJournal = await readProjectJournal(workspacePath, project.id);

  await updateProjectJournal(
    workspacePath,
    project.id,
    `${currentJournal.trimEnd()}

## User Notes

Manual journal note.
`
  );
  await addTaskArtifact(workspacePath, project.id, task.id, {
    type: "url",
    title: "Demo link",
    url: "https://example.com/demo"
  });

  const journal = await readProjectJournal(workspacePath, project.id);

  assert.match(journal, /## User Notes\n\nManual journal note\./);
  assert.match(journal, /Artifact added: Demo link \(artifact-/);
});
