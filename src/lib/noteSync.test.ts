import { isBlankStarterNotes, mergeNotesForSync } from "./noteSync";
import type { Note } from "../types";

const blankNote: Note = { id: "blank", title: "未命名笔记", content: "", tags: [], updatedAt: 100 };
const localNote: Note = { id: "local", title: "本地笔记", content: "local", tags: [], updatedAt: 10 };
const remoteNote: Note = { id: "remote", title: "云端笔记", content: "remote", tags: [], updatedAt: 20 };

describe("note sync merging", () => {
  it("detects the blank starter note", () => {
    expect(isBlankStarterNotes([blankNote])).toBe(true);
    expect(isBlankStarterNotes([{ ...blankNote, content: "edited" }])).toBe(false);
  });

  it("uses remote notes when local only has the blank starter note", () => {
    expect(mergeNotesForSync([blankNote], [remoteNote])).toEqual([remoteNote]);
  });

  it("keeps both local and remote notes from different devices", () => {
    expect(mergeNotesForSync([localNote], [remoteNote])).toEqual([remoteNote, localNote]);
  });

  it("uses the newest copy of the same note", () => {
    const localOld: Note = { id: "same", title: "旧", content: "old", tags: [], updatedAt: 10 };
    const remoteNew: Note = { id: "same", title: "新", content: "new", tags: [], updatedAt: 30 };

    expect(mergeNotesForSync([localOld], [remoteNew])).toEqual([remoteNew]);
  });
});
