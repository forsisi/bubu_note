import { createMarkdownTable, insertMarkdownSnippet } from "./snippets";

describe("insertMarkdownSnippet", () => {
  it("wraps selected text as bold", () => {
    expect(insertMarkdownSnippet("hello", "bold", 0, 5)).toEqual({
      content: "**hello**",
      cursor: 9
    });
  });

  it("inserts table and task snippets", () => {
    expect(insertMarkdownSnippet("", "table", 0, 0).content).toContain("| 名称 | 状态 |");
    expect(insertMarkdownSnippet("", "task", 0, 0).content).toBe("- [ ] 待完成");
  });

  it("creates custom markdown tables", () => {
    expect(createMarkdownTable(3, 4)).toBe([
      "| 列 1 | 列 2 | 列 3 | 列 4 |",
      "| - | - | - | - |",
      "|  |  |  |  |",
      "|  |  |  |  |",
      "|  |  |  |  |"
    ].join("\n"));
  });

  it("inserts common markdown formatting snippets", () => {
    expect(insertMarkdownSnippet("hello", "italic", 0, 5)).toEqual({
      content: "*hello*",
      cursor: 7
    });
    expect(insertMarkdownSnippet("", "quote", 0, 0).content).toBe("> 引用内容");
    expect(insertMarkdownSnippet("", "link", 0, 0).content).toBe("[链接文字](https://example.com)");
    expect(insertMarkdownSnippet("", "image", 0, 0).content).toBe("![图片描述](https://example.com/image.png)");
  });
});
