import { renderMarkdown } from "./markdown";

describe("renderMarkdown", () => {
  it("renders standard markdown with tables, tasks, and highlighted code", () => {
    const html = renderMarkdown([
      "# 标题",
      "",
      "- [x] 完成",
      "",
      "| A | B |",
      "| - | - |",
      "| 1 | 2 |",
      "",
      "```ts",
      "const name = '卜卜';",
      "```"
    ].join("\n"));

    expect(html).toContain("<h1>");
    expect(html).toContain("<table>");
    expect(html).toContain("contains-task-list");
    expect(html).toContain("hljs");
  });

  it("sanitizes dangerous html", () => {
    const html = renderMarkdown("<img src=x onerror=\"alert(1)\"><script>alert(2)</script>");

    expect(html).not.toContain("onerror");
    expect(html).not.toContain("<script>");
  });
});
