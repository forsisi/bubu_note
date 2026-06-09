import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: "dist-electron/main",
      lib: {
        entry: resolve("electron/main/index.ts")
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: "dist-electron/preload",
      lib: {
        entry: resolve("electron/preload/index.ts")
      }
    }
  },
  renderer: {
    root: ".",
    plugins: [react()],
    resolve: {
      alias: {
        "@": resolve("src")
      }
    },
    build: {
      outDir: "dist",
      rollupOptions: {
        input: resolve("index.html")
      }
    }
  }
});
