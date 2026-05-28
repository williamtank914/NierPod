import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  createProject,
  createTask,
  createWorkspace,
  readWorkspaceModel,
  updateTask
} from "../src/modules/workspace";
import {
  buildPromptPack,
  createPromptOutputDraft,
  promptPackIntents,
  savePromptOutputAsLlmNote
} from "../src/modules/prompt-pack";

async function createWorkspaceFixture() {
  const tempRoot = await mkdtemp(join(tmpdir(), "nierpod-prompt-pack-test-"));
  const settingsDirectory = join(tempRoot, "app-user-data");
  const workspacePath = join(tempRoot, "workspace");

  await createWorkspace(workspacePath, { settingsDirectory });

  return {
    workspacePath
  };
}

test("Prompt Pack builds default Task context without implicit whole-Project analysis", async () => {
  const { workspacePath } = await createWorkspaceFixture();
  const project = await createProject(workspacePath, {
    title: "NierPod",
    goal: "Ship Phase 1 as a local-first workbench.",
    successCriteria: "- Prompt Pack improves external LLM work.",
    status: "active",
    deadline: "2026-06-30"
  });
  const dependency = await createTask(workspacePath, project.id, {
    title: "Finish Today Focus"
  });
  const currentTask = await createTask(workspacePath, project.id, {
    title: "Build Prompt Pack workflow"
  });
  const laterTask = await createTask(workspacePath, project.id, {
    title: "Implement Search"
  });

  await updateTask(workspacePath, project.id, dependency.id, {
    status: "done",
    progress: "Today Focus supports pin, snooze, and hide."
  });
  await updateTask(workspacePath, project.id, currentTask.id, {
    status: "in_progress",
    priority: "p0",
    dependencies: [dependency.id],
    context: "Manual LLM workflow only. No built-in LLM API.",
    progress: "Builder module is being designed with TDD.",
    acceptanceCriteria: "- Generated prompt is structured Markdown."
  });
  await updateTask(workspacePath, project.id, laterTask.id, {
    status: "backlog",
    context: "Search is not part of the current Prompt Pack context."
  });
  await writeFile(
    join(workspacePath, "memory.md"),
    "# Memory\n\n## Current Summary\n\nUse Markdown as the source of truth.\n",
    "utf8"
  );

  assert.deepEqual(
    promptPackIntents.map((intent) => intent.label),
    [
      "Plan this project",
      "Break down this task",
      "Review risks",
      "Define acceptance criteria",
      "Summarize memory",
      "Suggest today focus"
    ]
  );

  const pack = await buildPromptPack(workspacePath, {
    intent: "break_down_task",
    projectId: project.id,
    taskId: currentTask.id
  });

  assert.equal(pack.intent, "break_down_task");
  assert.equal(pack.wholeProjectAnalysisIncluded, false);
  assert.deepEqual(pack.contextSummary, [
    "Current Task: Build Prompt Pack workflow",
    "Project Context: NierPod",
    "Dependency Summaries: 1 dependency",
    "Recent Progress Snippets: 2 snippets",
    "Memory: memory.md"
  ]);
  assert.match(pack.promptMarkdown, /^# Prompt Pack: Break down this task/m);
  assert.match(pack.promptMarkdown, /## Current Task/);
  assert.match(pack.promptMarkdown, /Manual LLM workflow only/);
  assert.match(pack.promptMarkdown, /## Project Context/);
  assert.match(pack.promptMarkdown, /Ship Phase 1 as a local-first workbench/);
  assert.match(pack.promptMarkdown, /## Dependency Summaries/);
  assert.match(pack.promptMarkdown, /Today Focus supports pin, snooze, and hide/);
  assert.match(pack.promptMarkdown, /## Recent Progress Snippets/);
  assert.match(pack.promptMarkdown, /Use Markdown as the source of truth/);
  assert.doesNotMatch(pack.promptMarkdown, /Search is not part/);
  assert.doesNotMatch(pack.promptMarkdown, /## Whole-Project Analysis/);

  const wholeProjectPack = await buildPromptPack(workspacePath, {
    intent: "plan_project",
    projectId: project.id,
    includeWholeProjectAnalysis: true
  });

  assert.equal(wholeProjectPack.wholeProjectAnalysisIncluded, true);
  assert.match(wholeProjectPack.promptMarkdown, /## Whole-Project Analysis/);
  assert.match(wholeProjectPack.promptMarkdown, /Implement Search/);
});

test("Prompt Pack paste-back stays non-factual until saved as an LLM note", async () => {
  const { workspacePath } = await createWorkspaceFixture();
  const project = await createProject(workspacePath, {
    title: "NierPod",
    goal: "Ship Phase 1",
    successCriteria: "- LLM output is reviewed before becoming fact.",
    status: "active",
    deadline: null
  });
  const task = await createTask(workspacePath, project.id, {
    title: "Review LLM output rules"
  });
  await updateTask(workspacePath, project.id, task.id, {
    status: "in_progress",
    acceptanceCriteria: "- Existing facts remain unchanged."
  });
  const pack = await buildPromptPack(workspacePath, {
    intent: "review_risks",
    projectId: project.id,
    taskId: task.id
  });

  const draft = createPromptOutputDraft({
    intent: "review_risks",
    projectId: project.id,
    taskId: task.id,
    promptMarkdown: pack.promptMarkdown,
    outputMarkdown: "## Suggested risks\n\n- This is only an LLM suggestion."
  });

  assert.equal(draft.factStatus, "not_fact");
  assert.deepEqual(draft.availableActions, [
    "discard",
    "save_llm_note",
    "manual_apply"
  ]);

  const unchangedModel = await readWorkspaceModel(workspacePath);
  const unchangedTask = unchangedModel.projects[0]?.tasks.find(
    (candidate) => candidate.id === task.id
  );

  assert.equal(
    unchangedTask?.acceptanceCriteria,
    "- Existing facts remain unchanged."
  );

  const note = await savePromptOutputAsLlmNote(workspacePath, draft);
  const noteSource = await readFile(
    join(workspacePath, note.relativePath),
    "utf8"
  );
  const journal = await readFile(join(workspacePath, "journal.md"), "utf8");

  assert.equal(note.intent, "review_risks");
  assert.equal(note.projectId, project.id);
  assert.equal(note.taskId, task.id);
  assert.match(note.relativePath, /^llm-notes\/.+review-risks.+\.md$/);
  assert.match(noteSource, /^# LLM Note: Review risks/m);
  assert.match(noteSource, /Fact Status: not_fact/);
  assert.match(noteSource, /This is only an LLM suggestion/);
  assert.match(journal, /LLM suggestion saved: Review risks/);

  const reloadedModel = await readWorkspaceModel(workspacePath);
  const reloadedTask = reloadedModel.projects[0]?.tasks.find(
    (candidate) => candidate.id === task.id
  );

  assert.equal(
    reloadedTask?.acceptanceCriteria,
    "- Existing facts remain unchanged."
  );
});
