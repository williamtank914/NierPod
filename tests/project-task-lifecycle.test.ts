import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  archiveProject,
  createProject,
  createTask,
  createWorkspace,
  readWorkspaceModel,
  updateProject,
  updateTask
} from "../src/modules/workspace";

async function createWorkspaceFixture() {
  const tempRoot = await mkdtemp(join(tmpdir(), "nierpod-project-test-"));
  const settingsDirectory = join(tempRoot, "app-user-data");
  const workspacePath = join(tempRoot, "workspace");

  await createWorkspace(workspacePath, { settingsDirectory });

  return {
    settingsDirectory,
    workspacePath
  };
}

test("Project Markdown round-trips through the workspace public API", async () => {
  const { workspacePath } = await createWorkspaceFixture();

  const project = await createProject(workspacePath, {
    title: "NierPod",
    goal: "Dogfood a local-first project workspace.",
    successCriteria: "- Seven-day dogfood run is tracked.",
    status: "active",
    deadline: "2026-06-30"
  });

  const projectMarkdown = await readFile(project.markdownPath, "utf8");
  assert.match(projectMarkdown, /^# NierPod/m);
  assert.match(projectMarkdown, /status: active/);
  assert.match(projectMarkdown, /## Goal/);
  assert.match(projectMarkdown, /## Success Criteria/);

  const reloaded = await readWorkspaceModel(workspacePath);

  assert.equal(reloaded.projects.length, 1);
  assert.equal(reloaded.projects[0]?.id, project.id);
  assert.equal(reloaded.projects[0]?.title, "NierPod");
  assert.equal(
    reloaded.projects[0]?.goal,
    "Dogfood a local-first project workspace."
  );
  assert.equal(
    reloaded.projects[0]?.successCriteria,
    "- Seven-day dogfood run is tracked."
  );
  assert.equal(reloaded.projects[0]?.status, "active");
  assert.equal(reloaded.projects[0]?.deadline, "2026-06-30");
});

test("Project lifecycle edits and archives Project Markdown", async () => {
  const { workspacePath } = await createWorkspaceFixture();
  const project = await createProject(workspacePath, {
    title: "Draft",
    goal: "Initial goal",
    successCriteria: "Initial criteria",
    status: "active",
    deadline: null
  });

  const updated = await updateProject(workspacePath, project.id, {
    title: "NierPod Phase 1",
    goal: "Use NierPod to manage NierPod development.",
    successCriteria: "- Project timeline is recoverable after restart.",
    status: "active",
    deadline: "2026-07-15"
  });

  assert.equal(updated.title, "NierPod Phase 1");
  assert.equal(updated.deadline, "2026-07-15");

  await archiveProject(workspacePath, project.id);
  const reloaded = await readWorkspaceModel(workspacePath);

  assert.equal(reloaded.projects[0]?.status, "archived");
  assert.equal(reloaded.activeProjects.length, 0);

  const archivedMarkdown = await readFile(project.markdownPath, "utf8");
  assert.match(archivedMarkdown, /^# NierPod Phase 1/m);
  assert.match(archivedMarkdown, /status: archived/);
});

test("Project task timeline is persisted by Project Markdown task order", async () => {
  const { workspacePath } = await createWorkspaceFixture();
  const project = await createProject(workspacePath, {
    title: "NierPod",
    goal: "Ship Phase 1",
    successCriteria: "- Timeline survives restart.",
    status: "active",
    deadline: null
  });

  const firstTask = await createTask(workspacePath, project.id, {
    title: "Create workspace lifecycle"
  });
  const secondTask = await createTask(workspacePath, project.id, {
    title: "Build task detail editor"
  });

  const reloaded = await readWorkspaceModel(workspacePath);
  const reloadedProject = reloaded.projects.find(
    (candidate) => candidate.id === project.id
  );

  assert.deepEqual(reloadedProject?.taskOrder, [firstTask.id, secondTask.id]);
  assert.deepEqual(
    reloadedProject?.tasks.map((task) => task.title),
    ["Create workspace lifecycle", "Build task detail editor"]
  );

  const projectMarkdown = await readFile(project.markdownPath, "utf8");
  assert.match(projectMarkdown, new RegExp(`task_order: ${firstTask.id}, ${secondTask.id}`));
  assert.match(projectMarkdown, new RegExp(`- ${firstTask.id}`));
  assert.match(projectMarkdown, new RegExp(`- ${secondTask.id}`));
});

test("Task detail round-trips fields and only explicit status can mark done", async () => {
  const { workspacePath } = await createWorkspaceFixture();
  const project = await createProject(workspacePath, {
    title: "NierPod",
    goal: "Ship Phase 1",
    successCriteria: "- Task detail survives restart.",
    status: "active",
    deadline: null
  });
  const dependency = await createTask(workspacePath, project.id, {
    title: "Define workspace lifecycle"
  });
  const task = await createTask(workspacePath, project.id, {
    title: "Build task detail editor"
  });

  assert.ok(task.markdownPath.endsWith(`${task.id}.md`));

  await updateTask(workspacePath, project.id, task.id, {
    title: "Build structured Task detail editor",
    status: "in_progress",
    priority: "p0",
    lane: "parallel",
    dueDate: "2026-07-20",
    dependencies: [dependency.id],
    context: "Renderer edits are saved through the workspace bridge.",
    todos: [
      { text: "Edit structured fields", completed: true },
      { text: "Persist Markdown sections", completed: true }
    ],
    progress: "Task detail fields are wired.",
    acceptanceCriteria: "- Checklist completion does not imply Task done."
  });

  const reloaded = await readWorkspaceModel(workspacePath);
  const reloadedTask = reloaded.projects
    .find((candidate) => candidate.id === project.id)
    ?.tasks.find((candidate) => candidate.id === task.id);

  assert.equal(reloadedTask?.title, "Build structured Task detail editor");
  assert.equal(reloadedTask?.status, "in_progress");
  assert.equal(reloadedTask?.priority, "p0");
  assert.equal(reloadedTask?.lane, "parallel");
  assert.equal(reloadedTask?.dueDate, "2026-07-20");
  assert.deepEqual(reloadedTask?.dependencies, [dependency.id]);
  assert.equal(
    reloadedTask?.context,
    "Renderer edits are saved through the workspace bridge."
  );
  assert.deepEqual(
    reloadedTask?.todos.map((todo) => ({
      text: todo.text,
      completed: todo.completed
    })),
    [
      { text: "Edit structured fields", completed: true },
      { text: "Persist Markdown sections", completed: true }
    ]
  );
  assert.equal(reloadedTask?.status, "in_progress");

  const completed = await updateTask(workspacePath, project.id, task.id, {
    status: "done"
  });

  assert.equal(completed.status, "done");
});

test("Project and Task lifecycle appends human-readable Journal hooks", async () => {
  const { workspacePath } = await createWorkspaceFixture();
  const project = await createProject(workspacePath, {
    title: "NierPod",
    goal: "Ship Phase 1",
    successCriteria: "- Journal captures lifecycle events.",
    status: "active",
    deadline: null
  });

  await updateProject(workspacePath, project.id, {
    title: "NierPod Phase 1",
    goal: "Ship Phase 1",
    successCriteria: "- Journal captures lifecycle events.",
    status: "active",
    deadline: null
  });
  const task = await createTask(workspacePath, project.id, {
    title: "Build task detail editor"
  });
  await updateTask(workspacePath, project.id, task.id, {
    status: "in_progress"
  });
  await archiveProject(workspacePath, project.id);

  const journal = await readFile(join(workspacePath, "journal.md"), "utf8");

  assert.match(journal, /Project created: NierPod \(project-/);
  assert.match(journal, /Project updated: NierPod Phase 1 \(project-/);
  assert.match(journal, /Task created: Build task detail editor \(task-/);
  assert.match(journal, /Task updated: Build task detail editor \(task-/);
  assert.match(journal, /Project archived: NierPod Phase 1 \(project-/);
});
