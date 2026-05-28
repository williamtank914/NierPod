import { createHash } from "node:crypto";
import { watch, type FSWatcher } from "node:fs";
import {
  mkdir,
  readdir,
  readFile,
  stat,
  writeFile
} from "node:fs/promises";
import {
  basename,
  dirname,
  extname,
  join,
  relative,
  resolve,
  sep
} from "node:path";
import type {
  ConflictCopyInput,
  ConflictCopyResult,
  FileConflictResolutionInput,
  FileConflictResolutionResult,
  FutureModuleBoundary,
  WorkspaceExternalFileChange,
  WorkspaceFileSnapshot,
  WorkspaceFileSnapshotEntry
} from "../../shared/domain";

export const syncModuleBoundary: FutureModuleBoundary = {
  name: "External file sync",
  phase: "phase-1",
  status: "implemented",
  extendsFrom: "src/modules/sync/index.ts",
  responsibility:
    "Own external Markdown change detection, conflict copy creation, and runtime workspace file watcher boundaries in Phase 1."
};

export async function createWorkspaceFileSnapshot(
  workspacePath: string
): Promise<WorkspaceFileSnapshot> {
  const rootPath = resolve(workspacePath);
  const files: WorkspaceFileSnapshotEntry[] = [];

  async function visit(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
      const absolutePath = join(directory, entry.name);

      if (shouldIgnoreRelativePath(toWorkspaceRelativePath(rootPath, absolutePath))) {
        continue;
      }

      if (entry.isDirectory()) {
        await visit(absolutePath);
        continue;
      }

      if (!entry.isFile() || !isSyncTrackedFile(entry.name)) {
        continue;
      }

      const source = await readFile(absolutePath);
      const fileStat = await stat(absolutePath);

      files.push({
        relativePath: toWorkspaceRelativePath(rootPath, absolutePath),
        hash: createHash("sha256").update(source).digest("hex"),
        modifiedTimeMs: fileStat.mtimeMs
      });
    }
  }

  await visit(rootPath);

  return {
    rootPath,
    capturedAt: new Date().toISOString(),
    files: files.sort((left, right) =>
      left.relativePath.localeCompare(right.relativePath)
    )
  };
}

export function diffWorkspaceFileSnapshots(
  before: WorkspaceFileSnapshot,
  after: WorkspaceFileSnapshot
): WorkspaceExternalFileChange[] {
  const beforeFiles = new Map(
    before.files.map((entry) => [entry.relativePath, entry])
  );
  const afterFiles = new Map(
    after.files.map((entry) => [entry.relativePath, entry])
  );
  const detectedAt = after.capturedAt;
  const changes: WorkspaceExternalFileChange[] = [];

  for (const [relativePath, afterEntry] of afterFiles) {
    const beforeEntry = beforeFiles.get(relativePath);

    if (!beforeEntry) {
      changes.push({
        relativePath,
        kind: "created",
        detectedAt
      });
      continue;
    }

    if (beforeEntry.hash !== afterEntry.hash) {
      changes.push({
        relativePath,
        kind: "modified",
        detectedAt
      });
    }
  }

  for (const relativePath of beforeFiles.keys()) {
    if (!afterFiles.has(relativePath)) {
      changes.push({
        relativePath,
        kind: "deleted",
        detectedAt
      });
    }
  }

  return changes.sort((left, right) =>
    left.relativePath.localeCompare(right.relativePath)
  );
}

export async function resolveFileConflict(
  workspacePath: string,
  input: FileConflictResolutionInput
): Promise<FileConflictResolutionResult> {
  switch (input.action) {
    case "reload_from_disk":
      return {
        action: input.action,
        relativePath: input.relativePath,
        source: await readFile(resolveWorkspacePath(workspacePath, input.relativePath), "utf8")
      };
    case "keep_current_draft":
      return {
        action: input.action,
        relativePath: input.relativePath,
        source: input.draftSource
      };
    case "save_as_conflict_copy": {
      const copy = await saveConflictCopy(workspacePath, {
        relativePath: input.relativePath,
        draftSource: input.draftSource
      });

      return {
        action: input.action,
        relativePath: copy.relativePath,
        source: input.draftSource
      };
    }
  }
}

export async function saveConflictCopy(
  workspacePath: string,
  input: ConflictCopyInput
): Promise<ConflictCopyResult> {
  const rootPath = resolve(workspacePath);
  const sourcePath = resolveWorkspacePath(rootPath, input.relativePath);
  const sourceBasename = basename(input.relativePath, extname(input.relativePath));
  const sourceText = await readFile(sourcePath, "utf8").catch(() => "");
  const copyName = readMarkdownTitle(sourceText) ?? sourceBasename;
  const copyRelativePath = `conflicts/${formatTimestampForPath(
    new Date().toISOString()
  )}-${slugify(copyName)}-${createHash("sha1")
    .update(input.relativePath)
    .digest("hex")
    .slice(0, 8)}.md`;
  const copyPath = join(rootPath, copyRelativePath);

  await mkdir(dirname(copyPath), { recursive: true });
  await writeFile(
    copyPath,
    input.draftSource.endsWith("\n")
      ? input.draftSource
      : `${input.draftSource}\n`,
    "utf8"
  );

  return {
    relativePath: copyRelativePath
  };
}

export function watchWorkspaceFiles(
  workspacePath: string,
  onChange: (change: WorkspaceExternalFileChange) => void
): () => void {
  const rootPath = resolve(workspacePath);
  let watcher: FSWatcher | null = null;

  try {
    watcher = watch(
      rootPath,
      { recursive: true },
      (eventType, filename) => {
        if (!filename) {
          return;
        }

        const relativePath = filename.toString().split(sep).join("/");

        if (
          shouldIgnoreRelativePath(relativePath) ||
          !isSyncTrackedFile(relativePath)
        ) {
          return;
        }

        onChange({
          relativePath,
          kind: eventType === "rename" ? "modified" : "modified",
          detectedAt: new Date().toISOString()
        });
      }
    );
  } catch {
    return () => undefined;
  }

  return () => {
    watcher?.close();
  };
}

function resolveWorkspacePath(workspacePath: string, relativePath: string): string {
  const rootPath = resolve(workspacePath);
  const absolutePath = resolve(rootPath, relativePath);

  if (absolutePath !== rootPath && !absolutePath.startsWith(`${rootPath}${sep}`)) {
    throw new Error(`Path escapes workspace: ${relativePath}`);
  }

  return absolutePath;
}

function isSyncTrackedFile(pathname: string): boolean {
  const extension = extname(pathname).toLowerCase();

  return extension === ".md" || extension === ".json";
}

function shouldIgnoreRelativePath(relativePath: string): boolean {
  const normalizedPath = relativePath.split(sep).join("/");
  const [topLevel] = normalizedPath.split("/");

  return (
    topLevel === ".git" ||
    topLevel === "node_modules" ||
    topLevel === ".nierpod"
  );
}

function toWorkspaceRelativePath(rootPath: string, absolutePath: string): string {
  return relative(rootPath, absolutePath).split(sep).join("/");
}

function formatTimestampForPath(timestamp: string): string {
  return timestamp.replace(/\.\d{3}Z$/, "Z").replace(/[^0-9TZ]+/g, "-");
}

function readMarkdownTitle(source: string): string | null {
  const match = /^#\s+(.+?)\s*$/m.exec(source);
  return match?.[1] ?? null;
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "conflict";
}
