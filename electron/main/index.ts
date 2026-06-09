import { app, BrowserWindow, dialog, ipcMain, type OpenDialogOptions, type SaveDialogOptions } from "electron";
import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import type { Note, WebDavNotesFile, WebDavResult, WebDavSettings } from "../../src/types";
import { loadNotesFromFile, saveNotesToFile } from "./noteStore";

function getNotesFilePath(): string {
  const dataDir = process.env.BUBU_NOTES_DATA_DIR || app.getPath("userData");
  return join(dataDir, "notes.json");
}

function authHeader(username: string, password: string): string {
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

function getRemoteUrl(endpoint: string, filePath = ""): string {
  const base = new URL(endpoint);
  const normalizedPath = filePath.startsWith("/") ? filePath.slice(1) : filePath;
  const basePath = base.pathname.endsWith("/") ? base.pathname : `${base.pathname}/`;
  base.pathname = `${basePath}${normalizedPath}`.replace(/\/{2,}/g, "/");
  return base.toString();
}

function validateWebDavSettings(settings: WebDavSettings): WebDavSettings {
  const endpoint = String(settings.endpoint || "").trim().replace(/\/+$/, "");
  const username = String(settings.username || "").trim();
  const password = String(settings.password || "");
  const filePath = String(settings.filePath || "/bubu-notes/notes.json").trim();

  if (!endpoint || !username || !password) {
    throw new Error("请填写 WebDAV 地址、用户名和密码");
  }

  const parsed = new URL(endpoint);
  if (!["https:", "http:"].includes(parsed.protocol)) {
    throw new Error("WebDAV 地址必须以 http 或 https 开头");
  }

  return {
    endpoint,
    username,
    password,
    filePath: filePath.startsWith("/") ? filePath : `/${filePath}`
  };
}

function normalizeRemoteNotes(value: unknown): Note[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((note) => note && typeof note.id === "string" && typeof note.title === "string" && typeof note.content === "string")
    .map((note) => {
      const remoteNote = note as Partial<Note>;
      return {
        id: String(remoteNote.id),
        title: String(remoteNote.title),
        content: String(remoteNote.content),
        tags: Array.isArray(remoteNote.tags) ? remoteNote.tags.filter((tag): tag is string => typeof tag === "string") : [],
        updatedAt: Number(remoteNote.updatedAt) || Date.now()
      };
    });
}

async function webDavFetch(settings: WebDavSettings, method: string, filePath: string, body?: string): Promise<Response> {
  const headers: Record<string, string> = {
    Authorization: authHeader(settings.username, settings.password)
  };
  if (body) {
    headers["Content-Type"] = "application/json; charset=utf-8";
  }
  if (method === "PROPFIND") {
    headers.Depth = "0";
  }

  return fetch(getRemoteUrl(settings.endpoint, filePath), {
    method,
    headers,
    body
  });
}

async function ensureRemoteDirectories(settings: WebDavSettings): Promise<void> {
  const parts = settings.filePath.split("/").filter(Boolean);
  parts.pop();

  let current = "";
  for (const part of parts) {
    current += `/${part}`;
    const response = await webDavFetch(settings, "MKCOL", current);
    if (![200, 201, 204, 301, 302, 405].includes(response.status)) {
      throw new Error(`创建远程目录失败：${current}`);
    }
  }
}

async function testWebDavConnection(settings: WebDavSettings): Promise<WebDavResult> {
  const normalized = validateWebDavSettings(settings);
  const result = await webDavFetch(normalized, "PROPFIND", "/");
  if (!result.ok && result.status !== 207) {
    throw new Error(`WebDAV 登录失败：HTTP ${result.status}`);
  }
  return { ok: true };
}

async function loadWebDavNotes(settings: WebDavSettings): Promise<WebDavNotesFile> {
  const normalized = validateWebDavSettings(settings);
  const result = await webDavFetch(normalized, "GET", normalized.filePath);
  if (result.status === 404) {
    return { notes: [], syncedAt: 0 };
  }
  if (!result.ok) {
    throw new Error(`读取远程笔记失败：HTTP ${result.status}`);
  }

  const raw = await result.text();
  const parsed = raw ? JSON.parse(raw) : { notes: [] };
  const notes = normalizeRemoteNotes(Array.isArray(parsed) ? parsed : parsed.notes);
  return {
    notes,
    syncedAt: Number(parsed.syncedAt) || notes.reduce((latest, note) => Math.max(latest, note.updatedAt), 0)
  };
}

async function saveWebDavNotes(settings: WebDavSettings, notes: Note[]): Promise<WebDavResult> {
  const normalized = validateWebDavSettings(settings);
  const syncedAt = Date.now();
  await ensureRemoteDirectories(normalized);
  const result = await webDavFetch(normalized, "PUT", normalized.filePath, JSON.stringify({ notes: normalizeRemoteNotes(notes), syncedAt }, null, 2));
  if (!result.ok && result.status !== 201 && result.status !== 204) {
    throw new Error(`上传远程笔记失败：HTTP ${result.status}`);
  }
  return { ok: true, syncedAt };
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
ipcMain.handle("webdav:test", async (_event, settings: WebDavSettings) => testWebDavConnection(settings));
ipcMain.handle("webdav:load", async (_event, settings: WebDavSettings) => loadWebDavNotes(settings));
ipcMain.handle("webdav:save", async (_event, settings: WebDavSettings, notes: Note[]) => saveWebDavNotes(settings, notes));
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
