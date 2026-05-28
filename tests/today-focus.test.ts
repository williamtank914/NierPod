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
  updateTask
} from "../src/modules/workspace";
import {
  readTodayFocusItems,
  setTodayFocusOverride
} from "../src/modules/today-focus";

async function createWorkspaceFixture() {
  const tempRoot = await mkdtemp(join(tmpdir(), "nierpod-focus-test-"));
  const settingsDirectory = join(tempRoot, "app-user-data");
  const workspacePath = join(tempRoot, "workspace");

  await createWorkspace(workspacePath, { settingsDirectory });

  return {
    workspacePath
  };
}

test("Today Focus aggregates active Tasks across Projects with Project context", async () => {
  const { workspacePath } = await createWorkspaceFixture();
  const nierpod = await createProject(workspacePath, {
    title: "NierPod",
    goal: "Ship Phase 1",
    successCriteria: "- Today Focus is useful.",
    status: "active",
    deadline: null
  });
  const docs = await createProject(workspacePath, {
    title: "Docs Refresh",
    goal: "Refresh docs",
    successCriteria: "- Docs are reviewed.",
    status: "active",
    deadline: null
  });
  const archived = await createProject(workspacePath, {
    title: "Archived Work",
    goal: "Old work",
    successCriteria: "- Old work is hidden.",
    status: "active",
    deadline: null
  });
  const blocked = await createTask(workspacePath, nierpod.id, {
    title: "Resolve blocked dependency"
  });
  const ready = await createTask(workspacePath, nierpod.id, {
    title: "Prepare demo"
  });
  const done = await createTask(workspacePath, nierpod.id, {
    title: "Finished work"
  });
  const inProgress = await createTask(workspacePath, docs.id, {
    title: "Ship hotfix"
  });
  const archivedTask = await createTask(workspacePath, archived.id, {
    title: "Hidden archived Project task"
  });

  await updateTask(workspacePath, nierpod.id, blocked.id, {
    status: "blocked",
    priority: "p0",
    dueDate: "2026-05-28"
  });
  await updateTask(workspacePath, nierpod.id, ready.id, {
    status: "ready",
    priority: "p1",
    dueDate: "2026-05-28"
  });
  await updateTask(workspacePath, nierpod.id, done.id, {
    status: "done",
    priority: "p0",
    dueDate: "2026-05-28"
  });
  await updateTask(workspacePath, docs.id, inProgress.id, {
    status: "in_progress",
    priority: "p1",
    dueDate: "2026-05-28"
  });
  await updateTask(workspacePath, archived.id, archivedTask.id, {
    status: "ready",
    priority: "p0",
    dueDate: "2026-05-28"
  });
  await archiveProject(workspacePath, archived.id);

  const focusItems = await readTodayFocusItems(workspacePath, {
    today: "2026-05-28"
  });

  assert.deepEqual(
    focusItems.map((item) => ({
      title: item.task.title,
      projectTitle: item.project.title,
      status: item.task.status,
      priority: item.task.priority
    })),
    [
      {
        title: "Resolve blocked dependency",
        projectTitle: "NierPod",
        status: "blocked",
        priority: "p0"
      },
      {
        title: "Ship hotfix",
        projectTitle: "Docs Refresh",
        status: "in_progress",
        priority: "p1"
      },
      {
        title: "Prepare demo",
        projectTitle: "NierPod",
        status: "ready",
        priority: "p1"
      }
    ]
  );
});

test("Today Focus daily overrides pin, snooze, and hide without changing Task order", async () => {
  const { workspacePath } = await createWorkspaceFixture();
  const project = await createProject(workspacePath, {
    title: "NierPod",
    goal: "Ship Phase 1",
    successCriteria: "- Overrides are daily display state only.",
    status: "active",
    deadline: null
  });
  const normal = await createTask(workspacePath, project.id, {
    title: "Normal focus"
  });
  const pinned = await createTask(workspacePath, project.id, {
    title: "Pinned focus"
  });
  const hidden = await createTask(workspacePath, project.id, {
    title: "Hidden focus"
  });
  const snoozed = await createTask(workspacePath, project.id, {
    title: "Snoozed focus"
  });

  for (const task of [normal, pinned, hidden, snoozed]) {
    await updateTask(workspacePath, project.id, task.id, {
      status: "ready",
      priority: "p2"
    });
  }

  await setTodayFocusOverride(workspacePath, pinned.id, "pin", {
    today: "2026-05-28"
  });
  await setTodayFocusOverride(workspacePath, hidden.id, "hide", {
    today: "2026-05-28"
  });
  await setTodayFocusOverride(workspacePath, snoozed.id, "snooze", {
    today: "2026-05-28"
  });

  const focusItems = await readTodayFocusItems(workspacePath, {
    today: "2026-05-28"
  });

  assert.deepEqual(
    focusItems.map((item) => ({
      title: item.task.title,
      override: item.override
    })),
    [
      {
        title: "Pinned focus",
        override: "pin"
      },
      {
        title: "Normal focus",
        override: null
      }
    ]
  );

  const reloaded = await readWorkspaceModel(workspacePath);
  const reloadedProject = reloaded.projects.find(
    (candidate) => candidate.id === project.id
  );

  assert.deepEqual(reloadedProject?.taskOrder, [
    normal.id,
    pinned.id,
    hidden.id,
    snoozed.id
  ]);
  assert.deepEqual(
    reloadedProject?.tasks.map((task) => task.priority),
    ["p2", "p2", "p2", "p2"]
  );
  assert.match(await readFile(join(workspacePath, "today.md"), "utf8"), /pin/);
  assert.match(await readFile(join(workspacePath, "today.md"), "utf8"), /hide/);
  assert.match(await readFile(join(workspacePath, "today.md"), "utf8"), /snooze/);
});
