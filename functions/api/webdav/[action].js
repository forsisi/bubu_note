const maxBodyBytes = 1024 * 1024 * 8;

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

function authHeader(username, password) {
  return `Basic ${btoa(`${username}:${password}`)}`;
}

function getRemoteUrl(endpoint, filePath = "") {
  const base = new URL(endpoint);
  const normalizedPath = filePath.startsWith("/") ? filePath.slice(1) : filePath;
  const basePath = base.pathname.endsWith("/") ? base.pathname : `${base.pathname}/`;
  base.pathname = `${basePath}${normalizedPath}`.replace(/\/{2,}/g, "/");
  return base.toString();
}

function validateSettings(payload) {
  const endpoint = String(payload.endpoint || "").trim().replace(/\/+$/, "");
  const username = String(payload.username || "").trim();
  const password = String(payload.password || "");
  const filePath = String(payload.filePath || "/bubu-notes/notes.json").trim();

  if (!endpoint || !username || !password) {
    throw new Error("请填写 WebDAV 地址、用户名和密码");
  }

  const parsed = new URL(endpoint);
  if (!["https:", "http:"].includes(parsed.protocol)) {
    throw new Error("WebDAV 地址必须以 http 或 https 开头");
  }

  return {
    endpoint,
    username,
    password,
    filePath: filePath.startsWith("/") ? filePath : `/${filePath}`
  };
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

async function webDavFetch(settings, method, filePath, body) {
  const headers = {
    Authorization: authHeader(settings.username, settings.password)
  };
  if (body) {
    headers["Content-Type"] = "application/json; charset=utf-8";
  }
  if (method === "PROPFIND") {
    headers.Depth = "0";
  }

  return fetch(getRemoteUrl(settings.endpoint, filePath), {
    method,
    headers,
    body
  });
}

async function ensureRemoteDirectories(settings) {
  const parts = settings.filePath.split("/").filter(Boolean);
  parts.pop();

  let current = "";
  for (const part of parts) {
    current += `/${part}`;
    const response = await webDavFetch(settings, "MKCOL", current);
    if (![200, 201, 204, 301, 302, 405].includes(response.status)) {
      throw new Error(`创建远程目录失败：${current}`);
    }
  }
}

async function handleWebDav(request, action) {
  const payload = await readJson(request);
  const settings = validateSettings(payload);

  if (action === "test") {
    const result = await webDavFetch(settings, "PROPFIND", "/");
    if (!result.ok && result.status !== 207) {
      return json({ ok: false, message: `WebDAV 登录失败：HTTP ${result.status}` }, 400);
    }
    return json({ ok: true });
  }

  if (action === "load") {
    const result = await webDavFetch(settings, "GET", settings.filePath);
    if (result.status === 404) {
      return json({ notes: [], syncedAt: 0 });
    }
    if (!result.ok) {
      return json({ ok: false, message: `读取远程笔记失败：HTTP ${result.status}` }, 400);
    }

    const raw = await result.text();
    const parsed = raw ? JSON.parse(raw) : { notes: [] };
    const notes = normalizeNotes(Array.isArray(parsed) ? parsed : parsed.notes);
    return json({
      notes,
      syncedAt: Number(parsed.syncedAt) || notes.reduce((latest, note) => Math.max(latest, note.updatedAt), 0)
    });
  }

  if (action === "save") {
    const notes = normalizeNotes(payload.notes);
    const syncedAt = Date.now();
    await ensureRemoteDirectories(settings);
    const result = await webDavFetch(settings, "PUT", settings.filePath, JSON.stringify({ notes, syncedAt }, null, 2));
    if (!result.ok && result.status !== 201 && result.status !== 204) {
      return json({ ok: false, message: `上传远程笔记失败：HTTP ${result.status}` }, 400);
    }
    return json({ ok: true, syncedAt });
  }

  return json({ ok: false, message: "未知 WebDAV 操作" }, 404);
}

export async function onRequestPost({ request, params }) {
  try {
    return await handleWebDav(request, params.action);
  } catch (error) {
    return json({ ok: false, message: error instanceof Error ? error.message : "WebDAV 请求失败" }, 400);
  }
}

export function onRequestGet() {
  return json({ ok: false, message: "Method not allowed" }, 405);
}
