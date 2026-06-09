# Railway 部署说明

## 是否需要上传 GitHub

建议上传整个项目到 GitHub，再让 Railway 连接这个仓库部署。Railway 最稳定的流程是：

1. GitHub 仓库保存完整源码。
2. Railway 从 GitHub 拉代码。
3. Railway 执行 `npm run build:web`。
4. Railway 执行 `npm run start` 启动 `server/index.mjs`。

不要上传 `node_modules/`、`release/`、`dist/` 这类生成目录；`.gitignore` 会处理这些。

## Railway 设置

项目里已经提供 `nixpacks.toml`：

```toml
[phases.build]
cmds = ["npm run build:web"]

[start]
cmd = "npm run start"
```

Railway 会把端口放在 `PORT` 环境变量里，`server/index.mjs` 会自动读取。

## 绑定域名

在 Railway 项目里添加自定义域名：

```text
note.t1213121.fun
```

然后到域名 DNS 管理后台，按 Railway 给出的记录添加：

- 通常是 `CNAME note -> Railway 提供的目标域名`
- 如果 Railway 给的是根域或特殊记录，按它页面上的提示填写

DNS 生效后访问：

```text
https://note.t1213121.fun
```

## WebDAV 同步

网页版使用同源接口 `/api/webdav/*` 代理访问网盘，避免浏览器直接访问 WebDAV 时被 CORS 拦截。

用户需要在应用左侧 WebDAV 模块里填写：

- WebDAV 地址，例如坚果云 `https://dav.jianguoyun.com/dav`
- 用户名
- 密码或应用密码
- 同步文件路径，默认 `/bubu-notes/notes.json`

登录后会把笔记保存到 WebDAV 文件里，并每 30 秒尝试同步一次。

## Android 使用

网页版已补充 PWA manifest 和 service worker。Android 用户可以用 Chrome 打开站点，然后选择“添加到主屏幕”，作为轻量 Android 版使用。
