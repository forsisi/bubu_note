export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  updatedAt: number;
}

export type EditorMode = "edit" | "preview" | "split";

export interface WebDavSettings {
  endpoint: string;
  username: string;
  password: string;
  filePath: string;
}

export interface WebDavNotesFile {
  notes: Note[];
  syncedAt: number;
}

export interface WebDavResult {
  ok: boolean;
  syncedAt?: number;
  message?: string;
}

export interface AccountCredentials {
  username: string;
  password: string;
}

export interface AccountSession {
  username: string;
  token: string;
}

export interface AccountNotesFile {
  notes: Note[];
  syncedAt: number;
}

export interface AccountResult {
  ok: boolean;
  session?: AccountSession;
  notes?: Note[];
  syncedAt?: number;
  message?: string;
}

export interface BubuNotesApi {
  loadNotes(): Promise<Note[]>;
  saveNotes(notes: Note[]): Promise<void>;
  exportMarkdown(note: Note): Promise<boolean>;
  exportJson(notes: Note[]): Promise<boolean>;
  importMarkdown(): Promise<Note | null>;
  testWebDavConnection?(settings: WebDavSettings): Promise<WebDavResult>;
  loadWebDavNotes?(settings: WebDavSettings): Promise<WebDavNotesFile>;
  saveWebDavNotes?(settings: WebDavSettings, notes: Note[]): Promise<WebDavResult>;
}
