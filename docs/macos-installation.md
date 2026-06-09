# macOS 打包与安装说明

## 本地打包

在 macOS 机器上执行：

```bash
npm install
npm run package:mac
```

产物会输出到 `release/`，包括 Intel Mac 使用的 `x64` 包和 Apple Silicon 使用的 `arm64` 包。

如果只想快速检查 `.app` 是否能启动，可以执行：

```bash
npm run package:mac:dir
```

## 图标

`npm run generate:icons` 会按平台生成图标：

- Windows：从 `build/icon-source.png` 生成 `build/icon.ico`
- macOS：从 `build/icon-source.png` 生成 `build/icon.icns`

macOS 的 `.app`、`.dmg` 和 Finder 图标会使用 `build/icon.icns`。

## 给别人安装

如果只是未签名包，用户可能会遇到“无法打开”“来自身份不明开发者”或“文件已损坏”的提示。正式分发给 Mac 用户时，需要在 macOS 上使用 Apple Developer ID 证书签名，并完成 Apple notarization。

electron-builder 会在检测到有效证书和公证环境变量时进行签名/公证。常用环境变量任选一组：

```bash
export APPLE_ID="your-apple-id@example.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="TEAMID1234"
npm run package:mac
```

或者使用 App Store Connect API key：

```bash
export APPLE_API_KEY="/absolute/path/AuthKey_XXXXXXXXXX.p8"
export APPLE_API_KEY_ID="XXXXXXXXXX"
export APPLE_API_ISSUER="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
npm run package:mac
```

签名和公证完成后，再把生成的 `.dmg` 发给用户。
