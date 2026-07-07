<div align="center">
  <img src="./assets/bubu-logo.svg" width="96" alt="卜卜笔记 Logo" />
  <h1>卜卜笔记</h1>
  <p>一款支持 Markdown 编辑、实时预览、账号云同步与多端部署的轻量级笔记应用。</p>

  <p>
    <a href="https://github.com/forsisi/bubu_note"><img alt="GitHub Repo" src="https://img.shields.io/badge/GitHub-bubu__note-181717?logo=github" /></a>
    <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=111" />
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=fff" />
    <img alt="Electron" src="https://img.shields.io/badge/Electron-39-47848F?logo=electron&logoColor=fff" />
    <img alt="Vite" src="https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=fff" />
    <img alt="Cloudflare" src="https://img.shields.io/badge/Cloudflare-Pages%20Functions-F38020?logo=cloudflare&logoColor=fff" />
  </p>

  <p>
    <a href="https://note.t1213121.fun">在线体验</a>
    ·
    <a href="./docs/cloudflare-pages-deploy.md">部署文档</a>
    ·
    <a href="./docs/macos-installation.md">桌面端打包</a>
  </p>
</div>

## 简历一句话

卜卜笔记：基于 React + TypeScript + Electron + Vite + CodeMirror + Cloudflare Pages Functions/KV 技术栈，实现了支持 Markdown 实时预览、标签检索、本地持久化、导入导出、账号云同步与多端部署的轻量级笔记应用。

## 项目介绍

卜卜笔记是一个 local-first 的 Markdown 笔记客户端，面向个人知识记录、学习笔记和轻量写作场景。项目同时支持 Web、Electron 桌面端、PWA/Android 形态：Web 端使用浏览器本地存储和 Cloudflare Pages Functions 提供账号同步，桌面端通过 Electron IPC 读写本地文件，并提供 Markdown/JSON 导入导出能力。

## 核心功能

- Markdown 编辑体验：基于 CodeMirror 构建编辑器，支持编辑、预览、分屏同步滚动三种模式。
- 安全实时预览：使用 markdown-it 渲染 Markdown，结合 DOMPurify 过滤 HTML，支持代码高亮和任务列表。
- 笔记管理：支持新建、删除、自动保存、标题/内容搜索、标签筛选、字数/行数/阅读时间统计。
- 快捷写作工具：内置标题、粗体、斜体、引用、链接、图片、列表、代码块、任务、分割线和自定义表格插入。
- 多端数据存储：浏览器端使用 localStorage，桌面端使用 Electron 主进程持久化到本地 notes.json。
- 账号云同步：通过 Cloudflare Pages Functions + KV 实现注册、登录、会话校验、笔记加载和保存。
- 冲突合并策略：同步时按笔记 id 合并本地与远程数据，使用 updatedAt 保留较新的版本。
- 导入导出：支持导入 Markdown/TXT，导出当前笔记为 Markdown，导出全部笔记为 JSON。
- 跨端部署：支持 Web 构建、Electron 桌面打包、Capacitor Android 同步和 PWA 添加到主屏幕。
- 测试覆盖：使用 Vitest 覆盖核心工具函数，使用 Playwright 验证桌面端 Markdown 编辑和持久化流程。

## 技术栈

| 分类 | 技术 |
| --- | --- |
| 前端框架 | React 19, TypeScript, Vite |
| Markdown 编辑 | CodeMirror 6, @uiw/react-codemirror |
| Markdown 渲染 | markdown-it, markdown-it-task-lists, highlight.js, DOMPurify |
| 桌面端 | Electron, electron-vite, electron-builder |
| 移动端/PWA | Capacitor Android, Web Manifest, Service Worker |
| 后端与同步 | Cloudflare Pages Functions, Cloudflare KV, WebDAV 兼容接口 |
| 测试 | Vitest, Testing Library, Playwright |

## 架构设计

```text
bubu-notes
├── src/
│   ├── App.tsx                 # 主界面、编辑器、同步和导入导出交互
│   ├── lib/
│   │   ├── markdown.ts         # Markdown 渲染与 HTML 安全过滤
│   │   ├── notes.ts            # 笔记 CRUD 与搜索过滤
│   │   ├── noteSync.ts         # 本地/远程笔记合并策略
│   │   ├── accountSync.ts      # 卜卜账号同步客户端
│   │   ├── browserFileApi.ts   # Web 端本地存储与导入导出
│   │   ├── snippets.ts         # Markdown 快捷片段和表格生成
│   │   └── stats.ts            # 字数、行数、阅读时间统计
│   └── styles.css              # 应用界面样式
├── electron/
│   ├── main/                   # Electron 主进程、本地文件、WebDAV、系统对话框
│   └── preload/                # 安全暴露 bubuNotes API
├── functions/api/
│   ├── account/[action].js     # 注册、登录、加载、保存账号笔记
│   └── webdav/[action].js      # WebDAV 兼容同步代理
├── android/                    # Capacitor Android 工程
├── public/                     # PWA manifest、Service Worker、图标
└── docs/                       # 部署与打包说明
```

## 快速开始

### 环境要求

- Node.js 22+
- npm

### 安装依赖

```bash
npm install
```

### 启动桌面端开发环境

```bash
npm run dev
```

### 构建 Web 版本

```bash
npm run build:web
```

构建产物会输出到 `dist-web/`，可部署到 Cloudflare Pages、静态托管服务或自有服务器。

### 构建 Electron 桌面端

```bash
npm run build
```

### 打包 Windows 安装包

```bash
npm run package:win
```

### 同步 Android 工程

```bash
npm run build:android
npm run android:open
```

## 云同步部署

项目提供 Cloudflare Pages Functions 作为同源 API：

```text
/api/account/register
/api/account/login
/api/account/load
/api/account/save
```

部署到 Cloudflare Pages 时需要绑定 KV 命名空间：

```text
Variable name: BUBU_NOTES_KV
```

推荐配置：

```text
Build command: npm run build:web
Build output directory: dist-web
Node.js version: 22
```

更完整的部署步骤见 [docs/cloudflare-pages-deploy.md](./docs/cloudflare-pages-deploy.md)。

## 安全与可靠性

- Electron 使用 `contextIsolation: true` 和 `nodeIntegration: false`，通过 preload 白名单暴露文件能力。
- Markdown 预览使用 DOMPurify 进行 HTML 安全过滤，降低 XSS 风险。
- 账号密码在 Cloudflare Function 中使用 PBKDF2 + salt 哈希保存，不明文存储密码。
- 登录态使用随机 token，并设置 30 天会话过期时间。
- 同步数据限制请求体大小，避免异常大文件拖垮接口。

## 测试

```bash
# 类型检查
npm run typecheck

# 单元测试
npm test

# Electron 端到端测试
npm run test:e2e
```

## 常用脚本

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动 Electron + Vite 开发环境 |
| `npm run build` | 生成桌面端构建产物 |
| `npm run build:web` | 构建 Web/PWA 版本 |
| `npm run build:android` | 构建 Web 产物并同步到 Android |
| `npm run package:win` | 打包 Windows NSIS 安装包 |
| `npm run package:mac` | 打包 macOS DMG/ZIP |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm test` | 运行 Vitest 单元测试 |
| `npm run test:e2e` | 运行 Playwright Electron E2E 测试 |

## 项目亮点

- 多端统一代码复用：同一套 React 编辑器逻辑同时服务 Web、Electron 和 Android/PWA。
- local-first 数据体验：默认本地可用，登录账号后再进行云同步，弱网或离线场景也能继续写作。
- 完整工程闭环：覆盖编辑器、数据层、同步接口、桌面打包、Web 部署和自动化测试。
- 简洁安全的桌面桥接：渲染进程不直接访问 Node 能力，通过 Electron IPC 统一处理文件读写和系统对话框。

## License

This project is currently maintained as a personal learning and portfolio project.
