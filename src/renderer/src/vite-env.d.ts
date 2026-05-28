/// <reference types="vite/client" />

import type { NierPodBridge } from "../../shared/ipc";

declare global {
  interface Window {
    nierpod?: NierPodBridge;
  }
}

export {};
