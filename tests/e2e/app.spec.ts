import { _electron as electron, test, expect } from "@playwright/test";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

test("desktop markdown flow", async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "bubu-notes-e2e-"));
  const app = await electron.launch({
    args: ["dist-electron/main/index.js"],
    env: {
      ...process.env,
      BUBU_NOTES_DATA_DIR: dataDir
    }
  });

  try {
    const window = await app.firstWindow();
    await expect(window.getByText("卜卜笔记")).toBeVisible();

    await window.getByLabel("笔记标题").fill("E2E Markdown");
    await window.getByLabel("Markdown 编辑器").locator(".cm-content").click();
    await window.keyboard.press("Control+A");
    await window.keyboard.press("Backspace");
    await window.keyboard.type("# Hello\n\n- [x] synced preview");

    await window.getByRole("button", { name: "预览模式" }).click();
    await expect(window.getByRole("heading", { name: "Hello" })).toBeVisible();

    await window.getByRole("button", { name: "同步编辑模式" }).click();
    await expect(window.getByLabel("Markdown 编辑器")).toBeVisible();
    await expect(window.getByLabel("Markdown 预览")).toBeVisible();

    await window.getByRole("button", { name: "Markdown 语法教程" }).click();
    await expect(window.getByRole("dialog", { name: "Markdown 常用语法教程" })).toBeVisible();
    await expect(window.getByText("# 一级标题")).toBeVisible();
    await window.getByRole("button", { name: "关闭教程" }).click();
    await expect(window.getByRole("dialog", { name: "Markdown 常用语法教程" })).toBeHidden();

    await expect(window.getByTestId("note-scroll-region")).toBeVisible();
    await expect(window.getByTestId("editor-scroll-region")).toBeVisible();
  } finally {
    await app.close();
    await rm(dataDir, { recursive: true, force: true });
  }
});

test("desktop notes persist after restart", async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "bubu-notes-e2e-"));

  async function launchApp() {
    return electron.launch({
      args: ["dist-electron/main/index.js"],
      env: {
        ...process.env,
        BUBU_NOTES_DATA_DIR: dataDir
      }
    });
  }

  try {
    const firstApp = await launchApp();
    const firstWindow = await firstApp.firstWindow();
    await firstWindow.getByLabel("笔记标题").fill("重启后还在");
    await firstWindow.getByLabel("Markdown 编辑器").locator(".cm-content").click();
    await firstWindow.keyboard.press("Control+A");
    await firstWindow.keyboard.press("Backspace");
    await firstWindow.keyboard.type("这是永久保存的笔记");
    await expect(firstWindow.getByText(/已自动保存|已保存/)).toBeVisible();
    await firstApp.close();

    const secondApp = await launchApp();
    const secondWindow = await secondApp.firstWindow();
    await expect(secondWindow.getByLabel("笔记标题")).toHaveValue("重启后还在");
    await expect(secondWindow.getByTestId("editor-scroll-region")).toContainText("这是永久保存的笔记");
    await secondApp.close();
  } finally {
    await rm(dataDir, { recursive: true, force: true });
  }
});
