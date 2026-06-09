import { loadWebDavNotes, saveWebDavNotes, testWebDavConnection } from "./webdavSync";
import type { BubuNotesApi, Note, WebDavSettings } from "../types";

const settings: WebDavSettings = {
  endpoint: "https://dav.example.com/dav",
  username: "bubu",
  password: "secret",
  filePath: "/bubu-notes/notes.json"
};

const note: Note = { id: "a", title: "同步笔记", content: "hello", tags: [], updatedAt: 10 };

describe("webdav sync helpers", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    delete window.bubuNotes;
    vi.unstubAllGlobals();
  });

  it("tests WebDAV credentials through the proxy", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    await expect(testWebDavConnection(settings)).resolves.toEqual({ ok: true });

    expect(fetch).toHaveBeenCalledWith("/api/webdav/test", expect.objectContaining({
      method: "POST",
      body: JSON.stringify(settings)
    }));
  });

  it("loads notes from a remote WebDAV file", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ notes: [note], syncedAt: 20 }), { status: 200 }));

    await expect(loadWebDavNotes(settings)).resolves.toEqual({ notes: [note], syncedAt: 20 });
  });

  it("saves notes to a remote WebDAV file", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ ok: true, syncedAt: 30 }), { status: 200 }));

    await expect(saveWebDavNotes(settings, [note])).resolves.toEqual({ ok: true, syncedAt: 30 });
    expect(fetch).toHaveBeenCalledWith("/api/webdav/save", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ ...settings, notes: [note] })
    }));
  });

  it("uses the desktop bridge when Electron exposes WebDAV methods", async () => {
    const desktopApi = {
      loadNotes: vi.fn(),
      saveNotes: vi.fn(),
      exportMarkdown: vi.fn(),
      exportJson: vi.fn(),
      importMarkdown: vi.fn(),
      testWebDavConnection: vi.fn().mockResolvedValue({ ok: true }),
      loadWebDavNotes: vi.fn().mockResolvedValue({ notes: [note], syncedAt: 20 }),
      saveWebDavNotes: vi.fn().mockResolvedValue({ ok: true, syncedAt: 30 })
    } satisfies BubuNotesApi;
    window.bubuNotes = desktopApi;

    await expect(testWebDavConnection(settings)).resolves.toEqual({ ok: true });
    await expect(loadWebDavNotes(settings)).resolves.toEqual({ notes: [note], syncedAt: 20 });
    await expect(saveWebDavNotes(settings, [note])).resolves.toEqual({ ok: true, syncedAt: 30 });

    expect(fetch).not.toHaveBeenCalled();
    expect(desktopApi.testWebDavConnection).toHaveBeenCalledWith(settings);
    expect(desktopApi.loadWebDavNotes).toHaveBeenCalledWith(settings);
    expect(desktopApi.saveWebDavNotes).toHaveBeenCalledWith(settings, [note]);
  });
});
