import {
  mkdir,
  readFile,
  readdir,
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
import { readInboxItems, readWorkspaceModel } from "../workspace";
import type {
  ArtifactRecord,
  FutureModuleBoundary,
  Project,
  SearchIndexSummary,
  SearchQueryInput,
  SearchResult,
  SearchResultTarget,
  Task
} from "../../shared/domain";

export const searchModuleBoundary: FutureModuleBoundary = {
  name: "Search index",
  phase: "phase-1",
  status: "implemented",
  extendsFrom: "src/modules/search/index.ts",
  responsibility:
    "Own rebuildable SQLite or equivalent local search index behavior in Phase 1."
};

const searchIndexRelativePath = ".nierpod/search-index.json";

type SearchIndexEntry = {
  id: string;
  title: string;
  content: string;
  relativePath: string;
  target: SearchResultTarget;
};

type SearchIndex = {
  version: 1;
  rebuiltAt: string;
  entries: SearchIndexEntry[];
};

export function getSearchIndexPath(workspacePath: string): string {
  return join(resolve(workspacePath), searchIndexRelativePath);
}

export async function rebuildSearchIndex(
  workspacePath: string
): Promise<SearchIndexSummary> {
  const index = await buildAndWriteSearchIndex(workspacePath);

  return {
    relativePath: searchIndexRelativePath,
    entryCount: index.entries.length,
    rebuiltAt: index.rebuiltAt
  };
}

export async function searchWorkspace(
  workspacePath: string,
  input: SearchQueryInput
): Promise<SearchResult[]> {
  const query = normalizeSearchText(input.query);

  if (!query) {
    return [];
  }

  const index = await buildAndWriteSearchIndex(workspacePath);

  return index.entries
    .map((entry) => scoreEntry(entry, query))
    .filter((result): result is SearchResult => result !== null)
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.title.localeCompare(right.title) ||
        left.relativePath.localeCompare(right.relativePath)
    );
}

async function buildAndWriteSearchIndex(
  workspacePath: string
): Promise<SearchIndex> {
  const rootPath = resolve(workspacePath);
  const index: SearchIndex = {
    version: 1,
    rebuiltAt: new Date().toISOString(),
    entries: await collectSearchEntries(rootPath)
  };
  const indexPath = getSearchIndexPath(rootPath);

  await mkdir(dirname(indexPath), { recursive: true });
  await writeFile(indexPath, `${JSON.stringify(index, null, 2)}\n`, "utf8");

  return index;
}

async function collectSearchEntries(rootPath: string): Promise<SearchIndexEntry[]> {
  const model = await readWorkspaceModel(rootPath);
  const entries: SearchIndexEntry[] = [];

  for (const project of model.projects) {
    entries.push(createProjectEntry(rootPath, project));

    for (const task of project.tasks) {
      entries.push(createTaskEntry(rootPath, project, task));

      for (const artifact of task.artifacts) {
        entries.push(
          await createArtifactEntry(rootPath, project, task, artifact)
        );
      }
    }
  }

  for (const item of await readInboxItems(rootPath)) {
    entries.push({
      id: item.id,
      title: item.text,
      content: [
        item.text,
        item.status,
        item.targetProjectId ?? "",
        item.targetTaskId ?? "",
        item.createdAt
      ].join("\n"),
      relativePath: "inbox.md",
      target: {
        kind: "inbox",
        inboxItemId: item.id,
        relativePath: "inbox.md"
      }
    });
  }

  entries.push(...(await readLlmNoteEntries(rootPath)));

  return entries;
}

function createProjectEntry(
  rootPath: string,
  project: Project
): SearchIndexEntry {
  const relativePath = toWorkspaceRelativePath(rootPath, project.markdownPath);

  return {
    id: project.id,
    title: project.title,
    content: [
      project.title,
      project.status,
      project.deadline ?? "",
      project.goal,
      project.successCriteria,
      project.taskOrder.join("\n")
    ].join("\n"),
    relativePath,
    target: {
      kind: "project",
      projectId: project.id,
      relativePath
    }
  };
}

function createTaskEntry(
  rootPath: string,
  project: Project,
  task: Task
): SearchIndexEntry {
  const relativePath = toWorkspaceRelativePath(rootPath, task.markdownPath);

  return {
    id: task.id,
    title: task.title,
    content: [
      task.title,
      task.status,
      task.priority,
      task.lane,
      task.dueDate ?? "",
      task.dependencies.join("\n"),
      task.context,
      task.todos
        .map((todo) => `${todo.completed ? "done" : "open"} ${todo.text}`)
        .join("\n"),
      task.progress,
      task.artifacts
        .map((artifact) => `${artifact.title} ${artifact.path ?? ""} ${artifact.url ?? ""}`)
        .join("\n"),
      task.acceptanceCriteria
    ].join("\n"),
    relativePath,
    target: {
      kind: "task",
      projectId: project.id,
      taskId: task.id,
      relativePath
    }
  };
}

async function createArtifactEntry(
  rootPath: string,
  project: Project,
  task: Task,
  artifact: ArtifactRecord
): Promise<SearchIndexEntry> {
  const projectDirectory = dirname(project.markdownPath);
  const artifactPath = artifact.path
    ? join(projectDirectory, "artifacts", artifact.path)
    : null;
  const relativePath = artifactPath
    ? toWorkspaceRelativePath(rootPath, artifactPath)
    : toWorkspaceRelativePath(
        rootPath,
        join(projectDirectory, "artifacts", "artifact-manifest.json")
      );
  const artifactSource = artifactPath ? await readTextFile(artifactPath) : "";

  return {
    id: artifact.id,
    title: artifact.title,
    content: [
      artifact.title,
      artifact.type,
      artifact.path ?? "",
      artifact.url ?? "",
      artifact.createdAt,
      artifactSource
    ].join("\n"),
    relativePath,
    target: {
      kind: "artifact",
      projectId: project.id,
      taskId: task.id,
      artifactId: artifact.id,
      relativePath
    }
  };
}

async function readLlmNoteEntries(rootPath: string): Promise<SearchIndexEntry[]> {
  const notesDirectory = join(rootPath, "llm-notes");
  const entries: SearchIndexEntry[] = [];

  try {
    for (const entry of await readdir(notesDirectory, { withFileTypes: true })) {
      if (
        !entry.isFile() ||
        extname(entry.name).toLowerCase() !== ".md" ||
        entry.name === "README.md"
      ) {
        continue;
      }

      const notePath = join(notesDirectory, entry.name);
      const source = await readTextFile(notePath);
      const relativePath = toWorkspaceRelativePath(rootPath, notePath);
      const title = readMarkdownTitle(source) ?? titleFromFilename(entry.name);

      entries.push({
        id: readMetadataValue(source, "ID") ?? relativePath,
        title,
        content: source,
        relativePath,
        target: {
          kind: "llm-note",
          projectId: readNullableMetadataValue(source, "Project ID"),
          taskId: readNullableMetadataValue(source, "Task ID"),
          relativePath
        }
      });
    }
  } catch {
    return [];
  }

  return entries;
}

function scoreEntry(entry: SearchIndexEntry, query: string): SearchResult | null {
  const normalizedTitle = normalizeSearchText(entry.title);
  const normalizedContent = normalizeSearchText(entry.content);
  const terms = query.split(" ").filter(Boolean);
  const exactTitleMatch = normalizedTitle.includes(query);
  const exactContentMatch = normalizedContent.includes(query);
  const matchedTerms = terms.filter(
    (term) => normalizedTitle.includes(term) || normalizedContent.includes(term)
  );

  if (!exactTitleMatch && !exactContentMatch && matchedTerms.length !== terms.length) {
    return null;
  }

  const score =
    (exactTitleMatch ? 100 : 0) +
    (exactContentMatch ? 50 : 0) +
    matchedTerms.length;

  return {
    id: entry.id,
    title: entry.title,
    preview: createPreview(entry.content, query),
    relativePath: entry.relativePath,
    target: entry.target,
    score
  };
}

function createPreview(content: string, query: string): string {
  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const matchingLine =
    lines.find((line) => normalizeSearchText(line).includes(query)) ??
    lines.find((line) =>
      query
        .split(" ")
        .filter(Boolean)
        .some((term) => normalizeSearchText(line).includes(term))
    ) ??
    lines[0] ??
    "";

  return matchingLine.length > 180
    ? `${matchingLine.slice(0, 177).trimEnd()}...`
    : matchingLine;
}

async function readTextFile(pathname: string): Promise<string> {
  try {
    return await readFile(pathname, "utf8");
  } catch {
    return "";
  }
}

function readMarkdownTitle(source: string): string | null {
  const match = /^#\s+(.+?)\s*$/m.exec(source);
  return match?.[1] ?? null;
}

function readMetadataValue(source: string, key: string): string | null {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`^- ${escapedKey}:\\s*(.+?)\\s*$`, "m").exec(source);

  return match?.[1] ?? null;
}

function readNullableMetadataValue(source: string, key: string): string | null {
  const value = readMetadataValue(source, key);

  return value && value !== "none" ? value : null;
}

function normalizeSearchText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function toWorkspaceRelativePath(rootPath: string, absolutePath: string): string {
  return relative(rootPath, absolutePath).split(sep).join("/");
}

function titleFromFilename(filename: string): string {
  return basename(filename, extname(filename))
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}
