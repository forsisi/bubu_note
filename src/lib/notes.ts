import type { Note } from "../types";

export function createNote(id: string = crypto.randomUUID(), updatedAt = Date.now()): Note {
  return {
    id,
    title: "未命名笔记",
    content: "",
    tags: [],
    updatedAt
  };
}

export function filterNotes(notes: Note[], query: string, tag = ""): Note[] {
  const normalized = query.trim().toLowerCase();
  const normalizedTag = tag.trim();

  return notes.filter((note) => {
    const matchesTag = !normalizedTag || note.tags.includes(normalizedTag);
    const matchesQuery = !normalized || note.title.toLowerCase().includes(normalized) || note.content.toLowerCase().includes(normalized);
    return matchesTag && matchesQuery;
  });
}

export function updateNote(notes: Note[], id: string, changes: Partial<Pick<Note, "title" | "content" | "tags">>, updatedAt = Date.now()): Note[] {
  const note = notes.find((item) => item.id === id);
  if (!note) return notes;

  const updatedNote = {
    ...note,
    ...changes,
    updatedAt
  };

  return [updatedNote, ...notes.filter((item) => item.id !== id)];
}

export function deleteNote(notes: Note[], activeId: string): { notes: Note[]; nextActiveId: string } {
  if (notes.length <= 1) {
    return { notes, nextActiveId: notes[0]?.id ?? activeId };
  }

  const nextNotes = notes.filter((note) => note.id !== activeId);
  return {
    notes: nextNotes,
    nextActiveId: nextNotes[0]?.id ?? activeId
  };
}
