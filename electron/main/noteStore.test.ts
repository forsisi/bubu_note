// @vitest-environment node

import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createEmptyNote, loadNotesFromFile, saveNotesToFile } from "./noteStore";

describe("noteStore", () => {
  let dir: string;
  let file: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "bubu-notes-"));
    file = join(dir, "notes.json");
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("returns a default note when the file does not exist", async () => {
    const notes = await loadNotesFromFile(file);

    expect(notes).toHaveLength(1);
    expect(notes[0].title).toBe("未命名笔记");
    expect(notes[0].tags).toEqual([]);
  });

  it("loads and saves notes as json", async () => {
    const note = createEmptyNote("1", 10);

    await saveNotesToFile(file, [note]);

    expect(JSON.parse(await readFile(file, "utf8"))).toEqual([note]);
    await expect(loadNotesFromFile(file)).resolves.toEqual([note]);
  });

  it("falls back to a default note when json is corrupt", async () => {
    await writeFile(file, "{not-json", "utf8");

    const notes = await loadNotesFromFile(file);

    expect(notes).toHaveLength(1);
    expect(notes[0].content).toBe("");
  });

  it("normalizes older notes without tags", async () => {
    await writeFile(file, JSON.stringify([{ id: "old", title: "旧笔记", content: "内容", updatedAt: 1 }]), "utf8");

    await expect(loadNotesFromFile(file)).resolves.toEqual([{ id: "old", title: "旧笔记", content: "内容", tags: [], updatedAt: 1 }]);
  });
});
