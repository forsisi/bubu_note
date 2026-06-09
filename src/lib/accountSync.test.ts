import {
  clearStoredAccountSession,
  loadAccountNotes,
  loadStoredAccountSession,
  loginAccount,
  registerAccount,
  saveAccountNotes,
  saveStoredAccountSession
} from "./accountSync";
import type { AccountCredentials, AccountSession, Note } from "../types";

const credentials: AccountCredentials = {
  username: " bubu ",
  password: "secret123"
};

const session: AccountSession = {
  username: "bubu",
  token: "token-1"
};

const note: Note = { id: "a", title: "同步笔记", content: "hello", tags: [], updatedAt: 10 };

describe("account sync helpers", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("stores and clears the account session", () => {
    saveStoredAccountSession(session);

    expect(loadStoredAccountSession()).toEqual(session);

    clearStoredAccountSession();
    expect(loadStoredAccountSession()).toBeNull();
  });

  it("registers an account through the app account API", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ ok: true, session, notes: [note], syncedAt: 20 }), { status: 200 }));

    await expect(registerAccount(credentials)).resolves.toEqual({ ok: true, session, notes: [note], syncedAt: 20 });
    expect(fetch).toHaveBeenCalledWith("/api/account/register", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ username: "bubu", password: "secret123" })
    }));
  });

  it("logs in and loads remote notes", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ ok: true, session, notes: [note], syncedAt: 20 }), { status: 200 }));

    await expect(loginAccount(credentials)).resolves.toEqual({ ok: true, session, notes: [note], syncedAt: 20 });
  });

  it("loads and saves notes for an account session", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify({ notes: [note], syncedAt: 20 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, syncedAt: 30 }), { status: 200 }));

    await expect(loadAccountNotes(session)).resolves.toEqual({ notes: [note], syncedAt: 20 });
    await expect(saveAccountNotes(session, [note])).resolves.toEqual({ ok: true, syncedAt: 30 });

    expect(fetch).toHaveBeenLastCalledWith("/api/account/save", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ ...session, notes: [note] })
    }));
  });
});
