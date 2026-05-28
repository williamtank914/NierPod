import { app, BrowserWindow, ipcMain } from "electron";
import { join } from "node:path";
import {
  fileIpcChannel,
  resolveFileCapabilityRequest,
  type UnknownFileCapabilityRequest
} from "../shared/ipc";

const rendererDevServerUrl = process.env.ELECTRON_RENDERER_URL;

function createMainWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 960,
    minHeight: 640,
    title: "NierPod",
    backgroundColor: "#f4f5f0",
    show: false,
    webPreferences: {
      preload: join(__dirname, "../preload/index.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  if (rendererDevServerUrl) {
    void mainWindow.loadURL(rendererDevServerUrl);
    return;
  }

  void mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
}

function registerIpcHandlers(): void {
  ipcMain.handle(
    fileIpcChannel,
    (_event, request: UnknownFileCapabilityRequest) =>
      resolveFileCapabilityRequest(request)
  );
}

void app.whenReady().then(() => {
  registerIpcHandlers();
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
