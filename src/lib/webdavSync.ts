import type { Note, WebDavNotesFile, WebDavResult, WebDavSettings } from "../types";

const settingsKey = "bubu-webdav-settings";

function isNote(value: unknown): value is Note {
  const note = value as Partial<Note>;
  return typeof note?.id === "string" && typeof note.title === "string" && typeof note.content === "string" && typeof note.updatedAt === "number";
}

function normalizeNotes(value: unknown): Note[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isNote).map((note) => ({
    id: note.id,
    title: note.title,
    content: note.content,
    tags: Array.isArray(note.tags) ? note.tags.filter((tag): tag is string => typeof tag === "string") : [],
    updatedAt: note.updatedAt
  }));
}

async function postJson<T>(path: string, payload: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof data.message === "string" ? data.message : "WebDAV 请求失败");
  }

  return data as T;
}

export function maxNoteUpdatedAt(notes: Note[]): number {
  return notes.reduce((latest, note) => Math.max(latest, note.updatedAt), 0);
}

export function normalizeWebDavSettings(settings: WebDavSettings): WebDavSettings {
  return {
    endpoint: settings.endpoint.trim().replace(/\/+$/, ""),
    username: settings.username.trim(),
    password: settings.password,
    filePath: settings.filePath.trim().startsWith("/") ? settings.filePath.trim() : `/${settings.filePath.trim()}`
  };
}

export function loadStoredWebDavSettings(storage: Storage = localStorage): WebDavSettings | null {
  try {
    const raw = storage.getItem(settingsKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WebDavSettings;
    if (!parsed.endpoint || !parsed.username || !parsed.password || !parsed.filePath) return null;
    return normalizeWebDavSettings(parsed);
  } catch {
    return null;
  }
}

export function saveStoredWebDavSettings(settings: WebDavSettings, storage: Storage = localStorage): void {
  storage.setItem(settingsKey, JSON.stringify(normalizeWebDavSettings(settings)));
}

export function clearStoredWebDavSettings(storage: Storage = localStorage): void {
  storage.removeItem(settingsKey);
}

export async function testWebDavConnection(settings: WebDavSettings): Promise<WebDavResult> {
  const normalized = normalizeWebDavSettings(settings);
  if (window.bubuNotes?.testWebDavConnection) {
    return window.bubuNotes.testWebDavConnection(normalized);
  }
  return postJson<WebDavResult>("/api/webdav/test", normalized);
}

export async function loadWebDavNotes(settings: WebDavSettings): Promise<WebDavNotesFile> {
  const normalized = normalizeWebDavSettings(settings);
  const result = window.bubuNotes?.loadWebDavNotes
    ? await window.bubuNotes.loadWebDavNotes(normalized)
    : await postJson<WebDavNotesFile>("/api/webdav/load", normalized);
  return {
    notes: normalizeNotes(result.notes),
    syncedAt: typeof result.syncedAt === "number" ? result.syncedAt : maxNoteUpdatedAt(normalizeNotes(result.notes))
  };
}

export async function saveWebDavNotes(settings: WebDavSettings, notes: Note[]): Promise<WebDavResult> {
  const normalized = normalizeWebDavSettings(settings);
  if (window.bubuNotes?.saveWebDavNotes) {
    return window.bubuNotes.saveWebDavNotes(normalized, notes);
  }
  return postJson<WebDavResult>("/api/webdav/save", {
    ...normalized,
    notes
  });
}
