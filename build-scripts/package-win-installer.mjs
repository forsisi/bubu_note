import { spawnSync } from "node:child_process";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    shell: false,
    stdio: options.stdio ?? "pipe",
    encoding: "utf8",
    env: options.env ?? process.env
  });

  if (options.allowFailure) {
    return result;
  }

  if (result.status !== 0) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    if (!result.stdout && !result.stderr) {
      process.stderr.write(`${command} ${args.join(" ")} failed with exit code ${result.status ?? 1}\n`);
    }
    process.exit(result.status ?? 1);
  }

  return result;
}

function getGitConfig(key) {
  const result = run("git", ["config", "--global", "--get", key], { allowFailure: true });
  return result.status === 0 ? result.stdout.trim() : "";
}

function unsetGitConfig(key) {
  run("git", ["config", "--global", "--unset", key], { allowFailure: true });
}

function setGitConfig(key, value) {
  if (value) {
    run("git", ["config", "--global", key, value], { allowFailure: true });
  }
}

const httpProxy = getGitConfig("http.proxy");
const httpsProxy = getGitConfig("https.proxy");
const env = {
  ...process.env,
  HTTP_PROXY: "",
  HTTPS_PROXY: "",
  http_proxy: "",
  https_proxy: "",
  npm_config_proxy: "",
  npm_config_https_proxy: "",
  GLOBAL_AGENT_HTTP_PROXY: "",
  GLOBAL_AGENT_HTTPS_PROXY: "",
  ELECTRON_BUILDER_BINARIES_MIRROR:
    process.env.ELECTRON_BUILDER_BINARIES_MIRROR ??
    "https://npmmirror.com/mirrors/electron-builder-binaries/",
  CSC_IDENTITY_AUTO_DISCOVERY: "false"
};

try {
  unsetGitConfig("http.proxy");
  unsetGitConfig("https.proxy");
  run("cmd.exe", [
    "/c",
    "node_modules\\.bin\\electron-builder.cmd",
    "--win",
    "nsis",
    "--config.electronDist=node_modules/electron/dist",
    "--config.electronVersion=39.2.6"
  ], { env, stdio: "inherit" });
} finally {
  setGitConfig("http.proxy", httpProxy);
  setGitConfig("https.proxy", httpsProxy);
}
