# Cloudflare Pages 部署说明

## GitHub 仓库

项目已经使用 GitHub 仓库：

```text
https://github.com/imyanghao666-design/bubu_note
```

Cloudflare Pages 连接这个仓库的 `main` 分支即可。不要上传 `node_modules/`、`release/`、`dist/`、`dist-web/` 这类生成目录；`.gitignore` 会处理这些。

## Cloudflare Pages 设置

在 Cloudflare Pages 项目里使用：

```text
Framework preset: None / Vite
Build command: npm run build:web
Build output directory: dist-web
Root directory: /
Node.js version: 22
```

`npm run build:web` 会执行类型检查并把网页版产物输出到 `dist-web/`。

## WebDAV 同步接口

项目保留 WebDAV 代理函数作为兼容能力：

```text
functions/api/webdav/[action].js
```

部署后会生成同源接口：

```text
/api/webdav/test
/api/webdav/load
/api/webdav/save
```

这些接口负责代理访问坚果云、infiniCloud 等 WebDAV 服务，避免浏览器直接访问 WebDAV 时被 CORS 拦截。

这些接口目前作为兼容能力保留，后续如果需要恢复高级同步设置，可以复用这些字段：

- WebDAV 地址，例如坚果云 `https://dav.jianguoyun.com/dav`
- 用户名
- 密码或应用密码
- 同步文件路径，默认 `/bubu-notes/notes.json`

新的默认用户入口是下面的“卜卜账号登录同步”。

## 卜卜账号登录同步

左侧同步入口现在显示为“卜卜账号”，用户可以直接注册/登录，不需要理解 WebDAV。

项目提供 Cloudflare Pages Functions：

```text
functions/api/account/[action].js
```

部署后会生成同源接口：

```text
/api/account/register
/api/account/login
/api/account/load
/api/account/save
```

这些接口需要一个 Cloudflare KV 命名空间保存账号、登录状态和笔记。请在 Cloudflare Pages 项目里绑定 KV：

```text
Variable name: BUBU_NOTES_KV
KV namespace: 选择或新建一个命名空间，例如 bubu-notes
```

如果没有绑定 `BUBU_NOTES_KV`，注册/登录接口会返回“服务器还没有绑定 BUBU_NOTES_KV 数据库”。

## 绑定域名

在 Cloudflare Pages 项目里添加自定义域名：

```text
note.t1213121.fun
```

如果域名 DNS 也在 Cloudflare，Pages 通常会自动添加所需记录。绑定完成后访问：

```text
https://note.t1213121.fun
```

## Android 使用

网页版已补充 PWA manifest 和 service worker。Android 用户可以用 Chrome 打开站点，然后选择“添加到主屏幕”，作为轻量 Android 版使用。
