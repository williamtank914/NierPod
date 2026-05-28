export type FutureModuleBoundary = {
  name: string;
  phase: "phase-1-placeholder" | "phase-1";
  status: "not-implemented" | "implemented";
  extendsFrom: `src/${string}`;
  responsibility: string;
};

export type WorkspaceMarkdownKind =
  | "workspace"
  | "projects"
  | "inbox"
  | "memory"
  | "journal"
  | "artifact-manifest"
  | "llm-notes"
  | "markdown";

export type WorkspaceMarkdownFile = {
  relativePath: string;
  title: string;
  kind: WorkspaceMarkdownKind;
  required: boolean;
};

export type WorkspaceSnapshot = {
  rootPath: string;
  folderName: string;
  title: string;
  source: "markdown";
  requiredFiles: string[];
  markdownFiles: WorkspaceMarkdownFile[];
  projectCount: number;
  projects: Project[];
  activeProjects: Project[];
};

export type WorkspaceState = {
  phase: "phase-1";
  settings: {
    storage: "app-user-data";
    settingsFilePath: string;
  };
  current: WorkspaceSnapshot | null;
  message: string;
};

export type ProjectStatus = "active" | "archived";
export type TaskStatus =
  | "backlog"
  | "ready"
  | "in_progress"
  | "blocked"
  | "done"
  | "archived";
export type TaskPriority = "p0" | "p1" | "p2" | "p3";
export type TaskLane = "main" | "parallel" | "optional";

export type TaskTodo = {
  id: string;
  text: string;
  completed: boolean;
};

export type ArtifactType = "markdown" | "url";

export type ArtifactRecord = {
  id: string;
  title: string;
  type: ArtifactType;
  path: string | null;
  url: string | null;
  taskId: string;
  createdAt: string;
};

export type ArtifactInput = {
  type: ArtifactType;
  title: string;
  markdownContent?: string;
  url?: string;
};

export type Task = {
  id: string;
  projectId: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  lane: TaskLane;
  dueDate: string | null;
  dependencies: string[];
  context: string;
  todos: TaskTodo[];
  progress: string;
  artifacts: ArtifactRecord[];
  acceptanceCriteria: string;
  markdownPath: string;
};

export type TaskInput = {
  title: string;
};

export type TaskTodoInput = {
  text: string;
  completed: boolean;
};

export type TaskUpdateInput = {
  title?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  lane?: TaskLane;
  dueDate?: string | null;
  dependencies?: string[];
  context?: string;
  todos?: TaskTodoInput[];
  progress?: string;
  acceptanceCriteria?: string;
};

export type Project = {
  id: string;
  title: string;
  goal: string;
  successCriteria: string;
  status: ProjectStatus;
  deadline: string | null;
  taskOrder: string[];
  tasks: Task[];
  markdownPath: string;
};

export type ProjectInput = {
  title: string;
  goal: string;
  successCriteria: string;
  status: ProjectStatus;
  deadline?: string | null;
};

export type WorkspaceModel = {
  rootPath: string;
  projects: Project[];
  activeProjects: Project[];
};
