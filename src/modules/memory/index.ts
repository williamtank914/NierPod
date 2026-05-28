import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { appendJournalEvent } from "../journal";
import { buildPromptPack } from "../prompt-pack";
import type {
  FutureModuleBoundary,
  MemoryCancelResult,
  MemoryDocument,
  MemoryDraft,
  MemoryDraftInput,
  MemoryReplacementResult,
  PromptPack
} from "../../shared/domain";

export const memoryModuleBoundary: FutureModuleBoundary = {
  name: "Memory",
  phase: "phase-1",
  status: "implemented",
  extendsFrom: "src/modules/memory/index.ts",
  responsibility:
    "Own LLM-consumable Memory viewing, replacement, and archival boundaries in Phase 1."
};

export async function readCurrentMemory(
  workspacePath: string
): Promise<MemoryDocument> {
  return {
    relativePath: "memory.md",
    source: await readMemorySource(workspacePath)
  };
}

export async function buildMemorySummaryPrompt(
  workspacePath: string
): Promise<PromptPack> {
  return buildPromptPack(workspacePath, {
    intent: "summarize_memory"
  });
}

export function stageMemoryDraft(input: MemoryDraftInput): MemoryDraft {
  const draftMarkdown = normalizeMemoryMarkdown(input.draftMarkdown);

  if (!draftMarkdown.trim()) {
    throw new Error("Memory draft is required.");
  }

  return {
    draftMarkdown,
    requiresConfirmation: true
  };
}

export async function cancelMemoryReplacement(
  workspacePath: string,
  draft: MemoryDraft
): Promise<MemoryCancelResult> {
  void workspacePath;
  void draft;

  return {
    canceled: true
  };
}

export async function replaceMemoryWithDraft(
  workspacePath: string,
  draft: MemoryDraft
): Promise<MemoryReplacementResult> {
  const rootPath = resolve(workspacePath);
  const archiveRelativePath = `memory/${formatTimestampForPath(
    new Date().toISOString()
  )}-${randomUUID().slice(0, 8)}.md`;
  const archivePath = join(rootPath, archiveRelativePath);
  const currentMemory = await readCurrentMemory(rootPath);

  await mkdir(dirname(archivePath), { recursive: true });
  await writeFile(archivePath, currentMemory.source, "utf8");
  await writeFile(getMemoryPath(rootPath), draft.draftMarkdown, "utf8");
  await appendJournalEvent(rootPath, {
    summary: `Memory replaced: archived previous Memory to ${archiveRelativePath}`
  });

  return {
    current: await readCurrentMemory(rootPath),
    archiveRelativePath
  };
}

async function readMemorySource(workspacePath: string): Promise<string> {
  try {
    return await readFile(getMemoryPath(workspacePath), "utf8");
  } catch {
    return "# Memory\n\n## Current Summary\n\nNo memory has been recorded yet.\n";
  }
}

function getMemoryPath(workspacePath: string): string {
  return join(resolve(workspacePath), "memory.md");
}

function normalizeMemoryMarkdown(source: string): string {
  return `${source.trimEnd()}\n`;
}

function formatTimestampForPath(timestamp: string): string {
  return timestamp.replace(/\.\d{3}Z$/, "Z").replace(/[^0-9TZ]+/g, "-");
}
