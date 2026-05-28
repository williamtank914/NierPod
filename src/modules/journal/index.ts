import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import type { FutureModuleBoundary } from "../../shared/domain";

export const journalModuleBoundary: FutureModuleBoundary = {
  name: "Journal",
  phase: "phase-1",
  status: "implemented",
  extendsFrom: "src/modules/journal/index.ts",
  responsibility:
    "Own append-oriented Project and Task event history behavior in Phase 1."
};

export type JournalEventInput = {
  summary: string;
};

export async function appendJournalEvent(
  workspacePath: string,
  event: JournalEventInput
): Promise<void> {
  const journalPath = join(resolve(workspacePath), "journal.md");
  const currentSource = await readJournalSource(journalPath);
  const entry = `- ${new Date().toISOString()} - ${event.summary}`;

  await mkdir(dirname(journalPath), { recursive: true });
  await writeFile(journalPath, `${currentSource.trimEnd()}\n${entry}\n`, "utf8");
}

async function readJournalSource(journalPath: string): Promise<string> {
  try {
    return await readFile(journalPath, "utf8");
  } catch {
    return "# Journal\n\n## Events\n";
  }
}
