import { useEffect, useState } from "react";

export function App() {
  const bridgeName = window.nierpod?.appName ?? "NierPod";
  const [workspaceAccess, setWorkspaceAccess] = useState(
    "Workspace bridge pending."
  );

  useEffect(() => {
    let isCurrent = true;

    void window.nierpod?.workspace.describeAccess().then((response) => {
      if (!isCurrent) {
        return;
      }

      setWorkspaceAccess(
        response.ok ? response.data.message : response.error.message
      );
    });

    return () => {
      isCurrent = false;
    };
  }, []);

  return (
    <main className="app-shell" aria-label="NierPod workbench">
      <nav className="sidebar" aria-label="Workspace navigation">
        <div className="brand-row">
          <div className="brand-mark" aria-hidden="true">
            NP
          </div>
          <div>
            <p className="eyebrow">Phase 0</p>
            <h1 id="app-title">{bridgeName}</h1>
          </div>
        </div>

        <section className="workspace-entry" aria-labelledby="workspace-title">
          <div>
            <h2 id="workspace-title">Workspace</h2>
            <p>Phase 0 will not create or modify workspace files.</p>
          </div>
          <button
            className="workspace-button"
            type="button"
            aria-label="Select workspace placeholder"
            disabled
          >
            Select workspace
          </button>
          <p className="bridge-copy">{workspaceAccess}</p>
        </section>

        <section aria-labelledby="navigation-title">
          <h2 id="navigation-title">Focus areas</h2>
          <div className="nav-stack">
            <a href="#today-focus">Today Focus</a>
            <a href="#inbox">Inbox</a>
            <a href="#projects">Projects</a>
          </div>
        </section>

        <section aria-labelledby="context-title">
          <h2 id="context-title">Context</h2>
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
        <div className="panel-header">
          <p className="eyebrow">Project execution</p>
          <h2>Task timeline</h2>
        </div>

        <div className="timeline-empty">
          <div className="timeline-rail" aria-hidden="true" />
          <div>
            <h3 id="today-focus">Today Focus</h3>
            <p>No workspace selected.</p>
          </div>
          <div>
            <h3 id="inbox">Inbox</h3>
            <p>Inbox capture is reserved for Phase 1.</p>
          </div>
          <div>
            <h3 id="projects">Projects</h3>
            <p>Project and Task data are not loaded in Phase 0.</p>
          </div>
        </div>
      </section>

      <aside
        className="detail-panel"
        aria-label="Task detail and artifacts"
        id="task-detail"
      >
        <div className="panel-header">
          <p className="eyebrow">Selected Task</p>
          <h2>Task detail</h2>
        </div>

        <section className="detail-section" aria-labelledby="notes-title">
          <h3 id="notes-title">Notes</h3>
          <p>No Task selected.</p>
        </section>

        <section className="detail-section" aria-labelledby="criteria-title">
          <h3 id="criteria-title">Acceptance Criteria</h3>
          <p>Acceptance Criteria will appear with real Task data.</p>
        </section>

        <section className="detail-section" aria-labelledby="artifacts-title">
          <h3 id="artifacts-title">Artifacts</h3>
          <p>Artifacts are reserved for local files and URLs in Phase 1.</p>
        </section>

        <section className="detail-section split" aria-label="LLM context">
          <div>
            <h3 id="memory">Memory</h3>
            <p>Long-term summary placeholder.</p>
          </div>
          <div>
            <h3 id="prompt-pack">Prompt Pack</h3>
            <p>Manual LLM workflow placeholder.</p>
          </div>
        </section>
      </aside>
    </main>
  );
}
