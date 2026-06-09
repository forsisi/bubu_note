import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(fileURLToPath(new URL("..", import.meta.url)));
const distDir = resolve(rootDir, "dist");
const port = Number(process.env.PORT || 3000);
const maxBodyBytes = 1024 * 1024 * 8;

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".ico", "image/x-icon"],
  [".json", "application/json; charset=utf-8"]
]);

function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(data));
}

function readBody(request) {
  return new Promise((resolveBody, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > maxBodyBytes) {
        reject(new Error("请求内容过大"));
        request.destroy();
      }
    });
    request.on("end", () => resolveBody(body ? JSON.parse(body) : {}));
    request.on("error", reject);
  });
}

function authHeader(username, password) {
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
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

async function handleWebDav(request, response, action) {
  try {
    const payload = await readBody(request);
    const settings = validateSettings(payload);

    if (action === "test") {
      const result = await webDavFetch(settings, "PROPFIND", "/");
      if (!result.ok && result.status !== 207) {
        sendJson(response, 400, { ok: false, message: `WebDAV 登录失败：HTTP ${result.status}` });
        return;
      }
      sendJson(response, 200, { ok: true });
      return;
    }

    if (action === "load") {
      const result = await webDavFetch(settings, "GET", settings.filePath);
      if (result.status === 404) {
        sendJson(response, 200, { notes: [], syncedAt: 0 });
        return;
      }
      if (!result.ok) {
        sendJson(response, 400, { ok: false, message: `读取远程笔记失败：HTTP ${result.status}` });
        return;
      }
      const raw = await result.text();
      const parsed = raw ? JSON.parse(raw) : { notes: [] };
      const notes = normalizeNotes(Array.isArray(parsed) ? parsed : parsed.notes);
      sendJson(response, 200, {
        notes,
        syncedAt: Number(parsed.syncedAt) || notes.reduce((latest, note) => Math.max(latest, note.updatedAt), 0)
      });
      return;
    }

    if (action === "save") {
      const notes = normalizeNotes(payload.notes);
      const syncedAt = Date.now();
      await ensureRemoteDirectories(settings);
      const result = await webDavFetch(settings, "PUT", settings.filePath, JSON.stringify({ notes, syncedAt }, null, 2));
      if (!result.ok && result.status !== 201 && result.status !== 204) {
        sendJson(response, 400, { ok: false, message: `上传远程笔记失败：HTTP ${result.status}` });
        return;
      }
      sendJson(response, 200, { ok: true, syncedAt });
      return;
    }

    sendJson(response, 404, { ok: false, message: "未知 WebDAV 操作" });
  } catch (error) {
    sendJson(response, 400, { ok: false, message: error instanceof Error ? error.message : "WebDAV 请求失败" });
  }
}

async function serveStatic(request, response) {
  const requestUrl = new URL(request.url || "/", "http://localhost");
  const pathname = decodeURIComponent(requestUrl.pathname);
  const requestedPath = pathname === "/" ? "index.html" : pathname.slice(1);
  const filePath = resolve(distDir, normalize(requestedPath));

  if (!filePath.startsWith(distDir)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) throw new Error("Not a file");
    const content = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": mimeTypes.get(extname(filePath)) || "application/octet-stream"
    });
    response.end(content);
  } catch {
    const fallback = await readFile(join(distDir, "index.html"));
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end(fallback);
  }
}

createServer((request, response) => {
  const url = new URL(request.url || "/", "http://localhost");
  if (request.method === "GET" && url.pathname === "/api/health") {
    sendJson(response, 200, { ok: true });
    return;
  }

  const match = url.pathname.match(/^\/api\/webdav\/(test|load|save)$/);
  if (request.method === "POST" && match) {
    void handleWebDav(request, response, match[1]);
    return;
  }

  if (request.method !== "GET") {
    sendJson(response, 405, { ok: false, message: "Method not allowed" });
    return;
  }

  void serveStatic(request, response);
}).listen(port, () => {
  console.log(`Bubu Notes web server listening on ${port}`);
});
