import assert from "node:assert/strict";
import { test } from "node:test";
import {
  fileIpcChannel,
  resolveFileCapabilityRequest
} from "../src/shared/ipc";

test("file capability IPC exposes only allowlisted Phase 0 operations", () => {
  assert.equal(fileIpcChannel, "nierpod:file-capability");

  const response = resolveFileCapabilityRequest({
    operation: "workspace.describeAccess"
  });

  assert.equal(response.ok, true);
  assert.equal(response.data.phase, "phase-0");
  assert.equal(response.data.canReadFiles, false);
  assert.equal(response.data.canWriteFiles, false);
});

test("file capability IPC rejects arbitrary file operations with a stable error shape", () => {
  const response = resolveFileCapabilityRequest({
    operation: "workspace.readFile",
    path: "/tmp/nierpod.md"
  });

  assert.equal(response.ok, false);
  assert.equal(response.error.code, "operation_not_allowed");
  assert.equal(typeof response.error.message, "string");
  assert.equal(response.error.details?.operation, "workspace.readFile");
});
