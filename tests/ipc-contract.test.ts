import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createWorkspaceAccessDescription,
  createWorkspaceOperationNotAllowedResponse,
  isAllowedWorkspaceOperation,
  workspaceIpcChannel,
  workspaceOperations
} from "../src/shared/ipc";

test("workspace IPC exposes only allowlisted Phase 1 operations", () => {
  assert.equal(workspaceIpcChannel, "nierpod:workspace");
  assert.deepEqual([...workspaceOperations], [
    "workspace.describeAccess",
    "workspace.getCurrent",
    "workspace.selectExisting",
    "workspace.createNew",
    "workspace.createProject",
    "workspace.updateProject",
    "workspace.archiveProject",
    "workspace.createTask",
    "workspace.updateTask",
    "workspace.addTaskArtifact",
    "workspace.readProjectJournal",
    "workspace.updateProjectJournal",
    "workspace.buildPromptPack",
    "workspace.savePromptOutputAsLlmNote",
    "workspace.readMemory",
    "workspace.replaceMemory",
    "workspace.search",
    "workspace.saveConflictCopy",
    "workspace.getTodayFocus",
    "workspace.setTodayFocusOverride",
    "workspace.getInboxItems",
    "workspace.captureInboxItem",
    "workspace.convertInboxItemToProject",
    "workspace.convertInboxItemToTask",
    "workspace.attachInboxItemToTaskContext",
    "workspace.archiveInboxItem",
    "workspace.deleteInboxItem"
  ]);

  for (const operation of workspaceOperations) {
    assert.equal(isAllowedWorkspaceOperation(operation), true, operation);
  }
});

test("workspace IPC rejects arbitrary file operations with a stable error shape", () => {
  const response = createWorkspaceOperationNotAllowedResponse({
    operation: "workspace.readFile",
    path: "/tmp/nierpod.md"
  });

  assert.equal(response.ok, false);
  assert.equal(response.error.code, "operation_not_allowed");
  assert.equal(typeof response.error.message, "string");
  assert.equal(response.error.details?.operation, "workspace.readFile");
});

test("workspace access description keeps file access behind the typed bridge", () => {
  const description = createWorkspaceAccessDescription();

  assert.equal(description.phase, "phase-1");
  assert.equal(description.canReadFiles, true);
  assert.equal(description.canWriteFiles, true);
  assert.match(description.message, /allowlisted main-process IPC/);
  assert.match(description.message, /Markdown files/);
});
