import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
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
});
