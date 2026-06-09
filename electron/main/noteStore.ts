import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { Note } from "../../src/types";

export function createEmptyNote(id: string = crypto.randomUUID(), updatedAt = Date.now()): Note {
  return {
    id,
    title: "未命名笔记",
    content: "",
    tags: [],
    updatedAt
  };
}

function isNote(value: unknown): value is Note {
  const note = value as Partial<Note>;
  return typeof note?.id === "string" && typeof note.title === "string" && typeof note.content === "string" && typeof note.updatedAt === "number";
}

function normalizeNote(note: Note | (Omit<Note, "tags"> & { tags?: unknown })): Note {
  return {
    id: note.id,
    title: note.title,
    content: note.content,
    tags: Array.isArray(note.tags) ? note.tags.filter((tag): tag is string => typeof tag === "string") : [],
    updatedAt: note.updatedAt
  };
}

function fallbackNotes(): Note[] {
  return [createEmptyNote()];
}

export async function loadNotesFromFile(filePath: string): Promise<Note[]> {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every(isNote) || parsed.length === 0) {
      return fallbackNotes();
    }

    return parsed.map(normalizeNote);
  } catch {
    return fallbackNotes();
  }
}

export async function saveNotesToFile(filePath: string, notes: Note[]): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(notes, null, 2), "utf8");
}
