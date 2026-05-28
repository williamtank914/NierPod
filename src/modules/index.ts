import type { FutureModuleBoundary } from "../shared/domain";
import { projectDomainBoundary } from "../domain/project";
import { taskDomainBoundary } from "../domain/task";
import { artifactModuleBoundary } from "./artifacts";
import { journalModuleBoundary } from "./journal";
import { markdownModuleBoundary } from "./markdown";
import { memoryModuleBoundary } from "./memory";
import { promptPackModuleBoundary } from "./prompt-pack";
import { searchModuleBoundary } from "./search";
import { workspaceModuleBoundary } from "./workspace";

export const futureModuleBoundaries: FutureModuleBoundary[] = [
  workspaceModuleBoundary,
  projectDomainBoundary,
  taskDomainBoundary,
  markdownModuleBoundary,
  searchModuleBoundary,
  promptPackModuleBoundary,
  journalModuleBoundary,
  memoryModuleBoundary,
  artifactModuleBoundary
];

export type { FutureModuleBoundary } from "../shared/domain";
