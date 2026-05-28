import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { createWorkspace } from "../src/modules/workspace";
import {
  buildMemorySummaryPrompt,
  cancelMemoryReplacement,
  readCurrentMemory,
  replaceMemoryWithDraft,
  stageMemoryDraft
} from "../src/modules/memory";

async function createWorkspaceFixture() {
  const tempRoot = await mkdtemp(join(tmpdir(), "nierpod-memory-test-"));
  const settingsDirectory = join(tempRoot, "app-user-data");
  const workspacePath = join(tempRoot, "workspace");

  await createWorkspace(workspacePath, { settingsDirectory });

  return {
    workspacePath
  };
}

test("Memory workflow stages drafts, requires confirmation, archives old Memory, and restores after restart", async () => {
  const { workspacePath } = await createWorkspaceFixture();
  const oldMemory = "# Memory\n\n## Current Summary\n\nOld durable context.\n";
  const newMemory =
    "# Memory\n\n## Current Summary\n\nNew durable context from reviewed LLM draft.\n";

  await writeFile(join(workspacePath, "memory.md"), oldMemory, "utf8");

  const current = await readCurrentMemory(workspacePath);

  assert.equal(current.relativePath, "memory.md");
  assert.equal(current.source, oldMemory);

  const prompt = await buildMemorySummaryPrompt(workspacePath);

  assert.equal(prompt.intent, "summarize_memory");
  assert.match(prompt.promptMarkdown, /^# Prompt Pack: Summarize memory/m);
  assert.match(prompt.promptMarkdown, /Old durable context/);

  const draft = stageMemoryDraft({
    draftMarkdown: newMemory
  });

  assert.equal(draft.requiresConfirmation, true);
  assert.equal(draft.draftMarkdown, newMemory);
  assert.equal(await readFile(join(workspacePath, "memory.md"), "utf8"), oldMemory);

  const canceled = await cancelMemoryReplacement(workspacePath, draft);

  assert.equal(canceled.canceled, true);
  assert.equal(await readFile(join(workspacePath, "memory.md"), "utf8"), oldMemory);

  const replacement = await replaceMemoryWithDraft(workspacePath, draft);
  const archivedMemory = await readFile(
    join(workspacePath, replacement.archiveRelativePath),
    "utf8"
  );
  const reloaded = await readCurrentMemory(workspacePath);
  const journal = await readFile(join(workspacePath, "journal.md"), "utf8");

  assert.match(replacement.archiveRelativePath, /^memory\/.+\.md$/);
  assert.equal(archivedMemory, oldMemory);
  assert.equal(reloaded.source, newMemory);
  assert.match(journal, /Memory replaced/);
  assert.match(journal, new RegExp(replacement.archiveRelativePath));
});
