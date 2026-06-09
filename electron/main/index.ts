import { app, BrowserWindow, dialog, ipcMain, type OpenDialogOptions, type SaveDialogOptions } from "electron";
import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import type { Note } from "../../src/types";
import { loadNotesFromFile, saveNotesToFile } from "./noteStore";

function getNotesFilePath(): string {
  const dataDir = process.env.BUBU_NOTES_DATA_DIR || app.getPath("userData");
  return join(dataDir, "notes.json");
}

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 920,
    minHeight: 640,
    title: "卜卜笔记",
    backgroundColor: "#eef8f0",
    icon: join(__dirname, "../../build/icon.ico"),
    webPreferences: {
      preload: join(__dirname, "../preload/index.mjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    void window.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void window.loadFile(join(__dirname, "../../dist/index.html"));
  }
}

ipcMain.handle("notes:load", async () => loadNotesFromFile(getNotesFilePath()));
ipcMain.handle("notes:save", async (_event, notes: Note[]) => saveNotesToFile(getNotesFilePath(), notes));
ipcMain.handle("notes:exportMarkdown", async (event, note: Note) => {
  const safeTitle = (note.title.trim() || "未命名笔记").replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_");
  const owner = BrowserWindow.fromWebContents(event.sender);
  const options: SaveDialogOptions = {
    title: "导出 Markdown",
    defaultPath: `${safeTitle}.md`,
    filters: [{ name: "Markdown", extensions: ["md"] }]
  };
  const result = owner ? await dialog.showSaveDialog(owner, options) : await dialog.showSaveDialog(options);

  if (result.canceled || !result.filePath) {
    return false;
  }

  await writeFile(result.filePath, note.content, "utf8");
  return true;
});

ipcMain.handle("notes:exportJson", async (event, notes: Note[]) => {
  const owner = BrowserWindow.fromWebContents(event.sender);
  const options: SaveDialogOptions = {
    title: "导出全部笔记",
    defaultPath: "bubu-notes.json",
    filters: [{ name: "JSON", extensions: ["json"] }]
  };
  const result = owner ? await dialog.showSaveDialog(owner, options) : await dialog.showSaveDialog(options);

  if (result.canceled || !result.filePath) {
    return false;
  }

  await writeFile(result.filePath, JSON.stringify(notes, null, 2), "utf8");
  return true;
});

ipcMain.handle("notes:importMarkdown", async (event): Promise<Note | null> => {
  const owner = BrowserWindow.fromWebContents(event.sender);
  const options: OpenDialogOptions = {
    title: "导入 Markdown",
    properties: ["openFile"],
    filters: [{ name: "Markdown", extensions: ["md", "markdown", "txt"] }]
  };
  const result = owner ? await dialog.showOpenDialog(owner, options) : await dialog.showOpenDialog(options);

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const filePath = result.filePaths[0];
  const content = await readFile(filePath, "utf8");
  const extension = extname(filePath);

  return {
    id: randomUUID(),
    title: basename(filePath, extension) || "导入笔记",
    content,
    tags: [],
    updatedAt: Date.now()
  };
});

void app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
