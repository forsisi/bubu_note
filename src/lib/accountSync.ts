import type { AccountCredentials, AccountNotesFile, AccountResult, AccountSession, Note } from "../types";

const sessionKey = "bubu-account-session";
const nativeApiOrigin = "https://note.t1213121.fun";

function isNativeApp(): boolean {
  return window.Capacitor?.isNativePlatform?.() === true;
}

function resolveApiPath(path: string): string {
  return isNativeApp() ? `${nativeApiOrigin}${path}` : path;
}

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

function normalizeCredentials(credentials: AccountCredentials): AccountCredentials {
  return {
    username: credentials.username.trim(),
    password: credentials.password
  };
}

function normalizeSession(session: AccountSession): AccountSession {
  return {
    username: session.username.trim(),
    token: session.token
  };
}

async function postJson<T>(path: string, payload: unknown): Promise<T> {
  const response = await fetch(resolveApiPath(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof data.message === "string" ? data.message : "卜卜账号请求失败");
  }

  return data as T;
}

export function maxNoteUpdatedAt(notes: Note[]): number {
  return notes.reduce((latest, note) => Math.max(latest, note.updatedAt), 0);
}

export function loadStoredAccountSession(storage: Storage = localStorage): AccountSession | null {
  try {
    const raw = storage.getItem(sessionKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AccountSession;
    if (!parsed.username || !parsed.token) return null;
    return normalizeSession(parsed);
  } catch {
    return null;
  }
}

export function saveStoredAccountSession(session: AccountSession, storage: Storage = localStorage): void {
  storage.setItem(sessionKey, JSON.stringify(normalizeSession(session)));
}

export function clearStoredAccountSession(storage: Storage = localStorage): void {
  storage.removeItem(sessionKey);
}

export async function registerAccount(credentials: AccountCredentials): Promise<AccountResult> {
  const result = await postJson<AccountResult>("/api/account/register", normalizeCredentials(credentials));
  return {
    ...result,
    notes: normalizeNotes(result.notes)
  };
}

export async function loginAccount(credentials: AccountCredentials): Promise<AccountResult> {
  const result = await postJson<AccountResult>("/api/account/login", normalizeCredentials(credentials));
  return {
    ...result,
    notes: normalizeNotes(result.notes)
  };
}

export async function loadAccountNotes(session: AccountSession): Promise<AccountNotesFile> {
  const result = await postJson<AccountNotesFile>("/api/account/load", normalizeSession(session));
  return {
    notes: normalizeNotes(result.notes),
    syncedAt: typeof result.syncedAt === "number" ? result.syncedAt : maxNoteUpdatedAt(normalizeNotes(result.notes))
  };
}

export async function saveAccountNotes(session: AccountSession, notes: Note[]): Promise<AccountResult> {
  return postJson<AccountResult>("/api/account/save", {
    ...normalizeSession(session),
    notes
  });
}
