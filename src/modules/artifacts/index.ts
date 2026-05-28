import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type {
  ArtifactInput,
  ArtifactRecord,
  ArtifactType,
  FutureModuleBoundary
} from "../../shared/domain";

export const artifactModuleBoundary: FutureModuleBoundary = {
  name: "Artifact registry",
  phase: "phase-1",
  status: "implemented",
  extendsFrom: "src/modules/artifacts/index.ts",
  responsibility:
    "Own local Markdown and URL artifact records, manifest boundaries, and Task associations in Phase 1."
};

export const artifactManifestFilename = "artifact-manifest.json";

type ArtifactManifest = {
  version: 1;
  artifacts: ArtifactRecord[];
};

type PersistedArtifactRecord = {
  id?: unknown;
  title?: unknown;
  type?: unknown;
  path?: unknown;
  url?: unknown;
  task_id?: unknown;
  created_at?: unknown;
};

type PersistedArtifactManifest = {
  version?: unknown;
  artifacts?: unknown;
};

export function getArtifactDirectory(projectDirectory: string): string {
  return join(resolve(projectDirectory), "artifacts");
}

export function getArtifactManifestPath(projectDirectory: string): string {
  return join(getArtifactDirectory(projectDirectory), artifactManifestFilename);
}

export async function addArtifactRecord(
  projectDirectory: string,
  taskId: string,
  input: ArtifactInput
): Promise<ArtifactRecord> {
  const artifactDirectory = getArtifactDirectory(projectDirectory);
  const artifactId = `artifact-${randomUUID()}`;
  const title = input.title.trim() || "Untitled Artifact";
  const type = readArtifactType(input.type);
  const path =
    type === "markdown"
      ? await writeMarkdownArtifact(artifactDirectory, artifactId, title, input)
      : null;
  const url = type === "url" ? readUrl(input.url) : null;
  const artifact: ArtifactRecord = {
    id: artifactId,
    title,
    type,
    path,
    url,
    taskId,
    createdAt: new Date().toISOString()
  };
  const manifest = await readArtifactManifest(projectDirectory);

  await writeArtifactManifest(projectDirectory, {
    version: 1,
    artifacts: [...manifest.artifacts, artifact]
  });

  return artifact;
}

export async function readArtifactRecords(
  projectDirectory: string
): Promise<ArtifactRecord[]> {
  return (await readArtifactManifest(projectDirectory)).artifacts;
}

async function readArtifactManifest(
  projectDirectory: string
): Promise<ArtifactManifest> {
  try {
    const raw = JSON.parse(
      await readFile(getArtifactManifestPath(projectDirectory), "utf8")
    ) as PersistedArtifactManifest;

    return {
      version: 1,
      artifacts: Array.isArray(raw.artifacts)
        ? raw.artifacts
            .map((entry) =>
              readPersistedArtifactRecord(entry as PersistedArtifactRecord)
            )
            .filter((entry): entry is ArtifactRecord => entry !== null)
        : []
    };
  } catch {
    return {
      version: 1,
      artifacts: []
    };
  }
}

async function writeArtifactManifest(
  projectDirectory: string,
  manifest: ArtifactManifest
): Promise<void> {
  const artifactDirectory = getArtifactDirectory(projectDirectory);

  await mkdir(artifactDirectory, { recursive: true });
  await writeFile(
    getArtifactManifestPath(projectDirectory),
    `${JSON.stringify(toPersistedManifest(manifest), null, 2)}\n`,
    "utf8"
  );
}

async function writeMarkdownArtifact(
  artifactDirectory: string,
  artifactId: string,
  title: string,
  input: ArtifactInput
): Promise<string> {
  const relativePath = `${slugify(title)}-${artifactId.slice(
    "artifact-".length,
    "artifact-".length + 8
  )}.md`;

  await mkdir(artifactDirectory, { recursive: true });
  await writeFile(
    join(artifactDirectory, relativePath),
    normalizeMarkdownSource(title, input.markdownContent ?? ""),
    "utf8"
  );

  return relativePath;
}

function readPersistedArtifactRecord(
  entry: PersistedArtifactRecord
): ArtifactRecord | null {
  if (
    typeof entry.id !== "string" ||
    typeof entry.title !== "string" ||
    typeof entry.task_id !== "string" ||
    typeof entry.created_at !== "string"
  ) {
    return null;
  }

  const type = readArtifactType(entry.type);

  return {
    id: entry.id,
    title: entry.title,
    type,
    path: typeof entry.path === "string" ? entry.path : null,
    url: typeof entry.url === "string" ? entry.url : null,
    taskId: entry.task_id,
    createdAt: entry.created_at
  };
}

function readArtifactType(value: unknown): ArtifactType {
  return value === "url" ? "url" : "markdown";
}

function readUrl(value: string | undefined): string {
  const url = value?.trim();

  if (!url) {
    throw new Error("URL artifact requires a URL.");
  }

  return url;
}

function normalizeMarkdownSource(title: string, source: string): string {
  const trimmedSource = source.trim();

  if (!trimmedSource) {
    return `# ${title}\n`;
  }

  if (trimmedSource.startsWith("#")) {
    return `${trimmedSource}\n`;
  }

  return `# ${title}\n\n${trimmedSource}\n`;
}

function toPersistedManifest(manifest: ArtifactManifest) {
  return {
    version: manifest.version,
    artifacts: manifest.artifacts.map((artifact) => ({
      id: artifact.id,
      title: artifact.title,
      type: artifact.type,
      path: artifact.path,
      url: artifact.url,
      task_id: artifact.taskId,
      created_at: artifact.createdAt
    }))
  };
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "artifact";
}
