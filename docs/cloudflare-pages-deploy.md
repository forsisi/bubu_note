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

项目提供 Cloudflare Pages Functions：

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

用户需要在应用左侧 WebDAV 模块里填写：

- WebDAV 地址，例如坚果云 `https://dav.jianguoyun.com/dav`
- 用户名
- 密码或应用密码
- 同步文件路径，默认 `/bubu-notes/notes.json`

登录后会把笔记保存到 WebDAV 文件里，并每 30 秒尝试同步一次。

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
