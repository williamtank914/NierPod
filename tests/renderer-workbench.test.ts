import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { JSDOM } from "jsdom";
import { createElement } from "react";
import { cleanup, render } from "@testing-library/react";
import { App } from "../src/renderer/src/App";
import type { NierPodBridge } from "../src/shared/ipc";

function installDom() {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/"
  });

  globalThis.window = dom.window as unknown as Window & typeof globalThis;
  globalThis.document = dom.window.document;
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.Node = dom.window.Node;
  Object.defineProperty(globalThis, "navigator", {
    value: dom.window.navigator,
    configurable: true
  });
}

function installBridge() {
  const bridge: NierPodBridge = {
    appName: "NierPod",
    phase: "phase-0",
    workspace: {
      describeAccess: async () => ({
        ok: true,
        data: {
          phase: "phase-0",
          canReadFiles: false,
          canWriteFiles: false,
          message:
            "Workspace file access is defined as a main-process IPC boundary, but Phase 0 does not read or write workspace files."
        }
      })
    }
  };

  Object.defineProperty(window, "nierpod", {
    value: bridge,
    configurable: true
  });
}

beforeEach(() => {
  installDom();
  installBridge();
});

afterEach(() => {
  cleanup();
});

test("NierPod starts on a three-column workbench empty state", () => {
  const view = render(createElement(App));

  view.getByRole("main", { name: "NierPod workbench" });
  view.getByRole("navigation", { name: "Workspace navigation" });
  view.getByRole("region", { name: "Task timeline" });
  view.getByRole("complementary", { name: "Task detail and artifacts" });

  for (const label of [
    "Today Focus",
    "Inbox",
    "Projects",
    "Task timeline",
    "Task detail",
    "Artifacts",
    "Memory",
    "Prompt Pack"
  ]) {
    assert.ok(view.getAllByText(label).length > 0, label);
  }
});

test("workspace entry is visible and non-destructive in Phase 0", async () => {
  const view = render(createElement(App));

  const workspaceEntry = view.getByRole("button", {
    name: "Select workspace placeholder"
  }) as HTMLButtonElement;

  assert.equal(workspaceEntry.disabled, true);
  view.getByText("Phase 0 will not create or modify workspace files.");
  await view.findByText(/Phase 0 does not read or write workspace files/);
});
