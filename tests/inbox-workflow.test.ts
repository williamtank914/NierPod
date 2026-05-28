import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  captureInboxItem,
  archiveInboxItem,
  attachInboxItemToTaskContext,
  convertInboxItemToProject,
  convertInboxItemToTask,
  createProject,
  createTask,
  deleteInboxItem,
  createWorkspace,
  readWorkspaceModel,
  readInboxItems
} from "../src/modules/workspace";

async function createWorkspaceFixture() {
  const tempRoot = await mkdtemp(join(tmpdir(), "nierpod-inbox-test-"));
  const settingsDirectory = join(tempRoot, "app-user-data");
  const workspacePath = join(tempRoot, "workspace");

  await createWorkspace(workspacePath, { settingsDirectory });

  return {
    workspacePath
  };
}

test("Inbox capture writes an open item to human-readable Markdown", async () => {
  const { workspacePath } = await createWorkspaceFixture();

  const item = await captureInboxItem(workspacePath, {
    text: "Follow up on Today Focus sorting"
  });

  assert.equal(item.status, "open");
  assert.equal(item.text, "Follow up on Today Focus sorting");

  const inboxMarkdown = await readFile(join(workspacePath, "inbox.md"), "utf8");

  assert.match(inboxMarkdown, /^# Inbox/m);
  assert.match(inboxMarkdown, /Follow up on Today Focus sorting/);
  assert.match(inboxMarkdown, /open/);

  const reloaded = await readInboxItems(workspacePath);

  assert.deepEqual(
    reloaded.map((candidate) => ({
      id: candidate.id,
      text: candidate.text,
      status: candidate.status
    })),
    [
      {
        id: item.id,
        text: "Follow up on Today Focus sorting",
        status: "open"
      }
    ]
  );
});

test("Inbox items convert to a new Project or an existing Project Task", async () => {
  const { workspacePath } = await createWorkspaceFixture();
  const projectItem = await captureInboxItem(workspacePath, {
    text: "Plan Prompt Pack workflow"
  });
  const taskProject = await createProject(workspacePath, {
    title: "NierPod",
    goal: "Ship Phase 1",
    successCriteria: "- Inbox conversions work.",
    status: "active",
    deadline: null
  });
  const taskItem = await captureInboxItem(workspacePath, {
    text: "Write Inbox conversion tests"
  });

  const convertedProject = await convertInboxItemToProject(
    workspacePath,
    projectItem.id
  );
  const convertedTask = await convertInboxItemToTask(
    workspacePath,
    taskItem.id,
    taskProject.id
  );

  const reloaded = await readWorkspaceModel(workspacePath);
  const convertedProjectItem = (await readInboxItems(workspacePath)).find(
    (item) => item.id === projectItem.id
  );
  const convertedTaskItem = (await readInboxItems(workspacePath)).find(
    (item) => item.id === taskItem.id
  );

  assert.equal(convertedProject.title, "Plan Prompt Pack workflow");
  assert.ok(
    reloaded.projects.some(
      (project) =>
        project.id === convertedProject.id &&
        project.title === "Plan Prompt Pack workflow"
    )
  );
  assert.equal(convertedProjectItem?.status, "converted_to_project");
  assert.equal(convertedProjectItem?.targetProjectId, convertedProject.id);

  assert.equal(convertedTask.title, "Write Inbox conversion tests");
  assert.ok(
    reloaded.projects
      .find((project) => project.id === taskProject.id)
      ?.tasks.some((task) => task.id === convertedTask.id)
  );
  assert.equal(convertedTaskItem?.status, "converted_to_task");
  assert.equal(convertedTaskItem?.targetProjectId, taskProject.id);
  assert.equal(convertedTaskItem?.targetTaskId, convertedTask.id);
});

test("Inbox items attach to Task Context, archive, or delete from Markdown", async () => {
  const { workspacePath } = await createWorkspaceFixture();
  const project = await createProject(workspacePath, {
    title: "NierPod",
    goal: "Ship Phase 1",
    successCriteria: "- Inbox can feed Task context.",
    status: "active",
    deadline: null
  });
  const task = await createTask(workspacePath, project.id, {
    title: "Refine Inbox"
  });
  const contextItem = await captureInboxItem(workspacePath, {
    text: "Remember paste-back UX"
  });
  const archiveItem = await captureInboxItem(workspacePath, {
    text: "Old reference"
  });
  const deleteItem = await captureInboxItem(workspacePath, {
    text: "Typo capture"
  });

  const updatedTask = await attachInboxItemToTaskContext(
    workspacePath,
    contextItem.id,
    project.id,
    task.id
  );
  await archiveInboxItem(workspacePath, archiveItem.id);
  await deleteInboxItem(workspacePath, deleteItem.id);

  assert.match(updatedTask.context, /Remember paste-back UX/);

  const reloaded = await readWorkspaceModel(workspacePath);
  const reloadedTask = reloaded.projects[0]?.tasks.find(
    (candidate) => candidate.id === task.id
  );
  const items = await readInboxItems(workspacePath);

  assert.match(reloadedTask?.context ?? "", /Remember paste-back UX/);
  assert.equal(
    items.find((item) => item.id === contextItem.id)?.status,
    "attached_to_task"
  );
  assert.equal(
    items.find((item) => item.id === archiveItem.id)?.status,
    "archived"
  );
  assert.equal(
    items.some((item) => item.id === deleteItem.id),
    false
  );

  const inboxMarkdown = await readFile(join(workspacePath, "inbox.md"), "utf8");

  assert.match(inboxMarkdown, /attached_to_task/);
  assert.match(inboxMarkdown, /archived/);
  assert.doesNotMatch(inboxMarkdown, /Typo capture/);
});
