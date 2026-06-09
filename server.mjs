import express from "express";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const app = express();
const port = process.env.PORT || 5173;
const __dirname = dirname(fileURLToPath(import.meta.url));

app.use(express.static(join(__dirname, "dist-web")));

app.get("*", (_req, res) => {
  res.sendFile(join(__dirname, "dist-web", "index.html"));
});

app.listen(port, () => {
  console.log(`卜卜笔记 running on http://localhost:${port}`);
});
