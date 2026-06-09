import { insertMarkdownSnippet } from "./snippets";

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
});
