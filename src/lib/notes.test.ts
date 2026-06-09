import { createNote, deleteNote, filterNotes, updateNote } from "./notes";
import type { Note } from "../types";

const notes: Note[] = [
  { id: "1", title: "购物清单", content: "牛奶\n面包", tags: ["生活"], updatedAt: 10 },
  { id: "2", title: "会议记录", content: "讨论 Markdown 预览", tags: ["工作", "灵感"], updatedAt: 20 }
];

describe("note helpers", () => {
  it("creates a default untitled note", () => {
    const note = createNote("abc", 100);

    expect(note).toEqual({
      id: "abc",
      title: "未命名笔记",
      content: "",
      tags: [],
      updatedAt: 100
    });
  });

  it("filters notes by title or content", () => {
    expect(filterNotes(notes, "购物")).toHaveLength(1);
    expect(filterNotes(notes, "markdown")).toEqual([notes[1]]);
    expect(filterNotes(notes, "不存在")).toEqual([]);
  });

  it("filters notes by tag", () => {
    expect(filterNotes(notes, "", "工作")).toEqual([notes[1]]);
    expect(filterNotes(notes, "markdown", "灵感")).toEqual([notes[1]]);
    expect(filterNotes(notes, "购物", "工作")).toEqual([]);
  });

  it("updates a note and moves it to the top", () => {
    const updated = updateNote(notes, "1", { content: "# 新内容" }, 99);

    expect(updated[0]).toMatchObject({ id: "1", content: "# 新内容", updatedAt: 99 });
    expect(updated[1].id).toBe("2");
  });

  it("deletes the active note and selects the next available note", () => {
    const result = deleteNote(notes, "1");

    expect(result.notes).toEqual([notes[1]]);
    expect(result.nextActiveId).toBe("2");
  });

  it("keeps the final note instead of deleting it", () => {
    const result = deleteNote([notes[0]], "1");

    expect(result.notes).toEqual([notes[0]]);
    expect(result.nextActiveId).toBe("1");
  });
});
