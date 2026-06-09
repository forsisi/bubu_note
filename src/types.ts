export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  updatedAt: number;
}

export type EditorMode = "edit" | "preview" | "split";

export interface BubuNotesApi {
  loadNotes(): Promise<Note[]>;
  saveNotes(notes: Note[]): Promise<void>;
  exportMarkdown(note: Note): Promise<boolean>;
  exportJson(notes: Note[]): Promise<boolean>;
  importMarkdown(): Promise<Note | null>;
}
