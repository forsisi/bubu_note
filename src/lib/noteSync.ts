import type { Note } from "../types";

export function isBlankStarterNotes(notes: Note[]): boolean {
  return notes.length === 1
    && notes[0].title.trim() === "未命名笔记"
    && notes[0].content.trim() === ""
    && notes[0].tags.length === 0;
}

export function mergeNotesForSync(localNotes: Note[], remoteNotes: Note[]): Note[] {
  if (remoteNotes.length === 0) return localNotes;
  if (isBlankStarterNotes(localNotes)) return remoteNotes;

  const merged = new Map<string, Note>();
  for (const note of localNotes) {
    merged.set(note.id, note);
  }

  for (const remoteNote of remoteNotes) {
    const localNote = merged.get(remoteNote.id);
    if (!localNote || remoteNote.updatedAt >= localNote.updatedAt) {
      merged.set(remoteNote.id, remoteNote);
    }
  }

  return Array.from(merged.values()).sort((a, b) => b.updatedAt - a.updatedAt);
}
