import { createBrowserNotesApi, downloadTextFile, fileToImportedNote, noteTitleToFilename } from "./browserFileApi";
import type { Note } from "../types";

describe("browser file api", () => {
  const note: Note = { id: "local", title: "本地笔记", content: "永久保存", tags: ["测试"], updatedAt: 10 };

  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sanitizes filenames for export", () => {
    expect(noteTitleToFilename('a:b/c*?', "md")).toBe("a_b_c__.md");
  });

  it("downloads text through a temporary link", () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    downloadTextFile("note.md", "# hello", "text/markdown;charset=utf-8");

    expect(click).toHaveBeenCalledOnce();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test");
  });

  it("converts a markdown file to an imported note", () => {
    const file = new File(["# hi"], "导入.md", { type: "text/markdown" });

    expect(fileToImportedNote(file, "# hi", "id", 10)).toEqual({
      id: "id",
      title: "导入",
      content: "# hi",
      tags: [],
      updatedAt: 10
    });
  });

  it("persists notes in browser storage", async () => {
    const api = createBrowserNotesApi();

    await api.saveNotes([note]);

    await expect(api.loadNotes()).resolves.toEqual([note]);
  });

  it("falls back to an empty note when browser storage is corrupt", async () => {
    const api = createBrowserNotesApi();
    localStorage.setItem("bubu-notes", "{bad-json");

    const notes = await api.loadNotes();

    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({ title: "未命名笔记", content: "", tags: [] });
  });
});
