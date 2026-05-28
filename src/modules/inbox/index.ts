import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type {
  FutureModuleBoundary,
  InboxItem,
  InboxItemInput,
  InboxItemStatus
} from "../../shared/domain";

export const inboxModuleBoundary: FutureModuleBoundary = {
  name: "Inbox",
  phase: "phase-1",
  status: "implemented",
  extendsFrom: "src/modules/inbox/index.ts",
  responsibility:
    "Own quick capture, Markdown-backed Inbox item state, and conversion source tracking in Phase 1."
};

export async function captureInboxItem(
  workspacePath: string,
  input: InboxItemInput
): Promise<InboxItem> {
  const items = await readInboxItems(workspacePath);
  const item: InboxItem = {
    id: `inbox-${randomUUID()}`,
    text: input.text.trim(),
    status: "open",
    targetProjectId: null,
    targetTaskId: null,
    createdAt: new Date().toISOString()
  };

  if (!item.text) {
    throw new Error("Inbox item text is required.");
  }

  await writeInboxItems(workspacePath, [...items, item]);

  return item;
}

export async function readInboxItems(workspacePath: string): Promise<InboxItem[]> {
  try {
    const source = await readFile(getInboxPath(workspacePath), "utf8");

    return source
      .split("\n")
      .map((line) => readInboxTableRow(line))
      .filter((item): item is InboxItem => item !== null);
  } catch {
    return [];
  }
}

export async function updateInboxItem(
  workspacePath: string,
  itemId: string,
  updates: {
    status: InboxItemStatus;
    targetProjectId?: string | null;
    targetTaskId?: string | null;
  }
): Promise<InboxItem> {
  const items = await readInboxItems(workspacePath);
  const item = items.find((candidate) => candidate.id === itemId);

  if (!item) {
    throw new Error(`Inbox item was not found: ${itemId}`);
  }

  const updatedItem: InboxItem = {
    ...item,
    status: updates.status,
    targetProjectId: updates.targetProjectId ?? item.targetProjectId,
    targetTaskId: updates.targetTaskId ?? item.targetTaskId
  };

  await writeInboxItems(
    workspacePath,
    items.map((candidate) =>
      candidate.id === itemId ? updatedItem : candidate
    )
  );

  return updatedItem;
}

export async function deleteInboxItem(
  workspacePath: string,
  itemId: string
): Promise<void> {
  const items = await readInboxItems(workspacePath);

  await writeInboxItems(
    workspacePath,
    items.filter((item) => item.id !== itemId)
  );
}

function getInboxPath(workspacePath: string): string {
  return join(resolve(workspacePath), "inbox.md");
}

async function writeInboxItems(
  workspacePath: string,
  items: InboxItem[]
): Promise<void> {
  const rows = items.map((item) =>
    [
      item.id,
      item.status,
      escapeTableCell(item.text),
      item.targetProjectId ?? "",
      item.targetTaskId ?? "",
      item.createdAt
    ].join(" | ")
  );

  await writeFile(
    getInboxPath(workspacePath),
    `# Inbox

Use this file for quick capture before an item is assigned to a Project or Task.

## Items

| ID | Status | Text | Target Project | Target Task | Created At |
| --- | --- | --- | --- | --- | --- |
${rows.map((row) => `| ${row} |`).join("\n")}
`,
    "utf8"
  );
}

function readInboxTableRow(line: string): InboxItem | null {
  const trimmedLine = line.trim();

  if (
    !trimmedLine.startsWith("| inbox-") ||
    trimmedLine.includes("| --- |")
  ) {
    return null;
  }

  const cells = trimmedLine
    .slice(1, -1)
    .split("|")
    .map((cell) => cell.trim());

  if (cells.length < 6 || !isInboxItemStatus(cells[1])) {
    return null;
  }

  return {
    id: cells[0],
    status: cells[1],
    text: unescapeTableCell(cells[2]),
    targetProjectId: cells[3] || null,
    targetTaskId: cells[4] || null,
    createdAt: cells[5]
  };
}

function isInboxItemStatus(value: string): value is InboxItemStatus {
  return (
    value === "open" ||
    value === "converted_to_project" ||
    value === "converted_to_task" ||
    value === "attached_to_task" ||
    value === "archived"
  );
}

function escapeTableCell(value: string): string {
  return value.replaceAll("|", "&#124;").replaceAll("\n", "<br>");
}

function unescapeTableCell(value: string): string {
  return value.replaceAll("<br>", "\n").replaceAll("&#124;", "|");
}
