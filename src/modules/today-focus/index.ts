import { readFile, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { readWorkspaceModel } from "../workspace";
import type {
  FutureModuleBoundary,
  Project,
  Task,
  TaskPriority,
  TaskStatus,
  TodayFocusItem,
  TodayFocusOverrideAction,
  WorkspaceModel
} from "../../shared/domain";

export const todayFocusModuleBoundary: FutureModuleBoundary = {
  name: "Today Focus",
  phase: "phase-1",
  status: "implemented",
  extendsFrom: "src/modules/today-focus/index.ts",
  responsibility:
    "Own cross-Project active Task focus selection, ordering, and daily overrides in Phase 1."
};

export type TodayFocusOptions = {
  today?: string;
};

type FocusCandidate = TodayFocusItem & {
  dueRank: number;
  priorityRank: number;
  statusRank: number;
  activityRank: number;
  projectRank: number;
  taskRank: number;
};

type TodayFocusOverrideRecord = {
  date: string;
  taskId: string;
  action: TodayFocusOverrideAction;
};

const focusStatuses = new Set<TaskStatus>(["ready", "in_progress", "blocked"]);
const priorityRanks = new Map<TaskPriority, number>([
  ["p0", 0],
  ["p1", 1],
  ["p2", 2],
  ["p3", 3]
]);
const statusRanks = new Map<TaskStatus, number>([
  ["in_progress", 0],
  ["ready", 1],
  ["blocked", 2]
]);

export async function readTodayFocusItems(
  workspacePath: string,
  options: TodayFocusOptions = {}
): Promise<TodayFocusItem[]> {
  const model = await readWorkspaceModel(workspacePath);
  const today = options.today ?? getLocalDateKey(new Date());
  const overrides = await readTodayFocusOverrides(workspacePath);
  const overrideByTaskId = new Map(
    overrides
      .filter((override) => override.date === today)
      .map((override) => [override.taskId, override.action])
  );
  const candidates: FocusCandidate[] = [];

  for (const [projectRank, project] of model.activeProjects.entries()) {
    for (const task of project.tasks) {
      if (!focusStatuses.has(task.status)) {
        continue;
      }

      const override = overrideByTaskId.get(task.id) ?? null;

      if (override === "hide" || override === "snooze") {
        continue;
      }

      candidates.push({
        task,
        project,
        override,
        dueRank: readDueRank(task, today),
        priorityRank: priorityRanks.get(task.priority) ?? 99,
        statusRank: statusRanks.get(task.status) ?? 99,
        activityRank: await readActivityRank(task, project),
        projectRank,
        taskRank: readProjectTaskRank(project, task)
      });
    }
  }

  return candidates
    .sort(compareFocusCandidates)
    .map(({ task, project, override }) => ({
      task,
      project,
      override
    }));
}

export async function setTodayFocusOverride(
  workspacePath: string,
  taskId: string,
  action: TodayFocusOverrideAction,
  options: TodayFocusOptions = {}
): Promise<void> {
  const today = options.today ?? getLocalDateKey(new Date());
  const existing = await readTodayFocusOverrides(workspacePath);
  const next = [
    ...existing.filter(
      (override) => !(override.date === today && override.taskId === taskId)
    ),
    {
      date: today,
      taskId,
      action
    }
  ];

  await writeTodayFocusOverrides(workspacePath, next);
}

async function readTodayFocusOverrides(
  workspacePath: string
): Promise<TodayFocusOverrideRecord[]> {
  try {
    const source = await readFile(getTodayPath(workspacePath), "utf8");

    return source
      .split("\n")
      .map((line) =>
        /^\|\s*(\d{4}-\d{2}-\d{2})\s*\|\s*([^|]+?)\s*\|\s*(pin|snooze|hide)\s*\|$/.exec(
          line.trim()
        )
      )
      .filter((match): match is RegExpExecArray => match !== null)
      .map((match) => ({
        date: match[1],
        taskId: match[2].trim(),
        action: match[3] as TodayFocusOverrideAction
      }));
  } catch {
    return [];
  }
}

async function writeTodayFocusOverrides(
  workspacePath: string,
  overrides: TodayFocusOverrideRecord[]
): Promise<void> {
  const sortedOverrides = [...overrides].sort((left, right) => {
    const dateCompare = left.date.localeCompare(right.date);

    return dateCompare === 0 ? left.taskId.localeCompare(right.taskId) : dateCompare;
  });
  const rows = sortedOverrides.map(
    (override) =>
      `| ${override.date} | ${override.taskId} | ${override.action} |`
  );

  await writeFile(
    getTodayPath(workspacePath),
    `# Today

Daily Today Focus state. Overrides affect only the date recorded here.

## Overrides

| Date | Task ID | Action |
| --- | --- | --- |
${rows.join("\n")}
`,
    "utf8"
  );
}

function compareFocusCandidates(
  left: FocusCandidate,
  right: FocusCandidate
): number {
  return (
    readOverrideRank(left.override) - readOverrideRank(right.override) ||
    left.dueRank - right.dueRank ||
    left.priorityRank - right.priorityRank ||
    left.statusRank - right.statusRank ||
    right.activityRank - left.activityRank ||
    left.projectRank - right.projectRank ||
    left.taskRank - right.taskRank ||
    left.task.title.localeCompare(right.task.title)
  );
}

function readOverrideRank(override: TodayFocusOverrideAction | null): number {
  return override === "pin" ? 0 : 1;
}

function readDueRank(task: Task, today: string): number {
  return task.dueDate && task.dueDate <= today ? 0 : 1;
}

async function readActivityRank(task: Task, project: Project): Promise<number> {
  const taskActivity = await readMtime(task.markdownPath);
  const projectActivity = await readMtime(project.markdownPath);

  return Math.max(taskActivity, projectActivity);
}

async function readMtime(pathname: string): Promise<number> {
  try {
    return (await stat(pathname)).mtimeMs;
  } catch {
    return 0;
  }
}

function readProjectTaskRank(project: Project, task: Task): number {
  const rank = project.taskOrder.indexOf(task.id);

  return rank === -1 ? Number.MAX_SAFE_INTEGER : rank;
}

function getTodayPath(workspacePath: string): string {
  return join(resolve(workspacePath), "today.md");
}

function getLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export type { TodayFocusItem, TodayFocusOverrideAction, WorkspaceModel };
