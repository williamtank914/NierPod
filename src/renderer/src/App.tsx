import { useEffect, useMemo, useState } from "react";
import type {
  ArtifactInput,
  ArtifactRecord,
  ArtifactType,
  InboxItem,
  MemoryDocument,
  MemoryDraft,
  ProjectInput,
  ProjectStatus,
  PromptOutputDraft,
  PromptPack,
  PromptPackIntent,
  TaskLane,
  TaskPriority,
  TaskStatus,
  TaskTodoInput,
  TodayFocusItem,
  TodayFocusOverrideAction,
  WorkspaceMarkdownFile,
  WorkspaceState
} from "../../shared/domain";
import type {
  InboxMutationResult,
  IpcResponse,
  MemoryReplacementIpcResult,
  PromptOutputSaveResult,
  WorkspaceActionResult,
  WorkspaceMutationResult
} from "../../shared/ipc";

type WorkspaceAction = "select" | "create";

type ProjectDraft = {
  title: string;
  goal: string;
  successCriteria: string;
  status: ProjectStatus;
  deadline: string;
};

type TaskDraft = {
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  lane: TaskLane;
  dueDate: string;
  dependencies: string;
  context: string;
  todos: TaskTodoInput[];
  progress: string;
  acceptanceCriteria: string;
  newTodo: string;
};

type ArtifactDraft = {
  type: ArtifactType;
  title: string;
  url: string;
  markdownContent: string;
};

const emptyProjectDraft: ProjectDraft = {
  title: "",
  goal: "",
  successCriteria: "",
  status: "active",
  deadline: ""
};

const emptyTaskDraft: TaskDraft = {
  title: "",
  status: "backlog",
  priority: "p2",
  lane: "main",
  dueDate: "",
  dependencies: "",
  context: "",
  todos: [],
  progress: "",
  acceptanceCriteria: "",
  newTodo: ""
};

const emptyArtifactDraft: ArtifactDraft = {
  type: "markdown",
  title: "",
  url: "",
  markdownContent: ""
};

const promptPackIntentOptions: Array<{
  intent: PromptPackIntent;
  label: string;
}> = [
  { intent: "plan_project", label: "Plan this project" },
  { intent: "break_down_task", label: "Break down this task" },
  { intent: "review_risks", label: "Review risks" },
  { intent: "define_acceptance_criteria", label: "Define acceptance criteria" },
  { intent: "summarize_memory", label: "Summarize memory" },
  { intent: "suggest_today_focus", label: "Suggest today focus" }
];

const fallbackWorkspaceState: WorkspaceState = {
  phase: "phase-1",
  settings: {
    storage: "app-user-data",
    settingsFilePath: "Unavailable"
  },
  current: null,
  message:
    "NierPod bridge is unavailable. Workspace file access cannot run in this renderer."
};

export function App() {
  const bridgeName = window.nierpod?.appName ?? "NierPod";
  const [workspaceState, setWorkspaceState] = useState<WorkspaceState>(
    fallbackWorkspaceState
  );
  const [workspaceAccess, setWorkspaceAccess] = useState(
    "Checking workspace bridge."
  );
  const [busyAction, setBusyAction] = useState<WorkspaceAction | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [projectDraft, setProjectDraft] =
    useState<ProjectDraft>(emptyProjectDraft);
  const [projectEditDraft, setProjectEditDraft] =
    useState<ProjectDraft>(emptyProjectDraft);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDraft, setTaskDraft] = useState<TaskDraft>(emptyTaskDraft);
  const [artifactDraft, setArtifactDraft] =
    useState<ArtifactDraft>(emptyArtifactDraft);
  const [journalDraft, setJournalDraft] = useState("");
  const [todayFocusItems, setTodayFocusItems] = useState<TodayFocusItem[]>([]);
  const [inboxItems, setInboxItems] = useState<InboxItem[]>([]);
  const [inboxCaptureText, setInboxCaptureText] = useState("");
  const [promptIntent, setPromptIntent] =
    useState<PromptPackIntent>("plan_project");
  const [includeWholeProjectAnalysis, setIncludeWholeProjectAnalysis] =
    useState(false);
  const [promptPack, setPromptPack] = useState<PromptPack | null>(null);
  const [promptOutputText, setPromptOutputText] = useState("");
  const [promptOutputDraft, setPromptOutputDraft] =
    useState<PromptOutputDraft | null>(null);
  const [promptMessage, setPromptMessage] = useState("");
  const [memoryDocument, setMemoryDocument] = useState<MemoryDocument | null>(
    null
  );
  const [memoryDraftText, setMemoryDraftText] = useState("");
  const [memoryDraft, setMemoryDraft] = useState<MemoryDraft | null>(null);
  const [memoryMessage, setMemoryMessage] = useState("");
  const workspace = workspaceState.current;
  const projects = workspace?.activeProjects ?? [];
  const selectedProject =
    projects.find((project) => project.id === selectedProjectId) ?? null;
  const selectedTask =
    selectedProject?.tasks.find((task) => task.id === selectedTaskId) ?? null;
  const requiredFiles = useMemo(
    () =>
      workspace?.markdownFiles.filter((markdownFile) => markdownFile.required) ??
      [],
    [workspace]
  );
  const optionalMarkdownFiles = useMemo(
    () =>
      workspace?.markdownFiles.filter((markdownFile) => !markdownFile.required) ??
      [],
    [workspace]
  );

  useEffect(() => {
    let isCurrent = true;

    async function loadWorkspace() {
      const bridge = window.nierpod;

      if (!bridge) {
        return;
      }

      const [accessResponse, stateResponse] = await Promise.all([
        bridge.workspace.describeAccess(),
        bridge.workspace.getCurrent()
      ]);

      if (!isCurrent) {
        return;
      }

      setWorkspaceAccess(
        accessResponse.ok ? accessResponse.data.message : accessResponse.error.message
      );
      applyWorkspaceStateResponse(stateResponse);
    }

    void loadWorkspace();

    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    if (!workspace) {
      setSelectedProjectId(null);
      setSelectedTaskId(null);
      return;
    }

    if (
      selectedProjectId &&
      workspace.activeProjects.some((project) => project.id === selectedProjectId)
    ) {
      return;
    }

    setSelectedProjectId(workspace.activeProjects[0]?.id ?? null);
    setSelectedTaskId(null);
  }, [selectedProjectId, workspace]);

  useEffect(() => {
    if (!selectedProject) {
      setProjectEditDraft(emptyProjectDraft);
      return;
    }

    setProjectEditDraft({
      title: selectedProject.title,
      goal: selectedProject.goal,
      successCriteria: selectedProject.successCriteria,
      status: selectedProject.status,
      deadline: selectedProject.deadline ?? ""
    });
  }, [selectedProject]);

  useEffect(() => {
    const bridge = window.nierpod;

    if (!bridge || !selectedProjectId) {
      setJournalDraft("");
      return;
    }

    let isCurrent = true;
    const projectId = selectedProjectId;
    const workspaceBridge = bridge.workspace;

    async function loadJournal() {
      const response = await workspaceBridge.readProjectJournal(projectId);

      if (isCurrent) {
        setJournalDraft(response.ok ? response.data.source : response.error.message);
      }
    }

    void loadJournal();

    return () => {
      isCurrent = false;
    };
  }, [selectedProjectId]);

  useEffect(() => {
    if (!selectedTask) {
      setTaskDraft(emptyTaskDraft);
      setArtifactDraft(emptyArtifactDraft);
      return;
    }

    setTaskDraft({
      title: selectedTask.title,
      status: selectedTask.status,
      priority: selectedTask.priority,
      lane: selectedTask.lane,
      dueDate: selectedTask.dueDate ?? "",
      dependencies: selectedTask.dependencies.join(", "),
      context: selectedTask.context,
      todos: selectedTask.todos.map((todo) => ({
        text: todo.text,
        completed: todo.completed
      })),
      progress: selectedTask.progress,
      acceptanceCriteria: selectedTask.acceptanceCriteria,
      newTodo: ""
    });
  }, [selectedTask]);

  useEffect(() => {
    const bridge = window.nierpod;

    if (!bridge || !workspace) {
      setTodayFocusItems([]);
      return;
    }

    let isCurrent = true;
    const workspaceBridge = bridge.workspace;

    async function loadTodayFocus() {
      const response = await workspaceBridge.getTodayFocus();

      if (isCurrent) {
        setTodayFocusItems(response.ok ? response.data : []);
      }
    }

    void loadTodayFocus();

    return () => {
      isCurrent = false;
    };
  }, [workspace]);

  useEffect(() => {
    const bridge = window.nierpod;

    if (!bridge || !workspace) {
      setMemoryDocument(null);
      return;
    }

    let isCurrent = true;
    const workspaceBridge = bridge.workspace;

    async function loadMemory() {
      const response = await workspaceBridge.readMemory();

      if (isCurrent) {
        setMemoryDocument(response.ok ? response.data : null);
        setMemoryMessage(response.ok ? "" : response.error.message);
      }
    }

    void loadMemory();

    return () => {
      isCurrent = false;
    };
  }, [workspace]);

  useEffect(() => {
    const bridge = window.nierpod;

    if (!bridge || !workspace) {
      setInboxItems([]);
      return;
    }

    let isCurrent = true;
    const workspaceBridge = bridge.workspace;

    async function loadInbox() {
      const response = await workspaceBridge.getInboxItems();

      if (isCurrent) {
        setInboxItems(response.ok ? response.data : []);
      }
    }

    void loadInbox();

    return () => {
      isCurrent = false;
    };
  }, [workspace]);

  async function runWorkspaceAction(action: WorkspaceAction) {
    const bridge = window.nierpod;

    if (!bridge || busyAction) {
      return;
    }

    setBusyAction(action);

    const response =
      action === "select"
        ? await bridge.workspace.selectExisting()
        : await bridge.workspace.createNew();

    applyWorkspaceActionResponse(response);
    setBusyAction(null);
  }

  async function createProjectFromDraft() {
    const bridge = window.nierpod;

    if (!bridge || !workspace || !projectDraft.title.trim()) {
      return;
    }

    const response = await bridge.workspace.createProject(toProjectInput(projectDraft));
    applyWorkspaceMutationResponse(response);

    if (response.ok) {
      setSelectedProjectId(response.data.projectId ?? null);
      setProjectDraft(emptyProjectDraft);
    }
  }

  async function saveProject() {
    const bridge = window.nierpod;

    if (!bridge || !selectedProject) {
      return;
    }

    applyWorkspaceMutationResponse(
      await bridge.workspace.updateProject(
        selectedProject.id,
        toProjectInput(projectEditDraft)
      )
    );
  }

  async function archiveSelectedProject() {
    const bridge = window.nierpod;

    if (!bridge || !selectedProject) {
      return;
    }

    applyWorkspaceMutationResponse(
      await bridge.workspace.archiveProject(selectedProject.id)
    );
  }

  async function createTaskFromTitle() {
    const bridge = window.nierpod;

    if (!bridge || !selectedProject || !taskTitle.trim()) {
      return;
    }

    const response = await bridge.workspace.createTask(selectedProject.id, {
      title: taskTitle.trim()
    });
    applyWorkspaceMutationResponse(response);

    if (response.ok) {
      setSelectedProjectId(response.data.projectId ?? selectedProject.id);
      setSelectedTaskId(response.data.taskId ?? null);
      setTaskTitle("");
    }
  }

  async function saveTask() {
    const bridge = window.nierpod;

    if (!bridge || !selectedProject || !selectedTask) {
      return;
    }

    const response = await bridge.workspace.updateTask(
      selectedProject.id,
      selectedTask.id,
      {
        title: taskDraft.title,
        status: taskDraft.status,
        priority: taskDraft.priority,
        lane: taskDraft.lane,
        dueDate: taskDraft.dueDate || null,
        dependencies: readDependencyInput(taskDraft.dependencies),
        context: taskDraft.context,
        todos: taskDraft.todos,
        progress: taskDraft.progress,
        acceptanceCriteria: taskDraft.acceptanceCriteria
      }
    );

    applyWorkspaceMutationResponse(response);

    if (response.ok) {
      setSelectedProjectId(response.data.projectId ?? selectedProject.id);
      setSelectedTaskId(response.data.taskId ?? selectedTask.id);
    }
  }

  async function addTaskArtifactFromDraft() {
    const bridge = window.nierpod;

    if (
      !bridge ||
      !selectedProject ||
      !selectedTask ||
      !artifactDraft.title.trim()
    ) {
      return;
    }

    const response = await bridge.workspace.addTaskArtifact(
      selectedProject.id,
      selectedTask.id,
      toArtifactInput(artifactDraft)
    );

    applyWorkspaceMutationResponse(response);

    if (response.ok) {
      setSelectedProjectId(response.data.projectId ?? selectedProject.id);
      setSelectedTaskId(response.data.taskId ?? selectedTask.id);
      setArtifactDraft(emptyArtifactDraft);

      const journalResponse = await bridge.workspace.readProjectJournal(
        response.data.projectId ?? selectedProject.id
      );

      if (journalResponse.ok) {
        setJournalDraft(journalResponse.data.source);
      }
    }
  }

  async function saveJournal() {
    const bridge = window.nierpod;

    if (!bridge || !selectedProject) {
      return;
    }

    applyWorkspaceMutationResponse(
      await bridge.workspace.updateProjectJournal(
        selectedProject.id,
        journalDraft
      )
    );
  }

  async function applyTodayFocusOverride(
    taskId: string,
    action: TodayFocusOverrideAction
  ) {
    const bridge = window.nierpod;

    if (!bridge) {
      return;
    }

    const response = await bridge.workspace.setTodayFocusOverride(taskId, action);

    if (response.ok) {
      setTodayFocusItems(response.data);
    }
  }

  async function captureInboxItemFromDraft() {
    const bridge = window.nierpod;
    const text = inboxCaptureText.trim();

    if (!bridge || !workspace || !text) {
      return;
    }

    const response = await bridge.workspace.captureInboxItem({ text });

    applyInboxMutationResponse(response);

    if (response.ok) {
      setInboxCaptureText("");
    }
  }

  async function convertInboxItemToProject(itemId: string) {
    const bridge = window.nierpod;

    if (!bridge) {
      return;
    }

    const response = await bridge.workspace.convertInboxItemToProject(itemId);

    applyInboxMutationResponse(response);
  }

  async function convertInboxItemToTask(itemId: string) {
    const bridge = window.nierpod;

    if (!bridge || !selectedProject) {
      return;
    }

    const response = await bridge.workspace.convertInboxItemToTask(
      itemId,
      selectedProject.id
    );

    applyInboxMutationResponse(response);
  }

  async function attachInboxItemToContext(itemId: string) {
    const bridge = window.nierpod;

    if (!bridge || !selectedProject || !selectedTask) {
      return;
    }

    const response = await bridge.workspace.attachInboxItemToTaskContext(
      itemId,
      selectedProject.id,
      selectedTask.id
    );

    applyInboxMutationResponse(response);
  }

  async function archiveInboxItem(itemId: string) {
    const bridge = window.nierpod;

    if (!bridge) {
      return;
    }

    applyInboxMutationResponse(await bridge.workspace.archiveInboxItem(itemId));
  }

  async function deleteInboxItem(itemId: string) {
    const bridge = window.nierpod;

    if (!bridge) {
      return;
    }

    applyInboxMutationResponse(await bridge.workspace.deleteInboxItem(itemId));
  }

  async function generatePromptPack(intentOverride?: PromptPackIntent) {
    const bridge = window.nierpod;
    const intent = intentOverride ?? promptIntent;

    if (!bridge || !workspace) {
      return;
    }

    const response = await bridge.workspace.buildPromptPack({
      intent,
      projectId: selectedProject?.id ?? null,
      taskId: selectedTask?.id ?? null,
      includeWholeProjectAnalysis
    });

    if (!response.ok) {
      setPromptMessage(response.error.message);
      return;
    }

    setPromptIntent(intent);
    setPromptPack(response.data);
    setPromptOutputDraft(null);
    setPromptMessage("");
  }

  async function copyPrompt() {
    const clipboard = navigator.clipboard as
      | { writeText: (text: string) => Promise<void> }
      | undefined;

    if (!promptPack || !clipboard) {
      setPromptMessage("Clipboard is unavailable.");
      return;
    }

    await clipboard.writeText(promptPack.promptMarkdown);
    setPromptMessage("Prompt copied.");
  }

  function stagePromptOutput() {
    if (!promptPack || !promptOutputText.trim()) {
      return;
    }

    setPromptOutputDraft({
      intent: promptPack.intent,
      projectId: selectedProject?.id ?? null,
      taskId: selectedTask?.id ?? null,
      promptMarkdown: promptPack.promptMarkdown,
      outputMarkdown: promptOutputText,
      factStatus: "not_fact",
      availableActions: ["discard", "save_llm_note", "manual_apply"]
    });
    setPromptMessage("LLM output staged as non-factual draft.");
  }

  function discardPromptOutput() {
    setPromptOutputText("");
    setPromptOutputDraft(null);
    setPromptMessage("LLM output discarded.");
  }

  async function savePromptOutput() {
    const bridge = window.nierpod;

    if (!bridge || !promptOutputDraft) {
      return;
    }

    const response = await bridge.workspace.savePromptOutputAsLlmNote(
      promptOutputDraft
    );

    applyPromptOutputSaveResponse(response);
  }

  function applyPromptOutputSaveResponse(
    response: IpcResponse<PromptOutputSaveResult>
  ) {
    if (!response.ok) {
      setPromptMessage(response.error.message);
      return;
    }

    setWorkspaceState(response.data.state);
    setPromptOutputText("");
    setPromptOutputDraft(null);
    setPromptMessage(`LLM note saved to ${response.data.note.relativePath}.`);
  }

  function stageMemoryReplacementDraft() {
    const draftMarkdown = `${memoryDraftText.trimEnd()}\n`;

    if (!draftMarkdown.trim()) {
      return;
    }

    setMemoryDraft({
      draftMarkdown,
      requiresConfirmation: true
    });
    setMemoryMessage("Memory draft staged.");
  }

  function cancelMemoryReplacement() {
    setMemoryDraft(null);
    setMemoryMessage("Memory replacement canceled.");
  }

  async function replaceMemory() {
    const bridge = window.nierpod;

    if (!bridge || !memoryDraft) {
      return;
    }

    const response = await bridge.workspace.replaceMemory(memoryDraft);

    applyMemoryReplacementResponse(response);
  }

  function applyMemoryReplacementResponse(
    response: IpcResponse<MemoryReplacementIpcResult>
  ) {
    if (!response.ok) {
      setMemoryMessage(response.error.message);
      return;
    }

    setWorkspaceState(response.data.state);
    setMemoryDocument(response.data.current);
    setMemoryDraft(null);
    setMemoryDraftText("");
    setMemoryMessage(
      `Archived previous Memory to ${response.data.archiveRelativePath}.`
    );
  }

  function applyInboxMutationResponse(
    response: IpcResponse<InboxMutationResult>
  ) {
    if (!response.ok) {
      setWorkspaceState({
        ...fallbackWorkspaceState,
        message: response.error.message
      });
      return;
    }

    setWorkspaceState(response.data.state);
    setInboxItems(response.data.inboxItems);

    if (response.data.projectId) {
      setSelectedProjectId(response.data.projectId);
    }

    if (response.data.taskId) {
      setSelectedTaskId(response.data.taskId);
    }
  }

  function addTodo() {
    const text = taskDraft.newTodo.trim();

    if (!text) {
      return;
    }

    setTaskDraft({
      ...taskDraft,
      todos: [...taskDraft.todos, { text, completed: false }],
      newTodo: ""
    });
  }

  function applyWorkspaceStateResponse(response: IpcResponse<WorkspaceState>) {
    setWorkspaceState(
      response.ok
        ? response.data
        : {
            ...fallbackWorkspaceState,
            message: response.error.message
          }
    );
  }

  function applyWorkspaceActionResponse(
    response: IpcResponse<WorkspaceActionResult>
  ) {
    setWorkspaceState(
      response.ok
        ? response.data.state
        : {
            ...fallbackWorkspaceState,
            message: response.error.message
          }
    );
  }

  function applyWorkspaceMutationResponse(
    response: IpcResponse<WorkspaceMutationResult>
  ) {
    setWorkspaceState(
      response.ok
        ? response.data.state
        : {
            ...fallbackWorkspaceState,
            message: response.error.message
          }
    );
  }

  return (
    <main className="app-shell" aria-label="NierPod workbench">
      <nav className="sidebar" aria-label="Workspace navigation">
        <div className="brand-row">
          <div className="brand-mark" aria-hidden="true">
            NP
          </div>
          <div>
            <p className="eyebrow">Phase 1</p>
            <h1 id="app-title">{bridgeName}</h1>
          </div>
        </div>

        <section className="workspace-entry" aria-labelledby="workspace-title">
          <div>
            <h2 id="workspace-title">Workspace</h2>
            <p>{workspaceState.message}</p>
          </div>

          <div className="workspace-actions">
            <button
              className="workspace-button"
              type="button"
              onClick={() => void runWorkspaceAction("select")}
              disabled={busyAction !== null}
            >
              {busyAction === "select" ? "Opening..." : "Open Folder"}
            </button>
            <button
              className="workspace-button primary"
              type="button"
              onClick={() => void runWorkspaceAction("create")}
              disabled={busyAction !== null}
            >
              {busyAction === "create" ? "Creating..." : "Create Workspace"}
            </button>
          </div>

          {workspace ? (
            <dl className="workspace-facts">
              <div>
                <dt>Current</dt>
                <dd>{workspace.title}</dd>
              </div>
              <div>
                <dt>Path</dt>
                <dd>{workspace.rootPath}</dd>
              </div>
              <div>
                <dt>Markdown</dt>
                <dd>{workspace.markdownFiles.length} files</dd>
              </div>
            </dl>
          ) : null}

          <p className="bridge-copy">{workspaceAccess}</p>
        </section>

        {workspace ? (
          <InboxPanel
            items={inboxItems}
            captureText={inboxCaptureText}
            canConvertToTask={selectedProject !== null}
            canAttachToTask={selectedTask !== null}
            onCaptureTextChange={setInboxCaptureText}
            onCapture={() => void captureInboxItemFromDraft()}
            onConvertToProject={(itemId) => void convertInboxItemToProject(itemId)}
            onConvertToTask={(itemId) => void convertInboxItemToTask(itemId)}
            onAttachToTask={(itemId) => void attachInboxItemToContext(itemId)}
            onArchive={(itemId) => void archiveInboxItem(itemId)}
            onDelete={(itemId) => void deleteInboxItem(itemId)}
          />
        ) : null}

        {workspace ? (
          <section className="workspace-entry" aria-labelledby="project-form-title">
            <h2 id="project-form-title">New Project</h2>
            <ProjectDraftFields
              draft={projectDraft}
              labels={{
                title: "Project title",
                goal: "Project goal",
                successCriteria: "Success criteria",
                status: "Project status",
                deadline: "Project deadline"
              }}
              onChange={setProjectDraft}
            />
            <button
              className="workspace-button primary"
              type="button"
              onClick={() => void createProjectFromDraft()}
            >
              Create Project
            </button>
          </section>
        ) : null}

        <section aria-labelledby="navigation-title">
          <h2 id="navigation-title">Projects</h2>
          <div className="nav-stack">
            {projects.length > 0 ? (
              projects.map((project) => (
                <button
                  className="nav-button"
                  type="button"
                  key={project.id}
                  onClick={() => {
                    setSelectedProjectId(project.id);
                    setSelectedTaskId(project.tasks[0]?.id ?? null);
                  }}
                >
                  {project.title}
                </button>
              ))
            ) : (
              <p>No active Projects.</p>
            )}
          </div>
        </section>

        <section aria-labelledby="context-title">
          <h2 id="context-title">Workspace Context</h2>
          <div className="nav-stack compact">
            <a href="#memory">Memory</a>
            <a href="#prompt-pack">Prompt Pack</a>
          </div>
        </section>
      </nav>

      <section
        className="timeline-panel"
        aria-label="Task timeline"
        id="task-timeline"
      >
        <TodayFocusPanel
          items={todayFocusItems}
          hasWorkspace={workspace !== null}
          onSelect={(projectId, taskId) => {
            setSelectedProjectId(projectId);
            setSelectedTaskId(taskId);
          }}
          onOverride={(taskId, action) =>
            void applyTodayFocusOverride(taskId, action)
          }
        />

        <div className="panel-header">
          <p className="eyebrow">Task timeline</p>
          <h2>{selectedProject?.title ?? "Workspace Status"}</h2>
        </div>

        {selectedProject ? (
          <>
            <section className="inline-form" aria-labelledby="task-form-title">
              <h3 id="task-form-title">New Task</h3>
              <label>
                <span>Task title</span>
                <input
                  value={taskTitle}
                  onInput={(event) => setTaskTitle(event.currentTarget.value)}
                />
              </label>
              <button
                className="workspace-button primary"
                type="button"
                onClick={() => void createTaskFromTitle()}
              >
                Create Task
              </button>
            </section>
            <div className="timeline-empty">
              <div className="timeline-rail" aria-hidden="true" />
              {selectedProject.tasks.length > 0 ? (
                selectedProject.tasks.map((task) => (
                  <button
                    className="timeline-task"
                    key={task.id}
                    type="button"
                    aria-label={task.title}
                    onClick={() => setSelectedTaskId(task.id)}
                  >
                    <span>{task.title}</span>
                    <small>{task.status}</small>
                  </button>
                ))
              ) : (
                <WorkspaceStatusItem
                  title="Projects"
                  id="projects"
                  copy="0 Tasks in this Project."
                />
              )}
            </div>
          </>
        ) : workspace ? (
          <div className="timeline-empty">
            <div className="timeline-rail" aria-hidden="true" />
            <WorkspaceStatusItem
              title="Projects"
              id="projects"
              copy={`${workspace.projectCount} Project Markdown files found.`}
            />
          </div>
        ) : (
          <div className="timeline-empty">
            <div className="timeline-rail" aria-hidden="true" />
            <WorkspaceStatusItem
              title="Today Focus"
              id="today-focus"
              copy="No workspace selected."
            />
            <WorkspaceStatusItem
              title="Inbox"
              id="inbox"
              copy="Create or open a workspace to load the Markdown inbox."
            />
            <WorkspaceStatusItem
              title="Projects"
              id="projects"
              copy="Project and Task state will be reconstructed from Markdown."
            />
          </div>
        )}
      </section>

      <aside
        className="detail-panel"
        aria-label="Task detail and artifacts"
        id="task-detail"
      >
        <div className="panel-header">
          <p className="eyebrow">Source of truth</p>
          <h2>{selectedTask ? "Task detail" : "Markdown Files"}</h2>
        </div>

        {selectedTask ? (
          <TaskDetailEditor
            draft={taskDraft}
            artifacts={selectedTask.artifacts}
            artifactDraft={artifactDraft}
            onChange={setTaskDraft}
            onArtifactChange={setArtifactDraft}
            onAddTodo={addTodo}
            onAddArtifact={() => void addTaskArtifactFromDraft()}
            onSave={() => void saveTask()}
          />
        ) : selectedProject ? (
          <section className="detail-section" aria-labelledby="project-edit-title">
            <h3 id="project-edit-title">Project Detail</h3>
            <ProjectDraftFields
              draft={projectEditDraft}
              labels={{
                title: "Selected project title",
                goal: "Selected project goal",
                successCriteria: "Selected success criteria",
                status: "Selected project status",
                deadline: "Selected project deadline"
              }}
              onChange={setProjectEditDraft}
            />
            <div className="workspace-actions">
              <button
                className="workspace-button primary"
                type="button"
                onClick={() => void saveProject()}
              >
                Save Project
              </button>
              <button
                className="workspace-button"
                type="button"
                onClick={() => void archiveSelectedProject()}
              >
                Archive Project
              </button>
            </div>
          </section>
        ) : (
          <>
            <section className="detail-section" aria-labelledby="required-title">
              <h3 id="required-title">Required Files</h3>
              {requiredFiles.length > 0 ? (
                <MarkdownFileList files={requiredFiles} />
              ) : (
                <p>No workspace files loaded.</p>
              )}
            </section>

            <section className="detail-section" aria-labelledby="optional-title">
              <h3 id="optional-title">Additional Markdown</h3>
              {optionalMarkdownFiles.length > 0 ? (
                <MarkdownFileList files={optionalMarkdownFiles} />
              ) : (
                <p>No additional Markdown files found.</p>
              )}
            </section>
          </>
        )}

        {selectedProject ? (
          <ProjectJournalEditor
            source={journalDraft}
            onChange={setJournalDraft}
            onSave={() => void saveJournal()}
          />
        ) : null}

        <section className="detail-section" aria-labelledby="settings-title">
          <h3 id="settings-title">Settings Isolation</h3>
          <p>
            App settings are stored outside the workspace at{" "}
            <code>{workspaceState.settings.settingsFilePath}</code>.
          </p>
        </section>

        <MemoryWorkflowPanel
          memory={memoryDocument}
          draftText={memoryDraftText}
          stagedDraft={memoryDraft}
          message={memoryMessage}
          onDraftTextChange={setMemoryDraftText}
          onGeneratePrompt={() => void generatePromptPack("summarize_memory")}
          onStageDraft={stageMemoryReplacementDraft}
          onCancelReplacement={cancelMemoryReplacement}
          onReplaceMemory={() => void replaceMemory()}
        />

        <PromptPackPanel
          intent={promptIntent}
          intents={promptPackIntentOptions}
          includeWholeProjectAnalysis={includeWholeProjectAnalysis}
          promptPack={promptPack}
          outputText={promptOutputText}
          outputDraft={promptOutputDraft}
          message={promptMessage}
          canGenerate={workspace !== null}
          onIntentChange={setPromptIntent}
          onWholeProjectChange={setIncludeWholeProjectAnalysis}
          onGenerate={() => void generatePromptPack()}
          onCopy={() => void copyPrompt()}
          onOutputChange={setPromptOutputText}
          onStageOutput={stagePromptOutput}
          onDiscardOutput={discardPromptOutput}
          onSaveOutput={() => void savePromptOutput()}
          onManualApply={() =>
            setPromptMessage("Manual apply flow requires explicit user review.")
          }
        />
      </aside>
    </main>
  );
}

function MemoryWorkflowPanel(props: {
  memory: MemoryDocument | null;
  draftText: string;
  stagedDraft: MemoryDraft | null;
  message: string;
  onDraftTextChange: (text: string) => void;
  onGeneratePrompt: () => void;
  onStageDraft: () => void;
  onCancelReplacement: () => void;
  onReplaceMemory: () => void;
}) {
  return (
    <section className="detail-section memory-panel" aria-labelledby="memory">
      <div className="section-heading-row">
        <h3 id="memory">Memory</h3>
        <button
          className="workspace-button"
          type="button"
          onClick={props.onGeneratePrompt}
        >
          Generate Memory Prompt
        </button>
      </div>

      <div className="memory-source" aria-label="Current Memory">
        <p>{readMemoryPreview(props.memory?.source)}</p>
        <pre>{props.memory?.source ?? "No workspace Memory loaded."}</pre>
      </div>

      <label className="journal-editor">
        <span>Memory draft</span>
        <textarea
          rows={6}
          value={props.draftText}
          onInput={(event) =>
            props.onDraftTextChange(event.currentTarget.value)
          }
        />
      </label>

      <div className="workspace-actions">
        <button
          className="workspace-button"
          type="button"
          onClick={props.onStageDraft}
        >
          Stage Memory Draft
        </button>
        <button
          className="workspace-button primary"
          type="button"
          disabled={props.stagedDraft === null}
          onClick={props.onReplaceMemory}
        >
          Replace Memory
        </button>
      </div>

      {props.stagedDraft ? (
        <div className="confirmation-box">
          <p>Confirm before replacing memory.md.</p>
          <button
            className="workspace-button"
            type="button"
            onClick={props.onCancelReplacement}
          >
            Cancel Memory Replacement
          </button>
        </div>
      ) : null}

      {props.message ? <p className="workflow-message">{props.message}</p> : null}
    </section>
  );
}

function PromptPackPanel(props: {
  intent: PromptPackIntent;
  intents: Array<{ intent: PromptPackIntent; label: string }>;
  includeWholeProjectAnalysis: boolean;
  promptPack: PromptPack | null;
  outputText: string;
  outputDraft: PromptOutputDraft | null;
  message: string;
  canGenerate: boolean;
  onIntentChange: (intent: PromptPackIntent) => void;
  onWholeProjectChange: (enabled: boolean) => void;
  onGenerate: () => void;
  onCopy: () => void;
  onOutputChange: (text: string) => void;
  onStageOutput: () => void;
  onDiscardOutput: () => void;
  onSaveOutput: () => void;
  onManualApply: () => void;
}) {
  return (
    <section className="detail-section prompt-panel" aria-labelledby="prompt-pack">
      <h3 id="prompt-pack">Prompt Pack</h3>

      <div className="form-stack">
        <label>
          <span>Prompt Pack intent</span>
          <select
            value={props.intent}
            onInput={(event) =>
              props.onIntentChange(event.currentTarget.value as PromptPackIntent)
            }
          >
            {props.intents.map((intent) => (
              <option value={intent.intent} key={intent.intent}>
                {intent.label}
              </option>
            ))}
          </select>
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={props.includeWholeProjectAnalysis}
            onChange={(event) =>
              props.onWholeProjectChange(event.currentTarget.checked)
            }
          />
          <span>Include whole-Project analysis</span>
        </label>
      </div>

      <button
        className="workspace-button primary"
        type="button"
        disabled={!props.canGenerate}
        onClick={props.onGenerate}
      >
        Generate Prompt Pack
      </button>

      {props.promptPack ? (
        <div className="prompt-preview">
          <h4>{`Prompt Pack: ${props.promptPack.title}`}</h4>
          <h4>Context Included</h4>
          <ul className="context-list">
            {props.promptPack.contextSummary.map((entry) => (
              <li key={entry}>{entry}</li>
            ))}
          </ul>
          <label>
            <span>Generated Markdown prompt</span>
            <textarea rows={10} readOnly value={props.promptPack.promptMarkdown} />
          </label>
          <button
            className="workspace-button"
            type="button"
            onClick={props.onCopy}
          >
            Copy Prompt
          </button>
        </div>
      ) : null}

      <label className="journal-editor">
        <span>LLM output paste-back</span>
        <textarea
          rows={6}
          value={props.outputText}
          onInput={(event) => props.onOutputChange(event.currentTarget.value)}
        />
      </label>

      <button
        className="workspace-button"
        type="button"
        disabled={props.promptPack === null}
        onClick={props.onStageOutput}
      >
        Stage LLM Output
      </button>

      {props.outputDraft ? (
        <div className="confirmation-box">
          <p>Fact Status: {props.outputDraft.factStatus}</p>
          <div className="workspace-actions">
            <button
              className="workspace-button"
              type="button"
              onClick={props.onDiscardOutput}
            >
              Discard LLM Output
            </button>
            <button
              className="workspace-button primary"
              type="button"
              onClick={props.onSaveOutput}
            >
              Save as LLM Note
            </button>
          </div>
          <button
            className="workspace-button"
            type="button"
            onClick={props.onManualApply}
          >
            Manual Apply
          </button>
        </div>
      ) : null}

      {props.message ? <p className="workflow-message">{props.message}</p> : null}
    </section>
  );
}

function InboxPanel(props: {
  items: InboxItem[];
  captureText: string;
  canConvertToTask: boolean;
  canAttachToTask: boolean;
  onCaptureTextChange: (text: string) => void;
  onCapture: () => void;
  onConvertToProject: (itemId: string) => void;
  onConvertToTask: (itemId: string) => void;
  onAttachToTask: (itemId: string) => void;
  onArchive: (itemId: string) => void;
  onDelete: (itemId: string) => void;
}) {
  return (
    <section className="workspace-entry inbox-panel" aria-labelledby="inbox-title">
      <h2 id="inbox-title">Inbox</h2>
      <label>
        <span>Inbox capture</span>
        <textarea
          rows={3}
          value={props.captureText}
          onInput={(event) =>
            props.onCaptureTextChange(event.currentTarget.value)
          }
        />
      </label>
      <button
        className="workspace-button primary"
        type="button"
        onClick={props.onCapture}
      >
        Capture Inbox Item
      </button>

      <div className="inbox-list">
        {props.items.length > 0 ? (
          props.items.map((item) => (
            <article className="inbox-item" key={item.id}>
              <div>
                <p>{item.text}</p>
                <code>{item.status}</code>
              </div>
              {item.status === "open" ? (
                <div className="inbox-actions">
                  <button
                    type="button"
                    aria-label={`Convert to Project ${item.text}`}
                    onClick={() => props.onConvertToProject(item.id)}
                  >
                    Project
                  </button>
                  <button
                    type="button"
                    aria-label={`Convert to Task ${item.text}`}
                    disabled={!props.canConvertToTask}
                    onClick={() => props.onConvertToTask(item.id)}
                  >
                    Task
                  </button>
                  <button
                    type="button"
                    aria-label={`Attach to Task Context ${item.text}`}
                    disabled={!props.canAttachToTask}
                    onClick={() => props.onAttachToTask(item.id)}
                  >
                    Context
                  </button>
                  <button
                    type="button"
                    aria-label={`Archive ${item.text}`}
                    onClick={() => props.onArchive(item.id)}
                  >
                    Archive
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${item.text}`}
                    onClick={() => props.onDelete(item.id)}
                  >
                    Delete
                  </button>
                </div>
              ) : null}
            </article>
          ))
        ) : (
          <p>No Inbox items.</p>
        )}
      </div>
    </section>
  );
}

function TodayFocusPanel(props: {
  items: TodayFocusItem[];
  hasWorkspace: boolean;
  onSelect: (projectId: string, taskId: string) => void;
  onOverride: (taskId: string, action: TodayFocusOverrideAction) => void;
}) {
  return (
    <section className="today-focus-panel" aria-labelledby="today-focus-title">
      <div className="panel-header compact">
        <p className="eyebrow">Today</p>
        <h2 id="today-focus-title">Today Focus</h2>
      </div>

      {props.hasWorkspace ? (
        props.items.length > 0 ? (
          <div className="focus-list">
            {props.items.map((item) => (
              <article
                className={`focus-item ${
                  item.task.status === "blocked" ? "blocked" : ""
                }`}
                key={item.task.id}
              >
                <button
                  className="focus-main"
                  type="button"
                  onClick={() => props.onSelect(item.project.id, item.task.id)}
                >
                  <span>{item.task.title}</span>
                  <small>{item.project.title}</small>
                </button>
                <div className="focus-meta">
                  <span className="status-pill">{item.task.status}</span>
                  <span>{item.task.priority}</span>
                  {item.task.dueDate ? <span>{item.task.dueDate}</span> : null}
                  {item.override === "pin" ? <span>pinned today</span> : null}
                </div>
                <div className="focus-actions">
                  <button
                    type="button"
                    aria-label={`Pin ${item.task.title}`}
                    onClick={() => props.onOverride(item.task.id, "pin")}
                  >
                    Pin
                  </button>
                  <button
                    type="button"
                    aria-label={`Snooze ${item.task.title}`}
                    onClick={() => props.onOverride(item.task.id, "snooze")}
                  >
                    Snooze
                  </button>
                  <button
                    type="button"
                    aria-label={`Hide ${item.task.title}`}
                    onClick={() => props.onOverride(item.task.id, "hide")}
                  >
                    Hide
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p>No active ready, in progress, or blocked Tasks for today.</p>
        )
      ) : (
        <p>Create or open a workspace to load Today Focus.</p>
      )}
    </section>
  );
}

function ProjectDraftFields(props: {
  draft: ProjectDraft;
  labels: {
    title: string;
    goal: string;
    successCriteria: string;
    status: string;
    deadline: string;
  };
  onChange: (draft: ProjectDraft) => void;
}) {
  return (
    <div className="form-stack">
      <label>
        <span>{props.labels.title}</span>
        <input
          value={props.draft.title}
          onInput={(event) =>
            props.onChange({ ...props.draft, title: event.currentTarget.value })
          }
        />
      </label>
      <label>
        <span>{props.labels.goal}</span>
        <textarea
          rows={2}
          value={props.draft.goal}
          onInput={(event) =>
            props.onChange({ ...props.draft, goal: event.currentTarget.value })
          }
        />
      </label>
      <label>
        <span>{props.labels.successCriteria}</span>
        <textarea
          rows={3}
          value={props.draft.successCriteria}
          onInput={(event) =>
            props.onChange({
              ...props.draft,
              successCriteria: event.currentTarget.value
            })
          }
        />
      </label>
      <label>
        <span>{props.labels.status}</span>
        <select
          value={props.draft.status}
          onInput={(event) =>
            props.onChange({
              ...props.draft,
              status: event.currentTarget.value as ProjectStatus
            })
          }
        >
          <option value="active">active</option>
          <option value="archived">archived</option>
        </select>
      </label>
      <label>
        <span>{props.labels.deadline}</span>
        <input
          type="date"
          value={props.draft.deadline}
          onInput={(event) =>
            props.onChange({ ...props.draft, deadline: event.currentTarget.value })
          }
        />
      </label>
    </div>
  );
}

function TaskDetailEditor(props: {
  draft: TaskDraft;
  artifacts: ArtifactRecord[];
  artifactDraft: ArtifactDraft;
  onChange: (draft: TaskDraft) => void;
  onArtifactChange: (draft: ArtifactDraft) => void;
  onAddTodo: () => void;
  onAddArtifact: () => void;
  onSave: () => void;
}) {
  return (
    <section className="detail-section" aria-labelledby="task-detail-title">
      <h3 id="task-detail-title">Task Fields</h3>
      <div className="form-stack">
        <label>
          <span>Selected task title</span>
          <input
            value={props.draft.title}
            onInput={(event) =>
              props.onChange({ ...props.draft, title: event.currentTarget.value })
            }
          />
        </label>
        <label>
          <span>Task status</span>
          <select
            value={props.draft.status}
            onInput={(event) =>
              props.onChange({
                ...props.draft,
                status: event.currentTarget.value as TaskStatus
              })
            }
          >
            {["backlog", "ready", "in_progress", "blocked", "done", "archived"].map(
              (status) => (
                <option value={status} key={status}>
                  {status}
                </option>
              )
            )}
          </select>
        </label>
        <label>
          <span>Priority</span>
          <select
            value={props.draft.priority}
            onInput={(event) =>
              props.onChange({
                ...props.draft,
                priority: event.currentTarget.value as TaskPriority
              })
            }
          >
            {["p0", "p1", "p2", "p3"].map((priority) => (
              <option value={priority} key={priority}>
                {priority}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Lane</span>
          <select
            value={props.draft.lane}
            onInput={(event) =>
              props.onChange({
                ...props.draft,
                lane: event.currentTarget.value as TaskLane
              })
            }
          >
            {["main", "parallel", "optional"].map((lane) => (
              <option value={lane} key={lane}>
                {lane}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Due date</span>
          <input
            type="date"
            value={props.draft.dueDate}
            onInput={(event) =>
              props.onChange({ ...props.draft, dueDate: event.currentTarget.value })
            }
          />
        </label>
        <label>
          <span>Dependencies</span>
          <input
            value={props.draft.dependencies}
            onInput={(event) =>
              props.onChange({
                ...props.draft,
                dependencies: event.currentTarget.value
              })
            }
          />
        </label>
        <label>
          <span>Context</span>
          <textarea
            rows={4}
            value={props.draft.context}
            onInput={(event) =>
              props.onChange({ ...props.draft, context: event.currentTarget.value })
            }
          />
        </label>
        <label>
          <span>Progress</span>
          <textarea
            rows={3}
            value={props.draft.progress}
            onInput={(event) =>
              props.onChange({ ...props.draft, progress: event.currentTarget.value })
            }
          />
        </label>
        <label>
          <span>Acceptance Criteria</span>
          <textarea
            rows={3}
            value={props.draft.acceptanceCriteria}
            onInput={(event) =>
              props.onChange({
                ...props.draft,
                acceptanceCriteria: event.currentTarget.value
              })
            }
          />
        </label>
      </div>

      <div className="todo-editor">
        <label>
          <span>New todo</span>
          <input
            value={props.draft.newTodo}
            onInput={(event) =>
              props.onChange({ ...props.draft, newTodo: event.currentTarget.value })
            }
          />
        </label>
        <button className="workspace-button" type="button" onClick={props.onAddTodo}>
          Add Todo
        </button>
        <div className="todo-list">
          {props.draft.todos.map((todo, index) => (
            <label className="todo-row" key={`${todo.text}-${index}`}>
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={(event) => {
                  const nextTodos = props.draft.todos.map((candidate, todoIndex) =>
                    todoIndex === index
                      ? { ...candidate, completed: event.currentTarget.checked }
                      : candidate
                  );

                  props.onChange({ ...props.draft, todos: nextTodos });
                }}
              />
              <span>{todo.text}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="artifact-editor">
        <h3>Artifacts</h3>
        {props.artifacts.length > 0 ? (
          <ul className="artifact-list">
            {props.artifacts.map((artifact) => (
              <li key={artifact.id}>
                <span>{artifact.title}</span>
                <code>
                  {artifact.type === "url"
                    ? artifact.url
                    : `artifacts/${artifact.path}`}
                </code>
              </li>
            ))}
          </ul>
        ) : (
          <p>No artifacts linked.</p>
        )}
        <div className="form-stack">
          <label>
            <span>Artifact type</span>
            <select
              value={props.artifactDraft.type}
              onInput={(event) =>
                props.onArtifactChange({
                  ...props.artifactDraft,
                  type: event.currentTarget.value as ArtifactType
                })
              }
            >
              <option value="markdown">markdown</option>
              <option value="url">url</option>
            </select>
          </label>
          <label>
            <span>Artifact title</span>
            <input
              value={props.artifactDraft.title}
              onInput={(event) =>
                props.onArtifactChange({
                  ...props.artifactDraft,
                  title: event.currentTarget.value
                })
              }
            />
          </label>
          {props.artifactDraft.type === "url" ? (
            <label>
              <span>Artifact URL</span>
              <input
                value={props.artifactDraft.url}
                onInput={(event) =>
                  props.onArtifactChange({
                    ...props.artifactDraft,
                    url: event.currentTarget.value
                  })
                }
              />
            </label>
          ) : (
            <label>
              <span>Markdown artifact content</span>
              <textarea
                rows={4}
                value={props.artifactDraft.markdownContent}
                onInput={(event) =>
                  props.onArtifactChange({
                    ...props.artifactDraft,
                    markdownContent: event.currentTarget.value
                  })
                }
              />
            </label>
          )}
        </div>
        <button
          className="workspace-button"
          type="button"
          onClick={props.onAddArtifact}
        >
          Add Artifact
        </button>
      </div>

      <button
        className="workspace-button primary"
        type="button"
        onClick={props.onSave}
      >
        Save Task
      </button>
    </section>
  );
}

function ProjectJournalEditor(props: {
  source: string;
  onChange: (source: string) => void;
  onSave: () => void;
}) {
  return (
    <section className="detail-section" aria-labelledby="project-journal-title">
      <h3 id="project-journal-title">Journal</h3>
      <label className="journal-editor">
        <span>Project Journal</span>
        <textarea
          rows={8}
          value={props.source}
          onInput={(event) => props.onChange(event.currentTarget.value)}
        />
      </label>
      <button
        className="workspace-button primary"
        type="button"
        onClick={props.onSave}
      >
        Save Journal
      </button>
    </section>
  );
}

function toProjectInput(draft: ProjectDraft): ProjectInput {
  return {
    title: draft.title.trim(),
    goal: draft.goal,
    successCriteria: draft.successCriteria,
    status: draft.status,
    deadline: draft.deadline || null
  };
}

function toArtifactInput(draft: ArtifactDraft): ArtifactInput {
  return draft.type === "url"
    ? {
        type: "url",
        title: draft.title.trim(),
        url: draft.url.trim()
      }
    : {
        type: "markdown",
        title: draft.title.trim(),
        markdownContent: draft.markdownContent
      };
}

function readMemoryPreview(source: string | undefined): string {
  const preview = source
    ?.split("\n")
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("#"));

  return preview ?? "No workspace Memory loaded.";
}

function readDependencyInput(value: string): string[] {
  return value
    .split(",")
    .map((dependency) => dependency.trim())
    .filter(Boolean);
}

function WorkspaceStatusItem(props: {
  id: string;
  title: string;
  copy: string;
}) {
  return (
    <div>
      <h3 id={props.id}>{props.title}</h3>
      <p>{props.copy}</p>
    </div>
  );
}

function MarkdownFileList(props: { files: WorkspaceMarkdownFile[] }) {
  return (
    <ul className="markdown-file-list">
      {props.files.map((file) => (
        <li key={file.relativePath}>
          <span>{file.title}</span>
          <code>{file.relativePath}</code>
        </li>
      ))}
    </ul>
  );
}
