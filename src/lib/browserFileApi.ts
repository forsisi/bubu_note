import { createNote } from "./notes";
import type { BubuNotesApi, Note } from "../types";

const browserNotesKey = "bubu-notes";

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

export function downloadTextFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function noteTitleToFilename(title: string, extension: string): string {
  const safeTitle = (title.trim() || "未命名笔记").replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_");
  return `${safeTitle}.${extension}`;
}

export function fileToImportedNote(file: File, content: string, id?: string, updatedAt = Date.now()): Note {
  const extension = file.name.includes(".") ? file.name.split(".").pop() ?? "" : "";
  const title = extension ? file.name.slice(0, -(extension.length + 1)) : file.name;

  return {
    ...createNote(id, updatedAt),
    title: title || "导入笔记",
    content
  };
}

export function pickMarkdownFile(): Promise<Note | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".md,.markdown,.txt,text/markdown,text/plain";
    input.style.display = "none";

    input.addEventListener("change", () => {
      const file = input.files?.[0];
      input.remove();
      if (!file) {
        resolve(null);
        return;
      }

      const reader = new FileReader();
      reader.addEventListener("load", () => {
        resolve(fileToImportedNote(file, String(reader.result ?? "")));
      });
      reader.addEventListener("error", () => resolve(null));
      reader.readAsText(file);
    }, { once: true });

    document.body.append(input);
    input.click();
  });
}

export function createBrowserNotesApi(storage: Storage = localStorage): BubuNotesApi {
  return {
    async loadNotes(): Promise<Note[]> {
      try {
        const raw = storage.getItem(browserNotesKey);
        if (!raw) {
          return [createNote()];
        }

        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed) || parsed.length === 0 || !parsed.every(isNote)) {
          return [createNote()];
        }

        return parsed.map(normalizeNote);
      } catch {
        return [createNote()];
      }
    },
    async saveNotes(notes: Note[]): Promise<void> {
      storage.setItem(browserNotesKey, JSON.stringify(notes));
    },
    async exportMarkdown(note: Note): Promise<boolean> {
      downloadTextFile(noteTitleToFilename(note.title, "md"), note.content, "text/markdown;charset=utf-8");
      return true;
    },
    async exportJson(notes: Note[]): Promise<boolean> {
      downloadTextFile("bubu-notes.json", JSON.stringify(notes, null, 2), "application/json;charset=utf-8");
      return true;
    },
    async importMarkdown(): Promise<Note | null> {
      return pickMarkdownFile();
    }
  };
}
