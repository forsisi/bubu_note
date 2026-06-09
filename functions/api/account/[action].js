const maxBodyBytes = 1024 * 1024 * 8;
const sessionTtlSeconds = 60 * 60 * 24 * 30;
const encoder = new TextEncoder();

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

async function readJson(request) {
  const raw = await request.text();
  if (raw.length > maxBodyBytes) {
    throw new Error("请求内容过大");
  }
  return raw ? JSON.parse(raw) : {};
}

function requireKv(env) {
  if (!env.BUBU_NOTES_KV) {
    throw new Error("服务器还没有绑定 BUBU_NOTES_KV 数据库");
  }
  return env.BUBU_NOTES_KV;
}

function toHex(bytes) {
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function randomToken(byteLength = 32) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return toHex(bytes);
}

function normalizeUsername(username) {
  return String(username || "").trim().toLowerCase();
}

function validateCredentials(payload) {
  const username = normalizeUsername(payload.username);
  const password = String(payload.password || "");
  if (!/^[a-z0-9_.@-]{3,32}$/.test(username)) {
    throw new Error("账号需要 3-32 位，可使用字母、数字、点、横线、下划线或 @");
  }
  if (password.length < 6) {
    throw new Error("密码至少需要 6 位");
  }
  return { username, password };
}

function normalizeNotes(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((note) => note && typeof note.id === "string" && typeof note.title === "string" && typeof note.content === "string")
    .map((note) => ({
      id: note.id,
      title: note.title,
      content: note.content,
      tags: Array.isArray(note.tags) ? note.tags.filter((tag) => typeof tag === "string") : [],
      updatedAt: Number(note.updatedAt) || Date.now()
    }));
}

async function hashPassword(password, salt) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: encoder.encode(salt),
      iterations: 100000
    },
    key,
    256
  );
  return toHex(new Uint8Array(bits));
}

async function createSession(kv, user) {
  const token = randomToken();
  await kv.put(`session:${token}`, JSON.stringify({
    userId: user.id,
    username: user.username,
    createdAt: Date.now()
  }), { expirationTtl: sessionTtlSeconds });
  return { username: user.username, token };
}

async function getSessionUser(kv, payload) {
  const username = normalizeUsername(payload.username);
  const token = String(payload.token || "");
  if (!username || !token) {
    throw new Error("请先登录卜卜账号");
  }

  const rawSession = await kv.get(`session:${token}`, "json");
  if (!rawSession || rawSession.username !== username) {
    throw new Error("登录状态已失效，请重新登录");
  }

  const user = await kv.get(`user:${username}`, "json");
  if (!user || user.id !== rawSession.userId) {
    throw new Error("账号不存在，请重新登录");
  }
  return user;
}

async function register(kv, payload) {
  const credentials = validateCredentials(payload);
  const existing = await kv.get(`user:${credentials.username}`, "json");
  if (existing) {
    return json({ ok: false, message: "这个卜卜账号已经被注册" }, 409);
  }

  const salt = randomToken(16);
  const user = {
    id: randomToken(16),
    username: credentials.username,
    salt,
    passwordHash: await hashPassword(credentials.password, salt),
    createdAt: Date.now()
  };
  await kv.put(`user:${credentials.username}`, JSON.stringify(user));
  const session = await createSession(kv, user);
  return json({ ok: true, session, notes: [], syncedAt: 0 });
}

async function login(kv, payload) {
  const credentials = validateCredentials(payload);
  const user = await kv.get(`user:${credentials.username}`, "json");
  if (!user) {
    return json({ ok: false, message: "账号或密码不正确" }, 401);
  }

  const passwordHash = await hashPassword(credentials.password, user.salt);
  if (passwordHash !== user.passwordHash) {
    return json({ ok: false, message: "账号或密码不正确" }, 401);
  }

  const session = await createSession(kv, user);
  const notesFile = await kv.get(`notes:${user.id}`, "json");
  const notes = normalizeNotes(notesFile?.notes);
  return json({
    ok: true,
    session,
    notes,
    syncedAt: Number(notesFile?.syncedAt) || notes.reduce((latest, note) => Math.max(latest, note.updatedAt), 0)
  });
}

async function loadNotes(kv, payload) {
  const user = await getSessionUser(kv, payload);
  const notesFile = await kv.get(`notes:${user.id}`, "json");
  const notes = normalizeNotes(notesFile?.notes);
  return json({
    notes,
    syncedAt: Number(notesFile?.syncedAt) || notes.reduce((latest, note) => Math.max(latest, note.updatedAt), 0)
  });
}

async function saveNotes(kv, payload) {
  const user = await getSessionUser(kv, payload);
  const notes = normalizeNotes(payload.notes);
  const syncedAt = Date.now();
  await kv.put(`notes:${user.id}`, JSON.stringify({ notes, syncedAt }));
  return json({ ok: true, syncedAt });
}

async function handleAccount(request, env, action) {
  const kv = requireKv(env);
  const payload = await readJson(request);

  if (action === "register") return register(kv, payload);
  if (action === "login") return login(kv, payload);
  if (action === "load") return loadNotes(kv, payload);
  if (action === "save") return saveNotes(kv, payload);

  return json({ ok: false, message: "未知账号操作" }, 404);
}

export async function onRequestPost({ request, env, params }) {
  try {
    return await handleAccount(request, env, params.action);
  } catch (error) {
    return json({ ok: false, message: error instanceof Error ? error.message : "卜卜账号请求失败" }, 400);
  }
}

export function onRequestGet() {
  return json({ ok: false, message: "Method not allowed" }, 405);
}
